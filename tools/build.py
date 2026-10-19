import json, os, re, shutil, sys
sys.path.insert(0,'/workspace/bible-reader/build')
import sources as S, parse_st, parse_ccel as PC
OUT='/workspace/bible-reader/site/data'
shutil.rmtree(OUT,ignore_errors=True); os.makedirs(OUT)
D=S.D
# ---------- book metadata ----------
P66=[('GEN','Genesis','gen ge gn'),('EXO','Exodus','exo ex exod'),('LEV','Leviticus','lev lv'),('NUM','Numbers','num nm nu'),('DEU','Deuteronomy','deu deut dt'),('JOS','Joshua','josh jos jsh'),('JDG','Judges','judg jdg jg'),('RUT','Ruth','ruth rut ru'),('1SA','1 Samuel','1sam 1sa 1sm 1 sam'),('2SA','2 Samuel','2sam 2sa 2sm 2 sam'),('1KI','1 Kings','1kgs 1ki 1kg 1 kings'),('2KI','2 Kings','2kgs 2ki 2kg 2 kings'),('1CH','1 Chronicles','1chr 1ch 1 chron'),('2CH','2 Chronicles','2chr 2ch 2 chron'),('EZR','Ezra','ezra ezr'),('NEH','Nehemiah','neh ne'),('EST','Esther','esth est es'),('JOB','Job','job jb'),('PSA','Psalms','ps psa psalm pss'),('PRO','Proverbs','prov pro prv pr'),('ECC','Ecclesiastes','eccl ecc qoh'),('SNG','Song of Songs','song sng sos canticles'),('ISA','Isaiah','isa is'),('JER','Jeremiah','jer je jr'),('LAM','Lamentations','lam la'),('EZK','Ezekiel','ezek ezk eze'),('DAN','Daniel','dan da dn'),('HOS','Hosea','hos ho'),('JOL','Joel','joel jl'),('AMO','Amos','amos am'),('OBA','Obadiah','obad ob oba'),('JON','Jonah','jonah jon'),('MIC','Micah','mic mi'),('NAM','Nahum','nah na'),('HAB','Habakkuk','hab hb'),('ZEP','Zephaniah','zeph zep zp'),('HAG','Haggai','hag hg'),('ZEC','Zechariah','zech zec zc'),('MAL','Malachi','mal ml'),
('MAT','Matthew','matt mat mt'),('MRK','Mark','mark mrk mk mr'),('LUK','Luke','luke luk lk'),('JHN','John','john jhn jn joh'),('ACT','Acts','acts act ac'),('ROM','Romans','rom ro rm'),('1CO','1 Corinthians','1cor 1co 1 cor'),('2CO','2 Corinthians','2cor 2co 2 cor'),('GAL','Galatians','gal ga'),('EPH','Ephesians','eph ep'),('PHP','Philippians','phil php pp'),('COL','Colossians','col co'),('1TH','1 Thessalonians','1thess 1th 1 thess'),('2TH','2 Thessalonians','2thess 2th 2 thess'),('1TI','1 Timothy','1tim 1ti 1 tim'),('2TI','2 Timothy','2tim 2ti 2 tim'),('TIT','Titus','titus tit ti'),('PHM','Philemon','phlm phm philem'),('HEB','Hebrews','heb he'),('JAS','James','jas jm'),('1PE','1 Peter','1pet 1pe 1pt'),('2PE','2 Peter','2pet 2pe 2pt'),('1JN','1 John','1jn 1jo 1john'),('2JN','2 John','2jn 2jo 2john'),('3JN','3 John','3jn 3jo 3john'),('JUD','Jude','jude jud'),('REV','Revelation','rev re rv apocalypse')]
DEUT=[('TOB','Tobit','tob tb'),('JDT','Judith','jdt jud judith'),('ESG','Esther (Greek, with additions)','esg gkesth addesth'),('WIS','Wisdom of Solomon','wis ws wisdom'),('SIR','Sirach (Ecclesiasticus)','sir ecclus sirach'),('BAR','Baruch (ch. 6 = Letter of Jeremiah)','bar ba'),('S3Y','Song of the Three Young Men','s3y sgthree azariah'),('SUS','Susanna','sus'),('BEL','Bel and the Dragon','bel'),('DAG','Daniel (Greek, with additions)','dag gkdan'),('1MA','1 Maccabees','1macc 1ma 1 macc'),('2MA','2 Maccabees','2macc 2ma 2 macc'),('3MA','3 Maccabees','3macc 3ma'),('4MA','4 Maccabees','4macc 4ma'),('1ES','1 Esdras (Ethiopian: Ezra II)','1esd 1es 3ezra ezra2'),('2ES','2 Esdras (chs 3–14 = 4 Ezra / Ezra Sutuel)','2esd 2es 4ezra sutuel'),('MAN','Prayer of Manasseh','man prman manasseh'),('PS2','Psalm 151','ps151 ps2')]
ETH=[('ENO','1 Enoch','enoch eno hen 1en henok'),('JUB','Jubilees','jub jubilees kufale'),('MQ1','1 Meqabyan','1meq mq1 1meqabyan'),('MQ2','2 Meqabyan','2meq mq2 2meqabyan'),('MQ3','3 Meqabyan','3meq mq3 3meqabyan'),('4BA','4 Baruch (Paralipomena of Jeremiah)','4bar 4ba parjer paralipomena')]
GOS=[('GTH','Gospel of Thomas','gth gthom thomas gospel of thomas'),('GTHG','Gospel of Thomas – Greek fragments (P.Oxy. 1, 654, 655)','gthgr poxy1 poxy654 poxy655'),('IGT','Infancy Gospel of Thomas','igt inf thomas infancy thomas'),('IGTB','Infancy Gospel of Thomas (Second Greek Form)','igtb'),('IGTL','Infancy Gospel of Thomas (Latin Form)','igtl'),('PJAS','Proto-Gospel of James (Infancy Gospel of James)','pjas protev protevangelium infancy james'),('PSMT','Gospel of Pseudo-Matthew','psmt pseudo-matthew psmatt'),('HJC','History of Joseph the Carpenter','hjc joseph carpenter'),('ARIN','Arabic Infancy Gospel','arin arabic infancy'),('JCG','Jewish-Christian Gospels (Hebrews, Ebionites, Nazareans)','jcg hebrews ebionites nazareans gheb'),('GEGY','Gospel according to the Egyptians','gegy egyptians'),('EGER','Papyrus Egerton 2 (Unknown Gospel)','eger egerton'),('POX840','Papyrus Oxyrhynchus 840','pox840 poxy840'),('FAYUM','Fayûm Fragment (P.Vindob. G 2325)','fayum'),('POX5575','Sayings of Jesus (P.Oxy. 5575)','pox5575'),('AGRA','Agrapha','agra agrapha'),('GPET','Gospel of Peter','gpet gospel of peter'),('GJUD','Gospel of Judas','gjud judas'),('ABGAR','Jesus’ Correspondence with Abgar','abgar'),('NICA','Gospel of Nicodemus (Acts of Pilate) A','nica nicodemus acts of pilate'),('NICB','Gospel of Nicodemus (Acts of Pilate) B','nicb'),('NICL','Gospel of Nicodemus (Acts of Pilate) – Latin Form','nicl'),('DESC','Descent into Hades (Nicodemus Part II, Greek)','desc descent hades'),('DESCL','Descent into Hell (Nicodemus Part II, Latin)','descl'),('ANAPH','Report of Pontius Pilate (Anaphora Pilati)','anaph anaphora report of pilate'),('PARAD','Handing Over of Pilate (Paradosis Pilati)','parad paradosis'),('LPIL','Letter of Pontius Pilate (to Tiberius)','lpil letter of pilate'),('LHP','Letters of Herod to Pilate and Pilate to Herod','lhp herod'),('LTIB','Letter of Tiberius to Pilate','ltib tiberius'),('VIND','Vengeance of the Savior (Vindicta Salvatoris)','vind vengeance avenging'),('MORS','Death of Pilate (Mors Pilati)','mors death of pilate'),('JOSAR','Narrative of Joseph of Arimathea','josar joseph of arimathea'),('GMAR','Gospel of Mary','gmar gmary mary'),('GPHIL','Gospel of Philip','gphil philip'),('GTRU','Gospel of Truth','gtru truth'),('SMRK','Secret Gospel of Mark','smrk secret mark')]
META={}
for lst,grp in [(P66,'bible'),(DEUT,'deut'),(ETH,'eth'),(GOS,'gos')]:
    for c,n,a in lst: META[c]={'id':c,'name':n,'abbr':a.split(),'grp':grp}
# ---------- translations ----------
TR={
 'bsb':{'name':'Berean Standard Bible','short':'BSB','license':'Public domain (dedicated 2023)','src':'eBible.org engbsb'},
 'web':{'name':'World English Bible (with Deuterocanon)','short':'WEB','license':'Public domain','src':'eBible.org eng-web'},
 'kjv':{'name':'King James Version (1769) with Apocrypha','short':'KJV','license':'Public domain (outside the UK)','src':'eBible.org eng-kjv'},
 'charles':{'name':'R. H. Charles','short':'Charles','license':'Public domain','src':'sacred-texts.com (Charles, The Book of Enoch, SPCK 1917; The Book of Jubilees, SPCK 1917)'},
 'wsfb':{'name':'Wikisource Free Bible (from Ge‘ez)','short':'WS','license':'CC BY-SA 4.0 — Wikisource contributors','src':'en.wikisource.org Translation:1/2/3 Meqabyan'},
 'kraft':{'name':'Kraft & Purintun (CATSS)','short':'Kraft','license':'CATSS public-domain edition, free for non-commercial use with header','src':'ccat.sas.upenn.edu ParJer-Eng'},
 'mattison':{'name':'Mark M. Mattison et al. (Gospels.net)','short':'Mattison','license':'Public domain (dedicated by the translators)','src':'gospels.net'},
 'walker':{'name':'Alexander Walker, Ante-Nicene Fathers vol. 8 (1886)','short':'ANF','license':'Public domain','src':'CCEL anf08.txt'},
 'robinson':{'name':'J. Armitage Robinson, Ante-Nicene Fathers vol. 9 (1896)','short':'ANF9','license':'Public domain','src':'CCEL anf09.txt'},
 'james':{'name':'M. R. James, The Apocryphal New Testament (Oxford 1924)','short':'James','license':'Public domain (US)','src':'en.wikisource.org The Apocryphal New Testament (1924)'},
}
CREDIT={}  # (trans,book)-> credit line override
avail={}   # book -> {trans: [chapter labels]}
def write(trans, code, chapters, credit=None):
    if len(chapters)==1 and chapters[0]['n']=='Intro': chapters[0]['n']='1'
    seen=set(); 
    for c in chapters:
        if c['n'] in seen: c['n']='App. '+c['n']
        seen.add(c['n'])
    os.makedirs(f'{OUT}/{trans}',exist_ok=True)
    obj={'c':chapters}
    if credit: obj['credit']=credit
    json.dump(obj,open(f'{OUT}/{trans}/{code}.json','w'),ensure_ascii=False,separators=(',',':'))
    avail.setdefault(code,{})[trans]=[c['n'] for c in chapters]
# Bibles
for t,d in [('bsb','engbsb'),('web','eng-web'),('kjv','eng-kjv')]:
    for code,ch in S.usfm_dir(d).items():
        if code not in META: print('skip',t,code); continue
        write(t,code,ch)
# Enoch / Jubilees
enoch=parse_st.enoch(); jub=parse_st.jubilees()
write('charles','ENO',[{'n':str(c),'v':[[str(i+1),t] for i,t in [(v-1,enoch[c][v]) for v in sorted(enoch[c])] if t]} for c in sorted(enoch)],
      'Translated by R. H. Charles, The Book of Enoch (London: SPCK, 1917). Public domain. Text via sacred-texts.com. Charles’s brackets: ⌈ ⌉ interpolations/corruptions, 〈 〉 restorations, [ ] additions.')
write('charles','JUB',[{'n':str(c),'v':[[str(v),jub[c][v]] for v in sorted(jub[c]) if jub[c][v]]} for c in sorted(jub)],
      'Translated by R. H. Charles, The Book of Jubilees (London: SPCK, 1917; from his 1902 translation). Public domain. Text via sacred-texts.com.')
for n in (1,2,3):
    note='Translated from Ge‘ez by Wikisource “Free Bible” contributors (en.wikisource.org/wiki/Translation:%d_Meqabyan). Licensed CC BY-SA 4.0; reproduced unchanged except formatting.'%n
    if n==1: note+=' NOTE: only chapters 1–7 of 36 have been translated on Wikisource so far, and the page is currently nominated for deletion there.'
    write('wsfb','MQ%d'%n,S.meqabyan(n),note)
b4,hdr=S.baruch4()
write('kraft','4BA',b4,'English translation of the Longer Version of Paraleipomena Jeremiou by Robert A. Kraft and Ann-Elizabeth Purintun (SBL 1972). CATSS header: '+hdr)
# Mattison
MAT=[('GTH','thomas','thomas','Translated by Mark M. Mattison from Nag Hammadi Codex II,2. Committed to the public domain. Source: gospels.net/thomas'),
     ('GMAR','mary','s','Translated by Mark M. Mattison from Papyrus Berolinensis 8502. Committed to the public domain. Source: gospels.net/mary'),
     ('GJUD','judas','s','Translated by Mark M. Mattison from Codex Tchacos 3. Committed to the public domain. Source: gospels.net/judas'),
     ('EGER','egerton','s','Translated by Mark M. Mattison from Andrew Bernhard’s Greek text. Committed to the public domain. Source: gospels.net/egerton'),
     ('SMRK','secret-gospel-of-mark','s','Public-domain translation published on gospels.net (proofread by Mark M. Mattison). Source: gospels.net/secret-gospel-of-mark. Authenticity of this text is disputed.'),
     ('GPHIL','philip','s','Translated by Mark M. Mattison from Nag Hammadi Codex II,3. Committed to the public domain. Source: gospels.net/philip'),
     ('GTRU','truth','s','Translated by Mark M. Mattison from Nag Hammadi Codex I,3. Committed to the public domain. Source: gospels.net/truth'),
     ('GPET','peter','s','Translated by Mark M. Mattison from the Akhmim fragment. Committed to the public domain. Source: gospels.net/peter'),
     ('IGT','infancythomas','s','Translated by Mark M. Mattison from Hagios Saba 259. Committed to the public domain. Source: gospels.net/infancythomas'),
     ('PJAS','infancyjames','s','Translated by Mark M. Mattison (based on de Strycker’s Greek text). Committed to the public domain. Source: gospels.net/infancyjames'),
     ('POX5575','sayings-of-jesus-poxy-5575','s','Translated by Mark M. Mattison from P.Oxy. 5575. Committed to the public domain. Source: gospels.net')]
for code,f,mode,cr in MAT: write('mattison',code,S.mattison(f,mode),cr)
# ANF 8 (Walker)
A8=D+'/ccel/anf08.txt'
WK='Translated by Alexander Walker, in Ante-Nicene Fathers vol. 8 (Buffalo: Christian Literature Publishing, 1886). Public domain. Text via CCEL.'
for code,s,e in [('PJAS',33433,34059),('PSMT',34062,35622),('HJC',35966,36574),('IGT',36580,36900),('IGTB',36902,37036),('IGTL',37039,37437),('ARIN',37440,38398),('NICA',38409,39424),('NICB',39424,40305),('DESC',40313,40662),('NICL',40670,41516),('DESCL',41520,42558),('LPIL',42558,42591),('ANAPH',42591,42835),('PARAD',42835,42954),('MORS',42954,43068),('JOSAR',43068,43383),('VIND',43383,43722)]:
    ch=S.para_chapters(PC.extract(A8,s,e))
    write('walker',code,ch,WK+(' The Letter of Pilate to Claudius (in Ehrman & Pleše’s collection) appears in this translation inside the Latin Descent into Hell, chapter 13.' if code=='DESCL' else ''))
# ANF 9 Gospel of Peter (Robinson)
L=open(D+'/ccel/anf09.txt',encoding='utf-8').read().split('\n')
txt=[];cur=None
for l in L[347:]:
    if l.strip().startswith('____'): break
    m=re.match(r'^\s*(\d+)\s\s+(.*)$',l)
    if m: cur=[m.group(1),m.group(2).strip()]; txt.append(cur)
    elif cur and l.strip(): cur[1]+=' '+l.strip()
for v in txt: v[1]=re.sub(r'\s*\[\d+\]','',re.sub(r'\s+',' ',v[1]))
write('robinson','GPET',[{'n':'1','v':txt}],'Translated by J. Armitage Robinson, in Ante-Nicene Fathers vol. 9 (1896). Public domain. Text via CCEL. Sections 1–14 (Robinson’s numbering).')
# James 1924
JM='Translated by M. R. James, The Apocryphal New Testament (Oxford: Clarendon Press, 1924). Public domain in the US. Text via Wikisource. Includes James’s own introductory notes.'
def jparas(f,a,b=None): return [[str(i+1),p] for i,p in enumerate(S.james_sections(f,a,b))]
F='james_Fragments_of_Early_Gospels'
write('james','JCG',[{'n':'1','h':'The Gospel according to the Hebrews (incl. Nazarene fragments)','v':jparas(F,'THE GOSPEL ACCORDING TO THE HEBREWS','THE GOSPEL OF THE EBIONITES')},
                     {'n':'2','h':'The Gospel of the Ebionites','v':jparas(F,'THE GOSPEL OF THE EBIONITES','THE GOSPEL ACCORDING TO THE EGYPTIANS')}],JM+' James does not separate the Gospel of the Nazareans; its fragments are among his Hebrews quotations.')
write('james','GEGY',[{'n':'1','v':jparas(F,'THE GOSPEL ACCORDING TO THE EGYPTIANS','GOSPEL OF PHILIP')}],JM)
def jwhole(f):
    x=open(f'{D}/ws/{f}.txt').read().split('\n')
    s=next(i for i,l in enumerate(x) if '\u200b' in l and 'The Apocryphal New Testament' in l)
    return S.james_sections(f, x[s+1].strip())
write('james','GTHG',[{'n':'1','h':'P.Oxy. 654 and P.Oxy. 1','v':[[str(i+1),p] for i,p in enumerate(jwhole('james_Fragments_of_Gospels_The_Oxyrhynchus_Sayings_of_Jesus'))]},
                      {'n':'2','h':'P.Oxy. 655','v':[[str(i+1),p] for i,p in enumerate(jwhole('james_Fragments_of_Gospels_Fragment_of_a_Gospel'))]}],JM)
write('james','POX840',[{'n':'1','v':[[str(i+1),p] for i,p in enumerate(jwhole('james_Fragments_of_Gospels_Fragment_of_another_Gospel'))]}],JM)
write('james','FAYUM',[{'n':'1','v':[[str(i+1),p] for i,p in enumerate(jwhole('james_Fragments_of_Gospels_The_Fayoum_Gospel-Fragment'))]}],JM)
write('james','AGRA',[{'n':'1','v':[[str(i+1),p] for i,p in enumerate(jwhole('james_Agrapha'))]}],JM)
write('james','ABGAR',[{'n':'1','v':[[str(i+1),p] for i,p in enumerate(jwhole('james_Epistles_The_Letters_of_Christ_and_Abgarus'))]}],JM+' (Text as given by Eusebius, Church History I.13.)')
AP='james_Passion_Gospels_Other_Appendixes_to_the_Acts_of_Pilate'
write('james','LHP',[{'n':'1','h':'The Letter of Pilate to Herod','v':jparas(AP,'THE LETTER OF PILATE TO HEROD','THE LETTER OF HEROD TO PILATE')},
                     {'n':'2','h':'The Letter of Herod to Pilate','v':[v for v in jparas(AP,'THE LETTER OF HEROD TO PILATE','LETTER OF TIBERIUS TO PILATE')][:5]}],JM+' James gives these letters partly in abridged form.')
write('james','LTIB',[{'n':'1','v':jparas(AP,'LETTER OF TIBERIUS TO PILATE','THE DEATH OF PILATE')}],JM+' James gives this letter and the surrounding legend partly in summary.')
# ---------- catalog / tabs ----------
def B(c): return {'id':c}
def U(name,note,grp='eth'): return {'id':None,'name':name,'note':note}
prot_ot=[c for c,_,_ in P66[:39]]; nt=[c for c,_,_ in P66[39:]]
cath_ot=['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','TOB','JDT','EST','ESG','1MA','2MA','JOB','PSA','PRO','ECC','SNG','WIS','SIR','ISA','JER','LAM','BAR','EZK','DAN','DAG','S3Y','SUS','BEL','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL']
ETHNOTE={'2CH':'Ethiopian 2 Chronicles includes the Prayer of Manasseh (see below)','PRO':'Ethiopian tradition splits this into Messale (Prov 1–24) and Tägsas (Prov 25–31)','PSA':'Ethiopian Psalter includes Psalm 151','EST':'Ethiopian Esther includes the Greek additions (see Esther (Greek))','DAN':'Ethiopian Daniel includes the Greek additions (see Daniel (Greek))','JER':'','BAR':'Baruch 1–5; chapter 6 is the Letter of Jeremiah','1ES':'Ethiopian “Ezra II” (3 Ezra)','2ES':'Ezra Sutuel = 2 Esdras chapters 3–14 (4 Ezra)','EZR':'Ezra & Nehemiah are counted as one or two books depending on the list'}
eth_ot=['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','MAN','JUB','ENO','EZR','NEH','1ES','2ES','TOB','JDT','EST','ESG','MQ1','MQ2','MQ3','JOB','PSA','PS2','PRO','WIS','ECC','SNG','SIR','ISA','JER','BAR','LAM','4BA','EZK','DAN','DAG','HOS','AMO','MIC','JOL','OBA','JON','NAM','HAB','ZEP','HAG','ZEC','MAL']
tabs=[
 {'id':'prot','name':'Protestant','groups':[{'name':'Old Testament','items':[B(c) for c in prot_ot]},{'name':'New Testament','items':[B(c) for c in nt]}]},
 {'id':'cath','name':'Catholic','groups':[{'name':'Old Testament (Catholic order, 46 books + Greek additions)','items':[B(c) for c in cath_ot]},{'name':'New Testament','items':[B(c) for c in nt]}]},
 {'id':'eth','name':'Ethiopian','groups':[
   {'name':'Old Testament — narrower canon','items':[dict(B(c),note=ETHNOTE.get(c,'')) for c in eth_ot]},
   {'name':'New Testament — narrower canon (27)','items':[B(c) for c in nt]},
   {'name':'Broader canon','items':[
     U('Josippon (Zena Ayhud)','Unavailable: no public-domain English translation of the Ethiopic Josippon exists.'),
     U('Sinodos: Ser‘ata Seyon','Unavailable here. A public-domain English translation exists (G. Horner, The Statutes of the Apostles, 1904) but only as an OCR scan with interleaved apparatus — archive.org/details/statutesapostle00unkngoog'),
     U('Sinodos: Te’ezaz','Unavailable here (see Horner 1904, archive.org/details/statutesapostle00unkngoog)'),
     U('Sinodos: Gessew','Unavailable here (see Horner 1904, archive.org/details/statutesapostle00unkngoog)'),
     U('Sinodos: Abtelis','Unavailable here (see Horner 1904, archive.org/details/statutesapostle00unkngoog)'),
     U('Book of the Covenant 1 (Mäshafä Kidan)','Unavailable: no public-domain English translation of the Ethiopic text (French: Guerrier & Grébaut 1913).'),
     U('Book of the Covenant 2','Unavailable: no public-domain English translation of the Ethiopic text.'),
     U('Ethiopic Clement (Qälémentos)','Unavailable: only a French translation (Grébaut, 1911–) is public domain.'),
     U('Didascalia (Didesqelya)','Unavailable here. Public-domain English translations exist (T. P. Platt 1834; J. M. Harden 1920) but only as OCR scans — archive.org/details/cu31924096083336'),
   ]}]},
 {'id':'gos','name':'Other Gospels','groups':[
   {'name':'Infancy gospels','items':[B('IGT'),U('Infancy Gospel of Thomas C (alternative beginning)','Unavailable: no free English translation.'),B('IGTB'),B('IGTL'),B('PJAS'),B('PSMT'),U('Latin Infancy Gospels (Arundel form)','Unavailable: no free English translation.'),B('HJC'),B('ARIN')]},
   {'name':'Ministry gospels','items':[B('JCG'),B('GEGY'),U('Diatessaron (Dura fragment)','Unavailable: no free English translation of the Dura fragment. (The full Arabic Diatessaron is public domain in ANF vol. 9 but is a harmony of the canonical gospels.)'),U('Papyrus Berlin 11710','Unavailable: no free English translation.'),U('Papyrus Cairo 10735','Unavailable: no free English translation.'),B('EGER'),U('Papyrus Merton 51','Unavailable: no free English translation.'),U('Papyrus Oxyrhynchus 210','Unavailable: no free English translation.'),B('POX840'),U('Papyrus Oxyrhynchus 1224','Unavailable: no free English translation found.'),U('Papyrus Oxyrhynchus 2949','Unavailable: no free English translation.'),U('Papyrus Oxyrhynchus 4009','Unavailable: no free English translation.'),B('FAYUM'),B('POX5575')]},
   {'name':'Sayings gospels and agrapha','items':[B('GTH'),B('GTHG'),B('AGRA')]},
   {'name':'Passion, resurrection and post-resurrection gospels','items':[B('GPET'),B('GJUD'),B('ABGAR'),U('Gospel of the Savior (P.Berol. 22220)','Unavailable: no free English translation.'),U('Discourse upon the Cross','Unavailable: no free English translation.'),B('NICA'),B('NICB'),B('NICL'),B('DESC'),B('DESCL'),B('ANAPH'),B('PARAD'),B('LPIL'),B('LHP'),B('LTIB'),B('VIND'),B('MORS'),B('JOSAR'),B('GMAR'),U('Greater Questions of Mary','Unavailable: no free English translation (M. R. James declined to translate it).')]},
   {'name':'Other early Christian gospels (not in Ehrman & Pleše)','items':[B('GPHIL'),B('GTRU'),B('SMRK')]},
 ]},
]
allg=[{'name':'Old Testament','items':[B(c) for c in prot_ot]},{'name':'New Testament','items':[B(c) for c in nt]},
      {'name':'Deuterocanon / Apocrypha','items':[B(c) for c,_,_ in DEUT]},{'name':'Ethiopian books','items':[B(c) for c,_,_ in ETH]},
      {'name':'Other early gospels','items':[B(c) for c,_,_ in GOS]}]
tabs.append({'id':'all','name':'All','groups':allg})
books={}
for c,m in META.items():
    if c in avail: books[c]=dict(m,tr=avail[c])
    else: print('NO DATA',c)
order=[c for c in META if c in books]
cat={'translations':TR,'books':books,'order':order,'tabs':tabs,'pref':['lsb','bsb','web','kjv','mattison','walker','charles','wsfb','kraft','james','robinson']}
json.dump(cat,open(f'{OUT}/catalog.json','w'),ensure_ascii=False,separators=(',',':'))
print('books',len(books))
