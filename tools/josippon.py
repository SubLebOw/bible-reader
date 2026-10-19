import re
from lxml import etree
F='/workspace/bible-reader/data/tcp/A04666.xml'
def txt(e):
    e=etree.fromstring(etree.tostring(e))
    for n in e.iter('{*}note'):
        tail=n.tail; p=n.getparent(); n.clear(); n.tail=tail
    for g in e.iter('{*}gap'):
        g.text='•'
    s=''.join(e.itertext()).replace('ſ','s')
    s=re.sub(r'\s+',' ',s).strip()
    return s
def josippon():
    r=etree.parse(F).getroot()
    out=[]
    fr=[d for d in r.find('.//{*}front').findall('{*}div') if d.get('type')=='to_the_reader']
    if fr:
        ps=[txt(p) for p in fr[0].iter('{*}p')]
        out.append({'n':'Pref.','h':'The Epistle to the Reader (Morwyng)','v':[[str(i+1),p] for i,p in enumerate(ps) if p]})
    parts=r.find('.//{*}body').find('{*}div').findall('{*}div')
    for pi,p in enumerate(parts):
        head=p.find('{*}head'); hd=txt(head).lstrip('❧ ').strip() if head is not None else None
        cur={'n':str(len(out)),'h':hd,'v':[]}
        for x in p:
            ln=etree.QName(x).localname
            if ln=='p': cur['v'].append(txt(x))
            elif ln=='div':
                if cur['v']: out.append(cur)
                h=x.find('{*}head')
                cur={'n':'','h':txt(h).lstrip('❧ ') if h is not None else None,'v':[txt(y) for y in x.iter('{*}p')]}
        if cur['v']: out.append(cur)
    k=0
    for c in out:
        if c['n']!='Pref.': k+=1; c['n']=str(k)
        c['v']=[[str(i+1),v] for i,v in enumerate(c['v']) if (v if isinstance(v,str) else v[1])] if c['v'] and isinstance(c['v'][0],str) else c['v']
        if not c.get('h'): c.pop('h',None)
    return out
if __name__=='__main__':
    o=josippon(); print(len(o)); print([ (c['n'],c.get('h','')[:40],len(c['v'])) for c in o][:12]); print(o[1]['v'][0][1][:300])
