import re, sys
sys.path.insert(0,'/workspace/bible-reader/build')
import ocr_clean as O
IA=O.D+'/ia/'
def markers(t):
    t=re.sub(r"[®°%™©¢§†‡*>]+\d{0,2}",'',t)
    t=re.sub(r"(?<=[,.;])’(?=\s+[a-z])",'',t)
    t=re.sub(r"(?<=[A-Za-z\].,;:)’”])[?!]{1,2}\d{0,2}(?=\s+[a-z\[(])",'',t)   # marker ?/! before lowercase continuation
    t=re.sub(r"(?<=[a-z\].,;:’”)])\d{1,2}(?=[\s.,;:’”)]|$)",'',t)             # digits glued to words
    t=re.sub(r"(?<=[a-z,;])\s\d{1,2}\s(?=[a-z\[(])",' ',t)                     # stray marker numbers between words
    t=re.sub(r"\s+([,;:.])",r'\1',t)
    return re.sub(r'\s{2,}',' ',t).strip()
FOOT=re.compile(r"^[\d?®°%!™*'‘§&$]{1,3}\s?(?:Lit\b|Or\b|Cf\b|C\.|S\.|M\.|B\.|L\.|A\.|St\.|Codex|Copto|So\b|[IT]e[.,]|Ze\b|Lagarde|Rahmani|Perhaps|i\.\s?e|[A-Z][a-z]{1,5}\.\s?[ivxlc\d]|[A-Z]\w*\s[ivxlc]+\.|\d|\(|“|\"|Syr|Gr\.|Eth|Arab|Sah|Heb|See|Thus|This|The\s\w+\s(?:MS|reading|word|Syriac|Arabic|Ethiopic))")
def pages(lines,hdr):
    pg=[[]]
    for l in lines:
        if hdr(l.strip()): pg.append([]); continue
        pg[-1].append(l.rstrip())
    return pg
def testdom():
    L=open(IA+'cu31924029296170.txt',encoding='utf-8',errors='replace').read().split('\n')
    s=next(i for i,l in enumerate(L) if l.strip()=='THE FIRST BOOK')
    e=next(i for i,l in enumerate(L) if i>s and l.strip().startswith('The Second Book of Clement is ended'))
    def hdr(x):
        if not x or len(x)>70: return False
        if re.search(r'TESTAMENT OF OUR LORD',x) and re.search(r'\d',x): return True
        if re.search(r'[\[\]{}]',x) and sum(c.isupper() for c in x)>=len(re.sub(r'[^A-Za-z]','',x))*0.7 and re.search(r'\d',x): return True
        return False
    keep=[]
    for pg in pages(L[s+1:e+1],hdr):
        body=[x for x in pg]; cut=len(body); seen=False
        for i,x in enumerate(body):
            st=x.strip()
            if st and not FOOT.match(st): seen=True
            if seen and FOOT.match(st) and not re.match(r'^C[HhUu]\w{4,6}\s',st): cut=i; break
        keep+=[x for x in body[:cut] if not re.fullmatch(r'\s*[\dIl]{1,3}\s*',x)]
    chs=[]; book='I'; exp=1; cur={'n':'I.Pref','lines':[],'h':'Title and Preface'}; chs.append(cur)
    for x in keep:
        st=x.strip()
        if st.startswith('THE SECOND BOOK OF CLEMENT'): book='II'; exp=1; cur={'n':'II.Pref','lines':[],'h':'Title of the Second Book'}; chs.append(cur); continue
        m=re.match(r'^[(\[{]*C[HhUu][AaPp]?\w{3,6}\s+(\d{1,4})\S*\s*\S*$',st)
        if m:
            tok=m.group(1); n=None
            for cand in (exp,exp+1,exp+2):
                if tok.startswith(str(cand)): n=cand; break
            if n is None: n=exp
            if n>exp: print('note: chapter numbers skipped',book,exp,'->',n)
            cur={'n':f'{book}.{n}','lines':[]}; chs.append(cur); exp=n+1; continue
        cur['lines'].append(st)
    out=[]
    for c in chs:
        ps=[O.fix_words(O.illegible(markers(p))) for p in O.join_lines(c['lines'],blank_breaks=True)]
        ps=[re.sub(r'^Ir came','It came',p) for p in ps if p]
        if not ps: continue
        o={'n':c['n'],'v':[]}
        if c.get('h'): o['h']=c['h']
        # an all-caps short first paragraph is the chapter title (e.g. "OF LAYMEN THUS:")
        if ps and len(ps[0])<120 and ps[0].upper()==ps[0] and re.search('[A-Z]{3}',ps[0]): o['h']=ps[0].rstrip(':').title() if not c.get('h') else c['h']+' — '+ps[0].title(); ps=ps[1:]
        o['v']=[[str(i+1),p] for i,p in enumerate(ps)]
        if o['v']: out.append(o)
    def fm(t):
        t=re.sub(r'(\w)‘(?=\s)',r'\1',t)
        t=re.sub(r'(\w)\}\??(?=\s)',r'\1',t)
        t=re.sub(r'([A-Z]{2})- ([A-Z])',r'\1\2',t)
        t=re.sub(r'([A-Z]{3})[?’](?=\s)',r'\1',t)
        o=[];op=0
        for i,ch in enumerate(t):
            if ch=='‘': op+=1
            if ch=='’' and i>0 and t[i-1].isalpha() and (i+1==len(t) or not t[i+1].isalpha()):
                if op>0: op-=1
                else: continue
            o.append(ch)
        return ''.join(o)
    for c in out:
        c['v']=[[a,fm(b)] for a,b in c['v']]
        if c.get('h'): c['h']=fm(c['h'])
    return out
def hogan():
    L=open(IA+'latininfancygosp0000unse.txt',encoding='utf-8',errors='replace').read().split('\n')
    s=next(i for i,l in enumerate(L) if l.strip().startswith('THE BEGINNING OF THE STORIES'))
    e=next(i for i,l in enumerate(L) if i>s and l.strip()=='APPENDIX')
    def hdr(x): return bool(x) and len(x)<45 and re.fullmatch(r'[\dIlO ]*\s*THE [A-Z ]{3,30}?\s*[\dIlO ]*',x) is not None and not x.startswith('THE BEGINNING')
    keep=[]
    for pg in pages(L[s+2:e],hdr):
        nb=[i for i,x in enumerate(pg) if x.strip()]
        cut=len(pg)
        for i in nb[-3:]:
            if re.match(r'^\d\s+\S',pg[i].strip()) and len(pg[i].strip())<90 and re.search(r'\b(lit|i\.\s?e|gj|cf|or)\b\.?',pg[i].strip(),re.I): cut=i; break
        keep+=[x for x in pg[:cut] if not re.fullmatch(r'\s*(?:[\dIl]{1,3}(?:-\d)?|j\.L\.G\.\s*\d*)\s*',x.strip())]
    text=re.sub(r'\s+',' ',' '.join(x.strip() for x in keep)).strip()
    text=re.sub(r'(\w)- (\w)',r'\1\2',text)
    parts=re.split(r'(?:^|\s)(\d{2,3})\.\s',text)
    secs=[]; pre=parts[0]
    exp=58
    buf=[]
    i=1
    while i<len(parts):
        n=int(parts[i]); body=parts[i+1]
        if n==exp: secs.append([str(n),body]); exp+=1
        elif secs: secs[-1][1]+=' '+parts[i]+'. '+body
        i+=2
    secs=[[n,O.fix_words(O.illegible(markers(b)))] for n,b in secs]
    secs=[[a,b.replace('e£ relzgua','et reliqua')] for a,b in secs]
    return [{'n':'1','h':'From the Leabhar Breac “Stories of the Gospels” (Hogan §§ 58–95), the Irish parallel to the Latin Infancy (Arundel/Hereford) source','v':secs}]
if __name__=='__main__':
    O.VOC=O.build_vocab()
    t=testdom(); print(len(t),[c['n'] for c in t]); 
    for c in [t[0],t[3],t[-1]]: print(c['n'],c.get('h'),'|',c['v'][0][1][:400]); print()
    h=hogan(); print([v[0] for v in h[0]['v']]); print(h[0]['v'][0][1][:300]); print(h[0]['v'][4][1][:400])
