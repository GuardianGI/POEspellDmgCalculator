import re
from xml.dom.minidom import parseString

f = open("E:\\programming\\Node\\POESkillTree\\MonsterStats.html", "rb")#html file from http://pathofexile.gamepedia.com/Monster_Experience

def fixUnclosedTags(content):
	return re.sub('(\<img [^>]*?)/?\>', '\g<1> />', content).replace('<br>', '<br />')
	
def getTables(content, fn):
	for i in range(0, 3):
		tableString = re.search('\<table [^>]*?class="[^"]*?wikitable', content)
		offset = content.find(tableString.group(0))
		content = content[offset:]
		offset = 0
		tblClose = "</table>"
		tblOpen = "<table"
		innerTable = content.find(tblOpen, offset + tblOpen.__len__())
		closing = content.find(tblClose, offset) + tblClose.__len__()
		openTables = 0
		if innerTable < closing and innerTable > 0:
			openTables = 1
		while openTables > 0:
			closing = content.find(tblClose, closing) + tblClose.__len__()
			innerTable = content.find(tblOpen, innerTable + tblOpen.__len__())
			if innerTable > closing:
				openTables = 0
		try:
			table = parseString(content[offset:closing]).getElementsByTagName("table")[0]
		except Exception:
			print(content[offset:closing])
			table = parseString(content[offset:closing]).getElementsByTagName("table")[0]
		fn(table)
		content = content[closing:]

class area:
	def __init__(self):
		self.name
		self.lvl

class monster:
	def __init__(self):
		self.name = ""
		self.areaName = ""
		self.xp = {}
		self.res = {}
		self.lvl = -1
		self.stats = {}
	def setStat(self, name, value):
		self.stats[name] = value
		
def getNodeVal(node):
	return re.search("(\<[^>]*\>)?(.*)", re.search("(<?\<.*?\>)(.*?)\<\/", node.toxml().lower()).group(2).strip()).group(2).strip()

monsters = []
columns = {1: "area", 2: "level", 3: "name", 4: "normal xp", 5: "magic xp", 6: "rare/unique xp", 7: "fire res", 8: "cold res", 9: "light res", 10: "chaos res"}
def parseTable(t):
	skipColumnForRows = {}
	for row in t.getElementsByTagName("tr"):
		columnId = 0
		if row.getElementsByTagName("td").__len__() > 1:
			columnId += 1
			if row.getElementsByTagName("th").__len__() > 0:
				area = getNodeVal(row.getElementsByTagName("th")[0])
				
			newMonster = monster()
			newMonster.stats["area"] = area
			for cell in row.getElementsByTagName("td"):
				while columnId in skipColumnForRows and skipColumnForRows[columnId]["count"] > 0:
					skipColumnForRows[columnId]["count"] -= 1
					columnId += 1
				
				if cell.getAttributeNode("rowspan"):
					skipColumnForRows[columnId] = {"count": int(cell.getAttributeNode("rowspan").nodeValue) - 1}
				if cell.getAttributeNode("colspan"):
					columnId += int(cell.getAttributeNode("colspan").nodeValue)
				else:
					columnId += 1
				newMonster.stats[columns[columnId]] = getNodeVal(cell)
			monsters.append(newMonster)

f_escape = open("escape.txt", "rb")
escape = f_escape.read(1)
f_escape.close()
content = ""
byte = f.read(1)
prev = 0;
prevPrev = 0
while byte:
	if escape == byte:
		content += "-"
	else:
		content += byte.decode("utf-8", "ignore")
	byte = f.read(1)
f.close()
content = fixUnclosedTags(content.replace("&#8211;", "-").replace("\r", "").replace("\n", ""))

getTables(content, parseTable)
	
f = open('monsterStats.json', 'w')
lines = []
for monster in monsters:
	lines.append('{{{}}}'.format(', '.join(["'{}': '{}'".format(key, monster.stats[key]) for key in monster.stats])))

f.write('[{}]'.format(', '.join(lines)))
