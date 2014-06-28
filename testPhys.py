from math import log

armour = 500
def dmg(raw):
	return (raw * raw) / (raw + armour)
	
def avgDmg(min, max, arm):
	return (((((arm * arm) * (-log(arm + min))) + (arm * arm) * log(arm + max)) - ((max - min) * arm)) + (((max * max) - (min * min)) / 2)) / (max - min)
	
def printRange(min, max):
	avg = (min + max) / 2
	l = [dmg(x) for x in range (min, max + 1)]
	print('brute force:\t\t{}'.format(sum(l) / len(l)))
	print('defined intergral:\t\t{}'.format(avgDmg(min, max, armour)))

print('50, 1000')
printRange(50, 1000)
print('1, 100')
printRange(1, 100)
