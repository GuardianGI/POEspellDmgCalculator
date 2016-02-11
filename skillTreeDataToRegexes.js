var parsedA = [], parsedB = [];
passiveSkillTreeData.nodes.forEach((function () {
    
    return function (n) {
        var reg;
        n.sd.forEach(function (sd) {
            reg = sd.replace('+', '\\+').replace('.', '\\.').replace(/\d+\.?\d*/g, '(\\d+\\.?\\d*)').toLowerCase().replace('\n', ' ');
            if (parsedA.indexOf(reg) < 0) {
                parsedA.push(reg);
            }
        });
    }
})());
var parseStepB = function (sd) {
    var name = '', sdOriginal = sd, howAndWhat;
    
    if (sd.indexOf('increased') >= 0) {
        name += 'incr'
        
        if (sd.indexOf('damage') >= 0) {
            sd = sd.replace(/increased (\S+\s?\S*\s?\S*\s?\S*) damage/i, 'increased (\\S+\\s?\\S*\\s?\\S*\\s?\\S*) damage');
            name += 'MatchedDmg';
        } else if (sd.indexOf('and') >= 0) {
            howAndWhat = sdOriginal.split('increased ');
            if (howAndWhat[1]) {
                whats = howAndWhat[1].split(' and ');
                if (whats.length > 1) {
                    whats.forEach(function (what) {
                        parseStepB(howAndWhat[0] + 'increased ' + what);
                    });
                    return;
                }
            }
        }
        
    } else if (sd.indexOf('\\+') >= 0 && (sd.indexOf('to') >= 0 || sd.indexOf('maximum') >= 0 )) {
        name += 'add';
    } else if (sd.indexOf('more') >= 0) {
        name += 'more';
    }
    
    if (sd.indexOf('leeched') >= 0) {
        sd = sd.replace(/of (.+?) as (\S+)/i, 'of (.+) as (\S+)');
        name += 'LeechedAs';
    }
    
    if (sd.indexOf('with') >= 0) {
        sd = sd.replace(/with\s?a?n?\s(\S+)/i, 'with\\s?a?n?\\s(\\S+)');
        name += 'With';
    }
    
    parsedB.push("'" + name + "': /" + sd + '/i');
};
parsedA.forEach(parseStepB);
parsedB.filter((function () {
    var seen = [];
    return function (s) {
        var isSeen = seen.indexOf(s) >= 0;
        if (!isSeen) {
            seen.push(s);
        }
        return !isSeen;
    };
})()).join(',\r\n');