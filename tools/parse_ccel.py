import re, json
ROM={'I':1,'V':5,'X':10,'L':50,'C':100}
def rom(s):
    t=0
    for i,c in enumerate(s):
        v=ROM[c]; t+= -v if i+1<len(s) and ROM[s[i+1]]>v else v
    return t
def lines(f): return open(f,encoding='utf-8',errors='replace').read().split('\n')
def extract(f, start, end, skip_heads=()):
    L=lines(f)[start-1:end-1]
    paras=[];cur=[]
    for l in L:
        s=l.strip()
        if re.match(r'^_{10,}$',s) or re.match(r'^-{6,}$',s):
            if cur: paras.append(' '.join(cur)); cur=[]
            continue
        if not s:
            if cur: paras.append(' '.join(cur)); cur=[]
            continue
        cur.append(s)
    if cur: paras.append(' '.join(cur))
    paras=[p for p in paras if not re.match(r'^\[\d+\]',p)]
    chapters=[{'n':'Intro','v':[]}]; ch=0
    for p in paras:
        p=re.sub(r'\s*\[\d+\]','',p); p=re.sub(r'\s+',' ',p).strip()
        if not p or p in skip_heads: continue
        m=re.match(r'^Chapter ([IVXLC]+|\d+)\.?(?:\s*\(\d+\)\.?)?(?:\s*--\s*(.*))?$',p)
        if m:
            g=m.group(1); n=int(g) if g.isdigit() else rom(g)
            if n==ch+1:
                ch+=1; c={'n':str(ch),'v':[]}
                if m.group(2): c['h']=m.group(2)
                chapters.append(c); continue
        m=re.match(r'^(\d+)(?:\s*\(\d+\))?\.?\s+(.*)$',p)
        if m and int(m.group(1))==ch+1 and len(m.group(2))>20:
            ch+=1; chapters.append({'n':str(ch),'v':[m.group(2)]}); continue
        chapters[-1]['v'].append(p)
    chapters[0]['v']=[p for p in chapters[0]['v'] if not (len(p)<90 and re.match(r'^(The |Part |First |Second |Latin |Greek |Here [Bb]egin)',p))]
    if not chapters[0]['v']: chapters=chapters[1:]
    return chapters
