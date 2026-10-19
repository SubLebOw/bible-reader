import re, sys
sys.path.insert(0,'/workspace/bible-reader/build')
import ocr_clean as O
ROM={'I':1,'V':5,'X':10,'L':50,'C':100}
def hnum(tok):
    t=tok.strip().rstrip('.,*')
    M={'I':'1','ID':'10','II':'11','6a':'60','6i':'61'}
    if t in M: return int(M[t])
    t=t.replace(' ','').replace('l','1').replace('I','1')
    return int(t) if t.isdigit() else None
def horner():
    L=open(O.D+'/ia/horner.txt',encoding='utf-8',errors='replace').read().split('\n')
    s=next(i for i,l in enumerate(L) if 'TRANSLATION  OF  THE  ETHIOPIC  TEXT' in l)
    e=next(i for i,l in enumerate(L) if i>s and 'TRANSLATION  OF  THE  ARABIC  TEXT' in l)
    hdr=re.compile(r'^\s*([\dIlSO]{1,3}\s?[\dIlSO]{0,2}\s+)?STAT\w{2,4}\s+OF\s+TH\w\s+APOST\w*\s*$|OF\s+THE\s+ETHIOPIC\s+TEXT\b[\s\dIlSOo/$*.]*$',re.I)
    chapters=[{'n':'Intro','lines':[]}]; exp=1
    pages=[[]]
    for l in L[s+1:e]:
        if hdr.search(l): pages.append([]); continue
        pages[-1].append(l.strip())
    keep=[]
    for pg in pages:
        nb=[i for i,x in enumerate(pg) if x]
        cut=len(pg)
        for i in nb[-10:]:
            if re.match(r"^[\^*]\s*(?:[A-Z'‘\"(]|Lit|Reading|Or\b)",pg[i]): cut=i; break
        keep+=pg[:cut]
    for st in keep:
        if re.fullmatch(r'[\d\s*^.]{1,6}',st): st=''
        st=re.sub(r'^(?:\d{1,2}|lo|io|2\$)\s+(?=[A-Za-z(])','',st)
        st=re.sub(r'^(?:as|IS|so|3o|ao)\s+(?=[A-Z])','',st); st=re.sub(r'^(?:S|ao|lo)\s+(?=[a-z])','',st)
        st=re.sub(r'\s+(?:\d{1,2}|lo|io|2\$|as|«>|\^)\.?\s*$','',st)
        m=re.match(r'^Statute\s+(I|ID|II|6a|6i|\d\s?\d?\*?)[.,*]?\s+(.*)$',st)
        if m:
            n=hnum(m.group(1))
            if n is None or abs(n-exp)>3: n=exp
            lab=str(n)
            if any(c['n']==lab for c in chapters): lab+=' (bis)'
            chapters.append({'n':lab,'lines':[]}); exp=n+1; st=m.group(2)
        st=re.sub(r"(?<=[A-Za-z,;:.])\s+(?:[«'3]?\d\s?\d?[°»$]?|\d\$)[.:]?\s+(?=[A-Za-z(])",' ',st)
        st=st.replace('K^fas','Kefas').replace('P^tros','Petros').replace('Tom§s','Tomas')
        st=re.sub(r'\^|\*>?|«[o5]?|»|(?<=\s)iS(?=\s)',' ',st).replace('comas manded','commanded').replace('geneia tion','generation')
        chapters[-1]['lines'].append(st)
    out=[]
    for c in chapters:
        ps=[O.fix_words(O.illegible(p)) for p in O.join_lines(c['lines'])]
        ps=[re.sub(r'\s+([,;:.])',r'\1',re.sub(r"(?<=[A-Za-z,;:.])\s+(?:[«'3$]?\d\s?\d?[°»$]?|[«»$])[.:]?\s+(?=[A-Za-z(])",' ',p)) for p in ps]
        if not ps: continue
        o={'n':c['n'],'v':[[str(i+1),p] for i,p in enumerate(ps)]}
        m=re.match(r'^(Concerning\b[^.]*\.)',ps[0])
        if m and len(m.group(1))<160: o['h']=m.group(1)
        out.append(o)
    return out
if __name__=='__main__':
    O.VOC=O.build_vocab()
    ch=horner()
    print(len(ch),[c['n'] for c in ch])
    for c in ch[:3]+ch[40:42]+ch[-1:]: print(c['n'],c.get('h'),'|',c['v'][0][1][:300]); print()
    print(O.FIXLOG.most_common(60))
