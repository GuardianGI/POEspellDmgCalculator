var skillDmg = function (rawSkill, lvl, additionalLvl, maxLvl) {
        var type, addAsType,
            d = {phys: defaultDmg(),
                fire: defaultDmg(),
                cold: defaultDmg(),
                light: defaultDmg(),
                chaos: defaultDmg()},
            rawSkillDmg = getRawSkillDmgAtLvl(rawSkill, lvl, additionalLvl, maxLvl);
        if (rawSkillDmg) {
            for (type in rawSkillDmg) {
                addAsType = type.replace(/_/g, ' ');
                if (d.hasOwnProperty(type) || type !== addAsType) {
                    if (!d.hasOwnProperty(addAsType)) {
                        d[addAsType] = {};
                    }
                    d[addAsType].min = rawSkillDmg[type].min;
                    d[addAsType].max = rawSkillDmg[type].max;
                    d[addAsType].avg = (d[addAsType].min + d[addAsType].max) / 2;
                }
            }
        }
        return d;
    },
    skill = function (rawSkill, name) {
        var s = {}, i, type, resetKeywords = function () {
            s.keywords = rawSkill.keywords.slice(0).map(translateMatch);
        };
        s.additionalLvl = 0;
        s.maxLvl = userInput.maxSpellLvl;
        s.name = name;
        resetKeywords();
        s.qualityBonus = rawSkill.qualityBonus;
        s.qualityLvl = userInput.qualityLvlAll;
        s.qualityEffects = [];
        s.cc = rawSkill.crit;
        s.eff = rawSkill.eff;
        s.radius = rawSkill.radius;
        s.cd = 1;
        s.dmg = [];
        s.stages = [];
        s.mana = [];
        s.modifiers = [];
        s.incrCastSpeedFromQuality = 0;
        s.incrCcFromQuality = 0;
        s.otherIncrCastSpeed = [];
        s.castTime = rawSkill.castTime;
        s.projectiles = [];
        s.resPen = [];
        s.isMinion = rawSkill.hasAPS || s.name.indexOf('Animate') >= 0;
        s.maxMinions = 0;
        s.chains = rawSkill.chains;
        s.supportQualityLvl = {};
        s.additionalKeywordLvl = {};
        
        s.tryAddMod = function (mod) {
            if (mod.isApplicable(s)) {
                s.modifiers.push(mod);
                s.setNeedsRecalc();
            }
        }
        s.tryRemoveMod = function (mod) {
            var index = s.modifiers.indexOf(mod);
            if (index >= 0) {
                s.modifiers.splice(index, 1);
                s.setNeedsRecalc();
            }
        }
        
        if (s.isMinion) {
            s.maxMinions = 3;//todo: get actual values form skills... and then limit animate weapon somehow...
        }
        
        addExecuteOnLoad(function () {
            var i;
            document.getElementById('qualityLvlAllSupports').executeOnChange.push(function () {
                for (i in supports) {
                    s.supportQualityLvl[supports[i].name] = userInput.qualityLvlAllSupports;
                }
            });
            for (i in supports) {
                s.supportQualityLvl[supports[i].name] = userInput.qualityLvlAllSupports;
            }
        });
        
        s.dmg.multiply = (function () {
            return function (properties) {
                var d, lvl, isApplicable = function (t) {
                    return s.keywords.indexOf(t) >= 0;
                }, apply = (properties.hasOwnProperty('type') ? function () {
                    var type;
                    if (properties.hasOwnProperty('isDefense')) {//in case of defence only the final dmg type after conversions is applied (and the multiplier should be <= 1)
                        for (type in d) {
                            if (0 === type.indexOf(properties.type) || isApplicable(properties.type)) {
                                d[type].min *= properties.mult;
                                d[type].max *= properties.mult;
                                d[type].avg *= properties.mult;
                            }
                        }
                    } else {
                        for (type in d) {
                            if ((properties.hasOwnProperty('applicable') && properties.applicable(type))
                                    || 0 <= type.indexOf(properties.type)
                                    || isApplicable(properties.type)
                                    || ('elemental' === properties.type && isEleDmgType(type))
                                    || ('dot' === properties.type && isDotType(type))
                                    ) {
                                d[type].min *= properties.mult;
                                d[type].max *= properties.mult;
                                d[type].avg *= properties.mult;
                            }
                        }
                    }
                } : function () {
                    var type;
                    for (type in d) {
                        d[type].min *= properties.mult;
                        d[type].max *= properties.mult;
                        d[type].avg *= properties.mult;
                    }
                });
                if (properties.hasOwnProperty('lvl') && undefined !== properties.lvl) {
                    d = s.dmg[properties.lvl];
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

        s.getHits = function (lvl) {
            return s.projectiles[lvl].base * s.projectiles[lvl].multiplier * s.traps[lvl].base;
        };
        s.getCastTime = function (lvl) {
            return s.castTime / ((userInput.frenzyCharges * 0.05) +
                1 + (s.otherIncrCastSpeed[lvl] +
                userInput.incrCastSpeed / 100 +
                s.incrCastSpeedFromQuality * s.getQualityLvl(lvl)));
        };
        s.parseQualityBonus = function (rawQualityBonusStr, getQualityLvl, lvl) {
            var parse = function (qualityBonusStr) {
                var reIncr = /(\d+[.]?\d*)%\s*increased\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)/i,
                    reChance = /(\d+[.]?\d*)%\s*chance\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)\s*(\w*)/i,
                    matches = qualityBonusStr.match(reIncr), i, value, effect, strippedMatches = [];
                if (null != matches && matches.length > 2) {
                    value = matches[1] - 0;
                    if (matches.indexOf('damage') >= 2) {//handle all direct dmg increases.
                        for (i = 2; i < matches.indexOf('damage'); i += 1) {
                            strippedMatches.push(matches[i]);
                        }
                        strippedMatches = strippedMatches.map(translateMatch);
                        if (0 === strippedMatches.length) {
                            strippedMatches.push('all');
                        }
                        
                        s.applyForLvls(function (i) {
                            s.setIncrDmg(value * getQualityLvl(i) / 100, strippedMatches.join(', '), i);
                        }, lvl);
                        
                    } else {//handles random other increases...
                        if (matches.length > 3) {
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
                                } else if ('damage' === matches[4] || 'multiplier' === matches[4]) {
                                    s.incrCdFromQuality = value / 100;
                                }
                                break;
                            }
                            switch (matches[2] + ' ' + matches[3] + ' ' + matches[4]) {
                            case 'skill effect duration':
                                s.applyForLvls(function (i) {
                                    s.increasedDuration[i] += value * getQualityLvl(i) / 100;
                                }, lvl);
                                break;
                            }
                        }
                    }
                } else {
                    matches = qualityBonusStr.match(reChance);
                    if (null != matches && matches.length > 4) {
                        value = matches[1] - 0;//cast to float
                        if ("ignite" == matches[3]) {
                            s.applyForLvls(function (i) {
                                s.additionalIgniteChance[i] = (value / 100) * getQualityLvl(i) + (s.additionalIgniteChance[i] || 0);
                            }, lvl);
                        } else if ('shock' == matches[3]) {//todo: add freeze.
                            s.applyForLvls(function (i) {
                                s.additionalShockChance[i] = (value / 100) * getQualityLvl(i) + (s.additionalShockChance[i] || 0);
                            }, lvl);
                        }
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
            if (s.keywords.indexOf('trap') >= 0 || s.keywords.indexOf('mine') >= 0 ) {
                s.applyForLvls(function (i) {
                    var castTimeMultiplier = 2;//default trap speed is 0.5 seconds, 1 / 0.5 = 2
                    s.dmg.multiply({'mult': castTimeMultiplier, 'lvl': i});
                }, lvl);
            } else {
                s.applyForLvls(function (i) {
                    var castTimeMultiplier = 1 / (s.getCastTime(i) * (!s.isFlameBlast ? 1 : 1 + userInput.flameBlastStage));
                    s.dmg.multiply({'mult': castTimeMultiplier, 'lvl': i});
                }, lvl);
            }
        };

        s.applyDefense = function (lvl) {
            var pen, res, reduced, monster;
            
            s.applyForLvls(function (i) {
                var j, dmg, life, nrOfHits;
                monster = getAvgMonsterAtLvl(i);
                for (j = 0; j < dmgTypes.length; j += 1) {
                    type = dmgTypes[j];
                    if (s.dmg[i].hasOwnProperty(type)) {
                        if ('phys' === type) {
                            if (s.dmg[i][type].min > 0 && s.dmg[i][type].max > 0) {
                                s.dmg[i][type].avg = calcAvgPhysDmg(s, s.dmg[i][type].min, s.dmg[i][type].max, monster.armour, i);
                                s.dmg[i][type].min = calcPhysDmg(s.dmg[i][type].min, monster.armour);
                                s.dmg[i][type].max = calcPhysDmg(s.dmg[i][type].max, monster.armour);
                            }
                        } else {
                            pen = 0;
                            reduced = 0;
                            if (eleDmgTypes.indexOf(type) >= 0) {//if type is ele dmg:
                                reduced = (userInput.reducedResElemental || 0) + (s.reducedRes[i].elemental || 0);
                            }
                            reduced += userInput['reducedRes' + firstToUpper(type)] || 0;
                            reduced += s.reducedRes[i][type] || 0;
                            pen += s.resPen[i][type];
                            res = monster[type];
                            res -= reduced;
                            res = res > 75 ? 75 : res;
                            res -= pen;
                            s.dmg.multiply({'isDefense': true, 'mult': 1 - (res / 100), 'type': type, 'lvl': i});
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
        
        s.addCullingStrike = function (lvl) {
            s.dmg.multiply({mult: userInput.partySize / 0.9, lvl: lvl});
        };
        
        s.additionalIncrCC = [];
        s.getCritChance = function (lvl) {
            var cc = s.cc * (1 +
                (userInput.powerCharges * 0.5) +
                (s.isMinion ? 0 : (userInput.incrCritChance / 100)) +
                s.additionalIncrCC[lvl] +
                s.incrCcFromQuality * s.getQualityLvl(lvl) +
                (s.isIceSpear && userInput.assumeStageTwoIceSpear ? 5 : 0));
            cc += s.additionalCritChance[lvl] || 0;
            return cc > 1 ? 1 : cc < 0 ? 0 : cc;
        };
        s.additionalCD = [];
        s.getCritDmg = function (lvl) {
            return (s.cd +
                    (s.additionalCritDamage[lvl] || 0) +
                    (s.isMinion ? 0 : userInput.incrCritDmg / 100) +
                    s.additionalCD[lvl] +
                    s.incrCdFromQuality * s.getQualityLvl(lvl))
                * s.moreCritDamage[lvl];
        };
        s.applyCrit = function (lvl) {
            var chance, mult;
            s.applyForLvls(function (i) {
                chance = s.getCritChance(i);
                mult = 1 + (chance * s.getCritDmg(i));
                s.dmg.multiply({'mult': mult,
                    'applicable': function(type) {//crit is applied when applying mosnter def for phys dmg
                        return 0 !== type.indexOf('phys') || !userInput.enableMonsterDef; },
                    'lvl': i});
            }, lvl);
        };
        s.getIncrDurationMutiplier = function (type, lvl) {
            return 1 + s.increasedDuration[lvl] +
                (s.isMinion ? 0 : ((userInput.incrDuration / 100 || 0)));
        };
        s.applyBurn = function (lvl) {
            //todo: in the event of a crit, should we apply the crit dmg? or is crit dmg already in the dps values?
            var apply = function (fromType, toType, lvl) {
                var mult, additionalIgniteChance = s.additionalIgniteChance[lvl] +
                            (s.isMinion ? 0 : (userInput.chanceToIgnite / 100)) +
                            s.getadditionalIgniteChance(lvl),
                        chanceToIgnite = 1 - ((1 - s.getCritChance(lvl)) * (1 - additionalIgniteChance));
                    chanceToIgnite = chanceToIgnite > 1 ? 1 : chanceToIgnite;
                    mult = chanceToIgnite * 0.8 * s.getIncrDurationMutiplier('burn', lvl) *
                        (1 + (s.isMinion ? 0 : (userInput.burningDmgIncr / 100)));//20% dps for 4 seconds = 0.2 * 4 = 0.8
                    if (mult > 0) {
                        dmgLvls.forEach(function (minMaxAvg) {
                            s.dmg[lvl][toType][minMaxAvg] += s.dmg[lvl][fromType][minMaxAvg] * mult;
                        });
                    }
                };
            
            s.applyForLvls(function (i) {
                var asTypeBase = 'burning from ', fromType, fromTypes = [];
                for (fromType in s.dmg[i]) {
                    if (fromType.indexOf('fire') >= 0 && fromType.indexOf('burning') < 0 && s.dmg[i][fromType].min > 0) {
                        fromTypes.push(fromType);
                    }
                }
                fromTypes.forEach(function (fromType) {
                    var asType = asTypeBase + fromType;
                    if (!s.dmg[i].hasOwnProperty(asType)) {
                        s.dmg[i][asType] = defaultDmg();
                    }
                    apply(fromType, asType, i);
                });
            }, lvl);
        };
        
        s.getChanceToShock = function (lvl) {
            return (s.isMinion ? 0 : (userInput.chanceToShock / 100)) + (s.additionalShockChance[lvl] || 0);
        };
        
        s.applyShockLegacy = function (lvl) {//assumes multi projectile always shotguns & light dmg is enough to make shock last.
            var hits = 1, shockStage, mult, chanceToShock;
            s.applyForLvls(function (i) {
                chanceToShock = s.getCritChance(i) + s.getChanceToShock(i);
                chanceToShock = chanceToShock > 1 ? 1 : chanceToShock;
                if (s.getLightDmg(i).max > 0) {
                    hits = s.getHits(i);
                    shockStage = function (stage) {
                        var m = 0.3 * Math.pow(chanceToShock, stage) * hits;
                        return m > 0.3 ? 0.3 : m;
                    };
                    mult = 1 + shockStage(1) + shockStage(2) + shockStage(3);
                    
                    s.dmg.multiply({'mult': mult, 'lvl': i});
                }
            }, lvl);
        };
        s.applyShock = function (lvl) {//assumes multi projectile always shotguns & light dmg is enough to make shock last.
            var hits = 1, shockStage, mult, chanceToShock;
            s.applyForLvls(function (i) {
                chanceToShock = s.getCritChance(i) + s.getChanceToShock(i);
                chanceToShock = chanceToShock > 1 ? 1 : chanceToShock;
                if (s.getLightDmg(i).max > 0) {
                    hits = s.getHits(i);
                    shockStage = function () {
                        var m = 0.5 * hits;
                        return m > 0.5 ? 0.5 : m;
                    };
                    mult = 1 + shockStage();
                    
                    s.dmg.multiply({'mult': mult, 'lvl': i});
                }
            }, lvl);
        };
        s.applyShotgun = function (lvl) {
            s.applyForLvls(function (i) {
                s.dmg.multiply({'mult': s.getHits(i), 'lvl': i});
            }, lvl);
        };
        s.sumDmgLvl = function (dmgLvl, burnOnly) {
            var sum = 0;
            burnOnly = burnOnly || false;
            for (type in dmgLvl) {
                if (!burnOnly || 0 === type.indexOf('burning')) {
                    sum += dmgLvl[type].avg;
                }
            }
            return sum;
        };
        s.totalDmg = function (lvl) {
            return s.sumDmgLvl(s.dmg[lvl], userInput.burnDmgOnly);
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
        s.isSrs = s.name.indexOf("Summon Raging Spirit") > -1;
        s.isDischarge = s.name.indexOf("Discharge") > -1;
        s.isRf = s.name.indexOf("Righteous Fire") > -1;
        
        s.applySwarm = function () {
            s.dmg.multiply({'mult': s.maxMinions});
        };
        
        s.getSupportStage = function (support, lvl) {
            var stage;
            for (stage = 0; stage < support.stages.length; stage += 1) {
                if (support.stages[stage] > lvl) {
                    break;
                }
            }
            stage = stage > support.maxLvl ? support.maxLvl : stage;
            
            for (keyword in s.additionalKeywordLvl) {
                if (support.keywords.indexOf(keyword) >= 0 || 'all' === keyword) {
                    stage += s.additionalKeywordLvl[keyword];
                }
            }
            stage = stage > support.stages.length ? support.stages.length : stage;
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
            var apply = 'attack' === type ? function () {
                    s.incrAps[lvl] += incr;
                }: 'cast' === type ? function () {
                    s.otherIncrCastSpeed[lvl] += incr;
                }: function () {
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
        
        s.getIncrDmg = function (type, lvl) {
            var typesArr = type.split(' from '), addEleDmg = false,
                incr = 0, typeKey, typeKeys, applicable = true, innerKey;
            for (type in typesArr) {//is ele dmg? add ele dmg incr.
                type = typesArr[type];
                if (!addEleDmg && eleDmgTypes.indexOf(type) >= 0) {
                    addEleDmg = true;
                    if (!s.isMinion) {
                        incr += ((userInput['eleDmgIncr'] || 0) | 0) / 100;
                    }
                    incr += s.dmgIncreases[lvl]['elemental'];
                    break;
                }
            }
            
            if (!s.isMinion) {
                for (type in typesArr) {
                    type = typesArr[type];
                    incr += ((userInput[type + 'DmgIncr'] || 0) | 0) / 100;
                }
                
                s.keywords.forEach(function(keyword) {
                    if (typesArr.indexOf(keyword) < 0) {
                        incr += ((userInput[keyword + 'DmgIncr'] || 0) | 0) / 100;
                    }
                });
            }
            for (typeKey in s.dmgIncreases[lvl]) {
                typeKeys = typeKey.split(', ');
                applicable = true;
                for (type in typesArr) {
                    type = typesArr[type];
                    for (innerKey in typeKeys) {
                        innerKey = typeKeys[innerKey];
                        if (!(innerKey === type || s.keywords.indexOf(innerKey) >= 0 || 'all' === innerKey)) {
                            applicable = false;
                            break;
                        }
                    }
                }
                if (applicable) {
                    incr += s.dmgIncreases[lvl][typeKey];
                }
            }
                
            if (s.isMinion) {
                incr += (s.dmgIncreases[lvl]['minion'] || 0);
            }
            return incr;
        };
        
        s.applyAPS = (function (lvl) {
            var apsStages;
            if (s.isMinion) {
                apsStages = rawSkill.dmg.map(function (skill) {
                    return skill.APS;
                });
                return function () {
                    var stageId = 0, stage, apply = function () {
                        s.dmg.multiply({'mult': (apsStages[stageId] || 1) * (1 + (s.incrAps[lvl] || 0)), 'lvl': lvl});
                    };
                    if (undefined === lvl) {
                        lvl = 0;
                        for (stage in s.stages) {
                            for (; lvl < stage; lvl += 1) {//for lvl up to last stage
                                apply();
                            }
                            stageId += 1;
                        }
                        stageId = apsStages.length - 1;
                        for (; lvl < 100; lvl += 1) {//lvl form last stage up to 100.
                                apply();
                        }
                        lvl = undefined;
                    } else {
                        done = false;
                        if (s.stages[0] <= lvl) {
                            for (stageId = 0; stageId < s.stages.length - 1; stageId += 1) {
                                if (s.stages[stageId] <= lvl && s.stages[stageId + 1] > lvl) {
                                    break;
                                }
                            }
                            s.dmg.multiply({'mult': apsStages[stageId] || 1 * (1 + (s.incrAps[lvl] || 0)), 'lvl': lvl});
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
            s.applyForLvls(function (i) {
                var type, mult;
                for (type in s.dmg[i]) {
                    mult = 1 + s.getIncrDmg(type, i);
                    dmgLvls.forEach(function (dmgLvl) {
                        s.dmg[i][type][dmgLvl] *= mult;
                    });
                }
            }, lvl);
        };
        
        s.getCombatTime = function (lvl) {
            var life = lvl * lvl,
                castTime = s.getCastTime(lvl),
                dps = s.totalDmg(lvl);
            if (dps > 0 && castTime > 0) {
                return Math.ceil(life / dps / castTime) * castTime;
            } else {
                return -1;
            }
        };
        
        s.applyForLvls = function (fn, start, end) {
            var lvl;
            if (undefined === start) {
                start = 0;
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
        
        s.applyRadiusMultiplier = function (lvl) {
            s.dmg.multiply({'mult': s.radius > 0 && s.keywords.indexOf('aoe') >= 0 ? 1 + s.radius / 5 : 1, 'lvl': lvl});
        };
        
        s.calcDmg = (function () {
            var needsRecalc = true;
            s.setNeedsRecalc = function () { needsRecalc = true; };
            return function (lvl) {
                var index, lastDmg = 0, support, key, type, j, additionalLvlsFromGear = 0, keyword, getDmgTypes = function () {
                    return {fire: 0, cold: 0, light: 0, chaos: 0, phys: 0, elemental: 0, aoe: 0, projectile: 0};
                };
                if (!needsRecalc) {
                    return;
                }
                
                //reset things that may or may not get edited every calcDmg by supports and such.
                s.getadditionalIgniteChance = function () { return 0; };
                
                resetKeywords();//reset keywords, may be modified by supports.
                if (s.isDesecrate || s.isShockwaveTotem || s.isBearTrap || s.isMinion || s.isRf) {
                    index = s.keywords.indexOf('spell');
                    if (index >= 0) {
                        s.keywords.splice(index, 1);//these may be spells, they are not affected by for instance increased spell dmg.
                    }
                }
                
                if (s.isMinion) {//assume all minions are melee, up to the user to decide if this will be the case...
                    s.keywords.push('melee');
                    s.keywords.push('attack');
                    if (s.keywords.indexOf('duration') >= 0) {//cast speed doesn;t really affect the dps of permanent minions (in case of a casting spectre just use faster attacks and your imagination...)
                        s.keywords.push('cast');
                    }
                }
                if (s.isShockwaveTotem || s.keywords.indexOf('spell') >= 0) {//todo: check if shockwave totem really is affected by incr cast speed.
                    s.keywords.push('cast');
                }
                
                s.incrCastSpeedFromQuality = 0;
                s.incrCcFromQuality = 0;
                s.incrCdFromQuality = 0;
                s.dmgIncreases = {};
                s.incrAps = {};
                s.empower = {};
                s.additionalQuality = {};
                s.additionalIgniteChance = {};
                s.additionalShockChance = {};
                s.additionalFreezeChance = {};
                s.additionalCritChance = {};
                s.moreCritDamage = {};
                s.additionalCritDamage = {};
                s.traps = {};
                s.increasedDuration = {};
                s.projectiles = {};
                s.reducedRes = {};
                                
                s.applyForLvls(function (i) {
                    s.dmgIncreases[i] = getDmgTypes();
                    s.projectiles[i] = {base: 1, multiplier: 1};
                    s.incrAps[i] = 0;
                    s.traps[i] = {base: 1};
                    s.empower[i] = 0;
                    s.additionalQuality[i] = 0;
                    s.additionalIgniteChance[i] = 0;
                    s.additionalShockChance[i] = 0;
                    s.additionalFreezeChance[i] = 0;
                    s.additionalCritChance[i] = 0;
                    s.additionalCritDamage[i] = 0;
                    s.moreCritDamage[i] = 1;
                    s.increasedDuration[i] = 0;
                    s.reducedRes[i] = {};
                }, lvl);
                
                for (key in s.modifiers) {
                    support = s.modifiers[key];
                    support.beforeDmgStages.forEach(function (fn) {
                        s.applySupportStage(support, fn, lvl);
                    });
                }
                
                s.stages = [];
                s.otherIncrCastSpeed = [];
                s.additionalIncrCC = [];
                s.additionalCD = [];
                s.resPen = [];
                for (keyword in s.additionalKeywordLvl) {
                    if (s.keywords.indexOf(keyword) >= 0 || 'all' === keyword) {
                        additionalLvlsFromGear += s.additionalKeywordLvl[keyword];
                    }
                }
                s.applyForLvls(function (i) {
                    var sumDmg;
                    s.dmg[i] = skillDmg(rawSkill, i, s.additionalLvl + s.empower[i] + additionalLvlsFromGear, s.maxLvl);
                    sumDmg = s.sumDmgLvl(s.dmg[i]);
                    if (sumDmg > lastDmg) {//is new stage
                        s.stages.push(i);
                        lastDmg = sumDmg;
                    } else if (i > 0 && lastDmg > 0 && sumDmg < lastDmg) {//is missing/corrupt stage
                        for (key in s.dmg[i]) {//use prev stage.
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
                    s.additionalIncrCC[i] = 0;
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
                } else if (s.isDischarge) {
                    (function () {
                        var charges,
                            type,
                            typeToCharge = {'fire': 'enduranceCharges',
                                'light': 'powerCharges',
                                'cold': 'frenzyCharges'};
                        for (type in eleDmgTypes) {
                            type = eleDmgTypes[type];
                            charges = userInput[typeToCharge[type]];
                            s.applyForLvls(function (i) {
                                dmgLvls.forEach(function (dLvl) {
                                    s.dmg[i][type][dLvl] *= charges;
                                });
                            }, lvl);
                        }
                    })();
                } else if (s.isRf) {
                    s.applyForLvls(function (i) {
                        s.dmg[i]['burning from fire from life'] = {};
                        dmgLvls.forEach(function (dLvl) {
                            s.dmg[i]['burning from fire from life'][dLvl] = userInput.life / 2;
                        });
                    }, ((rawSkill.dmg[0].lvl | 0) || 0), 100);//todo:get from s.stages?
                }
                s.parseModifiers(lvl);
                if (s.isSrs) {//luckily no additional phys dmg bufs exist for now...
                    s.dmg.multiply({'mult': 0.5, 'type': 'phys'});
                    s.applyForLvls(function (i) {
                        var minMaxAvg;
                        s.dmg[i]['fire from phys'] = {};
                        for (minMaxAvg in s.dmg[i].phys) {
                            s.dmg[i]['fire from phys'][minMaxAvg] = s.dmg[i].phys[minMaxAvg];
                        }
                    }, lvl);
                }
                //begin applying supports.
                for (key in s.modifiers) {
                    support = s.modifiers[key];
                    support.initFunctions.forEach(function (fn) {
                        fn(s);
                    });
                    s.parseQualityBonus(support.qualityBonus,
                        (function (supportName) {
                            return function () { return s.supportQualityLvl[supportName] || 0; }
                        })(support.name),
                        lvl);
                }
                
                for (key in s.modifiers) {
                    support = s.modifiers[key];
                    
                    support.applyFirst.forEach(function (fn) {
                        s.applySupportStage(support, fn, lvl);
                    });
                    
                    support.types.forEach(function (type) {
                        switch (type) {
                        case 'chanceToStatusAilment':
                            if ('fire' === support.ailmentElement) {
                                s.getadditionalIgniteChance = (function (support) {
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
                for (key in s.modifiers) {
                    support = s.modifiers[key];
                    support.applyAfterFirst.forEach(function (fn) {
                        s.applySupportStage(support, fn, lvl);
                    });
                }
                for (key in s.modifiers) {
                    support = s.modifiers[key];
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
                        s.dmg.multiply({'mult': 4, 'lvl': lvl});
                    }
                }
                if (userInput.enableFlameSurgeBurn && s.isFlameSurge) {
                    s.dmg.multiply({'mult': 1.5, 'lvl': lvl});
                }
                if (s.isFlameBlast) {
                    s.dmg.multiply({'mult': 1 + 1.1 * userInput.flameBlastStage, 'lvl': lvl});
                }
                
                for (i in s.qualityEffects) {
                    s.qualityEffects[i]();
                }
                
                s.dmg.multiply({'mult': s.eff, 'lvl': lvl});
                s.applyDmgIncreases(lvl);
                                
                if (userInput.enableMonsterDef) {
                    s.applyDefense(lvl);
                } else {
                    s.calcAvg(lvl);
                }
                
                if (userInput.assumeShotgun) {
                    s.applyShotgun(lvl);
                } else {//trap count is applied in shotgun as it counts as multiple hits.
                    s.applyForLvls(function (i) {
                        s.dmg.multiply({'mult': s.traps[i].base, 'lvl': i});
                    }, lvl);
                }
                
                if (userInput.applyRadiusTargets) {
                    s.applyRadiusMultiplier(lvl);
                }
                
                for (key in s.modifiers) {
                    support = s.modifiers[key];
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
                if (userInput.singleTargetSwarm && s.isMinion) {
                    s.applySwarm();
                }
                
                s.hasDmg = (s.totalDmg(40) || -1) > 0;//all skills are usable after lvl 31 (I think), so at 40 all skills should be able to deal dmg if they deal dmg at all.
                if (!s.hasOwnProperty('isParsed')) {
                    s.enabled = s.hasDmg;
                    s.isParsed = s.enabled;
                }
                s.ignore = s.totalDmg(userInput.playerLvlForSuggestions) > 0;
                
                needsRecalc = false;
                if (undefined !== lvl) {
                    return s.totalDmg(lvl);
                }
            };
        })();
        
        s.clone = function (newName) {
            var key, clone = skill(rawSkill, name);
            for (key in s.modifiers) {
                clone.modifiers.push(s.modifiers[key].clone());
            }
            for (key in s.supportQualityLvl) {
                clone.supportQualityLvl[key] = s.supportQualityLvl[key];
            }
            for (key in s.additionalKeywordLvl) {
                clone.additionalKeywordLvl[key] = s.additionalKeywordLvl[key];
            }
            clone.additionalLvl = s.additionalLvl;
            clone.qualityLvl = s.qualityLvl;
            clone.maxLvl = s.maxLvl;
            
            clone.setNeedsRecalc();
            clone.name = newName + ' : ' + s.name;
            return clone;
        }
        
        return s;
    };

addExecuteOnLoad(function () {
    var name;
    for (name in rawSkills) {
        skills[name] = skill(rawSkills[name], name);
        skills[name].calcDmg();
        skills[name].isParsed = true;
    }
    publicSkills = skills;
});