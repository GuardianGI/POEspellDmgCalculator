var findIndex = function (arr, filter) {
        var i;
        for (i = 0; i < arr.length; i += 1) {
            if (filter(arr[i])) {
                return i;
            }
        }
        return -1;
    },
    parsePercent = function (s) {
        return (((s || '0%').match(/(\d+)%?/i)[1] | 0) / 100);
    },
    initModifier = function (name, s, modType) {
        var self = {}, getCloneFn = function (s) {
            return function () {
                var clone = {}, key;
                for (key in s) {
                    clone[key] = s[key];
                }
                clone.clone = getCloneFn(clone);
                return clone;
            }
        };
        self.name = name;
        self.type = modType;
        self.maxLvl = s.maxLvl;
        self.stages = s.stages;
        self.initFunctions = [];
        self.beforeDmgStages = [];//apply before parsing base dmg from raw skill data.
        self.applyFirst = [];//apply on raw skill data
        self.applyAfterFirst = [];//apply on raw skill data
        self.applyBefore = [];//apply before monster def. shock, etc.
        self.applyAfter = [];//apply after mosnter def. (before cast speed bonus is calculated)
        self.types = [];
        self.keywords = s.keywords.splice(0).map(translateMatch);
        self.enabled = false;
        self.qualityBonus = s.qualityBonus;
        self.clone = getCloneFn(self);
        self.isApplicable = function () { return false; };
        return self;
    },
    userInput = {},
    firstToUpper = function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    dmgLvls = ['min', 'max', 'avg'],
    defaultDmg = function () { return {min: 0, max: 0, avg: 0}; },
    gemTypes = ['fire', 'cold', 'light', 'melee', 'minion', 'all'],
    executeOnLoad = [],
    addExecuteOnLoad = (function () {
        var loaded = false;
        executeOnLoad.push(function () {
            loaded = true;
        });
        return function (fn) {
            if (loaded) {
                fn();
            } else {
                executeOnLoad.push(fn);
            }
        };
    })(),
    dmgSubTypes = ['aoe', 'melee', 'projectile', 'minion', 'spell', 'attack'],
    isDmgSubType = function (type) {
        return dmgSubTypes.indexOf(type) >= 0;
    },
    dmgTypes = ['fire', 'cold', 'light', 'phys', 'chaos', 'elemental'],
    isDmgType = function (type) {
        return dmgTypes.indexOf(type) >= 0;
    },
    eleDmgTypes = ['fire', 'cold', 'light'],
    isEleDmgType = function (type) {
        return eleDmgTypes.indexOf(type) >= 0;
    },
    dotTypes = ['burning', 'dot'],
    isDotType = function (type) {
        var i;
        for (i = 0; i < dotTypes.length; i += 1) {
            if (type.indexOf(dotTypes[i]) >= 0) {
                return true;
            }
        }
        return false;
    },
    translateMatch = function (str) {
        switch (str) {
        case 'lightning':
            return 'light';
        case 'area': case 'area of effect':
            return 'aoe';
        case 'curses':
            return 'curse';
        case 'projectiles':
            return 'projectile';
        case 'physical':
            return 'phys';
        case 'traps':
            return 'trap';
        case 'spells':
            return 'spell';
        case 'ele.': case 'ele':
            return 'elemental';
        case 'frozen':
            return 'freeze';
        case 'ignited':
            return 'ignite';
        case 'shocked':
            return 'shock';
        case 'minions':
            return 'minion';
        default:
            return str;
        }
    },
    once = function (fn) {
        var called = false, res;
        return function () {
            if (called) {
                return res;
            }
            called = true;
            res = fn();
            return res;
        };
    },
    publicSkills,
    skills = {},
    roundForDisplay = function (n) {//avoid bugs with to fixed.
        return (Math.round(n * 100) / 100).toFixed(2);
    },
    userInput,
    getRawSkillDmgAtLvl = function (rawSkill, lvl, additionalLvl, maxLvl) {
        var lastLvl = -1, i, dmgLvl = -1, dmgKey, type;
        maxLvl -= 1;//to zero based index.
        lvl += 1;//lvl to 1 based index for comparison to wiki tables.
        for (i = 0; i < rawSkill.dmg.length; i += 1) {
            dmgLvl = rawSkill.dmg[i].lvl | 0;
            if (dmgLvl <= 0) {
                dmgLvl = lastLvl;
            }
            if (lastLvl === dmgLvl) {
                while (dmgLvl < lvl && i < rawSkill.dmg.length) {
                    lvl -= 2;//after stage 20 no new lvl req. added. plot out over 2 lvls per stage.
                    i += 1;
                }
                break;
            }
            if (dmgLvl > lvl) {
                break;
            }
            lastLvl = dmgLvl;
        }
        dmgKey = i - 1;
        if (dmgKey >= 0) {
            dmgKey = dmgKey > maxLvl ? maxLvl : dmgKey;
            dmgKey += additionalLvl;
            dmgKey = dmgKey > rawSkill.dmg.length - 1 ? rawSkill.dmg.length - 1 : dmgKey;
            return rawSkill.dmg[dmgKey];
        } else {
            return false;
        }
    },
    calcPhysDmg = function (rawDmg, armour) {
        return (rawDmg * rawDmg) / (rawDmg + (armour / 12));
    },
    calcPhysIntergral = (function () {
        var intergral = function (a, n) {//intergral of: dmg ^ 2 / (dmg + armour / 12)
            return (a * a * Math.log(a + 12 * n)) / 144 - a * n / 12 + n * n / 2;
        }
        return function (a, min, max) {//defined intergral over min to max
            return (intergral(a, max) - intergral(a, min)) / (max - min);
        };
    })(),
    calcAvgPhysDmg = function (s, min, max, armour, lvl) {
        var totalDmg = calcPhysIntergral(armour, min, max),
            cc,
            cd;
        if (userInput.enableCrit) {
            cc = s.getCritChance(lvl);
            if (cc > 0 && cc <= 1) {
                cd = 1 + s.getCritDmg(lvl);
                totalDmg *= 1 - cc;
                min *= cd;
                max *= cd;
                totalDmg += calcPhysIntergral(armour, min, max) * cc;
            }
        }
        return totalDmg;
    };
    
addExecuteOnLoad(function () {
    var key, inputs, input;
    inputs = document.getElementsByClassName("userInput");
    for (key in inputs) {
        input = inputs[key];
        userInput[input.id] = (("checkbox" === input.type) ? input.checked : (input.value - 0));

        input.apply = (function (self) {
            return function () {
                userInput[self.id] = (("checkbox" === self.type) ? self.checked : (self.value - 0));
            };
        }(input));
        input.executeOnChange = [];
        input.onchange = (function (self) {
            return function () {
                var i;
                self.apply();
                for (i in self.executeOnChange) {
                    self.executeOnChange[i]();
                }
                for (i in skills) {
                    skills[i].setNeedsRecalc();
                }
                redraw();
            };
        }(input));
    }
    
    /*(function () {
        var i, self = document.getElementById('qualityLvlAllSupports');
        self.onChangeFns = [];

        self.onchange = function () {
            userInput.qualityLvlAllSupports = self.value | 0;
            for (i in self.onChangeFns) {
                self.onChangeFns[i]();
            }
            redraw();
        };
    })();*/
    
    addExecuteOnLoad(function () {
        var globalSkillSettings = document.getElementById('globalSkillSettings');
        gemTypes.forEach(function (keyword) {
            var lblNew = document.createElement('label'),
                inputNew = document.createElement('input');
            inputNew.type = 'text';
            inputNew.value = 0;
            lblNew.appendChild(document.createTextNode('+x to ' + keyword + ' gems: '));
            lblNew.appendChild(inputNew);
            globalSkillSettings.appendChild(lblNew);
            inputNew.onchange = (function (self) {
                return function () {
                    var key, s;
                    for (key in skills) {
                        s = skills[key];
                        s.additionalKeywordLvl[keyword] = self.value | 0;
                        s.setNeedsRecalc();
                    }
                    redraw();
                };
            })(inputNew);
        });
    });
    
    return userInput;
});