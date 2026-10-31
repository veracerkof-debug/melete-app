// Учебник (uz), часть 4: Игра. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — перевод ru/p4.js (собственный пересказ: «Джазология» (основа), Левайн — «The Jazz Theory Book» и «The Jazz Piano Book», Алексеев).
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';
// ikkinchi fikr: boshqa muallif boshqacha qaraydi — ikki nuqtai nazar yonma-yon
const two = (who, t) => '<aside class="btwo"><b>Ikkinchi fikr · ' + who + '</b>' + t + '</aside>';
const table = (head, rows) => '<div class="bktw"><table><thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c, i) => '<td>' + (i ? c : '<b>' + c + '</b>') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';

export const S = {
  'cl.son': 'son', 'cl.rumba': 'rumba', 'cl.groove': 'Gruv', 'cl.mel': 'Kuy va klave', 'cl.clave': 'Klave', 'cl.mont': 'Montuno', 'cl.bass': 'Tumbao', 'cl.melody': 'Kuy',
  'cl.note': 'Bombo («uch zarbali» taktning 2+ i) va ponche (4) aylana bilan belgilangan — klavening eng kuchli joylari. Fortepiano va bas faqat 2+ da mos tushadi; montunoning oxirgi notasi va 4 dagi bas — bu allaqachon keyingi akkord (I – IV – V – IV).',
  'cl.hits': '{t} tadan {n} ta mos', 'cl.bombo': 'bombo', 'cl.ponche': 'ponche', 'cl.hint': 'katakka bosish — kuy notasi',
  'cl.ph0': 'Ibora 1', 'cl.ph1': 'Ibora 2', 'cl.ph2': 'Tekis sakkizliklar', 'cl.ph3': 'Uzun notalar',
  'cl.fit32': 'Kuy ritmi 3-2 ga yaqinroq.', 'cl.fit23': 'Kuy ritmi 2-3 ga yaqinroq.', 'cl.none': 'Kuy hech bir yoʻnalishga tortmaydi: bunday mavzu moslashtiriladi — notalar siljitiladi yoki takt qoʻshiladi.',
  'fl.blues': 'Bluz · 12', 'fl.letters': 'Qismlar', 'fl.lens': 'Taktlar', 'fl.total': 'Jami {n} takt.',
  'fl.p0': 'Qoʻshiq shakli: yuzlab mavzular.', 'fl.p1': 'Teg bilan: oxirgi A uzunroq.', 'fl.p2': 'Uzun A lar, qisqa brij.', 'fl.p3': 'Brijli bluz: A — oʻn ikki taktli bluz.', 'fl.p4': 'Oʻsha AABA ikki baravar uzunroq.',
  'fl.p5': 'Toʻrt taktli qisqa brij.', 'fl.p6': 'Ikkinchi yarmi birinchisi kabi boshlanadi.', 'fl.p7': 'Oxiri boshini takrorlamaydi.', 'fl.p8': 'Toʻrtta turli qism, oxirgisi — teg bilan.',
  'fl.p9': 'Mavzudan keyin E A ning birinchi toʻrt taktini almashtiradi.', 'fl.p10': 'Chalishdan oldin shakl kelishib olinadi.', 'fl.p11': 'Ikki qismli; solodan oldin koʻpincha ikki marta chalinadi.', 'fl.p12': 'Oʻn ikki takt, uchta ibora.',
  'bl.maj': 'major', 'bl.min': 'minor', 'bl.up': 'Gamma yuqoriga', 'bl.down': 'Gamma pastga', 'bl.ph': 'Ibora', 'bl.close': 'zich', 'bl.shear': 'Shiring',
  'bl.n.close': 'Zich toʻrt ovozlilik: kuydagi akkord tovushi — {six}, oʻtuvchisi — {dim} (bu asosiy tonsiz {v}7♭9). Chiziq I – V – I – V kabi yangraydi — garmoniyaning eng silliq harakati.',
  'bl.n.shear': 'Jorj Shiringdagi kabi: zich akkordlar va chap qoʻlda oktava pastda ikkilantirilgan kuy.', 'bl.n.drop2': 'Yuqoridan ikkinchi ovoz oktavaga tushirilgan: kengroq va yumshoqroq, saksofonlar seksiyasi kabi yangraydi. Pastki ovozning oʻzi — kuy.',
  'vk.ex0': 'Pastda xira, ♭9', 'vk.ex1': 'Yuqorida yarim ton', 'vk.ex2': 'Yaxshi Fmaj7', 'vk.ex3': 'Yaxshi Cm7', 'vk.hint': 'klavishga bosish — tovush qoʻshish yoki olib tashlash', 'vk.clear': 'Tozalash',
  'vk.core': 'tersiya va septima bor', 'vk.coreX': 'tersiya yoki septima yoʻq — akkord turi aniq emas',
  'vk.tri': 'dominantada triton bor (3 va ♭7)', 'vk.triX': 'dominantada triton yoʻq', 'vk.five': 'ø da ♭5 bor', 'vk.fiveX': '♭5 siz ø akkord turini yoʻqotadi',
  'vk.b9': 'ovozlar orasida kichik nona yoʻq', 'vk.b9X': 'ovozlar orasida kichik nona (faqat 7♭9 da oʻrinli)', 'vk.top': 'yuqorida yarim ton emas', 'vk.topX': 'yuqorida yarim ton',
  'vk.wide': 'yuqorida juda keng emas', 'vk.wideX': 'yuqorida juda keng interval', 'vk.low': 'pastda zich emas', 'vk.lowX': 'past va zich — gʻuvillash',
  'vk.dbl': 'septima basda va yuqorida ikkilantirilmagan', 'vk.dblX': 'septima ham basda, ham yuqorida', 'vk.foreign': 'barcha tovushlar — akkord tovushlari yoki tarangliklar', 'vk.foreignX': 'akkorddan tashqari tovush bor',
  'stk.th': 'tersiyalar boʻylab', 'stk.q4': 'kvartalar boʻylab', 'stk.q5': 'kvintalar boʻylab', 'stk.ab': 'Tersiyalar → yangi',
  'stk.n.th': 'Tovushlar tersiyalar tartibida — akkord shunday yoziladi.', 'stk.n.q4': 'Oʻsha bas ustidagi oʻsha tovushlar kvartalar boʻylab qayta yozilgan (kvarta orttirilgan boʻlishi mumkin). Qizil — zanjir uziladigan joy.', 'stk.n.q5': 'Oʻsha tovushlar kvintalar boʻylab (kvinta kamaytirilgan boʻlishi mumkin) — eng keng va tiniq yangrash.',
  'pk.hint': 'katakka bosish — akkord ustidagi pentatonika; ★ — eng yaxshi tanlov',
  'pk.n.ii': 'ii da I, IV va V pentatonikalari mos keladi; V yaxshiroq — u minor akkordning 6 va 9 ini beradi.', 'pk.n.V': 'V7 da — faqat V pentatonikasi: I va IV da dominantaning 4 i bor — noqulay nota; II da — begona ♯4.',
  'pk.n.I': 'I da — I va V (V boyroq: 7 va 9); II lidiy rangini beradi. IV da 4 bor — noqulay nota.', 'pk.n.Valt': '7alt da — dominanta asosiy tonidan triton yuqoridagi pentatonika: u alt gammasining melodik minorida yotadi.',
  'fr.m6': 'minor sekstali', 'fr.com': '1–2–4–5', 'fr.degs': '{c} ustida: {d}', 'fr.none': 'Bu akkord uchun bunday toʻrtliklar yoʻq.',
  'fr.n.m6': 'Toʻrt tovush 1–♭3–5–6. Major garmoniyada — II pogʻonadan (I ustida — VI dan, lidiy rangi), melodik minorda — uning tonikasidan, 7♯9 da — asosiy tondan. Minor pentatonika kabi «bluzcha» yangraydi.',
  'fr.n.com': '«Umumiy» 1–2–4–5 toʻrtligi toʻrtta major tonallik va ikkita melodik minorda yotadi: bitta ibora koʻp akkordlarga mos keladi.',
  'sq.motif': 'Motiv', 'sq.dia': 'pogʻonalar boʻylab', 'sq.m3': 'k3 boʻylab', 'sq.q4': 'kvartalar boʻylab', 'sq.grow': 'oʻsuvchi sakrash',
  'sq.n.dia': 'Motiv gammaning keyingi pogʻonasidan takrorlanadi: intervallar biroz oʻzgaradi, tonallik saqlanadi.', 'sq.n.m3': 'Kichik tersiya yuqoridagi aniq nusxa: toʻrt qadam — va oktava; garmoniya ketib qolsa ham, quloq mantiqqa ergashadi.',
  'sq.n.q4': 'Motiv kvartaga siljiydi — kvinta doirasi boʻylab garmoniya kabi.', 'sq.n.grow': 'Sakrash oʻsib boradi: kvarta, triton, kvinta, kichik va katta seksta — taranglik oʻz-oʻzidan ortadi (Xerbi Xenkok usuli).',
  'ou.tri': 'uchtovush', 'ou.pent': 'pentatonika', 'ou.s1': 'yarim tonga', 'ou.s2': 'tonga', 'ou.s3': 'k3 ga', 'ou.s6': 'tritonga', 'ou.play': 'Ichkarida — tashqarida — ichkarida',
  'ou.count': 'Tashqaridagi begona tovushlar: 4 tadan {n} ta.', 'ou.n1': 'Yarim tonga siljish — eng keskini, lekin quloq uni asos bilan oson bogʻlaydi.', 'ou.n2': 'Tonga siljish koʻpincha «ichkarida» yoki deyarli ichkarida qoladi.',
  'ou.n3': 'Kichik tersiya — kamaytirilgan gamma yoʻli: «tashqarida», lekin tizim ichida.', 'ou.n6': 'Triton — chiziqning oʻzidagi triton almashtirish.',
  'lh.stride': 'Klassik strayd', 'lh.modern': 'Zamonaviy strayd', 'lh.tenth': 'Qadamlovchi desimalar', 'lh.powell': 'Bad Pauell ovozlari',
  'lh.n.stride': 'Asosiy ton 1 da, desima 3 da, akkord 2 va 4 da. I – VI7 – ii – V aylanmasi.', 'lh.n.modern': 'Asosiy ton 1 va 3 da, 2 va 4 da — asosiy tonsiz joylashuv (A va B navbatlashadi).',
  'lh.n.tenth': 'Tonika takti desimalar bilan toʻldirilgan: pastda 1 – 2 – ♯2 – 3, yuqorida 3 – 4 – ♯4 – 5. Desima olinmasa — qoʻlni zoʻrlash emas, arpedjio.',
  'lh.n.powell0': 'Asosiy ton va septima, asosiy ton va tersiya: ii–V–I da bitta ovoz almashadi — yoʻnaltiruvchi tonlar.', 'lh.n.powell1': 'Desima va septima oʻrin almashadi — yoʻnaltiruvchi tonlarning oʻsha chizigʻi boshqa oktavada.', 'lh.n.powell2': 'Uch tovush: asosiy ton, septima va desima. Oʻng qoʻlga butun oʻrta oktava qoladi.',
};

export const TERMS = {
  clave: ['Klave', 'afrokuba musiqasi tayanadigan ikki taktli ritm: 3-2 yoki 2-3. Asar davomida yoʻnalish oʻzgarmaydi.', 'latin'],
  montuno: ['Montuno', 'lotin musiqasida fortepianoning takrorlanuvchi figurasi (guaxeo); salsada — xor va solist navbatma-navbat kuylaydigan asar qismi ham.', 'latin'],
  tumbao: ['Tumbao', 'lotin musiqasida bas naqshi: 2+ va 4 da, birinchi hissasiz; 4 da — keyingi akkordning asosiy toni.', 'latin'],
  leadsheet: ['Lid-list (lead sheet)', 'mavzu yozuvi: kuy, harfli akkordlar va matn. Lid-listlar toʻplamlari — feykbuklar (Real Book).', 'comp'],
  vamp: ['Vamp', 'qisqa takrorlanuvchi aylanma, koʻpincha kirish yoki yakunda; ostinato bilan adashtirilmaydi.', 'arr'],
  blockch2: ['Blok akkordlar', 'u bilan birga harakatlanadigan zich akkordlar bilan garmonizatsiya qilingan kuy: akkord tovushi — 6, oʻtuvchisi — °7.', 'arr'],
  contrafact: ['Kontrafakt', 'mashhur mavzu garmoniyasiga yangi kuy.', 'forms'],
  soloform: ['Solo shakli', 'improvizatsiya boradigan shakl: odatda kirish, interlyudiyalar va kodasiz mavzu shakli; mavzu shaklidan qisqaroq boʻlishi mumkin.', 'forms'],
  chscale: ['«Akkord — gamma» oilasi', 'umumiy kalit tovushlarga ega akkordlar va ularning gammalari; oila ichida akkordlar va ladlar koʻpincha oʻzaro almashinadi.', 'impro'],
  contScale: ['Uzluksiz gamma', 'Levayn mashqi: har bir akkord gammasi asosiy tonga qaytmasdan boradi, almashinuvda — yangi gammaning eng yaqin tovushiga.', 'impro'],
  pentaKey: ['I, IV, V pentatonikalari', 'tonallikning uchta major pentatonikasi; V pentatonikasi — ikki noqulay notasiz major.', 'lines'],
  m6scale: ['Minor sekstali gamma', 'toʻrt tovush 1–♭3–5–6; bitta tonallikning koʻp akkordlari ustida chalinadi.', 'lines'],
  sequence2: ['Solodagi sekvensiya', 'boshqa balandlikda (melodik) yoki oʻsha ritm bilan (ritmik) takrorlangan motiv.', 'lines'],
  outsideT: ['«Tashqarida» chalish', 'garmoniyadan tashqaridagi, boshqa tonallikni aniq chizadigan tovushlar; tuzilma va ishonchga tayanadi.', 'outside'],
  bitonal: ['Bitonallik', 'akkompanement bir tonallikda, solist — boshqasida; aniq va ritmik jihatdan mustahkam musiqachilarda xato emas, niyat kabi yangraydi.', 'outside'],
  powell: ['Bad Pauell ovozlari', 'pastda asosiy tonli ikki-uch tovush: asosiy ton + septima yoki tersiya (desima); 7 va 3 yoʻnaltiruvchi tonlar boʻylab navbatlashadi.', 'trad'],
};

export const CH = [
{ id: 'comp', t: 'Akkompanement', s: 'Ritm, registr, solist bilan suhbat, lid-list boʻyicha chalish', src: 'jazzology,levine,piano', h: `
<p>[[comping|Akkompanement]] — solistga javob, fon emas. Pianinochi yoki gitarachi <b>nima</b> chalishni (joylashuvlar), <b>qayerda</b> (registr) va <b>qachon</b> (ritm) tanlaydi. Eng muhimi — ritm.</p>
<h3>Tamoyillar</h3>
<p>Joy qoldiriladi: qisqa akkordlar, pauzalar, takrorlanuvchi ritmik figuralar. Solist kuyi takrorlanmaydi va uning registrida chalinmaydi: soprano ortida — baland emas. Barabanchi tinglanadi: akkompanement zarbalari uning naqshini toʻldiradi. Svingda figuralar rok yoki R&B dagi kabi ketma-ket takrorlanmaydi — akkompanement patternni ushlab turmaydi, suhbatlashadi.</p>
<p>Akkompanement solistni cheklashga haqli emas. U qayerga borishi noaniq ekan, 3 va 7 yetarli: pianinochi ♭9 ni olgan boʻlsa, solist endi tabiiy 9 ni chala olmaydi. Dominantada 1–3–7 «neytral» — ular 7 ga ham, 7♭9 ga ham, 7alt ga ham mos keladi; tonika minorida m6 xavfsiz — u ham doriy, ham melodik minorda yotadi. Solist odatda oʻz alteratsiyalarini oʻsha joylarda takrorlaydi, shuning uchun keyingi kvadratda ularni oldindan sezish mumkin. Tarangliklarni oldindan kelishib olish ham mumkin.</p>
${two('Levayn', 'Chalish asnosidagi reharmonizatsiya soʻzsiz, faqat eshitib boradi, va nomuvofiqlik har doim ham falokat emas. Makkoy Tayner C7♭9 chalgan, Koltreyn esa oʻsha akkord ustida — C7alt, va bu ajoyib yangragan: aniq va ritmik jihatdan mustahkam musiqachilarda nomuvofiqlik bitonallikka aylanadi. Yaxshi solistlar ritm-guruh ularga garmonik gʻoyalar tashlab turishini yaxshi koʻradi; notanish solist ortidagi birinchi kvadrat soddaroq, uni «sinab» chalinadi.')}
<h3>Nimani xavfsiz oʻzgartirish mumkin</h3>
<p>Levaynning akkompanement uchun moʻljallari — qoidalar emas, deyarli doim yangraydigan narsalar.</p>
${table(['Varaqdagi akkord', 'Nima chalish mumkin'], [
  ['ii–V dan tashqaridagi ii (minor tonikasi kabi oʻzini tutadi)', 'm(maj7)'],
  ['V', 'triton almashtirish'],
  ['ii–V dagi yoki kvintaga pastga yechiladigan V', '7♭9 yoki 7alt'],
  ['ii siz va kvintaga yechilishsiz V', '7♯11 — lidiy dominantalar odatda kvintaga pastga yurmaydi'],
  ['I', 'maj7♯4 deyarli doim; maj7♯5 — solistni tinglab'],
  ['I–VI–ii–V dagi VI', 'dominanta (ii ning V i)'],
])}
<p>Bundan nariga (V oʻrniga sus yoki frigiy akkord) — faqat kuchli improvizator bilan.</p>
<h3>Ritmik figuralar</h3>
<p>Qadamlovchi bas bilan ii–V–I yangraydi. Figura roʻyxatdan tanlanadi yoki kataklarga bosib yigʻiladi. Toʻrtinchi hissaning «va»sidagi zarba — bu allaqachon keyingi akkord: akkompanement almashinuvdan <b>oldinda</b> boradi.</p>
${lab('comp')}
<p>Eng koʻp uchraydigan xato — kechikish: almashinuv hissasidan keyingi «va»dagi akkord vaqtni orqaga tortadi. Davosi — oʻsha ritm, almashinuvdan yarim hissa oldinga surilgan. Solistdan yarim hissadan koʻproq oldinga oʻtish xavfli: uning iborasi bilan toʻqnashish mumkin. Jaz valsi (3/4) va lotin musiqasi uchun figuralar boshqa: lotin musiqasida sakkizliklar tekis, naqsh esa takrorlanadi — u gruvni ushlab turadi (bu haqda — «Lotin musiqasi» bobida).</p>
<h3>Noqulay notalar</h3>
<p>[[avoid|Noqulay nota]] — kuchli hissada akkord bilan toʻqnashadigan gamma tovushi.</p>
${lab('avoid')}
${two('«Jazzologiya»', 'Doriy ii uchun kitob 6 (13) ni toʻgʻridan-toʻgʻri noqulay deb ataydi — shunchaki «ehtiyot talab» emas. Levayn doriy ladni noqulay notalarsiz deb hisoblaydi. Farq eshitiladi: m7 dagi 13 joylashuvda yaxshi yangraydi, lekin kuyda koʻzga tashlanib turganda ♭7 bilan toʻqnashishi mumkin.')}
<h3>Lid-list boʻyicha chalish</h3>
<p>[[leadsheet|Lid-list]] — kuy, harfli akkordlar va matn. Varaqdan chalish qoidalari: kuy hissadan oldinda boʻlsa, akkord ham oldinda boʻladi; faol kuy — osoyishta akkompanement, va aksincha; kuy ostida 3 va 7 yetarli, yuqoridagi kuyni ikkilantirish mumkin. Garmoniyani kuy va bas allaqachon ifodalasa, akkordni chalmaslik mumkin — bu «yashirin» garmoniya. Baschi bilan chap qoʻl asosiy tonsiz chaladi, uning ritmi esa kuy ritmiga hamohang boʻladi. Turli ijrochilarning yozuvlari bir-biridan farq qiladi — muallif versiyasini topish foydali.</p>
<h3>Chap qoʻl va amaliyot</h3>
<p>Chap qoʻl joylashuvlari solo ustida ish boshlanishidan oldin yuz foiz ishonchli boʻlishi kerak. Oʻziga akkompanement qilganda chap qoʻl oʻng qoʻl jim turganda chaladi, uning iboralarini taʼkidlaydi va har bir almashinuvni olishi shart emas. Soddalik «daho» joylashuvlardan muhimroq.</p>
<p>Baschi bor paytda asosiy ton — taqiq emas (Tayner koʻp asosiy ton chalgan), lekin odat ham emas; baschidan soʻrash mumkin. Bas solosi ortida kamroq, lekin xuddi shunday ishonch bilan va faqat balandda emas chalinadi. Solist uslubiga koʻra: Parker izdoshi ortida V da — ♭9, Koltreyn izdoshi ortida — alt. Xonandalar bilan garmoniya ehtiyotkorroq (ovozda klapanlar va pardalar yoʻq), qoida esa oddiy: ovoz jim turganda chalish. Akkompaniator — «ikkinchi skripkachi»: jasorat va vazminlik oʻrtasi.</p>
${key('Temp qanchalik tez boʻlsa, tovushlar shunchalik kam: tez tempda 3 va 7 yetarli. Balladada — toʻliq joylashuvlar va arpedjiolar. Kechikish emas — oldinda borish.')}
` },
{ id: 'latin', t: 'Lotin musiqasi: klave', s: 'Klave 3-2 va 2-3, montuno, tumbao, klavedagi mavzu', src: 'levine,piano,jazzology', h: `
<p>«Lotin musiqasi» — bitta uslub emas, Rio-Grandedan Olovli Yergacha boʻlgan mozaika: And musiqasi va mariachi bir-biriga Motsart va Bi Bi King qanchalik oʻxshasa, shunchalik oʻxshaydi. Jazga eng kuchli taʼsirni Braziliya va Kuba koʻrsatgan. «Salsa» — Nyu-York promouterlarining soʻzi, koʻp lotin amerikalik musiqachilar uni yoqtirmaydi. Bob — afrokuba musiqasining asosiy mexanizmi haqida, Levayn uni qanday tasvirlagan boʻlsa, shunday; zarbli cholgʻular naqshlarini u bermaydi, ularni maxsus qoʻllanmalardan olish maʼqul.</p>
<h3>Klave</h3>
<p>[[clave|Klave]] — hammasini bir-biriga bogʻlab turadigan ikki taktli naqsh: har bir cholgʻuning oʻz ritmi bor, va ularning hammasi boshqotirma boʻlaklari kabi bir-biriga tushadi. Montuno, bas, barabanlar, kuy frazirovkasi va puflama cholgʻular chiziqlari «klaveda turadi». Yoʻnalish ikkita: 3-2 (birinchi taktda uchta zarba: 1, 2+, 4; ikkinchisida ikkita: 2 va 3) va 2-3 — oʻsha taktlar teskari tartibda. Rumba-klaveda «uch zarbali» taktning uchinchi zarbasi yarim hissaga, 4+ ga surilgan. Asosiy qoida: asar boshlangach, <b>klave yoʻnalishi oʻzgarmaydi</b>.</p>
${lab('clave')}
<h3>Montuno va tumbao</h3>
<p>Fortepiano [[montuno|montunosi]] — sakkizliklardan iborat ikki taktli figura, ikkala qoʻl oktavada (keyinroq — desimada), uzilishlarsiz. Montunoning kuchli hissasi doim klavening «ikki»sida; har bir taktning oxirgi notasi takt chizigʻi orqali ligalangan va allaqachon keyingi akkordga tegishli. Montuno yangi boʻlimgacha oʻzgartirilmaydi — u gruvni ushlab turadi. Bu svingga qarama-qarshi: u yerda akkompanement takrorlanmaydi.</p>
<p>Bas [[tumbao|tumbaosi]] toʻrtinchi hissaga urgʻu beradi va keyingi akkorddan oldinda boradi; birinchi hissani bas olmaydi. Fortepiano va bas faqat ikkinchi hissaning «va»sida mos tushadi. Salsada solo ritmik, oktavalar va katta akkordlar bilan chalinadi: bir notali bibop chizigʻini ritm-guruh bosib ketadi.</p>
<h3>Klavedagi mavzu</h3>
<p>Yoʻnalish kuy boʻyicha tanlanadi: mavzu ritmi ikkala variantga qoʻyiladi va <b>mos tushishlar sanaladi</b>. Deyarli ideal holat ham boʻladi (2-3 da oʻndan toʻqqiz), teng yarmi ham. Eng muhimi — klavening eng kuchli joylariga tushish: bombo («uch zarbali» taktning 2+ i) va ponche (4). Jaz mavzulari koʻpincha «qisman 2-3, qisman 3-2, asosan hech qaysisida emas», shuning uchun har qanday mavzuni «mambo kabi chalish» chiqavermaydi. Moslashtirish mumkin: bir-ikki nota ritmini oʻzgartirish (taktdagi uchta chorak → ikkita nuqtali chorak va chorak) yoki takt qoʻshish va olib tashlash. Bu ham yordam bermasa — mavzu salsaga yaramaydi. Kuyni tinglaydigan barabanchi oʻz naqshini u bilan ham, klave bilan ham koʻproq mos tushadigan qilib moslashtiradi.</p>
<p>Yuqoridagi sxemada «Kuy va klave» rejimi ikkala yoʻnalish uchun mos tushishlarni sanaydi; notani siljitib, hisob qanday oʻzgarishini koʻrish mumkin.</p>
<h3>Koʻrinmas takt chizigʻi</h3>
<p>Gʻarb qoidasiga koʻra notalar 4/4 taktining oʻrtasi orqali ligalanmaydi — lotin musiqasida bu qoida xalaqit beradi. Odatdagi montuno «qoida boʻyicha» — oʻn ikki nota va uchta liga, «lotincha» — oʻnta nota va bitta liga. Koʻnikkach, lotincha oʻqish osonroq.</p>
<h3>Bossa-nova</h3>
<p>Bossa-novada ritm ham ikki taktli, lekin qoidalar erkinroq: bir taktli figuralar ham mos keladi, ularni oʻzgartirish mumkin, solo — sving yoki tekis sakkizliklar bilan. Jaz mavzusi «mambo kabi» koʻpincha shunday chalinadi: A qismlari — lotin uslubida, brij — svingda.</p>
${tip('Klave — qarsak yoki oyoq bilan, montuno — qoʻllar bilan; keyin yoʻnalish almashtiriladi va montuno qayta quriladi. Klave tanaga singmagan boʻlsa, lotin musiqasi «tekis sakkizliklardagi sving» kabi yangraydi.')}
` },
{ id: 'forms', t: 'Shakllar', s: 'Ijro rejasi, qismlar uzunligi, bluz, ritm-cheynjes, mavzu qanday tuzilgan', src: 'jazzology,levine', h: `
<p>[[form|Shakl]] — asar rejasi: qanday qismlardan iboratligi va ular qanday takrorlanishi. Improvizatsiya ham oʻsha shakl — «kvadrat» boʻylab boradi, shuning uchun u yoddan bilinadi. Standartning odatiy ijro rejasi: kirish → mavzu → improvizatsiya bilan shakl takrorlari → mavzu va yakun.</p>
<h3>Qoʻshiq shakllari</h3>
<p>Standartlarning koʻpi — 32 takt: [[aaba|AABA]] ([[bridge|brij]] B qarama-qarshi va odatda boshqa tonallikka oʻtadi) yoki ABAC. AABC, ABC, ABCD ham bor; harflar shartli — oʻzgartirilgan takror A1/A2 yoki yangi harf bilan yoziladi. Levayn «tekis» sakkiz taktli qismlar eng koʻp uchraydigan holat xolos ekanini koʻrsatadi: uzunliklar har qanday boʻladi. Sxemada — uning jadvalidagi shakllar; boshqa harflar va uzunliklarni ham yozish mumkin.</p>
${lab('flen')}
<h3>Mavzu shakli va solo shakli</h3>
<p>Kirish, interlyudiya, maxsus yakun, shaut-xorus va kuplet — aranjirovka qismi: ular har safar chalinadi va mavzuning oʻzi kabi bilinadi, lekin [[soloform|solo shakliga]] kirmaydi. Solo shakli mavzu shaklidan qisqaroq ham boʻladi. Oʻzgartirishlar — odatiy hol: brij almashtiriladi, A qismi yarim ton yuqorida takrorlanadi; sahnada qaysi versiya chalinishi aniqlashtiriladi. [[contrafact|Kontrafakt]] — birovning garmoniyasiga yangi kuy.</p>
<h3>Bluz</h3>
<p>[[bluesform|Bluz]] — 12 takt, toʻrt taktdan uchta ibora: motiv bayoni (1–4 taktlar), uning takrori (5–8) va qarama-qarshilik (9–12). Asosiy shakl — uchta dominanta I7, IV7, V7. Jaz bluzi ii–V, ikkilamchi dominantalar va °7 qoʻshadi; bibop varianti — tushuvchi ii–V zanjirlari; minor bluz — i, iv va ♭VI7–V7 da. «Tinglash» taktlarni yangragan sari yoritadi.</p>
${lab('form')}
<p>Levayn bluzning uch avlodini koʻradi: uchta akkord; keyin ikkinchi taktda IV7 va oxirgisida V7 (1930-yillar); keyin bibop — toʻrtinchi taktda ii–V, 6–10 taktlarda xromatik ii–V lar, oxirida aylanma. Musiqachilar uchalasini chalish asnosida, hatto bitta kvadrat ichida aralashtiradi: solist erkin, akkompaniator tinglaydi va ergashadi. Maxsus bluzlar ham bor: 24 taktli bluz-vals, brijli bluz (12 + 12 + 8 + 12 = 44 takt), tushuvchi «parkercha» bluz, sus-akkordlardagi bluz, 14 taktli bluz. Nomidagi «Blues» — hali bluz emas: bluz — bu yana tovush va munosabat.</p>
<h3>Ritm-cheynjes</h3>
<p>[[rhythmch|Ritm-cheynjes]] — bluzdan keyin mashhurligi boʻyicha ikkinchi shakl: 32 taktli AABA, deyarli doim si-bemolda. A boʻlimi — IV ga chiqishli tez I–vi–ii–V aylanmalari; brij — kvinta doirasi boʻylab dominantalar zanjiri, har biri ikki takt: III7–VI7–II7–V7. Versiyalar koʻp, va ular ham aralashtiriladi: boshlanish doira boʻylab dominantalar bilan (F♯7 B7 E7 A7 D7 G7 C7 F7 — beshinchi taktdagi B♭ gacha), brij xromatik pastga (D7 C♯7 C7 B7), oltinchi taktida E♭maj7–A♭7 boʻlgan A. Ritm-cheynjes chalish — «bir nechta qoʻshiqni birdaniga chalish kabi»; shuning uchun musiqachilar bir-birini aynan u boʻyicha baholaydi.</p>
<h3>Modal asarlar</h3>
<p>[[modaltune|Modal asarda]] «akkordlar kam, joy koʻp»: 4–16 taktga bitta lad, va «Dm7» emas, «re doriy» deb oʻylanadi. Harakatni funksiya emas, rang belgilaydi, shuning uchun siljishlar va parallel yurishlar — odatiy hol. Improvizator ladlar bogʻliqligini umumiy tovushlar bilan, taranglik va boʻshalishni esa «tarang» sus va «yumshoq» maj7 navbatlashuvi bilan koʻrsatadi. Ioniy lad (major — «modallik» yoʻq) va lokriy lad (♭5 markazni ushlab turmaydi) modal asarlar uchun odatda olinmaydi.</p>
<h3>Politonallik</h3>
<p>Bir vaqtda ikkita tonal markaz: masalan, C akkordi ustidagi D uchtovushi. Kichik dozalarda — bu yuqori tuzilmalar. Markazlari tez almashadigan asarlar (Giant Steps, Lady Bird) «suzuvchi» tonalliklar hissini beradi — ular haqida «Tonal markazlar» bobida.</p>
<h3>Mavzu qanday tuzilgan</h3>
<p>Yaxshi mavzu oldindan bilinadiganlik (shakl, takror, odatiy aylanmalar) va kutilmaganlik oʻrtasida muvozanat saqlaydi. Kutilmaganlik odatda brijda emas, oxiriga yaqinroq — kodada, oxiridan oldingi taktda turadi. Mavzuning oxirgi takti koʻpincha tonika emas, boshiga qaytaruvchi aylanma boʻladi. Mavzuni toʻrtta savol boʻyicha tahlil qilish qulay: (1) shakl va qismlar uzunligi; (2) asosiy tonlar qanday harakatlanadi; (3) akkordlarda qaysi tovushlar umumiy; (4) kutilmaganlik qayerda. Muallif dasxati shaklda ham koʻrinadi: birlarida — uzun shakllar, boshqalarida — qisqa yoki toq uzunlikdagi shakllar.</p>
${key('Shakl yoddan bilinadi — harflari, uzunliklari va garmoniyasi bilan. Shaklda adashib qolish «notoʻgʻri» notani chalishdan yomonroq.')}
` },
{ id: 'arr', t: 'Aranjirovka', s: 'Pedal, ostinato, kuyni garmonizatsiya qilish, joylashuv qoidalari, blok akkordlar', src: 'jazzology,piano,levine,alekseev', h: `
<p>[[constant|Doimiy tuzilma]] — turli asoslar boʻylab parallel siljitiladigan bitta turdagi uch va undan ortiq ketma-ket akkord (koʻpincha maj7 yoki m11). Garmoniya funksional boʻlishdan toʻxtab, rangga aylanadi.</p>
<p>[[pedal|Pedal]] — ustida akkordlar oʻzgaradigan choʻzilgan tovush, deyarli doim tonika yoki dominanta. U tom maʼnoda yangrashi shart emas: quloq uni choʻzilgan deb qabul qilsa, pauzali ritmik figura boʻlib borishi mumkin, oʻrta yoki yuqori ovozda ham boʻladi. Kirish va yakunlarning odatiy usuli.</p>
<p>[[ostinato|Ostinato]] — basda yoki akkompanementda takrorlanuvchi figura; [[vamp|vamp]] — boshqa narsa: qisqa takrorlanuvchi aylanma, odatda kirishda. Pedal va ostinato ayniqsa modal garmoniyada yaxshi.</p>
<h3>Kuy uchun yangi garmoniya</h3>
<p>Beshta qoida. (1) Kuyning muhim notalari topiladi — uzun va kuchli hissadagilari. (2) Har biri uchun u akkord tovushi yoki mumkin boʻlgan taranglik boʻladigan akkordlar tanlanadi. (3) Akkordlar bas maʼnoli yuradigan qilib bogʻlanadi: kvintalar, qadamlar, xromatizm bilan. (4) Kadensiyalarda funksiya saqlanadi. (5) Hammasi birdaniga oʻzgartirilmaydi: tanish garmoniya fonida bitta yangi ibora kuchliroq yangraydi. Har bir notani garmonizatsiya qilish shart emas.</p>
<p>«Jazzologiya» tanlovni kuy qanday harakatlanishi bilan bogʻlaydi. <b>Choʻzilgan yoki takrorlanuvchi nota</b> — xromatik bas, dominanta almashtirishlari, xromatik °7 lar; kuy qanchalik osoyishta boʻlsa, garmoniya shunchalik faol. <b>Xromatik yoki simmetrik kuy</b> — barcha ovozlarning parallel harakati (doimiy tuzilma, blok akkordlar, kvartalar) yoki qarama-qarshi harakat: dominantalar zanjirlari. <b>Sakrashli kuy</b> — 1 va 3 hissalar va ulardan oldinroq tushadigan zarbalar garmonizatsiya qilinadi, sakrashda oldingi akkord qayta joylashtiriladi.</p>
${two('Levayn', 'Varaqdagi kuy oʻqish qulayligi uchun yozilgan — uni oktava yuqorida chalish mumkin: shunda qoʻllar toʻqnashmaydi, boʻlimlar boʻyicha oktava almashuvi esa qarama-qarshilik beradi. Parallelizm — kuy ortidan bitta akkord shakli — «tuzilmaviy» yangraydi, tinglovchilarga bu yoqadi; eng yaxshisi — modal mavzularda.')}
<h3>Joylashuv qoidalari</h3>
<p>Ovozlar orasida kichik sekunda va kichik nonadan qochiladi — 7♭9 va frigiy kontekstdan tashqari. Dominanta (sus dan tashqari) tritonni oʻz ichiga oladi; uning tayanchi — 3 va 7 — yetarli. Pastda zich intervallar, yuqorida — juda keng intervallar qoʻyilmaydi. Kvintani tushirib qoldirish mumkin, m7♭5 dan tashqari. Septima kuyda boʻlsa, basda ikkilantirilmaydi. 9 koʻpincha asosiy tonni, 13 — kvintani almashtiradi. Triton koʻpincha yechilmay qoladi, V7sus4 dagi kvarta esa — tonikaning oldindan kelishi. Sxemada tovushlar klavishlarga bosib qoʻyiladi, sxema esa qoidalarni tekshiradi.</p>
${lab('vcheck')}
<h3>Blok akkordlar</h3>
<p>[[blockch2|Blok akkordlar]] — u bilan birga harakatlanadigan zich akkordlarga «kiyintirilgan» kuy. Levayn retsepti — bibop gammasi: akkord tovushlarida (do majorda — C, E, G, A) C6, oʻtuvchilarida (D, F, A♭, B) — °7 yangraydi. Bu °7 — asosiy tonsiz G7♭9, shuning uchun chiziq I – V – I – V kabi yangraydi, garmoniyaning eng silliq harakati; toʻrtta saksofon uchun shunday yoziladi. Minorda — Cm6 bilan xuddi shunday.</p>
${lab('block')}
<p>Variantlar. Jorj Shiring kuyni chap qoʻl bilan oktava pastda ikkilantirgan — besh ovoz. Drop 2 yuqoridan ikkinchi ovozni oktavaga tushiradi: pastki ovoz yuqorigisi bilan desimalarda mustaqil kuyga aylanadi, va u legato va ikki baravar balandroq chalinadi. Tonika asosiy tonidan °7 — bu V ning V i (do majorda asosiy tonsiz D7♭9): u bilan I va ii bogʻlanadi. °7 ning bitta tovushi tonga koʻtarilsa, akkord oʻsha kamaytirilgan gammada qoladi, lekin «tishlaydi». ♭9/alt juftligi (kuy ♭9 → ♯9) kichik tersiyalar boʻylab sekvensiya bilan harakatlanadi — ii yoki V dagi kuy kamaytirilgan gamma boʻylab yurganda. Ogohlantirish: akkompanementdagi drop 2 solistni oson «koʻmib» yuboradi.</p>
${tip('C6 va Cm6 gammasi drop 2 da ikki oktava orqali yuqoriga va pastga, keyin barcha tonalliklarda; keyin tanish sekin mavzuning birinchi taktlari bloklar bilan.')}
<h3>Kvartalar va kvintalar boʻylab</h3>
<p>Alekseyev toʻplamidan mashq: tersiyalar boʻylab yozilgan akkord tovushlari oʻsha bas ustida kvartalar (kvarta orttirilgan boʻlishi mumkin) yoki kvintalar boʻylab qayta yoziladi. Akkord oʻshaligicha qoladi, yangrash esa ochiq va zamonaviy boʻladi; zanjir uziladigan joyda boshqa kattalikdagi bitta interval kerak.</p>
${lab('stack')}
` },
{ id: 'impro', t: 'Improvizatsiya', s: 'Akkordga gamma, oilalar, yondashuvlar, uzluksiz gamma, umumiy tovushlar, yozuvlar saboqlari', src: 'jazzology,levine', h: `
<p>Improvizatsiya uchta asosga tayanadi: <b>eshitish</b> (nimani eshitish istaladi), <b>garmoniya</b> (hozir nima yangrayapti) va <b>lugʻat</b> (barmoqlardagi iboralar va usullar). Nazariya material beradi, lekin asosiy ustoz — yozuvlar. Musiqa nazariyadan oldin paydo boʻlgan.</p>
<h3>Akkordga gamma</h3>
<p>Istalgan akkord maydonga yoziladi — sxema uning barcha tovushlari bor gammalarni tanlaydi. Eng tabiiy variantlar — yuqorida.</p>
${lab('cscale')}
<p>Akkordlar va gammalar kalit tovushlar boʻyicha [[chscale|oilalarga]] birlashadi; oila ichida akkordlar va ladlar koʻpincha oʻzaro almashinadi («Jazzologiya»).</p>
${table(['Oila', 'Kalit tovushlar', 'Akkordlar → gammalar'], [
  ['Major', '3 va 7', 'maj7, 6, maj9 → major, lidiy, orttirilgan lidiy; ♯11 bilan — lidiy ladlar'],
  ['Dominanta', '3 va ♭7', '7, 9, 13, 7♭9, 7♯9, 7alt → miksolidiy, lidiy dominanta, alteratsiyalangan; 7♭9 — «yarim ton — ton»'],
  ['Minor', '♭3 va 5', 'm7 → doriy, eoliy, frigiy; m6 → doriy, melodik minor; m(maj7) → melodik va garmonik minor'],
  ['Yarim kamaytirilgan', '♭3 va ♭5', 'm7♭5 → lokriy, lokriy ♮2'],
  ['Kamaytirilgan', '♭5 va 𝄫7', '°7 → kamaytirilgan «ton — yarim ton»'],
  ['Butun tonli', '3 va ♯5', '7♯5 → butun tonli'],
])}
<p>Oʻsha kitobdan yana bir qarash: har bir lad — qoʻshni pogʻonalardagi ikkita septakkord. Pastkisi — akkordning oʻzi, yuqorigisi uning 9, 11 va 13 ini beradi.</p>
${table(['Lad', 'Ikki akkord'], [
  ['Major', 'Cmaj7 + Dm7'], ['Lidiy', 'Cmaj7 + Dmaj7'], ['Orttirilgan lidiy', 'Cmaj7♯5 + D7'], ['Miksolidiy', 'C7 + Dm7'], ['Lidiy dominanta', 'C7 + D7'],
  ['Alteratsiyalangan', 'Cm7♭5 + D♭m(maj7)'], ['Doriy', 'Cm7 + Dm7'], ['Eoliy', 'Cm7 + Dm7♭5'], ['Melodik minor', 'Cm(maj7) + Dm7'], ['Garmonik minor', 'Cm(maj7) + Dm7♭5'],
  ['Frigiy', 'Cm7 + D♭maj7'], ['Lokriy', 'Cm7♭5 + D♭maj7'], ['Lokriy ♮2', 'Cm7♭5 + Dm7♭5'], ['Kamaytirilgan «ton — yarim ton»', 'C°7 + D°7'], ['«Yarim ton — ton»', 'C°7 + D♭°7'],
])}
<h3>Garmonik umumlashtirish</h3>
<p>Tez almashinuvlarda har bir akkordni chalish shart emas: ii–V ni bitta V7, butun ii–V–I ni esa bitta tonallik deb oʻylash mumkin. Bu [[generalize|garmonik umumlashtirish]]: butun ii–V–I va aylanmaga bitta major gamma; butun minor ii–V–i ga garmonik minor; ikkilamchi dominanta uchun bitta tuzatish kiritilgan tonallik majori. Usul bibopdan qadimiyroq — uni bir nechta akkord uchun umumiy tovushlar izlagan musiqachilar bilgan. Levaynda bu tez almashinuvlar uchun usul emas, koʻrishning asosiy usuli: akkord bilan emas, tonallik bilan fikrlash.</p>
<h3>Maqsadli notaga yondashuv</h3>
<p>[[enclosure|Oʻrab olish]] — akkord tovushini «nishonga olish» usuli: unga yuqoridan va pastdan, diatonik yoki xromatik yondashish. Xromatik yondashuv — tayyorlanmagan dissonans, akkord tovushiga yarim tonga yechiladi; u kuchli hissada ham (bunda akkord tovushini kechiktiradi), kuchsiz hissada ham turishi mumkin. Yagona talab — akkord kuchli hissalardagi tovushlardan tanilishi kerak. Yondashuvlarsiz chiziq «maqbul, lekin rangsiz».</p>
${lab('encl')}
<h3>Uzluksiz gamma</h3>
<p>«Asosiy tonga bogʻlanib qolish»ni yoʻqotadigan Levayn mashqi — [[contScale|uzluksiz gamma]]. Qoʻshiq almashinuvlari ustida har bir akkord gammasi choraklar bilan, asosiy tondan boshlamasdan chalinadi. Almashinuvda chiziq oʻsha yoʻnalishda yangi gammaning eng yaqin tovushiga boradi — asosiy tonga qaytmasdan; diapazon chetida taktning istalgan joyida burilib ketadi. Ikki akkordli taktda — har bir akkordga ikkitadan nota. Mashqda noqulay notalar koʻtariladi (maj7 da ♯4, dominantada ♯11). Variantlar: sakkizliklar bilan, tersiyalar boʻylab yuqoriga va pastga, triollar bilan, «qadam va sakrash». Maqsad — gammalarni bitta uzun chiziqqa bogʻlash va barcha pogʻonalarni tenglashtirish.</p>
<h3>Umumiy tovushlar va almashinuvlarni choʻzish</h3>
<p>Bir nechta akkord uchun umumiy tovush — soloni bogʻlab turadigan narsa: u almashinuvlar ustida turadi, va qiyin mavzuning «mina maydoni» oʻtib boʻladigan boʻladi. Levayn usuli — uch-toʻrtta qoʻshni akkord gammalarini yozib chiqish va hammasi uchun umumiy tovushlarni topish (baʼzan bu butun pentatonika). Akkord uzunligi «elastik»: tajribali solist akkordni takt chizigʻi boʻyicha emas, tayyor boʻlganda almashtiradi — almashinuvni oldindan boshlaydi yoki kechiktiradi. ii–V — ikkita akkord emas, «ii–V zonasi».</p>
<h3>Andozalar va yuqori uchtovushlar</h3>
<p>Kamaytirilgan va butun tonli gammalar boʻylab simmetrik figuralar, butun tonlar boʻylab orttirilgan uchtovushlar, xromatik zinapoya boʻylab kichik tersiyalar «abadiy dvigatel» hissini beradi va tonallikdan mantiqan olib chiqadi. Akkord ustida uning yuqori tovushlaridan uchtovush chalish mumkin: Cmaj7 ustida — G (5–7–9) va D (9–♯11–13), Dm7 ustida — F va C, G7alt ustida — E♭ va D♭. Uchtovushdan kuy aniq yangraydi va shu bilan birga taranglik beradi. Pentatonikalar, sekvensiyalar va toʻrt tovushli gammalar haqida — «Solo tili» bobida.</p>
<h3>Yozuvlar nimaga oʻrgatadi</h3>
<p>«Jazzologiya»dagi solo tahlillari qoidalarda yoʻq xulosalarni beradi. Bluz notalari (♭3, ♭5, ♭7) akkordlar «ustidan» bitta gamma kabi ishlaydi; tonikadagi ♭3 I7♯9 ga ishora qiladi. Minor bluz akkordlarga aniqroq ergashishni talab qiladi; eng «minor» tovush — tonallikning ♭6 i. m7♭5 da kuyda koʻpincha 9 emas, ♭9 yangraydi: tabiiy 9 — begona tonallik tovushi, va koʻzga tashlangan joyda u eshitiladi; tonallik alohida akkorddan muhimroq. Tez tempda dominanta deyarli majorga teng, asosiysi — 3, 7 va asosiy tonlar, 5–10 ta tayyor figuraga ega boʻlish foydali. Modal soloda motivlar oʻzidan oʻzi rivojlanadi. Kutilmagan akkordlarda toʻgʻriroq, odatiylarida — erkinroq chalinadi. Solo «hikoya qiladi»: faktura zonalari, savol va javob, taranglikning asta-sekin oʻsishi; iqtiboslar va Parker figuralari — til qismi.</p>
${key('Akkord tovushlari — kuchli hissalarga, oʻtuvchilari — kuchsizlarga. Akkord almashinuvida maqsad — 3 va 7: shunda chiziq akkompanementsiz ham garmoniyani «aytib beradi».')}
${tip('Cholgʻuni qoʻlda ushlab tinglash, yoqqanini darhol chalish, yozib olish va yodlash. Maqsad — «oʻq-dori» yigʻish emas, tushunish. Cheklov (faqat sakkizliklar, faqat akkord tovushlari, iboralarni ikkinchi hissadan boshlash) lugʻatni erkinlikdan tezroq rivojlantiradi.')}
` },
{ id: 'lines', t: 'Solo tili', s: 'Tonallikdagi pentatonikalar, toʻrt tovush, bibop gammalari, sekvensiyalar', src: 'levine,piano,jazzology', h: `
<p>Akkordga gamma — faqat xomashyo. Solo tili kichikroq va aniqroq birliklardan tarkib topadi: pentatonikalar, toʻrt tovushli guruhlar, bibop gammalari va sekvensiyalar bilan rivojlanadigan motivlar.</p>
<h3>Akkord ustidagi pentatonikalar</h3>
<p>Bitta akkord ustida bir nechta [[pentatonic|pentatonika]] mos keladi va har biri oʻz tarangliklar toʻplamini beradi: Cmaj7 ustida D dan pentatonika 9, 3, ♯11, 13, 7 ni beradi — lidiy rangi. Pentatonika kuchli dissonansda ham maʼnosi boʻyicha aniq va toʻgʻridan-toʻgʻri chalinganda ham siyqa yangramaydi.</p>
${lab('penta')}
<h3>I, IV, V pentatonikalari</h3>
<p>Levayn akkorddan emas, tonallikdan qaraydi. Majorda uchta major [[pentaKey|pentatonika — I, IV va V]] pogʻonalarda (nomlar — uning oʻziniki). Asosiy kuzatish: V pentatonikasi — ikki noqulay notasiz (1 va 4) major, shuning uchun u tonallikning istalgan akkordi ustida yangraydi va yolgʻiz oʻzi butun ii–V–I ni qoplaydi. Bitta pentatonika uchta tonallikka tegishli (do da I, sol da IV, fa da V). Maj7 ustida II pentatonikasi lidiy rangini beradi; melodik minorda pentatonika bitta — IV pogʻonadan, va bundan qisqa qoida: 7alt da — dominanta asosiy tonidan triton yuqoridagi pentatonika. Triton almashtirishda — almashtiruvchi akkord pentatonikasi. Kamaytirilgan va butun tonli gammalarda pentatonikalar yoʻq.</p>
${lab('pentakey')}
<p>Akkord uchun bluz gammasi va minor pentatonika — mos major pentatonikadan kichik tersiya pastda. Bitta bluz gammasi bluzning uchala akkordi ustida yangraydi, garchi alohida olinganda uning notalari ular bilan toʻqnashsa ham; Levayn gʻarb nazariyasi buni tushuntirmasligini ochiq tan oladi. In-sen (yarim ton, katta tersiya, ton, kichik tersiya) major III pogʻonasidan (frigiy) yoki melodik minor II pogʻonasidan quriladi va koʻpincha sus♭9 da yangraydi. Pentatonikalar toʻrt tovushli guruhlar bilan, ritmik xilma-xil va tashlab oʻtishlar bilan oʻrganiladi; Giant Steps ni uchta V pentatonikasida chalish mumkin — yaxlit chiqadi, lekin butunlay shunday chalish zerikarli.</p>
<h3>Toʻrt tovush</h3>
<p>Pentatonikadan ham kichikroq — toʻrt tovushli gammalar. [[m6scale|Minor sekstali gamma]] (1–♭3–5–6): major garmoniyada — II pogʻonadan, I dan tashqari barcha akkordlar ustida (tonikada uning 4 tovushi noqulay); maj7 ustida — VI pogʻonadan (lidiy rangi); melodik minorda — uning tonikasidan (Eø ustida — Gm6, A7alt ustida — B♭m6); 7♯9 da — asosiy tondan. «Bluzcha» yangraydi va minor pentatonika hamda bluz gammasi bilan oʻzaro almashinadi; uni hamma — Lester Yangdan Makkoy Taynergacha chalgan. «Umumiy» 1–2–4–5 toʻrtligi toʻrtta major va ikkita melodik minorda yotadi. Oʻz toʻrtligi shunday quriladi: yettitadan toʻrtta tovush tanlanadi, barcha aylanmalarda oʻrganiladi, yaxshi yangraydigani qoldiriladi.</p>
${lab('four')}
<p>ø – 7alt zanjirida minor sekstali gamma juftlik olingan melodik minor tonikasidan chalinadi — shu minorning 1, 3, 5, 6 i. Melodik minorda xarakterli 1–3–5–7 va 3–5–7–9 toʻrtliklari ham bor: ular bilan ø–alt orqali butun chiziq oʻtkaziladi. Minor sekstali gammani registrlar orqali va akkord almashinuvi orqali tez «kaskadlar» bilan chalish qulay.</p>
<h3>Bibop gammalari</h3>
<p>Bibop gammasi — bitta xromatik tovush shunday qoʻshilgan gammaki, hissadagi akkord tovushidan boshlaganda akkord tovushlari hissalarga tushadi: «gamma tekis chiqadi». Dominanta gammasi — ♭7 va 1 orasida xromatika, V va ii–V ustida chalinadi; doriy — ♭3 va 4 orasida, va bu V dan qurilgan dominanta gammasining oʻsha tovushlari (sol doriy = do dominanta), shuning uchun ii–V — bitta gamma. Major va melodik — 5 va 6 orasida. Armstrong bibop dominanta gammasini 1927-yildayoq chalgan.</p>
<h3>Sekvensiyalar</h3>
<p>[[sequence2|Sekvensiya]] melodik (ibora boshqa balandlikda, shakl saqlanadi) va ritmik (ritm takrorlanadi, notalar — yoʻq) boʻladi. U sologa tuzilma beradi va «musiqachi nima qilayotganini biladigandek yangraydi»; u garmoniya chegarasidan tashqariga ham olib chiqadi — quloq mantiqqa ergashadi. Sekvensiya ichidagi oʻsuvchi sakrash taranglikni oshiradi. Sakkiz taktli iboralar cheklamasligi kerak: sekvensiyani iboraning oxirgi taktida boshlash mumkin. Turli ritmlardagi uch notali qisqa motiv — Jo Xenderson usuli.</p>
${lab('seq')}
${key('Pentatonika, toʻrt tovush va motiv — til birliklari, gamma esa — lugʻat. Tinglovchi gammalarni emas, motivlar va ularning rivojini eslab qoladi.')}
` },
{ id: 'outside', t: '«Tashqarida» chalish', s: 'Siljish, bitonallik, olti usul', src: 'levine,jazzology', h: `
<p>[[outsideT|«Tashqarida»]] — bu akkorddan tashqari notalar, choʻzilgan almashinuv yoki boshqa tonallikdagi taniqli material; erkin atonal jaz — alohida mavzu. Nima «ichkarida», nima «tashqarida» ekani subyektiv va vaqt bilan oʻzgaradi: Parker va Koltreynni oʻz davrida «out» deb hisoblashgan.</p>
<p>Eng yaxshi misollar — [[bitonal|bitonallik]]: akkompanement bir tonallikda, solist esa boshqasini aniq chizadi. Bunday narsa ishonch bilan chalinishi kerak, aks holda xato boʻlib yangraydi. Quloq tuzilmani ushlaydi: «ichkarida → tashqarida → ichkarida», «oldindan bilinadiganlik → kutilmaganlik». Istalgan nota istalgan akkordda mos keladi, agar musiqachi uchun toʻgʻri yangrasa.</p>
${lab('outside')}
<h3>Olti usul</h3>
<p>(1) Garmoniyadan chiqib ketadigan <b>sekvensiya</b>: quloq motiv mantiqiga ergashadi. (2) <b>Yarim ton chetga</b> — dissonans eng yuqori, lekin quloq uni asos bilan oson bogʻlaydi: Cmaj7 ustidagi D♭ uchtovushi nihoyatda «tashqarida», D uchtovushi (yarim ton nariroq) esa — «ichkarida»: 9, ♯11, 13. Yarim tonga siljitilgan pentatonika — solodagi klassik saydstep (A13♭9 ustida mi-bemol minor, G7alt ustida re-bemol major); pentatonikalarni yarim tonlar boʻylab zanjir qilib olib borish mumkin. (3) <b>Tritonga</b> — chiziqning oʻzidagi triton almashtirish. (4) <b>Boshqa tonallik gammasi yoki pentatonikasi</b>. (5) Pianinochi uchun: bir qoʻl — tonallikda, ikkinchisi — xromatik siljiydigan «kvartalar tonalligi»da. (6) <b>Xromatik gamma</b> — «barcha akkordlarga tegishli va hech biriga tegishli emas»; uni suiisteʼmol qilib boʻlmaydi.</p>
${key('Tashqarida — qisqa va ishonch bilan, qaytish — aniq. «Tashqarida»ning kuchi — «ichkarida» bilan qarama-qarshilikda.')}
${tip('Modal asarlarda oʻrganish qulayroq: joy koʻp, statik garmoniyaning oʻzi dissonans soʻraydi. Avval — pentatonikani ikki taktga yarim tonga siljitish va qaytish.')}
` },
{ id: 'trad', t: 'Anʼanaviy jaz', s: '1920-yillar tili, regtaym, ilk improvizatsiya, strayd', src: 'jazzology,piano', h: `
<p>1920-yillarning garmonik tili soddaroq va shu bilan birga boshqacha. Major — uchtovush yoki 6, deyarli hech qachon maj7 emas; minor — uchtovush, baʼzan 6 yoki 9 bilan; m7 kam uchraydi, m7♭5 deyarli uchramaydi. °7 — ham uchtovush, ham septakkord sifatida; orttirilgan akkordlar va butun tonli gamma — tez-tez. <b>ii–V deyarli yoʻq</b>: dominanta tayyorgarliksiz yoki V/V dan keyin turadi, asarlar kvinta doirasi dominantalari boʻylab aylanadi (I–VI7–II7–V7–I). Har bir shunday dominantaga bogʻliq ii qoʻshilsa, bibop «cheynjes»lari hosil boʻladi. Bibop mavzularining yarmi bluz, ritm-cheynjes yoki bir nechta sxemaga yozilgan — 1920-yillarda esa har bir asarning oʻz garmoniyasi boʻlgan.</p>
<h3>Shakllar</h3>
<p>Regtaym — jazning oʻtmishdoshi emas, qoʻshni uslub: tekis, svingsiz chalinadi. Uning shakli — marsh kabi koʻp qismli (AABBACCDD), subdominanta tonalligidagi trio bilan. Ilk asarlarda «breyk qismlari» va modulyatsiyali interlyudiyalar uchraydi. Ilk bluz — har doim ham 12 takt emas va 1910-yillardayoq almashtirishlarga boy.</p>
<h3>Akkompanement va ansambl</h3>
<p>Ritm-guruh «toʻrtga» yoki «ikkiga» chaladi (bas 1 va 3 da). Ansambl — jamoaviy improvizatsiya: truba kuyni yetaklaydi, klarnet yuqoridan bezaydi, trombon pastdan javob beradi. Fortepiano — [[stride|strayd]] bilan: bas — akkord — bas — akkord. Levayn zamonaviy straydni ham (1 va 3 da asosiy ton, 2 va 4 da asosiy tonsiz joylashuv), qadamlovchi desimalarni ham, [[powell|Bad Pauell ovozlarini]] ham koʻrsatadi — pastda asosiy tonli ikki-uch tovush, bunda 7 va 3 yoʻnaltiruvchi tonlar boʻylab navbatlashadi.</p>
${lab('lefthand')}
<p>Straydni akkord ichidagi harakat (dominantada 3 → ♯11 → 3), 7♭9 da ovozni kichik tersiyaga siljitish, uchinchi va toʻrtinchi hissalarda teskari «akkord — asosiy ton» tartibi, tonika taktining uchinchi hissasiga ii yoki V qoʻyish jonlantiradi. Strayd bilan pedalsiz shugʻullanish foydali: qoʻl tovushlarni ushlab turishni oʻzi oʻrganadi.</p>
<h3>Ilk uslubdagi improvizatsiya</h3>
<p>«Jazzologiya»ning oʻnta moʻljali bibop odatlaridan farq qiladi. (1) Notalarni tejamkorlik bilan tanlash. (2) Joriy akkordga bogʻlanib qolmaslik: zonalar va umumiy tonika bilan fikrlash. (3) Yoʻnaltiruvchi emas, <b>umumiy</b> tovushlarni izlash — har bir almashinuv boʻylab sakrash bu uslubga xos emas. (4) Kuyga havolalar doim oʻrinli. (5) Ikkinchi darajali akkordlarni (tez aylanmalar) eʼtiborsiz qoldirish mumkin. (6) Pentatonikalar. (7) Motivni takrorlash, oʻzgartirish va rivojlantirish. (8) Tinglovchi kutishi bilan oʻynash. (9) Bluz notalari. (10) Major va dominantada tabiiy 9 va 13 — erkin, hatto koʻzga tashlanadigan joyda ham.</p>
${key('Ilk uslub — soddalik karikaturasi emas. Moʻljal — «yoʻl-yoʻl jiletlar» emas, Armstrongning Hot Five va Hot Seven yozuvlari va Biks Beyderbek.')}
` },
];
