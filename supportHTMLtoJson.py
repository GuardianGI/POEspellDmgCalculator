import os
import struct
import re
import sys
from xml.dom.minidom import parseString

dir = "../spellSupportsHTML/"
f_escape = open("escape.txt", "rb")
escape = f_escape.read(1)
f_escape.close()

def ignore_exception(IgnoreException=Exception,DefaultVal=None):
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

def getNodeVal(node):
	return re.search("(<?\<.*?\>)(.*?)\<\/", node.toxml().lower()).group(2).strip()

class support:
	def __init__(self, fileName):
		print(fileName)
		self.name = fileName.split(".")[0]
		self.lvlStages = []
		self.qualityBonus = ""
		self.keywords = ""
		self.manaMultiplier = 1
		self.values = []
		
		f = open(dir + file, "rb")
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
		
		content = content.replace("&#8211;", "-").replace("\r", "").replace("\n", "")
		self.content = content.lower()
		
		self.getStatTable(content)
		
	def getStatTable(self, content):
		tableString = re.search('\<table [^>]*?class="[^"]*?GemLevelTable', content)
		offset = content.find(tableString.group(0))
		tblClose = "</table>"
		tblOpen = "<table"
		innerTable = content.find(tblOpen, offset + tblOpen.__len__())
		closing = content.find(tblClose, offset) + tblClose.__len__()
		openTables = 0
		if innerTable < closing:
			openTables = 1
		while openTables > 0:
			closing = content.find(tblClose, closing) + tblClose.__len__()
			innerTable = content.find(tblOpen, innerTable + tblOpen.__len__())
			if innerTable > closing:
				openTables = 0
		table = parseString(content[offset:closing]).getElementsByTagName("table")[0]
		if "GemLevelTable" in table.attributes["class"].value :
			self.parseStatTable(table)
		self.parseMetaData()
	
	def parseMetaData(self):
		try:
			qualityBonus = self.getMeta("per.*?quality")
			self.qualityBonus = qualityBonus
		except Exception: pass
		try:
			keywords = self.getMeta("keywords")
			self.keywords = keywords
		except Exception: pass
		try:
			manaMultiplier = self.getMeta("mana.*?multiplier")
			self.manaMultiplier = self.percentToFloat(manaMultiplier)
		except Exception: pass

	def parseStatTable(self, table):
		charLvlColumn = -1
		ColumnNames = {}
		values = {}
		rows = table.getElementsByTagName("tr")
		rowId = 0
		for row in rows:
			i = 0
			lvl = -1
			if 0 == rowId :
				for td in row.getElementsByTagName("th"):
					if i > 0 :
						tdTxt = getNodeVal(td)
						if "required level" in tdTxt:
							charLvlColumn = i - 1
						elif "exp" in tdTxt.lower():
							pass#ignored.
						else:
							if not 'icon_small.png' in tdTxt:
								ColumnNames[i - 1] = tdTxt
					i += 1
			elif rowId < 21:#supports like iron will have an extra row that we ignore.
				for td in row.getElementsByTagName("td"):
					if i == charLvlColumn:
						val = getNodeVal(td)
						if not val:
							val = -1
						lvl = sint(val)
						self.lvlStages.append(lvl)
						values[lvl] = {}
					elif i in ColumnNames.keys():
						values[lvl][ColumnNames[i]] = getNodeVal(td)
					i += 1
			rowId += 1
		self.values = values

	def strToFloat(self, s):
		return float(re.search("([\d.]*)", s).group(1))
	
	def percentToFloat(self, s):
		return self.strToFloat(s) / 100
	
	def getMeta(self, name):
		regexStr = ("\<tr\>\s*\<td\>.*?" +
				name.lower() +
				".*?\<\/td\>\s*\<td\>\s*(.*?)\<\/td\>")
		return re.search(regexStr, self.content).group(1).strip()


skills = []
for file in os.listdir(dir):
	newSkill = support(file)
	skills.append(newSkill)

s = "{"
for skill in skills:
	s += "'{}': {{'manaMultiplier': {}, 'keywords': '{}', 'qualityBonus': '{}', 'stages': [".format(skill.name, skill.manaMultiplier, skill.keywords, skill.qualityBonus)
	
	for lvl in skill.lvlStages:
		s += "{}, ".format(lvl)
	s += "], 'stageStats': ["
	i = 1
	for lvl in skill.lvlStages:
		s += "{"
		for collName in skill.values[lvl].keys():
			s += "'{}': '{}', ".format(collName, skill.values[lvl][collName])
		s += "}, ";
		i += 1
	s += "]}, "
	
f = open("supports.json", "w")
f.write(s + "}")
f.close()