import re, sys
sys.path.insert(0,'/workspace/bible-reader/build')
import ocr_clean as O
def clean_markers(t):
    t=re.sub(r"[\[(f]?[ivxlc]+\.,?\s*\d+[.\-]?[\])]|[\[(]AC\.[^\])]{0,12}[\])]",' ',t)   # Harden's Didascalia/AC reference brackets
    t=re.sub(r"(?<=\S)[?\d]{0,2}[™>%][\d]{0,2}|\s[™>%]\d{0,2}(?=\s)",' ',t)
    t=re.sub(r"[*'\"°·¹²³⁴⁵⁶⁷⁸⁹⁰®©¢{}†‡§]",'',t)
    t=re.sub(r"[?!](?=[\d?!]|\s+[a-z(])",'',t)          # marker ? / ! before digits or lowercase continuation
    t=re.sub(r"(?<=[\w.,;:’”)])\d{1,2}(?=[\s.,;:’”]|$)",'',t)  # digits glued to words
    t=re.sub(r"(?<=\s)\d{1,2}[?!]?(?=\s)",' ',t)            # standalone 1-2 digit tokens
    t=re.sub(r"\s+([,;:.])",r'\1',t)
    return re.sub(r'\s{2,}',' ',t).strip()
def harden():
    L=open(O.D+'/ia/harden.txt',encoding='utf-8',errors='replace').read().split('\n')
    s=next(i for i,l in enumerate(L) if l.strip()=='CHAPTER I.')
    e=next(i for i,l in enumerate(L) if l.strip()=='ADDITIONAL NOTES')
    hdr=re.compile(r'^\s*\d*\s*THE\s+ETHIOPIC\s+DIDASCALIA\s*\d*\s*$')
    pages=[[]]
    for l in L[s:e]:
        if hdr.match(l): pages.append([]); continue
        pages[-1].append(l.rstrip())
    keep=[]
    for pg in pages:
        while pg and not pg[0].strip(): pg=pg[1:]
        APP=re.compile(r"\b(adds|omits|om\.|Lit\.|See|Cf\.|reads?|translates|Platt|Funk|Dillmann|Add\.\s*notes)\b|(^|\s)[APDS]{1,2}[co]?[\s:]|\b\d+,\s?\d+|^[\W\d]{1,4}\s*[APD]\s")
        blocks=[[]]; blank=0
        for x in pg:
            if not x.strip():
                blank+=1
                if blank>=2 and blocks[-1]: blocks.append([])
                elif blocks[-1]: blocks[-1].append('')
                continue
            blank=0; blocks[-1].append(x)
        dropped=False
        for bl in blocks:
            ne=[x for x in bl if x.strip()]
            if not ne: continue
            if any(re.match(r'^\s*CHAPTER\s',x) for x in ne): keep+=bl+['']; continue
            STRONG=re.compile(r"\b[APDS]{1,2}[co]?\s*(adds|omits|reads?|has|ads)\b|\bCf\.\s|Add\.\s*notes|\bPlatt\b|\b[A-Z][a-z]{1,3}\s\d+,\s?\d+|\bomits?:|\badds?:|\bLit\.")
            nb=[x for x in bl if not STRONG.search(x)]
            if len([x for x in nb if x.strip()])<len(ne): dropped=dropped or len(ne)-len([x for x in nb if x.strip()])>=len(ne)//2
            bl=nb; ne=[x for x in bl if x.strip()]
            if not ne: continue
            hits=sum(bool(APP.search(x)) for x in ne)
            if dropped or hits/len(ne)>=0.3: dropped=True; continue
            keep+=bl+['']
        if keep and keep[-1]=='': keep.pop()
    chs=[]; 
    for l in keep:
        st=l.strip()
        if re.match(r'^CHAPTER\s+[IVXLCxivl]+\.?$',st):
            chs.append({'n':str(len(chs)+1),'lines':[],'h':None}); continue
        if not chs: continue
        chs[-1]['lines'].append(st)
    out=[]
    for c in chs:
        paras=O.join_lines(c['lines'])
        ps=[O.fix_words(O.illegible(clean_markers(p))) for p in paras]
        BAD=re.compile(r"\bP (adds|omits|the|God|Christ|all|ee|those)\b|\bAC\b|\bEth\.|\bA or P\b|\breading\b.{0,30}\bP\b")
        ps=[re.sub(r'(\[illegible in scan\]\s*){2,}','[illegible in scan] ',' '.join('[illegible in scan]' if BAD.search(x) else x for x in re.split(r'(?<=[.;?!”])\s+',p))) for p in ps]
        ps=[re.sub(r'^(Bur|Ler)\b',lambda m:{'Bur':'But','Ler':'Let'}[m.group(1)],p) for p in ps if p]
        o={'n':c['n'],'v':[[str(i+1),p] for i,p in enumerate(ps)]}
        # Harden gives a short title paragraph after the chapter number
        if ps and len(ps[0])<200 and len(ps)>1: o['h']=ps[0].rstrip('.'); o['v']=[[str(i+1),p] for i,p in enumerate(ps[1:])]
        out.append(o)
    return out
if __name__=='__main__':
    O.VOC=O.build_vocab(); ch=harden()
    print(len(ch))
    for c in ch[:2]+ch[-1:]: print(c['n'],c.get('h'),'|',c['v'][0][1][:700]); print()
    print(O.FIXLOG.most_common(80))
