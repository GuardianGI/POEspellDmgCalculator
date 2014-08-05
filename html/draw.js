var redraw, onRedraw = [],
    toggleCheckAll = function (cb) {
        var i, allCb = document.getElementsByClassName('drawSkill');
        for (i in allCb) {
            if ("checkbox" == allCb[i].type) {
                allCb[i].checked = cb.checked;
                allCb[i].update();
            }
        }
        redraw();
    },
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
                clone.supports.splice(supportIndex, 1);
                clone.calcDmg();
                return clone.totalDmg(userInput.playerLvlForSuggestions) / skill.totalDmg(userInput.playerLvlForSuggestions);
            },
            getColor = function (n) {
                var color = "#",
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
                return color;
            },
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
    
    document.getElementById("shuffleColors").onclick = (function () {
        var beginColor = 1;
        return function () {
            var name, j, i = beginColor, indexLines = document.getElementsByClassName("spellIndexLine"),
                spellCount = 0;
            for (name in skills) {
                if (skills[name].draw) {
                    spellCount += 1;
                }
            }
            for (name in skills) {
                if (skills[name].draw) {
                    skills[name].color = getColor(i);
                    for (j in indexLines) {
                        if (name == indexLines[j].getElementsByTagName("button")[0].innerHTML) {
                            indexLines[j].style.backgroundColor = skills[name].color;
                            break;
                        }
                    }
                    i += spellCount % 16;
                }
            }
            beginColor += 1;
            redraw();
        };
    })();
    
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
    
    var drawSkillIndex = function () {
        var btn, name, i = 0;
        index.innerHTML = '';
        for (name in skills) {
            if (skills[name].hasDmg) {
                if (!skills[name].color) {
                    skills[name].color = getColor(i);
                    i += 1;
                }
                indexLine = document.createElement("span");
                indexLine.style.backgroundColor = skills[name].color;
                indexLine.className = "spellIndexLine";
                index.appendChild(indexLine);
                
                checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "drawSkill"
                checkbox.checked = skills[name].draw;
                checkbox.update = (function (skill, checkbox) {
                        return function () {
                            skill.draw = checkbox.checked;
                        }
                    })(skills[name], checkbox);
                checkbox.onclick = (function (checkbox) {
                        return function () {
                            checkbox.update();
                            redraw();
                        }
                    })(checkbox);
                indexLine.appendChild(checkbox);
                
                btn = document.createElement("button");
                btn.innerHTML = name;
                indexLine.appendChild(btn);
                btn.onclick = (function (s) {
                    return function () {
                        var details, dif, lblNew, inputNew, btnClone, head, btnClose, fieldset, legend, lblQualityBonus, support, node, checkbox, k, getSupportsDropDown,
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
                                
                                lblQualityBonus = document.createElement("label");
                                lblQualityBonus.innerHTML = s.qualityBonus;
                                details.appendChild(lblQualityBonus);
                                
                                newFieldset('Supports');
                                
                                rows = [];
                                tbl = document.createElement('table');
                                fieldset.appendChild(tbl);
                                tbl.width = '100%';
                                for (k in s.supports) {//draw checkbox to turn of applied supports
                                    r = {}
                                    
                                    r['Name'] = document.createTextNode(s.supports[k].name);
                                    
                                    inputNew = document.createElement('input');
                                    inputNew.type = 'text';
                                    inputNew.value = s.supports[k].maxLvl;
                                    inputNew.title = 'max lvl';
                                    inputNew.onchange = (function (self, support, skill) {
                                        return function () {
                                            support.maxLvl = self.value | 0;
                                            skill.setNeedsRecalc();
                                            redraw();
                                        };
                                    })(inputNew, s.supports[k], s);
                                    r['Max gem lvl'] = inputNew;
                                    
                                    inputNew = document.createElement('input');
                                    inputNew.type = 'text';
                                    inputNew.value = s.supportQualityLvl[s.supports[k].name];
                                    inputNew.title = 'quality lvl';
                                    inputNew.onchange = (function (self, support, skill) {
                                        return function () {
                                            skill.supportQualityLvl[support.name] = self.value | 0;
                                            skill.setNeedsRecalc();
                                            redraw();
                                        };
                                    })(inputNew, s.supports[k], s);
                                    r['Quality lvl'] = inputNew;
                                    
                                    r['Remove mult.'] = document.createTextNode(
                                        roundForDisplay(getSupportRemovedDiff(s, k)))
                                    
                                    checkbox = document.createElement('input');
                                    checkbox.type = 'button';
                                    checkbox.value = 'X';
                                    checkbox.onclick = (function (self, support) {
                                        return function() {
                                            var i = s.supports.indexOf(support);
                                            if (i > -1) {
                                                s.supports.splice(i, 1);
                                                s.setNeedsRecalc();
                                            }
                                            redraw();
                                        }
                                    })(checkbox, s.supports[k]);
                                    r['Remove'] = checkbox;
                                    rows.push(r)
                                }
                                drawTable(tbl, rows);
                                
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
                                            drawSkillIndex();
                                            redraw();
                                        }
                                    };
                                })(s, name);
                                
                                lblNew = document.createElement('label');
                                fieldset.appendChild(lblNew);
                                lblNew.innerHTML = s.totalDmg(userInput.playerLvlForSuggestions);
                                
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
                                        s.maxLvl = (self.value | 0) - 1;
                                        s.setNeedsRecalc();
                                        redraw();
                                    };
                                })(inputNew, s);
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
                                        s.supports.push(innerSupport.clone());
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
                })(skills[name]);
            }
        }
    };
    drawSkillIndex();
    
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
                    if (skills[name].draw) {
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
                                    ctx.fillStyle = styles[type];
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
        
        //drawSkillIndex();
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
        body.appendChild(lblName);
        
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
                if (s.color === hex && s.draw) {
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
            btnRemoveWorst = document.getElementById('removeWorstSupport');
            
        btnAddBest.onclick = function () {
            var dmgMultForSupports, s, name;
            for (name in skills) {
                s = skills[name];
                if (s.draw) {
                    dmgMultForSupports = getSortedSupports(s);
                    if (dmgMultForSupports.length > 0) {
                        s.supports.push(dmgMultForSupports[0].support.clone());
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
                if (s.draw) {
                     worstSupportKey = -1;
                     mult = -1;
                    for (k in s.supports) {
                        newMult = getSupportRemovedDiff(s, k);
                        if (newMult > mult) {
                            mult = newMult;
                            worstSupportKey = k;
                        }
                    }
                    if (worstSupportKey >= 0) {
                        s.supports.splice(worstSupportKey, 1);
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
            var setAreaEnabled = {}, i, sum, count, key, difName, areaName, monsterName, monstersByArea = getAreas(), m, act = 0, actFirstArea = ['the twilight strand', 'the southern forest', 'the city of sarn'],
                fieldset, cbNew, legend, lblNew, table, difTab, actTab, areaTab, tabsByDificulty, tr, td, th, monsterData = document.getElementById('spellDetails'/*'monsterData'*/),
                newFieldset = function (title) {
                    fieldset = document.createElement("fieldset");
                    monsterData.appendChild(fieldset);
                    legend = document.createElement("legend");
                    legend.appendChild(document.createTextNode(title));
                    fieldset.appendChild(legend);
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
                };
                tabsByDificulty = tabSet(monsterData, 'tabsByDificulty');
            for (difName in monstersByArea) {
                difTab = tabSet(tabsByDificulty.addTab(difName), difName);
                act = 0;
                for (areaName in monstersByArea[difName]) {
                    if (actFirstArea.indexOf(areaName) >= 0) {
                        act += 1;
                        actTab = tabSet(difTab.addTab('Act' + act), difName + 'Act' + act);
                    }
                    areaTab = actTab.addTab(areaName);
                    cbNew = document.createElement('input');
                    areaTab.appendChild(cbNew);
                    cbNew.type = 'checkbox';
                    cbNew.checked = false;
                    cbNew.onchange = (function (self, area, innerDifName, innerAreaName) {
                        var setArea, directCall = false;
                        if (!userInput.hasOwnProperty('selectedAreas')) {
                            userInput.selectedAreas = [];
                        }
                        setArea = function (val) {
                            var index = userInput.selectedAreas.indexOf(area), key;
                            if (val && index < 0) {
                                userInput.selectedAreas.push(area);
                            } else if (!val && index >= 0) {
                                userInput.selectedAreas.splice(index, 1);
                            }
                            if (directCall) {//set all monsters to same as checkbox if the checkbox itself was clicked.
                                for (key in area) {
                                    area[key].setEnabledIgnoreArea(val);
                                }
                            }
                            for (key in skills) {
                                skills[key].setNeedsRecalc();
                            }
                            self.checked = val;
                        };
                        setAreaEnabled[innerDifName + innerAreaName] = setArea;
                        return function () {
                            directCall = true;
                            setArea(self.checked);
                            directCall = false;
                            redraw();
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
                                    
                                    monster.setEnabledIgnoreArea = function (val) {
                                        monster.enabled = val;
                                        self.checked = val;
                                    };
                                    monster.setEnabled = function (val) {
                                        var key;
                                        
                                        monster.setEnabledIgnoreArea(val);
                                        
                                        if (val) {
                                            setAreaEnabled[innerDifName + innerAreaName](val);
                                        }
                                        for (key in skills) {
                                            skills[key].setNeedsRecalc();
                                        }
                                    };
                                    
                                    return function () {
                                        monster.setEnabled(self.checked);
                                        redraw();
                                    };
                                })(m, cbNew, difName, areaName);
                            }
                        }
                    }
                }
            }
            difTab = tabsByDificulty.addTab('Overview');
            onRedraw.push((function (tab) {
                return function () {
                    var key, m, plotRes;
                    tab.innerHTML = '';
                    tab.appendChild(document.createTextNode('Note that the life and armour values are estimates I pulled out of my ass...'));
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
                    plotRes.width = '140px';
                    plotRes.height = '140px;';
                    (function (ctx, c) {
                        var padding = 40;
                        drawBg(ctx, c, padding);
                    })(plotRes.getContext('2d'), plotRes);
                };
            })(difTab));
        })();
    })();
    
    redraw();
    };