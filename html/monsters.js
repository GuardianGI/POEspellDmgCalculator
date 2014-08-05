var getAvgMonster = function (lvl, diff) {
        var i, key, count = 0, monster = {'fire': 0, 'cold': 0, 'light': 0, 'chaos': 0, 'lvl': 0, 'normal xp': 0};
        for (i = 0; i < monsterStats.length; i += 1) {
            if (monsterStats[i].lvl < lvl + diff && monsterStats[i].lvl > lvl - diff) {
                for (key in monster) {
                    monster[key] += monsterStats[i][
                        Object.keys(monsterStats[i]).filter(function (k) {
                            return k.indexOf(key) >= 0;
                        })[0]
                    ];
                }
                count += 1;
            }
        }
        for (key in monster) {
            monster[key] = roundForDisplay(monster[key] / count);
        }
        return monster;
    },
    monsters = (function () {
        var i, lvls = [], armour, monster;
        for (i = 0; i < 100; i += 1) {
            armour = ((armourValues[i] / 10) | 0) || armour;
            monster = getAvgMonster(i > 68 ? 68 : i, 2 + (i / 10) | 0);//get monster of current lvl with a max lvl diff.
            monster.life = -1;
            monster.armour = armour;
            lvls[i] = monster;
        }
        return lvls;
    }()),
    getAvgMonsterAtLvl = function (lvl) {
        var i, monster, selectedAvgMonster = {'lvl': 0, 'rare/unique xp': 0}, key, count = 0;
        
        if ((userInput.selectedAreas || []).length > 0) {
            userInput.selectedAreas.forEach(function (area) {
                var m, resWordIndex, addAsKey;
                for (key in area) {
                    m = area[key];
                    if (m.enabled) {
                        for (key in m) {
                            resWordIndex = key.indexOf(' res');//to regex: /^(\S+) res$/i
                            if (resWordIndex > 0) {
                                addAsKey = key.substring(0, resWordIndex);
                                if (!selectedAvgMonster.hasOwnProperty(addAsKey)) {
                                    selectedAvgMonster[addAsKey] = 0;
                                }
                                selectedAvgMonster[addAsKey] += m[key] | 0;
                            } else if ('rare/unique xp' === key) {
                                selectedAvgMonster[key] += m[key] | 0;
                            }
                        }
                        selectedAvgMonster.lvl += m.lvl | 0;
                        count += 1;
                    }
                }
            });
            for (key in selectedAvgMonster) {
                selectedAvgMonster[key] /= count;
            }
            selectedAvgMonster.lvl = selectedAvgMonster.lvl | 0;
            if (monsters.length > selectedAvgMonster.lvl) {
                monster = monsters[selectedAvgMonster.lvl];
            } else {
                monster = monsters[monsters.length - 1];
            }
            selectedAvgMonster.armour = monster.armour;
            selectedAvgMonster.life = 2 * selectedAvgMonster['rare/unique xp'] / selectedAvgMonster.lvl;
            monster = selectedAvgMonster;
        } else {
            if (monsters.length > lvl) {
                monster = monsters[lvl];
            } else {
                monster = monsters[monsters.length - 1];
            }
        }
        
        return monster;
    };