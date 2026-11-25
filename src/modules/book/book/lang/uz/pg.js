// Darslik (uz): "Noldan gitara" — klassik gitara, 9 ta qisqa dars (muallif 25.11.2026: klassika; avval faqat major akkordlar, minor — keyin).
const tip = (t) => '<aside class="btip"><b>Sinab koʻring</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Eslab qoling</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'bk.part9': 'Noldan gitara',
  'lp.guitar.kicker': 'Klassik gitara', 'lp.guitar.title': 'Noldan gitara', 'lp.guitar.sub': '9 ta dars: oʻtirish, tuzilish, sozlash, birinchi major akkordlar',
  'lp.guitar.lead': 'Klassik gitara (neylon torlar) uchun. Avval qanday oʻtirish va gitara nimadan iborat, keyin sozlash va akkord sxemalarini oʻqish, soʻng uchta major akkord va ular orasida almashish. Minor akkordlar — keyingi qadam, major toza chiqqanda.',
  'ls.g1': 'Oʻtirish', 'ls.g2': 'Gitara tuzilishi', 'ls.g3': 'Sozlash', 'ls.g4': 'Ogʻriqsiz qoʻllar', 'ls.g5': 'Akkord sxemasini oʻqish',
  'ls.g6': 'C akkordi', 'ls.g7': 'G akkordi', 'ls.g8': 'D akkordi', 'ls.g9': 'Akkord almashish va birinchi qoʻshiq',

  'lx.g1.g': ul('Stulning old yarmiga oʻtirish, orqa tik, yelkalar pastda.', 'Chap oyoqni tagoyoqqa (yoki kitoblar uyumiga) qoʻyish, gitarani chap songa qoʻyish.', 'Gitara boʻyni yuqoriga qiyshiq, korpus oʻng bilak bilan koʻkrakka bosilgan.'),
  'lx.g1.t': 'Yondan rasmga olish (yoki oynaga qarash) va chizma bilan solishtirish: orqa, tagoyoq, son.',
  'lx.g1.easy': 'Gitarani uch tayanch ushlaydi: son, koʻkrak va oʻng bilak. Chap qoʻl ushlamaydi — faqat barmoq qoʻyadi.',
  'lx.g1.fix': ul('Gitara sirpanadi — tagoyoq past yoki boʻyin juda tik.', 'Orqa yoki boʻyin ogʻriydi — boʻyinga bosh bilan choʻzilmang: boʻyinni oʻzingizga torting.'),
  'lx.g2.g': ul('Gitarada toʻqqiz qismni topib, ovoz chiqarib aytish.', 'Har bir torni tortib, u qaysi quloqqa borishini koʻrish.'),
  'lx.g2.t': 'Rasmdagi raqamlarga tegib, har qism nima uchun kerakligini oʻqish.',
  'lx.g2.easy': 'Gitara — tovushni kuchaytiruvchi korpus, balandlik tanlanadigan boʻyin va jaranglaydigan torlardan iborat.',
  'lx.g2.fix': 'Qaysi tor ekanini bilmayapsizmi? Eng yoʻgʻon (6-) tor tizzada yuzga yaqin, eng ingichka (1-) — polga yaqin.',
  'lx.g3.g': ul('Tyunerni ochib, 6-torni tortish. Strelka chapda — tovush past, oʻngda — baland.', 'Quloqni sekin burash, torni pastdan kerakli tovushga yetkazish.', 'Barcha oltita torni sozlab, yana aylanib tekshirish.'),
  'lx.g3.t': 'Gitara yoʻqmi? Ekrandagi pianinoda sozni chalib, har notani kuylang.',
  'lx.g3.easy': 'Sozlash — har bir torni kerakli tovushga keltirish. Gitara soz: mi, lya, re, sol, si, mi (yoʻgʻondan ingichkaga).',
  'lx.g3.fix': ul('Yangi neylon torlar dastlabki kunlarda "suzadi" — har mashgʻulotdan oldin sozlang, bu odatiy.', 'Tor soz ushlamaydi — quloqqa yaxshi oʻralganini tekshiring.'),
  'lx.g4.g': ul('Chap qoʻl: bosh barmoq boʻyin orqasida, qolganlari tor ustida lad yonida (ladlar oʻrtasida emas).', 'Oʻng qoʻl: bosh barmoq (p) bas torlarni, koʻrsatkich (i), oʻrta (m) va nomsiz (a) ingichka torlarni chaladi.', 'Ochiq 1-torni metronom 60 da choraklab chalish, i va m ni almashtirib.'),
  'lx.g4.t': 'Metronomga mos ekranda teng choraklarni bosish.',
  'lx.g4.easy': 'Oʻng qoʻl barmoqlari harf bilan: p — bosh, i — koʻrsatkich, m — oʻrta, a — nomsiz. Chap qoʻl raqam bilan: 1 — koʻrsatkich, 2 — oʻrta, 3 — nomsiz, 4 — jimjiloq.',
  'lx.g4.fix': ul('Barmoq uchlari ogʻriydi — dastlabki 2–3 hafta odatiy; 10–15 daqiqa shugʻullaning va tanaffus qiling.', 'Tor shaqillaydi — barmoq ladga uzoq; metall chiziqqa yaqinlashtiring.', 'Chap qoʻl tirnoqlari qisqa, oʻngniki barmoq uchidan biroz chiqib turadi.'),
  'lx.g5.g': ul('Sxemada akkordni tanlab, har torni oʻqish: "×", "○" yoki lad va barmoq.', '"Tinglash" ni bosib, tovushni nomi bilan solishtirish.'),
  'lx.g5.t': 'Uchta akkordni tanlab, barmoqlar qaysi ladlarda ekanini ovoz chiqarib aytish.',
  'lx.g5.easy': 'Sxema — tik burilgan boʻyin: yoʻgʻon tor chapda. Nuqta — barmoq qoʻyiladigan joy, nuqtadagi raqam — qaysi barmoq.',
  'lx.g5.fix': 'Qaysi lad ekani tushunarsizmi? Yuqoridagi qalin chiziq — porog, undan pastda ladlar: birinchi katak — 1-lad, ikkinchisi — 2-lad va hokazo.',
  'lx.g6.g': ul('Barmoqlar: 1 — 2-torning 1-ladida, 2 — 4-torning 2-ladida, 3 — 5-torning 3-ladida.', 'Besh ingichka torni chalish (5-dan 1-gacha), 6-ni chalmaslik.', 'Har torni alohida tortib, toza jarangini tekshirish.'),
  'lx.g6.t': 'Qoʻl shaklini oʻrganing: uch barmoq zinapoya shaklida.',
  'lx.g6.easy': 'C akkordi — uch barmoqli "zinapoya": 1-barmoq polga eng yaqin, 3-barmoq eng yoʻgʻon torda.',
  'lx.g6.fix': ul('Bir tor ovozsiz — barmoq qoʻshni torga tegadi; barmoqni tikroq, uchiga qoʻying.', 'Qoʻl qotadi — yelkani boʻshating, bosh barmoq bilan bosmang.'),
  'lx.g7.g': ul('Barmoqlar: 2 — 6-torning 3-ladida, 1 — 5-torning 2-ladida, 3 — 1-torning 3-ladida.', 'Barcha oltita torni chalish.', 'Birma-bir tortib, hammasi toza jaranglashini tekshirish.'),
  'lx.g7.t': 'Sxemadagi akkordni tinglab, barmoqlarni havoda takrorlang.',
  'lx.g7.easy': 'G da ikkita barmoq yoʻgʻon torlarda, bittasi eng ingichkada — qoʻl keng ochiladi.',
  'lx.g7.fix': ul('1-torga yetmayapti — qoʻlni oʻzingizga yaqinlashtiring, boʻyinni sal uzoqroq.', 'Ingichka tor ovozsiz — 3-barmoq yotiq turibdi; uchiga qoʻying.'),
  'lx.g8.g': ul('Barmoqlar: 1 — 3-torning 2-ladida, 3 — 2-torning 3-ladida, 2 — 1-torning 2-ladida.', 'Toʻrtta ingichka torni chalish (4-dan 1-gacha), 5- va 6-ni chalmaslik.', 'Uch barmoq bir-biriga yaqin "uchburchak".'),
  'lx.g8.t': 'Shaklni oʻrganing: boʻyinning bir katagida uch barmoqdan uchburchak.',
  'lx.g8.easy': 'D — uchtadan eng ixchami: barmoqlar yonma-yon, faqat toʻrt ingichka tor chalinadi.',
  'lx.g8.fix': ul('5-tor jaranglaydi — uni chalmang: 4-dan boshlang.', 'Barmoqlar bir-biriga xalaqit beradi — tikroq, uchiga qoʻying.'),
  'lx.g9.g': ul('C → G → C → G → D → G → C ni metronom 60 da almashtirish: har akkordga 4 hisob, almashish pauzada.', 'Bir daqiqada nechta toza almashish chiqishini sanab yozib qoʻying. Bir haftadan keyin solishtiring.', 'Shu akkordlarda "When the Saints" ni chaling.'),
  'lx.g9.t': 'Oʻz yozuvingizni tinglab, almashish kechikkan joyni toping.',
  'lx.g9.easy': 'Almashish — tezlik emas, tayyorgarlik: barmoqlar eski akkord hali jaranglayotganda yangisiga boradi.',
  'lx.g9.fix': ul('Ulgurmayapti — sekinlashtiring: metronom 50, almashishni "toʻrt" da qiling.', 'Barmoqlar ladlarni qidiradi — almashishdan oldin sxemaga qarab butun shaklni koʻring.'),

  'gp.parts.aria': 'Gitara oldidan: raqamga tegib qismni koʻring', 'gp.parts.hint': 'Raqamga tegib, bu nima va nega kerakligini oʻqing.',
  'gp.pegs.n': 'Quloqlar', 'gp.pegs.d': 'Burilib, torlarni tortadi: tarangligi balandlikni belgilaydi. Sozlash — quloqlarni burash.',
  'gp.head.n': 'Boʻyin boshi', 'gp.head.d': 'Quloqlar joylashgan boʻyinning yuqori uchi. Torlar u orqali quloqlarga boradi.',
  'gp.nut.n': 'Porog', 'gp.nut.d': 'Boʻyin boshidagi torlar uchun oʻyiqli plankcha. Ladlar undan hisoblanadi.',
  'gp.neck.n': 'Boʻyin', 'gp.neck.d': 'Barmoqlar torlarni bosadigan uzun qism. Korpusga yaqinlashgan sari tovush balandlashadi.',
  'gp.fret.n': 'Ladlar', 'gp.fret.d': 'Boʻyin boʻylab metall chiziqlar. Ladda bosilgan tor oldingisidan yarim ton baland jaranglaydi.',
  'gp.strings.n': 'Torlar', 'gp.strings.d': 'Oltita tor: uchta yoʻgʻon bas (6, 5, 4) va uchta ingichka (3, 2, 1). Soz: mi, lya, re, sol, si, mi.',
  'gp.hole.n': 'Rezonator teshigi', 'gp.hole.d': 'Korpusdagi yumaloq teshik: ichidagi havo tovushni kuchaytiradi. Oʻng qoʻl uning ustida chaladi.',
  'gp.body.n': 'Korpus', 'gp.body.d': 'Ichi boʻsh yogʻoch qism. Torlar tovushini kuchaytirib, baland va iliq qiladi.',
  'gp.bridge.n': 'Koʻprik (bridj)', 'gp.bridge.d': 'Korpusdagi torlar uchlari mahkamlanadigan plankcha. Tebranishni yuqori dekaga uzatadi.',
  'gp.pos.aria': 'Klassik gitara bilan oʻtirish: yon koʻrinish', 'gp.pos.1': 'Orqa tik, yelkalar pastda.', 'gp.pos.2': 'Chap oyoq tagoyoqda.', 'gp.pos.3': 'Gitara chap sonda, boʻyin yuqoriga.',
  'gp.box.aria': '{n} akkord sxemasi', 'gp.box.mute': 'chalmaslik', 'gp.box.open': 'ochiq tor', 'gp.box.fret': '{f}-lad, {p}-barmoq', 'gp.box.hear': 'Tinglash',
};
export const TERMS = {};
export const CH = [
  { id: 'g1', t: 'Oʻtirish', s: 'Uch tayanch: oyoq, son, koʻkrak', src: '', h: `
<p>Klassik gitaraning oʻz oʻtirishi bor: uni qoʻl emas, tana ushlaydi, shuning uchun chap qoʻl erkin va faqat barmoq qoʻyadi.</p>
{{lab:gpos}}
<p>Chap oyoq tagoyoqqa (past skameyka yoki kitoblar uyumiga) qoʻyiladi, gitara chap sonda turadi. Boʻyin biroz yuqoriga qaraydi, korpus oʻng bilak bilan koʻkrakka yengil bosiladi.</p>
<p>Oʻng qoʻl korpusning yuqori chetida yotadi: bilak teshik ustida, barmoqlar torlarni yuqoriga va ichkariga tortadi. Yelkalar pastda, orqa tik, lekin tarang emas.</p>
${key('Gitarani son, koʻkrak va oʻng bilak ushlaydi. Qoʻl charchasa — nimanidir tuzatish kerak, chidab turmang.')}
${tip('Oʻtirib, oyoqni tagoyoqqa qoʻying va gitarani qoʻying: sirpanmasligini va qoʻl bilan ushlamasligingizni tekshiring.')}
` },
  { id: 'g2', t: 'Gitara tuzilishi', s: 'Toʻqqiz qism va ular nima uchun', src: '', h: `
<p>Faqat toʻqqiz qismni bilish kerak — ular har darsda tilga olinadi. Rasmdagi raqamga tegsangiz, nomi va izohi chiqadi.</p>
{{lab:gparts}}
<p>Tovush shunday tugʻiladi: tor tebranadi, koʻprik tebranishni korpusga uzatadi, korpus va ichidagi havo uni kuchaytiradi, tovush teshikdan chiqadi.</p>
${key('Quloqlar tarangligni oʻzgartiradi, ladlar balandlikni tanlaydi, korpus kuchaytiradi.')}
` },
  { id: 'g3', t: 'Sozlash', s: 'Mi, lya, re, sol, si, mi', src: '', h: `
<p>Har mashgʻulotdan oldin gitara sozlanadi — bu bir daqiqa, lekin usiz har qanday akkord "qiyshiq" eshitiladi.</p>
<p>Klassik gitara sozi, eng yoʻgʻon (6-) dan eng ingichka (1-) gacha: <b>mi, lya, re, sol, si, mi</b>. Harflar bilan: E A D G B E.</p>
<p>Tyuner yordam beradi: u torni tinglab, tovush kerakligidan baland yoki pastligini strelka bilan koʻrsatadi. Quloqni sekin buraladi, tor pastdan kerakli tovushga tortiladi.</p>
${key('Pastdan yuqoriga tortish: tovush baland boʻlsa, pastroqqa boʻshatib qayta tortiladi.')}
${tip('6-torni tortib tyuner bilan sozlang; keyin qolganlarini tartib bilan.')}
` },
  { id: 'g4', t: 'Ogʻriqsiz qoʻllar', s: 'Barmoq qoʻyish va uchlarini qiynamaslik', src: '', h: `
<p>Dastlabki haftalarda chap qoʻl barmoq uchlari ogʻriydi — teri qotguncha bu odatiy. Yomonlashtirmaslik uchun 10–15 daqiqa shugʻullanib, tanaffus qiling.</p>
<p>Chap qoʻl: bosh barmoq boʻyin orqasida, qolganlari tor ustida lad yonida. Barmoqlar raqam bilan: 1 — koʻrsatkich, 2 — oʻrta, 3 — nomsiz, 4 — jimjiloq.</p>
<p>Oʻng qoʻl: barmoqlar harf bilan — <b>p</b> bosh, <b>i</b> koʻrsatkich, <b>m</b> oʻrta, <b>a</b> nomsiz. Bas torlarni p, ingichkalarni i, m va a chaladi.</p>
${key('Qattiq ogʻrimasligi kerak. Ogʻriq boʻlsa, shunchaki odatlanmagan boʻlmasa — toʻxtab dam oling.')}
${tip('Ochiq 1-torni metronom 60 da choraklab chaling, i va m ni almashtirib.')}
` },
  { id: 'g5', t: 'Akkord sxemasini oʻqish', s: 'Bir marta tushunish — keyin oʻzi oʻqiladi', src: '', h: `
<p>Akkordlar sxema bilan yoziladi: bu tik burilgan boʻyin. Yoʻgʻon 6-tor chapda, ingichka 1-tor oʻngda.</p>
{{lab:gbox}}
<ul>
<li><b>Yuqoridagi qalin chiziq</b> — porog, ladlar undan pastda.</li>
<li><b>Raqamli nuqta</b> — barmoq qoʻyiladigan joy; raqam — qaysi barmoq.</li>
<li><b>Tor ustida ○</b> — ochiq torni chalish.</li>
<li><b>Tor ustida ×</b> — bu torni chalmaslik.</li>
</ul>
${key('Sxema yuqoridan pastga va chapdan oʻngga oʻqiladi: avval qaysi torlar chalinishini, keyin barmoqlar qayerga qoʻyilishini koʻring.')}
${tip('Akkordni tanlab, "Tinglash" ni bosing va tovushni sxema bilan solishtiring.')}
` },
  { id: 'g6', t: 'C akkordi', s: 'Birinchi major akkord', src: '', h: `
<p>C akkordi — eng tanish. Uch barmoq zinapoya shaklida turadi: 1-barmoq 1-ladda, 2-barmoq 2-ladda, 3-barmoq 3-ladda.</p>
{{lab:gbox}}
<p>Besh ingichka tor chalinadi, 5-dan 1-gacha; 6-ga tegilmaydi (uning ustida "×" bor).</p>
${key('Barmoqlarni birdaniga va uchida qoʻying, yotiq emas — aks holda qoʻshni tor ovozsiz boʻladi.')}
${tip('Akkordni qoʻyib, har torni alohida tortib, hammasi toza jaranglashini tekshiring.')}
` },
  { id: 'g7', t: 'G akkordi', s: 'Ikkinchi major akkord', src: '', h: `
<p>G akkordi kengroq jaranglaydi: barcha oltita tor chalinadi. Ikki barmoq yoʻgʻon torlarda, bittasi eng ingichkada.</p>
{{lab:gboxg}}
<p>C dan G ga oʻtganda qoʻl "ochiladi": barmoqlar yuqoriga va yonga boradi. Bu qoʻshiqlardagi eng koʻp uchraydigan almashish.</p>
${key('Almashish — tezlik emas, oldindan oʻylangan harakat: barmoqlar eski akkord hali jaranglayotganda yangisiga boradi.')}
${tip('C, keyin G ni chaling — metronom 60 da har biriga toʻrt hisob.')}
` },
  { id: 'g8', t: 'D akkordi', s: 'Uchinchi major akkord', src: '', h: `
<p>D akkordi — uchtadan eng ixchami: uch barmoq yonma-yon, faqat toʻrt ingichka tor (4-dan 1-gacha) chalinadi.</p>
{{lab:gboxd}}
<p>C, G va D — koʻplab qoʻshiqlarning asosi: ularni chalib, toza almashishni oʻrganib, oddiy joʻrlik qilish mumkin.</p>
${key('Hozircha faqat major. Minor akkordlar (Am, Em, Dm) — keyingi qadam, major toza va toʻxtamasdan chiqqanda.')}
${tip('D ni qoʻyib, toʻrt ingichka torni chaling va 5- hamda 6-tor jim ekanini tekshiring.')}
` },
  { id: 'g9', t: 'Akkord almashish va birinchi qoʻshiq', s: 'C, G va D birga', src: '', h: `
<p>Endi uch akkordni almashtirishni oʻrganish kerak. Metronom 60 da har akkordga toʻrt hisob; taktning oxirgi hisobida barmoqlar yangisiga ketayotgan boʻladi.</p>
<p>Oʻsishning halol oʻlchovi — bir daqiqadagi toza almashishlar soni. Bugun yozib qoʻying, bir haftadan keyin tekshiring.</p>
<p>"When the Saints Go Marching In" faqat uch akkordda — C, G va D da chalinadi. Avval sekin, keyin tezroq sinab koʻring.</p>
${key('Toza va sekin — tez va xato bilan chalishdan yaxshi. Tezlik oʻzi keladi.')}
${tip('C–G–C–G–D–G–C ni metronom 60 da aylantirib chalib, oʻzingizni yozib oling.')}
` },
];
