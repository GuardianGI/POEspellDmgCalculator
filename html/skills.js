var skillDmg = function (rawSkill, lvl, additionalLvl, maxLvl) {
        var type,
            defaultDmg = function () { return {min: -1, max: -1, avg: -1}; },
            d = {phys: defaultDmg(),
                fire: defaultDmg(),
                cold: defaultDmg(),
                light: defaultDmg(),
                chaos: defaultDmg()},
            rawSkillDmg = getRawSkillDmgAtLvl(rawSkill, lvl, additionalLvl, maxLvl);
        if (rawSkillDmg) {
            for (type in d) {
                d[type].min = rawSkillDmg[type].min;
                d[type].max = rawSkillDmg[type].max;
                d[type].avg = (d[type].min + d[type].max) / 2;
            }
        }
        return d;
    },
    skill = function (rawSkill, name) {
        var s = {}, i, type;
        s.additionalLvl = 0;
        s.maxLvl = userInput.maxSpellLvl;
        s.name = name;
        s.keywords = rawSkill.keywords.slice(0);
        s.qualityBonus = rawSkill.qualityBonus;
        s.qualityLvl = userInput.qualityLvlAll;
        s.qualityEffects = [];
        s.cc = rawSkill.crit;
        s.eff = rawSkill.eff;
        s.cd = 2;//get from passive tree and inc crit dmg support.
        s.dmg = [];
        s.stages = [];
        s.mana = [];
        s.supports = [];
        s.incrCastSpeedFromQuality = 0;
        s.incrCcFromQuality = 0;
        s.additionalChanceToIgnite = [];
        s.otherIncrCastSpeed = [];
        s.castTime = rawSkill.castTime;
        s.projectiles = [];
        s.resPen = [];
        s.isMinion = rawSkill.hasAPS;
        s.chains = rawSkill.chains;
        s.supportQualityLvl = {};
        
        executeOnLoad.push(function () {
            var i;
            document.getElementById('qualityLvlAllSupports').onChangeFns.push(function () {
                for (i in supports) {
                    s.supportQualityLvl[supports[i].name] = userInput.qualityLvlAllSupports;
                }
            });
            for (i in supports) {
                s.supportQualityLvl[supports[i].name] = userInput.qualityLvlAllSupports;
            }
        });
        
        s.dmg.multiply = (function () {
            return function (poperties) {
                var d, lvl, isApplicable = function (t) {
                    return s.keywords.indexOf(t) >= 0;
                }, apply = (poperties.hasOwnProperty('type') ? function () {
                    var type;
                    if (poperties.hasOwnProperty('isDefense')) {//in case of defence only the final dmg type after conversions is applied (and the multiplier should be <= 1)
                        for (type in d) {
                            if (0 === type.indexOf(poperties.type) || isApplicable(poperties.type)) {
                                d[type].min *= poperties.mult;
                                d[type].max *= poperties.mult;
                                d[type].avg *= poperties.mult;
                            }
                        }
                    } else {
                        for (type in d) {
                            if ((poperties.hasOwnProperty('applicable') && poperties.applicable(type))
                                    || 0 <= type.indexOf(poperties.type) || isApplicable(poperties.type)) {
                                d[type].min *= poperties.mult;
                                d[type].max *= poperties.mult;
                                d[type].avg *= poperties.mult;
                            }
                        }
                    }
                } : function () {
                    var type;
                    for (type in d) {
                        d[type].min *= poperties.mult;
                        d[type].max *= poperties.mult;
                        d[type].avg *= poperties.mult;
                    }
                });
                if (poperties.hasOwnProperty('lvl') && undefined !== poperties.lvl) {
                    d = s.dmg[poperties.lvl];
                    apply();
                } else {
                    for (lvl = 0; lvl < 100; lvl += 1) {
                        d = s.dmg[lvl];
                        apply();
                    }
                }
            };
        })();

        s.getQualityLvl = function (lvl) {
            return s.qualityLvl + s.additionalQuality[lvl];
        };

        s.getProjectiles = function (lvl) {
            return s.projectiles[lvl].base * s.projectiles[lvl].multiplier;
        };
        s.getCastTime = function (lvl) {
            return s.castTime / (1 + (s.otherIncrCastSpeed[lvl] +
                userInput.incrCastSpeed / 100 +
                s.incrCastSpeedFromQuality * s.getQualityLvl(lvl)));
        };
        s.parseQualityBonus = function (rawQualityBonusStr, getQualityLvl, lvl) {
            var parse = function (qualityBonusStr) {
                var reIncr = /(\d+[.]?\d*)%\s*increased\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)/i,
                    reChance = /(\d+[.]?\d*)%\s*chance\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)/i,
                    matches = qualityBonusStr.match(reIncr), i, value, effect;
                if (null != matches && matches.length > 2) {
                    value = matches[1] - 0;
                    if (matches.length > 3) {
                        switch (matches[3]) {
                        case 'damage':
                            s.qualityEffects.push(function () {
                                s.applyForLvls(function (i) {
                                    s.setIncrDmg(value * getQualityLvl(i) / 100, translateMatch(matches[2]), i);
                                }, lvl);
                            });
                            break;
                        }
                        switch (matches[2] + ' ' + matches[3]) {
                        case 'projectile speed':
                            //ignore, adds no damage, only range/kill speed.
                            break;
                        case 'cast speed':
                            s.incrCastSpeedFromQuality = value / 100;
                            break;
                        case 'critical strike':
                            if ('chance' === matches[4]) {
                                s.incrCcFromQuality = value / 100;
                            }
                            break;
                        }
                    } else {
                        if ("damage" == matches[2]) {
                            s.qualityEffects.push(function () {
                                s.applyForLvls(function (i) {
                                    s.setIncrDmg(value * getQualityLvl(i) / 100, 'all', i);
                                }, lvl);
                            });
                        }
                    }
                } else {
                    matches = qualityBonusStr.match(reChance);
                    if (null != matches && matches.length > 4) {
                        value = matches[1] | 0;
                        if ("ignite" == matches[3]) {
                            s.applyForLvls(function (i) {
                                s.additionalChanceToIgnite[i] += (value / 100) * getQualityLvl(i);
                            }, lvl);
                        }//todo: add shock and freeze.
                    }
                }
            };
            rawQualityBonusStr.split('<br />').forEach(parse);
        };

        s.parseModifiers = function (lvl) {
            var key, i, reKey, m, matches, re = {
                'additionalProjectiles': /(\d+) additional projectiles/i
            };
            for (key = 0; key < rawSkill.modifiers.length; key += 1) {
                m = rawSkill.modifiers[key].toLowerCase();
                for (reKey in re) {
                    matches = m.match(re[reKey]);
                    if (null != matches && matches.length > 1) {
                        switch (reKey) {
                            case 'additionalProjectiles':
                                s.applyForLvls(function (i) {
                                    s.projectiles[i].base += matches[1] | 0;
                                }, lvl);
                                break;
                        }
                    }
                }
            }
        };

        s.applyCastTime = function (lvl) {
            s.applyForLvls(function (i) {
                var castTimeMultiplier = 1 / (s.getCastTime(i) * (!s.isFlameBlast ? 1 : 1 + userInput.flameBlastStage));
                s.dmg.multiply({'mult': castTimeMultiplier, 'lvl': i});
            }, lvl);
        };

        s.applyDefense = function (lvl) {
            var pen, monster, morePhysDmg = 1 + userInput.morePhysDmg / 100;
            
            s.applyForLvls(function (i) {
                var j;
                monster = getAvgMonsterAtLvl(i);
                for (j = 0; j < dmgTypes.length; j += 1) {
                    type = dmgTypes[j];
                    if (s.dmg[i].hasOwnProperty(type)) {
                        if ('phys' === type) {
                            if (s.dmg[i][type].min > 0 && s.dmg[i][type].max > 0) {
                                s.dmg[i][type].avg = calcAvgPhysDmg(s, s.dmg[i][type].min, s.dmg[i][type].max, monster.armour, i);
                                s.dmg[i][type].min = calcPhysDmg(s.dmg[i][type].min * morePhysDmg, monster.armour);
                                s.dmg[i][type].max = calcPhysDmg(s.dmg[i][type].max * morePhysDmg, monster.armour);
                            }
                        } else {
                            pen = 0;
                            if ('chaos' !== type) {
                                pen = userInput.reducedEleRes;//penetrate and res reduction for the element.
                                pen += s.resPen[i][type];
                                pen = monster[type] - pen > 100 ? monster[type] - 100 : pen;
                            }
                            s.dmg.multiply({'isDefense': true, 'mult': 1 - ((monster[type] - pen) / 100), 'type': type, 'lvl': i});
                            s.dmg[i][type].avg = (s.dmg[i][type].min + s.dmg[i][type].max) / 2;
                        }
                    }
                }
            }, lvl);
        };
        
        s.calcAvg = function (lvl) {
            s.applyForLvls(function (i) {
                for (type in s.dmg[i]) {
                    s.dmg[i][type].avg = (s.dmg[i][type].min + s.dmg[i][type].max) / 2;
                }
            }, lvl);
        };
        
        s.additionalCC = [];
        s.getCritChance = function (lvl) {
            return s.cc * 
                    (1 + userInput.incrCritChance / 100 +
                        s.additionalCC[lvl] +
                        s.incrCcFromQuality * s.getQualityLvl(lvl) +
                        (s.isIceSpear && userInput.assumeStageTwoIceSpear ? 5 : 0));
        };
        s.additionalCD = [];
        s.getCritDmg = function (lvl) {
            return s.cd + userInput.incrCritDmg / 100 + s.additionalCD[lvl];
        };
        s.applyCrit = function (lvl) {
            var chance, mult;
            s.applyForLvls(function (i) {
                chance = s.getCritChance(i);
                mult = 1 + (chance > 1 ? 1 : chance) * s.getCritDmg(i);
                s.dmg.multiply({'mult': mult,
                    'applicable':function(type) {//crit is applied when applying mosnter def for phys dmg
                        return 'phys' !== type || !userInput.enableMonsterDef; },
                    'lvl': i});
            }, lvl);
        };
        s.applyBurn = function (lvl) {
            //todo: in the event of a crit, should we apply the crit dmg? or is crit dmg already in the dps values?
            var d, apply = function (dmg, lvl) {
                var additionalIgniteChance = s.additionalChanceToIgnite[lvl] +
                            ((userInput.chanceToIgnite + userInput.monsterChanceToIgnite) / 100) +
                            s.getAdditionalChanceToIgnite(lvl),
                        chanceToIgnite = 1 - ((1 - s.cc) * (1 - additionalIgniteChance));
                    chanceToIgnite = chanceToIgnite > 1 ? 1 : chanceToIgnite;
                    return dmg * chanceToIgnite * 0.8 *
                        (1 + (userInput.incrBurnDmg / 100));//20% dps for 4 seconds = 0.2 * 4 = 0.8
                };
            
            s.applyForLvls(function (i) {
                d = s.getFireDmg(i);
                s.dmg[i].fire.min += apply(d.min, i);
                s.dmg[i].fire.max += apply(d.max, i);
                s.dmg[i].fire.avg += apply(d.avg, i);
            }, lvl);
        };
        
        //TODO: remove these 2 useless functions I'm too lazy to replace for now.
            s.applyDmgMultiplier = function (mult, lvl) {
                s.dmg.multiply({'mult': mult, 'lvl': lvl});
            };
            s.applySpecificMultiplier = function (mult, type, lvl) {
                    s.dmg.multiply({'mult': mult, 'type': type, 'lvl': lvl});
            };
        
        s.applyShock = function (lvl) {//assumes multi projectile always shotguns & light dmg is enough to make shock last.
            var hits = 1, shockStage, mult;
            s.applyForLvls(function (i) {
                if (s.getLightDmg(i).max > 0) {
                    hits = s.getProjectiles(i);
                    shockStage = function (stage) {
                        var m = 0.3 * Math.pow(s.cc, stage) * hits;
                        return m > 0.3 ? 0.3 : m;
                    };
                    mult = 1 + shockStage(1) + shockStage(2) + shockStage(3);
                    
                    s.dmg.multiply({'mult': mult, 'lvl': i});
                }
            }, lvl);
        };
        s.applyShotgun = function (lvl) {
            s.applyForLvls(function (i) {
                s.dmg.multiply({'mult': s.getProjectiles(i), 'lvl': i});
            }, lvl);
        };
        s.sumDmgLvl = function (dmgLvl) {
            var sum = 0;
            for (type in dmgLvl) {
                sum += dmgLvl[type].avg;
            }
            return sum;
        };
        s.totalDmg = function (lvl) {
            return s.sumDmgLvl(s.dmg[lvl]);
        };
        
        s.applyIncinerateStage = function (lvl) {
            var apply = function (dmg, castTimeLvl) {
                var time = 0, total = 0, stage = 1, repetition = 0, castTime = s.getCastTime(castTimeLvl);
                do {
                    total += dmg * stage;
                    if (stage < 4 && repetition == 4) {
                        stage += 1;
                        repetition = 0;
                    }
                    repetition += 1;
                    time += castTime
                } while (time + castTime <= userInput.incinerateCastDuration);
                return total / time;
            };
            
            s.applyForLvls(function (i) {
                for (type in s.dmg[i]) {
                    s.dmg[i][type].min = apply(s.dmg[i][type].min, i);
                    s.dmg[i][type].max = apply(s.dmg[i][type].max, i);
                    s.dmg[i][type].avg = (s.dmg[i][type].min + s.dmg[i][type].max) / 2;
                }
            }, lvl);
        };
        
        //todo: make sure these names are intact for spell coppies.
        s.isFlameSurge = s.name.indexOf("Flame Surge") > -1;
        s.isFlameBlast = s.name.indexOf("Flameblast") > -1;
        s.isIncinerate = s.name.indexOf("Incinerate") > -1;
        s.isIceSpear = s.name.indexOf("Ice Spear") > -1;
        s.isSearingBond = s.name.indexOf("Searing") > -1;
        s.isIceSpear = s.name.indexOf("Ice Spear") > -1;
        s.isFireStorm = s.name.indexOf("Firestorm") > -1;
        s.isEtherealKnives = s.name.indexOf("Ethereal Knives") > -1;
        s.isSpark = s.name.indexOf("Spark") > -1;
        s.isDesecrate = s.name.indexOf("Desecrate") > -1;
        s.isShockwaveTotem = s.name.indexOf("Shockwave Totem") > -1;
        s.isBearTrap = s.name.indexOf("Bear Trap") > -1;
        s.isBallLightning = s.name.indexOf("Ball Lightning") > -1;
        s.isGlacialCascade = s.name.indexOf("Glacial Cascade") > -1;
        s.isArc = s.name.indexOf("Arc") > -1;
        
        s.getSupportStage = function (support, lvl) {
            var stage;
            for (stage = 0; stage < support.stages.length; stage += 1) {
                if (support.stages[stage] > lvl) {
                    break;
                }
            }
            stage = stage > support.maxLvl ? support.maxLvl : stage;
            return stage - 1;//to 0 based index
        };
        s.applySupportStage = function (support, fn, lvl) {
            s.applyForLvls(function (i) {
                var stage = s.getSupportStage(support, i);
                if (stage >= 0) {
                    fn(stage, i, s);
                }
            }, lvl);
        };
        
        s.setIncrDmg = function (incr, type, lvl) {
            var apply = function () {
                if (undefined === s.dmgIncreases[lvl]) {
                    s.dmgIncreases[lvl] = {};
                }
                if (!s.dmgIncreases[lvl].hasOwnProperty(type)) {
                    s.dmgIncreases[lvl][type] = 0;
                }
                s.dmgIncreases[lvl][type] += incr;
            };
            if (undefined === type || '' === type) {
                type = 'all';
            }
            if (undefined !== lvl) {
                apply();
            } else {
                for (lvl = 0; lvl < 100; lvl += 1) {
                    apply();
                }
            }
        };
        
        s.getIcrDmg = function (type, lvl, keywords) {
            var incr = 0, typeKey, typeKeys, applicable = true, innerKey;
            for (typeKey in s.dmgIncreases[lvl]) {
                typeKeys = typeKey.split(', ');
                applicable = true;
                for (innerKey in typeKeys) {
                    innerKey = typeKeys[innerKey];
                    if (!(innerKey === type || keywords.indexOf(innerKey) >= 0 || 'all' === innerKey)) {
                        applicable = false;
                        break;
                    }									
                }
                if (applicable) {
                    incr += s.dmgIncreases[lvl][typeKey];
                }
            }
            return incr;
        };
        
        s.applyAPS = (function (lvl) {
            var apsStages;
            if (s.isMinion) {
                apsStages = rawSkill.dmg.map(function (skill) { return skill.APS; });
                return function () {
                    var i = 0, stage;
                    if (undefined === lvl) {
                        lvl = 0;
                        for (stage in s.stages) {
                            for (; lvl < stage; lvl += 1) {
                                s.dmg.multiply({'mult': apsStages[i], 'lvl': lvl});
                            }
                            i += 1;
                        }
                        for (; lvl < 100; lvl += 1) {
                            s.dmg.multiply({'mult': apsStages[apsStages.length - 1], 'lvl': lvl});
                        }
                        lvl = undefined;
                    } else {
                        done = false;
                        if (s.stages[0] <= lvl) {
                            for (i = 0; i < s.stages.length - 1; i += 1) {
                                if (s.stages[i] <= lvl && s.stages[i + 1] > lvl) {
                                    break;
                                }
                            }
                            s.dmg.multiply({'mult': apsStages[i], 'lvl': lvl});
                        }
                    }
                };
            } else {
                return function () {
                    if (s.isBallLightning) {
                        s.dmg.multiply({'mult': 5, 'lvl': lvl});
                    } else if (s.isGlacialCascade) {
                        s.dmg.multiply({'mult': 2, 'lvl': lvl});
                    }
                };
            }
        })();
        
        s.applyDmgIncreases = function (lvl) {
            var spellTypes = ['aoe', 'projectile', 'spell'],
                keywords, generalIncr = 0, lvl;
            
            keywords = s.keywords.filter(function (keyword) {
                for (key in spellTypes) {
                    if (spellTypes[key].toLowerCase() == keyword.toLowerCase()) {
                        return true;
                    }
                }
                return false;
            });
            keywords.forEach(function(keyword) {
                generalIncr += userInput[keyword + 'DmgIncr'] | 0;
            });
            s.applyForLvls(function (i) {
                var types, type, typesArr, incr, appliedGeneralEleDmg;
                for (types in s.dmg[i]) {
                    incr = 1 + generalIncr / 100;
                    appliedGeneralEleDmg = false
                    typesArr = types.split(' from ');
                    for (type in typesArr) {//usually just one, could be more.
                        type = typesArr[type];//get val, not key...
                        if (!appliedGeneralEleDmg && eleDmgTypes.indexOf(type) > -1) {
                            appliedGeneralEleDmg = true;
                            incr += userInput.eleDmgIncr / 100;
                        }
                        incr += userInput[type + 'DmgIncr'] / 100;
                        incr += s.getIcrDmg(type, i, keywords);//already in percent format....
                    }
                    ['min', 'max', 'avg'].forEach(function (key) {
                        s.dmg[i][types][key] *= incr;
                    });
                }
            }, lvl);
        };
        
        s.getCombatTime = function (lvl) {
            var life = lvl * lvl,//todo: get life from mosnter data
                castTime = s.getCastTime(lvl),
                dps = s.totalDmg(lvl);
            if (dps > 0 && castTime > 0) {
                //console.log(Math.ceil(life / s.totalDmg(lvl) / castTime) * castTime, dps, castTime);
                return Math.ceil(life / dps / castTime) * castTime;
            } else {
                return -1;
            }
        };
        
        s.applyForLvls = function (fn, start, end) {
            var lvl;
            if (undefined === start) {
                start = s.stages[0] || 0;
                end = 100;
            } else if (undefined === end) {
                end = start + 1;
            }
            for (lvl = start; lvl < end; lvl += 1) {
                fn(lvl);
            }
        };
        
        s.getDmg = function (type, lvl) {
            var key, dmgKey, dmg = {min: 0, max: 0, avg: 0};
            for (key in s.dmg[lvl]) {
                if (0 === key.indexOf(type)) {
                    for (dmgKey in dmg) {
                        dmg[dmgKey] += s.dmg[lvl][key][dmgKey];
                    }
                }
            }
            return dmg;
        };
        
        s.getFireDmg = function (lvl) {
            return s.getDmg('fire', lvl);
        };
        s.getPhysDmg = function (lvl) {
            return s.getDmg('phys', lvl);
        };
        s.getLightDmg = function (lvl) {
            return s.getDmg('light', lvl);
        };
        s.getColdDmg = function (lvl) {
            return s.getDmg('cold', lvl);
        };
        s.getChaosDmg = function (lvl) {
            return s.getDmg('chaos', lvl);
        };
        
        s.calcDmg = (function () {
            var needsRecalc = true;
            s.setNeedsRecalc = function () { needsRecalc = true; };
            return function (lvl) {
                var lastDmg = 0, support, key, type, j, getDmgTypes = function () {
                    return {fire: 0, cold: 0, light: 0, chaos: 0, phys: 0, elemental: 0, aoe: 0, projectile: 0};
                };
                if (!needsRecalc) {
                    return;
                }
                //reset things that may or may not get edited every calcDmg by supports and such.
                s.getAdditionalChanceToIgnite = function () { return 0; };
                
                s.keywords = rawSkill.keywords.slice(0);//reset keywords, may be modified by supports.
                if (s.isDesecrate || s.isShockwaveTotem || s.isBearTrap || s.isMinion) {
                    s.keywords.splice(s.keywords.indexOf('spell'), 1);//these may be spells, they are not affected by for instance increased spell dmg.
                }
                
                if (s.isMinion) {//assume all minions are melee, up to the user to decide if this will be the case...
                    s.keywords.push('melee');
                }
                
                s.incrCastSpeedFromQuality = 0;
                s.incrCcFromQuality = 0;
                s.dmgIncreases = [];
                s.empower = [];
                s.additionalQuality = [];
                s.additionalChanceToIgnite = [];
                
                s.applyForLvls(function (i) {
                    s.dmgIncreases[i] = getDmgTypes();
                    s.projectiles[i] = {base: 1, multiplier: 1};
                    s.empower[i] = 0;
                    s.additionalQuality[i] = 0;
                    s.additionalChanceToIgnite[i] = 0;
                }, lvl);
                
                for (key in s.supports) {
                    support = s.supports[key];
                    support.beforeDmgStages.forEach(function (fn) {
                        s.applySupportStage(support, fn, lvl);
                    });
                }
                
                s.stages = [];
                s.otherIncrCastSpeed = [];
                s.additionalCC = [];
                s.additionalCD = [];
                s.resPen = [];
                
                s.applyForLvls(function (i) {
                    s.dmg[i] = skillDmg(rawSkill, i, s.additionalLvl + s.empower[i], s.maxLvl);
                    if (s.sumDmgLvl(s.dmg[i]) > lastDmg) {//is new stage
                        s.stages.push(i);
                        lastDmg = s.sumDmgLvl(s.dmg[i]);
                    } else if (i > 0 && lastDmg > 0 && s.sumDmgLvl(s.dmg[i]) < lastDmg) {//is missing/corrupt stage
                        for (key in s.dmg[i]) {
                            for (type in s.dmg[i][key]) {
                                s.dmg[i][key][type] = s.dmg[i - 1][key][type];
                            }
                        }
                    }
                    
                    if (s.chains && s.stages.length > 0) {
                        s.projectiles[i].multiplier += rawSkill.dmg[s.stages.length - 1].chain;
                    }
                    
                    s.mana[i] = getRawSkillDmgAtLvl(rawSkill, i, s.additionalLvl, s.maxLvl).mana;
                    s.otherIncrCastSpeed[i] = 0;
                    s.additionalCC[i] = 0;
                    s.additionalCD[i] = 0;
                    s.resPen[i] = getDmgTypes();
                }, lvl);
                
                s.qualityEffects = [];
                s.parseQualityBonus(s.qualityBonus, s.getQualityLvl, lvl);
                if (s.isFireStorm) {
                    s.qualityEffects.push(function () {
                        s.applyForLvls(function (i) {
                            s.dmg.multiply({'mult': 1 / (0.1 - s.getQualityLvl(i) / 1000), 'lvl': i});
                        }, lvl);
                    });
                }
                
                s.parseModifiers();
                
                //begin applying supports.
                for (key in s.supports) {
                    support = s.supports[key];
                    support.initFunctions.forEach(function (fn) {
                        fn(s);
                    });
                    s.parseQualityBonus(support.qualityBonus,
                        (function (supportName) {
                            return function () { return s.supportQualityLvl[supportName];}
                        })(support.name),
                        lvl);
                }
                
                for (key in s.supports) {
                    support = s.supports[key];
                    
                    support.applyFirst.forEach(function (fn) {
                        s.applySupportStage(support, fn, lvl);
                    });
                    
                    support.types.forEach(function (type) {
                        switch (type) {
                        case 'chanceToStatusAilment':
                            if ('fire' === support.ailmentElement) {
                                s.getAdditionalChanceToIgnite = (function (support) {
                                    return function (lvl) {
                                        var stage = s.getSupportStage(support, lvl);
                                        if (stage >= 0) {
                                            return support.additionalAilmentChance[stage];
                                        }
                                        return 0;
                                    };
                                })(support);
                            }
                            break;
                        default:
                            //console.log(['default for', support.type, support.name]);
                            break;
                        }
                    });
                }
                
                for (key in s.supports) {
                    support = s.supports[key];
                    support.applyBefore.forEach(function (fn) {
                        s.applySupportStage(support, fn, lvl);
                    });
                }
                
                if (userInput.enableShock) {
                    s.applyShock(lvl);
                }
                if (userInput.enableCrit) {
                    s.applyCrit(lvl);
                }
                if (userInput.enableBurn && !s.isFlameSurge) {
                    s.applyBurn(lvl);
                }
                if (s.isIncinerate) {
                    if (userInput.enableCastSpeed) {
                        s.applyIncinerateStage(lvl);
                    } else {
                        s.applyDmgMultiplier(4, lvl);
                    }
                }
                if (userInput.enableFlameSurgeBurn && s.isFlameSurge) {
                    s.applyDmgMultiplier(1.5, lvl);
                }
                if (s.isFlameBlast) {
                    s.applyDmgMultiplier(1 + 1.1 * userInput.flameBlastStage, lvl);
                }
                
                for (i in s.qualityEffects) {
                    s.qualityEffects[i]();
                }
                
                s.applyDmgMultiplier(s.eff);
                s.applyDmgIncreases();
                
                if (s.isSearingBond) {
                    s.applySpecificMultiplier(1 + userInput.incrBurnDmg / 100, 'fire', lvl);
                }
                
                if (userInput.enableMonsterDef) {
                    s.applyDefense(lvl);
                } else {
                    s.calcAvg(lvl);
                }
                
                if (userInput.assumeShotgun) {
                    s.applyShotgun(lvl);
                }
                
                for (key in s.supports) {
                    support = s.supports[key];
                    support.applyAfter.forEach(function (fn) {
                        s.applySupportStage(support, fn, lvl);
                    });
                }
                
                if (userInput.enableCastSpeed && !s.isIncinerate) {
                    s.applyCastTime(lvl);
                }
                
                if (userInput.applyAPS) {
                    s.applyAPS(lvl);
                }
                
                s.hasDmg = s.totalDmg(40) > 0;//all skills are usable after lvl 31 (I think), so at 40 all skills should be able to deal dmg if they deal dmg at all.
                s.draw = s.hasDmg;
                s.ignore = s.totalDmg(userInput.playerLvlForSuggestions) > 0;
                
                needsRecalc = false;
                if (undefined !== lvl) {
                    return s.totalDmg(lvl);
                }
            };
        })();
        
        s.clone = function (newName) {
            var key, clone = skill(rawSkill, name);
            for (key in s.supports) {
                clone.supports.push(s.supports[key].clone());
            }
            for (key in s.supportQualityLvl) {
                clone.supportQualityLvl[key] = s.supportQualityLvl[key];
            }
            clone.setNeedsRecalc();
            clone.name = newName + ' : ' + s.name;
            return clone;
        }
        
        s.calcDmg();
        return s;
    };

executeOnLoad.push(function () {
    var name;
    for (name in rawSkills) {
        skills[name] = skill(rawSkills[name], name);
    }
    publicSkills = skills;
});