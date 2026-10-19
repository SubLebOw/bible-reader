import re, json, glob, os, html
D='/workspace/bible-reader/data'
def usfm_book(path):
    s=open(path,encoding='utf-8').read()
    s=re.sub(r'\\f\s.*?\\f\*','',s,flags=re.S)
    s=re.sub(r'\\x\s.*?\\x\*','',s,flags=re.S)
    s=re.sub(r'\\(?:\+)?w\s+([^|\\]*?)(?:\|[^\\]*)?\\(?:\+)?w\*',r'\1',s)
    chapters=[]; cur=None; vlabel=None
    for line in s.split('\n'):
        line=line.strip()
        m=re.match(r'^\\c\s+(\d+)',line)
        if m:
            cur={'n':m.group(1),'v':[]}; chapters.append(cur); vlabel=None; continue
        if cur is None: continue
        if line.startswith('\\d '):
            cur['h']=re.sub(r'\\[a-z0-9]+\*?','',line[3:]).strip(); continue
        m=re.match(r'^\\(s\d?|ms\d?|mr|r|sr|d|sp|cl|ip|is\d?|imt\d?|toc\d|h|mt\d?|id|ide|rem)\b',line)
        if m: continue
        # split on \v
        parts=re.split(r'\\v\s+(\S+)\s*',line)
        pre=parts[0]
        def clean(t):
            t=re.sub(r'\\[a-z0-9]+\*','',t); t=re.sub(r'\\\+?[a-z0-9]+\s?','',t)
            return t.replace('¶','')
        if pre and cur['v']:
            t=clean(pre).strip()
            if t: cur['v'][-1][1]=(cur['v'][-1][1]+' '+t).strip()
        for i in range(1,len(parts),2):
            cur['v'].append([parts[i], clean(parts[i+1]).strip()])
    for c in chapters:
        for v in c['v']: v[1]=re.sub(r'\s+',' ',v[1]).strip()
    return chapters
def usfm_dir(d):
    out={}
    for f in sorted(glob.glob(f'{D}/{d}/*.usfm')):
        code=re.match(r'\d+-(\w{3})',os.path.basename(f)).group(1)
        if code in ('FRT','GLO','INT','BAK','OTH','XXA','XXB','XXC'): continue
        ch=usfm_book(f)
        if ch: out[code]=ch
    return out
def lsb_parse(xml_path):
    import xml.etree.ElementTree as ET
    r=ET.parse(xml_path).getroot(); out={}
    for b in r.iter('book'):
        out[int(b.get('number'))]=[{'n':c.get('number'),'v':[[v.get('number'),(v.text or '').strip()] for v in c.iter('verse')]} for c in b.iter('chapter')]
    return out
def simple_chapters(d):
    """d: {chapterlabel: [verses]} -> chapters list with numbered verses, skipping empties"""
    out=[]
    for c,vs in d.items():
        out.append({'n':str(c),'v':[[str(i+1),t] for i,t in enumerate(vs) if t]})
    return out
def para_chapters(chs):
    """chs from parse_ccel: [{'n','h'?,'v':[paras]}] -> numbered"""
    out=[]
    for c in chs:
        o={'n':c['n'],'v':[[str(i+1),t] for i,t in enumerate(c['v']) if t]}
        if c.get('h'): o['h']=c['h']
        if o['v']: out.append(o)
    return out
def meqabyan(n):
    t=json.load(open(f'{D}/ws/Translation_{n}_Meqabyan.json'))['parse']['wikitext']
    t=re.sub(r'\{\{[^{}]*\}\}','',t); t=re.sub(r'\{\{[^{}]*\}\}','',t)
    t=re.sub(r'<ref[^>]*/>|<ref.*?</ref>','',t,flags=re.S)
    t=re.sub(r"'''?","",t); t=re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]',r'\1',t)
    chapters=[];cur=None;head=[]
    for line in t.split('\n'):
        line=line.strip()
        m=re.match(r'^(?:==\s*)?Chapter\s+(\d+)\s*(?:==)?$',line)
        if m: cur={'n':m.group(1),'v':[]}; chapters.append(cur); continue
        if cur is None or not line: continue
        line=re.sub(r'<[^>]+>','',line)
        m=re.match(r'^\[?(\d+)(?:\]|\.)?\s+(.*)$',line)
        if m: cur['v'].append([m.group(1),m.group(2).strip()])
        elif cur['v']: cur['v'][-1][1]+=' '+line
        else: cur['h']=(cur.get('h','')+' '+line).strip()
    return chapters
def baruch4():
    s=open(f'{D}/ia/parjer.html',encoding='utf-8',errors='replace').read()
    s=re.sub(r'<br\s*/?>','\n',s); s=html.unescape(re.sub(r'<[^>]+>','',s))
    hdr=s[s.find('Public Domain'):s.find('~a"1013"')].strip()
    body=s[s.find('THE THINGS OMITTED'):]
    k=body.find('//end of Longer Version//')
    if k>0: body=body[:k]
    chapters={}
    for m in re.finditer(r'~(\d+)\.(\d+)\s+(.*?)(?=~\d+\.\d+|\Z)',body,re.S):
        c,v,t=m.groups(); t=re.sub(r'\s+',' ',t).strip()
        chapters.setdefault(c,[]).append([v,t])
    return [{'n':c,'v':vs} for c,vs in chapters.items()], re.sub(r'\s+',' ',hdr)
def mattison(name, mode='sections'):
    x=[l.strip() for l in open(f'{D}/gn/{name}.txt').read().split('\n')]
    st=next(i for i,l in enumerate(x) if 'public domain' in l)
    end=next((k for k,l in enumerate(x) if k>st and l in ('Notes on Translation','Notes')),len(x))
    legend=lambda l: l=='Symbols' or (len(l)<45 and re.search(r'Gap in the text|Editorial|Page Number|Unintelligible',l))
    def is_head(l):
        if re.match(r'^(Saying|Chapter) \d+:',l): return True
        if re.search(r'(recto|verso)', l) and len(l)<40: return True
        return len(l)<70 and not re.search(r'[.?!,;:"”’\]\)…]$',l) and not l.startswith('[') and not re.match(r'^\d+ ',l) and not l.startswith('(')
    L=[l for l in x[st+1:end] if l and not legend(l)]
    k=next(i for i,l in enumerate(L) if is_head(l))
    L=L[k:]
    while L and len(L[-1])<30 and is_head(L[-1]): L.pop()
    chapters=[];cur=None
    for l in L:
        if mode=='thomas' and not (re.match(r'^Saying \d+:',l) or l=='Prologue'): 
            cur['p'].append(l); continue
        if is_head(l) and not l.startswith('"'):
            m=re.match(r'^(?:Saying|Chapter) (\d+):\s*(.*)$',l)
            if m: cur={'n':m.group(1),'h':m.group(2),'p':[]}
            elif mode=='thomas': cur={'n':l,'h':l,'p':[]}
            else: cur={'n':str(len(chapters)+1),'h':l,'p':[]}
            chapters.append(cur); continue
        cur['p'].append(l)
    out=[]
    for c in chapters:
        if not c['p']: continue
        if any(re.match(r'^\(\d+\)',p) for p in c['p']):
            txt=' '.join(c['p']); parts=re.split(r'\((\d+)\)\s*',txt)
            vs=[]
            if parts[0].strip(): vs.append(['', parts[0].strip()])
            for i in range(1,len(parts),2): vs.append([parts[i],parts[i+1].strip()])
        else:
            vs=[[str(i+1),p] for i,p in enumerate(c['p'])]
        o={'n':c['n'],'v':vs}
        if c.get('h') and c['h']!=c['n']: o['h']=c['h']
        out.append(o)
    return out
def james_sections(fname, start_head, end_head=None):
    x=open(f'{D}/ws/{fname}.txt').read().split('\n')
    s=next(i for i,l in enumerate(x) if l.strip()==start_head)
    e=next((i for i,l in enumerate(x) if i>s and end_head and l.strip()==end_head),len(x))
    L=[re.sub(r'\[\d+\]','',l).replace('\u200b','').strip() for l in x[s+1:e]]
    out=[];
    for l in L:
        if not l: continue
        if out and (not re.search(r'[.?!:;"”’)\]—]$',out[-1]) and l[:1].islower()): out[-1]+=' '+l
        else: out.append(l)
    return out
