dir = "E:\\programming\\Node\\POESkillTree\\"
f_skillJson = open(dir + 'skillDmgGraph.json', 'r')
f_supportJson = open(dir + 'supports.json', 'r')
f_monsterJson = open(dir + 'monsterStats.json', 'r')

skills = f_skillJson.read()
f_skillJson.close()
supports = f_supportJson.read()
f_supportJson.close()
monsters = f_monsterJson.read()
f_monsterJson.close()

armourVar = 'armourValues = [72, 84, 84, 108, 120, 120, 144, 156, 156, 180, 192, 216, 228, 252, 264, 288, 324, 336, 360, 396, 408, 444, 480, 504, 540, 576, 612, 648, 696, 732, 792, 840, 876, 936, 1008, 1056, 1116, 1188, 1260, 1332, 1404, 1488, 1584, 1668, 1764, 1848, 1956, 2064, 2196, 2304, 2424, 2568, 2700, 2856, 3000, 3168, 3324, 3504, 3708, 3888, 4104, 4320, 4536, 4764, 5016, 5268, 5544, 5832, 6120, 6444, 6768, 7104, 7464, 7824, 8220, 8640, 9072]'

f_jsonDataAsJs = open(dir + 'POEspellDmgCalculator\\html\\rawJsonData.js', 'w')

f_jsonDataAsJs.write(',\n    '.join([
	'var rawSkills = {}'.format(skills),
	'rawSupports = {}'.format(supports),
	armourVar,
	'monsterStats = {}'.format(monsters)]) + ';\n')
	