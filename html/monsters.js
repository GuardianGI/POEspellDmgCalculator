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
    }());