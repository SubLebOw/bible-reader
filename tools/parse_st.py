import re, html, json, glob, os
ROM={'I':1,'V':5,'X':10,'L':50,'C':100}
def rom(s):
    t=0
    for i,c in enumerate(s):
        v=ROM[c]; t+= -v if i+1<len(s) and ROM[s[i+1]]>v else v
    return t
def body(path):
    s=open(path,encoding='utf-8',errors='replace').read()
    b=s[s.find('<BODY'):]
    k=b.find('<HR>',b.find('</CENTER>')); b=b[k+4:]
    for end in ['<H3 ALIGN="CENTER">Footnotes','<div class="filenav">','<script','<nav']:
        j=b.find(end)
        if j>0: b=b[:j]
    b=re.sub(r'(?is)<TABLE.*?</TABLE>','',b)
    b=re.sub(r'(?is)<A HREF="#fn_\d+">.*?</A>','',b)
    b=re.sub(r'(?is)<A NAME="page_\d+">.*?</A>','',b)
    return b
def clean(t):
    t=re.sub(r'(?i)<br\s*/?>',' / ' if False else ' ',t)
    t=re.sub(r'<[^>]+>','',t); t=html.unescape(t).replace('\xa0',' ')
    return re.sub(r'\s+',' ',t).strip()
def parse(paras, chap_mode):
    """paras: list of (kind,text) kind in 'ch','p'. returns {ch:{v:text}}"""
    out={}; ch=0; v=0; cur=None
    def add(txt):
        nonlocal cur
        if cur is None or not txt: return
        out[ch][v]=(out[ch][v]+' '+txt).strip()
    for kind,txt in paras:
        if kind=='ch':
            if txt==ch and ch in out and txt+1 not in out: txt=ch+1
            ch=txt
            if ch in out: v=max(out[ch]) if out[ch] else 0; cur=v or None; continue
            out[ch]={}; v=0; cur=None; continue
        if chap_mode=='roman':
            m=re.match(r'^([IVXLC1]+)\.\s+',txt)
            if m and rom(m.group(1).replace('1','I'))==ch+1:
                ch+=1; out[ch]={1:''}; v=1; cur=1; txt=txt[m.end():]
        if ch==0: continue
        if v==0 and not re.match(r'^1\.\s',txt):
            out[ch][1]=''; v=1; cur=1
        pos=0
        for m in re.finditer(r'(?:(?<=\s)|^)(\d{1,3})(\.?)(?=\s|$)',txt):
            n=int(m.group(1))
            if not m.group(2) and m.start()!=0: continue
            if v<n<=v+3 or (v==0 and n==1):
                add(txt[pos:m.start()]); v=n; out[ch][v]=''; cur=v; pos=m.end()
        add(txt[pos:])
    return out
def paras_of(b, chapter_h3):
    res=[]
    for m in re.finditer(r'(?is)<h3[^>]*>(.*?)</h3>|<p[^>]*>(.*?)(?=<p[^>]*>|<h3|$)',b):
        if m.group(1) is not None:
            t=clean(m.group(1)); mm=re.match(r'(?i)CHAPTER ([IVXLC]+)',t.upper())
            if chapter_h3 and mm: res.append(('ch',rom(mm.group(1))))
            continue
        raw=m.group(2)
        if re.match(r'(?is)\s*[IVXLC]+(?:\s*[-–]\s*[IVXLC]+)?\.\s*(?:\d+[-–]?\d*\.?)?\s*<i>',raw): continue
        if re.match(r'(?is)\s*\((?:[ivxlc]+\.)',clean(raw)): continue
        t=clean(raw)
        if t and 'at sacred-texts.com' not in t: res.append(('p',t))
    return res
def enoch():
    P=[]
    for f in sorted(glob.glob('/workspace/bible-reader/data/st/boe/boe*.htm')):
        n=int(re.search(r'(\d+)',os.path.basename(f)).group(1))
        if n<4: continue
        P+=paras_of(body(f),True)
    return parse(P,'h3')
def jubilees():
    P=[('ch',1)]
    for f in sorted(glob.glob('/workspace/bible-reader/data/st/jub/jub*.htm')):
        n=int(re.search(r'(\d+)',os.path.basename(f)).group(1))
        if n<12: continue
        P+=paras_of(body(f),False)
    return parse(P,'roman')
if __name__=='__main__':
    for name,fn in [('enoch',enoch),('jubilees',jubilees)]:
        d=fn()
        print(name,len(d),[ (c,len(d[c])) for c in d][:60])
        json.dump({str(c):[d[c].get(v,'') for v in range(1,max(d[c])+1)] for c in d},open(f'/workspace/bible-reader/build/{name}.json','w'),ensure_ascii=False)
