// Учебник (uz), часть 1: Музыкальная грамота. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — перевод ru/p1.js (собственный пересказ по книгам С. Е. Максимова и Г. А. Фридкина); стихи для схемы «Метр в стихах» — узбекские.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';

export const S = {
  // notalar nomi boʻgʻinlar bilan; «Sheʼrdagi metr» sxemasi uchun sheʼrlar (bosh harflar — kuchli boʻgʻinlar, boʻgʻinlar chiziqcha bilan)
  'ov.fund': 'asosiy ton', 'ov.up': 'Navbat bilan', 'ov.six': 'Birinchi oltitasi birga', 'ov.note': 'Eng yaqin klavishlar yangraydi; haqiqiy 7- va 11-obertonlar sezilarli darajada pastroq (¢ — yarim tonning yuzdan bir ulushlari).',
  'oc.s0': 'Subk.', 'oc.s1': 'Kontr', 'oc.s2': 'Katta', 'oc.s3': 'Kich.', 'oc.s4': '1-okt', 'oc.s5': '2-okt', 'oc.s6': '3-okt', 'oc.s7': '4-okt', 'oc.s8': '5-okt',
  'oc.n0': 'Subkontroktava', 'oc.n1': 'Kontroktava', 'oc.n2': 'Katta oktava', 'oc.n3': 'Kichik oktava', 'oc.n4': 'Birinchi oktava', 'oc.n5': 'Ikkinchi oktava', 'oc.n6': 'Uchinchi oktava', 'oc.n7': 'Toʻrtinchi oktava', 'oc.n8': 'Beshinchi oktava',
  'oc.g0': 'subkontroktavada', 'oc.g1': 'kontroktavada', 'oc.g2': 'katta oktavada', 'oc.g3': 'kichik oktavada', 'oc.g4': 'birinchi oktavada', 'oc.g5': 'ikkinchi oktavada', 'oc.g6': 'uchinchi oktavada', 'oc.g7': 'toʻrtinchi oktavada', 'oc.g8': 'beshinchi oktavada',
  'oc.sci': 'Xalqaro', 'oc.only': 'royalda faqat', 'oc.do': 'Do', 'oc.oct': 'Oktava',
  'cl.treble': 'Skripka', 'cl.bass': 'Bas', 'cl.alto': 'Alt', 'cl.tenor': 'Tenor', 'cl.up': 'Yuqoriroq', 'cl.down': 'Pastroq', 'cl.line': 'Oʻrni', 'cl.onl': 'chiziqda', 'cl.btw': 'chiziqlar orasida',
  'rg.voices': 'Ovozlar', 'rg.instr': 'Cholgʻular', 'rg.note': 'Diapazonlar taxminiy: professionallarda kengroq. Cholgʻularda — yangraydigan balandliklar (gitara va kontrabas yozilganidan oktava past yangraydi).',
  'rg.sop': 'Soprano', 'rg.mez': 'Metso-soprano', 'rg.alt': 'Alt (kontralto)', 'rg.ten': 'Tenor', 'rg.bar': 'Bariton', 'rg.bas': 'Bas',
  'rg.pno': 'Fortepiano', 'rg.gtr': 'Gitara', 'rg.bgt': 'Bas-gitara', 'rg.vln': 'Skripka', 'rg.vla': 'Alt', 'rg.vcl': 'Violonchel', 'rg.cb': 'Kontrabas', 'rg.fl': 'Fleyta', 'rg.cl': 'Klarnet', 'rg.asx': 'Alt-saksofon', 'rg.tsx': 'Tenor-saksofon', 'rg.tpt': 'Truba', 'rg.tbn': 'Trombon',
  'du.hint': 'hissalar tempi', 'du.w': 'Butun', 'du.h': 'Yarimtaliklar', 'du.q': 'Choraklar', 'du.e': 'Sakkizliklar', 'du.s': 'Oʻn oltitaliklar', 'du.dot': 'Nuqtali', 'du.tie': 'Ligalar', 'du.trip': 'Triollar', 'du.punct': 'Punktir', 'du.rest': 'Pauzalar',
  'rg.p.q': 'Choraklar', 'rg.p.e': 'Sakkizliklar', 'rg.p.dot': 'Punktir', 'rg.p.sync': 'Sinkopa', 'rg.p.trip': 'Triollar', 'rg.p.off': 'Kuchsiz hissalar', 'rg.p.ch': 'Charlston', 'rg.p.mix': 'Aralash',
  'rg.even': 'Tekis', 'rg.swing': 'Sving', 'rg.swingNote': 'Tekis sakkizliklar yozilgan, sving bilan yangraydi: juftning birinchi sakkizligi uzunroq, ikkinchisi — triolning uchinchi notasi oʻrnida.', 'rg.hint': 'kataklar bosiladi — oʻz ritmi hosil boʻladi',
  'mt.count': 'bir ikki uch toʻrt besh olti yetti sakkiz toʻqqiz oʻn oʻn bir oʻn ikki', 'mt.size': 'Oʻlcham',
  'mt.simple': 'Oddiy oʻlcham: taktda bitta kuchli hissa.', 'mt.compound': 'Murakkab oʻlcham: bir xil oddiy oʻlchamlarning qoʻshilishi — kuchli va nisbatan kuchli hissalar.', 'mt.mixed': 'Aralash oʻlcham: turli oddiy oʻlchamlarning qoʻshilishi — hissa guruhlari teng emas.',
  'se.dia': 'Diatonik yarim ton', 'se.chr': 'Xromatik yarim ton', 'se.tone': 'Ton',
  'en.note': 'Bitta klavish — bir nechta nom. Qaysi birini yozishni tonallik va kuy harakati hal qiladi.',
  'to.mel': 'Kuy', 'to.row': 'Tovushqator', 'to.deg': 'Pogʻonalar', 'to.tonic': 'Tonika',
  'to.note.mel': 'Kuy qaysi tovushda tinchlanadi? «Tonika» tugmasi uni eshittiradi.', 'to.note.row': 'Kuy tovushlari bir martadan, balandlik boʻyicha: bu lad tovushqatori.', 'to.note.deg': 'Tonikadan pogʻonalar: kuy — pogʻonalar boʻylab yoʻl, uni istalgan tovushdan kuylash mumkin.',
  'ms.h': 'yarim ton', 'ms.w': 'ton', 'ms.signs': 'Formulani saqlash uchun belgilar kerak boʻldi: {s} — aynan tonallikning kalit belgilari.', 'ms.none': 'Do dan formula faqat oq klavishlarda chiqadi — belgilar yoʻq.',
  'pu.st': 'barqaror', 'pu.harm': 'garmonik', 'pu.stable': 'Barqaror pogʻona: unda toʻxtash mumkin.', 'pu.go': '{a} {b} ga intiladi: uchtovush, pogʻona va uning yechilishi yangraydi.', 'pu.or': ' yoki ', 'pu.around': 'Tonikani oʻrab olish',
  'te.next': 'Yuqori tetraxord — pastga', 'te.reset': 'Yana do major', 'te.low': 'pastki', 'te.up': 'yuqori', 'te.sig': 'Yangi gamma — {n}: tonika oldida yarim ton boʻlishi uchun VII pogʻona {s} boʻldi.', 'te.c': 'Do major: «ton — ton — yarim ton» dan iborat ikkita bir xil tetraxord, oraligʻi — ton.',
  'te.kinds': 'Tetraxord turlari', 'te.maj': 'major', 'te.min': 'minor', 'te.phr': 'frigiy', 'te.harm': 'garmonik',
  'mi.maj': 'Major', 'mi.nat': 'Tabiiy minor', 'mi.harm': 'Garmonik minor', 'mi.mel': 'Melodik minor', 'mi.melDown': 'Melodik pastga (klassika)', 'mi.hmaj': 'Garmonik major',
  'mi.note': 'Qizil — oʻzgartirilgan pogʻonalar. Qatorga bosish — gamma yuqoriga (melodik pastga — yuqoridan pastga).',
  'ks.order': 'Tartib', 'ks.sharp': 'Oxirgi diyez ({last}) — majorning VII pogʻonasi, tonika yarim ton yuqorida: {t}.', 'ks.flat': 'Oxiridan ikkinchi bemol ({pen}) — major tonikasi: {t}.', 'ks.one': 'Bitta bemol — fa major (buni shunchaki yodda tutish kerak).', 'ks.none': 'Belgisiz — do major va lya minor.',
  're.par': 'parallel', 're.dom': 'dominanta', 're.domPar': 'dominanta paralleli', 're.sub': 'subdominanta', 're.subPar': 'subdominanta paralleli', 're.more': 'Yana yaqinlari', 're.same': 'nomdosh', 're.hSub': 'minor subdominanta', 're.hDom': 'major dominanta',
  're.note': 'Bosilganda tonika va tanlangan tonallik yangraydi: qardosh oʻtishlar yumshoq eshitiladi.',
  'dg.deg': 'Pogʻona', 'dg.natural': '(tabiiy)', 'dg.note': '{n} — bitta klavish, lekin har bir qatorda uning roli boshqa. Qatorga bosish — tonallik tonikasi va shu tovush.',
  'tr.by': 'siljish: {iv}', 'tr.up': 'yuqoriga', 'tr.down': 'pastga',
  'pe.half': 'yarim', 'pe.full': 'toʻliq', 'pe.mot': 'Motivlar', 'pe.phr': 'Iboralar', 'pe.sen': 'Jumlalar', 'pe.first': 'Birinchi jumla',
  'pe.note.mot': 'Motivlar — taktma-takt: bitta kuchli hissali qisqa boʻlaklar.', 'pe.note.phr': 'Iboralar — ikki taktdan: har biri uzun tovush bilan tugaydi.', 'pe.note.sen': 'Toʻrt taktdan ikki jumla: birinchisi V pogʻonada tugaydi (savol), ikkinchisi — tonikada (javob). Birgalikda — period.',
  'cm.full': 'Toʻliq', 'cm.imp': 'Nomukammal', 'cm.half': 'Yarim (V)', 'cm.half2': 'Yarim (VII)',
  'cm.n.full': 'Toʻliq mukammal: II → I, kuy tonikaga keladi — nuqta.', 'cm.n.imp': 'Nomukammal: tonika tersiyasida tugash — barqaror, lekin oxirigacha emas.', 'cm.n.half': 'Yarim: V pogʻonada toʻxtash — savol, davomini kutadi.', 'cm.n.half2': 'VII pogʻonadagi yarim kadensiya — tonikaga eng kuchli tortadi.',
  'sq.dia': 'Tonal', 'sq.mod': 'Modulyatsiyalovchi', 'sq.down': 'Pastga', 'sq.up': 'Yuqoriga',
  'sq.n.dia': 'Motiv do major pogʻonalari boʻylab yuradi: ichidagi intervallar biroz oʻzgaradi, tonallik saqlanadi.', 'sq.n.mod': 'Motiv aniq bir tonga siljiydi: har bir halqa — yangi tonallikda.',
  'tm.Largo': 'keng, juda sekin', 'tm.Lento': 'choʻziq', 'tm.Adagio': 'sekin, osoyishta', 'tm.Andante': 'shoshmasdan, qadam bilan', 'tm.Andantino': 'andantedan biroz jonliroq', 'tm.Moderato': 'moʻtadil', 'tm.Allegretto': 'jonlanib', 'tm.Allegro': 'tez', 'tm.Vivace': 'jonli', 'tm.Presto': 'juda tez',
  'tm.note': 'Raqamlar — taxminiy moʻljal (daqiqasiga zarba); bosilganda — shu tempda sakkiz hissa.',
  'dy.pp': 'juda ohista', 'dy.p': 'ohista', 'dy.mp': 'oʻrtacha ohista', 'dy.mf': 'oʻrtacha qattiq', 'dy.f': 'qattiq', 'dy.ff': 'juda qattiq',
  'dy.note': 'Bosilganda — shu kuchda toʻrtta nota. Farq qanchalik sezilishi sozlamalardagi pianino tovushiga bogʻliq.',
  'ar.leg': 'Legato', 'ar.nonleg': 'Non legato', 'ar.stacc': 'Stakkato', 'ar.ten': 'Tenuto', 'ar.acc': 'Aksent', 'ar.marc': 'Markato', 'ar.slur': 'Notalarda legato ibora ustidagi yoy bilan belgilanadi.',
  'ar.n.leg': 'Tovushdan tovushga, oraliqsiz.', 'ar.n.nonleg': 'Har bir tovush alohida, lekin qisqartirilmaydi.', 'ar.n.stacc': 'Qisqa, uzuq-uzuq — nota ustida nuqta.', 'ar.n.ten': 'Toʻliq choʻzim bilan, ushlab turib — nota ustida chiziqcha.', 'ar.n.acc': 'Kuchli hissa ajratilgan — > belgisi.', 'ar.n.marc': 'Keskin va urgʻuli — ^ belgisi.',
  'or.grace': 'Forshlag', 'or.appog': 'Uzun forshlag', 'or.trill': 'Trel', 'or.mord': 'Mordent', 'or.mordL': 'Pastki mordent', 'or.turn': 'Gruppetto', 'or.ferm': 'Fermata', 'or.play': 'Qanday yangraydi', 'or.slow': 'Sekin',
  'or.n.grace': 'Qisqa forshlag: asosiy tovushdan oldin, uning hisobiga tez tovush; dumchasi chizib qoʻyilgan.', 'or.n.appog': 'Uzun forshlag asosiy tovush choʻzimining yarmini oladi.', 'or.n.trill': 'Butun choʻzim davomida yuqori qoʻshni bilan tez almashinish.',
  'or.n.mord': 'Asosiy — yuqori qoʻshni — asosiy, tez, hissa ichida.', 'or.n.mordL': 'Chizilgan mordent — pastki qoʻshni bilan.', 'or.n.turn': 'Toʻrt tovush: yuqori, asosiy, pastki, asosiy.', 'or.n.ferm': 'Tovush yozilganidan uzoqroq choʻziladi — ijrochi qancha hal qilsa.',
};

export const TERMS = {
  pitchT: ['Tovush balandligi', 'tovushning tebranish chastotasiga bogʻliq xossasi: tebranish qancha tez boʻlsa, tovush shuncha baland; birinchi oktava lya tovushi — 440 Gs.', 'sound'],
  duration: ['Choʻzim', 'nota yangrash vaqti; notalarda — nisbiy: butun, yarimtalik, chorak, sakkizlik, oʻn oltitalik.', 'rhythm'],
  timbre: ['Tembr', 'bir ovoz yoki cholgʻuni boshqasidan ajratib turadigan tovush rangi; obertonlarga bogʻliq.', 'sound'],
  overtone: ['Obertonlar', 'asosiy ton ustidagi, chastotasi 2, 3, 4… marta yuqori qoʻshimcha tovushlar; ularning aralashmasi tembrni belgilaydi.', 'sound'],
  staff: ['Nota yoʻli', 'notalarni yozish uchun besh chiziq; chiziqlar pastdan yuqoriga sanaladi, undan yuqori va pastda — qoʻshimcha chiziqlar.', 'sound'],
  octaveR: ['Oktava (klaviaturada)', 'do dan keyingi do gacha boʻlgan tovushlar; klaviatura oktavalari: subkontroktava, kontroktava, katta, kichik, birinchi… beshinchi.', 'sound'],
  clef: ['Kalit', 'qator boshidagi, chiziqlardagi notalar balandligini belgilovchi belgi: skripka (sol), bas (fa), do kalitlari (alt, tenor).', 'sound'],
  score: ['Partitura', 'ansambl yoki orkestrning barcha partiyalari yozuvi, har biri oʻz qatorida.', 'sound'],
  range: ['Diapazon', 'ovoz yoki cholgʻuning pastki tovushidan yuqorisigacha boʻlgan hajmi; tessitura — asar joylashgan diapazon qismi.', 'sound'],
  rest: ['Pauza', 'muayyan choʻzimdagi sukut belgisi; butun pauza butun taktdagi sukutni ham bildiradi.', 'rhythm'],
  dot: ['Nota yonidagi nuqta', 'nota yoki pauzani uning choʻzimining yarmiga uzaytiradi.', 'rhythm'],
  tie: ['Liga', 'bir xil balandlikdagi notalar orasidagi, ularni bitta tovushga birlashtiradigan yoy; turli balandlikdagi notalar ustida — legato belgisi.', 'rhythm'],
  fermata: ['Fermata', 'tovush yoki pauzani yozilganidan uzoqroq choʻzish belgisi.', 'rhythm'],
  triplet: ['Triol', 'xuddi shunday ikki nota oʻrnidagi uchta teng nota.', 'rhythm'],
  dotted: ['Punktir ritm', '«nuqtali uzun nota — qisqa nota» juftligi, koʻpincha nuqtali sakkizlik va oʻn oltitalik.', 'rhythm'],
  swing8: ['Sving sakkizliklar', 'notekis chalinadigan sakkizliklar: birinchisi uzunroq va ogʻirroq, ikkinchisi qisqaroq, taxminan triol notalari kabi.', 'rhythm'],
  metre: ['Metr', 'kuchli va kuchsiz hissalarning bir tekis almashinuvi.', 'meter'],
  bar: ['Takt', 'bir kuchli hissadan keyingisigacha boʻlgan boʻlak; takt chizigʻi kuchli hissa oldiga qoʻyiladi.', 'meter'],
  timesig: ['Oʻlcham', 'asar boshidagi kasr: taktda nechta hissa (yuqorida) va qaysi choʻzim hissa hisoblanadi (pastda).', 'meter'],
  anacrusis: ['Zatakt', 'birinchi kuchli hissa oldidagi toʻliq boʻlmagan takt.', 'meter'],
  syncopation: ['Sinkopa', 'urgʻuning kuchli hissadan undan oldingi kuchsiz hissaga koʻchishi.', 'meter'],
  semitone: ['Yarim ton va ton', 'yarim ton — tovushlar orasidagi eng kichik masofa (qoʻshni klavishlar); ton — ikki yarim ton.', 'pitch'],
  accidental: ['Alteratsiya belgilari', 'diyez, bemol, dubl-diyez, dubl-bemol, bekar: tovushni koʻtaradi, pasaytiradi yoki tiklaydi.', 'pitch'],
  enharmonic: ['Enharmonizm', 'tovushlar, intervallar yoki tonalliklarning nomlari turlicha boʻlib, balandligi teng boʻlishi: do-diyez = re-bemol.', 'pitch'],
  temperament: ['Teng temperatsiya', 'oktava oʻn ikkita teng yarim tonga boʻlingan tizim.', 'pitch'],
  lad: ['Lad', 'bosh tovush — tonika atrofidagi tovushlar munosabatlari tizimi: major, minor, xalq ladlari.', 'mode'],
  tonicT: ['Tonika (tovush)', 'ladning bosh, eng barqaror tovushi — I pogʻona.', 'mode'],
  stable: ['Barqaror pogʻonalar', 'ladning I, III va V pogʻonalari; beqarorlari (II, IV, VI, VII) eng yaqin barqarorlariga intiladi.', 'mode'],
  leadingtone: ['Kirish tovushi', 'tonikaga qoʻshni pogʻona: VII (pastki kirish tovushi) yoki II (yuqori kirish tovushi).', 'mode'],
  tetrachord: ['Tetraxord', 'sof kvarta doirasida sekundalar boʻylab toʻrt tovush; major gamma — oraligʻi ton boʻlgan ikkita bir xil tetraxord.', 'mode'],
  harmmaj: ['Garmonik major', 'VI pogʻonasi pasaytirilgan major.', 'mode'],
  keyT: ['Tonallik', 'muayyan balandlikdagi lad: tonika va lad turi (do major, lya minor).', 'keys'],
  relkey: ['Parallel tonalliklar', 'kalit belgilari bir xil boʻlgan major va minor: do major va lya minor.', 'keys'],
  parkey: ['Nomdosh tonalliklar', 'tonikasi umumiy boʻlgan major va minor: do major va do minor.', 'keys'],
  kinship: ['Qardosh tonalliklar', 'berilgan tonallikdan koʻpi bilan bitta belgi bilan farq qiladigan tonalliklar.', 'keys'],
  transpose: ['Transpozitsiya', 'musiqani boshqa tonallikka koʻchirish — pogʻonalar yoki interval boʻyicha.', 'keys'],
  melody: ['Kuy', 'bitta ovoz bilan ifodalangan musiqiy fikr.', 'melody'],
  motif: ['Motiv', 'kuyning eng kichik tugallangan boʻlagi, odatda bitta kuchli hissali.', 'melody'],
  phrase: ['Ibora', 'kuyning sezuradan sezuragacha boʻlgan qismi; bir nechta ibora jumlani tashkil etadi.', 'melody'],
  period: ['Period', 'tugallangan musiqiy fikr, odatda ikki jumladan: savol va javob.', 'melody'],
  mcad: ['Kuy kadensiyasi', 'iboraning kuyning oxirgi pogʻonalari boʻyicha tugashi: toʻliq (tonikada), nomukammal (III yoki V da), yarim (beqaror tovushda).', 'melody'],
  sequenceT: ['Sekvensiya', 'aylanmani boshqa pogʻonadan takrorlash: tonal (lad pogʻonalari boʻylab) yoki modulyatsiyalovchi (aniq intervalga).', 'melody'],
  reprise: ['Repriza', 'asar qismini takrorlash belgisi; boshlangʻich musiqa qaytadigan boʻlim ham shunday ataladi.', 'melody'],
  volta: ['Volta', 'qismning birinchi va ikkinchi oʻtishdagi yakunini belgilovchi raqamli qavs.', 'melody'],
  coda: ['Koda', 'asarning yakunlovchi boʻlimi.', 'melody'],
  verseform: ['Kuplet shakli', 'har bir kupletda yangi soʻzlar bilan takrorlanadigan bir xil musiqa, koʻpincha naqarot bilan.', 'melody'],
  tempo: ['Temp', 'ijro tezligi — daqiqadagi hissalar soni; soʻzlar (Andante, Allegro) yoki metronom bilan belgilanadi.', 'perform'],
  dynamics: ['Dinamika', 'ovoz kuchi va uning oʻzgarishlari: pp, p, mp, mf, f, ff, crescendo, diminuendo.', 'perform'],
  articulation: ['Shtrixlar', 'tovushlarni chiqarish va bogʻlash usullari: legato, non legato, staccato, tenuto, aksent.', 'perform'],
  ornament: ['Melizmlar', 'tovushning mayda bezaklari: forshlag, trel, mordent, gruppetto.', 'perform'],
  trill: ['Trel', 'tovushning yuqori qoʻshnisi bilan tez almashinishi.', 'perform'],
};

export const NN = ['do', 're', 'mi', 'fa', 'sol', 'lya', 'si'];
// Sheʼrlar: t — nomi, l — qator (kuchli boʻgʻinlar bosh harflarda, boʻgʻinlar chiziqcha bilan), n — izoh
export const VERSE = [
  { t: 'Ikki hissa', l: 'LAY-lak KEL-di YOZ boʻl-DI', n: 'Barmoq vazni, 7 boʻgʻin (4 + 3). Bolalar aytganda kuchli hissalar odatda boʻgʻin oralab tushadi: «LAY-lak | KEL-di» — ikki hissali metr, har bir juftlik 2/4 dagi takt kabi. Bu soʻz urgʻusi emas, aytim urgʻusi: oʻzbek tilida soʻz urgʻusi odatda oxirgi boʻgʻinda. (Xalq bolalar qoʻshigʻi)' },
  { t: '4 + 3', l: 'BOY-che-cha-gim BOY-lan-di', n: 'Barmoqda boʻgʻinlar soni va turoqlar — pauza bilan ajraladigan guruhlar — hisoblanadi. Bu yerda 4 + 3 boʻgʻin: turoq boshi — tayanch nuqta, guruhlar esa 7/8 dagi 4 + 3 kabi teng emas. (Xalq qoʻshigʻi «Boychechak»)' },
  { t: '4 + 4 + 3', l: 'XALQ den-giz-dir XALQ toʻl-qin-dir XALQ kuch-dir', n: '11 boʻgʻin, 4 + 4 + 3 turoq: har bir turoq «xalq» soʻzidan boshlanadi va uning boshi kuchli joy boʻladi — guruhlari teng boʻlmagan aralash oʻlchamga oʻxshaydi. Mumtoz sheʼriyatning boshqa tizimi — aruz — uzun va qisqa boʻgʻinlar almashinuviga qurilgan va musiqadagi choʻzimlarga yaqin. (Choʻlpon, «Xalq»)' },
];

export const CH = [
{ id: 'sound', t: 'Tovush va uning yozuvi', s: 'Tovush xossalari, obertonlar, notalar, kalitlar, oktavalar, diapazonlar', src: 'maksimov,fridkin', h: `
<p>Musiqa — tovushlar sanʼati, uning qonunlarini «quruq» emas, qoʻlda cholgʻu va oʻz ovozi bilan oʻrgangan maʼqul: har qanday qoidaning bosh hakami — eshitish. Darslikning bu qismi — alifbo: tovush qanday tuzilgan, qanday yoziladi va qanday ataladi.</p>
<h3>Tovushning toʻrt xossasi</h3>
<p>Musiqiy tovushning toʻrt xossasi bor: [[pitchT|balandlik]], [[duration|choʻzim]], kuch va [[timbre|tembr]]. Balandlik tebranish chastotasiga bogʻliq: qancha tez boʻlsa, shuncha baland. Sozlash uchun tayanch tovush — birinchi oktava lya tovushi, soniyasiga 440 tebranish (440 Gs): orkestr shunga qarab sozlanadi, ilovaning tyuneri ham shunga tayanadi. Nota yozuvi ikki xossani birdaniga koʻrsatadi: balandlikni — notaning nota yoʻlidagi oʻrni bilan, choʻzimni — uning koʻrinishi bilan. Kuch va xarakter soʻzlar va belgilar bilan yoziladi — ular haqida shu qismning oxirgi bobida.</p>
<h3>Obertonlar</h3>
<p>Tor, truba yoki ovoz tovushi — bitta chastota emas. Asosiy ton bilan birga qoʻshimcha tovushlar — [[overtone|obertonlar]] — yangraydi, ularning chastotasi 2, 3, 4 va undan koʻp marta yuqori. Alohida ular deyarli eshitilmaydi, lekin ularning aralashmasi skripkani fleytadan ajratadi: bu tembrning oʻzi. Obertonlar qatori doim bir xil: oktava, kvinta, kvarta, katta tersiya, kichik tersiya, keyin esa intervallar tobora maydalashadi. Qatorning birinchi olti tovushi major uchtovushni hosil qiladi — tabiatning oʻzi eng barqaror akkordni koʻrsatadi.</p>
${lab('overtones')}
<h3>Nota yoʻli</h3>
<p>Notalar [[staff|nota yoʻliga]] — pastdan yuqoriga sanaladigan besh parallel chiziqqa yoziladi. Nota chiziqda yoki chiziqlar orasida turadi; nota yoʻlidan yuqori va pastda u qisqa qoʻshimcha chiziqlarga qoʻyiladi. Nota nota yoʻlida qancha baland tursa, tovush shuncha baland. Yarimtalik, chorak va undan qisqa notalarning tayoqchasi bor: uchinchi chiziqdan pastdagi notalarda u kallakning oʻng tomonidan yuqoriga, uchinchi chiziq va undan yuqoridagilarda — chap tomonidan pastga yoʻnaladi.</p>
<h3>Tovushlar nomi</h3>
<p>Asosiy tovushlar yettita: do, re, mi, fa, sol, lya, si; keyin nomlar doira boʻylab takrorlanadi. Klaviaturada ularni qora klavishlar boʻyicha topish oson: do — ikkita qora klavish guruhidan chapdagi oq klavish, fa — uchtalik guruhdan chapdagisi.</p>
<table class="bktab"><tr><th>Boʻgʻin</th><td>do</td><td>re</td><td>mi</td><td>fa</td><td>sol</td><td>lya</td><td>si</td></tr><tr><th>Harf</th><td>C</td><td>D</td><td>E</td><td>F</td><td>G</td><td>A</td><td>B (H)</td></tr></table>
<p>Boʻgʻinlardan tashqari tovushlar harflar bilan ham belgilanadi. Ilovada va jazda ingliz yozuvi qabul qilingan: C D E F G A B. Nemis anʼanasida va unga ergashgan darsliklarda si — bu H, B harfi esa si-bemolni bildiradi; koʻtarish u yerda -is qoʻshimchasi bilan (Fis — fa-diyez), pasaytirish — -es bilan belgilanadi (Des — re-bemol; istisnolar — Es, As va B). Buni eski notalarni oʻqishda bilish kerak: nemis partiturasidagi «B» va jaz varaqasidagi «B» — turli tovushlar.</p>
<h3>Oktavalar</h3>
<p>Do dan keyingi do gacha boʻlgan tovushlar [[octaveR|oktavani]] tashkil etadi. Royalda 88 klavish bor — yettita toʻliq oktava va yana toʻrt tovush. Har bir oktavaning oʻz nomi bor: klaviatura oʻrtasida — birinchi oktava, pastda — kichik, katta, kontroktava va subkontroktava, yuqorida — ikkinchi, uchinchi, toʻrtinchi va beshinchi (undan royalda faqat do bor). Xalqaro yozuvda oktavalar raqamlanadi: birinchi oktava do tovushi — C4, birinchi oktava lya tovushi — A4. Bu yozuv tyunerda, MIDI da va ilova studiyasida uchraydi.</p>
${lab('octaves')}
<h3>Kalitlar</h3>
<p>Nota yoʻlidagi bitta oʻrin turli tovushlarni bildirishi mumkin — buni qator boshidagi [[clef|kalit]] hal qiladi. Skripka kaliti (sol kaliti) birinchi oktava sol tovushini ikkinchi chiziqqa bogʻlaydi: u shu chiziq atrofidagi jingalakdan boshlab chiziladi. Bas kaliti (fa kaliti) kichik oktava fa tovushini ikki nuqta orasidagi toʻrtinchi chiziqqa qoʻyadi. Do kalitlari birinchi oktava do tovushini belgilaydi: alt kaliti — uchinchi chiziqda (alt uchun shunday yoziladi), tenor kaliti — toʻrtinchida (violonchel, fagot, trombonning yuqori partiyalari). Birinchi oktava do tovushi skripka kalitida pastdan birinchi qoʻshimcha chiziqqa, bas kalitida esa yuqoridan birinchi qoʻshimcha chiziqqa yoziladi: kalitlar shu yerda uchrashadi.</p>
${lab('clefs')}
${tip('Qoʻshimcha chiziqlarni koʻpaytirmaslik uchun baland kuy bas kalitidan skripka kalitiga (va aksincha) koʻchiriladi yoki 8va belgisi bilan oktava pastroq yoziladi. Tenor partiyasi anʼanaga koʻra skripka kalitida yoziladi, lekin yozilganidan oktava past yangraydi — xuddi gitara kabi.')}
<h3>Qatorlar va partitura</h3>
<p>Ovoz, gitara yoki puflama cholgʻu partiyasi bitta qatorga yoziladi. Fortepiano, bayan va arfa — figurali qavs bilan birlashtirilgan ikkita qatorga: oʻng qoʻl odatda skripka kalitida, chap qoʻl — bas kalitida. Joʻrnavozli qoʻshiq — uchta qatorga: ovoz va fortepiano. Ansambl yoki orkestrning barcha partiyalarining birining ostida biri yozuvi — [[score|partitura]]: unda yigirma va undan koʻp qator boʻladi.</p>
<h3>Diapazon va registr</h3>
<p>[[range|Diapazon]] — ovoz yoki cholgʻuning eng past tovushidan eng balandigacha boʻlgan masofa. Diapazon ichida registrlar farqlanadi — past, oʻrta va baland, har birining oʻz tembri bor. Tessitura — muayyan asar joylashgan diapazon qismi: qoʻshiq xonanda diapazoniga sigʻishi va baribir u uchun noqulay boʻlishi mumkin, agar uzoq vaqt chetda tursa. Xonandalik ovozlari: ayollarniki — soprano, metso-soprano, alt (kontralto); erkaklarniki — tenor, bariton, bas.</p>
${lab('ranges')}
${key('Nota — birdaniga ikki belgi: nota yoʻlidagi oʻrni — balandlik, nota koʻrinishi — choʻzim. Qaysi oʻrinda qaysi tovush turishini kalit hal qiladi.')}
` },
{ id: 'rhythm', t: 'Choʻzimlar va pauzalar', s: 'Butun, yarimtalik, chorak; nuqta, liga, triol; tekis va sving sakkizliklar', src: 'maksimov,fridkin', h: `
<p>Balandlik qaysi tovush ekanini aytadi, [[duration|choʻzim]] — u qancha yangrashini. Notalarda choʻzim mutlaq emas: butun nota «ikki soniya» emas, berilgan tempdagi toʻrtta sanoq hissasi qancha boʻlsa, shuncha davom etadi. Shuning uchun choʻzimlar — nisbatlar: har bir keyingisi oldingisidan ikki marta qisqa.</p>
<h3>Asosiy boʻlinish</h3>
<p>Butun (tayoqchasiz oq kallak) = ikki yarimtalik (tayoqchali oq) = toʻrt chorak (tayoqchali qora) = sakkiz sakkizlik (bitta bayroqchali qora) = oʻn olti oʻn oltitalik (ikki bayroqchali). Bayroqchalar qancha koʻp boʻlsa, nota shuncha qisqa; qora doim oqdan qisqa. Sxemaning har bir qatori bosilganda tekis hissalar fonida yangraydi.</p>
${lab('durs')}
<p>Ikki koʻnikmani birga egallash foydali: yirik choʻzimni maydalarga boʻlish (yarimtalik — ikki chorak yoki toʻrt sakkizlik) va maydalarini yirikka birlashtirish (bitta tovush bilan chalingan uchta sakkizlik — nuqtali chorak). Shunda ritm nota-ma-nota emas, guruhlar bilan oʻqiladi.</p>
<h3>Pauzalar</h3>
<p>Sukutning ham aniq choʻzimi bor — bu [[rest|pauzalar]]. Har bir choʻzimga oʻz pauzasi mos keladi: butun — toʻrtinchi chiziq ostidagi toʻrtburchak, yarimtalik — uchinchi chiziq ustidagi toʻrtburchak, chorak, sakkizlik va oʻn oltitalikning oʻz belgilari bor. Butun pauza istalgan oʻlchamda butun takt sukutini ham bildiradi. Pauza — «tuynuk» emas, tinish belgisi: unda ibora nafas oladi. Ritmdagi eng koʻp uchraydigan xato — pauzani oxirigacha sanamaslik.</p>
<h3>Nuqta, liga, fermata</h3>
<p>Notaning oʻng tomonidagi [[dot|nuqta]] uni yarmiga uzaytiradi: nuqtali yarimtalik — uch chorak, nuqtali chorak — uch sakkizlik. [[tie|Liga]] — bir xil balandlikdagi ikki nota orasidagi yoy — ularni bitta tovushga birlashtiradi: taktga yoki hissaga sigʻmaydigan choʻzim shunday yoziladi. Turli balandlikdagi notalar ustidagi yoy — endi choʻzim ligasi emas, bogʻlab ijro etish belgisi (legato). [[fermata|Fermata]] — nota yoki pauza ustidagi nuqtali yarim doira: tovush yozilganidan uzoqroq, ijrochi qancha hal qilsa, shuncha choʻziladi.</p>
<h3>Guruhlash</h3>
<p>Bir hissa ichidagi sakkizlik va oʻn oltitaliklar alohida bayroqchalar oʻrniga umumiy qovurgʻa bilan birlashtiriladi — shunda koʻz takt hissalarini darhol koʻradi. Eski vokal notalarda turli boʻgʻinlarga tushadigan notalar alohida yozilgan; hozir vokal partiyalarda ham hissalar boʻyicha guruhlanadi.</p>
<h3>Triol va punktir</h3>
<p>[[triplet|Triol]] — xuddi shunday ikki nota oʻrnidagi uchta teng nota: qavs va 3 raqami bilan yozilgan uchta sakkizlik bitta chorak vaqtida yangraydi. Kvintollar (toʻrt oʻrniga besh) va boshqa maxsus boʻlinishlar ham boʻladi. Koʻp uchraydigan xato — triolni birinchi yoki oxirgi notani uzaytirib, notekis chalish: uchala tovush teng.</p>
<p>[[dotted|Punktir ritm]] — «nuqtali sakkizlik va oʻn oltitalik» juftligi. Uni aniq chalishning ishonchli usuli — ichida hissaga toʻrtta oʻn oltitalik sanash va tovushlarni birinchi va toʻrtinchisida olish.</p>
<h3>Tekis va sving sakkizliklar</h3>
<p>Bu yerda musiqa savodi jaz bilan uchrashadi. Klassikada va Lotin Amerikasi musiqasida sakkizlik juftlari tekis. Jazda sakkizliklar xuddi shunday yoziladi, lekin [[swing8|sving bilan]] chalinadi: juftning birinchi sakkizligi uzunroq va ogʻirroq, ikkinchisi qisqaroq va yengilroq — taxminan triolning birinchi va uchinchi notalari kabi. Aniq nisbat temp va uslubga bogʻliq: sekin balladada sving chuqurroq, tez tempda sakkizliklar deyarli tekis. Ritm toʻri ikkala variantda yangraydi; kataklar bosiladi — oʻz ritmini tuzish mumkin.</p>
${lab('rgrid')}
${tip('Ritmni tana bilan oʻrganish eng ishonchli: hissalarni oyoq bilan urib, ritmni — kaftlar yoki boʻgʻinlar bilan («ta — ti-ti»). Avval sekin, ilova metronomi bilan, keyingina tezroq.')}
${key('Choʻzimlar — nisbatlar: har biri oldingisidan ikki marta qisqa, nuqta yarmini qoʻshadi, triol hissani uchga boʻladi. Pauza ham tovush kabi aniq sanaladi.')}
` },
{ id: 'meter', t: 'Metr, oʻlcham, takt', s: 'Kuchli va kuchsiz hissalar, oʻlchamlar, taktni koʻrsatish, zatakt, sinkopa', src: 'maksimov,fridkin', h: `
<p>Ritm — choʻzimlar chizmasi. Uning ostida hissalarning bir tekis pulsatsiyasi boradi, hissalar esa teng huquqli emas: birlari salmoqliroq (kuchli), boshqalari yengilroq (kuchsiz) yangraydi. Kuchli va kuchsiz hissalarning bir tekis almashinuvi [[metre|metr]] deyiladi.</p>
<h3>Sheʼrdagi metr</h3>
<p>Kuchli hissani sheʼrda eshitish eng oson. Oʻzbek xalq sheʼriyati barmoq vaznida: qatordagi boʻgʻinlar soni va ularning turoqlarga — pauza bilan ajraladigan guruhlarga — boʻlinishi hisoblanadi. «Boychechagim boylandi» — 4 + 3 boʻgʻin, xuddi 7/8 dagi 4 + 3 guruhlar kabi. Bolalar qoʻshigʻi «Laylak keldi, yoz boʻldi» aytilganda kuchli hissalar boʻgʻin oralab tushadi — bu ikki hissali metr. Mumtoz sheʼriyatning aruz vazni esa uzun va qisqa boʻgʻinlar almashinuviga qurilgan — bu musiqadagi choʻzimlarga yaqin. Qator har bir kuchli boʻgʻin oldidan chiziqlar bilan boʻlinsa, taktlar hosil boʻladi: sheʼr turogʻi va musiqa takti bir xil tuzilgan. Qator kuchsiz boʻgʻindan boshlansa, bu boʻgʻin birinchi chiziqdan oldin qoladi — bu zatakt.</p>
${lab('verse')}
<h3>Takt va oʻlcham</h3>
<p>[[bar|Takt]] — bir kuchli hissadan keyingisigacha boʻlgan boʻlak. Takt chizigʻi kuchli hissa oldiga, asar oxirida — qoʻsh chiziq qoʻyiladi. [[timesig|Oʻlcham]] boshida kasr bilan yoziladi: yuqori son — taktda nechta hissa, pastki — qaysi choʻzim hissa hisoblanadi. 3/4 — chorakdan uch hissa; 6/8 — sakkizlikdan olti hissa.</p>
<h3>Oddiy, murakkab, aralash</h3>
<p>Oddiy oʻlchamda bitta kuchli hissa bor: 2/4, 3/4, 3/8. Murakkab oʻlcham — bir xil oddiy oʻlchamlarning qoʻshilishi: 4/4 = 2/4 + 2/4 (uchinchi hissa — «nisbatan kuchli»; bu oʻlcham C harfi bilan ham belgilanadi), 6/8 = 3/8 + 3/8, 9/8 va 12/8 — uchtadan sakkizlikli uch va toʻrt guruh. Aralash oʻlcham turli oddiy oʻlchamlardan tuziladi: 5/4 = 3 + 2 yoki 2 + 3, 7/8 = 2 + 2 + 3. Oʻzgaruvchan oʻlcham ham boʻladi — u asar davomida oʻzgaradi, choʻziq xalq qoʻshiqlaridagi kabi. Chizilgan C — alla breve: 2/2 takt, yarimtaliklar bilan «bir — ikki» sanaladi, odatda jonli tempda.</p>
${lab('meter')}
<h3>Taktni koʻrsatish</h3>
<p>Dirijyorlar va ansambldagi musiqachilar hissalarni qoʻl bilan koʻrsatadi: «bir» — doim pastga, oxirgi hissa — yuqoriga. Uchga — pastga, oʻngga, yuqoriga; toʻrtga — pastga, chapga, oʻngga, yuqoriga. Yuqoridagi sxema sanoq davomida yonib boradi; uni qoʻl bilan takrorlash — oʻlchamni his qilishning eng yaxshi usuli.</p>
<h3>Sanoq hissasi</h3>
<p>Kuy sakkizliklar bilan harakatlansa, sanoq birligi sifatida sakkizlikni olish qulay: «bir-va, ikki-va». Choʻzimlar qancha mayda boʻlsa, sanoq shuncha diqqatli boʻladi: oʻn oltitaliklar «bir-va-ta-va» deb sanaladi.</p>
<h3>Zatakt</h3>
<p>[[anacrusis|Zatakt]] — asar yoki ibora boshidagi, birinchi kuchli hissa oldidagi toʻliq boʻlmagan takt. 2/4 da zatakt odatda ikkinchi hissadan, 3/4 da — ikkinchi yoki uchinchidan boshlanadi; zataktdagi sakkizliklar «ikki-va» deb sanaladi. Zatakt choʻzimi odatda asarning oxirgi taktida «toʻldiriladi».</p>
<h3>Sinkopa</h3>
<p>[[syncopation|Sinkopa]] — urgʻuning kuchli hissadan undan oldingi kuchsiz hissaga koʻchishi: tovush kuchsiz joyda boshlanib, kuchli joy orqali choʻziladi. Sinkopa takt ichida va takt chizigʻi orqali (liga bilan) boʻladi; kuchli hissadagi pauza ham yaqin samara beradi. Jazda sinkopa — iboralashning asosi; hissadan sakkizlik oldin olingan akkord oldindan olish deyiladi («Akkompanement» bobi).</p>
${lab('syncop')}
${key('Oʻlcham taktda nechta hissa borligini va ulardan qaysilari kuchli ekanini aytadi; ritm — hissalar ustida nima boʻlayotganini. Avval metr, keyin ritm: hissalarni notalarni oʻqishdan oldin his qilish kerak.')}
` },
{ id: 'pitch', t: 'Ton, yarim ton, belgilar', s: 'Tovushlar orasidagi masofalar, diyez va bemollar, enharmonizm, temperatsiya', src: 'maksimov,fridkin', h: `
<p>Fortepianoning qoʻshni klavishlari orasida — oq va qora yoki oralarida qorasi yoʻq ikki oq klavish orasida — Gʻarb musiqasidagi eng kichik masofa bor: [[semitone|yarim ton]]. Ikki yarim ton bir tonni tashkil etadi. Oq klavishlarda yarim tonlar faqat ikki joyda bor: mi — fa va si — do; qolgan qoʻshni oq klavishlar bir-biridan ton masofada.</p>
<h3>Alteratsiya belgilari</h3>
<p>Tovushni koʻtarish yoki pasaytirish uchun nota oldiga [[accidental|alteratsiya belgilari]] yoziladi: diyez ♯ yarim tonga koʻtaradi, bemol ♭ yarim tonga pasaytiradi, dubl-diyez 𝄪 va dubl-bemol 𝄫 — tonga, bekar ♮ belgini bekor qiladi. Oʻzgartirilgan pogʻona nomini saqlaydi: fa-diyez — bu hamon «fa», faqat balandroq. Kalit belgilari butun asarda va barcha oktavalarda amal qiladi; tasodifiy belgilar — faqat takt oxirigacha va faqat shu oktavadagi shu nota uchun.</p>
${lab('semis')}
<h3>Oktavaning oʻn ikki tovushi</h3>
<p>Oktavada oʻn ikkita yarim ton bor: yettita asosiy pogʻona va beshta hosila. Har bir qora klavishning kamida ikki nomi bor: do-diyez va re-bemol, fa-diyez va sol-bemol. Balandligi bir xil, nomlari turlicha tovushlar [[enharmonic|enharmonik teng]] deyiladi. Oq klavishlarning ham boshqa nomlari bor: mi-diyez fa kabi, do-bemol — si kabi, si-dubl-diyez — do-diyez kabi yangraydi. Qaysi nomni tanlashni tonallik va kuy yoʻnalishi hal qiladi — bu haqda gammalar va akkordlar boblarida.</p>
${lab('enh')}
<h3>Diatonik va xromatik yarim ton</h3>
<p>Yarim ton ikki xil yoziladi. Diatonik — qoʻshni harflar orasida (mi — fa, do — re-bemol); xromatik — harf va uning oʻzgartirilgan varianti orasida (fa — fa-diyez). Fortepianoda ular bir xil yangraydi, lekin yozuvda bular turli narsalar: gammada har bir harf bir marta uchraydi, shuning uchun sol majorda yettinchi pogʻona — fa-diyez, sol-bemol emas. Diatonik ton (do — re) va xromatik ton (do — do-dubl-diyez) ham shunday farqlanadi.</p>
<h3>Temperatsiya</h3>
<p>Fortepiano, bayan va gitara [[temperament|teng temperatsiyada]] sozlangan: oktava oʻn ikkita teng yarim tonga boʻlingan — shuning uchun ularda istalgan tonallikda chalish mumkin. Balandligi qotirilmagan xonandalar va skripkachilar moslashuvchanroq intonatsiya qiladi: tonikaga intiluvchi kirish tovushini biroz balandroq, minor tersiyasini esa biroz pastroq oladi va ularda yarim tonlar turlicha chiqadi. Shuning uchun fortepianosiz xor yoki torli kvartet temperatsiyalangan tizimdan «shirinroq» yangraydi — va shuning uchun eshitish klavishdan muhimroq.</p>
${tip('Do dan do gacha xromatik gammani — yarim tonlab yuqoriga va pastga — kuylab, ilova tyuneri bilan oʻzini tekshirish foydali: ovoz bilan tekis yarim tonlar — intonatsiyaning yaxshi maktabi.')}
${key('Yarim ton — qoʻshni klavishlar, ton — bittadan keyingisi. Belgi balandlikni oʻzgartiradi, lekin pogʻona nomini emas; bitta klavishning bir nechta nomi boʻlishi mumkin va nom tonallikka qarab tanlanadi.')}
` },
{ id: 'mode', t: 'Lad va gamma', s: 'Tonika, pogʻonalar, major va minor, barqarorlik va intilishlar, tetraxordlar', src: 'maksimov,fridkin', h: `
<p>Har qanday qoʻshiqda hamma narsa qaytib keladigan bosh tovush bor — [[tonicT|tonika]]. Uni eshitish oson: kuy koʻpincha tonikadan boshlanadi va deyarli doim tonikada tugaydi, undan keyin davom ettirish istagi qolmaydi. Tonika atrofidagi tovushlar munosabatlari tizimi — qaysilari barqaror, qaysilari qoʻshnilariga intiladi — [[lad|lad]] deyiladi. Yevropa musiqasining ikki bosh ladi — major va minor: nemischa dur («qattiq») va moll («yumshoq»).</p>
<h3>Kuydan tovushqator</h3>
<p>Ladni bevosita kuydan «chiqarib olish» mumkin. Uning har bir tovushi bir martadan yozilib, balandlik boʻyicha joylashtirilsa — tovushqator hosil boʻladi. Tonika topilib (eshitib: kuy tinchlanadigan tovush), pogʻonalar tonikadan rim raqamlari bilan raqamlansa — kuy lad pogʻonalari boʻylab yoʻl sifatida oʻqiladi. Bunday kuyni istalgan tovushdan kuylash mumkin: notalar nomi emas, pogʻonalar muhim.</p>
${lab('tonic')}
<p>[[scale|Gamma]] — lad tovushlari tonikadan uning oktava yuqoridagi takroriga qadar tartib bilan: sakkiz pogʻona, sakkizinchisi birinchisini takrorlaydi. Kuylarda gamma toʻliq holda kam uchraydi, lekin uning boʻlaklari deyarli har qanday ohangdor kuyda bor.</p>
<h3>Major</h3>
<p>Major gamma quyidagi formula bilan quriladi: ton — ton — yarim ton — ton — ton — ton — yarim ton. Yarim tonlar III va IV hamda VII va I pogʻonalar orasida turadi. Do dan formula faqat oq klavishlarda chiqadi. Agar u sol dan qurilsa, yettinchi pogʻona fa-diyez boʻladi — aks holda tonika oldida yarim ton boʻlmaydi. Kalit belgilari shundan kelib chiqadi: ular oʻylab topilmagan, formuladan kelib chiqadi.</p>
${lab('majsteps')}
<h3>Barqaror va beqaror pogʻonalar</h3>
<p>Tonika uchtovushining tovushlari — I, III va V pogʻonalar — [[stable|barqaror]]: ularda toʻxtash mumkin. Qolganlari — II, IV, VI, VII — beqaror va eng yaqin barqaror tovushga intiladi: VII — yuqoriga, I ga (yarim ton bilan, eng kuchli intilish), IV — pastga, III ga, VI — pastga, V ga, II — ham pastga, I ga, ham yuqoriga, III ga. Tonikaning qoʻshnilari, VII va II, [[leadingtone|kirish tovushlari]] deyiladi. Barqaror tovush qoʻshni beqarorlar bilan oʻralganda (VII — II — I), bu oʻrab olish: tonika maqsad kabi yangraydi.</p>
${lab('pull')}
<p>Ladning uch pogʻonasi — bosh pogʻonalar: I — tonika, IV — subdominanta, V — dominanta. Bosh akkordlar ularda quriladi; funksiyalar haqida batafsil — «Tonallik va funksiyalar» bobida.</p>
<h3>Tetraxordlar</h3>
<p>[[tetrachord|Tetraxord]] — sof kvarta doirasida sekundalar boʻylab toʻrt tovush. Major gamma — oraligʻi ton boʻlgan ikkita bir xil «ton — ton — yarim ton» tetraxordi. Do majorning yuqori tetraxordi (sol — lya — si — do) — sol majorning pastki tetraxordi; sol majorni toʻldirish uchun yuqoridan fa-diyezli yangi tetraxord kerak. Bu qadam takrorlansa, har bir yangi tonallik kvintaga yuqoriroq va bitta diyezga boyroq boʻladi — kvinta doirasi shunday paydo boʻladi. Tetraxordlar toʻrt xil: major, minor (ton — yarim ton — ton), frigiy (yarim ton — ton — ton) va garmonik (yarim ton — bir yarim ton — yarim ton).</p>
${lab('tetra')}
<h3>Minor: uch turi</h3>
<p>Minorda yarim tonlar II va III hamda V va VI pogʻonalar orasida turadi. Tabiiy minor — oʻzgarishsiz pogʻonalar. Garmonik — VII pogʻonasi koʻtarilgan: kirish tovushi va tonikaga kuchli intilish paydo boʻladi, VI va VII orasida esa xarakterli orttirilgan sekunda. Melodik — yuqoriga harakatda VI va VII koʻtarilgan; klassik musiqada pastga u tabiiy kabi kuylanadi (koʻtarishlarni bekar bekor qiladi). Jazda melodik minor yuqoriga va pastga bir xil — bu mustaqil gamma, u haqda «Garmoniya asoslari» qismida soʻz boradi.</p>
<p>Majorni minordan birinchi uch pogʻona boʻyicha ajratish mumkin: majorda ular orasida yarim ton yoʻq, minorda yarim ton II va III orasida turadi. Aralash lad ham bor — [[harmmaj|garmonik major]]: VI pogʻonasi pasaytirilgan major. U majorga minor rangini beradi: undagi subdominanta minor (do majorda — fa — lya-bemol — do).</p>
${lab('minors')}
${key('Lad — notalar toʻplami emas, munosabatlar: tonika, barqaror va beqaror pogʻonalar, intilishlar. Boshqa notadan kuylangan kuy oʻzligicha qoladi, chunki pogʻonalarini saqlaydi.')}
` },
{ id: 'keys', t: 'Tonalliklar', s: 'Kalit belgilari, parallel va nomdosh, kvinta doirasi, qardoshlik, transpozitsiya', src: 'maksimov,fridkin', h: `
<p>[[keyT|Tonallik]] — muayyan balandlikdagi lad: tonika va lad turi. Do major, lya minor, mi-bemol major — turli tonalliklar. Ular nega bunchalik koʻp? Musiqadagi yangi fikr koʻpincha yangi tonallikda yangraydi. Cholgʻu sozlanishi baʼzi tonalliklarni boshqalaridan qulayroq qiladi: gitaraga sol, re, mi va lya qulay, puflama cholgʻularga — bemolli tonalliklar. Ovozga qoʻshiq diapazon oʻrtasiga tushadigan tonallik qulay — shuning uchun bitta qoʻshiqni turli xonandalar turli tonalliklarda kuylaydi.</p>
<h3>Kalit belgilari</h3>
<p>Tonallik belgilari har bir qator boshida yoziladi — bular kalit belgilari. Diyezlar tartibi doim bir xil: fa, do, sol, re, lya, mi, si; bemollar tartibi — teskari: si, mi, lya, re, sol, do, fa. Belgilar boʻyicha major tonallikni topish oson: oxirgi diyez — VII pogʻona (tonika yarim ton yuqorida), oxiridan ikkinchi bemol — tonikaning oʻzi (bitta bemol esa — fa major). Har bir belgilar toʻplami ikki tonallikka tegishli — majorga va unga parallel minorga.</p>
${lab('keysig')}
<h3>Parallel va nomdosh</h3>
<p>[[relkey|Parallel tonalliklar]] — belgilari bir xil major va minor: do major va lya minor, sol major va mi minor. Minor tonikasi — majorning VI pogʻonasi, uning tonikasidan kichik tersiya pastda. Parallellar hatto bitta qoʻshiq ichida ham tez-tez almashadi. [[parkey|Nomdosh tonalliklar]] — tonikasi umumiy major va minor: do major va do minor; ularning III, VI va VII pogʻonalari va belgilar soni turlicha (do minorda uchta bemol).</p>
<h3>Hammasi boʻlib nechta tonallik</h3>
<p>Yettita asosiy tonika, beshta hosila va uchta enharmonik nom yettitagacha belgili oʻn beshtadan major va minor tonallikni beradi. Uch juft bir xil yangraydi — bular enharmonik teng tonalliklar: si major = do-bemol major, fa-diyez major = sol-bemol major, do-diyez major = re-bemol major (va ularning parallel minorlari).</p>
<h3>Kvinta doirasi</h3>
<p>Tonalliklar har bir keyingisi kvintaga yuqori boʻladigan qilib tizilsa, [[circle|kvinta doirasi]] hosil boʻladi: qoʻshni tonalliklar bitta belgi bilan farq qiladi, oʻn ikki qadamdan keyin doira yopiladi. Soat strelkasi boʻyicha diyezlar, teskari — bemollar qoʻshiladi. Doira tetraxordlar nega gammadan gammaga «oʻtishini» tushuntiradi va istalgan tonallikning qoʻshnilarini koʻrsatadi.</p>
${lab('circle')}
<h3>Tonalliklar qardoshligi</h3>
<p>[[kinship|Qardosh tonalliklar]] berilgan tonallikdan koʻpi bilan bitta belgi bilan farq qiladi. Do majorda ular beshta: lya minor (parallel), sol major va mi minor (dominanta va uning paralleli), fa major va re minor (subdominanta va uning paralleli). Garmonik lad orqali qardoshlik ham bor: major uchun — minor subdominanta tonalligi (do major — fa minor), minor uchun — major dominanta tonalligi (do minor — sol major). Musiqa modulyatsiya qilganda aynan qardosh tonalliklarga eng koʻp oʻtadi.</p>
${lab('related')}
<h3>Bitta tovush — turli pogʻonalar</h3>
<p>Istalgan tovush istalgan pogʻona boʻlishi mumkin: do — do majorning I pogʻonasi, si-bemol majorning II, lya-bemol majorning III, sol majorning IV, fa majorning V, mi-bemol majorning VI, re-bemol majorning VII pogʻonasi. Tovush rolini oʻzgartirganda tonallik oʻzgaradi — modulyatsiya shunga tayanadi.</p>
${lab('degreeof')}
<h3>Transpozitsiya</h3>
<p>[[transpose|Transpozitsiya qilish]] — musiqani hech narsasini oʻzgartirmay boshqa tonallikka koʻchirish. Usullari ikkita: pogʻonalar boʻyicha (eski tonallikda kuy pogʻonalarini aniqlab, yangisida oʻsha pogʻonalarni topish) va interval boʻyicha (har bir tovushni bir xil masofaga siljitish). Xonandaga qoʻshiq bir ton pastroq kerak, klarnetchiga — yangrashidan bir ton yuqori yozilgan partiya. Ilovada qoʻshiqlar bitta tugma bilan transpozitsiya qilinadi, lekin buni xayolan bajara olish — eshitib chalishning asosi.</p>
${lab('transp')}
${key('Tonallik — bu tonika va lad. Belgilar gamma formulasidan kelib chiqadi, kvinta doirasi qoʻshnilarni koʻrsatadi, qardosh tonalliklar — modulyatsiya uchun eng yaqin yoʻllar.')}
` },
{ id: 'melody', t: 'Kuy va musiqa tuzilishi', s: 'Motiv, ibora, jumla, period; kadensiyalar, sekvensiya, takrorlar', src: 'maksimov,fridkin', h: `
<p>[[melody|Kuy]] — bitta ovoz bilan ifodalangan musiqiy fikr. Uning materiali — gamma boʻlaklari, akkord tovushlari, intervallarga sakrashlar; lekin alohida nota yoki alohida choʻzim emas, ularning nisbati ifodali: kuy qayoqqa harakatlanadi, qayerda sekinlashadi, qayerda dam oladi. Faqat ladning asosiy pogʻonalaridan iborat kuy diatonik deyiladi; koʻtarilgan va pasaytirilgan pogʻonalar unga xromatik rang beradi — lekin ular juda koʻp boʻlsa, tonallik aniqligini yoʻqotadi.</p>
<h3>Motiv, ibora, jumla, period</h3>
<p>Kuy nutq kabi boʻlinadi. [[motif|Motiv]] — eng kichik tugallangan boʻlak, odatda bitta kuchli hissali. Bir nechta motiv [[phrase|iborani]] tashkil etadi; ibora oxiri uzun tovushda toʻxtash yoki pauza boʻyicha, yangisining boshi — koʻpincha chizma takroridan eshitiladi. Iboralar orasidagi chegara — sezura; u vergul kabi ∨ belgisi bilan belgilanadi. Ikki-uch ibora jumlaga, ikki jumla esa [[period|periodga]] — tugallangan musiqiy fikrga birlashadi. Odatda birinchi jumla beqaror tugaydi (savol), ikkinchisi — tonikada (javob). Period bir tonallikli va modulyatsiyalovchi boʻladi — agar ikkinchi jumla yangi tonallikka kelsa.</p>
${lab('period')}
<h3>Kuy kadensiyalari</h3>
<p>[[mcad|Kadensiya]] — iboraning yakuni. Uni akkordlarsiz, faqat kuy boʻyicha — oxirgi pogʻonalarga qarab aniqlash mumkin. Toʻliq mukammal kadensiya tonikada tugaydi (VII — I, II — I, V — I). Toʻliq nomukammal — tonika tersiyasi yoki kvintasida (II — III, IV — III, VI — V). Yarim — beqaror tovushda, koʻpincha V yoki VII pogʻonada toʻxtash: ibora savol kabi yangraydi. Akkord kadensiyalari haqida — «Tonallik va funksiyalar» bobida.</p>
${lab('cadmel')}
<h3>Sekvensiya</h3>
<p>[[sequenceT|Sekvensiya]] — kuy (yoki garmonik) aylanmasini boshqa pogʻonadan takrorlash. Tonal (diatonik) sekvensiyada motiv lad pogʻonalari boʻylab siljiydi va uning intervallari biroz oʻzgaradi: katta tersiya kichikka aylanishi mumkin. Modulyatsiyalovchi (aniq) sekvensiyada motiv har safar bir xil masofaga — tonlab, kichik tersiyalab — siljiydi va tonallikdan tonallikka oʻtadi. Sekvensiyalar koʻtariluvchi va tushuvchi boʻladi; bu kuyni rivojlantirishning bosh usullaridan biri — klassikada ham, jaz improvizatsiyasida ham.</p>
${lab('sequence')}
<h3>Takrorlar va oddiy shakllar</h3>
<p>Musiqani ikki marta qayta yozmaslik uchun takrorlash belgilari ishlatiladi. [[reprise|Repriza]] — takt chizigʻi yonidagi ikki nuqta — qismni takrorlashni bildiradi. [[volta|Voltalar]] — «1» va «2» qavslar — birinchi va ikkinchi oʻtishda turli yakunlarni beradi. D.C. (da capo) — boshidan takrorlash, D.S. (dal segno) — 𝄋 belgisidan, al Coda — 𝄌 belgisigacha va [[coda|kodaga]], asar yakuniga oʻtish.</p>
<p>Qoʻshiqlar bir qismli, ikki qismli va uch qismli boʻladi; eng keng tarqalgan qoʻshiq shakli — [[verseform|kuplet shakli]]: bir xil musiqa yangi soʻzlar bilan takrorlanadi, koʻpincha har bir kupletdan keyin naqarot bilan (band — naqarot). Jaz shakllari — bluz, AABA va boshqalar — «Shakllar» bobida koʻrib chiqilgan.</p>
${key('Kuy iboralar bilan nafas oladi. Uni mazmunli chalish — ibora qayerda boshlanishini, qayoqqa borishini va nima bilan tugashini — savol bilanmi yoki javob bilanmi — bilish demakdir.')}
` },
{ id: 'perform', t: 'Temp, kuch, shtrixlar, bezaklar', s: 'Italyancha belgilar, dinamika, legato va stakkato, melizmlar', src: 'maksimov,fridkin', h: `
<p>Notalar balandlik va choʻzimni qayd etadi, qanday yangrash kerakligi esa — tez yoki sekin, qattiq yoki ohista, bogʻlab yoki uzib — notalar ustida soʻzlar va belgilar bilan yoziladi. Anʼanaga koʻra — italyancha: bu soʻzlarni butun dunyo musiqachilari bir xil tushunadi.</p>
<h3>Temp</h3>
<p>[[tempo|Temp]] — ijro tezligi, daqiqadagi hissalar soni. U asar boshida soʻz bilan, baʼzan metronom boʻyicha raqam bilan birga koʻrsatiladi. Sxemadagi raqamlar — taxminiy moʻljal: savod darsliklarida ular yoʻq, turli nashrlar esa turlicha beradi; soʻz maʼnosi raqamdan muhimroq.</p>
${lab('tempo')}
<p>Temp oʻzgarishlari: accelerando — tezlashtirib, ritardando va rallentando — sekinlashtirib, ritenuto — ushlab, a tempo — avvalgi tempda. Aniqlovchi soʻzlar: più mosso — jonliroq, meno mosso — kamroq jonli, molto — juda, non troppo — haddan tashqari emas, assai — ancha, con moto — harakat bilan. Tempo rubato — tempda erkin: baʼzi tovushlar biroz choʻziladi, boshqalari tezlashtiriladi. Aniq tempni metronom beradi — ilovada u doim qoʻl ostida.</p>
<h3>Kuch</h3>
<p>[[dynamics|Dinamika]] — ovoz kuchi va uning oʻzgarishlari: pp (pianissimo) — juda ohista, p (piano) — ohista, mp — oʻrtacha ohista, mf — oʻrtacha qattiq, f (forte) — qattiq, ff — juda qattiq. Asta-sekin kuchaytirish — crescendo (ochiluvchi «vilka»), susaytirish — diminuendo (yopiluvchi); poco a poco — oz-ozdan, morendo — soʻnib. Sforzando (sf) — bitta tovushni kutilmaganda ajratish, aksent (&gt;) — urgʻu berish. Filirovka — bitta uzun tovushni ravon kuchaytirish va susaytirish. Yodda tutishga arziydigan fikr: iborada faqat maʼno tovushi ajratiladi, qolganlari unga boʻysunadi.</p>
${lab('dyn')}
<h3>Shtrixlar</h3>
<p>[[articulation|Shtrixlar]] — tovushlarni chiqarish va bogʻlash usullari. Legato — bogʻlab, tovushdan tovushga (notalar ustida yoy); non legato — bogʻlamay, lekin qisqartirmay; staccato — uzib (nota ustida nuqta); tenuto — ushlab, toʻliq choʻzim bilan (chiziqcha); aksent (&gt;) va marcato (^) — urgʻu bilan. Torli cholgʻularda pizzicato (chertib) va surdina bilan chalish (con sordino) bor, koʻp cholgʻularda — glissando (tovushlar orqali sirpanish) va tremolo (tovushni tez takrorlash). Bitta motiv turli shtrixlar bilan bir nechta turli xarakter kabi yangraydi.</p>
${lab('artic')}
<h3>Bezaklar</h3>
<p>[[ornament|Melizmlar]] — tovushning mayda bezaklari. Qisqa forshlag — asosiy tovushdan oldin, uning hisobiga tez tovush (dumchasi chizilgan kichik nota). Uzun forshlag odatda asosiy tovush choʻzimining yarmini oladi. [[trill|Trel]] — tovushning yuqori qoʻshnisi bilan tez almashinishi. Mordent — asosiy, qoʻshni, yana asosiy: chizilmagani — yuqori qoʻshni bilan, chizilgani — pastki qoʻshni bilan. Gruppetto — asosiy tovush atrofidagi toʻrt tovush: yuqori, asosiy, pastki, asosiy. Melizmlar belgilar bilan yoziladi yoki mayda notalar bilan yozib chiqiladi; jazda bezaklar kam yoziladi — ular uslubga qarab qoʻshiladi.</p>
${lab('orn')}
<h3>Xarakter</h3>
<p>Notalar ustida koʻpincha ijro xarakteri ham yoziladi: dolce — nozik, cantabile — ohangdor, espressivo — ifodali, leggiero — yengil, maestoso — salobatli, grazioso — nafis, sostenuto — vazmin, scherzando — hazilomuz, agitato — hayajonli, tranquillo — osoyishta, sotto voce — past ovozda.</p>
${key('Temp, kuch, shtrixlar va bezaklar — notalarni musiqaga aylantiradigan narsa. Ular italyancha yoziladi, lekin eshitish hal qiladi: bitta matnni oʻnlab xarakterda chalish mumkin.')}
` },
];
