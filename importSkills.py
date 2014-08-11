from urllib.request import Request, urlopen
from json import load

dir = "E:\\programming\\Node\\POESkillTree\\"

def getPage(url):
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urlopen(req)

f_supports = open(dir + "allSupports.json")
for spell in load(f_supports)["supports"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_support = open(dir + "supportsHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_support.write(HTML.read())
	f_support.close()
f_supports.close()

f_spells = open(dir + "allSpells.json")
for spell in load(f_spells)["spells"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_spell = open(dir + "spellsHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_spell.write(HTML.read())
	f_spell.close()
f_spells.close()

f_auras = open(dir + "allAuras.json")
for spell in load(f_auras)["auras"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_spell = open(dir + "aurasHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_spell.write(HTML.read())
	f_spell.close()
f_auras.close()

f_attacks = open(dir + "allAttacks.json")
for spell in load(f_attacks)["attacks"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_spell = open(dir + "attacksHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_spell.write(HTML.read())
	f_spell.close()
f_attacks.close()

f_curses = open(dir + "allCurses.json")
for spell in load(f_curses)["curses"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_spell = open(dir + "cursesHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_spell.write(HTML.read())
	f_spell.close()
f_curses.close()

f_random = open(dir + "otherSkills.json")
for spell in load(f_random)["random"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_spell = open(dir + "randomHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_spell.write(HTML.read())
	f_spell.close()
f_random.close()


HTML = getPage("http://pathofexile.gamepedia.com/Monster_Experience")
f_monsterStats = open(dir + "MonsterStats.html", "wb")
f_monsterStats.write(HTML.read())
f_monsterStats.close()


