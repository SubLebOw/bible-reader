# Bible Reader

A lightweight browser Bible reader inspired by [bible-rs](https://github.com/michaelshimeles/bible-rs): Literata typesetting, superscript verse numbers, light / sepia / dark themes, a tabbed book → chapter → verse picker (Protestant · Catholic · Ethiopian · Other Gospels · All), a Ctrl/Cmd+K jump palette (`jn 3:16`, `enoch 6`, `thomas 77`), full-text search, ←/→ chapter navigation, highlights, notes and bookmarks (stored in your browser), and a side-by-side compare view.

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
| James | M. R. James, *The Apocryphal New Testament* (1924) | Public domain (US) | Wikisource |

Each book ends with its translator and source.

**The Legacy Standard Bible is not in this repository.** It is © The Lockman Foundation. The app's *Add LSB* button downloads the Beblia XML straight from GitHub into your own browser (IndexedDB), or you can import a local XML file. It stays on your device.

`tools/` holds the scripts that generated `data/` from the sources above. `test/e2e.js` is a Playwright smoke test.
