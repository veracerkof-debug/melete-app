# Склейка снимков в одну строку для просмотра: python3 row.py итог.png a.png b.png …
from PIL import Image
import sys
out=sys.argv[1]; fs=sys.argv[2:]
ims=[Image.open(f).convert('RGB') for f in fs]
ims=[i.resize((i.width*2//5,i.height*2//5)) for i in ims]
w=sum(i.width for i in ims)+4*len(ims); h=max(i.height for i in ims)
o=Image.new('RGB',(w,h),'#888'); x=0
for i in ims: o.paste(i,(x,0)); x+=i.width+4
o.save(out)
