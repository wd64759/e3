from random import randint

f = open('a_SPEED.csv')
of = open('newbook.csv','w')

for line in f:
  of.write(line[:-1]+','+str(randint(10,100))+'\n')

f.close()
of.close()

