var userInput = {},
    firstToUpper = function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
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
    dmgTypes = ['fire', 'cold', 'light', 'chaos', 'phys'],
    eleDmgTypes = ['fire', 'cold', 'light'],
    translateMatch = function (str) {
        switch (str) {
        case 'lightning':
            return 'light';
        case 'area':
            return 'aoe';
        case 'projectiles':
            return 'projectile';
        case 'physical':
            return 'phys';
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
    calcAvgPhysDmg = function (s, min, max, armour, lvl) {
        var calcPhysIntergral = function (arm) {//defined intergral for dmg ^ 2 / (dmg - armour) over min to max
            return ((((arm * arm) * (-Math.log(arm + min))) + (arm * arm) * Math.log(arm + max)) - ((max - min) * arm)) + (((max * max) - (min * min)) / 2);
        }, count = max - min, totalDmg, cc = s.getCritChance(lvl), cd = s.getCritDmg(lvl);
        armour /= 12;//just the way armour is applied in POE...
        totalDmg = calcPhysIntergral(armour);
        if (userInput.enableCrit) {
            min *= cd;
            max *= cd;
            totalDmg += calcPhysIntergral(armour) * cc;
            count += count * cc;
        }
        return totalDmg / count;
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