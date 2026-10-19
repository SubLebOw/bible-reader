# Bible Reader

A lightweight browser Bible reader inspired by [bible-rs](https://github.com/michaelshimeles/bible-rs): Literata typesetting, superscript verse numbers, light / sepia / dark themes, a tabbed book → chapter → verse picker (Protestant · Catholic · Ethiopian · Other Gospels · Supporting Texts · All), a Ctrl/Cmd+K jump palette (`jn 3:16`, `enoch 6`, `thomas 77`), full-text search, ←/→ chapter navigation, highlights, notes and bookmarks (stored in your browser), a side-by-side compare view and a per-verse compare. On phones it switches to an app-style layout (top bar, bottom tabs, swipe between chapters, bottom action sheet) and can be installed to the home screen as a PWA; chapters you have read are cached for offline use.

## Texts

Everything hosted in this repository is public domain or openly licensed:

| Short | Translation | Licence | Source |
|---|---|---|---|
| BSB | Berean Standard Bible | Public domain | eBible.org |
| WEB | World English Bible (with deuterocanon) | Public domain | eBible.org |
| KJV | King James Version 1769 + Apocrypha | Public domain (outside the UK) | eBible.org |
| Charles | R. H. Charles — 1 Enoch (1917), Jubilees (1917) | Public domain | sacred-texts.com |
| WS | Wikisource “Free Bible” — 1–3 Meqabyan | CC BY-SA 4.0 | en.wikisource.org |
| Kraft | Kraft & Purintun — 4 Baruch (Paraleipomena Jeremiou) | CATSS public-domain edition, non-commercial, header retained | ccat.sas.upenn.edu |
| Mattison | Mark M. Mattison et al. — Thomas, Mary, Judas, Philip, Truth, Peter, Egerton, Infancy James/Thomas, Secret Mark, P.Oxy 5575 | Public domain dedication | gospels.net |
| ANF | Alexander Walker, Ante-Nicene Fathers vol. 8 (1886) | Public domain | ccel.org |
| ANF9 | J. Armitage Robinson, Gospel of Peter, ANF vol. 9 | Public domain | ccel.org |
| James | M. R. James, *The Apocryphal New Testament* (1924) — incl. Epistle of the Apostles, Apocalypse of Peter (Ethiopic) | Public domain (US) | Wikisource |
| Horner | G. Horner, *The Statutes of the Apostles* (1904) — Sinodos: Te’ezaz, cleaned OCR | Public domain | archive.org statutesapostle00unkngoog |
| Harden | J. M. Harden, *The Ethiopic Didascalia* (1920), cleaned OCR | Public domain | archive.org cu31924096083336 |
| Morwyng | Peter Morwyng (1558), Hebrew Josippon (not the Ethiopic Zena Ayhud) | CC0 (EEBO-TCP text) | github.com/textcreationpartnership/A04666 |
| Cooper | J. Cooper & A. J. Maclean, *The Testament of Our Lord* (1902), Syriac Testamentum Domini — related to Ethiopic Covenant 1 | Public domain | archive.org cu31924029296170 |
| G&H | B. P. Grenfell & A. S. Hunt, *The Oxyrhynchus Papyri* X (1914), P.Oxy 1224 | Public domain | archive.org oxyrhynchuspapyr10gren |
| Hogan | E. Hogan (1895) Irish Infancy stories (Leabhar Breac), as reprinted in M. R. James, *Latin Infancy Gospels* (1927) — related to the Latin Arundel/Hereford text | Public domain | archive.org latininfancygosp0000unse |
| PD | Supporting texts: Tacitus (Church & Brodribb), Pliny (Melmoth/Bosanquet), Josephus (Whiston), Suetonius (Rolfe 1914), Mara bar Serapion (ANF 8), Lucian (Fowler 1905), Julius Africanus on Thallus (ANF 6) | Public domain | Wikisource, Project Gutenberg, LacusCurtius, CCEL |

Each book ends with its translator and source.

**The Legacy Standard Bible is not in this repository.** It is © The Lockman Foundation. The app's *Add LSB* button downloads the Beblia XML straight from GitHub into your own browser (IndexedDB), or you can import a local XML file. It stays on your device.

**Your own files.** Hovering over (or tapping) a greyed-out book in the picker offers *Upload file* (.txt, .md, .json, .xml OSIS/Zefania/Beblia, .usfm, .pdf via pdf.js). The file is parsed in your browser and stored only in IndexedDB; it is never uploaded. Remove or replace it in Settings.

`tools/` holds the scripts that generated `data/` from the sources above. `test/e2e.js` and `test/e2e2.js` are Playwright smoke tests (desktop, phone at 390×844, upload). `sources/` keeps a CC BY-SA backup of the Wikisource Meqabyan pages.
