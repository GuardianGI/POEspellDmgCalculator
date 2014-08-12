var auras, supports = (function () {
    var sName, res = {}, storedRes, i, reType, s, stage, column, d,
        modRegexes = {
            addedDmg: /adds x-y (\S+) damage/i,
            addedDmg2: /additional (\S+) damage with attacks/i,
            moreDmg: /x% more\s?(\S*) damage/i,
            moreSomethingDmg: /x% more\s(\S+)\s(.+) damage/i,
            less: /(\d+%) less\s?(\S+)\s?(.*)/i,
            addedConvertedDmg: /gain x% of (\S+) damage as extra (\S+) damage/i,
            addedConvertedDmg2: /add x% of your (\S+) damage as (\S+) damage/i,
            dmgConverted: /x% of (\S+) damage converted to (\S+) damage/i,
            chain: /chain \+(\d+) times/i,
            chanceToStatusAilment: /x% chance to (\S+)/i,
            penetrateRes: /penetrates x% (\S+) res/i,
            empower: /\+x level of supported active skill gems/i,//not as general as I'd like, but I doubt there will ever be similar skills
            enhance: /\+x% to quality of supported active skill gems/i,
            faster: /x% increased (\S+) speed/i,
            incrDmg: /x% increased\s?(\S*)\s?damage/i,
            incrOther: /x% increased\s?(.+)/i,
            aditional: /(\S*)\s?(\d+) additional (\S+)/i,
            incrCrit: /x% increased critical strike (\S+)/i,
            ironWill: /damage bonus applies to spell damage/i,
            totem: /summons a totem which uses this skill/i,
            echo: /x% more cast speed/i,
            multiStrike: /x% more attack speed/i,
            culling: /kills enemies on 10% life or less when hit by supported Skills/i
        }, matches, match,
        applyRegexes = function (effectStr) {
            for (reType in modRegexes) {
                matches = effectStr.match(modRegexes[reType]);
                if (null !== matches) {
                    res[sName].types.push(reType);
                    switch (reType) {
                    case 'incrOther':
                        matches = matches[1].split(/\s/i).map(translateMatch);
                        if (matches.indexOf('damage') < 0) {
                            switch (matches.join(' ')) {
                            case 'skill effect duration':
                                res[sName].enabled = true;
                                res[sName].isApplicable = (function (support) {
                                    return function () { return support.enabled; };
                               })(res[sName]);
                                res[sName].applyFirst.push((function (support, rawSupport) {
                                    var stageStats = {},
                                        column = findIndex(rawSupport.stageColumns, function (key) {
                                            key = key.toLowerCase();
                                            return key.indexOf('duration') >= 0;
                                        });
                                    for (stage in support.stages) {
                                        stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                                    }
                                    
                                    return function (supportStage, skillLvl, skill) {
                                        skill.increasedDuration[skillLvl] += stageStats[supportStage];
                                    };
                                })(res[sName], s));
                                break;
                            default:
                                console.log('incr non dmg: ', matches);
                            }
                        } else if (matches.length > 2) {//increased ... dmg is already handled, TODO: move increased dmg to this location? would that simplify things?
                            res[sName].enabled = true;
                            matches.splice(matches.indexOf('damage'), 1);
                            res[sName].isApplicable = (function (support, matchedKeywords) {
                                return function (skill) {
                                    var i;
                                    if (!support.enabled) {
                                        return false;
                                    }
                                    for (i = 0; i < matchedKeywords.length; i += 1) {
                                        if (skill.keywords.indexOf(matchedKeywords[i]) < 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                };
                            })(res[sName], matches.filter(isDmgSubType));
                            
                            res[sName].applyBefore.push((function (rawSupport, support, matchedDmgTypes) {
                                var stageStats = {}, type = matchedDmgTypes.join(', ');
                                
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    var i;
                                    key = key.toLowerCase();
                                    for (i = 0; i < matchedDmgTypes.length; i += 1) {
                                        if (key.indexOf(matchedDmgTypes[i]) < 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                });
                                
                                for (stage in support.stages) {
                                    stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                                }
                                return function (supportStage, skillLvl, skill) {
                                    if (matchedDmgTypes.length > 0) {
                                        skill.setIncrDmg(stageStats[supportStage] || 0, type, skillLvl);
                                    } else {
                                        skill.setIncrDmg(stageStats[supportStage] || 0, 'all', skillLvl);
                                    }
                                }
                            })(s, res[sName], matches.filter(isDmgType)));
                        }
                        break;
                    case 'culling':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function () { return support.enabled; };
                       })(res[sName]);
                        res[sName].applyAfter.push(
                            function (supportStage, skillLvl, skill) {
                                skill.addCullingStrike(skillLvl);
                            }
                        );
                        break;
                    case 'empower':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function () { return support.enabled; };
                       })(res[sName]);
                        res[sName].beforeDmgStages.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('+x') >= 0 && key.indexOf('level') >= 0;
                                });
                            
                            for (stage in support.stages) {
                                stageStats[stage] = rawSupport.stageStats[stage][column] | 0;
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.empower[skillLvl] += stageStats[supportStage];
                            };
                        })(res[sName], s));
                        break;
                    case 'enhance':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function () { return support.enabled; };
                       })(res[sName]);
                        res[sName].beforeDmgStages.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('+x%') >= 0 && key.indexOf('quality') >= 0;
                                });
                            
                            for (stage in support.stages) {
                                stageStats[stage] = rawSupport.stageStats[stage][column] | 0;
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.additionalQuality[skillLvl] += stageStats[supportStage];
                            };
                        })(res[sName], s));
                        break;
                    case 'ironWill':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function (skill) { return support.enabled && skill.keywords.indexOf('spell') >= 0; };
                        })(res[sName]);
                        res[sName].applyBefore.push((function () {
                            return function (supportStage, skillLvl, skill) {
                                skill.setIncrDmg(((userInput.str / 5) | 0) / 100, 'spell', skillLvl);
                            };
                        })());
                        res[sName].applyFirst.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('reduced') >= 0 && key.indexOf('cast') >= 0 && key.indexOf('speed') >= 0;
                                });
                            
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.otherIncrCastSpeed[skillLvl] -= stageStats[supportStage];
                            };
                        })(res[sName], s));
                        break;
                    case 'penetrateRes':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (dmgType, support) {
                            return function (skill) {//has correct elemental dmg at selected level?
                                return support.enabled && skill.getDmg(dmgType, userInput.playerLvlForSuggestions).min > 0;
                            };
                        })(translateMatch(matches[1]), res[sName]);
                        
                        res[sName].applyFirst.push((function (support, rawSupport, type) {
                            var stageStats = {},
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('resistance') >= 0 && key.indexOf(type) >= 0;
                                });
                            
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]) * 100;
                            }
                            return function (supportStage, skillLvl, skill) {
                                skill.resPen[skillLvl][type] += stageStats[supportStage];
                            };
                        })(res[sName], s, translateMatch(matches[1])));
                        break;
                    case 'incrCrit':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function (skill) { return support.enabled && skill.cc > 0; };
                        })(res[sName]);
                        
                        res[sName].applyFirst.push((function (support, rawSupport, type) {
                            var stageStats = {}, selector,
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('crit') >= 0 && key.indexOf(type) >= 0;
                                });
                                
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                            }
                            selector = 'chance' === type ? 'additionalIncrCC' : 'additionalCD';
                            return function (supportStage, skillLvl, skill) {
                                skill[selector][skillLvl] += stageStats[supportStage];
                            };
                        })(res[sName], s, matches[1]));
                        break;
                    case 'faster':
                        switch(translateMatch(matches[1])) {
                        case 'cast': case 'attack':
                            res[sName].enabled = true;
                            res[sName].isApplicable = (function (support, match) {
                                if (!support.hasOwnProperty('applicableFns')) {//allow multiple applicability fn's for haste aura working on attack, movement and cast speed
                                    support.applicableFns = [];
                                }
                                support.applicableFns.push(function (skill) {
                                    return skill.keywords.indexOf(match) >= 0;
                                });
                                return function (skill) {
                                    return support.enabled && support.applicableFns.reduce(function (res, fn) {
                                        return res || fn(skill);
                                    }, false);
                                };
                            })(res[sName], translateMatch(matches[1]));
                            res[sName].applyFirst.push((function (support, rawSupport, match) {
                                var stageStats = {},
                                    column = findIndex(rawSupport.stageColumns, function (key) {
                                        key = key.toLowerCase();
                                        return key.indexOf('increased') >= 0 && key.indexOf(match) >= 0 && key.indexOf('speed') >= 0;
                                    });
                                for (stage in support.stages) {
                                    stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]);
                                }
                                return function (supportStage, skillLvl, skill) {
                                    if (skill.keywords.indexOf(match) >= 0) {
                                        skill.setIncrDmg(stageStats[supportStage], match, skillLvl);
                                    }
                                };
                            })(res[sName], s, matches[1]));
                            break;
                        }
                        break;
                        case 'movement'://interesting for SRS
                            break;
                    case 'totem':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            var keyword, notKeywords = ['totem', 'mine', 'trap'];
                            if (sName.toLowerCase().indexOf('spell') >= 0) {
                                keyword = 'cast';
                            } else {
                                keyword = 'attack';
                                notKeywords.push('melee');
                            }
                            return function (skill) {
                                var i;
                                if (!support.enabled || skill.keywords.indexOf(keyword) < 0) {
                                    return false;
                                }
                                for (i = 0; i < notKeywords.length; i += 1) {
                                    if (skill.keywords.indexOf(notKeywords[i]) >= 0) {
                                        return false;
                                    }
                                }
                                return true;
                            }
                        })(res[sName]);
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
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function (skill) {
                                return support.enabled && (skill.keywords.indexOf('projectile') >= 0 || skill.isArc);
                            }
                        })(res[sName]);
                        res[sName].applyFirst.push(function (supportStage, skillLvl, skill) {
                            skill.projectiles[skillLvl].multiplier += 2;
                        });
                        break;
                    case 'aditional'://lmp, gmp and?
                        switch (translateMatch(matches[3])) {
                        case 'projectile':
                            res[sName].enabled = true;
                            res[sName].isApplicable = (function (support) {
                                return function (skill) {
                                    return support.enabled && skill.keywords.indexOf('projectile') >= 0;
                                };
                            })(res[sName]);
                            res[sName].applyFirst.push((function (additionalProjectiles) {
                                return function (supportStage, skillLvl, skill) {
                                    skill.projectiles[skillLvl].base += additionalProjectiles;
                                }
                            })(matches[2] | 0));
                            break;
                        case 'trap':
                            if ('throw' === translateMatch(matches[1])) {
                                res[sName].enabled = true;
                                res[sName].isApplicable = (function (support) {
                                    return function (skill) {
                                        return support.enabled && skill.keywords.indexOf('trap') >= 0;
                                    };
                                })(res[sName]);
                                res[sName].applyFirst.push((function (additionalTraps) {
                                    return function (supportStage, skillLvl, skill) {
                                        skill.traps[skillLvl].base += additionalTraps;//TODO: with a chain/fork projectile skill this would be too low (it needs to multiply 'multiplier' by 3, not add 2)
                                    }
                                })(matches[2] | 0));
                            }
                            break;
                        default:
                            console.log('additional', matches[1], matches[2], matches[3]);
                            break;
                        }
                        break;
                    case 'multiStrike':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function (skill) {
                                return support.enabled &&
                                    skill.keywords.indexOf('attack') >= 0;
                            };
                        })(res[sName]);
                        res[sName].applyAfter.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('more') >= 0 && key.indexOf('attack') >= 0 && key.indexOf('speed') >= 0;
                                });
                            for (stage in support.stages) {
                                stageStats[stage] = parsePercent(rawSupport.stageStats[stage][column]) + 1;
                            }
                            return function (supportStage, skillLvl, skill) {
                                if (userInput.enableCastSpeed) {//todo: update to attack speed enabled? use APS enabled?
                                    skill.dmg.multiply({mult: stageStats[supportStage], lvl: skillLvl});
                                }
                            };
                        })(res[sName], s));
                        break;
                    case 'echo':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (support) {
                            return function (skill) {
                                return support.enabled &&
                                    skill.keywords.indexOf('cast') >= 0 &&
                                    skill.keywords.indexOf('totem') < 0 &&
                                    skill.keywords.indexOf('trap') < 0 &&
                                    skill.keywords.indexOf('mine') < 0;
                            };
                        })(res[sName]);
                        res[sName].applyAfter.push((function (support, rawSupport) {
                            var stageStats = {},
                                column = findIndex(rawSupport.stageColumns, function (key) {
                                    key = key.toLowerCase();
                                    return key.indexOf('more') >= 0 && key.indexOf('cast') >= 0 && key.indexOf('speed') >= 0;
                                });
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
                    case 'addedConvertedDmg': case 'dmgConverted': case 'addedConvertedDmg2':
                        res[sName].enabled = true;
                        res[sName].isApplicable = (function (dmgType, support) {
                            return function (skill) {//has dmg of converted type at selected level?
                                return support.enabled &&
                                    skill.getDmg(dmgType, userInput.playerLvlForSuggestions).min > 0;
                            };
                        })(translateMatch(matches[1]), res[sName]);
                        
                        
                        res[sName].applyAfterFirst.push((function (from, to, isAdditional) {
                            var pctConverted = {}, column = false;
                            column = findIndex(s.stageColumns, function (tmpColumn) {
                                return tmpColumn.indexOf(to) >= 0 || tmpColumn.indexOf('damage') >= 0;
                            });
                            for (stage in s.stageStats) {
                                pctConverted[stage] = parsePercent(s.stageStats[stage][column]);
                            }
                        
                            if (!isAdditional) {//dmg is converted not just added.
                                //TODO: move to an apply before/after (interferes with converted dmg that is alter used for added)
                                res[sName].applyBefore.push(function (supportStage, skillLvl, skill) {
                                    dmgLvls.forEach(function (dmgLvl) {
                                        skill.dmg[skillLvl][from][dmgLvl] *= 1 - pctConverted[supportStage];
                                    });
                                });
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
                                        if (0 === fromType.indexOf(from)) {
                                            addedAs = to + ' from ' + fromType;
                                            if (!skill.dmg[skillLvl].hasOwnProperty(addedAs)) {
                                                skill.dmg[skillLvl][addedAs] = {}
                                            }
                                            if (!skill.dmg[skillLvl][addedAs].hasOwnProperty(dmgLvl)) {
                                                skill.dmg[skillLvl][addedAs][dmgLvl] = 0;
                                            }
                                            increases[dmgLvl][addedAs] = skill.dmg[skillLvl][fromType][dmgLvl] *
                                                pctConverted[supportStage];
                                        }
                                    }
                                });
                                for (dmgLvl in increases) {
                                    for (addedAs in increases[dmgLvl]) {
                                        skill.dmg[skillLvl][addedAs][dmgLvl] += increases[dmgLvl][addedAs];
                                    }
                                }
                            };
                        })(translateMatch(matches[1]), translateMatch(matches[2]), 'dmgConverted' !== reType));
                        break;
                    }
                    for (columnIndex in s.stageColumns) {
                        column = s.stageColumns[columnIndex];
                        if (column.indexOf(matches[1]) > -1) {//column matching modifier (to describe an x or some other variable in the modifier)
                            if (column.indexOf('damage') > -1) {
                                res[sName].types.push(reType);
                                switch (reType) {
                                case 'moreSomethingDmg':
                                    var matchedKeywords = (matches[1]+ ' ' + matches[2]).split(' ').map(translateMatch);
                                    res[sName].enabled = true;
                                    res[sName].isApplicable = (function (support, matchedKeywords) {
                                        return function (skill) {
                                            var i;
                                            if (!support.enabled) {
                                                return false;
                                            }
                                            for (i = 0; i < matchedKeywords.length; i += 1) {
                                                if (skill.keywords.indexOf(matchedKeywords[i]) < 0) {
                                                    return false;
                                                }
                                            }
                                            return true;
                                        };
                                    })(res[sName], matchedKeywords.filter(isDmgSubType));
                                    
                                    res[sName].applyBefore.push((function (rawSupport, support, matchedKeywords) {
                                        var dmgTypes = matchedKeywords.filter(isDmgType),
                                            stageStats = {};
                                        for (stage in support.stages) {
                                            stageStats[stage] = parsePercent(rawSupport.stageStats[stage][columnIndex]) + 1;
                                        }
                                        return function (supportStage, skillLvl, skill) {
                                            if (dmgTypes.length > 0) {
                                                if (1 === dmgTypes.length) {
                                                    skill.dmg.multiply({mult: stageStats[supportStage], lvl: skillLvl, type: dmgTypes[0]});
                                                } else {
                                                    console.log('too many dmg types for more dmg:', dmgTypes);
                                                }
                                            } else {
                                                skill.dmg.multiply({mult: stageStats[supportStage], lvl: skillLvl});
                                            }
                                        }
                                    })(s, res[sName], matchedKeywords))
                                    break;
                                case 'addedDmg': case 'addedDmg2':
                                    res[sName].enabled = true;
                                    res[sName].isApplicable = (function (support) {
                                        if ('addedDmg2' === reType) {
                                            return function (skill) {
                                                return support.enabled &&
                                                    skill.keywords.indexOf('attack') >= 0;
                                            };
                                        } else {
                                            return function (skill) { return support.enabled; };
                                        }
                                    })(res[sName]);
                                    
                                    res[sName].applyFirst.push((function (support) {
                                        var dmgStages = [];
                                        for (stage in s.stageStats) {
                                            d = {};
                                            d[translateMatch(matches[1])] = s.stageStats[stage][columnIndex].split("-").
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
                                    res[sName].enabled = true;
                                    if (matches[1].length == 0) {
                                        matches[1] = 'all';
                                    }
                                    res[sName].isApplicable = (function (dmgType, support) {
                                        if (sName.toLowerCase().indexOf('trap') > -1) {
                                            res[sName].initFunctions.push(function (skill) {
                                                skill.keywords.push('trap');
                                            });
                                            return function (skill) {
                                                return support.enabled &&
                                                    skill.keywords.indexOf('trap') < 0 &&
                                                    skill.keywords.indexOf('totem') < 0 &&
                                                    (skill.keywords.indexOf('mine') < 0 ||
                                                        skill.modifiers.indexOf(res['Remote Mine']) >= 0);
                                            };														
                                        } else if (sName.toLowerCase().indexOf('mine') > -1) {
                                            res[sName].initFunctions.push(function (skill) {
                                                skill.keywords.push('mine');
                                            });
                                            return function (skill) {
                                                return support.enabled &&
                                                    skill.keywords.indexOf('mine') < 0 &&
                                                    skill.keywords.indexOf('totem') < 0;
                                            };														
                                        } else {
                                            return function (skill) {
                                                return support.enabled &&
                                                    skill.keywords.indexOf(dmgType) > -1;
                                            };
                                        }
                                    })(translateMatch(matches[1]), res[sName]);
                                    
                                    res[sName].applyBefore.push((function(support) {
                                        var multipliers = [];
                                        for (stage in s.stageStats) {
                                            multipliers.push(parsePercent(s.stageStats[stage][columnIndex]) + 1);
                                        }
                                        return function (supportStage, skillLvl, skill) {
                                            skill.dmg.multiply({mult: multipliers[supportStage], lvl: skillLvl});
                                        };
                                    })(res[sName]));
                                    break;
                                case 'chanceToStatusAilment':
                                    var innerMatches = translateMatch(column.match(/chance to (\S+).*?on hit with (\S+) damage/i));
                                    res[sName].enabled = true;
                                    res[sName].isApplicable = (function (support, dmgType) {
                                        return function (skill) {
                                            return support.enabled &&
                                                skill.getDmg(dmgType, userInput.playerLvlForSuggestions).min > 0;
                                        };
                                    })(res[sName], translateMatch(innerMatches[2]));
                                    
                                    res[sName].applyFirst.push((function () {
                                        var additionalAilmentChance = {}, ailment = firstToUpper(translateMatch(innerMatches[1]));
                                        
                                        for (column in s.stageColumns) {
                                            if (s.stageColumns[column].indexOf('additional chance to') >= 0) {
                                                for (stage in s.stageStats) {
                                                    additionalAilmentChance[stage] =
                                                        parsePercent(s.stageStats[stage][column]);
                                                }
                                            }
                                        }
                                        
                                        return function (supportStage, skillLvl, skill) {
                                            skill['additionalChanceTo' + ailment][skillLvl] +=
                                                additionalAilmentChance[supportStage];
                                        };
                                    })());
                                    break;
                                case 'incrDmg':
                                    res[sName].applyFirst.push((function (type, support) {
                                        var incrDmg = {};
                                        for (column in s.stageColumns) {
                                            if (s.stageColumns[column].match('increased.*?' + translateMatch(matches[1]) + '.*?damage')) {
                                                for (stage in s.stageStats) {
                                                    var matchedPct = s.stageStats[stage][column].match(/(\d+%)/i);
                                                    if (matchedPct) {
                                                        incrDmg[stage] = parsePercent(matchedPct[1]);
                                                    } else {
                                                        incrDmg[stage] = 0;
                                                    }
                                                }
                                                break;
                                            }
                                        }
                                    
                                        return function (supportStage, skillLvl, skill) {
                                            skill.setIncrDmg(incrDmg[supportStage] || 0, type, skillLvl);
                                        }
                                    })(translateMatch(matches[1]), res[sName]));
                                    
                                    if ('faster projectiles' === sName.toLowerCase()) {
                                        res[sName].enabled = true;
                                        res[sName].isApplicable = (function (support) {
                                            return function (skill) {
                                                return support.enabled &&
                                                    skill.keywords.indexOf('projectile') >= 0;
                                            };
                                        })(res[sName]);
                                    } else if ('burning' === translateMatch(matches[1])) {
                                        res[sName].enabled = true;
                                        res[sName].isApplicable = (function (support) {
                                            return function (skill) {
                                                return support.enabled;
                                            };
                                        })(res[sName]);
                                    } else if ('Minion Damage' === sName) {
                                        res[sName].enabled = true;
                                        res[sName].isApplicable = (function (support) {
                                            return function (skill) {
                                                return support.enabled && skill.isMinion;
                                            };
                                        })(res[sName]);
                                    }
                                    break;
                                case 'incrOther'://ignore in case of dmg...
                                    break;
                                default:
                                    console.log(['no case added for', reType, s.stageColumns[column], sName]);
                                    break;
                                }
                            }// else console.log(['not applied', column, sName]);
                        }
                    }
                }
            }
        }, parse = function (data, modType) {
            for (sName in data) {
                s = data[sName];
                res[sName] = initModifier(sName, s, modType);
                
                for (i in s.modifiers) {
                    applyRegexes(s.modifiers[i]);
                }
                
                res[sName].isParsed = res[sName].enabled;
            }
        };
      
    parse(rawSupports, 'support');
    storedRes = res;
    
    res = {}
    parse(rawAuras, 'aura');
    auras = res;
    
    
    return storedRes;
})(),
getSortedSupports = function (s) {
    var support, key, tmpClone, stillApplicable, dmgPrev, dmgAfter, nonProblematicSupports,
        dmgMultForSupports = [];
    for (key in supports) {
        support = supports[key];
        if (s.modifiers.indexOf(support) < 0 && !s.modifiers.some(function (sup) { return sup.name === support.name; }) && support.isApplicable(s)) {
            tmpClone = s.clone('tmpClone');
            tmpClone.tryAddMod(support);//temp add support
            
            //s.calcDmg();//should not need recalc?
            dmgAfter = tmpClone.calcDmg(userInput.playerLvlForSuggestions);
            
            nonProblematicSupports = s.modifiers.filter(function (support) { return support.isApplicable(s); });
            stillApplicable = true;
            //test applicability of current supports.
            tmpClone.modifiers.forEach(function (innerSupport) {
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