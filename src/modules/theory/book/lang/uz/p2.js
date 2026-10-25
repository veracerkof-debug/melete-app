// Учебник (uz), часть 2: Основы гармонии. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — перевод ru/p2.js (собственный пересказ: «Джазология», Левайн, Фридкин, Kubistra).
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';
// ikkinchi fikr: boshqa muallif boshqacha qaraydi — ikki nuqtai nazar yonma-yon
const two = (who, t) => '<aside class="btwo"><b>Ikkinchi fikr · ' + who + '</b>' + t + '</aside>';

export const S = {
  'im.harm': '(garm.)', 'im.where': '{n} marta uchraydi: {list} pogʻonalaridan.', 'im.none': 'Bu ladda bunday interval yoʻq.', 'im.tap': 'Pogʻonaga teginish — interval va uning yechilishi.',
  'ti.maj': 'maj.', 'ti.min': 'min.', 'ti.dim': 'kam.', 'ti.aug': 'ort.', 'ti.inv0': 'asosiy koʻrinish (5/3)', 'ti.inv1': 'sekstakkord (6)', 'ti.inv2': 'kvartsekstakkord (6/4)',
  'ti.bass': 'Pastda', 'ti.bass0': 'asosiy ton', 'ti.bass1': 'tersiya toni', 'ti.bass2': 'kvinta toni', 'ti.ivs': 'Tuzilishi',
  'ti.iv.maj0': 'K3 + k3', 'ti.iv.maj1': 'k3 + s4', 'ti.iv.maj2': 's4 + K3', 'ti.iv.min0': 'k3 + K3', 'ti.iv.min1': 'K3 + s4', 'ti.iv.min2': 's4 + k3',
  'ti.iv.dim0': 'k3 + k3', 'ti.iv.dim1': 'k3 + ort4', 'ti.iv.dim2': 'ort4 + k3', 'ti.iv.aug0': 'K3 + K3', 'ti.iv.aug1': 'K3 + kam4', 'ti.iv.aug2': 'kam4 + K3',
  'd7.n0': 'D7 — asosiy koʻrinishda', 'd7.n1': 'D6/5 — pastda VII pogʻona', 'd7.n2': 'D4/3 — pastda II pogʻona', 'd7.n3': 'D2 — pastda IV pogʻona',
  'd7.r0': 'Toʻliq boʻlmagan tonika uchtovushiga yechiladi: VII → I, II → I, IV → III, bas V → I. Tonika uchlangan, kvinta yoʻq.', 'd7.r1': 'Toʻliq tonika uchtovushiga yechiladi: VII pogʻonadagi bas tonikaga koʻtariladi.',
  'd7.r2': 'Tonika uchtovushiga (yoki uning sekstakkordiga) yechiladi: II pogʻonadagi bas I ga oʻtadi.', 'd7.r3': 'Basdagi septima (IV pogʻona) pastga tushadi — tonika sekstakkordiga yechilish.',
  'su.no3': 'Tersiyasiz', 'su.3up': 'Tersiya kvarta ustida', 'su.m9': 'Kvarta tersiya ustida', 'su.phr': 'Frigiy sus♭9', 'su.res': 'Yangrash va yechilish',
  'su.n.no3': 'Gsus — F/G kabi: asos, kvarta, ♭7, 9 — tersiya yoʻq. Ochiq yangraydi va C ga yumshoq olib boradi.',
  'su.n.3up': 'B tersiyasi C kvartasidan yuqorida turadi — Uinton Kellidagi kabi. Afsonaga zid ravishda sus da tersiya boʻlishi mumkin; bu, ehtimol, uning eng goʻzal yangrashi.',
  'su.n.m9': 'B tersiyasi ustidagi C kvartasi kichik nona beradi — keskin ishqalanish. U garmoniya uzoq vaqt bir joyda turadigan modal asarlar uchun saqlab qoʻyiladi.',
  'su.n.phr': 'Esus♭9: asos, ♭9, kvarta, kvinta, ♭7 — frigiy akkord. Dominanta kabi ishlaydi va kvintaga pastga yechiladi (bu yerda — A ga).',
  'un.lh': 'chap qoʻl — 3 va ♭7 tritoni (baʼzan basda asos bilan)', 'un.twin': 'Egizak', 'un.noTwin': 'yoʻq: tuzilma allaqachon triton almashtirish kabi yangraydi', 'un.twinIs': 'oʻsha tuzilma — {r} ustida {u}',
  'un.root': 'Basda asos', 'un.rootYes': 'kerak — aks holda triton almashtirish eshitiladi', 'un.rootNo': 'shart emas', 'un.res': 'Kvintaga pastga', 'un.resYes': 'tortadi — klassik dominanta', 'un.resNo': 'tonika kabi, bluzcha yangraydi', 'un.go': '{t} ga yechilish',
  'sl.s.db': '≈ Csus♭9 (♭13)', 'sl.s.d': 'CΔ♯4 — lidiy', 'sl.s.eb': 'shunchaki Cm7', 'sl.s.e': 'CΔ♯5', 'sl.s.f': 'F 2-aylanmada', 'sl.s.gb': '≈ tersiyasiz C7♭9', 'sl.s.g': 'CΔ9', 'sl.s.ab': 'A♭ 1-aylanmada', 'sl.s.a': '≈ C13♭9', 'sl.s.bb': 'Csus (C9sus4)', 'sl.s.b': 'tonika oʻrniga',
  'sl.n.db': 'Basida katta septima C boʻlgan D♭ major septakkordi. Dominanta sifatida F ga olib boradi.', 'sl.n.d': 'Basdan bir ton yuqoridagi uchtovush 9, ♯11, 13 ni beradi — lidiy major.', 'sl.n.eb': 'Cm7 tovushlari; bunday yozuv faqat bitta bas ustidagi akkordlar zanjiri ichida uchraydi.',
  'sl.n.e': 'Katta tersiya yuqoridagi uchtovush — orttirilgan lidiy akkord.', 'sl.n.f': 'Basida kvinta boʻlgan oddiy F uchtovushi.', 'sl.n.gb': 'Triton yuqoridagi uchtovush: ♭5, ♭7, ♭9 — tersiyasiz dominanta.',
  'sl.n.g': 'Kvinta yuqoridagi uchtovush: 5, 7, 9 — major nonakkord.', 'sl.n.ab': 'Basida tersiya boʻlgan A♭ uchtovushi; G♭/C bilan birga C7alt beradi.', 'sl.n.a': 'Seksta yuqoridagi uchtovush: 13, ♭9, 3 — kichik nonali dominanta.',
  'sl.n.bb': 'Basdan bir ton pastdagi uchtovush — dominanta sus.', 'sl.n.b': 'Basdan yarim ton pastdagi uchtovush — kamaytirilgan gamma yangrashi; Red Garlend va Maylzda — tonika oʻrniga yakuniy akkord.',
  'sl.scale': 'Gamma: {s}.', 'sl.alt': 'G♭/C + A♭/C = C7alt', 'sl.top': 'G ustidagi akkord', 'sl.sounds': 'Yangrashi',
  'fs.maj': 'Major akkordlar', 'fs.min': 'Minor akkordlar', 'fs.dom': 'Dominantalar', 'fs.dim': 'Kamaytirilgan va yarim kamaytirilgan', 'fs.hint': 'chizilgan — noqulay nota; teginish — akkord va gamma',
  'ad.mixed': 'aralash — tarangliklarni aniqlash kerak',
  'ad.n.mixolydian': 'Tabiiy 9 va 13 — miksolidiy lad.', 'ad.n.lyddom': 'Nona alteratsiyasiz ♯11 — lidiy dominanta (melodik minorning 4-ladi).',
  'ad.n.altered': '♭9 yoki ♯9 ♭13 bilan birga, tabiiy 5, 9, 13 siz — alteratsiyalangan gamma (melodik minorning 7-ladi).', 'ad.n.dimhw': '♭9 yoki ♯9 tabiiy 5 va 13 bilan birga — kamaytirilgan «yarim ton — ton» gammasi.',
  'ad.n.phrdom': 'Tabiiy kvinta bilan ♭9 va ♭13 — frigiy dominanta (garmonik minorning 5-ladi), minordagi V.', 'ad.n.whole': 'Tabiiy kvintasiz 9, ♯11 va ♭13 — butun tonli gamma.',
  'ad.n.mixob13': 'Tabiiy kvinta bilan 9 va ♭13 — miksolidiy ♭13 (melodik minorning 5-ladi).', 'ad.n.mixed': 'Bunday birikma asosiy gammalarning birortasida yoʻq: belgini kuy boʻyicha tekshirish kerak.',
  'cr.up': 'Yuqoriga', 'cr.down': 'Pastga', 'cr.n.maj': 'Major: yuqoriga — III va VI dan tashqari koʻtarilgan pogʻonalar, VII esa — pasaytirilgan; pastga — I va V dan tashqari pasaytirilgan pogʻonalar (pasaytirilgan V oʻrniga — koʻtarilgan IV).', 'cr.n.min': 'Minor: yuqoriga ham, pastga ham I va V pogʻonalar takrorlanmaydi — shunda belgilar kamroq va tonallik aniq.',
  'mm.hint': 'yuqorida bitta ovoz, faqat bas oʻzgaradi', 'mm.all': 'Barcha baslar ketma-ket', 'mm.iiv': 'Do da minor ii–V–i: ø → k3 yuqoridagi alt',
  'mm.n0': 'I: katta septimali minor — tonika minori. Uni m6 sifatida ham chalish mumkin.', 'mm.n1': 'II: sus♭9 — tabiiy 13 li frigiy sus; dominanta kabi ishlaydi.', 'mm.n2': 'III: Δ♯5 — orttirilgan lidiy.',
  'mm.n3': 'IV: 7♯11 — lidiy dominanta; VII pogʻona alteratsiyalangan dominantasining triton egizagi.', 'mm.n4': 'V: 7♭13 deyarli chalinmaydi — aslida bu basida kvinta boʻlgan I pogʻona minor-majori.',
  'mm.n5': 'VI: ø — tabiiy nonali yarim kamaytirilgan (lokriy ♮2).', 'mm.n6': 'VII: 7alt — alteratsiyalangan dominanta; u melodik minor tonikasidan yarim ton yuqoriga yechiladi.',
  'hm.ok': 'Barcha kuchli hissalar — oʻz akkordlarida. Tinglash mumkin.', 'hm.bad': 'Kuchli hissa notasi akkordga kirmaydigan taktlar: {n} (ajratib koʻrsatilgan). Maslahat: II, IV, VI pogʻonalar — S; V, VII, II — D.', 'hm.sol': 'Javob varianti',
};

export const TERMS = {
  ivAbbr: ['Intervallarning qisqa yozuvi', 'katta va sof intervallar — raqam bilan (3, 5), kichiklari — ♭ bilan (♭3), orttirilganlari — ♯ bilan (♯4), kamaytirilgan sof intervallar — ♭ bilan (♭5), kamaytirilgan septima — 𝄫7.', 'iv'],
  ivMode: ['Laddagi intervallar', 'major va minorda har bir interval qayerda turishi; barqaror intervallar tonika uchtovushi tovushlaridan iborat, beqarorlari barqarorlarga yechiladi.', 'iv'],
  charIv: ['Xarakterli intervallar', 'garmonik ladning oʻzgartirilgan pogʻonasidan hosil boʻladigan intervallar: ort2, kam7, ort5, kam4.', 'iv'],
  sixth: ['Sekstakkord va kvartsekstakkord', 'uchtovush aylanmalari: pastda tersiya (6) yoki kvinta (6/4).', 'chords'],
  d7: ['Dominantseptakkord (D7)', 'V pogʻona septakkordi: major uchtovush va kichik septima; aylanmalari — D6/5, D4/3, D2.', 'chords'],
  leadseventh: ['Kirish septakkordlari', 'VII pogʻona septakkordlari: tabiiy majorda kichik (m7♭5), garmonik ladlarda kamaytirilgan (°7).', 'chords'],
  susb9: ['Frigiy akkord (sus♭9)', 'kichik nonali dominanta sus: 1, ♭9, 4, 5, ♭7; frigiy ladning asosiy akkordi.', 'chords'],
  ustnum: ['Yuqori tuzilma raqami', 'dominanta tritoni ustidagi uchtovushning asosdan intervali boʻyicha belgisi: II, ♭III, ♭V, ♭VI, VI va minorlari Im, ♭IIm, ♭IIIm, ♯IVm.', 'chords'],
  hybrid: ['Gibrid akkord', 'oʻziga kirmaydigan begona bas ustidagi akkord: D/C, F/G.', 'slash'],
  parent4: ['Toʻrtta ota-ona gamma', 'Levayn qarashi: deyarli barcha akkordlar major, melodik minor, kamaytirilgan va butun tonli gammalardan kelib chiqadi.', 'scales'],
  famscale: ['Akkord va gamma oilalari', 'gammalar akkord turi boʻyicha guruhlangan — major, minor, dominanta, kamaytirilgan — va pogʻona-tarangliklar bilan yozilgan.', 'scales'],
  tonalDeg: ['Tonal va modal pogʻonalar', '1, 4, 5 majorning besh ladida bir xil (lidiy va lokriydan tashqari); 2, 3, 6, 7 oʻzgaradi va ladni belgilaydi.', 'scales'],
  chromscale: ['Xromatik gamma', 'oʻn ikki yarim tondan iborat gamma; uning yozilishi tonallik va yoʻnalishga bogʻliq.', 'scales'],
  varmode: ['Oʻzgaruvchan lad', 'ikki tonikali lad, koʻpincha parallel major va minor.', 'scales'],
  thinkKey: ['Tonallik bilan fikrlash', 'Levayn tamoyili: bitta gammadan bir nechta akkord — turli akkordlar ketma-ketligi emas, bitta tonallik.', 'melmin'],
  mainTriads: ['Bosh uchtovushlar', 'tonika (I), subdominanta (IV) va dominanta (V) uchtovushlari.', 'key'],
};

export const CH = [
{ id: 'iv', t: 'Intervallar', s: 'Garmoniyaning qurilish materiali', src: 'jazzology,levine,fridkin', h: `
<p>[[interval|Interval]] — ikki tovush orasidagi masofa. U ikki son bilan oʻlchanadi: nechta <b>harf</b> (pogʻona) qamrab olishi va unda nechta <b>yarim ton</b> borligi. Birinchisi nomini beradi (sekunda, tersiya, kvarta…), ikkinchisi — sifatini (kichik, katta, sof, orttirilgan, kamaytirilgan). Shuning uchun C–E♯ va C–F klaviaturada bitta klavish boʻlsa ham, turli intervallar: birinchisi — orttirilgan tersiya, ikkinchisi — sof kvarta. Interval kattaligini tonlarda ham oʻlchash mumkin: sof kvarta — 2½ ton, sof kvinta — 3½, katta seksta — 4½, katta septima — 5½.</p>
<p>Jazda intervallar koʻpincha akkord asosidan pogʻona sifatida ataladi: ♭3, ♯11, ♭13. Bu oʻsha til: «♭9» — oktava orqali kichik sekunda, «13» — oktava orqali katta seksta. [[ivAbbr|Qisqa yozuv]] qoidalari: katta va sof intervallar belgisiz raqam bilan yoziladi (3, 5, 7), kichiklari — bemol bilan (♭3, ♭7), orttirilganlari — diyez bilan (♯4, ♯5), kamaytirilgan sof intervallar — bitta bemol bilan (♭5), kamaytirilgan septima — ikkita bilan (𝄫7). Notada belgi harfdan keyin turadi (F♯), pogʻonada — raqamdan oldin (♯4).</p>
<table class="bktab"><tr><th>Kamaytirilgan</th><td>←</td><th>Kichik</th><td>↔</td><th>Katta</th><td>→</td><th>Orttirilgan</th></tr><tr><td>𝄫3, 𝄫7</td><td></td><td>♭3, ♭6, ♭7</td><td></td><td>3, 6, 7</td><td></td><td>♯2, ♯6</td></tr></table>
<p>Sof intervallarda (prima, kvarta, kvinta, oktava) «kichik» boʻgʻin yoʻq: sofdan darhol kamaytirilgan yoki orttirilganga oʻtiladi. Shuning uchun «kichik kvinta» boʻlmaydi — kamaytirilgani bor (♭5). Triton baʼzan TT deb yoziladi.</p>
${lab('iv')}
<h3>Tersdesimagacha barcha intervallar</h3>
<p>Oktavadan keng intervallar <b>murakkab</b> deyiladi: nona — sekunda va oktava, desima — tersiya va oktava, undesima — kvarta va oktava, duodesima — kvinta va oktava, tersdesima — seksta va oktava. Aynan ular akkordlarga [[tension|taranglik]] beradi — 9, 11, 13.</p>
${lab('ivtable')}
<h3>Enarmonik teng intervallar</h3>
<p>Yarim tonlari soni bir xil, lekin nomlari turlicha intervallar bir xil yangraydi, maʼnosi esa boshqa: kichik tersiya (C–E♭) va orttirilgan sekunda (C–D♯), orttirilgan kvarta sifatidagi triton (C–F♯) va kamaytirilgan kvinta sifatidagi triton (C–G♭). Juftlar: k2 = ort1, K2 = kam3, k3 = ort2, K3 = kam4, s4 = ort3, ort4 = kam5, s5 = kam6, k6 = ort5, K6 = kam7, k7 = ort6, K7 = kam8. Qaysi nom toʻgʻriligini notalar yozilishi, demak — tonallik va akkord hal qiladi.</p>
<h3>Intervalning aylanmasi</h3>
<p>Pastki tovush oktava yuqoriga koʻchirilsa, interval «aylanadi». Nomlar yigʻindisi doim 9 (tersiya ↔ seksta, sekunda ↔ septima, kvarta ↔ kvinta), sifat esa teskarisiga oʻzgaradi: katta ↔ kichik, orttirilgan ↔ kamaytirilgan, sof — sof qoladi. Yarim tonlar yigʻindisi — 12. Aylanma — xayolda transpozitsiya qilishning qulay usuli: yuqoriga katta sekstani pastga kichik tersiya sifatida topish osonroq.</p>
${key('[[tritone|Triton]] (6 yarim ton) oktavani teng ikkiga boʻladi va aylanganda ham triton qoladi. Bu dominantaning «motori» va triton almashtirishning asosi.')}
${tip('Sekstani oktava orqali qurish qulay: katta seksta — kichik tersiyasiz oktava, kichigi — katta tersiyasiz oktava; septima — sekundasiz oktava.')}
<h3>Konsonans va dissonans</h3>
<p>[[consonance|Mukammal konsonanslar]] — prima, oktava, kvinta, kvarta; nomukammallari — tersiya va sekstalar; dissonanslar — sekunda, septima va triton. Kvarta — shartli konsonans: bas ustida u beqaror, akkord ichida esa osoyishta yangraydi. Orttirilgan va kamaytirilgan intervallar konsonans kabi yangraganda ham dissonans hisoblanadi: fortepianoda orttirilgan sekunda kichik tersiyaga teng, lekin ladda u yechilishni talab qiladi.</p>
<p>Jazda dissonans xato emas, balki rang: maj7 dagi katta septima, 7♭9 dagi kichik nona. Muhimi — u qayerda turishi va qayerga yechilishi.</p>
${tip('Intervalni chalishdan oldin kuylash foydali. Jaz uchun eng foydalilari — tersiya va septimalar: [[guide|yoʻnaltiruvchi tonlar]] ulardan iborat.')}
<h3>Intervallarni eshitib: mavzular boshlanishi</h3>
<p>Interval tanish kuyga «bogʻlansa», uni tanish osonroq. Levayn jadval tuzgan: unda interval — mashhur jaz mavzusining dastlabki ikki tovushi. Ularni har kuni cholgʻusiz kuylash, yozuvlarni tinglaganda esa kuy notalari orasidagi intervallarni aytish foydali.</p>
<table class="bktab"><tr><th>Interval</th><th>Yuqoriga</th><th>Pastga</th></tr>
<tr><td>kichik sekunda</td><td>Blue Monk</td><td>Bolivia</td></tr><tr><td>katta sekunda</td><td>Four</td><td>—</td></tr><tr><td>kichik tersiya</td><td>Confirmation</td><td>—</td></tr>
<tr><td>katta tersiya</td><td>Monk's Dream</td><td>Giant Steps</td></tr><tr><td>sof kvarta</td><td>Jordu</td><td>ESP</td></tr><tr><td>triton</td><td>Isotope</td><td>—</td></tr>
<tr><td>sof kvinta</td><td>Bags' Groove</td><td>Katrina Ballerina</td></tr><tr><td>kichik seksta</td><td>In a Capricornian Way</td><td>—</td></tr><tr><td>katta seksta</td><td>Misterioso</td><td>All Blues</td></tr>
<tr><td>kichik septima</td><td>Aisha (bridj oxiri)</td><td>Chelsea Bridge (bridj)</td></tr><tr><td>katta septima</td><td>Serenity (2- va 3-tovushlar)</td><td>Lady Day</td></tr><tr><td>oktava</td><td>Del Sasser</td><td>—</td></tr></table>
<h3>Laddagi intervallar</h3>
<p>Hozirgacha interval shunchaki masofa edi. Tonallikda unga rol paydo boʻladi. Majorda har bir interval muayyan pogʻonalarda turadi: kichik sekundalar — faqat III va VII da, katta tersiyalar — I, IV va V da, triton esa bitta: IV dagi orttirilgan kvarta (do majorda fa — si) va VII dagi kamaytirilgan kvinta (si — fa). Garmonik minorda koʻtarilgan VII pogʻonadan [[charIv|xarakterli intervallar]] qoʻshiladi: VI–VII orttirilgan sekunda, VII–VI kamaytirilgan septima, III–VII orttirilgan kvinta va VII–III kamaytirilgan kvarta.</p>
<p>[[ivMode|Barqaror intervallar]] tonika uchtovushi tovushlaridan (I, III, V) tuziladi; qolganlari beqaror va yechiladi: barqaror tovush joyida turadi, beqarori eng yaqin barqarorga oʻtadi. Orttirilgan intervallar yechilganda kengayadi, kamaytirilganlari — torayadi: fa — si tritoni mi — do ga ajraladi, si — fa esa do — mi ga yaqinlashadi. Bu jazda dominantani harakatlantiruvchi oʻsha kuch, faqat ikki ovoz darajasida.</p>
${lab('ivmode')}
` },
{ id: 'chords', t: 'Akkordlar', s: 'Uchtovushdan tersdesimakkordgacha; klassik va jaz nomlari', src: 'jazzology,levine,piano,fridkin', h: `
<p>Jaz akkordi asosdan tersiyalar boʻylab quriladi: 1–3–5–7, keyin — 9, 11, 13. Pastki toʻrt tovush akkord <b>turini</b>, yuqorilari — <b>rangini</b> belgilaydi. Standartlar garmoniyasining deyarli hammasi beshta asosiy [[seventh|septakkordga]] — maj7, m7, 7, m7♭5, °7 — va ikkita qoʻshimchasiga, m(maj7) va 7sus4 ga borib taqaladi.</p>
<h3>Uchtovushlar</h3>
<p>[[triad|Uchtovushlar]]: major (K3 + k3), minor (k3 + K3), kamaytirilgan (k3 + k3) va orttirilgan (K3 + K3). Ularning tovushlari asosiy ton (prima), tersiya toni va kvinta toni deb ataladi. Alohida — [[sus|sus-akkordlar]], ularda tersiya oʻrnida kvarta turadi: ochiq yangraydi va na majorga, na minorga intiladi. Har bir uchtovush turining oʻz xarakteri bor: major — kuch va yorugʻlik, minor — gʻam va oʻy, kamaytirilgan — xavotir, orttirilgan — «tuman», sehrlanganlik.</p>
<p>Major pogʻonalarida major uchtovushlar (I, IV, V), minorlar (II, III, VI) va bitta kamaytirilgan (VII) turadi. Garmonik minorda — I va IV da minor, V va VI da major, II va VII da kamaytirilgan, III da orttirilgan: aynan koʻtarilgan VII pogʻona major dominantani va orttirilgan uchtovushni beradi. Kamaytirilgan va orttirilgan uchtovushlar beqaror va tonikaga intiladi.</p>
${lab('triads')}
<h3>Aylanmalar</h3>
<p>Asosiy koʻrinishda asos pastda. [[inversion|Birinchi aylanmada]] pastda tersiya, ikkinchisida — kvinta, uchinchisida (septakkordda) — septima. Klassik garmoniyada aylanmalarning oʻz nomlari va raqamlanishi bor — basdan intervallar boʻyicha: uchtovush 5/3, [[sixth|sekstakkord]] 6 (pastda tersiya), kvartsekstakkord 6/4 (pastda kvinta); septakkordda — kvintsekstakkord 6/5, terskvartakkord 4/3 va sekundakkord 2. Jazda xuddi shu narsa qiya chiziq bilan yoziladi: C/E — do major sekstakkordi, C/G — kvartsekstakkord. Aylanmalar ovozlar silliq yurishi va bas chiziqlari uchun kerak.</p>
${lab('chord')}
<h3>Yettita septakkord</h3>
<p>Ularni bitta asosdan solishtirish foydali. Bitta nota oʻzgaradi — u bilan xarakter ham: maj7 → 7 (septima pasayadi), 7 → m7 (tersiya pasayadi), m7 → m7♭5 (kvinta pasayadi), m7♭5 → °7 (septima yana yarim ton pasayadi). Ular turlicha yoziladi: maj7 = M7 = Δ, m(maj7) = −Δ = mM7, m7 = −7 = min7, m7♭5 = ø, °7 = dim7, 7sus4 = 7sus.</p>
${lab('seventh')}
<p>Klassikada septakkordlarning oʻz nomlari bor. [[d7|Dominantseptakkord]] (D7) — V pogʻona septakkordi, kichik septimali major uchtovush: jazda bu shunchaki «7». [[leadseventh|Kirish septakkordlari]] — VII pogʻonada: tabiiy majorda kichik kirish (m7♭5), garmonik minor va majorda kamaytirilgan kirish (°7). D7 tonikaga ovoz yurishi qoidalari boʻyicha yechiladi: VII pogʻona — yuqoriga I ga, IV — pastga III ga, II — I ga; har bir aylanmaning oʻz yechilishi va oʻz bas notasi bor.</p>
${lab('d7')}
${key('Bu qanday akkord ekanini tersiya va septima hal qiladi. Kvintani deyarli doim tushirib qoldirish mumkin (♭5 va ♯5 dan tashqari), asosni — bas chalganda.')}
<h3>Sekstakkordlar</h3>
<p>C6 (1–3–5–6) va Cm6 (1–♭3–5–6) — koʻpincha maj7 va m7 oʻrniga olinadigan tonikalar, ayniqsa kuy asosda turganda: kuydagi asos ostidagi katta septima keskin kichik sekunda beradi. 6/9 — nonali oʻsha sekstakkord, eng osoyishta major yangrash. Yozuv akkord turini ham koʻrsatadi: 6 major va minor akkordlarda yoziladi, 13 — dominantalarda; 4 — major va sus akkordlarda (C♯4, Csus4), 11 — dominanta va minorlarda (C7♯11, Cm11).</p>
<h3>Tarangliklar</h3>
<p>9, 11 va 13 tovushlari akkordga rang qoʻshadi. Alteratsiyaning asosiy qoidasi: uchtovush tovushi (3 yoki 5) oʻzgartirilsa, akkord turi oʻzgaradi; taranglik (9, 11, 13) oʻzgartirilsa — tur oʻsha qoladi, rang oʻzgaradi. Hamma tarangliklar ham mumkin emas: taranglik akkord tovushidan yarim ton yuqori boʻlsa (dominantadagi ♭9 dan tashqari), u bilan toʻqnashadi. Masalan, major tersiya ustidagi 11 (Cmaj7 da E ustidagi F) xato kabi yangraydi, shuning uchun major akkordlar ustida ♯11 olinadi.</p>
${lab('tens')}
<p><b>Dominanta</b> — eng moslashuvchan akkord. Qisqa formula: dominanta 11 va katta septimadan boshqa hammasini qabul qiladi. Unga tabiiy (9, 13) yoki alteratsiyalangan (♭9, ♯9, ♯11, ♭13) tarangliklar qoʻshiladi. ♭9/♯9 va ♭13 birikmasi [[altered|alteratsiyalangan dominantani]] — 7alt ni beradi, u yechilishga hammadan kuchli tortadi. G7♭13 yozuvi xavfli: koʻpchilik uni alt deb oʻqiydi, holbuki tabiiy 9 nazarda tutilgan; butun tonli akkordni G7♯5 deb yozish ishonchliroq. °7 va m7♭5 da esa dissonans koʻpincha tarangliklarsiz ham yetarli.</p>
<h3>Sus-akkordlar</h3>
<p>Odatda sus shunday tushuntiriladi: tersiya kvarta bilan almashtirilgan. Yozuv uchun bu toʻgʻri, lekin Levayn sus ga funksional qarashni taklif qiladi: bu kvartasi noqulay nota boʻlib yangramaydigan dominanta. Gsus — bu G ustidagi Dm7 yoki F/G: mohiyatan bitta akkorddagi ii–V. Sus ning belgilovchi tovushlari — 1, 4 va ♭7; qulay joylashuv — bas ustida asosdan bir ton pastdagi major uchtovush.</p>
${two('Levayn', '«Sus da tersiya olish mumkin emas» degan gap — afsona. Pianinochilar (Uinton Kelli) tersiyani ham, kvartani ham oladi, bunda tersiya kvartadan yuqorida turadi. Kvarta tersiyadan yuqoriga qoʻyilsa, ular orasida kichik nona — eng keskin interval hosil boʻladi; u garmoniya bir joyda turadigan modal asarlar uchun saqlab qoʻyiladi.')}
<p>Yaqin qarindoshi — [[susb9|frigiy akkord]] sus♭9: 1, ♭9, 4, 5, ♭7 (yapon in-sen gammasidagi oʻsha besh tovush). Frigiy lad oddiy m7 ustida deyarli yangramaydi — uning ♭6 si akkord bilan toʻqnashadi, — lekin aynan shu akkordni beradi. Sus♭9 dominanta kabi ishlaydi va kvintaga pastga yechiladi; koʻpincha u sus, V7 va butun ii–V oʻrniga qoʻyiladi.</p>
${lab('sus')}
<h3>Yuqori tuzilmalar</h3>
<p>Murakkab dominantani olishning qulay yoʻli: chap qoʻl 1–3–♭7 ni ushlaydi, oʻng qoʻl oddiy uchtovush chaladi. Yuqoridagi uchtovush birdaniga uchta taranglik beradi — bu [[ust|yuqori tuzilma]]. Sxemada 24 uchtovushdan istalganini tanlab, uning dominanta ustida nima qilishini tinglash mumkin. Qizil kataklar — 11 yoki katta septimali uchtovushlar: ular dominanta bilan toʻqnashadi.</p>
${lab('ust')}
<p>Levayn yaxshi yuqori tuzilmalarni toʻqqiztadan iborat tizimga keltiradi va har birini [[ustnum|raqam]] bilan — dominanta asosidan uchtovush asosigacha boʻlgan interval bilan ataydi. Beshta major: II (9, ♯11, 13), ♭III (♯9, 5, ♭7), ♭V (♭5, ♭7, ♭9), ♭VI (♭13, 1, ♯9), VI (13, ♭9, 3); toʻrtta minor: Im, ♭IIm, ♭IIIm, ♯IVm. Eng koʻp ishlatiladiganlari — II, ♭VI va VI: bular dominantaning uchta asosiy rangi — ♯11, alt va ♭9. Bitta gamma tuzilmalari bir-birini almashtira oladi; solistda ♭9 yoki alt ekani noaniq boʻlsa, ♭V mos keladi: u ikkala gammada ham bor. Uchta tuzilma (♭V, ♭IIm, ♭IIIm) basda asossiz oddiy triton almashtirish kabi yangraydi — ularga asos qoʻshiladi. ♭III va Im tonika kabi, «bluzcha» yangraydi va kvintaga pastga tortmaydi.</p>
${lab('ustnum')}
${tip('Tersiya oʻng qoʻlda boʻlsa, chap qoʻlda u takrorlanmaydi. Gitarachilar koʻpincha pastda faqat 1 va ♭7 ni olib, barmoqlarni uchtovush uchun boʻshatadi. Yuqori tuzilmaning takrorlangan tovushi yuqoriga qoʻyiladi. Bitta dominanta ustidagi barcha yaxshi tuzilmalarni koʻrib chiqib, uning mumkin boʻlgan tovushlari deyarli butun xromatik qator ekaniga ishonch hosil qilish oson.')}
<p>Bas ustidagi akkordlar va poliakkordlar — keyingi bob mavzusi.</p>
` },
{ id: 'slash', t: 'Bas ustidagi akkord', s: 'Begona bas ustidagi uchtovush va septakkord: nima yangraydi va qaysi gamma', src: 'levine,jazzology,piano', h: `
<p>Qiya chiziq bilan yozuv (C/E, D/C, F/G) — [[slash|bas notasi ustidagi akkord]]. Uning ortida uchta turli narsa turadi va ularni farqlash foydali. <b>Aylanma</b>: bas — akkordning oʻz tovushi (C/E). <b>[[hybrid|Gibrid akkord]]</b>: bas akkordga tegishli emas va ular birgalikda yangi yangrash beradi (D/C, F/G). <b>Yuqori tuzilma</b>: chap qoʻl akkordi ustidagi uchtovush — u haqda «Akkordlar» bobida soʻz borgan. Gorizontal chiziqli kasr bilan yozuv — [[poly|poliakkord]]: bir vaqtda ikki akkord.</p>
<h3>Bitta bas ustida oʻn ikki uchtovush</h3>
<p>Levayn oddiy mashqni taklif qiladi: basga C ni qoʻyib, uning ustida navbat bilan barcha major uchtovushlarni chalish. Har biri oʻz gammasi bilan oʻz akkordini beradi. D/C — lidiy major (9, ♯11, 13), E/C — orttirilgan lidiy, G/C — shunchaki Cmaj9, B♭/C — dominanta sus, A/C — ♭9 li dominanta, G♭/C — tersiyasiz dominanta, D♭/C — frigiy yangrash, B/C — kamaytirilgan gamma yangrashi: Red Garlend va Maylz Devis uni tonika oʻrniga oxirgi akkord sifatida qoʻyishgan. Uchtovush ikkinchi aylanmada — kvintasi pastda — eng yaxshi yangraydi. Bunday akkordlarni birinchi boʻlib tizimli chala boshlagan — Bad Pauell; koʻpincha ular pastga tushuvchi bas chizigʻi ustida keladi.</p>
${lab('slashtri')}
${tip('Ikki uchtovush birgalikda — G♭/C va A♭/C — toʻliq C7alt beradi. Oʻn ikkitasi orasida butun tonli gamma yoʻq: unda major uchtovushlar boʻlmaydi.')}
<h3>Bas ustidagi septakkordlar</h3>
<p>«Jazzologiya» bu gʻoyani septakkordlargacha yetkazadi: begona bas ustidagi har qanday septakkord tarangliklari bor bitta akkord sifatida oʻqiladi. Fmaj7/G — bu G13sus4, Dm7/G — G11, B♭maj7/G — Gm9, Fm7/G — G7sus4♭9♭13, A♭maj7/G — frigiy akkord. Bunday yozuvlar zamonaviy standartlarda va fyujnda uchraydi: musiqachi tanish «uchi» va basni koʻradi, murakkab akkordni esa eshitadi.</p>
${lab('slash7')}
<h3>Yana ikki yangrash</h3>
<p>Melodik minorning beshinchi ladi oʻz basi ustida (Fm(maj7)/C) C7♭13 sifatida deyarli yangramaydi — 4 va 5 noqulay, — lekin bas ustidagi akkord sifatida u «goʻzal va sirli». Uni oltita teng usulda yozish mumkin: F−Δ/C, Gsus♭9/C, A♭Δ♯5/C, B♭7♯11/C, Dø/C, E7alt/C. Va garmonik major akkordi — ♭6 li maj7 (C–E–G–A♭–B): u kuyda kvinta boʻlganda oddiy maj7 oʻrniga qoʻyiladi — sirli va qorongʻi yangraydi (Xerbi Xenkok, «Dolphin Dance»).</p>
${key('Bas ustidagi akkord — «basida xatosi bor akkord» emas, balki murakkab yangrashni oddiy yozish usuli: tepada tanish shakl, pastda bas. Butunni eshitish kerak.')}
` },
{ id: 'scales', t: 'Gammalar va ladlar', s: 'Major va uning ladlari, akkord oilalari boʻyicha gammalar, minor, simmetrik gammalar, xromatik gamma', src: 'jazzology,levine,kubistra,alekseev,fridkin', h: `
<p>[[scale|Gamma]] — akkord ustidagi kuy quriladigan tovushlar toʻplami. Jazcha yondashuv oddiy: <b>har bir akkordga — gamma</b>, unda akkordning barcha tovushlari va mos tarangliklari bor. Gammalar koʻp, lekin ular uchta ota-ona gammadan kelib chiqadi: major, melodik va garmonik minor — hamda bir nechta simmetrik gamma.</p>
${two('Levayn', 'Ota-ona gammalar uchta emas, [[parent4|toʻrtta]]: major, melodik minor, kamaytirilgan va butun tonli. Levayn garmonik minorni asosdan chiqaradi: ustalar uni minor ii–V–i da deyarli butunligicha chalmaydi, balki uchta turli melodik minorni oladi — ø uchun, alt uchun va tonika minori uchun. U uchun akkord va gamma — «bir narsaning ikki shakli»; 1950–60-yillarda jaz akkordlar bilan fikrlashdan gammalar bilan fikrlashga burildi va Levayn bu burilishni bibopning paydo boʻlishi kabi muhim deb hisoblaydi.')}
<h3>Major ladlari</h3>
<p>C-major tovushlari D dan D gacha chalinsa, doriy [[mode|lad]] chiqadi, E dan — frigiy va hokazo. Tovushlar oʻsha, markaz oʻzgaradi — xarakter ham. Ladni bitta pogʻonasi oʻzgargan major yoki minor deb oʻylash qulayroq: doriy — katta sekstali minor, lidiy — ♯4 li major, miksolidiy — ♭7 li major. Xalq musiqasida bu ladlar jazdan ancha oldin yashagan va xarakterli pogʻonalarning oʻz nomlari bor: doriy seksta, frigiy sekunda, lidiy kvarta, miksolidiy septima.</p>
${lab('scale')}
<h3>Yorqinlik zinapoyasi</h3>
<p>Bitta asosdan yettita lad yorqinlik boʻyicha joylashtiriladi: lidiydan lokriygacha har keyingisi aniq bitta pogʻonani pasaytiradi. Zinapoya pogʻonalarini bosib, yorugʻlik bir notadan qanday ketishini tinglash mumkin. Beshta oʻrta ladda — ioniy, doriy, frigiy, miksolidiy, eoliyda — 1, 4 va 5 pogʻonalar bir xil: bular [[tonalDeg|tonal pogʻonalar]], tayanch; 2, 3, 6 va 7 oʻzgaradi va ladni belgilaydi. Lidiy (♯4) va lokriy (♭5) bu tayanchni buzadi — shuning uchun ular zinapoyaning eng «chetida», oʻrtasi esa — doriy.</p>
${lab('bright')}
${key('Lad [[chartone|xarakterli pogʻonasi]] bilan taniladi: doriy — 6, frigiy — ♭2, lidiy — ♯4, miksolidiy — ♭7, eoliy — ♭6, lokriy — ♭5. Kuyda u taʼkidlansa — lad eshitiladi.')}
<h3>Akkord oilalari boʻyicha gammalar</h3>
<p>Teskari qarash ham bor: «bu lad qaysi gammadan» emas, «bu akkordga qaysi gammalar mos». Gammalar [[famscale|oilalar]] boʻyicha guruhlanadi — major, minor, dominanta, kamaytirilgan — va pogʻona-tarangliklar bilan yoziladi: 1 9 3 11 5 13 7. Shunda bir oila gammalari nimasi bilan farqlanishi (odatda bir-ikki pogʻona) va [[avoid|noqulay nota]] qayerdaligi darhol koʻrinadi: major akkord ustida 4, eoliyda ♭6, frigiyda ♭2 va ♭6, lokriyda ♭2.</p>
${lab('famscale')}
<p>Qisqa amaliy roʻyxat — oʻnta zarur lad. Major: ioniy, lidiy (♯4), miksolidiy (♭7). Minor: eoliy, doriy (6), frigiy (♭2) va lokriy (♭2, ♭5). Dominanta: miksolidiy, lidiy dominanta (♯4), alteratsiyalangan va kamaytirilgan «yarim ton — ton». Bø ustida bibopchilar lokriyni, Bad Pauell — garmonik minorni, 1960-yillardan esa koʻpincha lokriy ♮2 ni chalishgan; koʻpchilik ikkalasidan ham foydalanadi.</p>
<h3>Melodik minor</h3>
<p>Jazdagi [[melmin|melodik minor]] yuqoriga va pastga bir xil: katta seksta va katta septimali minor. Uning ladlari majorda yoʻq yangrashlarni beradi: lidiy dominanta, alteratsiyalangan, lokriy ♮2, orttirilgan lidiy. U haqdagi asosiy gap — alohida bobda: bu shunchaki gamma emas, balki oltita akkord oʻsib chiqadigan butun bir tonallik.</p>
<h3>Garmonik minor va garmonik major</h3>
<p>[[harmmin|Garmonik minor]] — katta septimali minor. Uning beshinchi ladi — <b>frigiy dominanta</b> (miksolidiy ♭9 ♭13) — minordagi dominantaning asosiy gammasi: C-minordagi G7♭9. Xarakterli interval — 6- va 7-pogʻonalar orasidagi kichik tersiya (orttirilgan sekunda): u na majorda, na melodik minorda, na simmetrik gammalarda bor.</p>
${two('Levayn', 'Garmonik minor butunligicha minor ii–V–i ning birorta akkordiga ham mos kelmaydi: tovush choʻzilsa, u akkord bilan toʻqnashadi (Dø ustida — E♭ va B, G7♭9 ustida — C va E♭, Cm(maj7) ustida — A♭). Sakkizliklar bilan butun yurish yaxshi yangraydi — noqulay tovushlar oʻtib ketadi. Gamma eng yaxshi minorga kvintaga pastga boradigan V7♭9 ustida ishlaydi. «Nazariyadagi hamma narsani, shu kitobni ham, bir chimdim tuz bilan qabul qilish kerak».')}
<p>[[harmmaj|Garmonik major]] — ♭6 li major — ♭6 li maj7 akkordini beradi, tonikaning «sirli» varianti; u maj7 ustida kuyda kvinta yangraganda qoʻyiladi.</p>
<h3>Alteratsiyalanganmi yoki kamaytirilganmi?</h3>
<p>Alteratsiyali dominanta ustida gamma tanlashni tarangliklarning oʻzi koʻrsatadi. ♭9 yoki ♯9 ♭13 (♯5) bilan birga — alteratsiyalangan gamma: unda na tabiiy 9, na tabiiy 5 va 13 bor. ♭9 yoki ♯9 tabiiy 5 va 13 bilan birga — kamaytirilgan «yarim ton — ton». Kvintasiz 9, ♯11 va ♭13 — butun tonli. G13♭9 — kamaytirilgan, G7♯9♭13 — alteratsiyalangan.</p>
${lab('altdim')}
<h3>Simmetrik gammalar</h3>
<p>[[dimscale|Kamaytirilgan gamma]] ton va yarim tonni almashtiradi. Boshi oʻzgartirilsa, hammasi boʻlib uchta turli gamma chiqadi va har biri birdaniga toʻrtta °7 ga va toʻrtta 7♭9 dominantaga mos keladi. Dominantadagi ♭9 belgisi odatda shu gammaning butun toʻplamini nazarda tutadi: ♭9, ♯9, ♯11, tabiiy 5 va 13. Mavzudagi °7 deyarli doim keyingi akkordga asossiz V7♭9 (GΔ G♯° Am7 = GΔ E7♭9 Am7), baʼzan bitta oralatib keladigan akkordga; bibopdan beri eski mavzulardagi °7 koʻpincha V7♭9 bilan almashtiriladi. Sof °7 bemaza yangraydi: uning istalgan tovushi bir tonga koʻtarilsa, oʻsha gammada qoladi va akkordga «tishlam» beradi.</p>
${lab('dimeq')}
<p>[[wholetone|Butun tonli]] — ton oraligʻidagi olti tovush, ular faqat ikkita; 7♯5 ga mos. Unda intervallarning yarmi yoʻq (kichik sekunda, kichik tersiya, kvarta, kvinta), shuning uchun u tez joniga tegadi: u kichik dozalarda beriladi, 7♯5 oʻrniga esa koʻpincha alt chalinadi. Butun tonli gamma ustasi — Telonius Monk, va uning siri notalarda emas, ritmda.</p>
<h3>Pentatonikalar va bluz gammasi</h3>
<p>[[pentatonic|Pentatonika]] — yarim tonsiz besh tovush: major (1 2 3 5 6) va minor (1 ♭3 4 5 ♭7) — turli tovushdan boshlangan bir xil gamma. Bu IV va VII pogʻonalarsiz major, demak, unda birorta ham triton yoʻq — intilishlar yoʻq, shuning uchun pentatonika deyarli hamma narsaga «tushadi». [[blues|Bluz gammasi]] — ♭5 qoʻshilgan minor pentatonika. Yapon ladlari kumoi, in-sen, xiradzyosi — yarim tonli pentatonikalar, m6, sus va maj7♯11 ustida zamonaviy yangraydi.</p>
<h3>Bibop gammalari</h3>
<p>[[bebop|Bibop gammasi]] — yetti pogʻonali gamma va bitta xromatik tovush. Akkord tovushidan sakkizliklar bilan yurilganda kuchli hissalarga akkord tovushlari tushadi. Bibop dominanta — katta septimali miksolidiy (♭7 va 1 orasida xromatizm); major — ♯5 li major; doriy — katta tersiyali doriy; melodik minor bibopi ham bor (5 va 6 orasida xromatizm). D dan bibop doriy — G dan bibop dominanta bilan oʻsha tovushlar: demak, butun ii–V uchun bitta gamma yetadi. Bibop gammalari koʻpincha yuqoridan pastga yangraydi.</p>
${tip('Gammani akkord orqali oʻrganish foydali: akkord — chap qoʻlda, gamma — oʻngda, va nafaqat asosdan, balki akkordning har bir tovushidan. Yuqoridagi sxemada «Akkord ustida» tugmasi bor.')}
<h3>Xromatik gamma</h3>
<p>[[chromscale|Xromatik gamma]] — ketma-ket barcha oʻn ikki yarim ton. U bir xil yangraydi, lekin turlicha yoziladi — tonallik va yoʻnalishga qarab. Majorda yuqoriga III va VI dan tashqari barcha pogʻonalar koʻtarilgan holda takrorlanadi, VII esa pasaytirilgan holda keladi; pastga — I va V dan tashqari hammasi pasaytirilgan holda. Minorda ikkala tomonga ham I va V takrorlanmaydi. Bu qoida bibop xromatizmini ham tushuntiradi: nega oʻtkinchi tovush goh diyez, goh bemol bilan yoziladi.</p>
${lab('chromsc')}
<h3>Oʻzgaruvchan lad</h3>
<p>Baʼzan kuyning ikki markazi boʻladi: bir ibora fa majorda, keyingisi — re minorda, va birortasi ham bosh emas. Bu [[varmode|oʻzgaruvchan lad]] — odatda parallel major va minor. Modulyatsiya yoʻq: ikkala markaz bitta tovushqatorda yashaydi. Jaz eshitishiga bu yaqin — «tonal markazlar» bilan va modal shunday fikrlanadi.</p>
<h3>Barcha gammalar</h3>
<p>Toʻliq roʻyxat: major, melodik va garmonik minor ladlari, garmonik major, simmetrik gammalar, pentatonikalar, bibop va dunyo gammalari — vengr, loʻli, fors, arab, bali va boshqalar.</p>
${lab('refsc')}
` },
{ id: 'melmin', t: 'Melodik minor', s: 'Bitta tonallik — oltita akkord; akkord bilan emas, tonallik bilan fikrlash', src: 'levine,piano,jazzology', h: `
<p>Melodik minor — zamonaviy jaz garmoniyasining asosiy kashfiyoti va, Levayn fikricha, 1960-yillardan keyingi butun yangrashning kaliti. Uning yetti pogʻonasi yettita akkord beradi; do melodik minorda bular Cm(maj7), Dsus♭9, E♭Δ♯5, F7♯11, G7♭13, Aø va B7alt. Lad raqamlarini oila sifatida, bitta qator kabi yodlash foydali: minor-major — I, sus♭9 — II, Δ♯5 — III, 7♯11 — IV, ø — VI, alt — VII. Beshinchi lad (7♭13) deyarli chalinmaydi: aslida bu basida kvinta boʻlgan I pogʻona minor-majori.</p>
<h3>Noqulay notalar yoʻq</h3>
<p>Majorda har bir akkordning «noqulay» notasi bor: I ustida 4, V ustida 4. Melodik minorda ular yoʻq — gammaning barcha tovushlari uning oilasidagi har bir akkordga mos keladi. Bundan asosiy xulosa: bitta melodik minor tonalligi ichidagi hamma narsa bir-birini almashtira oladi. Bitta joylashuv, bitta ibora, bitta lik Cm(maj7), Dsus♭9, E♭Δ♯5, F7♯11, Aø va B7alt uchun yaraydi — faqat bas oʻzgaradi. Bu aynan [[thinkKey|«akkord bilan emas, tonallik bilan fikrlash»]].</p>
${lab('mmfamily')}
<p>Tonallikni tanishga ikkita «xarakterli toʻrtlik» yordam beradi: melodik minorning 1–3–5–7 va 3–5–7–9 tovushlari (C–E♭–G–B va E♭–G–B–D) boshqa hech bir tonallikda — na majorda, na kamaytirilganda, na butun tonlida — birga uchramaydi. Ularning istalgani tonallikni darhol «aytadi», shuning uchun pianinochilar ularni oilaning barcha oltita akkordi ustida chaladi. Melodik minorda kvartalar uch xil boʻladi — sof, tritonlar va katta tersiya kabi yangraydigan bitta «kvarta» (B–E♭); uning qorongʻi, gʻayrioddiy yangrashi shundan.</p>
<h3>Triton egizaklar</h3>
<p>Bitta tonallikning ikki dominanta akkordi — 7♯11 (IV pogʻona) va alt (VII) — bir-biridan triton masofada turadi va mohiyatan bitta akkord: F7♯11 = B7alt, ularning tovushlari ham, maqsadlari ham bir (ikkalasi E ga olib boradi). Shundan 7♯11 ning tersiyasiz va alt ning septimasiz joylashuvlari — akkord emas, butun tonallik chalinadi. «Qoʻrqinchli» D♯ø, C♯ø, GΔ♯5, A7♯11, F♯sus♭9, E−Δ ketma-ketligi bitta E melodik minor — bitta akkord boʻlib chiqadi.</p>
<h3>Minor ii–V</h3>
<p>ø da chalingan hamma narsani alt da kichik tersiya yuqorida takrorlash mumkin. Dø F melodik minor tovushlarini oladi, G7alt — A♭ melodik minornikini, bu esa kichik tersiya yuqorida. Sekvensiya hosil boʻladi va quloq unda mantiqni eshitadi. Minor ii–V majorga ham yechilishi mumkin: Gø — C7alt — FΔ.</p>
<h3>m7 oʻrniga minor-major</h3>
<p>Yana bir natija. Agar m7 ii–V juftida turmasa — undan keyin kvarta yuqoridagi dominanta yoki uning triton almashtirishi kelmasa, — u tonika minori rolini oʻynaydi va uni m6 yoki m(maj7) sifatida chalish mumkin. Istisno — kuyda ♭7 boʻlganda. Bu qoidaga koʻplab reharmonizatsiyalar va akkompanement ovozlari tayanadi.</p>
${key('Melodik minor — bitta tonallik va oltita akkord. Belgilar ortida tonallikni koʻrish — «qiyin» ketma-ketlikda oʻnlab akkord oʻrniga ikki-uchta gammani koʻrish demakdir.')}
${tip('Har kuni — bitta melodik minor tonalligi: «−Δ, sus♭9, Δ♯5, 7♯11, ø, alt» qatorini ovoz chiqarib va cholgʻuda. Javob tezligini mashq qilish ham foydali: «C7alt — D♭ melodik minor, F7alt — F♯ melodik minor…» kvinta doirasi boʻylab, avval oʻn soniyada, keyin soniyaning bir ulushida.')}
` },
{ id: 'key', t: 'Tonallik va funksiyalar', s: 'Pogʻonalar, rim raqamlari, funksiyalar, bosh uchtovushlar, kadensiyalar', src: 'jazzology,fridkin,maksimov', h: `
<p>Gammaning har bir pogʻonasida septakkord qurilsa, tonallik akkordlari oilasi hosil boʻladi. Majorda: Imaj7, iim7, iiim7, IVmaj7, V7, vim7, viiø. Raqamlar [[roman|rim raqamlari]] bilan yoziladi: bosh harflar — major akkordlar, kichiklari — minor. Shunday qilib ketma-ketlik tonallikka bogʻlanmasdan yoziladi: oʻn ikkitadan istalganida «ii–V–I».</p>
${lab('key')}
<h3>Uchta funksiya</h3>
<p>Akkordlar roli boʻyicha uchta guruhga boʻlinadi — [[function|funksiyalar]]: [[tonic|tonika]] (osoyishtalik: I, iii, vi), subdominanta (osoyishtalikdan harakat: ii, IV) va [[dominant|dominanta]] (yechilishni talab qiluvchi taranglik: V, vii). Bir guruh akkordlari bir-birini almashtira oladi — diatonik almashtirish shunga asoslanadi. vi pogʻona ikki yoqlama: unda tonika bilan ham, subdominanta bilan ham ikkitadan umumiy tovush bor, shuning uchun uning roli oʻrniga bogʻliq — V dan keyin (V–vi) u tonika kabi, V dan oldin (vi–V–I) — subdominanta kabi yangraydi. Minorda tonika — i va ♭III, subdominanta — ii, iv va ♭VI, dominanta — V va ♭VII.</p>
<p>Funksiyalar xarakterini soʻz bilan ham taʼriflash mumkin. Tonika — toʻliq osoyishtalik, deyarli doim asar oxiri. Dominanta dinamik: unda kirish tovushi, V7 da esa yana triton bor. Subdominanta yumshoqroq: IV da tonikaning oʻzi bor (do majorda fa — lya — do), shuning uchun uning harakati osoyishtaroq.</p>
${key('Deyarli har qanday jaz ketma-ketligi — «subdominanta → dominanta → tonika» almashinuvi. ii–V–I — uning eng zich shakli.')}
<h3>Bosh uchtovushlar va ovoz yurishi</h3>
<p>Klassik garmoniya uchta [[mainTriads|bosh uchtovushdan]] boshlanadi — I, IV va V dagi T, S va D. Ular oddiy qoida boʻyicha ulanadi: umumiy tovush joyida qoladi, qolgan ovozlar keyingi akkordning eng yaqin tovushlariga sakrashsiz boradi. S dan T ga ikki ovoz sekundaga pastga, D dan T ga — yuqoriga yuradi. Odatiy ketma-ketliklar — T–S–T, T–D–T, T–S–D–T; D oʻrniga koʻpincha kvintasiz toʻliq boʻlmagan D7 olinadi. Minorda dominanta garmonik minordan — major holida olinadi.</p>
<p>Garmoniya boʻyicha eng oddiy va foydali mashq — kuyga bosh uchtovushlarni tanlash: kuchli hissadagi kuy tovushi akkordga kirishi kerak. Jaz reharmonizatsiyasi («Aranjirovka» bobi) — xuddi shu narsa, faqat akkord tanlovi kengroq.</p>
${lab('harmtsd')}
<h3>Minor</h3>
<p>Jazdagi minor — bir nechta gamma qorishmasi. «Jazzologiya» minorning toʻrtta ota-ona gammasini ataydi: eoliy, doriy, garmonik va melodik minor. Qoʻzgʻalmas minor akkord uchun koʻpincha doriy va melodik minor, minor ketma-ketlik uchun — tabiiy va garmonik minor olinadi. Tonika odatda m6 yoki m(maj7), ii — m7♭5, V — 7♭9 yoki 7alt. Sxema garmonik va melodik minorga oʻtkazilsa, bu akkordlar qayerdan kelishi koʻrinadi.</p>
<h3>Kadensiyalar</h3>
<p>[[cadence|Kadensiya]] iborani yakunlaydi. Autentik (V–I) — asosiysi. Plagal (IV–I) — «omin». Uzilgan (V–vi) — kutishni aldash: tonika oʻrniga uning oʻrinbosari yangraydi. Yarim kadensiya — V da toʻxtash. Xuddi shu til akkordsiz kuy uchun ham ishlaydi («Kuy va musiqa tuzilishi» bobi).</p>
<h3>Kvinta doirasi</h3>
<p>[[circle|Kvinta doirasida]] tonalliklar kvinta oraligʻida turadi, qoʻshnilar bitta belgi bilan farqlanadi. Jaz uchun asosiysi: asoslar odatda <b>soat strelkasiga teskari</b> — kvintaga pastga yuradi: D → G → C → F. Doiraning oʻzi, belgilar va tonalliklar qarindoshligi — «Tonalliklar» bobida.</p>
` },
];
