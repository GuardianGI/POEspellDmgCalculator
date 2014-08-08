var supports = (function () {
    var sName, res = {}, i, reType, s, stage, column, d,
        modRegexes = {
            addedDmg: /adds x-y (\S+) damage/i,
            moreDmg: /x% more\s?(\S*) damage/i,
            less: /(\d+%) less\s?(\S+)\s?(.*)/i,
            addedConvertedDmg: /gain x% of (\S+) damage as extra (\S+) damage/i,
            chain: /chain \+(\d+) times/i,
            chanceToStatusAilment: /x% chance to (\S+)/i,
            penetrateRes: /penetrates x% (\S+) res/i,
            dmgConverted: /x% of (\S+) damage converted to (\S+) damage/i,
            empower: /\+x level of supported active skill gems/i,//not as general as I'd like, but I doubt there will ever be similar skills
            enhance: /\+x% to quality of supported active skill gems/i,
            faster: /x% increased (\S+) speed/i,
            incrDmg: /x% increased\s?(\S*?)\s?damage/i,
            aditional: /(\d+) additional (\S+)/i,
            incrCrit: /x% increased critical strike (\S+)/i,
            ironWill: /damage bonus applies to spell damage/i,
            totem: /summons a totem which uses this skill/i,
            echo: /x% more cast speed/i,
            incrCast: /x% increased.*?cast.*?speed/i,
            moreSomethingDmg: /x% more\s(\S+)\s(\S+) damage/i,
            culling: /kills enemies on 10% life or less when hit by supported Skills/i
        }, matches, match, dmgLvls = ['min', 'max', 'avg'],
        dmgTypes = ['fire', 'cold', 'light', 'phys', 'chaos'],
        isDmgType = function (type) {
            return dmgTypes.indexOf(type) >= 0;
        },
        parsePercent = function (str) {
            return ((str.match(/(\d+)%/i)[1] | 0) / 100);
        },
        applyRegexes = function (effectStr) {
            for (reType in modRegexes) {
                matches = effectStr.match(modRegexes[reType]);
                if (null !== matches) {
                    res[sName].types.push(reType);
                    switch (reType) {
                    case 'culling':
                        res[sName].isApplicable = function () { return true; };
                        res[sName].applyAfter.push(
                            function (supportStage, skillLvl, skill) {
                                skill.dmg.multiply({mult: 1 / 0.9, lvl: skillLvl});
                            }
                        );
                        break;
                    case 'empower':
                        res[sName].isApplicable = function () { return true; };
                        res[sName].beforeDmgStages.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = Object.keys(rawSupport.stageStats[0]).filter(function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('+x') >= 0 && key.indexOf('level') >= 0;
                                })[0];
                            
                            for (stage in support.stages) {
                                stageStats[stage] = rawSupport.stageStats[stage][column] | 0;
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.empower[skillLvl] += stageStats[supportStage];
                            };
                        })(res[sName], s));
                        break;
                    case 'enhance':
                        res[sName].isApplicable = function () { return true; };
                        res[sName].beforeDmgStages.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = Object.keys(rawSupport.stageStats[0]).filter(function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('+x%') >= 0 && key.indexOf('quality') >= 0;
                                })[0];
                            
                            for (stage in support.stages) {
                                stageStats[stage] = rawSupport.stageStats[stage][column] | 0;
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.additionalQuality[skillLvl] += stageStats[supportStage];
                            };
                        })(res[sName], s));
                        break;
                    case 'ironWill':
                        res[sName].isApplicable = function () { return true; };
                        res[sName].applyBefore.push((function () {
                            return function (supportStage, skillLvl, skill) {
                                skill.setIncrDmg(((userInput.str / 5) | 0) / 100, 'spell', skillLvl);
                            };
                        })());
                        res[sName].applyFirst.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = Object.keys(rawSupport.stageStats[0]).filter(function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('reduced') >= 0 && key.indexOf('cast') >= 0 && key.indexOf('speed') >= 0;
                                })[0];
                            
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.otherIncrCastSpeed[skillLvl] -= stageStats[supportStage];
                            };
                        })(res[sName], s));
                        break;
                    case 'penetrateRes':
                        res[sName].isApplicable = (function (dmgType) {
                            return function (skill) {//has correct elemental dmg at selected level?
                                return skill.dmg[userInput.playerLvlForSuggestions][dmgType].min > 0;
                            };
                        })(translateMatch(matches[1]));
                        
                        res[sName].applyFirst.push((function (support, rawSupport, type) {
                            var stageStats = {},
                                column = Object.keys(rawSupport.stageStats[0]).filter(function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('resistance') >= 0 && key.indexOf(type) >= 0;
                                })[0];
                            
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]) * 100;
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.resPen[skillLvl][type] += stageStats[supportStage];
                            };
                        })(res[sName], s, translateMatch(matches[1])));
                        break;
                    case 'incrCrit':
                        res[sName].isApplicable = function (skill) { return skill.cc > 0; };
                        
                        res[sName].applyFirst.push((function (support, rawSupport, type) {
                            var stageStats = {}, selector,
                                column = Object.keys(rawSupport.stageStats[0]).filter(function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('crit') >= 0 && key.indexOf(type) >= 0;
                                })[0];
                                
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                            }
                            selector = 'chance' === type ? 'additionalCC' : 'additionalCD';
                            return function (supportStage, skillLvl, skill) {
                                skill[selector][skillLvl] += stageStats[supportStage];
                            };
                        })(res[sName], s, matches[1]));
                        break;
                    case 'incrCast':
                        res[sName].isApplicable = function (skill) { return true; };
                        res[sName].applyFirst.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = Object.keys(rawSupport.stageStats[0]).filter(function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('increased') >= 0 && key.indexOf('cast') >= 0 && key.indexOf('speed') >= 0;
                                })[0];
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.otherIncrCastSpeed[skillLvl] += stageStats[supportStage];
                            };
                        })(res[sName], s));
                        break;
                    case 'totem':
                        res[sName].isApplicable = (function () {
                            return function (skill) {
                                return skill.keywords.indexOf('totem') < 0 &&
                                    skill.keywords.indexOf('mine') < 0 &&
                                    skill.keywords.indexOf('traps') < 0;
                            }
                        })();
                        res[sName].initFunctions.push(function (skill) {
                            skill.keywords.push('totem');
                        });
                        break;
                    case 'less':
                        res[sName][('cast' === matches[2] ? 'applyAfter' : 'applyBefore')]
                            .push((function(amount, type, support) {
                                var amountInPct = 1 - parsePercent(amount);
                                return function (supportStage, skillLvl, skill) {
                                    var typeKey, minMaxAvgKey;
                                    for (typeKey in skill.dmg[skillLvl]) {
                                        for (minMaxAvgKey in skill.dmg[skillLvl][typeKey]) {
                                            skill.dmg[skillLvl][typeKey][minMaxAvgKey] *= amountInPct;
                                        }
                                    }
                                };
                            })(matches[1], matches[2], res[sName]));
                        break;
                    case 'chain':
                        res[sName].isApplicable = (function () {
                            return function (skill) {
                                return skill.keywords.indexOf('projectile') >= 0 || skill.isArc;
                            }
                        })();
                        res[sName].applyFirst.push(function (supportStage, skillLvl, skill) {
                            skill.projectiles[skillLvl].multiplier += 2;
                        });
                        break;
                    case 'aditional'://lmp, gmp and?
                        switch (translateMatch(matches[2])) {
                        case 'projectile':
                            res[sName].isApplicable = function (skill) {
                                return skill.keywords.indexOf('projectile') >= 0;
                            };
                            res[sName].applyFirst.push((function (additionalProjectiles) {
                                return function (supportStage, skillLvl, skill) {
                                    skill.projectiles[skillLvl].base += additionalProjectiles;
                                }
                            })(matches[1] | 0));
                            break;
                        default:
                            console.log(['additional', matches[1], matches[2]]);
                            break;
                        }
                        break;
                    case 'echo':
                        res[sName].isApplicable = function (skill) {
                            return skill.keywords.indexOf('totem') < 0 &&
                                skill.keywords.indexOf('traps') < 0 &&
                                skill.keywords.indexOf('mine') < 0;
                        };
                        res[sName].applyAfter.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = Object.keys(rawSupport.stageStats[0]).filter(function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('more') >= 0 && key.indexOf('cast') >= 0 && key.indexOf('speed') >= 0;
                                })[0];
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]) + 1;
                            }
                            return function (supportStage, skillLvl, skill) {
                                if (userInput.enableCastSpeed) {
                                    skill.dmg.multiply({mult: stageStats[supportStage], lvl: skillLvl});
                                }
                            };
                        })(res[sName], s));
                        break;
                    case 'addedConvertedDmg': case 'dmgConverted':
                        res[sName].isApplicable = (function (dmgType) {
                            return function (skill) {//has dmg of converted type at selected level?
                                var t;
                                for (t in skill.dmg[userInput.playerLvlForSuggestions]) {
                                    if (0 === t.indexOf(dmgType)) {
                                        if (skill.dmg[userInput.playerLvlForSuggestions][t].min > 0) {
                                            return true;
                                        }
                                    }
                                }
                                return false;
                            };
                        })(translateMatch(matches[1]));
                        
                        
                        res[sName].applyFirst.push((function (from, to, isAdditional) {
                            var pctConverted = {}, column = false, tmpColumn;
                            for (stage in s.stageStats) {
                                for (tmpColumn in s.stageStats[stage]) {
                                    if (tmpColumn.indexOf('gain x% of ') >= 0 || tmpColumn.indexOf('converted to') >= 0 ) {
                                        column = tmpColumn;
                                        break;
                                    }
                                }
                                if (column) {
                                    break;
                                }
                            }
                            for (stage in s.stageStats) {
                                pctConverted[stage] = parsePercent(s.stageStats[stage][column]);
                            }
                        
                            return function (supportStage, skillLvl, skill) {
                                var i, keys = [], dmgLvl, increases = {'min': {}, 'max': {}, 'avg': {}};
                                for (i in skill.dmg[skillLvl]) {
                                    keys.push(i);
                                }
                                dmgLvls.forEach(function (dmgLvl) {
                                    var fromType, addedAs;
                                    for (i = 0; i < keys.length; i += 1) {
                                        fromType = keys[i];
                                        if (0 <= fromType.indexOf(from)/* && 0 > fromType.indexOf(to)*/) {
                                            addedAs = to + ' from ' + fromType;
                                            if (!skill.dmg[skillLvl].hasOwnProperty(addedAs)) {
                                                skill.dmg[skillLvl][addedAs] = {}
                                            }
                                            if (!skill.dmg[skillLvl][addedAs].hasOwnProperty(dmgLvl)) {
                                                skill.dmg[skillLvl][addedAs][dmgLvl] = 0;
                                            }
                                            increases[dmgLvl][addedAs] = skill.dmg[skillLvl][fromType][dmgLvl] *
                                                pctConverted[supportStage];
                                            /*skill.dmg[skillLvl][addedAs][dmgLvl] +=
                                                skill.dmg[skillLvl][fromType][dmgLvl] *
                                                pctConverted[supportStage];*/
                                            if (!isAdditional) {//dmg is converted not just added.
                                                //TODO: move to an apply before/after (interferes with converted dmg that is alter used for added)
                                                skill.dmg[skillLvl][fromType][dmgLvl] *= 1 - pctConverted[supportStage];
                                            }
                                        }
                                    }
                                });
                                for (dmgLvl in increases) {
                                    for (addedAs in increases[dmgLvl]) {
                                        skill.dmg[skillLvl][addedAs][dmgLvl] += increases[dmgLvl][addedAs];
                                    }
                                }
                            };
                        })(translateMatch(matches[1]), translateMatch(matches[2]), 'addedConvertedDmg' === reType));
                        break;
                    }
                    for (column in s.stageStats[0]) {
                        if (column.indexOf(matches[1]) > -1) {//column matching modifier (to describe an x or some other variable in the modifier)
                            if (column.indexOf('damage') > -1) {
                                res[sName].types.push(reType);
                                switch (reType) {
                                case 'moreSomethingDmg':
                                    res[sName].isApplicable = (function (tmpName, type) {
                                        return function (skill) {
                                            return skill.keywords.indexOf(type) >= 0;
                                        };
                                    })(sName, translateMatch(matches[1]));
                                    res[sName].applyBefore.push((function (rawSupport, support, dmgMod, dmgType) {
                                        var stageStats = {};
                                        for (stage in support.stages) {
                                            stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]) + 1;
                                        }
                                        return function (supportStage, skillLvl, skill) {
                                            if (isDmgType(dmgType)) {
                                                skill.dmg.multiply({mult: stageStats[supportStage], lvl: skillLvl, type: dmgType});
                                            } else {
                                                skill.dmg.multiply({mult: stageStats[supportStage], lvl: skillLvl});
                                            }
                                        }
                                    })(s, res[sName], translateMatch(matches[1]), translateMatch(matches[2])))
                                    break;
                                case 'addedDmg':
                                    res[sName].isApplicable = function (skill) { return true; };
                                    
                                    res[sName].applyFirst.push((function (support) {
                                        var dmgStages = [];
                                        for (stage in s.stageStats) {
                                            d = {};
                                            d[translateMatch(matches[1])] = s.stageStats[stage][column].split("-").
                                                reduce(function(d, val) {
                                                    d[0 === d.min ? 'min' : 'max'] = val | 0;
                                                    return d;
                                                }, {min: 0, max: 0});
                                            dmgStages.push(d);
                                        }
                                        return function (supportStage, skillLvl, skill) {
                                            var type;
                                            for (type in dmgStages[supportStage]) {
                                                skill.dmg[skillLvl][type].min += 
                                                        dmgStages[supportStage][type].min;
                                                skill.dmg[skillLvl][type].max += 
                                                    dmgStages[supportStage][type].max;
                                                skill.dmg[skillLvl][type].avg += 
                                                    (dmgStages[supportStage][type].min + dmgStages[supportStage][type].max) / 2;
                                            }
                                        };
                                    })(res[sName]));
                                    break;
                                case 'moreDmg':
                                    if (matches[1].length == 0) {
                                        matches[1] = 'all';
                                    }
                                    res[sName].isApplicable = (function (dmgType) {
                                        if (sName.toLowerCase().indexOf('trap') > -1) {
                                            res[sName].initFunctions.push(function (skill) {
                                                skill.keywords.push('traps');
                                            });
                                            return function (skill) {
                                                return skill.keywords.indexOf('traps') < 0 &&
                                                    skill.keywords.indexOf('totem') < 0 &&
                                                    (skill.keywords.indexOf('mine') < 0 ||
                                                        skill.supports.indexOf(res['Remote Mine']) >= 0);
                                            };														
                                        } else if (sName.toLowerCase().indexOf('mine') > -1) {
                                            res[sName].initFunctions.push(function (skill) {
                                                skill.keywords.push('mine');
                                            });
                                            return function (skill) {
                                                return skill.keywords.indexOf('mine') < 0 && skill.keywords.indexOf('totem') < 0;
                                            };														
                                        } else {
                                            return function (skill) {
                                                return skill.keywords.indexOf(dmgType) > -1;
                                            };
                                        }
                                    })(translateMatch(matches[1]));
                                    
                                    res[sName].applyBefore.push((function(support) {
                                        var multipliers = [];
                                        for (stage in s.stageStats) {
                                            multipliers.push(parsePercent(s.stageStats[stage][column]) + 1);
                                        }
                                        return function (supportStage, skillLvl, skill) {
                                            skill.dmg.multiply({mult: multipliers[supportStage], lvl: skillLvl});
                                        };
                                    })(res[sName]));
                                    break;
                                case 'chanceToStatusAilment':
                                    res[sName].ailmentElement = translateMatch(column.match(/chance to (\S+).*?on hit with (\S+) damage/i)[2]);
                                    res[sName].isApplicable = (function (dmgType) {
                                        return function (skill) {
                                            return skill.dmg[40][dmgType].min > 0;
                                        };
                                    })(res[sName].ailmentElement);
                                    
                                    res[sName].additionalAilmentChance = {};
                                    
                                    for (stage in s.stageStats) {
                                        for (column in s.stageStats[stage]) {
                                            if (column.indexOf('additional chance to') >= 0) {
                                                res[sName].additionalAilmentChance[stage] =
                                                    parsePercent(s.stageStats[stage][column]);
                                            }
                                        }
                                    }
                                    break;
                                case 'incrDmg':
                                    res[sName].applyFirst.push((function (type, support) {
                                        var incrDmg = {};
                                        for (stage in s.stageStats) {
                                            for (column in s.stageStats[stage]) {
                                                if (column.match('increased.*?' + translateMatch(matches[1]) + '.*?damage')) {
                                                    var matchedPct = s.stageStats[stage][column].match(/(\d+%)/i);
                                                    if (matchedPct) {
                                                        incrDmg[stage] = parsePercent(matchedPct[1]);
                                                    } else {
                                                        incrDmg[stage] = 0;
                                                    }
                                                }
                                            }
                                        }
                                    
                                        return function (supportStage, skillLvl, skill) {
                                            skill.setIncrDmg(incrDmg[supportStage] || 0, type, skillLvl);
                                        }
                                    })(translateMatch(matches[1]), res[sName]));
                                    
                                    if ('faster projectiles' === sName.toLowerCase()) {
                                        res[sName].isApplicable = function (skill) {
                                            return skill.keywords.indexOf('projectile') >= 0;
                                        };
                                    }
                                    break;
                                default:
                                    console.log(['no case added for', reType, column, sName]);
                                    break;
                                }
                            }// else console.log(['not applied', column, sName]);
                        }
                    }
                }
            }
        };
    for (sName in rawSupports) {
        s = rawSupports[sName];
        res[sName] = {};
        res[sName].maxLvl = s.maxLvl;//this should be a proper value, but with a max of +2 to gem levels on gear and 1 from corruption it should be ok?
        res[sName].name = sName;
        res[sName].stages = s.stages;
        res[sName].initFunctions = [];
        res[sName].applyFirst = [];//apply on raw skill data
        res[sName].applyBefore = [];//apply before monster def. shock, etc.
        res[sName].applyAfter = [];//apply after mosnter def. (before cast speed bonus is calculated)
        res[sName].beforeDmgStages = [];//apply before parsing base dmg from raw skill data.
        res[sName].types = [];
        res[sName].keywords = s.keywords.splice(0).map(translateMatch);
        res[sName].isApplicable = (function (supportName) {
            return function () {
                //console.log('default is applicable was called for '+ supportName);
                return false;
            };
        })(sName);
        for (i in s.modifiers) {
            applyRegexes(s.modifiers[i]);
        }
        res[sName].qualityBonus = s.qualityBonus;
        res[sName].clone = (function (self) {
            return function () {
                var clone = {}, key;
                for (key in self) {
                    clone[key] = self[key];
                }
                return clone;
            };
        })(res[sName]);
    }
    return res;
})(),
getSortedSupports = function (s) {
    var support, key, tmpClone, stillApplicable, dmgPrev, dmgAfter, nonProblematicSupports,
        dmgMultForSupports = [];
    for (key in supports) {
        support = supports[key];
        if (s.supports.indexOf(support) < 0 && !s.supports.some(function (sup) { return sup.name === support.name; }) && support.isApplicable(s)) {
            tmpClone = s.clone('tmpClone');
            tmpClone.supports.push(support);//temp add support
            
            //s.calcDmg();//should not need recalc?
            dmgAfter = tmpClone.calcDmg(userInput.playerLvlForSuggestions);
            
            nonProblematicSupports = s.supports.filter(function (support) { return support.isApplicable(s); });
            stillApplicable = true;
            //test applicability of current supports.
            tmpClone.supports.forEach(function (innerSupport) {
                if (!innerSupport.isApplicable(tmpClone) &&
                        nonProblematicSupports.indexOf(innerSupport) >= 0 &&
                        support !== innerSupport) {
                    stillApplicable = false;
                }
            });
            if (!stillApplicable) {
                continue;
            }
            
            dmgPrev = s.totalDmg(userInput.playerLvlForSuggestions);
            
            dmgMultForSupports.push({mult: dmgAfter / dmgPrev, support: support});
        }
    }
    return dmgMultForSupports.sort(function(a, b) {
        return b.mult - a.mult;
    });
};