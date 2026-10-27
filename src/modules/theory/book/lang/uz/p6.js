// Учебник (uz), часть 6: Практика и справка. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — перевод ru/p6.js (собственный пересказ: «Джазология» (гл. 14), Левайн (гл. 4, 12, 23), Максимов, Фридкин, Алексеев).
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';

export const S = {
  'pl.d6': 'Ya', 'pl.day': 'Dars yoki chiqish kuni', 'pl.noday': 'yoʻq',
  'pl.w.lesson': 'dars', 'pl.w.heavy': 'koʻp', 'pl.w.mid': 'oʻrtacha', 'pl.w.light': 'yengil', 'pl.w.off': 'dam',
  'pl.w.note': 'Ogʻir kunlar — darsdan darhol keyin, dam olish kuni — undan keyin emas, arafasida. Oʻqituvchi izohlari oʻsha kuniyoq yozib olinadi.',
  'ex.t.staff': 'Nota yoʻlidagi nota', 'ex.t.degof': 'Tovush pogʻona sifatida', 'ex.t.rel': 'Parallel tonallik', 'ex.t.ivbuild': 'Interval qurish', 'ex.t.inv': 'Interval aylanmasi',
  'ex.t.triear': 'Uchtovush eshitib', 'ex.t.invear': 'Aylanma eshitib', 'ex.t.parent': 'Ota-ona gamma', 'ex.t.twin': 'Triton egizagi', 'ex.t.dim7': '°7 = qaysi 7♭9',
  'ex.t.countdown': 'Koltreyn almashtirishlari', 'ex.t.locv': 'Lokriy dominanta', 'ex.t.verdict': 'List detektivi', 'ex.t.m6over': 'Minor sekstali gamma', 'ex.t.secdom': 'Ikkilamchi dominanta',
  'ex.t.flen': 'Shakl uzunligi', 'ex.t.clave': 'Klave eshitib',
  'ex.q.staff': 'Bu qaysi nota?', 'ex.q.degof': '{n} — qaysi majorning {d} pogʻonasi?', 'ex.q.rel': '{k} majorga parallel minor?', 'ex.q.ivbuild': '{n} dan yuqoriga — {i}. Qaysi nota?', 'ex.q.inv': '«{i}» intervalining aylanmasi?',
  'ex.q.triear': 'Qaysi uchtovush?', 'ex.q.invear': 'Qaysi aylanma?', 'ex.q.parent': '{c} uchun ota-ona gamma?', 'ex.q.twin': '{c} uchun triton egizagi?', 'ex.q.dim7': '{c} — qaysi asoslardan asosiy tonsiz 7♭9?',
  'ex.q.countdown': '{k} da ii–V–I: toʻrt taktga Koltreyn almashtirishlari?', 'ex.q.locv': '{k} oldidan lokriy dominanta?', 'ex.q.verdict': '{c}, kuyda {n}: belgi…', 'ex.q.m6over': '{c} ustida minor sekstali gamma?',
  'ex.q.secdom': '{k} majorda {c} — qaysi akkordga dominanta?', 'ex.q.flen': '{f} shaklida nechta takt?', 'ex.q.clave': 'Qaysi klave?',
  'ex.minor': 'minor', 'ex.tq.maj': 'Major', 'ex.tq.min': 'Minor', 'ex.tq.dim': 'Kamaytirilgan', 'ex.tq.aug': 'Orttirilgan',
  'sg.deg': 'Pogʻonalar', 'sg.iv': 'Interval', 'sg.miss': 'Yetishmayotgan tovush', 'sg.nine': 'Nona',
  'sg.q.deg': '{k} majorda {s} pogʻonalarini kuylash', 'sg.q.iv': '{n} dan yuqoriga kuylash: {i}', 'sg.q.miss': '{c} da bitta tovush yetishmaydi — uni kuylash', 'sg.q.nine': '{c} ustida nonani kuylash',
  'sg.hear': 'Tovush berish', 'sg.sing': 'Kuylash', 'sg.stop': 'Toʻxtatish', 'sg.new': 'Yangi topshiriq', 'sg.listen': 'Tinglanmoqda…', 'sg.done': 'Tayyor ✓',
  'sg.err.denied': 'Mikrofonga ruxsat yoʻq.', 'sg.err.none': 'Mikrofon mavjud emas.',
  'sg.note': 'Mikrofon faqat «Kuylash» tugmasi bilan yoqiladi, tovush qurilmada tahlil qilinadi. Oktava istalgan; tovush ±35 sent ichida soniyaning uchdan biri davomida ushlab turilsa, hisobga olinadi.',
  'sp.chain': 'Ladlar zanjiri', 'sp.rev': 'Teskari', 'sp.chrom': 'Xromatizm boʻyicha lad', 'sp.thirds': 'Tersiyalar bilan',
  'sp.n.chain': 'Ioniy yuqoriga, doriy pastga, frigiy yuqoriga… — tonallikning har bir ladi navbat bilan, yoʻnalish almashinadi. Gamma asosdan boshlanmay qoʻyadi.',
  'sp.n.rev': 'Oʻsha ladlar pogʻonalarning teskari tartibida: I dan pastga, VII dan yuqoriga, VI dan pastga…',
  'sp.n.chrom': 'Bitta lad barcha oʻn ikki tonallikda yarim tonlab yuqoriga, yoʻnalish almashinadi (birinchi toʻrttasi koʻrsatilgan).',
  'sp.n.thirds': 'Tersiyalar bilan yuqoriga naqsh. Har kuni — yangi boshlangʻich pogʻona; musiqiy yangramaydigan naqsh vaqtga arzimaydi.',
  'bkr.jazzology': 'Darslik asosi: intervallardan reharmonizatsiya va solo tahlillarigacha jaz nazariyasi.', 'bkr.levine': 'Tonallik va melodik minor orqali jaz garmoniyasi, reharmonizatsiya, shakl, mavzu, lotin musiqasi.',
  'bkr.piano': 'Fortepiano joylashuvlari va usullari: chap qoʻl joylashuvlari, So What, yuqori tuzilmalar, blok akkordlar, strayd.', 'bkr.maksimov': 'Klassik savod: yozuv, metr, lad, intervallar, akkordlar, ovoz uchun mashqlar.',
  'bkr.fridkin': 'Savod boʻyicha amaliy topshiriqlar: qurish, aniqlash, transpozitsiya, solfedjio.', 'bkr.alekseev': 'Fortepiano yonida va ovoz bilan garmoniya mashqlari; ladlarni chalish.', 'bkr.kubistra': 'Akkord turlari boʻyicha jaz gammalari pogʻonalari jadvali, noqulay notalar bilan.',
};

export const TERMS = {
  woodshed: ['Vudshed (woodshed)', 'cholgʻu ustida uzoq va yolgʻiz ishlash, «omborxonaga ketish»: jaz musiqachilari jargonidan soʻz.', 'practice'],
  fourmem: ['Toʻrt xotira', 'eshitish, nazariya, qoʻl hissi va cholgʻudagi koʻrinish; mavzu va akkordni toʻrttasi bilan ham bilish maʼqul.', 'practice'],
  tradefours: ['Toʻrtliklar almashinuvi (trading fours)', 'solistlar (koʻpincha barabanchi bilan) navbat bilan toʻrt yoki sakkiz taktdan chaladi.', 'ref'],
  shout: ['Shaut-xorus (shout chorus)', 'butun ansambl uchun yozilgan avj qismi, odatda solodan keyin.', 'ref'],
  tag: ['Teg (tag)', 'asar oxirida mavzuning soʻnggi taktlarini takrorlash, koʻpincha bir necha marta.', 'ref'],
  interlude: ['Interlyudiya', 'qismlar yoki solo orasidagi qoʻshimcha; solo shakliga kirmaydi.', 'ref'],
  intro: ['Kirish (intro)', 'asarning mavzudan oldingi boshlanishi; koʻpincha vamp yoki pedal.', 'ref'],
  cadenza: ['Kadensiya (solo)', 'ritm-guruhsiz erkin solo, odatda asar oxirida.', 'ref'],
  breakT: ['Breyk (break)', 'ansamblning bir-ikki taktga toʻxtashi, bu vaqtda solist yolgʻiz chaladi.', 'ref'],
  stoptime: ['Stop-taym (stop-time)', 'ansambl faqat qisqa zarblarni chaladi (masalan, bir yoki ikki taktda bir marta birinchi hissaga), solist pauzalarni toʻldiradi.', 'ref'],
  stroll: ['Strol (stroll)', 'pianinochi yoki gitarachi jim boʻladi va solo faqat bas va barabanlar bilan davom etadi.', 'ref'],
  doubletime: ['Dabl-taym (double time)', 'ritm-guruhning oʻsha tempida ikki baravar tez chalish; «dabl-taym hissi» — butun guruh ikki baravar tez chalganda.', 'ref'],
  straight8: ['Tekis sakkizliklar', 'svingsiz sakkizliklar — lotin musiqasida, bossa-novada, jaz-rokda.', 'ref'],
  pocket: ['Choʻntakda (in the pocket)', 'ansambl gruviga aniq tushib chalish; «hissadan orqada» (lay back) — tempni sekinlashtirmay, hissadan biroz kechroq.', 'ref'],
  outchorus: ['Soʻnggi kvadrat (out chorus)', 'solodan keyin mavzuning soʻnggi ijrosi, koʻpincha teg yoki yakun bilan.', 'ref'],
  chart: ['Chart', 'aranjirovkaning nota yozuvi yoki ansambl uchun lid-list.', 'ref'],
  trainwreck: ['«Poyezd halokati» (train wreck)', 'jargon: ansambl shaklda yoki yakunda adashib ketgan va asar parchalanib ketgan.', 'ref'],
  vampcue: ['Belgigacha vamp', 'vamp solist yoki rahbar keyingi qismga oʻtishni koʻrsatguncha takrorlanadi.', 'ref'],
};

export const CH = [
{ id: 'practice', t: 'Amaliyot', s: 'Mashgʻulot va haftani qanday tuzish, asossiz gammalar, yozuvlar, kuylash, trening', src: 'jazzology,levine,piano,alekseev,maksimov,fridkin', h: `
<p>Nazariya faqat cholgʻu va eshitish orqali musiqaga aylanadi. Bir nechta qoida: faqat qulaylari emas, <b>barcha 12 tonallik</b>; <b>sekin va aniq</b> — tezlik aniqlik va erkin qoʻldan keladi; <b>qoʻshiqlar</b> — asosiy material (har bir mashq — aniq qoʻshiq uchun); har kuni yozuvlarni <b>tinglash</b>. Mashqlarda ham musiqa qilinadi: mavzu kuyi chiroyli va oʻziga xos chalinadi — balladada chiqish asosan kuydan iborat.</p>
<h3>Mashgʻulotni qanday tuzish</h3>
<p>Mashgʻulot uzunligi uning mazmunini belgilaydi: oʻttiz daqiqaga beshta ishni sigʻdirib boʻlmaydi, lekin bitta ishga oʻttiz daqiqa ham kam. Vaqtni uch qismga boʻlish qulay: asos (uzun notalar, gammalar, arpedjiolar), etyudlar va mashqlar (yangi va takrorlash), asarlar, improvizatsiya va notadan tayyorgarliksiz oʻqish. Uzun notalar — qizish mashqi va odatlarni tuzatishning xotirjam usuli; agar yangrash yoki holat yoqmasa, toʻxtagan maʼqul: mashgʻulot hozir qanday yangrayotganini mustahkamlaydi. Gammalar «oʻrganib boʻlinmaydi» — bu sportchining qizish mashqi kabi mashq. Asarlar har safar boshidan oxirigacha chalinmaydi, joylar boʻyicha ishlanadi. Oxirgi chiqishda beqaror boʻlgan narsadan boshlash foydali: shunda oʻn besh daqiqa ham samarali.</p>
<p>Yaxshi maqsad — aniq, konkret, haddan tashqari qiyin emas va tez erishiladigan. Murakkab maqsad («yaxshiroq tovush») vazifaga aylantiriladi («besh daqiqa uzun notalar»), lekin vazifa maqsad bilan adashtirilmaydi. Oʻz oʻsishidan quvonch — muvaffaqiyatli koʻrinish istagi yoki boshqalar bilan solishtirishdan yaxshiroq harakatlantiruvchi kuch. Topshiriq — imkoniyatlar chegarasida: umidsizliksiz sinov. Sekin temp va boʻlaklarga boʻlish — yangi boshlovchilar bekorga chetlab oʻtadigan usullar. Shugʻullanish oʻsish uchun boʻladi, «tadbirga tayyorlanish» uchun emas.</p>
<h3>Hafta rejasi</h3>
${lab('plan')}
<h3>Asossiz gammalar</h3>
<p>Asosdan asosgacha gamma quloqni ham, barmoqlarni ham asosga oʻrgatadi — va improvizatsiya asosdan boshlanadi. Levayn ladlar zanjirini taklif qiladi: ioniy boʻylab yuqoriga, doriy boʻylab pastga, frigiy boʻylab yuqoriga va hokazo; har kuni — yangi boshlangʻich pogʻona; tersiyalar, kvartalar, toʻrttadan guruhlar bilan naqshlar. Alekseyev qatʼiy shaklni qoʻshadi: har bir pogʻonadan navbat bilan lad, pogʻonalarning teskari tartibidagi lad va «xromatizm boʻyicha lad» — bitta lad barcha oʻn ikki tonallikda ketma-ket. Naqshlar barcha tonalliklarda yozib chiqilmaydi: koʻz emas, quloq va barmoqlar mashq qiladi.</p>
${lab('scalepat')}
<h3>Yozuvlardan qanday oʻrganish</h3>
<p>Tayyor transkripsiyalardan emas, yozuvdan eshitib olinadi. Tartib: (1) shaklni tushunish — AABA da qiyin joy yana ikki marta takrorlanadi; (2) kuy — qisqa boʻlaklarda, hissalarni urib; (3) almashinuvlardagi bas notalari; (4) bas boʻyicha akkordlar — major yoki minorligi yozuv ustidan katta va kichik tersiya chalib tekshiriladi; (5) qiyin akkord tashlab ketiladi — u keyingi kvadratda qaytadi. Soloni yozuv bilan birga chalib oʻrganish yaxshiroq (nafas, frazirovka), va faqat keyin, xohish boʻlsa, notaga yozish mumkin. Minus fonogrammalar bilan ham, haqiqiy yozuvlar bilan ham chalish kerak: ularning gruvi va energiyasiga kirish uchun.</p>
<p>Mavzu va akkordni bilishga [[fourmem|toʻrt xotira]] yordam beradi: eshitish («C7alt shunday yangraydi»), nazariya («re-bemol melodik minorining yettinchi ladi»), qoʻl («barmoqlarda shunday») va koʻz («shunday koʻrinadi»). Tanish mavzuni oʻsha yurishlar bilan yarim ton yuqorida chalish foydali — nima oʻrganilgani va nima odat hisobiga turgani darhol koʻrinadi. Mavzuning tayyor aranjirovkasi — barcha oʻn ikki tonallikka. Zaif joylar javob vaqtidan koʻrinadi: qiyin tonallikda akkordni topish uchun necha soniya kerak.</p>
${tip('Ilovada: yozuv — mediatekaga; pleyer balandlikni oʻzgartirmay ikki baravar sekinlashtiradi, A–B halqasi qiyin joyni ushlab turadi; yoʻlaklar basni ajratadi. Oʻz ijrosi cholgʻulardagi yozish tugmasi bilan yozib olinadi va ertasi kuni tinglanadi.')}
<h3>Bitta mavzu — barcha usullar</h3>
<p>Levayn usuli: bitta mavzu (birinchi taktlar) har bir usuldan navbat bilan oʻtkaziladi — uch tovush, triton almashtirishlari, chap qoʻl joylashuvlari, ♭9 va ♯11, sekvensiya, kvartalar va So What, yuqori tuzilmalar, pentatonikalar, toʻrt tovush, strayd va Pauell ovozlari. Har bir usulda: alohida kvinta doirasi boʻylab → mavzuga imkoni boricha hamma joyga qoʻyish → bir nechta usulni birlashtirish → barcha tonalliklar → boshqa mavzular. Ikki qoʻl birga — alohida koʻnikma: oʻng qoʻl sekvensiya chaladi, chap qoʻl — strayd.</p>
<h3>Kuylash</h3>
<p>Savod boʻyicha ikkala kitob bir fikrda: asosiy eshitish mashqi — kuylash. Tonik uchtovush ustidagi pogʻonalar, tovushdan intervallar, akkordning yetishmayotgan tovushi, akkord ustidagi nona, yoʻnaltiruvchi tonlar chizigʻi — Alekseyev esa bitta notani kuylab, unga iloji boricha koʻp garmonizatsiya topishni maslahat beradi. Ilova tyuneri balandlikni tekshiradi: sxema tovush beradi va tinglaydi.</p>
${lab('sing')}
<h3>Mashqlar toʻplami</h3>
<p>Qoʻl bilan bajarish kerak boʻlgan hamma narsa. Yutuqni belgilash shart emas — cholgʻu yonidagi vaqt muhim.</p>
<ol class="bexl">
<li><b>Intervallar.</b> Barcha intervallarni bitta tovushdan yuqoriga va pastga kuylash va chalish, keyin oʻn ikkitasining har biridan.</li>
<li><b>Septakkordlar.</b> Har bir asosdan beshta asosiy septakkord, asosiy koʻrinishda va aylanmalarda.</li>
<li><b>Garmonizatsiya.</b> Major, garmonik va melodik minor septakkordlari barcha tonalliklarda; melodik minor akkordlari — oila sifatida, bitta qatorda.</li>
<li><b>Ladlar.</b> Bitta asosdan yettita lad yorqinlik zinapoyasi boʻylab; xarakterli pogʻonani taʼkidlash. Ladlar zanjiri va xromatizm boʻyicha lad.</li>
<li><b>Yoʻnaltiruvchi tonlar.</b> Kvinta doirasi boʻylab 3 va 7: dominantalar, minorlar, majorlar.</li>
<li><b>ii–V–I.</b> Asos, keyin asosiy tonsiz (A/B) — kvinta doirasi boʻylab va tonlab pastga; major va minor; keyin tasodifiy tonalliklarda.</li>
<li><b>Aylanmalar.</b> I–vi–ii–V ning barcha variantlari uchta tonallikda.</li>
<li><b>Tahlil.</b> Uchta qoʻshiq: strelkalar, qavslar, pogʻonalar — akkordlar ustida qalam bilan; tonal markazlar.</li>
<li><b>Ovozlar.</b> ii–V–I da drop 2, kvartali joylashuvlar, So What va yuqori tuzilmalar.</li>
<li><b>Reharmonizatsiya.</b> Bitta qoʻshiq — beshta versiya, har birida bitta usul.</li>
<li><b>Koltreyn almashtirishlari.</b> Countdown ning birinchi toʻrt takti barcha oʻn ikki tonallikda, sekin.</li>
<li><b>Akkompanement.</b> Uchta turli ritmik figura bilan F dagi bluz; kechikish emas — oldinda borish.</li>
<li><b>Lotin musiqasi.</b> Klave — qarsak bilan, montuno — qoʻllar bilan; yoʻnalish almashinuvi.</li>
<li><b>Akkordga gamma.</b> Qoʻshiq akkordlari almashinuvi boʻylab uzluksiz gamma, asosga qaytmasdan.</li>
<li><b>Pentatonikalar va toʻrt tovush.</b> ii–V–I da V-pentatonika; ø – alt da minor sekstali gamma.</li>
<li><b>Yondashuvlar.</b> ii–V–I dagi har bir akkordning 3 va 7 iga oʻrab olishlar.</li>
<li><b>Blok akkordlar.</b> C6 va Cm6 gammasi drop 2 da ikki oktava boʻylab yuqoriga va pastga.</li>
<li><b>Mavzu.</b> Haftasiga yoki ikki haftada yangi mavzu: shakl → kuy → akkordlar; qoʻshiq soʻzlari; listni yozuv boʻyicha tekshirish.</li>
<li><b>Eshitish.</b> Quyidagi trening — chalishdan oldin bir necha daqiqa.</li>
</ol>
<h3>Trening</h3>
<p>Savollar belgilangan turlardan tasodifiy tanlanadi. Hisob — faqat shu urinish uchun, seriyalar va reytinglarsiz.</p>
${lab('ex')}
${key('Oʻzini yozib olish va tinglash — eng yaxshi tanqidchi. Xato darhol qoʻyib yuboriladi: keyingi nota — solo davomining boshlanishi.')}
` },
{ id: 'ref', t: 'Maʼlumotnoma', s: 'Akkordlar, gammalar, tarangliklar, atamalar, kitoblar', src: 'jazzology,levine,kubistra,maksimov', h: `
<h3>Akkordlar</h3>
${lab('refch')}
<h3>Gammalar</h3>
${lab('refsc')}
<h3>Mumkin boʻlgan tarangliklar</h3>
${lab('tens')}
<h3>Noqulay notalar</h3>
${lab('avoid')}
<h3>Atamalar</h3>
<p>Darslikning barcha atamalari — qidiruv bilan. Ansambl jargoni: [[tradefours|toʻrtliklar almashinuvi]], [[shout|shaut-xorus]], [[tag|teg]], [[interlude|interlyudiya]], [[intro|kirish]], [[cadenza|kadensiya]], [[breakT|breyk]], [[stoptime|stop-taym]], [[stroll|strol]], [[doubletime|dabl-taym]], [[straight8|tekis sakkizliklar]], [[pocket|choʻntakda]], [[outchorus|soʻnggi kvadrat]], [[chart|chart]], [[vampcue|belgigacha vamp]], [[trainwreck|«poyezd halokati»]], [[woodshed|vudshed]].</p>
${lab('gloss')}
<h3>Nima oʻqish mumkin</h3>
<p>Darslik tuzilgan kitoblar. Undagi sxemalar, misollar va kuylar — oʻziniki; kitoblar koʻproq beradi: nota misollari, yozuvlar tahlili va mashqlar.</p>
${lab('books')}
` },
];
