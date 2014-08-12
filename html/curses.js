var curses = (function () {
    var res = {}, s, sName,
        modRegexes = {
            reducedResists: /enemies lose x% (\S+) resist/i,
            additionalAilmentChance: /enemies have \+x% chance to be (\S+) by (\S+) damage/i,
            critChance: /enemies have an additional x% chance to receive a critical strike/i,
            critDmg: /enemies take x% more extra damage from Critical Strikes/i,
            extraDot: /enemies take (\d+%) increased damage from damage over time effects/i,
            extraDmg: /enemies take x% increased (\S+) damage/i
        }, applyRegexes = function (effectStr) {
            var reType, makeStageFn, makeFindColumnFn, applyWhen;
            for (reType in modRegexes) {
                matches = effectStr.match(modRegexes[reType]);
                if (null !== matches) {
                    res[sName].enabled = true;
                    switch (reType) {
                    case 'reducedResists':
                        makeFindColumnFn = function (parsedMatches) {
                            return function (columnHeader) {
                                return columnHeader.indexOf('resist') >= 0;
                            };
                        };
                        applyWhen = 'beforeDmgStages';
                        makeStageFn = function (stageStats, parsedMatches) {
                            return function (supportStage, skillLvl, skill) {
                                skill.reducedRes[skillLvl][parsedMatches[0]] = stageStats[supportStage] * 100;//resist values are handled in 0-100 rather than 0-1 scale...
                            };
                        };
                        break;
                    case 'additionalAilmentChance':
                        makeFindColumnFn = function (parsedMatches) {
                            return function (columnHeader) {
                                return columnHeader.indexOf('chance') >= 0 &&
                                    columnHeader.indexOf(parsedMatches[0]) >= 0;
                            };
                        };
                        applyWhen = 'beforeDmgStages';
                        makeStageFn = function (stageStats, parsedMatches) {
                            return function (supportStage, skillLvl, skill) {
                                skill['additional' + firstToUpper(parsedMatches[0]) + 'Chance'][skillLvl] = 
                                    supportStage[supportStage];
                            };
                        };
                        break;
                    case 'critChance':
                        makeFindColumnFn = function (parsedMatches) {
                            return function (columnHeader) {
                                return columnHeader.indexOf('crit') >= 0 &&
                                    columnHeader.indexOf('chance') >= 0;
                            };
                        };
                        applyWhen = 'beforeDmgStages';
                        makeStageFn = function (stageStats) {
                            return function (supportStage, skillLvl, skill) {
                                skill.additionalCritChance[skillLvl] = supportStage[supportStage];
                            };
                        };
                        break;
                    case 'critDmg':
                        makeFindColumnFn = function (parsedMatches) {
                            return function (columnHeader) {
                                return columnHeader.indexOf('crit') >= 0 &&
                                    columnHeader.indexOf('damage') >= 0;
                            };
                        };
                        applyWhen = 'beforeDmgStages';
                        makeStageFn = function (stageStats) {
                            return function (supportStage, skillLvl, skill) {
                                skill.additionalCritDamage[skillLvl] = supportStage[supportStage];
                            };
                        };
                        break;
                    case 'extraDot'://(for now) doesn't have stages, always ?40%
                        res[sName].applyAfter.push((function () {
                            var moreDotDmg = parsePercent(matches[1]);
                            return function (supportStage, skillLvl, skill) {//for now burning is the only dot TODO: apply to DoT and add exception to dmg for DoT's
                                skill.dmg.multiply({mult: 1 + moreDotDmg, type: 'burning', lvl: skillLvl});
                            };
                        })());
                        break;
                    case 'extraDmg':
                        makeFindColumnFn = function (parsedMatches) {
                            return function (columnHeader) {
                                return columnHeader.indexOf('damage') >= 0 &&
                                    columnHeader.indexOf(parsedMatches[0]);
                            };
                        };
                        applyWhen = 'applyBefore';
                        makeStageFn = function (stageStats, parsedMatches) {
                            return function (supportStage, skillLvl, skill) {
                                skill.dmg.multiply({
                                    mult: stageStats[supportStage],
                                    type: parsedMatches[0],
                                    lvl: skillLvl});
                            };
                        };
                        break;
                    }
                    
                    if (makeStageFn && makeFindColumnFn) {
                        res[sName][applyWhen].push((function (curse, parsedMatches) {
                            var stageStats = {}, stage,
                                columnIndex = findIndex(s.stageColumns, makeFindColumnFn(parsedMatches));
                            for (stage in curse.stages) {
                                stageStats[stage] = parsePercent(s.stageStats[stage][columnIndex]);
                            }
                            return makeStageFn(stageStats, parsedMatches);
                        })(res[sName], matches.slice(1).map(translateMatch)));
                    }
                }
            }
        };
    
    for (sName in rawCurses) {
        s = rawCurses[sName];
        res[sName] = initModifier(sName, s, 'curse');
        res[sName].isApplicable = (function (curse) {
            return function () { return curse.enabled; };
        })(res[sName]);
        
        for (i in s.modifiers) {
            applyRegexes(s.modifiers[i]);
        }
        
        res[sName].isParsed = res[sName].enabled;
    }
    
    return res;
})();