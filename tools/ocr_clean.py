import re, json, glob, collections
D='/workspace/bible-reader/data'
# vocabulary from clean PD texts we already have (KJV, WEB, ANF8/9, Charles)
def build_vocab():
    c=collections.Counter()
    for f in glob.glob('/workspace/bible-reader/site/data/*/*.json'):
        if 'catalog' in f: continue
        d=json.load(open(f))
        for ch in d['c']:
            for v in ch['v']: c.update(w.lower() for w in re.findall(r"[A-Za-z]+",v[1]))
    for f in [D+'/ccel/anf08.txt',D+'/ccel/npnf201.txt']:
        c.update(w.lower() for w in re.findall(r"[A-Za-z]+",open(f,encoding='utf-8',errors='replace').read()))
    return c
VOC=None
SKIP={'tion','ment','ness','ance','ence','ing'}
CONF=[('li','h'),('li','n'),('c','e'),('rn','m'),('1','l'),('fm','fin'),('tl','th'),('cl','d'),('ii','u'),('vv','w')]
CONF_OLD=[('c','e'),('e','c'),('rn','m'),('m','rn'),('h','li'),('li','h'),('fm','fin'),('ii','u'),('u','ii'),('tl','th'),('l','t'),('t','l'),('i','l'),('l','i'),('vv','w'),('1','l'),('0','o'),('5','s'),('b','h'),('h','b'),('n','u'),('u','n'),('a','o'),('o','a'),('cl','d'),('d','cl'),('j','i'),('f','t'),('t','f'),('r','t')]
FIXLOG=collections.Counter()
def fix_word(w):
    lw=w.lower()
    if not re.fullmatch(r"[a-z015]+",w) or len(lw)<4 or VOC[lw]>0 or lw in SKIP: return w
    cands=set()
    for a,b in CONF:
        i=lw.find(a)
        while i>=0:
            cand=lw[:i]+b+lw[i+len(a):]
            if VOC[cand]>=20: cands.add(cand)
            i=lw.find(a,i+1)
    if len(cands)==1:
        c=cands.pop(); FIXLOG[(w,c)]+=1
        return c.capitalize() if w[0].isupper() else c
    return w
def fix_words(t):
    return re.sub(r"[A-Za-z015]+",lambda m:fix_word(m.group(0)),t)
def illegible(t):
    out=[]
    for seg in re.split(r'(?<=[.;:?!])\s+',t):
        letters=sum(ch.isalpha() for ch in seg)
        if len(seg)>12 and letters/len(seg)<0.6: out.append('[illegible in scan]')
        else: out.append(seg)
    s=' '.join(out); return re.sub(r'(\[illegible in scan\]\s*){2,}','[illegible in scan] ',s)
def join_lines(lines, blank_breaks=False):
    if not blank_breaks:
        nl=[]; 
        for l in lines:
            l=l.strip()
            if not l: continue
            nl.append(l)
            if len(l)<38 and re.search(r'[.:?!)\'’”]$',l): nl.append('')
        lines=nl
    txt=''
    for l in lines:
        l=l.strip()
        if not l: txt+='\n\n'; continue
        if txt.endswith('-') and re.match(r'[a-z]',l): txt=txt[:-1]+l
        elif txt and not txt.endswith('\n'): txt+=' '+l
        else: txt+=l
    return [re.sub(r'\s+',' ',p).strip() for p in txt.split('\n\n') if p.strip()]
