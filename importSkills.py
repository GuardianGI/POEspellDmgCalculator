from urllib.request import Request, urlopen
from json import load

dir = "E:\\programming\\Node\\POESkillTree\\"

def getPage(url):
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urlopen(req)

f_supports = open(dir + "spellSupports.json")
for spell in load(f_supports)["supports"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_support = open(dir + "spellSupportsHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_support.write(HTML.read())
	f_support.close()
f_supports.close()

f_spells = open(dir + "allSpels.json")
for spell in load(f_spells)["spells"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_spell = open(dir + "skillsHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_spell.write(HTML.read())
	f_spell.close()
f_spells.close()


HTML = getPage("http://pathofexile.gamepedia.com/Monster_Experience")
f_monsterStats = open(dir + "MonsterStats.html", "wb")
f_monsterStats.write(HTML.read())
f_monsterStats.close()


