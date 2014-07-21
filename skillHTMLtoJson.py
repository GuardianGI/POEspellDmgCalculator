import os
import struct
import re
import sys
from xml.dom.minidom import parseString

dir = "E:\\programming\\Node\\POESkillTree\\skillsHTML\\"
skills = []

def printErr(*objs):
	print(*objs, file=sys.stderr)

def ignore_exception(IgnoreException=Exception, DefaultVal=None):
	""" Decorator for ignoring exception from a function
	e.g.   @ignore_exception(DivideByZero)
	e.g.2. ignore_exception(DivideByZero)(Divide)(2/0)
	"""
	def dec(function):
		def _dec(*args, **kwargs):
			try:
				return function(*args, **kwargs)
			except IgnoreException:
				return DefaultVal
		return _dec
	return dec

sint = ignore_exception(ValueError)(int)

def strToFloat(s):
	return float(re.search("([\d.]*)", s).group(1))
		
def getNodeVal(node):
	return re.search("(<?\<.*?\>)(.*?)\<\/", node.toxml().lower()).group(2).strip()

class dmg:	
	def __init__(self):
		self.lvlStages = []
		self.fire = list([0, 0] for i in range(0, 35))
		self.cold = list([0, 0] for i in range(0, 35))
		self.light = list([0, 0] for i in range(0, 35))
		self.phys = list([0, 0] for i in range(0, 35))
		self.chaos = list([0, 0] for i in range(0, 35))
		self.mana = list(1 for i in range(0, 35))
		self.APS = list(1 for i in range(0, 35))
		self.chains = list(1 for i in range(0, 35))
		self.hasAPS = False
		self.hasChain = False
		self.crit = 0
		self.effectiveness = 1
		self.castTime = 1
	
	def getStage(self, lvl):
		for stage, n in self.lvlStages:
			if n >= lvl:
				return stage
		return 0
	
	def setDmg(self, stage, typeStr, dmgStr):
		if re.match("\s?\d+?\s*-\s*\d+?\s?", dmgStr):
			dmgVal = list(int(strToFloat(n)) for n in dmgStr.split("-"))
		elif re.match("\s?\d+.*", dmgStr):
			try:
				val = float(dmgStr.replace(",", ""))
				dmgVal = [val, val]
			except Exception:
				dmgVal = [0, 0]
		else:
			dmgVal = [0, 0]
		if "fire" in typeStr:
			self.fire[stage] = dmgVal
		elif "cold" in typeStr or "ice" in typeStr:
			self.cold[stage] = dmgVal
		elif "light" in typeStr:
			self.light[stage] = dmgVal
		elif "chaos" in typeStr:
			self.chaos[stage] = dmgVal
		elif "phys" in typeStr or "damage" == typeStr:
			self.phys[stage] = dmgVal
		elif "mana" in typeStr:
			self.mana[stage] = dmgVal[0]
		elif "APS" in typeStr:
			self.APS[stage] = dmgVal[0]
			self.hasAPS = True
		elif 'chains' in typeStr:
			self.chains[stage] = dmgVal[0]
			self.hasChain = True
		#else:
			#print("rejected dmg type {}:{}".format(typeStr, dmgStr))
	def hatred(self, mult=0.36):
		key = 0
		for minMax in self.phys:
			for val in minMax:
				self.cold[key].append(val * mult)
			key += 1
	
	def addedFire(self, mult=0.39):
		key = 0
		for minMax in self.phys:
			for val in minMax:
				self.fire[key].append(val * mult)
			key += 1
		
	def getAvgDmg(self, lvl=19):
		stage = lvl#self.getStage(lvl)
		return (self.effectiveness * (1 + self.crit) / 2 / self.castTime *
			(sum(self.fire[stage]) +
			sum(self.cold[stage]) +
			sum(self.light[stage]) +
			sum(self.phys[stage]) +
			sum(self.chaos[stage])))
			
	def getDmgPerMana(self, lvl=19):
		return self.getAvgDmg(lvl) / self.mana[lvl]

def tryGetTitle(node):
	try:
		nodeTitle = re.search('title="([^"]*)"', node).group(1)
	except Exception:
		nodeTitle = node;
	return nodeTitle

def fixUnclosedTags(content):
	return re.sub('(\<img [^>]*?)/?\>', '\g<1> />', content).replace('<br>', '<br />')
	
def matchClosingTag(content, reStart, open, close):
		openStr = re.search(reStart, content)
		offset = content.find(openStr.group(0))
		innerTag = content.find(open, offset + open.__len__())
		closing = content.find(close, offset) + close.__len__()
		openTags = 0
		if innerTag < closing:
			openTags = 1
		while openTags > 0:
			closing = content.find(close, closing) + close.__len__()
			innerTag = content.find(open, innerTag + open.__len__())
			if innerTag > closing:
				openTags = 0
		return content[offset:closing]
f_escape = open("escape.txt", "rb")
escape = f_escape.read(1)
class skill:
	def __init__(self, fileName):
		print(fileName)
		self.name = fileName.split(".")[0]
		self.dmg = dmg()
		self.keywords = []
		self.qualityBonus = ""
		f_spell = open(dir + file, "rb")
		content = ""
		byte = f_spell.read(1)
		prev = 0;
		prevPrev = 0
		while byte:
			if escape == byte:
				content += "-"
			else:
				content += byte.decode("utf-8", "ignore")
			byte = f_spell.read(1)
		f_spell.close()
		content = fixUnclosedTags(content.replace("&#8211;", "-").replace("\r", "").replace("\n", ""))
		self.content = content.lower()
		self.getDmgTable(content)
		self.parseMetadata()
		
	def getDmgTable(self, content):
		tableStr = matchClosingTag(content, '\<table [^>]*?class="[^"]*?GemLevelTable', "<table", "</table>")
		try:
			table = parseString(tableStr).getElementsByTagName("table")[0]
		except Exception:
			print(tableStr)
			table = parseString(tableStr).getElementsByTagName("table")[0]
		if "GemLevelTable" in table.attributes["class"].value :
			self.parseDmg(table)

	def parseDmg(self, table):
		charLvlColumn = -1
		dmgColumnNames = {}
		rows = table.getElementsByTagName("tr")
		rowId = 0
		for row in rows:
			i = 0
			if 0 == rowId :
				for td in row.getElementsByTagName("th"):
					tdTxt = getNodeVal(td)
					if "required level" in tdTxt:
						charLvlColumn = i - 1
					elif "damage" in tdTxt:
						if not "absorption" in tdTxt:
							dmgColumnNames[i - 1] = tdTxt
					elif "cost" in tdTxt:
						dmgColumnNames[i - 1] = tdTxt
					elif 'aps' in tdTxt.lower():
						dmgColumnNames[i - 1] = 'APS'
					elif 'chains' in tdTxt.lower():
						dmgColumnNames[i - 1] = 'chains'
					i += 1
			else:
				for td in row.getElementsByTagName("td"):
					if i == charLvlColumn:
						val = getNodeVal(td)
						if not val:
							val = -1
						self.dmg.lvlStages.append(sint(val))
					elif i in dmgColumnNames.keys():
						self.dmg.setDmg(rowId, dmgColumnNames[i], getNodeVal(td))
					i += 1
			rowId += 1
	
	def parseMetadata(self):
		eff = "100%"
		crit = "0%"
		self.metaString = matchClosingTag(self.content, '\<table [^>]*?class="[^"]*?GemInfoboxContainer'.lower(), "<table", "</table>")
		try:
			eff = self.getMeta("effectiveness")
			self.dmg.effectiveness = self.percentToFloat(eff)
		except Exception: pass
		try:
			crit = self.getMeta("crit.*?chance")
			self.dmg.crit = self.percentToFloat(crit)
		except Exception: pass
		try:
			castTime = self.getMeta("cast.*?time")
			self.dmg.castTime = self.strToFloat(castTime)
		except Exception: pass
		try:
			qualityBonus = self.getMeta("per.*?quality")
			self.qualityBonus = self.getBonus(qualityBonus)
		except Exception: pass
		try:
			keywords = self.getMeta("keywords")
			self.keywords = [tryGetTitle(word) for word in keywords.split(',')]
		except Exception: pass
		
	def getBonus(self, s):
		return s
	
	def strToFloat(self, s):
		return float(re.search("([\d.]*)", s).group(1))
	
	def percentToFloat(self, s):
		return self.strToFloat(s) / 100
	
	def getMeta(self, name):
		regexStr = ("\<tr\>\s*\<td\>.*?" +
				name.lower() +
				".*?\<\/td\>\s*\<td\>\s*(.*?)\<\/td\>")
		return re.search(regexStr, self.metaString).group(1).strip()

for file in os.listdir(dir):
	newSkill = skill(file)
	skills.append(newSkill)
s = "Name\tavgPhys\tavgFire\tavgCold\tavglight\teff\tcrit\taddedFire\taddedCold\taddedLight\tshocked multi\tburnDmg\tMana\ttotal dmg\n"
row = 2
for skill in skills:
	s += "{}\n".format(
		"\t".join(str(x) for x in [
			skill.name, #D
			"{}".format(sum(skill.dmg.phys[19]) / 2, row),#E
			"={}+K{}".format(sum(skill.dmg.fire[19]) / 2, row),#F
			"={}+L{}".format(sum(skill.dmg.cold[19]) / 2, row),#G
			"={}+M{}".format(sum(skill.dmg.light[19]) / 2, row),#H
			skill.dmg.effectiveness,#I
			skill.dmg.crit,#J
			"=E{} * $B$2".format(row),#K
			"=E{} * $B$1".format(row),#L
			"=E{} * $B$3".format(row),#M
			"=(1 + (J{0} * (H{0} > 0)))".format(row),#N shock multi
			"=0.8 * J{0} * F{0}".format(row),#O burn dmg
			skill.dmg.mana[19],#P
			"=(E{0}+F{0}+G{0}+H{0}) * I{0} * (1 + J{0}) * N{0}".format(row),#Q
			"=(Q{0} + O{0}) * N{0}".format(row)#R
		]))
	row += 1

f = open("skillAvgDmgTest.txt", "w")
f.write(s)
f.close()

def printMinMaxDmg(dmg):
	return "{{'min': {}, 'max': {}}}".format(dmg[0], dmg[1])

skillStrs = []
for skill in skills:
	skillStr = "'{}': {{'crit': {}, 'eff': {}, 'castTime': {}, 'qualityBonus': '{}', 'keywords': [{}], 'hasAPS': {}, 'chains': {}, 'dmg': [".format(
		skill.name,
		skill.dmg.crit,
		skill.dmg.effectiveness,
		skill.dmg.castTime,
		skill.qualityBonus,
		', '.join(["'{}'".format(word) for word in skill.keywords]),
		'true' if skill.dmg.hasAPS else 'false',
		'true' if skill.dmg.hasChain else 'false')
	i = 1
	dmgStrs = []
	for lvl in skill.dmg.lvlStages:
		dmgStr = "{"
		dmgStr += ("'lvl': '{}', 'dps': {}, 'phys': {}, 'fire': {}, 'cold': {}, 'light': {}, 'chaos': {}, 'mana': {}" +
				(", 'APS': {}" if skill.dmg.hasAPS else "") + 
				(", 'chain': {}" if skill.dmg.hasChain else "")).format(
					lvl, skill.dmg.getAvgDmg(i),
					printMinMaxDmg(skill.dmg.phys[i]),
					printMinMaxDmg(skill.dmg.fire[i]),
					printMinMaxDmg(skill.dmg.cold[i]),
					printMinMaxDmg(skill.dmg.light[i]),
					printMinMaxDmg(skill.dmg.chaos[i]),
					skill.dmg.mana[i],
					skill.dmg.APS[i] if skill.dmg.hasAPS else skill.dmg.chains[i],
					skill.dmg.chains[i])
			
		dmgStr += "}";
		dmgStrs.append(dmgStr)
		i += 1
	skillStr += ', '.join(dmgStrs)
	skillStr += "]}"
	skillStrs.append(skillStr)
	
f = open(dir + "..\\skillDmgGraph.json", "w")
f.write('{' + (', '.join(skillStrs)) + '}')
f.close()
	