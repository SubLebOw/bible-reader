import re, html, json
D='/workspace/bible-reader/data'
def clean(t):
    t=re.sub(r'\[\d+\]','',t); t=t.replace('\u2060','').replace('\xad','')
    t=re.sub(r'\s+',' ',t).strip(); return t
def between(f,a,b,inc_b=False):
    t=open(f,encoding='utf-8',errors='replace').read()
    i=t.index(a); j=t.index(b,i)
    return t[i:j+(len(b) if inc_b else 0)]
def paras(t): return [clean(p) for p in re.split(r'\n\s*\n',t) if clean(p)]
def V(ps): return [[str(i+1),p] for i,p in enumerate(ps)]
def suet(f,a,b):
    t=open(D+'/sup/'+f,encoding='utf-8',errors='replace').read()
    t=re.sub(r'<sup.*?</sup>|<a class="ref".*?</a>','',t,flags=re.S)
    t=html.unescape(re.sub(r'<[^>]+>',' ',t)); t=re.sub(r'\s+',' ',t)
    i=t.index(a); j=t.index(b,i)+len(b)
    s=t[i:j]
    s=re.sub(r'\s\d{2,3}(?=[\s.,;])','',s)          # note reference numbers
    s=re.sub(r'\bp\d{2,3}\s','',s)                     # page markers
    s=re.sub(r'\s(\d)\s(?=[A-Z])',r' [\1] ',s)          # section numbers
    return clean(s.replace(' ;',';'))
def books():
    B={}
    # Tacitus
    d=json.load(open(D+'/sup/The_Annals__Tacitus__Book_15.json'))['parse']['text']['*']
    t=html.unescape(re.sub(r'<[^>]+>','',d)); i=t.index('Such indeed were the precautions'); j=t.index('45[edit]',i)
    B['TAC']={'name':'Tacitus, Annals 15.44','abbr':'Tac','c':[{'n':'15.44','h':'Cornelius Tacitus, Roman senator and historian, wrote the Annals c. AD 116. After the great fire of Rome (AD 64) he describes Nero blaming the Christians, and mentions Christus executed by Pontius Pilate.','v':V(paras(t[i:j]))}],
      'credit':'Tacitus, Annals XV.44, translated by Alfred John Church and William Jackson Brodribb (1876). Public domain. Text from Wikisource, "The Annals (Tacitus)/Book 15".'}
    # Pliny
    p=D+'/sup/pliny.txt'
    l96=between(p,'IT is my invariable rule, Sir','XCVIII -- TRAJAN TO PLINY'); l97=between(p,'You have adopted the right course','XCIX -- To THE EMPEROR TRAJAN')
    B['PLIN']={'name':'Pliny the Younger, Letters 10.96–97','abbr':'Pliny','c':[
      {'n':'10.96','h':'Pliny the Younger, governor of Bithynia-Pontus, writes to the Emperor Trajan c. AD 111–112 asking how to deal with people accused of being Christians (numbered XCVII in Melmoth\'s ordering).','v':V(paras(l96))},
      {'n':'10.97','h':'Trajan\'s reply to Pliny (numbered XCVIII in Melmoth\'s ordering).','v':V(paras(l97.replace('Secundtis','Secundus')))}],
      'credit':'Pliny the Younger, Letters X.96–97, translated by William Melmoth (1746), revised by F. C. T. Bosanquet. Public domain. Text from Project Gutenberg eBook #2811. One certain OCR fix: "Secundtis" → "Secundus".'}
    # Josephus
    j=D+'/sup/josephus_ant.txt'
    t3=between(j,'3. Now there was about this time Jesus','4. About the same time also another sad calamity')
    t5=between(j,"2. Now some of the Jews thought that the destruction of Herod's army",'3. ')
    t20s=open(j,encoding='utf-8').read(); k=t20s.index('brother of Jesus, who was called Christ'); a=t20s.rfind('1.',0,k); a=t20s.rfind('\n\n',0,k); b=t20s.index('\n\n',k)
    B['JOSA']={'name':'Josephus, Antiquities 18.3.3; 18.5.2; 20.9.1','abbr':'Jos','c':[
      {'n':'18.3.3','h':'Flavius Josephus, Jewish historian, wrote the Antiquities of the Jews c. AD 93–94. This is the "Testimonium Flavianum" about Jesus; most scholars think it has been expanded by later Christian copyists, though many hold that Josephus wrote a shorter original.','v':V(paras(t3))},
      {'n':'18.5.2','h':'Josephus on John the Baptist and his execution by Herod Antipas.','v':V(paras(t5))},
      {'n':'20.9.1','h':'Josephus on the death of James, "the brother of Jesus, who was called Christ" (AD 62).','v':V(paras(t20s[a:b]))}],
      'credit':'Flavius Josephus, Antiquities of the Jews, translated by William Whiston (1737). Public domain. Text from Project Gutenberg eBook #2848.'}
    B['SUET']={'name':'Suetonius, Claudius 25 & Nero 16','abbr':'Suet','c':[
      {'n':'Claudius 25','h':'Gaius Suetonius Tranquillus, Roman biographer, wrote the Lives of the Caesars c. AD 121. Under Claudius (c. AD 49) Jews in Rome were expelled after disturbances "at the instigation of Chrestus" (sections 25.3–25.5).','v':[['1',suet('claud.html','3 He forbade men of foreign birth','Eleusinian rites from Attica to Rome')+' …']]},
      {'n':'Nero 16','h':'Among Nero\'s measures, Suetonius lists punishment of the Christians (16.1–2).','v':[['1',suet('nero.html','16 1 He devised a new form','banished from the city.')]]}],
      'credit':'Suetonius, The Lives of the Caesars (Claudius 25; Nero 16), translated by J. C. Rolfe, Loeb Classical Library (1914). Public domain. Text from Bill Thayer\'s LacusCurtius transcription (penelope.uchicago.edu). Editorial note numbers removed; section numbers in brackets.'}
    m=between(D+'/ccel/anf08.txt','Mara, son of Serapion, to Serapion, my son','Here endeth the letter of Mara, son of Serapion.',True)
    B['MARA']={'name':'Mara bar Serapion, Letter to his Son','abbr':'Mara','c':[{'n':'1','h':'A Syriac letter by Mara bar Serapion, a Stoic from Samosata, written to his son some time after AD 73 (date debated). It mentions the Jews killing their "wise king", widely taken as a reference to Jesus.','v':V(paras(m))}],
      'credit':'Letter of Mara, son of Serapion, from the Syriac text edited by William Cureton (Spicilegium Syriacum, 1855); English as printed in Ante-Nicene Fathers vol. 8 (1886), "Ancient Syriac Documents", translated by B. P. Pratten. Public domain. Text from CCEL.'}
    l=between(D+'/sup/lucian4.txt',"'It was now that he came across the priests and scribes",'Peregrine returned to Armenia.',True)
    B['LUC']={'name':'Lucian, The Death of Peregrine 11–14','abbr':'Luc','c':[{'n':'11–14','h':'Lucian of Samosata, Greek satirist, wrote The Passing (Death) of Peregrinus c. AD 165. He mocks the Christians, "who worship a man ... crucified in Palestine", and their care for the imprisoned Peregrinus.','v':V(paras(l))}],
      'credit':'Lucian, The Death of Peregrine (§§ 11–14, approx.), from The Works of Lucian of Samosata, translated by H. W. Fowler and F. G. Fowler (Oxford, 1905), vol. 4. Public domain. Text from Project Gutenberg eBook #47242 (this translation has no section numbers).'}
    th=between(D+'/sup/anf06.txt',"1. As to His works severally, and His cures",'     __________________________________________________________________')
    B['THAL']={'name':'Thallus, quoted by Julius Africanus','abbr':'Thal','c':[{'n':'1','h':'Sextus Julius Africanus, Christian chronographer (c. AD 221), quotes the historian Thallus (1st century?), who explained the darkness at the crucifixion as an eclipse. Thallus\'s own work is lost; this is the earliest surviving pagan reference to the crucifixion darkness, known only through Africanus (preserved by Syncellus).','v':V(paras(th))}],
      'credit':'Julius Africanus, Chronography, Fragment XVIII, translated by S. D. F. Salmond in Ante-Nicene Fathers vol. 6 (1886). Public domain. Text from CCEL.'}
    return B
if __name__=='__main__':
    B=books()
    for k,b in B.items():
        print(k, [ (c['n'],len(c['v']), c['v'][0][1][:80], c['v'][-1][1][-80:]) for c in b['c']])
