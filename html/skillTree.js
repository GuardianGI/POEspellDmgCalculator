var nodes = passiveSkillTreeData.nodes,
    classNodeNames = {
        'WITCH': 'AgMA',
        'TEMPLAR': 'AgUA',
        'MARAUDER': 'AgEA',
        'DUELIST': 'AgQA',
        'RANGER': 'AgIA',
        'SIX': 'AgYA',//shadow
        'Seven': 'AgAA'//scion
    },
    sdRegexes = {
        // 'incrWith': /(\d+\.?\d*)% increased attack speed withs?a?n?s(S+)/i,
        // 'incrMatchedDmgWith': /(\d+\.?\d*)% increased (\S+\s?\S*\s?\S*\s?\S*) damage withs?a?n?s(S+)/i,
        // 'incrWith': /(\d+\.?\d*)% increased critical strike chance withs?a?n?s(S+)/i,
        'incrMatchedDmg': /(\d+\.?\d*)% increased (\S+\s?\S*\s?\S*\s?\S*) damage/i,
        // '': /(\d+\.?\d*)% chance of projectiles piercing/i,
        // 'add': /\+(\d+\.?\d*) to dexterity/i,
        'add': /\+(\d+\.?\d*) to intelligence/i,
        // 'add': /\+(\d+\.?\d*) to strength/i,
        // 'incr': /(\d+\.?\d*)% increased frenzy charge duration/i,
        // '': /(\d+\.?\d*)% of wand physical damage added as fire damage/i,
        // '': /(\d+\.?\d*)% of wand physical damage added as cold damage/i,
        // 'incr': /(\d+\.?\d*)% increased effect of your curses/i,
        // 'incr': /(\d+\.?\d*)% increased radius of curses/i,
        // 'incr': /(\d+\.?\d*)% increased cast speed for curses/i,
        // 'incr': /(\d+\.?\d*)% increased maximum life/i,
        // 'With': /knocks back enemies if you get a critical strike withs?a?n?s(S+)/i,
        // 'incr': /(\d+\.?\d*)% increased attack speed/i,
        // 'more': /projectile attacks deal up to (\d+\.?\d*)% more damage to targets at the start of their movement, dealing less damage to targets as the projectile travels further/i,
        // 'incrMatchedDmg': /minions deal (\d+\.?\d*)% increased damage/i,
        // 'add': /minions have \+(\d+\.?\d*)% to all elemental resistances/i,
        // 'add': /\+(\d+\.?\d*) to maximum number of zombies/i,
        // 'add': /\+(\d+\.?\d*) to maximum number of skeletons/i,
        // '': /minions regenerate (\d+\.?\d*)\.(\d+\.?\d*)% life per second/i,
        // 'incr': /(\d+\.?\d*)% increased skill effect duration/i,
        // 'incr': /(\d+\.?\d*)% increased evasion rating/i,
        // 'incr': /(\d+\.?\d*)% increased movement speed/i,
        // '': /when hit, (\d+\.?\d*)% of damage is taken from mana before life/i,
        // 'incr': /(\d+\.?\d*)% increased accuracy rating/i,
        // 'incr': /(\d+\.?\d*)% increased maximum mana/i,
        // 'incr': /(\d+\.?\d*)% increased mana regeneration rate/i,
        // 'incrWith': /(\d+\.?\d*)% increased critical strike chance withs?a?n?s(S+) handed melee weapons/i,
        // 'incr': /(\d+\.?\d*)% increased mine duration/i,
        // '': /detonating mines is instant/i,
        // 'incr': /(\d+\.?\d*)% increased mine laying speed/i,
        // '': /can set up to (\d+\.?\d*) additional remote mine/i,
        // 'With': /share endurance, frenzy and power charges withs?a?n?s(S+) party members/i,
        // 'add': /\+(\d+\.?\d*) to maximum energy shield/i,
        // 'add': /\+(\d+\.?\d*) to maximum life/i,
        // 'incr': /(\d+\.?\d*)% increased effect of buffs on you/i,
        // 'incr': /(\d+\.?\d*)% increased melee attack speed/i,
        // '': /\+(\d+\.?\d*) mana gained on kill/i,
        // '': /\+(\d+\.?\d*) mana gained for each enemy hit by your attacks/i,
        // 'incr': /(\d+\.?\d*)% increased critical strike chance/i,
        // 'incr': /(\d+\.?\d*)% increased critical strike multiplier/i,
        // '': /damage penetrates (\d+\.?\d*)% fire resistance/i,
        // '': /(\d+\.?\d*)% chance to ignite/i,
        // 'incr': /(\d+\.?\d*)% increased ignite duration on enemies/i,
        // 'incrWith': /(\d+\.?\d*)% increased accuracy rating withs?a?n?s(S+)/i,
        // 'incr': /(\d+\.?\d*)% increased life recovery from flasks/i,
        // 'incr': /(\d+\.?\d*)% increased cast speed/i,
        // '': /(\d+\.?\d*)% of life regenerated per second/i,
        // 'add': /\+(\d+\.?\d*) to melee weapon and unarmed range/i,
        // 'add': /\+(\d+\.?\d*)% to all elemental resistances/i,
        // 'With': /(\d+\.?\d*)% reduced enemy stun threshold withs?a?n?s(S+)/i,
        // 'incr': /(\d+\.?\d*)% increased stun duration on enemies/i,
        // 'incr': /(\d+\.?\d*)% increased armour/i,
        // '': /ignore all movement penalties from armour/i,
        // 'incr': /minions have (\d+\.?\d*)% increased attack speed/i,
        // 'incr': /minions have (\d+\.?\d*)% increased cast speed/i,
        // 'add': /\+(\d+\.?\d*) to maximum number of spectres/i,
        // 'incr': /minions have (\d+\.?\d*)% increased maximum life/i,
        // '': /minions regenerate (\d+\.?\d*)% life per second/i,
        // '': /minions leech (\d+\.?\d*)% of damage as life/i,
        // 'With': /(\d+\.?\d*)% additional block chance withs?a?n?s(S+)/i,
        // 'incr': /(\d+\.?\d*)% increased maximum energy shield/i,
        // 'add': /\+(\d+\.?\d*) maximum frenzy charge/i,
        // 'incrMatchedDmgWith': /(\d+\.?\d*)% increased (\S+\s?\S*\s?\S*\s?\S*) damage withs?a?n?s(S+) handed melee weapons/i,
        // 'incrWith': /(\d+\.?\d*)% increased stun duration withs?a?n?s(S+) handed melee weapons on enemies/i,
        // 'incrWith': /(\d+\.?\d*)% increased attack speed withs?a?n?s(S+) handed melee weapons/i,
        // 'incrMatchedDmgWith': /(\d+\.?\d*)% increased damage withs?a?n?s(S+)/i,
        // 'incr': /(\d+\.?\d*)% increased critical strike chance for spells/i,
        // 'incr': /(\d+\.?\d*)% increased critical strike multiplier for spells/i,
        // 'incr': /(\d+\.?\d*)% increased projectile speed/i,
        // 'incrWith': /(\d+\.?\d*)% increased stun duration withs?a?n?s(S+) on enemies/i,
        // 'incr': /(\d+\.?\d*)% increased arrow speed/i,
        // '': /minions have (\d+\.?\d*)% chance to block/i,
        // '': /the increase to physical damage from strength applies to projectile attacks as well as melee attacks/i,
        // 'incrWith': /(\d+\.?\d*)% increased critical strike multiplier withs?a?n?s(S+)/i,
        // '': /(\d+\.?\d*)% of damage taken gained as mana when hit/i,
        // '': /(\d+\.?\d*)\.(\d+\.?\d*)% of life regenerated per second/i,
        // '': /(\d+\.?\d*)% of physical damage converted to fire damage/i,
        // '': /(\d+\.?\d*)% of lightning damage converted to fire damage/i,
        // '': /(\d+\.?\d*)% of cold damage converted to fire damage/i,
        // '': /deal no non-fire damage/i,
        // '': /removes all mana\. spend life instead of mana for skills/i,
        // '': /(\d+\.?\d*)% faster start of energy shield recharge/i,
        // 'incr': /(\d+\.?\d*)% increased radius of area skills/i,
        // 'LeechedAs': /(\d+\.?\d*)% of (.+) as (S+)/i,
        // '': /\+(\d+\.?\d*) life gained for each enemy hit by your attacks/i,
        // '': /\+(\d+\.?\d*) life gained on kill/i,
        // 'incr': /(\d+\.?\d*)% increased trap throwing speed/i,
        // '': /minions explode when reduced to low life, dealing (\d+\.?\d*)% of their maximum life as fire damage to surrounding enemies/i,
        // '': /life regeneration applies to energy shield instead of life/i,
        // 'incrMatchedDmg': /(\d+\.?\d*)% increased (\S+\s?\S*\s?\S*\s?\S*) damage while dual wielding/i,
        // 'incr': /(\d+\.?\d*)% increased attack speed while dual wielding/i,
        // '': /(\d+\.?\d*)% additional chance to block while dual wielding/i,
        // 'incr': /(\d+\.?\d*)% increased block recovery/i,
        // 'incr': /(\d+\.?\d*)% increased effect of flasks/i,
        // 'incr': /(\d+\.?\d*)% increased flask effect duration/i,
        // 'add': /\+(\d+\.?\d*) maximum power charge/i,
        // 'incr': /(\d+\.?\d*)% increased global critical strike chance while wielding a staff/i,
        // 'With': /you can't deal damage withs?a?n?s(S+) skills yourself/i,
        // '': /can summon up to (\d+\.?\d*) additional totem/i,
        // 'incr': /(\d+\.?\d*)% increased block/i,
        // 'incr': /(\d+\.?\d*)% increased stun recovery/i,
        // '': /(\d+\.?\d*)% chance to avoid being stunned/i,
        // 'incr': /(\d+\.?\d*)% increased mana recovery from flasks/i,
        // 'add': /minions have \+(\d+\.?\d*)% to chaos resistance/i,
        // 'incr': /(\d+\.?\d*)% increased totem life/i,
        // 'incr': /(\d+\.?\d*)% increased totem duration/i,
        // 'incr': /(\d+\.?\d*)% increased casting speed for summoning totems/i,
        // 'add': /\+(\d+\.?\d*)% to maximum fire resistance/i,
        // 'add': /\+(\d+\.?\d*)% to fire resistance/i,
        // 'incr': /(\d+\.?\d*)% increased energy shield from equipped shield/i,
        // 'With': /(\d+\.?\d*)% additional chance to block withs?a?n?s(S+)/i,
        // '': /(\d+\.?\d*)% additional chance to dodge attacks/i,
        // 'incrWith': /(\d+\.?\d*)% increased accuracy rating withs?a?n?s(S+) handed melee weapons/i,
        // 'add': /\+(\d+\.?\d*)% to chaos resistance/i,
        // 'addWith': /enemies you hit withs?a?n?s(S+) damage temporarily get \+(\d+\.?\d*)% resistance to those elements and -(\d+\.?\d*)% resistance to other elements/i,
        // 'incr': /(\d+\.?\d*)% increased accuracy rating while dual wielding/i,
        // 'add': /\+(\d+\.?\d*)% to lightning resistance/i,
        // 'add': /\+(\d+\.?\d*)% to cold resistance/i,
        // '': /converts all energy shield to mana/i,
        // 'incr': /(\d+\.?\d*)% increased defences from equipped shield/i,
        // '': /(\d+\.?\d*)\.(\d+\.?\d*)% of maximum life regenerated per second per endurance charge/i,
        // 'incr': /spells cast by totems have (\d+\.?\d*)% increased cast speed/i,
        // 'incr': /attacks used by totems have (\d+\.?\d*)% increased attack speed/i,
        // 'incr': /(\d+\.?\d*)% increased power charge duration/i,
        // 'more': /(\d+\.?\d*)% more maximum energy shield/i,
        // 'incr': /(\d+\.?\d*)% increased weapon critical strike chance while dual wielding/i,
        // 'incr': /(\d+\.?\d*)% increased chill duration on enemies/i,
        // 'incr': /(\d+\.?\d*)% increased freeze duration on enemies/i,
        // '': /enemies become chilled as they unfreeze/i,
        // '': /(\d+\.?\d*)% chance to freeze/i,
        // '': /life leech applies to energy shield instead of life/i,
        // 'add': /\+(\d+\.?\d*) to maximum mana/i,
        // 'incr': /(\d+\.?\d*)% increased trap duration/i,
        // '': /trap damage penetrates (\d+\.?\d*)% elemental resistances/i,
        // '': /mine damage penetrates (\d+\.?\d*)% elemental resistances/i,
        // '': /traps cannot be damaged for (\d+\.?\d*) seconds after being thrown/i,
        // '': /mines cannot be damaged for (\d+\.?\d*) seconds after being placed/i,
        // 'incr': /(\d+\.?\d*)% increased radius of auras/i,
        // 'incr': /(\d+\.?\d*)% increased effect of auras you cast/i,
        // '': /(\d+\.?\d*)% reduced mana reserved/i,
        // 'incr': /(\d+\.?\d*)% increased shock duration on enemies/i,
        // '': /damage penetrates (\d+\.?\d*)% lightning resistance/i,
        // '': /(\d+\.?\d*)% chance to shock/i,
        // 'incr': /(\d+\.?\d*)% increased curse duration/i,
        // '': /(\d+\.?\d*)% reduced enemy chance to block sword attacks/i,
        // 'incrMatchedDmg': /(\d+\.?\d*)% increased damage over time/i,
        // 'more': /(\d+\.?\d*)% more spell damage when on low life/i,
        // '': /(\d+\.?\d*)% reduced enemy stun threshold/i,
        // '': /maximum life becomes (\d+\.?\d*), immune to chaos damage/i,
        // 'incrWith': /(\d+\.?\d*)% increased critical strike multiplier withs?a?n?s(S+) handed melee weapons/i,
        // '': /(\d+\.?\d*)% reduced mana cost of skills/i,
        // '': /enemies cannot leech mana from you/i,
        // '': /totems have (\d+\.?\d*)% additional physical damage reduction/i,
        // 'add': /totems gain \+(\d+\.?\d*)% to all elemental resistances/i,
        // '': /(\d+\.?\d*)% chance to avoid elemental status ailments/i,
        // '': /you take (\d+\.?\d*)% reduced extra damage from critical strikes/i,
        // 'add': /\+(\d+\.?\d*)% to maximum lightning resistance/i,
        // '': /(\d+\.?\d*)% additional chance to block while dual wielding or holding a shield/i,
        // '': /all bonuses from an equipped shield apply to your minions instead of you/i,
        // '': /enemies cannot leech life from you/i,
        // '': /cannot evade enemy attacks cannot be stunned/i,
        // '': /damage penetrates (\d+\.?\d*)% cold resistance/i,
        // '': /can set up to (\d+\.?\d*) additional trap/i,
        // 'add': /\+(\d+\.?\d*) to evasion rating/i,
        // 'With': /(\d+\.?\d*)% chance to steal power, frenzy, and endurance charges on hit withs?a?n?s(S+)/i,
        // 'incrMatchedDmg': /(\d+\.?\d*)% increased (\S+\s?\S*\s?\S*\s?\S*) damage per power charge/i,
        // '': /(\d+\.?\d*)% of wand physical damage added as lightning damage/i,
        // '': /(\d+\.?\d*)% chance to dodge spell damage/i,
        // '': /(\d+\.?\d*)% of melee physical damage taken reflected to attacker/i,
        // 'incr': /(\d+\.?\d*)% increased endurance charge duration/i,
        // '': /converts all evasion rating to armour\. dexterity provides no bonus to evasion rating/i,
        // 'add': /\+(\d+\.?\d*) maximum endurance charge/i,
        // 'incr': /(\d+\.?\d*)% increased light radius/i,
        // '': /(\d+\.?\d*)% chance to avoid being shocked/i,
        // '': /(\d+\.?\d*)% chance to avoid being ignited/i,
        // '': /(\d+\.?\d*)% chance to avoid being chilled/i,
        // '': /(\d+\.?\d*)% chance to avoid being frozen/i,
        // 'incr': /(\d+\.?\d*)% increased armour from equipped shield/i,
        // 'incr': /(\d+\.?\d*)% increased flask recovery speed/i,
        // '': /enemies can have (\d+\.?\d*) additional curse/i,
        // '': /(\d+\.?\d*)% less mana reserved/i,
        // 'add': /\+(\d+\.?\d*) to accuracy rating/i,
        // '': /your hits can't be evaded/i,
        // '': /never deal critical strikes/i,
        // 'With': /(\d+\.?\d*)% additional chance to block spells withs?a?n?s(S+)/i,
        // '': /life leech applies instantly at (\d+\.?\d*)% effectiveness\. life regeneration has no effect./i,
        // 'incr': /(\d+\.?\d*)% increased cast speed while dual wielding/i,
        // '': /\+(\d+\.?\d*)% elemental resistances while holding a shield/i,
        // 'incr': /(\d+\.?\d*)% increased trap trigger radius/i,
        // 'incr': /(\d+\.?\d*)% increased evasion rating per frenzy charge/i,
        // 'With': /critical strikes withs?a?n?s(S+) poison the enemy/i,
        // '': /(\d+\.?\d*)% chance to avoid interruption from stuns while casting/i,
        // '': /doubles chance to evade projectile attacks/i,
        // '': /light radius is based on energy shield instead of life/i,
        // '': /(\d+\.?\d*)% chance to knock enemies back on hit/i,
        // 'incr': /(\d+\.?\d*)% increased knockback distance/i,
        // 'add': /\+(\d+\.?\d*) to armour/i,
        // '': /(\d+\.?\d*)% chance to dodge attacks\. (\d+\.?\d*)% less armour and energy shield/i,
        // 'add': /\+(\d+\.?\d*)% to maximum cold resistance/i,
        // 'incr': /(\d+\.?\d*)% increased global critical strike multiplier while wielding a staff/i
    },
    nodeById = (function (nodes) {
        var res = {}, i;
        for (i = 0; i < nodes.length; i += 1) {
            res[nodes[i].id] = nodes[i];
        }
        nodes[24].taken = true;//start as witch
        
        //map in and out to nodes
        nodes.forEach(function (n) {
            n.out = n.out.map(function (id) {
                return res[id];
            });
        });
        nodes.forEach(function (n) {
            n.in = nodes.filter(function (innerNode) {
                return innerNode.out.indexOf(n) >= 0;
            });
        });
        nodes.forEach(function (n) {
            n.siblings = n.out.concat(
                n.in.filter(function (inner) {
                    return n.out.indexOf(inner) < 0;
                }));
            n.siblings = n.siblings.filter(function (n) {
                return !classNodeNames.hasOwnProperty(n.sd);
            });
        });
        
        return res;
    })(passiveSkillTreeData.nodes),
    statValues = {
        addInt: 0.1,
        incrSpellDmg: 0.5
    },
    getSdMatches = function (sd) {
        var res = {}, reType, matches, val, statName;
        for (reType in sdRegexes) {
            matches = sd.toLowerCase().match(sdRegexes[reType]);
            if (matches) {
                val = matches[1] | 0;
                switch (reType) {
                    case 'incrMatchedDmg':
                        statName = 'incr' + firstToUpper(matches[2]) + 'Dmg';
                        break;
                    case 'addInt':
                        statName = reType;
                        break;
                }
                res[statName] = (res[statName] || 0) + val;
            }
        }
        return res;
    },
    getSdWeight = function (sd) {
        var statName, val, sum = 0, matches = getSdMatches(sd);
        for (statName in matches) {
            val = matches[statName];
            if (statValues.hasOwnProperty(statName)) {
                sum += val * statValues[statName];
            } else {
                console.log('missing statValue:', statName)
            }
        }
        return sum;
    },
    valueNode = function (node) {
        var defaultValue = 10;
        node.taken = false;
        node.weight = defaultValue;
        node.sd.forEach(function (sd) {
            node.weight -= getSdWeight(sd);
        });
    },
    getTakenNodes = function () {
        return passiveSkillTreeData.nodes.filter(function (node) { return node.taken; });
    },
    getBuildSummary = function () {
        getTakenNodes();
    },
    gotTotalWeigth = function () {
        return getTakenNodes().reduce(function (sum, node) {
            return sum + node.weight;
        }, 0);
    },
    pathTo = function (node, sparePoints) {
        
    },
    spendXPoints = function (x) {
        var startNodes = getTakenNodes();
    },
    importBuild = function (url) {
        var nodesStrs = atob(url.split('passive-skill-tree/').pop().replace(/-/g, '+').replace(/_/g, '/')).split('').splice(6),
            i,
            nodes = [];
        for (i = 0; i < nodesStrs.length; i += 2) {
            nodes.push((nodesStrs[i].charCodeAt(0) << 8) + nodesStrs[i + 1].charCodeAt(0));
        }
        nodes.forEach(function (nodeId) {
            nodeById[nodeId].taken = true;
        });
        return nodes;
    },
    nodesToBuild = function (nodes) {
        return btoa(nodes.map(function (n) {
            return String.fromCharCode(n.id >> 8) + String.fromCharCode(n.id & 0xFF);
        }).join('')).replace(/\+/g, '-').replace(/\//g, '_');
    },
    exportBuild = function () {
        return nodesToBuild(getTakenNodes());
    },
    toBuildUrl = function (buildStr, classStr) {
        if (!classStr) {
            classStr = 'AgMB';//witch
        }
        return 'http://www.pathofexile.com/passive-skill-tree/AAAA' + classStr + buildStr;
    },
    getBuildUrl = function (nodes) {
        var className = false, i;
        nodes = nodes || exportBuild();
        for (i = 0; i < nodes.length && !className; i += 1) {
            for (className in classNodeNames) {
                if (className === nodes[i].dn) {
                    nodes.splice(i, 1);
                    break;
                }
            }
            className = false;
        }
        return toBuildUrl(nodesToBuild(nodes), className);
    },
    bruteForceTest = (function () {
        var graphs = [],
            nodes = passiveSkillTreeData.nodes,
            go = function (x, start, graph) {
                var siblings = [];
                if (x > 0) {
                    graph.push(start);
                    graph.forEach(function (node) {//find all siblings to the graph.
                        node.siblings.forEach(function (inner) {
                            if (graph.indexOf(inner) < 0) {
                                siblings.push(inner);
                            }
                        });
                    });//go down each path.
                    siblings.forEach(function (node) {
                        go(x - 1, node, graph.slice(0));
                    })
                } else {
                    graphs.push(graph);
                }
            }, getGraphWeights = function () {
                return graphs.map(function (graph) {
                    return graph.reduce(function(sum, node) {
                        return sum + (node.weight || 99999);
                    }, 0);
                });
            };
        return {'go': go,
            'graphs': graphs,
            'getWeights': getGraphWeights,
            getMinGraph: function () {
                var i,
                    minGraph = graphs[0],
                    minGraphWeight = minGraph.reduce(function(sum, node) {
                        return sum + (node.weight || 99999);
                    }, 0),
                    weight;
                for (i = 1; i < graphs.length; i += 1) {
                    weight = graphs[i].reduce(function(sum, node) {
                        return sum + (node.weight || 99999);
                    }, 0);
                    if (weight < minGraphWeight) {
                        minGraphWeight = weight;
                        minGraph = graphs[i];
                    }
                }
                return minGraph;
            },
            getGraphsSorted: function () {
                var weights = getGraphWeights();
                return graphs.
                    map(function (g, i) {
                        return {'graph': g, 'value': weights[i]};
                    }).sort(function (a, b) {
                        return a.value > b.value ? 1 : -1;
                    })/*.map(function (pair) { return pair.graph; })*/;
            }
        };
    })(),
    weightedDistance = (function () {
        var nodes = passiveSkillTreeData.nodes,
            go = function (x, start, graph) {
                var siblings = [], weightedSiblings = [];
                graph.push(start);
                if (x > 0) {
                    console.log(graph.slice(), ((x / 3) | 0) + 1);
                    graph.forEach(function (node) {//find all siblings to the graph.
                        node.siblings.forEach(function (inner) {
                            if (graph.indexOf(inner) < 0) {
                                siblings.push(inner);
                            }
                        });
                    });
                    
                    siblings.forEach(function (node) {
                        weightedSiblings.push({'node': node, 'weight': node.wayDistance(((x / 3) | 0) + 1, graph)});
                    });
                    
                    return go(x - 1, getMinNode(weightedSiblings), graph);
                } else {
                    return graph;
                }
            },
            getMinNode = function (weightedNodes) {
                var i,
                    minNode = weightedNodes[0];
                for (i = 1; i < weightedNodes.length; i += 1) {
                    if (weightedNodes[i].weight < minNode.weight) {
                        minNode = weightedNodes[i];
                    }
                }
                return minNode.node;
            };
            nodes.forEach(function (node) {
                node.wayDistance = function (x, takenNodes) {
                    var i,
                        siblingsRated = [],
                        weight = node.weight,
                        weighNode = function (n) {
                            if (siblingsRated.indexOf(n) < 0 && takenNodes.indexOf(n) < 0) {
                                siblingsRated.push(n);
                                weight += n.weight;
                            }
                        };
                    node.siblings.forEach(weighNode);
                    for (i = 1; i < x; i += 1) {
                        siblingsRated.forEach(weighNode);
                    }
                    return weight / node.siblings.length / siblingsRated.length;
                };
            });
        return go;
    })(),
    spf = function (target, takenNodes) {
        var index,
            current,
            unvisited = [];
        
        unvisited.insert = function (n) {
            var i = unvisited.indexOf(n);
            if (i >= 0) {
                unvisited.splice(i, 1);//remove from old position to prevent duplicate entires.
            }
            for (i = 0; i < unvisited.length - 1; i += 1) {
                if (unvisited[i].distance > n.distance) {
                    unvisited.splice(i, 0, n);
                    return;
                }
            }
            unvisited.push(n);//should never happen?
        };
        unvisited.deQueue = function () {
            return unvisited.splice(0, 1)[0];
        };
        
        nodes.forEach(function (n) {
            var distance = Number.MAX_VALUE;
            if (takenNodes.indexOf(n) >= 0) {//start is always in takenNodes.
                distance = 0;//taken nodes are free to travel.
            }
            n.distance = distance;
            n.path = [];
            n.visited = false;//0 === distance;
            if (!n.visited) {
                unvisited.insert(n);
            }
        });
        for (current = unvisited.deQueue();
                unvisited.length > 0 && !target.visited;
                current = unvisited.deQueue()) {
            current.siblings.forEach(function (neighbour) {
                if (!neighbour.visited) {
                    if (neighbour.distance > current.distance + neighbour.weight) {
                        neighbour.distance = current.distance + neighbour.weight;
                        neighbour.path = current.path.concat(neighbour);
                        unvisited.insert(neighbour);
                    }
                }
            });
            current.visited = true;
        }
        return target;//best path to target
    },
    pathFind = function (start, targets) {
        var nodeSet = [start],
            closestTarget;
            
        while (targets.length > 0) {
            closestTarget = targets.reduce(function (minT, t) {
                spf(t, nodeSet);
                return t.distance <= minT.distance ? t : minT;
            }, {'distance': Number.MAX_VALUE});
            closestTarget.path.forEach(function (n) {
                nodeSet.push(n);
                if (targets.indexOf(n) >= 0) {
                    targets.splice(targets.indexOf(n), 1);
                }
            });
        }
        return nodeSet;
    },
    spfMulti = function (targets, takenNodes) {
        var index,
            current,
            unvisited = [],
            anyUnvisitedTargets = function () {
                var i;
                for (i = 0; i < targets.length; i += 1) {
                    if (!targets[i].visited) {
                        return true;
                    }
                }
                return false;
            };
        
        unvisited.insert = function (n) {
            var i = unvisited.indexOf(n);
            if (i >= 0) {
                unvisited.splice(i, 1);//remove from old position to prevent duplicate entires.
            }
            for (i = 0; i < unvisited.length - 1; i += 1) {
                if (unvisited[i].distance > n.distance) {
                    unvisited.splice(i, 0, n);
                    return;
                }
            }
            unvisited.push(n);//should never happen?
        };
        unvisited.deQueue = function () {
            return unvisited.splice(0, 1)[0];
        };
        
        nodes.forEach(function (n) {
            var distance = Number.MAX_VALUE;
            if (takenNodes.indexOf(n) >= 0) {//start is always in takenNodes.
                distance = 0;//taken nodes are free to travel.
            }
            n.distance = distance;
            n.path = [];
            n.visited = false;
            if (!n.visited) {
                unvisited.insert(n);
            }
        });
        for (current = unvisited.deQueue();
                unvisited.length > 0 && anyUnvisitedTargets();
                current = unvisited.deQueue()) {
            current.siblings.forEach(function (neighbour) {
                if (!neighbour.visited) {
                    if (neighbour.distance > current.distance + neighbour.weight) {
                        neighbour.distance = current.distance + neighbour.weight;
                        neighbour.path = current.path.concat(neighbour);
                        unvisited.insert(neighbour);//update position of nieghbour.
                    }
                }
            });
            current.visited = true;
        }
        
        return (function () {
            var i, j, nextHop = {}, value;
            for (i = 0; i < targets.length; i += 1) {
                for (j = 0; j < targets[i].path.length; j += 1) {
                    if (!nextHop.hasOwnProperty(targets[i].path[j].id)) {
                        nextHop[targets[i].path[j].id] = {
                            'node': targets[i].path[j],
                            'distances': []};
                    }
                    nextHop[targets[i].path[j].id].distances.push(targets[i].distance);
                }
            }
            for (j in nextHop) {
                nextHop[j].distances.sort(function (a, b) { return a - b; });
                nextHop[j].value = nextHop[j].distances.reduce(function (min, current, index, all) {
                    var i, sum = 0, val;
                    for (i = 0; i <= index; i += 1) {
                        sum += all[i];
                    }
                    val = sum / (index + 1);
                    return Math.min(val, min);
                }, Number.MAX_VALUE);
            }
            for (j in nextHop) {//using j to set it to a valid key in nextHop
                break;
            }
            for (i in nextHop) {
                if (nextHop[i].value < nextHop[j].value) {
                    j = i;
                }
            }
            return nextHop[j].node.path;
        })();
    },
    pathFindMulti = function (start, targets, limit) {
        var nodeSet = [start],
            path, i;
        limit = limit || Number.MAX_VALUE
        i = targets.indexOf(start);
        if (i >= 0) {
            targets.splice(i, 1);
        }
        
        while (targets.length > 0 && nodeSet.length < limit) {
            path = spfMulti(targets, nodeSet);
            path.forEach(function (n) {
                nodeSet.push(n);
                if (targets.indexOf(n) >= 0) {
                    targets.splice(targets.indexOf(n), 1);
                }
            });
        }
        return nodeSet;
    },
    test = function () {
        return pathFindMulti(nodes[24], [nodes[1294], nodes[1291], nodes[879], nodes[157], nodes[1478], nodes[851], nodes[850], nodes[852]]);
    };
    
    

    