var redraw, onRedraw = [],
    drawBg = function (ctx, canvas, padding) {
        ctx.fillStyle = userInput.useDarkBg ? "#000000" : "#CCCCCC";
        ctx.fillRect(padding, 0, canvas.width - padding, canvas.height - padding);
        for (i = 0; i < canvas.height - padding; i += 20) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fillRect(padding, i, canvas.width - padding, 10);
        }
        
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(padding, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width, canvas.height - padding);
        ctx.stroke();
    },
    startDraw = function (c, index, body) {
        var name, i = 0, checkbox, indexLine, canvasScale = 1, zoomLvl = 1, padding = 50,
            ctx = c.getContext("2d"),
            getSupportRemovedDiff = function (skill, supportIndex) {
                var clone = skill.clone('tmpClone');
                clone.modifiers.splice(supportIndex, 1);
                clone.setNeedsRecalc();
                clone.calcDmg(userInput.playerLvlForSuggestions);
                return clone.totalDmg(userInput.playerLvlForSuggestions) / skill.totalDmg(userInput.playerLvlForSuggestions);
            },
            shuffleColors,
            getColor = (function () {
                var start = 0, x = 1;
                shuffleColors = function () {
                    start = (Math.random() * 32) | 0;
                    x = 1 + ((Math.random() + 0.5) | 0);
                };
                return function () {
                    var n = start, color = "#",
                        //extra color data to make sure all skills have a distingushable color for the on hover name display.
                        c1 = (n % 16).toString(16).toUpperCase(),
                        c2 = ((n + 5) % 16).toString(16).toUpperCase(),
                        c3 = ((n + 10) % 16).toString(16).toUpperCase(),
                        colors = ['0' + c3, '8' + c2, 'F' + c1];
                    n %= Math.pow(3, 3);
                    color += colors[n % 3];
                    n = Math.floor(n / 3);
                    color += colors[n % 3];
                    n = Math.floor(n / 3);
                    color += colors[n % 3];
                    start += x;
                    return color;
                }
            })(),
            dmgToPx = function (dmg) {
                if (userInput.enableLogDmgScale) {
                    dmg = Math.log(1 + dmg) * 100;
                }
                return dmg * zoomLvl;
            },
            dmgToCtx = function (dmg) {
                return parseInt(c.height - dmgToPx(dmg)) - padding;
            },
            pxToDmg = function (px) {
                var dmg = px / zoomLvl;
                if (userInput.enableLogDmgScale) {
                    dmg /= 100;
                    dmg = Math.pow(Math.E, dmg) - 1;
                }
                return dmg | 0;
            },
            ctxPxToDmg = function (px) {
                var dmg = (c.height - (px + padding)) / zoomLvl;
                if (userInput.enableLogDmgScale) {
                    dmg /= 100;
                    dmg = Math.pow(Math.E, dmg) - 1;
                }
                return dmg | 0;
            },
            pxPerLvl = 10,
            ctxPxToLvl = function (px) {
                var lvl = ((px - (c.width + padding)) / pxPerLvl) + 100;
                return lvl | 0;
            };
        
    document.getElementById("btnZoomReset").onclick = function () {
        zoomLvl = 1;
        redraw();
    };
    document.getElementById("btnZoomIn").onclick = function () {
        zoomLvl *= 1.2;
        redraw();
    };
    document.getElementById("btnZoomOut").onclick = function () {
        zoomLvl /= 1.2;
        redraw();
    };
    
    document.getElementById("btnResetCanvasSize").onclick = function () {
        canvasScale = 1;
        redraw();
    };
    document.getElementById("btnIncrCanvasSize").onclick = function () {
        canvasScale *= 1.2;
        redraw();
    };
    document.getElementById("btnDecrCanvasSize").onclick = function () {
        canvasScale /= 1.2;
        redraw();
    };
    
    document.getElementById("shuffleColors").onclick = function () {
        var name, i, indexLines = document.getElementsByClassName("spellIndexLine");
        shuffleColors();
        for (name in skills) {
            if (skills[name].enabled) {
                skills[name].color = getColor();
                for (i = 0; i < indexLines.length; i += 1) {
                    if (name == indexLines[i].getElementsByTagName("button")[0].innerHTML) {
                        indexLines[i].style.backgroundColor = skills[name].color;
                        break;
                    }
                }
            }
        }
        redraw();
    };
    
    for (i = 0; i < executeOnLoad.length; i += 1) {
        executeOnLoad[i]();
    }
    
    (function () {
        var txtMaxSpellLvl = document.getElementById('maxSpellLvl');
        txtMaxSpellLvl.executeOnChange.push(function () {
            var i;
            for (i in skills) {
                skills[i].maxLvl = txtMaxSpellLvl.value | 0;
            }
        });
    })();
    document.getElementById("elementalColors").executeOnChange.push((function () {
        var enableLogDmgScale = document.getElementById("enableLogDmgScale"),
            elementalColors = document.getElementById("elementalColors"),
            storedEnableLogDmgScaleChecked = true;
        
        return function () {
            if (elementalColors.checked) {
                storedEnableLogDmgScaleChecked = enableLogDmgScale.checked;
                enableLogDmgScale.checked = !elementalColors.checked;
            } else {
                enableLogDmgScale.checked = storedEnableLogDmgScaleChecked;
            }
            enableLogDmgScale.disabled = elementalColors.checked;
            enableLogDmgScale.apply();
        }
    })());
    
    document.getElementById("qualityLvlAll").executeOnChange.push((function () {
        var qualityLvlAll = document.getElementById("qualityLvlAll");
        return function () {
            var name;
            for (name in skills) {
                skills[name].qualityLvl = qualityLvlAll.value | 0;
            }
        };
    })());
    
    var getDrawSkillDetailsFn = function (s) {
        return function () {
            var details, dif, lblNew, inputNew, btnClone, head, btnClose, fieldset, legend, support, node, checkbox, k, getSupportsDropDown,
                newFieldset = function (title) {
                    fieldset = document.createElement("fieldset");
                    details.appendChild(fieldset);
                    legend = document.createElement("legend");
                    legend.innerHTML = title;
                    fieldset.appendChild(legend);
                },
                drawContent = function () {
                    var rows, r, i, tbl, drawTable = function (tblNode, columns) {
                        var row, cell, key, val, i;
                        row = document.createElement('tr');
                        tblNode.appendChild(row);
                        for (key in columns[0]) {
                            cell = document.createElement('th');
                            row.appendChild(cell);
                            cell.innerHTML = key;
                        }
                        
                        for (i in columns) {
                            row = document.createElement('tr');
                            tblNode.appendChild(row);
                            for (key in columns[0]) {
                                cell = document.createElement('td');
                                row.appendChild(cell);
                                if (columns[i].hasOwnProperty(key)) {
                                    cell.appendChild(columns[i][key]);
                                }
                            }
                        }
                    }
                    details.innerHTML = '';
                    head = document.createElement("h2");
                    head.innerHTML = s.name;
                    details.appendChild(head);
                    
                    btnClose = document.createElement("button");
                    btnClose.innerHTML = "X";
                    btnClose.className = "cornerBtn";
                    btnClose.onclick = function () {
                        spellDetails.removeChild(details);
                    }
                    details.appendChild(btnClose);
                    
                    lblNew = document.createElement("label");
                    lblNew.innerHTML = s.keywords.join(', ');
                    details.appendChild(lblNew);
                    
                    ['aura', 'curse', 'support'].forEach(function (modType) {
                        newFieldset(firstToUpper(modType) + 's');
                        
                        rows = [];
                        tbl = document.createElement('table');
                        fieldset.appendChild(tbl);
                        tbl.width = '100%';
                        for (k in s.modifiers) {//draw checkbox to turn of applied supports
                            if (modType !== s.modifiers[k].type) {
                                continue;
                            }
                            r = {}
                            
                            r['Name'] = document.createTextNode(s.modifiers[k].name);
                            
                            inputNew = document.createElement('input');
                            inputNew.type = 'text';
                            inputNew.value = s.modifiers[k].maxLvl;
                            inputNew.title = 'max lvl';
                            inputNew.onchange = (function (self, support, skill) {
                                return function () {
                                    support.maxLvl = self.value | 0;
                                    skill.setNeedsRecalc();
                                    redraw();
                                };
                            })(inputNew, s.modifiers[k], s);
                            r['Max gem lvl'] = inputNew;
                            
                            inputNew = document.createElement('input');
                            inputNew.type = 'text';
                            inputNew.value = s.supportQualityLvl[s.modifiers[k].name];
                            inputNew.title = 'quality lvl';
                            inputNew.onchange = (function (self, support, skill) {
                                return function () {
                                    skill.supportQualityLvl[support.name] = self.value | 0;
                                    skill.setNeedsRecalc();
                                    redraw();
                                };
                            })(inputNew, s.modifiers[k], s);
                            r['Quality lvl'] = inputNew;
                            
                            r['Remove mult.'] = document.createTextNode(
                                roundForDisplay(getSupportRemovedDiff(s, k)))
                            
                            checkbox = document.createElement('input');
                            checkbox.type = 'button';
                            checkbox.value = 'X';
                            checkbox.onclick = (function (self, support) {
                                return function() {
                                    s.tryRemoveMod(support);
                                    redraw();
                                }
                            })(checkbox, s.modifiers[k]);
                            r['Remove'] = checkbox;
                            rows.push(r)
                        }
                        drawTable(tbl, rows);
                    });
                    
                    fieldset.appendChild(getSupportsDropDown());
                    
                    newFieldset('Details');
                    
                    btnClone = document.createElement("button");
                    btnClone.innerHTML = 'Clone';
                    fieldset.appendChild(btnClone);
                    btnClone.onclick = (function (s) {
                        return function () {
                            var name = prompt("Skill name", s.name + "2");
                            if (null !== name) {
                                skills[name] = s.clone(name);
                                skills[name].enabled = true;
                                redraw();
                                skills[name].drawDetails = getDrawSkillDetailsFn(skills[name]);
                                skills[name].drawDetails();
                            }
                        };
                    })(s, name);
                    
                    fieldset.appendChild(document.createElement('br'));
                    lblNew = document.createElement('label');
                    fieldset.appendChild(lblNew);
                    lblNew.innerHTML = 'DPS: ' + roundForDisplay(s.totalDmg(userInput.playerLvlForSuggestions));
                    
                    newFieldset('Quality/Level');
                    
                    lblNew = document.createElement('label');
                    fieldset.appendChild(lblNew);
                    inputNew = document.createElement('input');
                    lblNew.appendChild(document.createTextNode('Quality: '));
                    lblNew.appendChild(inputNew);
                    inputNew.type = "text";
                    inputNew.value = s.qualityLvl;
                    inputNew.onchange = (function (self) {
                        return function () {
                            s.qualityLvl = self.value - 0;
                            s.setNeedsRecalc();
                            redraw();
                        };
                    })(inputNew);
                    
                    lblNew = document.createElement('label');
                    fieldset.appendChild(lblNew);
                    inputNew = document.createElement('input');
                    lblNew.appendChild(document.createTextNode('Additional lvl: '));
                    inputNew.type = "text";
                    lblNew.appendChild(inputNew);
                    inputNew.value = s.additionalLvl;
                    inputNew.onchange = (function (self, s) {
                        return function () {
                            s.additionalLvl = self.value - 0;
                            s.setNeedsRecalc();
                            redraw();
                        };
                    })(inputNew, s);
                    
                    lblNew = document.createElement('label');
                    fieldset.appendChild(lblNew);
                    inputNew = document.createElement('input');
                    lblNew.appendChild(document.createTextNode('Max lvl: '));
                    inputNew.type = "text";
                    lblNew.appendChild(inputNew);
                    inputNew.value = s.maxLvl;
                    inputNew.onchange = (function (self, s) {
                        return function () {
                            s.maxLvl = (self.value | 0);
                            s.setNeedsRecalc();
                            redraw();
                        };
                    })(inputNew, s);
                    
                    newFieldset('Item details');
                    
                    gemTypes.forEach(function (keyword) {
                        lblNew = document.createElement('label');
                        fieldset.appendChild(lblNew);
                        inputNew = document.createElement('input');
                        lblNew.appendChild(document.createTextNode('+x to ' + keyword + ' gems: '));
                        inputNew.type = "text";
                        lblNew.appendChild(inputNew);
                        lblNew.style.width = '300px';
                        lblNew.style.display = 'inline-block';
                        lblNew.style.textAlign = 'right';
                        inputNew.value = s.additionalKeywordLvl[keyword] || 0;
                        inputNew.onchange = (function (self, s) {
                            return function () {
                                s.additionalKeywordLvl[keyword] = self.value | 0;
                                s.setNeedsRecalc();
                                redraw();
                            };
                        })(inputNew, s);
                        
                        fieldset.appendChild(document.createElement('br'));
                    });
                };
            getSupportsDropDown = function () {
                var key, nonProblematicSupports, stillApplicable = true, select, option, supportName, i, options = [], dmgPrev, dmgAfter, dmgMulti, tmpClone, dmgMultForSupports;//todo: calclate dmgDiff
                select = document.createElement('select');
                dmgMultForSupports = getSortedSupports(s);
                for (key in dmgMultForSupports) {
                    dmgMulti = dmgMultForSupports[key].mult;
                    supportName = dmgMultForSupports[key].support.name;
                    option = document.createElement('option');
                    option.innerHTML = supportName + ' | ' + roundForDisplay(dmgMulti);
                    option.apply = (function (self, s, innerSupport) {
                        return function () {
                            s.tryAddMod(innerSupport.clone());
                            s.setNeedsRecalc();
                            redraw();
                        };
                    })(option, s, supports[supportName]);
                    
                    options.push({dmg: dmgMulti, opt: option});
                }
                option = document.createElement('option');
                option.innerHTML = '--Select a support | dmg multiplier--';
                select.appendChild(option);
                
                options.sort(function (a, b) {
                    return b.dmg - a.dmg;
                });
                for (i = 0; i < options.length; i += 1) {
                    select.appendChild(options[i].opt);
                }
                select.onchange = function () {
                    select.options[select.selectedIndex].apply();
                }
                return select;
            };
            details = document.createElement("div");
            details.className = "spellDetails";
            details.style.backgroundColor = "#FFF";
            spellDetails.insertBefore(details, spellDetails.childNodes[0]);
            
            drawContent();
            
            details.update = drawContent;
        };
    },
    drawSkillIndex = function () {
        var btn, name, i = 0;
        index.innerHTML = '';
        for (name in skills) {
            if (skills[name].enabled && skills[name].isParsed) {
                indexLine = document.createElement("span");
                indexLine.style.backgroundColor = skills[name].color;
                indexLine.className = "spellIndexLine";
                index.appendChild(indexLine);
                
                btn = document.createElement("button");
                btn.innerHTML = name;
                indexLine.appendChild(btn);
                skills[name].drawDetails = getDrawSkillDetailsFn(skills[name])
                btn.onclick = skills[name].drawDetails;
            }
        }
    };
    onRedraw.push(drawSkillIndex);
    Object.keys(skills).forEach(function(name) {
        if (!skills[name].color) {
            skills[name].color = getColor();
        }
    });
    
    redraw = function () {
        var getTextColor = function () {
                return userInput.useDarkBg ? "#FFFFFF" : "#000000";
            },
            drawLvlOnYAxis = function () {
                var i;
                ctx.font = "15px Georgia";
                ctx.fillStyle = "#000000";
                ctx.fillText("Char/monster lvl", c.width / 2, c.height - 3);
                
                ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
                for (i = 10; i <= 100; i += 10) {//char/mosnter lvl on axis.
                    ctx.fillText(i, padding - 5 + i * pxPerLvl, c.height - 30);
                    ctx.beginPath();
                    ctx.moveTo(padding + i * pxPerLvl, c.height - padding);
                    ctx.lineTo(padding + i * pxPerLvl, 0);
                    ctx.stroke();
                }
            },
            intLen = function (n) {
                var i = 1;
                for (i = 1; n >= 10; i += 1) {
                    n /= 10;
                }
                return i;
            },
            drawDmgScale = function () {
                var dmg;
                ctx.font = "15px Georgia";
                ctx.fillStyle = "#000000";
                ctx.save();
                ctx.rotate(90 * Math.PI / 180);
                ctx.fillText("Damage", c.height / 2, -5);
                ctx.restore();
                
                for (i = 1; i <= 100 * canvasScale; i += 2) {//dmg values on axis.
                    dmg = ctxPxToDmg(c.height - padding - i * 10);
                    ctx.fillText(dmg, padding - 5 - 8 * intLen(dmg), c.height - padding - i * 10);
                }
            },
            drawSkills = (function() {
                var res = [], name;
                for (name in skills) {
                    if (skills[name].enabled) {
                        res.push(skills[name]);
                    }
                }
                return res;
            })(),
            plot = function () {
                var name, lvl, dmg, first, i, s;
                c.width = 1000;
                c.height = 900 * canvasScale;
                
                drawBg(ctx, c, padding);
                drawDmgScale();
                
                for (name in drawSkills) {
                    s = drawSkills[name];
                    first = true;
                    s.calcDmg();//recalc dmg.
                    if (!s.ignore) {
                        continue;//something has changed and the skill no longer deals dmg at userInput.playerLvlForSuggestions
                    }
                    ctx.beginPath();
                    for (lvl in s.dmg) {
                        //if (s.dmg[lvl].phys > 0) alert(name);
                        dmg = s.totalDmg(lvl);
                        if (dmg > 0) {
                            //start drawing:
                            ctx[first ? 'moveTo': 'lineTo'](padding + lvl * pxPerLvl, dmgToCtx(dmg));
                            first = false;
                        }
                    }
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = userInput.lineWidth;
                    ctx.stroke();
                }
                drawLvlOnYAxis();
            },
            barGraph = function () {
                var nameDrawn = false, key, name, i, offset = padding, totalDmg = 0, type, lvl, s, barWidth = 25,
                    styles = {
                        phys: '#888888',
                        fire: '#FF0000',
                        cold: '#0000FF',
                        light: '#FFFF00',
                        chaos: '#00FF00',
                        mana: 'rgba(100, 100, 100, 0.4)'},
                    drawBar = function () {
                        totalDmg = 0;
                        if (userInput.elementalColors) {
                            for (type in s.dmg[lvl]) {
                                if (s.dmg[lvl][type].max > 0) {
                                    ctx.fillStyle = styles[type.split(' ')[0]];
                                    ctx.fillRect(offset, dmgToCtx(totalDmg),
                                        barWidth, -dmgToPx(s.dmg[lvl][type].avg));
                                    totalDmg += s.dmg[lvl][type].avg;
                                    
                                }
                            }
                        } else {
                            totalDmg = s.totalDmg(lvl);
                            ctx.fillStyle = s.color;
                            ctx.fillRect(offset, dmgToCtx(0),
                                barWidth, -dmgToPx(totalDmg));
                        }
                        ctx.fillStyle = styles.mana;
                        ctx.fillRect(offset, c.height - padding,
                            barWidth, -s.mana[lvl]);
                        
                        ctx.fillStyle = getTextColor();
                        ctx.fillText(totalDmg | 0, offset, dmgToCtx(totalDmg) - 5);
                    },
                    drawLvl = function (extraOffset) {
                        ctx.fillStyle = getTextColor();
                        ctx.fillText(lvl, offset + extraOffset, c.height - 30);
                    };
                c.width = !userInput.interlaceBarGraph ? 
                    padding + (barWidth + 1) * 30 * drawSkills.length + drawSkills.length * 10 :
                    padding + (barWidth + 1) * 90 * drawSkills.length + (90) * 10;
                c.height = 900;
                
                drawBg(ctx, c, padding);
                drawDmgScale();
                
                //draw bar graph
                if (userInput.interlaceBarGraph) {//side by side lvl mode
                    for (i in drawSkills) {
                        drawSkills[i].calcDmg();
                    }
                    for (lvl = 1; lvl < 90; lvl += 1) {
                        drawLvl((drawSkills.length - 1) * barWidth / 2);
                        for (i in drawSkills) {
                            s = drawSkills[i];
                            drawBar();
                            
                            offset += barWidth + 1;
                        }
                        offset += 10;
                    }
                    ctx.fillStyle = "#000000";
                    ctx.fillText("Char/monster lvl", 500, c.height - 3);
                } else {
                    for (i in drawSkills) {//grouped by spell mode
                        s = drawSkills[i];
                        s.calcDmg();
                        nameDrawn = false;
                        for (key in s.stages) {
                            lvl = s.stages[key];
                            
                            drawBar();
                            drawLvl(0);
                            
                            offset += barWidth + 1;
                            if (!nameDrawn && key > s.stages.length / 2) {
                                ctx.fillText(s.name + " / assumed monster level.", offset - 250, c.height - 10);
                                nameDrawn = true;
                            }
                        }
                        offset += 10;
                    }
                }
            }, plotCombatDuration = function () {
                var scale = 50,
                    secToPx = function (sec) {
                    sec = drawnSeconds - sec;
                    return c.height - padding - sec * scale * canvasScale;
                }, combatDuration, drawnSeconds;
                c.width = 1000;
                c.height = 900 * canvasScale;
                drawnSeconds = Math.floor((c.height - padding) / (scale * canvasScale));
                
                drawBg(ctx, c, padding);
                
                ctx.font = "15px Georgia";
                ctx.fillStyle = "#000000";
                ctx.save();
                ctx.rotate(90 * Math.PI / 180);
                ctx.fillText("Combat duration in seconds", c.height / 2 - 50, -5);
                ctx.restore();
                
                for (combatDuration = 0; combatDuration <= drawnSeconds; combatDuration += 1) {
                    ctx.fillText(combatDuration, padding - 5 - 8 * intLen(combatDuration), secToPx(combatDuration));
                }
                drawLvlOnYAxis();
                
                drawSkills.forEach(function (s) {
                    var first = true, time, lvl;
                    s.calcDmg();//recalc dmg.
                    ctx.beginPath();
                    for (lvl in s.dmg) {
                        time = s.getCombatTime(lvl);
                        if (time > 0 && time <= drawnSeconds) {
                            //start drawing:
                            ctx[first ? 'moveTo': 'lineTo'](padding + lvl * 10, secToPx(time));
                            first = false;
                        }
                    }
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            };
            
        if (userInput.useBarGraph) {
            barGraph();
        } else if (userInput.plotCombatDuration) {
            plotCombatDuration();
        } else {
            plot();
        }
        
        
        //update spell details in case of updated player/monster stats.
        (function () {
            var key, spellDetails = document.getElementsByClassName('spellDetails');
            for (key = 0; key < spellDetails.length; key += 1) {
                spellDetails[key].update();
            }
        })();
        
        onRedraw.forEach(function (fn) { fn(); });
    };
    
    
    (function () {
        var mouseX, mouseY, findPos = function (obj) {
                var curleft = -obj.parentNode.scrollLeft, curtop = -obj.parentNode.scrollTop;
                if (obj.offsetParent) {
                    do {
                        curleft += obj.offsetLeft;
                        curtop += obj.offsetTop;
                    } while (obj = obj.offsetParent);
                    return { x: curleft, y: curtop };
                }
                return undefined;
            },
            rgbToHex = function (r, g, b) {
                if (r > 255 || g > 255 || b > 255)
                    throw "Invalid color component";
                return ((r << 16) | (g << 8) | b).toString(16).toUpperCase();
            }, lblName = document.createElement('label'), ignoreOut = false;
        
        lblName.style.display = 'none';
        lblName.className = 'lblSkillHover';
        document.getElementById('canvas').parentNode.appendChild(lblName);
        
        lblName.onmouseover = function () { ignoreOut = true; };
        lblName.onmouseout = function () { ignoreOut = false; };
        
        c.onmousemove = function(e) {
            var s, lvl,
                pos = findPos(this),
                x = e.pageX - pos.x,
                y = e.pageY - pos.y,
                coord = "x=" + x + ", y=" + y,
                c = this.getContext('2d'),
                p = c.getImageData(x, y, 1, 1).data,
                hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6),
                matchedSkills = [], key, s;
            mouseX = e.pageX;
            mouseY = e.pageY;
            for (key in skills) {
                s = skills[key];
                if (s.color === hex && s.enabled) {
                    matchedSkills.push(s);
                }
            }
            if (matchedSkills.length > 0) {
                s = matchedSkills[0];
                lblName.style.display = 'block';
                lblName.style.top = mouseY - 10 + 'px';
                lblName.style.left = mouseX + 5 + 'px';
                
                lvl = ctxPxToLvl(x);
                if (0 >= lvl) {
                    lvl = 1;
                }
                lblName.innerHTML = s.name + '<br />Lvl: ' + lvl + ', Dmg: ' + roundForDisplay(s.totalDmg(lvl));
            }
        };
        c.onmouseout = function (e) {
            setTimeout(function () {
                if (!ignoreOut) {
                    lblName.style.display = 'none';
                }
            }, 0);
        };
    })();
    
    (function () {
        var btnAddBest = document.getElementById('btnAddBestSupport'),
            btnRemoveWorst = document.getElementById('removeWorstSupport'),
            btnRemoveAll = document.getElementById('removeAllSupport'),
            btnAddAll = document.getElementById('addAllSupport'),
            btnReduceToMaxSupports = document.getElementById('reduceToMaxSupports');
        
        btnReduceToMaxSupports.onclick = function () {
            var s, k, mult = 0, newMult, worstSupportKey = -1;
            for (name in skills) {
                s = skills[name];
                if (s.enabled) {
                    while (s.modifiers.length > userInput.maxSupports) {
                        worstSupportKey = -1;
                        mult = -1;
                        for (k in s.modifiers) {
                            s.calcDmg(userInput.playerLvlForSuggestions);
                            newMult = getSupportRemovedDiff(s, k);
                            if (newMult > mult) {
                                mult = newMult;
                                worstSupportKey = k;
                            }
                        }
                        if (worstSupportKey >= 0) {
                            s.modifiers.splice(worstSupportKey, 1);
                            s.setNeedsRecalc();
                        } else {
                            break;
                        }
                    }
                }
            }
            redraw();
        };
        
        btnAddAll.onclick = function () {
            var dmgMultForSupports, s, name, i;
            for (name in skills) {
                s = skills[name];
                if (s.enabled) {
                    dmgMultForSupports = getSortedSupports(s);
                    if (dmgMultForSupports.length > 0) {
                        for (i = 0; i < dmgMultForSupports.length; i += 1) {
                            s.tryAddMod(dmgMultForSupports[i].support.clone());
                        }
                        s.setNeedsRecalc();
                    }
                }
            }
            redraw();
        };
        
        btnRemoveAll.onclick = function () {
            var s, name;
            for (name in skills) {
                s = skills[name];
                if (s.enabled && s.modifiers.length > 0) {
                    s.setNeedsRecalc();
                    s.modifiers = [];
                }
            }
            redraw();
        };
        
        btnAddBest.onclick = function () {
            var dmgMultForSupports, s, name;
            for (name in skills) {
                s = skills[name];
                if (s.enabled) {
                    dmgMultForSupports = getSortedSupports(s);
                    if (dmgMultForSupports.length > 0) {
                        s.tryAddMod(dmgMultForSupports[0].support.clone());
                        s.setNeedsRecalc();
                    }
                }
            }
            redraw();
        };
        btnRemoveWorst.onclick = function () {
            var s, k, mult = 0, newMult, worstSupportKey = -1;
            for (name in skills) {
                s = skills[name];
                if (s.enabled) {
                     worstSupportKey = -1;
                     mult = -1;
                    for (k in s.modifiers) {
                        s.calcDmg(userInput.playerLvlForSuggestions);
                        newMult = getSupportRemovedDiff(s, k);
                        if (newMult > mult) {
                            mult = newMult;
                            worstSupportKey = k;
                        }
                    }
                    if (worstSupportKey >= 0) {
                        s.modifiers.splice(worstSupportKey, 1);
                        s.setNeedsRecalc();
                    }
                }
            }
            redraw();
        };
        
        /*for (name in rawSupports) {//draw all support data (testing/dev purposses only...)
            s = rawSupports[name];
            b = document.createElement("h2");
            b.innerHTML = name;
            div = document.createElement("div");
            div.appendChild(b);
            div.style.float = 'left';
            div.style.padding = '5px';
            div.style.border = '1px solid #000';
            div.style.display = 'inline-block';
            spellDetails.appendChild(div)
            for (key in s.modifiers) {
                b = document.createElement("span");
                b.innerHTML = s.modifiers[key];
                div.appendChild(b);
            }
                b = document.createElement("span");
            for (key in s.keywords) {
                b.innerHTML += s.keywords[key] + ', ';
            }
            div.appendChild(b);
        }*/
        
        (function () {//test: moving misc menu to tabs.
            var misc = document.getElementById('misc'),
                userInputTabs, newTab, divs, i, head, limit;
            divs = misc.getElementsByTagName('div');
            limit = divs.length;
            userInputTabs = tabSet(misc, 'userInput');
            for (i = 0; i < limit; i += 1) {
                head = divs[0].getElementsByTagName('h2');
                if (head.length > 0) {
                    newTab = userInputTabs.addTab(head[0].innerHTML);
                    newTab.appendChild(divs[0]);
                }
            }
        })();
        
        var getAreas;
        monsterStats.forEach((function () {
            var difficulty = {}, dificulties = ['normal', 'cruel', 'merciless'], i, difKey = 0, curDif = dificulties[difKey];
            dificulties.forEach(function (dif) {
                difficulty[dif] = {};
            });
            getAreas = function () { return difficulty; };
            
            return function (monster) {
                if (!difficulty[curDif].hasOwnProperty(monster.area)) {
                    difficulty[curDif][monster.area] = {};
                    i = 2;
                } else if (difficulty[curDif][monster.area].hasOwnProperty(monster.name)) {
                    if (difficulty[curDif][monster.area][monster.name].lvl === monster.lvl) {
                        monster.name = monster.name + ' ' + i;
                        i += 1;
                    } else {
                        difKey += 1;
                        curDif = dificulties[difKey];
                        difficulty[curDif] = {};
                        difficulty[curDif][monster.area] = {};
                    }
                }
                difficulty[curDif][monster.area][monster.name] = monster;
            };
        })());
        
        (function () {
            var difTabParent, actTabParent, i, sum, count, key, difName, areaName, monsterName, monstersByArea = getAreas(), m, act = 0, actFirstArea = ['the twilight strand', 'the southern forest', 'the city of sarn'],
                fieldset, cbNew, legend, lblNew, table, difTab, actTab, areaTab, tabsByDificulty, tr, td, th, monsterData = document.getElementById('spellDetails'/*'monsterData'*/),
                newFieldset = function (title) {
                    fieldset = document.createElement("fieldset");
                    monsterData.appendChild(fieldset);
                    legend = document.createElement("legend");
                    legend.appendChild(document.createTextNode(title));
                    fieldset.appendChild(legend);
                },
                updatedSelectedArea = function () {
                    var key;
                    userInput.selectedAreas = [];
                    for (difName in monstersByArea) {
                        for (areaName in monstersByArea[difName]) {
                            for (monsterName in monstersByArea[difName][areaName]) {
                                if (monstersByArea[difName][areaName][monsterName].enabled) {
                                    userInput.selectedAreas.push(monstersByArea[difName][areaName]);
                                    break;
                                }
                            }
                        }
                    }
                    for (key in skills) {
                        skills[key].setNeedsRecalc();
                    }
                    setMonstersNeedRecalc();
                    redraw();
                },
                cols = ['name', 'lvl', 'xp', 'fire res', 'cold res', 'light res', 'chaos res', 'is used'],
                printTableHeader = function () {
                    var i;
                    table = document.createElement("table");
                    areaTab.appendChild(table);
                    tr = document.createElement("tr");
                    table.appendChild(tr);
                    for (i = 0; i < cols.length; i += 1) {
                        th = document.createElement("th");
                        tr.appendChild(th);
                        th.innerHTML = cols[i];
                    }
                },
                areaAndMonsterContainer,
                header;
            areaAndMonsterContainer = document.createElement('div');
            areaAndMonsterContainer.id = 'monsterTabSetContainer';
            monsterData.appendChild(areaAndMonsterContainer);
            
            header = document.createElement('h3');
            header.appendChild(document.createTextNode('Area & monster data'));
            areaAndMonsterContainer.appendChild(header);
            
            tabsByDificulty = tabSet(areaAndMonsterContainer, 'tabsByDificulty');
            
            for (difName in monstersByArea) {
                difTabParent = tabsByDificulty.addTab(difName);
                (function () {
                    cbNew = document.createElement('input');
                    lblNew = document.createElement('label');
                    lblNew.appendChild(document.createTextNode('(de)select all in dificulty: '));
                    lblNew.appendChild(cbNew);
                    difTabParent.appendChild(lblNew);
                    cbNew.type = 'checkbox';
                    cbNew.checked = false;
                    cbNew.onchange = (function (self, innerDif) {
                        return function () {
                            var innerAreaName, innerMonsterName, innerM;
                            for (innerAreaName in monstersByArea[innerDif]) {
                                for (innerMonsterName in monstersByArea[innerDif][innerAreaName]) {
                                    innerM = monstersByArea[innerDif][innerAreaName][innerMonsterName];
                                    innerM.setEnabled(self.checked);
                                }
                            }
                            updatedSelectedArea();
                        };
                    })(cbNew, difName);
                })();
                difTab = tabSet(difTabParent, difName);
                    
                act = 0;
                for (areaName in monstersByArea[difName]) {
                    if (actFirstArea.indexOf(areaName) >= 0) {
                        act += 1;
                        actTabParent = difTab.addTab('Act' + act);
                        (function () {
                            cbNew = document.createElement('input');
                            lblNew = document.createElement('label');
                            lblNew.appendChild(document.createTextNode('(de)select all in act: '));
                            lblNew.appendChild(cbNew);
                            actTabParent.appendChild(lblNew);
                            cbNew.type = 'checkbox';
                            cbNew.checked = false;
                            cbNew.onchange = (function (self, innerAct, innerDif) {
                                return function () {
                                    var innerAreaName, innerMonsterName, innerM, key;
                                    for (innerAreaName in monstersByArea[innerDif]) {
                                        for (innerMonsterName in monstersByArea[innerDif][innerAreaName]) {
                                            innerM = monstersByArea[innerDif][innerAreaName][innerMonsterName];
                                            if (innerM.act === innerAct) {
                                                innerM.setEnabled(self.checked);
                                            } else {
                                                break;//if any monster in the are isn't in the right act, none are...
                                            }
                                        }
                                    }
                                    updatedSelectedArea();
                                };
                            })(cbNew, act, difName);
                        })();
                        actTab = tabSet(actTabParent, difName + 'Act' + act);
                    }
                    areaTab = actTab.addTab(areaName);
                    cbNew = document.createElement('input');
                    
                    lblNew = document.createElement('label');
                    lblNew.appendChild(document.createTextNode('(de)select all in area: '));
                    lblNew.appendChild(cbNew);
                    areaTab.appendChild(lblNew);
                    
                    cbNew.type = 'checkbox';
                    cbNew.checked = false;
                    cbNew.onchange = (function (self, area, innerDifName, innerAreaName) {
                        return function () {
                            var key;
                            setArea(self.checked);
                            for (key in area) {
                                area[key].setEnabled(self.checked);
                            }
                            updatedSelectedArea();
                        }
                    })(cbNew, monstersByArea[difName][areaName], difName, areaName);
                    printTableHeader();
                    for (monsterName in monstersByArea[difName][areaName]) {
                        m = monstersByArea[difName][areaName][monsterName];
                        tr = document.createElement("tr");
                        table.appendChild(tr);
                        for (i = 0; i < cols.length; i += 1) {
                            td = document.createElement("td");
                            tr.appendChild(td);
                            if ('xp' !== cols[i] && 'is used' !== cols[i]) {
                                td.innerHTML = m[cols[i]];
                            } else if ('xp' === cols[i] ) {
                                sum = 0;
                                count = 0;
                                for (key in m) {
                                    if (key.indexOf(' xp') >= 0) {
                                        sum += m[key];
                                        count += 1;
                                    }
                                }
                                td.innerHTML = roundForDisplay(sum / count);
                            } else {
                                cbNew = document.createElement('input');
                                td.appendChild(cbNew);
                                cbNew.type = 'checkbox';
                                cbNew.checked = false;
                                cbNew.onchange = (function (monster, self, innerDifName, innerAreaName) {
                                    monster.enabled = self.checked;
                                    monster.act = act;
                                    
                                    monster.setEnabled = function (val) {
                                        monster.enabled = val || false;
                                        self.checked = val;
                                    };
                                    
                                    self.oncontextmenu = function () {
                                        alert(self.checked + ' ' + monster.enabled);
                                        return false;
                                    };
                                    
                                    return function () {
                                        var key;
                                        monster.setEnabled(self.checked);
                                        updatedSelectedArea();
                                    };
                                })(m, cbNew, difName, areaName);
                            }
                        }
                    }
                }
            }
            difTab = tabsByDificulty.addTab('Overview');
            onRedraw.push((function (tab) {
                var globallyEnabled = false;
                return function () {
                    var key, m, plotRes;
                    tab.innerHTML = '';
                    tab.appendChild(document.createTextNode('Note that the life and armour values are estimates I pulled out of my ass...'));
                    tab.appendChild(document.createElement('br'));
                    
                    (function () {
                        cbNew = document.createElement('input');
                        lblNew = document.createElement('label');
                        lblNew.appendChild(document.createTextNode('(de)select all monsters in all dificulties: '));
                        lblNew.appendChild(cbNew);
                        tab.appendChild(lblNew);
                        cbNew.type = 'checkbox';
                        cbNew.checked = globallyEnabled;
                        cbNew.onchange = (function (self) {
                            return function () {
                                var innerAreaName, innerMonsterName, innerDif, innerM, key;
                                globallyEnabled = self.checked;
                                for (innerDif in monstersByArea) {
                                    for (innerAreaName in monstersByArea[innerDif]) {
                                        for (innerMonsterName in monstersByArea[innerDif][innerAreaName]) {
                                            innerM = monstersByArea[innerDif][innerAreaName][innerMonsterName];
                                            innerM.setEnabled(self.checked);
                                        }
                                    }
                                }
                                updatedSelectedArea();
                            };
                        })(cbNew);
                    })();
                    tab.appendChild(document.createElement('br'));
                    
                    lblNew = document.createElement('label');
                    cbNew = document.createElement('input');
                    lblNew.appendChild(document.createTextNode('Min level offset: '));
                    lblNew.appendChild(cbNew);
                    tab.appendChild(lblNew);
                    cbNew.type = 'input';
                    if (!userInput.hasOwnProperty('minMonsterLvlOffset')) {
                        userInput.minMonsterLvlOffset = 5;
                    }
                    cbNew.value = userInput.minMonsterLvlOffset;
                    cbNew.id = 'minMonsterLvlOffset';
                    cbNew.onchange = (function (self) {
                        return function () {
                            var key;
                            userInput[self.id] = self.value | 0;
                            setMonstersNeedRecalc();
                            for (key in skills) {
                                skills[key].setNeedsRecalc();
                            }
                            redraw();
                        };
                    })(cbNew);
                    tab.appendChild(document.createElement('br'));
                    
                    table = document.createElement("table");
                    tab.appendChild(table);
                    m = getAvgMonsterAtLvl(userInput.playerLvlForSuggestions);
                    for (key in m) {
                        tr = document.createElement("tr");
                        table.appendChild(tr);
                        th = document.createElement("th");
                        tr.appendChild(th);
                        th.innerHTML = key;
                        
                        td = document.createElement("td");
                        tr.appendChild(td);
                        td.innerHTML = roundForDisplay(m[key]);
                    }
                    
                    plotRes = document.createElement('canvas');
                    tab.appendChild(plotRes);
                    plotRes.width = 550;
                    plotRes.height = 250;
                    plotRes.style.border = '1px solid #000';
                    (function (ctx, c) {
                        var pxX, pxY, lvl, padding = 50, key, plot = {'fire': '#F00', 'cold': '#00F', 'light': '#FF0', 'chaos': '#0F0'};
                        
                        drawBg(ctx, c, padding);
                        
                        ctx.lineWidth = userInput.lineWidth;
                        for (key in plot) {      
                            ctx.beginPath();
                            for (lvl = 0; lvl < 100; lvl += 1) {
                                m = getAvgMonsterAtLvl(lvl);
                                pxY = c.height - (padding + 2 * m[key]);
                                pxX = padding + lvl * 5;
                                ctx[0 === lvl ? 'moveTo': 'lineTo'](pxX, pxY);
                            }
                            ctx.strokeStyle = plot[key];
                            ctx.stroke();
                        }
                        
                        ctx.font = "15px Georgia";
                        ctx.fillStyle = "#000000";
                        pxY = c.height - padding + 14;
                        for (lvl = 0; lvl < 100; lvl += 10) {
                            ctx.fillText(lvl, padding + lvl * 5, pxY);
                        }
                        pxX = padding - 18;
                        for (key = 0; key < 100; key += 10) {
                            ctx.fillText(key, pxX, c.height - padding - key * 2);
                        }
                        ctx.save();
                        ctx.rotate(90 * Math.PI / 180);
                        ctx.fillText("Resistances", c.height / 2 - 50, -5);
                        ctx.restore();
                        
                        ctx.fillText("Monster lvl", c.width / 2 - 50, c.height - 15);
                    })(plotRes.getContext('2d'), plotRes);
                };
            })(difTab));
        })();
        parseSupports = function (data, title, id, defaultChecked, onChange) {
            var supportsTab, container,
                userInputTabset = document.getElementById('userInput').tabSet,
                name,
                tabs = {},
                tabName,
                s, keyword, lblSupport, cbSupportEnabled, update, heading, init;
            container = userInputTabset.addTab(title);
            container.id = 'supportsTabSetContainer';
            container.className = 'userInputSection';
            heading = document.createElement('h3');
            heading.appendChild(document.createTextNode(title));
            container.appendChild(heading);
            supportsTab = tabSet(container, id);
            
            for (name in data) {
                data[name].enabled = defaultChecked;
            }
                    
            update = function () {
                var s;
                for (keyword in tabs) {
                    tabs[keyword].innerHTML = '';//clear all tabs.
                }
                for (name in data) {
                    s = data[name];
                    for (keyword in s.keywords) {
                        keyword = s.keywords[keyword];
                        if (Object.keys(tabs).indexOf(keyword) < 0) {
                            tabs[keyword] = supportsTab.addTab(keyword, document.createElement('fieldset')).firstChild;
                        }
                        cbSupportEnabled = document.createElement('input');
                        cbSupportEnabled.gem = s;
                        cbSupportEnabled.type = 'checkbox';
                        cbSupportEnabled.checked =  s.isParsed && s.enabled;
                        cbSupportEnabled.disabled = !s.isParsed;
                        lblSupport = document.createElement('label');
                        lblSupport.appendChild(document.createTextNode(s.name + ': '));
                        lblSupport.appendChild(cbSupportEnabled);
                        tabs[keyword].appendChild(lblSupport);
                        
                        cbSupportEnabled.onchange = (function (self, gem) {
                            return function () {
                                gem.enabled = self.checked;
                                update();
                                
                                if (undefined !== onChange) {
                                    onChange(gem);
                                }
                                
                                redraw();
                            };
                        })(cbSupportEnabled, s);
                    }
                }
            };
            //onRedraw.push(update);//if the support enabled ever updates by another source this line needs to be added...
            update();
        };
        parseSupports(supports, 'Support gems', 'supportsApplicability', true);
        parseSupports(auras, 'Auras', 'activeAuras', false, function (aura) {
            var name, s, index;
            for (name in skills) {
                s = skills[name];
                if (aura.enabled) {
                    s.tryAddMod(aura);
                } else {
                    s.tryRemoveMod(aura);
                }
            }
        });
        parseSupports(curses, 'Curses', 'activeCurses', false, function (curse) {
            var name, s, index;
            for (name in skills) {
                s = skills[name];
                if (curse.enabled) {
                    s.tryAddMod(curse);
                } else {
                    s.tryRemoveMod(curse);
                }
            }
        });
        parseSupports(skills, 'Skills', 'drawSills', true, function (skill) {
            //skill.setNeedsRecalc();//should not be needed, but things bug out sometimes...
            redraw();
        });
        (function () {
            var skillsTab = document.getElementById('drawSills'),
                cbToggleAll = document.createElement('input'),
                lblToggleAll = document.createElement('span');
            lblToggleAll.appendChild(document.createTextNode('Toggle all '));
            lblToggleAll.appendChild(cbToggleAll);
            
            skillsTab.insertBefore(lblToggleAll, skillsTab.firstChild);
            
            cbToggleAll.type = 'checkbox';
            cbToggleAll.onchange = function () {
                var sbSkills = skillsTab.getElementsByTagName('input'), i;
                for (i = 0; i < sbSkills.length; i += 1) {
                    if (!sbSkills[i].disabled) {
                        if (sbSkills[i].hasOwnProperty('gem')) {
                            sbSkills[i].checked = cbToggleAll.checked;
                            sbSkills[i].gem.enabled = cbToggleAll.checked;
                        }
                    }
                }
                redraw();
            };
        })();
    })();
    
    redraw();
    };