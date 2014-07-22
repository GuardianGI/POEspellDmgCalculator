from urllib.request import Request, urlopen
from json import load

dir = "E:\\programming\\Node\\POESkillTree\\"

def getPage(url):
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urlopen(req)

f_spells = open(dir + "spellSupports.json")
for spell in load(f_spells)["supports"] :
	HTML = getPage("http://pathofexile.gamepedia.com{}".format(spell["href"]))
	f_spell = open(dir + "spellSupportsHTML/{}.html".format(spell["name"].replace("/", "")), "wb")
	f_spell.write(HTML.read())
	f_spell.close()
f_spells.close()

