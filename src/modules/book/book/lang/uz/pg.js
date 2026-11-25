// Darslik (uz): "Noldan gitara" — klassik gitara, 9 ta qisqa dars (muallif 25.11.2026: klassika; avval faqat major akkordlar, minor — keyin).
const tip = (t) => '<aside class="btip"><b>Sinab koʻring</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Eslab qoling</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'ls.teacherLock': 'Bu darsni oʻqituvchi ochadi',
  'bk.part9': 'Noldan gitara',
  'lp.guitar.kicker': 'Klassik gitara', 'lp.guitar.title': 'Noldan gitara', 'lp.guitar.sub': '31 ta dars: oʻtirish, tuzilish, sozlash, akkordlar, boy, arpedjio, barre, bogʻlamlar, gammalar',
  'lp.guitar.lead': 'Klassik gitara (neylon torlar) uchun. Avval qanday oʻtirish va gitara nimadan iborat, keyin sozlash va akkord sxemalarini oʻqish, soʻng major va minor akkordlar, septakkordlar, boy, arpedjio, barre, akkord bogʻlamlari va gammalar.',
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

  'gm.aria': 'Gitaraning hajmli modeli: tortib aylantiring', 'gm.nogl': 'Hajmli model koʻrsatilmadi: WebGL yoʻq. Qismlar nomi quyida.',
  'gm.explode': 'Ajratish', 'gm.assemble': 'Yigʻish', 'gm.view': 'Koʻrinish', 'gm.parts': 'Qismlar', 'gm.pick': 'Qismga tegib, nima ekanini oʻqing', 'gm.hint': 'Tortib aylantiring, chimdib yaqinlashtiring, ikki marta tegib ajrating yoki yigʻing.',
  'gm.types': 'Gitara turi', 'gm.t.classic': 'Klassik', 'gm.t.acoustic': 'Akustik', 'gm.t.electric': 'Elektro', 'gp.top.n': 'Yuqori deka', 'gp.top.d': 'Teshikli yupqa qoraqaragʻay plastinka. U torlar bilan tebranib, asosiy tovushni chiqaradi.', 'gp.braces.n': 'Prujinalar', 'gp.braces.d': 'Yuqori deka ostidagi yogʻoch qovurgʻalar (X shaklida va koʻndalang). Torlar tarangligini ushlab, tembrni belgilaydi.', 'gp.sides.n': 'Yon va orqa deka', 'gp.sides.d': 'Yon devorlar va orqa plastinka. Korpusni yopadi, tovushni qaytaradi va chuqurlik beradi.', 'gp.pickguard.n': 'Himoya plastinka', 'gp.pickguard.d': 'Korpusdagi plastinka. Akustikada dekani mediatordan himoya qiladi, elektroda elektronikani yopadi.', 'gp.rod.n': 'Ankor', 'gp.rod.d': 'Grif ichidagi po‘lat sterjen. U grif egilishini torlar tarangligiga moslaydi; qopqogʻi boshchada.', 'gp.pickups.n': 'Datchiklar', 'gp.pickups.d': 'Torlar ostidagi magnitli gʻaltaklar. Po‘lat tor tebranishi elektr signalga aylanib, kuchaytirgichga ketadi.', 'gp.controls.n': 'Boshqaruv', 'gp.controls.d': 'Ovoz va tembr tugmalari, datchik almashtirgich va kabel uyasi.', 'gp.body.e.n': 'Yaxlit korpus', 'gp.body.e.d': 'Boʻshligʻi yoʻq yaxlit yogʻoch. Tovushni datchiklar beradi; yogʻoch tovush uzunligi va tembrga taʼsir qiladi.', 'gp.bridge.e.n': 'Koʻprik', 'gp.bridge.e.d': 'Torlar mahkamlanadigan metall blok. Vintlar bilan har bir torning uzunligi va balandligi sozlanadi.', 'gp.bridge.a.n': 'Tagtayanch (koʻprik)', 'gp.bridge.a.d': 'Yuqori dekadagi planka: torlar unda qoziqchalar bilan turadi. Suyak egar tebranishni dekaga uzatadi.', 'gp.strings.s.n': 'Torlar', 'gp.strings.s.d': 'Oltita po‘lat tor: uchta yoʻgʻon oʻralgan va uchta ingichka silliq. Stroy oʻsha — mi, lya, re, sol, si, mi.',
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
  // strumming and minor (25.11.2026)
  'ls.g10': 'Minor: Am akkordi',
  'ls.g11': 'Em akkordi',
  'ls.g12': 'Dm akkordi',
  'ls.g13': 'Pastga boy',
  'ls.g14': 'Pastga-yuqoriga boy',
  'ls.g15': 'Boy bilan qoʻshiq',
  'lx.g10.g': '<ul><li>Barmoqlar: 2 — 4-torning 2-ladida, 3 — 3-torning 2-ladida, 1 — 2-torning 1-ladida.</li><li>Besh torni chalish (5-dan 1-gacha), 6-ni chalmaslik.</li><li>Am va A (major) ni tinglang: minorda tovush yumshoqroq va qaygʻuliroq.</li></ul>',
  'lx.g10.t': 'Major va minorni navbat bilan tinglab, qaysi biri qaygʻuliroq ekanini ayting.',
  'lx.g10.easy': 'Minor — majorning qaygʻuli ukasi. Farqi — bitta barmoq: Am da u 2-torning 1-ladida.',
  'lx.g10.fix': '<ul><li>2- va 3-barmoq aralashadi — tartib bilan qoʻying: avval 1-, keyin 2- va 3-.</li><li>Ingichka tor ovozsiz — 1-barmoq yotiq; uchiga qoʻying.</li></ul>',
  'lx.g11.g': '<ul><li>Barmoqlar: 2 — 5-torning 2-ladida, 3 — 4-torning 2-ladida.</li><li>Barcha oltita torni chalish — qolganlari ochiq.</li><li>Am → Em: 2- va 3-barmoq bir tor pastga, butunlay siljiydi.</li></ul>',
  'lx.g11.t': 'Shaklni oʻrganing: ikkinchi ladda ikki barmoq yonma-yon.',
  'lx.g11.easy': 'Em — eng oson akkord: atigi ikki barmoq va hamma torlar jaranglaydi.',
  'lx.g11.fix': '<ul><li>Baʼzi torlar shaqillaydi — barmoqlar qoʻshni torga tegadi; tikroq qoʻying.</li><li>Qoʻl tarang — akkord yengil, yengilroq bosing.</li></ul>',
  'lx.g12.g': '<ul><li>Barmoqlar: 1 — 1-torning 1-ladida, 3 — 2-torning 3-ladida, 2 — 3-torning 2-ladida.</li><li>Toʻrtta ingichka torni chalish (4-dan 1-gacha).</li><li>D bilan solishtiring: uchburchak boshqacha joylashadi.</li></ul>',
  'lx.g12.t': 'D va Dm ni ketma-ket tinglang.',
  'lx.g12.easy': 'Dm — D bilan bir xil joylashuv, lekin eng ingichka torning 1-ladidagi barmoq tovushni qaygʻuli qiladi.',
  'lx.g12.fix': '<ul><li>5-tor jaranglaydi — uni chalmang.</li><li>Barmoqlar bir-biriga xalaqit beradi — uchiga va tikroq qoʻying.</li></ul>',
  'lx.g13.g': '<ul><li>Oʻng qoʻl: bilak erkin, qoʻl suvni silkitgandek bilakdan tebranadi.</li><li>Pastga zarba: bosh yoki koʻrsatkich barmoq torlar boʻylab yoʻgʻondan ingichkaga oʻtadi.</li><li>Am akkordida metronom 70 da har hisobga bitta zarba.</li></ul>',
  'lx.g13.t': 'Ekranda metronomga mos ketma-ket toʻrt zarbani bosing.',
  'lx.g13.easy': 'Boy — barcha torlarga teng zarbalar. Asosiysi — teng, baland emas.',
  'lx.g13.fix': '<ul><li>Qoʻl tarang va charchaydi — yelkani boʻshating, tirsakdan emas, bilakdan chaling.</li><li>Torlarga tegmayapti — qoʻl qayerdan oʻtayotganini kuzating, teshik ustida tuting.</li></ul>',
  'lx.g14.g': '<ul><li>"Bir-va ikki-va uch-va toʻrt-va" deb sanash: raqamda — pastga, "va" da — yuqoriga.</li><li>Qoʻl toʻxtamay tebranadi — torga tegmasa ham havoda yuradi.</li><li>Barcha sakkizlik: ↓↑↓↑↓↑↓↑ metronom 70 da, keyin "xalq" chizmasi ↓ ·↓↑ ·↑↓↑.</li></ul>',
  'lx.g14.t': 'Ekranda sakkizliklarni bosing — toʻxtamay pastga-yuqoriga.',
  'lx.g14.easy': 'Pastga — hisobda, yuqoriga — hisoblar orasida. Qoʻl doim tebranadi; yuqoriga sekinroq va faqat ingichka torlarda chalish mumkin.',
  'lx.g14.fix': '<ul><li>Hisob adashadi — avval faqat ovoz chiqarib "bir-va ikki-va" deb sanab, torsiz qoʻlni tebrating.</li><li>Yuqoriga zarba juda baland — uni faqat ingichka torlarda va yarim kuch bilan chaling.</li></ul>',
  'lx.g15.g': '<ul><li>Am – Em – Am – Dm – Am – Em – Am – Am ni "xalq" boyi bilan metronom 70 da chaling.</li><li>Akkordni taktning oxirgi hisobida almashtiring; qoʻl toʻxtamaydi.</li><li>Oʻzingizni yozib tinglang: boy tekis ketyaptimi?</li></ul>',
  'lx.g15.t': 'Yozuvni tinglab, kurs boshidagi bilan solishtiring.',
  'lx.g15.easy': 'Qoʻshiq — akkordlar va boy. Almashish boyni buzsa — sekinlashtiring va qoʻlni toʻxtatmay akkord almashtiring.',
  'lx.g15.fix': '<ul><li>Almashishda boy toʻxtaydi — akkord tayyor boʻlmasa ham qoʻlni tebratishda davom eting.</li><li>Juda tez — metronom 55, keyin oshiring.</li></ul>',
  'gp.strum.q': '↓ teng',
  'gp.strum.e': '↓↑ hammasi',
  'gp.strum.f': 'xalq',
  'gp.strum.aria': 'Sakkiz hisobli boy chizmasi',
  'gp.strum.hint': '↓ pastga, ↑ yuqoriga, · qoʻl havoda yuradi. "Tinglash" ikki taktni chaladi.',
  // остальные аккорды и связки (25.11.2026)
  'ls.g16': 'A akkordi',
  'ls.g17': 'E akkordi',
  'ls.g18': 'Septakkordlar',
  'ls.g19': 'Akkord bogʻlamlari',
  'ls.g20': 'Bogʻlamlardan qoʻshiqlar',
  'lx.g16.g': '<ul><li>Barmoqlar: 1, 2 va 3 — 4-, 3- va 2-torlarning 2-ladida yonma-yon.</li><li>Besh torni chalish (5-dan 1-gacha), 6-ga tegmaslik.</li><li>D → A: uch barmoq qoʻshni torlarga oʻtadi.</li></ul>',
  'lx.g16.t': 'Shaklni oʻrganing: bir ladda uch barmoq qatorda.',
  'lx.g16.easy': 'A — ikkinchi ladda uch barmoq qatorda. Tor — barmoqlarni tikroq, uchiga qoʻying.',
  'lx.g16.fix': '<ul><li>Barmoqlar sigʻmayapti — sal qiyshiq qoʻying, qoʻlni koʻproq egib.</li><li>Ingichka tor ovozsiz — 3-barmoq unga pastdan tegadi; koʻtaring.</li></ul>',
  'lx.g17.g': '<ul><li>Barmoqlar: 2 — 5-torning 2-ladida, 3 — 4-torning 2-ladida, 1 — 3-torning 1-ladida.</li><li>Barcha oltita torni chalish.</li><li>Em bilan solishtiring: 3-torda bitta barmoq qoʻshiladi.</li></ul>',
  'lx.g17.t': 'Em va E ni ketma-ket tinglab, kayfiyat qanday oʻzgarishini eshiting.',
  'lx.g17.easy': 'E — bu Em va bitta barmoq: u akkordni yorugʻ, major qiladi.',
  'lx.g17.fix': '<ul><li>Uchinchi tor ovozsiz — barmoq yotiq bosadi; uchiga qoʻying.</li><li>Shaqillaydi — lad metall chizigʻiga yaqinroq bosing.</li></ul>',
  'lx.g18.g': '<ul><li>Septakkord — "achchiqlik" qoʻshilgan major akkord: u tarang va keyingisiga intiladi.</li><li>E7: E ga oʻxshash, lekin bitta barmoq olingan — oltita tor jaranglaydi.</li><li>E → E7 → A → A7 ni chalib, 7 keyingi akkordga qanday tortishini eshiting.</li></ul>',
  'lx.g18.t': 'E va E7 ni, keyin D va D7 ni tinglang.',
  'lx.g18.easy': 'Nomdagi 7 (E7, A7) tarangilik qoʻshadi. Bunday akkord kamdan-kam oxirgi boʻladi: undan keyin "xotirjam" akkord keladi.',
  'lx.g18.fix': '<ul><li>E7 E kabi jaranglayapti — barmoqni olmadingizmi? E7 da 3-torda barmoq yoʻq.</li><li>D7 tor — barmoqlarni uchiga qoʻyib, 3-tordan sanang.</li></ul>',
  'lx.g19.g': '<ul><li>Bogʻlam — ketma-ket bir necha akkord. Eng koʻp uchraydigani — I–IV–V: tonallikning 1-, 4- va 5-pogʻonalari.</li><li>G da bu G–C–D, D da — D–G–A, A da — A–D–E, E da — E–A–B7.</li><li>Har birini metronom 60 da, akkordga 4 hisobdan chaling.</li></ul>',
  'lx.g19.t': 'Bogʻlamdagi akkordlarni ovoz chiqarib ayting va ularning birinchi notalarini kuylang.',
  'lx.g19.easy': 'Pogʻonalar — tonallikdagi akkordlarning tartib raqami. I — "uy", IV — yon tomonga qadam, V — "uyga qayt".',
  'lx.g19.fix': '<ul><li>Bogʻlamlar aralashadi — kuniga bitta tonallikni oʻrganing.</li><li>Almashish ulgurmaydi — sekinlashtiring: metronom 50, pauzada almashtiring.</li></ul>',
  'lx.g20.g': '<ul><li>G–D–Em–C ("pop" yurishi I–V–vi–IV) ni metronom 70 da boy bilan chaling.</li><li>Am–Dm–E–Am (minor bogʻlam) ni chaling.</li><li>Oʻzingizni yozib tinglang.</li></ul>',
  'lx.g20.t': 'Yozuvni tinglab, kurs boshidagi bilan solishtiring.',
  'lx.g20.easy': 'G–D–Em–C yurishi yuzlab qoʻshiqda uchraydi. Uni oʻrgansangiz, koʻp tanish musiqani chalish mumkin.',
  'lx.g20.fix': '<ul><li>Almashishda boy toʻxtaydi — qoʻlni toʻxtatmang.</li><li>Em chiqmayapti — bu Am bilan bir xil shakl, bir tor siljigan.</li></ul>',
  'gp.prog.g': 'G da',
  'gp.prog.d': 'D da',
  'gp.prog.a': 'A da',
  'gp.prog.e': 'E da',
  'gp.prog.pop': 'pop',
  'gp.prog.min': 'minor',
  'gp.prog.hint': 'Pogʻonalar: {r}. "Tinglash" bogʻlamni akkordga ikki hisobdan chaladi.',
  // арпеджио, барре, септаккорды на минор (25.11.2026)
  'ls.g21': 'Arpedjio',
  'ls.g22': 'Bogʻlamlarda arpedjio',
  'ls.g23': 'Kichik barre',
  'ls.g24': 'F akkordi (barre)',
  'ls.g25': 'Bm akkordi (barre)',
  'ls.g26': 'Am7, Em7, Dm7',
  'ls.g27': 'Cmaj7 va septakkord bogʻlamlari',
  'lx.g21.g': '<ul><li>Chap qoʻl Am ni qoʻyadi; oʻng qoʻl torlar ustida: p — akkordning bas tori (Am da bu 5-tor), i — 3-tor, m — 2-tor, a — 1-tor ustida.</li><li>Har barmoq oʻz torini yuqoriga va sal ichkariga tortadi, navbat bilan: p i m a — toʻrt tovush, metronom 60 da har hisobga bittadan.</li><li>Keyin oltita (p i m a m i) va sakkizta (p i m i a i m i) tovush.</li></ul>',
  'lx.g21.t': 'Har bir chizmani tinglab, barmoqlar torlar boʻylab qanday yurishini tasavvur qiling.',
  'lx.g21.easy': 'Arpedjio — akkordning bir-bir chalingan tovushlari. Oʻng qoʻl har bir barmogʻining oʻz tori bor: p — bas, i m a — uchta ingichka tor.',
  'lx.g21.fix': '<ul><li>Barmoqlar bir-biriga xalaqit beradi — qoʻlni xotirjam tuting, i m a barmoqlari sal bukilgan.</li><li>Tovushlar turli balandlikda — barcha barmoqlarni bir xil, silkinishsiz torting.</li></ul>',
  'lx.g22.g': '<ul><li>Am – C – G – Em – Am ni p i m a m i chizmasi bilan metronom 60 da chaling: akkordga bir takt.</li><li>Akkordni taktning oxirgi hisobida almashtiring; oʻng qoʻl toʻxtamaydi.</li><li>Oʻzingizni yozib tinglang: arpedjio tekis ketyaptimi?</li></ul>',
  'lx.g22.t': 'Yozuvni tinglab, boy bilan solishtiring: tovush nimasi bilan farq qiladi?',
  'lx.g22.easy': 'Bir xil bogʻlam har xil jaranglaydi: boy bilan — shijoatli, arpedjio bilan — yumshoq va ohangdor.',
  'lx.g22.fix': '<ul><li>Arpedjio almashishda adashadi — sekinlashtiring: metronom 50, chap qoʻl akkordni qidirayotganda oʻng qoʻl chalaveradi.</li><li>Bas tor akkord bilan almashadi — yangi akkordning basi qayerdaligini sxemadan koʻring.</li></ul>',
  'lx.g23.g': '<ul><li>Koʻrsatkich barmoqni eng ingichka ikki torning (1- va 2-) 1-ladiga qoʻying va barmoq yon tomoni bilan, tirnoqqa yaqin joyi bilan bosing.</li><li>Qolgan barmoqlar: 2 — 3-torning 2-ladida, 3 — 4-torning 3-ladida. Toʻrtta ingichka torni chaling.</li><li>Har torni alohida tekshiring: toʻrttasi ham jaranglayaptimi?</li></ul>',
  'lx.g23.t': 'Shaklni oʻrganing: ikki torda yotiq barmoq va yonida zinapoya shaklidagi ikki barmoq.',
  'lx.g23.easy': 'Barre — bitta barmoq bir ladda bir nechta torni birdaniga bosganda. Kichik barre — atigi ikki tor, toʻliq barredan oldingi zina.',
  'lx.g23.fix': '<ul><li>Torlar ovozsiz — ladga yaqin (ladlar oʻrtasida emas) va barmoq yon tomoni bilan bosing.</li><li>Barmoq ogʻriydi — bu odatiy; akkordni qisqa ushlang, dam oling, har xil kunlarda oz-ozdan takrorlang.</li></ul>',
  'lx.g24.g': '<ul><li>Koʻrsatkichni 1-ladda barcha oltita tor boʻylab qoʻying; qolgan barmoqlar bir lad siljitilgan Em akkordidagidek: 3-barmoq 5-torning 3-ladida, 4-barmoq 4-torning 3-ladida, 2-barmoq 3-torning 2-ladida.</li><li>Barcha oltita torni chalish.</li><li>Torlarni birma-bir tekshirib, ovozsizini toping: jaranglaguncha barmoqni siljiting.</li></ul>',
  'lx.g24.t': 'F va Em ni ketma-ket tinglang — bir xil shakl, boʻyin boʻylab siljigan.',
  'lx.g24.easy': 'F — bir lad yuqoriga siljitilgan tanish Em va koʻrsatkich barmoq bilan barre.',
  'lx.g24.fix': '<ul><li>3- yoki 2-tor ovozsiz — barre toʻliq bosmayapti; koʻrsatkichni sal qirrasiga, tirnoqqa yaqin buring.</li><li>Qoʻl charchaydi — yelkani boʻshating, orqadan bosh barmoq bilan boʻyinni siqmang.</li></ul>',
  'lx.g25.g': '<ul><li>Koʻrsatkichni besh torning (5-dan 1-gacha) 2-ladiga qoʻying; qolgan barmoqlar ikki lad siljitilgan Am dagidek: 3-barmoq 4-torning 4-ladida, 4-barmoq 3-torning 4-ladida, 2-barmoq 2-torning 3-ladida.</li><li>Besh torni chalish (5-dan 1-gacha), 6-ga tegmaslik.</li><li>Har torni alohida tekshiring.</li></ul>',
  'lx.g25.t': 'Am va Bm ni ketma-ket tinglang — bir xil shakl, ikki ladga siljigan.',
  'lx.g25.easy': 'Barre akkordlar — boʻyin boʻylab siljitilgan tanish shakllar: Em shakli F ni, Am shakli Bm ni beradi.',
  'lx.g25.fix': '<ul><li>Hamma tor jaranglamayapti — koʻrsatkichni ladga yaqinroq qoʻying va sal buring.</li><li>Nafas tutilyapti — akkordni qisqa ushlang va takrorlar orasida qoʻyib yuboring.</li></ul>',
  'lx.g26.g': '<ul><li>Am7: Am ga oʻxshash, lekin 3-barmoqsiz; Em7: Em ga oʻxshash, lekin 3-barmoqsiz; Dm7: koʻrsatkich ikki ingichka torning 1-ladini bosadi, 2-barmoq 3-torning 2-ladida.</li><li>Am7 – Em7 – Dm7 ni metronom 60 da har biriga toʻrt hisobdan chaling.</li><li>Minor septakkord oddiy minordan qanchalik yumshoqligini tinglang.</li></ul>',
  'lx.g26.t': 'Am va Am7 ni, Em va Em7 ni quloq bilan solishtiring.',
  'lx.g26.easy': 'Minor septakkord — yumshoq septima qoʻshilgan minor. Tanish shakl, bitta barmoq olingan.',
  'lx.g26.fix': '<ul><li>Ortiqcha bas torlar jaranglaydi — Am7 va Dm7 da 6-torni chalmang.</li><li>Dm7: koʻrsatkich ikkala ingichka torni 1-ladda bosishi kerak.</li></ul>',
  'lx.g27.g': '<ul><li>Cmaj7: C ga oʻxshash, lekin 1-barmoqsiz — 3- va 2-tor ochiq jaranglaydi.</li><li>Dm7 – G7 – Cmaj7 («ii–V–I») bogʻlamini, keyin Am7 – Dm7 – G7 – Cmaj7 ni metronom 60 da akkordga ikki taktdan chaling.</li><li>Boy yoki arpedjio bilan chalib, oʻzingizni yozib oling.</li></ul>',
  'lx.g27.t': 'G7 Cmaj7 ga qanday «intilishini» tinglang: tarangilik va xotirjamlik.',
  'lx.g27.easy': 'Dm7 – G7 – Cmaj7: yon tomonga qadam, tarangilik va xotirjamlik. Bu bogʻlam qoʻshiqlarda, balladalarda va jazzda uchraydi.',
  'lx.g27.fix': '<ul><li>Almashishga ulgurmayapti — sekinlashtiring: metronom 50, taktga bitta akkord.</li><li>Cmaj7 C kabi jaranglayapti — 1-barmoq olinganini va 2-tor ochiqligini tekshiring.</li></ul>',
  'gp.lbl.F3': 'F (kichik)',
  'gp.arp.p4': 'p i m a',
  'gp.arp.p6': 'p i m a m i',
  'gp.arp.p8': 'p i m i a i m i',
  'gp.arp.aria': 'Arpedjio chizmasi: oʻng qoʻl barmoqlari torlarda',
  'gp.arp.hint': 'Qatorlar — torlar (6 — yoʻgʻon, 1 — ingichka), doiralar — hisob boʻyicha oʻng qoʻl barmoqlari. «Tinglash» daqiqasiga 80 urishda ikki aylanishni chaladi.',
  'gp.prog.ii': 'ii–V–I',
  'gp.prog.vi': 'vi–ii–V–I',
  'gp.prog.bal': 'I–vi–ii–V',
  // гаммы (25.11.2026)
  'ls.g28': 'Gammalar: do major va sol major',
  'ls.g29': 'Gamma: lya minor',
  'ls.g30': 'Pentatonika',
  'ls.g31': 'Xromatik gamma',
  'lx.g28.g': '<ul><li>Do majorni birinchi pozitsiyada yuqoriga va pastga chaling: 8 nota, metronom 60 da har hisobga bittadan. Barmoqlar — ladlar boʻyicha: 1-barmoq 1-ladda, 2-barmoq 2-ladda, 3-barmoq 3-ladda; ochiq tor — barmoqsiz.</li><li>Notalarni ovoz chiqarib ayting: do, re, mi, fa, sol, lya, si, do.</li><li>Keyin sol major — xuddi shu formula, lekin ettinchi nota fa-diyez (F♯).</li></ul>',
  'lx.g28.t': 'Gammani gitara bilan birga kuylang: har tovush oʻz notasida.',
  'lx.g28.easy': 'Major gamma — «ton, ton, yarim ton, ton, ton, ton, yarim ton» formulasi boʻyicha yuqoriga sakkizta nota. Har qanday notadan bu formula oʻzining major gammasini beradi.',
  'lx.g28.fix': '<ul><li>Tovush uziladi — keyingi notagacha barmoqni koʻtarmang.</li><li>Hisob adashadi — avval sekin (metronom 50) va teng chaling, keyin tezlashtiring.</li></ul>',
  'lx.g29.g': '<ul><li>Lya minorni birinchi pozitsiyada chaling: do majordagi oq notalar, lekin lya dan — keyingi oktavadagi lya gacha.</li><li>Metronom 60 da har hisobga bitta nota, yuqoriga va pastga.</li><li>Do majordan qanchalik qaygʻuliroq ekanini tinglang.</li></ul>',
  'lx.g29.t': 'Do major va lya minorni ketma-ket kuylab, kayfiyat farqini eshiting.',
  'lx.g29.easy': 'Lya minor (tabiiy) — do major notalari, lekin lya dan boshlangan. Formula: «ton, yarim ton, ton, ton, yarim ton, ton, ton». Lya minor va do major — «qarindosh».',
  'lx.g29.fix': '<ul><li>«Minor» ekani sezilmayapti — gammadan keyin Am akkordini, keyin yana gammani chaling.</li><li>Barmoqlar aralashadi — ularni ladlar ustida oldindan tuting: tor boʻylab 0–2–3.</li></ul>',
  'lx.g30.g': '<ul><li>Lya minor pentatonikasini 5–8 lad pozitsiyasida chaling: har torda ikki nota — 5-ladda koʻrsatkich (1), 7-ladda nomsiz (3) yoki 8-ladda jimjiloq (4).</li><li>Yuqoriga va pastga, har hisobga bitta nota, metronom 60.</li><li>Keyin Am akkordi ustida istalgan tartibda chaling: bu yerda xato nota yoʻq.</li></ul>',
  'lx.g30.t': 'Shu besh notadan istalgan qisqa kuyni chalib, eslab qoling.',
  'lx.g30.easy': 'Pentatonika — besh notali gamma. Unda «oʻtkir» pogʻonalar yoʻq, shuning uchun istalgan tartibda chiroyli jaranglaydi. Kuy va soʻlolar unga quriladi.',
  'lx.g30.fix': '<ul><li>Qoʻl uzoqda — bu yuqori pozitsiya: butun qoʻlni 5-ladga surib, bosh barmoq boʻyin orqasida.</li><li>Shaqillaydi — ladga yaqin, barmoq uchi bilan bosing.</li></ul>',
  'lx.g31.g': '<ul><li>Xromatik gammani mi dan (6-tor) chaling: har lad ketma-ket — ochiq tor, keyin 1, 2, 3, 4-ladlar va hokazo torlar boʻylab bir oktava yuqori mi gacha.</li><li>«Bir barmoq — bir lad» qoidasi: 1-barmoq 1-ladda, 2-barmoq 2-ladda, 3-barmoq 3-ladda, 4-barmoq 4-ladda.</li><li>Metronom 60, har hisobga bitta nota, yuqoriga va pastga.</li></ul>',
  'lx.g31.t': 'Oktavaning barcha 12 tovushini ovoz chiqarib ayting: do, do-diyez, re, re-diyez, mi, fa, fa-diyez, sol, sol-diyez, lya, lya-diyez, si.',
  'lx.g31.easy': 'Xromatik gamma — barcha tovushlar ketma-ket, har biri oldingisidan yarim ton yuqori. Gitarada bu oddiygina lad ortidan lad.',
  'lx.g31.fix': '<ul><li>Barmoqlar charchaydi — har tordan keyin tanaffus qiling va qoʻlni silkitib oling.</li><li>Tovush oʻchadi — barmoqlarni uchiga qoʻying va qoʻshni torlarga tegmang.</li></ul>',
  'gp.sc.cmaj': 'Do major',
  'gp.sc.gmaj': 'Sol major',
  'gp.sc.amin': 'Lya minor',
  'gp.sc.apent': 'Lya minor: pentatonika',
  'gp.sc.chrom': 'Xromatik (mi dan)',
  'gp.sc.aria': 'Boʻyindagi gamma: raqamlar — notalar tartibi, porogdan chapdagi doira — ochiq tor',
  'gp.sc.notes': 'Notalar',
  'gp.sc.steps': 'Qadamlar (½ — yarim ton, 1 — ton)',
  'gp.sc.hint': 'Doiralardagi raqamlar — notalar tartibi; chiziqli doira — asosiy nota (tonika). «Tinglash» yuqoriga va pastga chaladi.',
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
{{lab:gmodel}}
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
  { id: 'g10', t: 'Minor: Am akkordi', s: 'Xuddi shu ladlar, lekin qaygʻuliroq', src: '', h: `
<p>Minor — majorning qaygʻuli ukasi. Akkord nomida <b>m</b> harfi bor: Am "lya minor" deb oʻqiladi. Endi major chiqayotgan boʻlsa, minorni qoʻshish mumkin.</p>
{{lab:gboxm}}
<p>Am akkordi E ga oʻxshaydi, faqat ikki lad pastda. Uch barmoq: 1 — 2-torning 1-ladida, 2 va 3 — 4- va 3-torning 2-ladida.</p>
${key('Major — yorqin, minor — yumshoq va qaygʻuli. Farqi — bitta barmoq.')}
${tip('Am va A (major) ni tinglang: besh torni chaling, 6-ga tegmang.')}
` },
  { id: 'g11', t: 'Em akkordi', s: 'Eng oson akkord', src: '', h: `
<p>Em ("mi minor") — eng oddiy: ikkinchi ladda ikki barmoq yonma-yon va barcha oltita tor jaranglaydi.</p>
{{lab:gboxem}}
<p>Am → Em almashish kursdagi eng yengili: ikki barmoq bir tor pastga siljiydi, shakl oʻzgarmaydi.</p>
${key('Almashish — siljish: qoʻl shaklni saqlab, butunlay koʻchadi.')}
${tip('Am, keyin Em ni chaling — metronom 60 da har biriga toʻrt hisob.')}
` },
  { id: 'g12', t: 'Dm akkordi', s: 'D ning qarindoshi', src: '', h: `
<p>Dm ("re minor") D kabi qoʻyiladi, lekin 1-barmoq eng ingichka torning 1-ladida turadi. D dagi kabi toʻrt ingichka tor chalinadi.</p>
{{lab:gboxdm}}
<p>Endi oltita akkord maʼlum: C, G, D, Am, Em, Dm. Bu koʻplab oddiy qoʻshiqlar uchun yetarli.</p>
${key('D va Dm bitta barmoq bilan farqlanadi — farqni quloq bilan eshiting.')}
${tip('Dm, keyin D ni chaling — tovush qanday oʻzgarishini tinglang.')}
` },
  { id: 'g13', t: 'Pastga boy', s: 'Oʻng qoʻlning birinchi chizmasi', src: '', h: `
<p>Boy — oʻng qoʻlning barcha torlarga teng zarbalari. Oddiydan boshlang: har hisobga bitta pastga zarba.</p>
{{lab:gstrum}}
<p>Qoʻl suvni silkitgandek bilakdan tebranadi. Bosh yoki koʻrsatkich barmoq torlar boʻylab yoʻgʻondan ingichkaga oʻtadi.</p>
${key('Boy — teng ritm, kuch emas. Teng va sokin — baland va uzilib-uzilib chalishdan yaxshi.')}
${tip('Akkordni tanlab, "Tinglash" ni bosing va birga chaling — har hisobga bitta zarba.')}
` },
  { id: 'g14', t: 'Pastga-yuqoriga boy', s: 'Sakkizliklar va "xalq" chizmasi', src: '', h: `
<p>Endi yuqoriga harakatni qoʻshamiz. Hisob — "bir-va ikki-va uch-va toʻrt-va": raqamda — pastga, "va" da — yuqoriga.</p>
{{lab:gstrume}}
<p>Qoʻl toʻxtamay tebranadi: hisobda pastga, hisoblar orasida yuqoriga. Baʼzan zarba tashlab oʻtiladi, lekin qoʻl baribir havoda yuradi — shunda jonli chizma chiqadi.</p>
${key('Qoʻl toʻxtamaydi: tashlab oʻtilgan zarba — torga tegmagan tebranish.')}
${tip('Avval tashlamasdan ↓↑↓↑↓↑↓↑ sakkizliklar, keyin "xalq" chizmasi.')}
` },
  { id: 'g15', t: 'Boy bilan qoʻshiq', s: 'Akkordlar va boy birga', src: '', h: `
<p>Hammasini birlashtiramiz: akkordlar va boy. Am – Em – Am – Dm – Am – Em – Am – Am ni "xalq" boyi bilan metronomga chaling.</p>
{{lab:gstrumf}}
<p>Almashish — taktning oxirgi hisobida, qoʻl toʻxtamaydi. Boy adashsa — sekinlashtiring va qoʻlni toʻxtatmang.</p>
${key('Qoʻl toʻxtasa — boy buziladi. Akkordni toʻliq chalmaslik qoʻlni toʻxtatishdan yaxshi.')}
${tip('Shu ketma-ketlikda oʻzingizni yozib, ertasi kuni tinglang.')}
` },
  { id: 'g16', t: 'A akkordi', s: 'Uch barmoq qatorda', src: '', h: `
<p>A akkordi ikkinchi ladda uch barmoq qatorda qoʻyiladi: 4-, 3- va 2-torlar. Besh tor chalinadi, 5-dan 1-gacha.</p>
{{lab:gboxa}}
<p>Bu tor shakl: barmoqlar yonma-yon turadi va har biri qoʻshni torlarga tegmasligi kerak.</p>
${key('Barmoqlar uchida va sal qiyshiq, aks holda ingichka tor ovozsiz boʻladi.')}
${tip('A ni qoʻyib, besh torni birma-bir tortib, hammasi jaranglashini tekshiring.')}
` },
  { id: 'g17', t: 'E akkordi', s: 'Em va yana bitta barmoq', src: '', h: `
<p>E akkordi — bitta barmoq qoʻshilgan Em: 1-barmoq 3-torning birinchi ladiga qoʻyiladi. Barcha oltita tor chalinadi.</p>
{{lab:gboxe}}
<p>Em dan E ga: 2- va 3-barmoq qoladi, 1-barmoq qoʻshiladi. Bitta barmoq akkordni yorugʻ qiladi.</p>
${key('E va Em — bir xil shakl, farqi bitta barmoqda.')}
${tip('Em, keyin E ni chaling — kayfiyat qanday oʻzgarishini eshiting.')}
` },
  { id: 'g18', t: 'Septakkordlar', s: 'E7, A7, D7, G7, C7, B7', src: '', h: `
<p>Septakkord — "achchiqlik" qoʻshilgan major akkord. Nomida 7 raqami bor. U tarang jaranglaydi va keyingi akkordga intiladi.</p>
{{lab:gboxs}}
<p>Bu oltita akkord ochiq — barresiz. E7, A7 va D7 eng koʻp uchraydi; ular tanish shakllardan qurilgan: E7 — bitta barmoq olingan E, A7 — bitta barmoq olingan A.</p>
${key('Yettilik — alohida dunyo emas, bitta barmogʻi oʻzgargan tanish akkord.')}
${tip('E va E7 ni, keyin A va A7 ni tinglang.')}
` },
  { id: 'g19', t: 'Akkord bogʻlamlari', s: 'I–IV–V va "pop" yurishi', src: '', h: `
<p>Bogʻlam — ketma-ket bir necha akkord. Eng koʻp uchraydigani — <b>I–IV–V</b>: tonallikning 1-, 4- va 5-pogʻonalari.</p><p>Har tonallikning oʻz toʻplami bor: G da G–C–D, D da — D–G–A, A da — A–D–E, E da — E–A–B7.</p>
{{lab:gprog}}
<p>Yana bir keng tarqalgani — "pop" yurishi I–V–vi–IV: G da G–D–Em–C. Minor bogʻlam — Am–Dm–E–Am. Quyidagi tugmalarni bosing, sxemalarni koʻring va tinglang.</p>
${key('I — "uy", IV — yon tomonga qadam, V — "uyga qayt". Minglab qoʻshiqlar shunday qurilgan.')}
${tip('Har bogʻlamni metronom 60 da chaling: akkordga toʻrt hisobdan.')}
` },
  { id: 'g20', t: 'Bogʻlamlardan qoʻshiqlar', s: 'Akkordlar va boy birga', src: '', h: `
<p>Endi koʻp qoʻshiqlar qoʻlingizda: G–D–Em–C, A–D–E yoki Am–Dm–E dagi har qanday qoʻshiq mos keladi. Sevimlisini tanlab, bogʻlamini toping.</p>
{{lab:gprogp}}
<p>Metronom 70 da boy bilan chaling: akkord almashtirish — taktning oxirgi hisobida, qoʻl toʻxtamaydi.</p>
${key('Bitta bogʻlam, bitta boy — almashish toza boʻlguncha. Keyin keyingisi.')}
${tip('Bogʻlamni tanlab, boy bilan ikki aylanish chalib, oʻzingizni yozib oling.')}
` },
  { id: 'g21', t: 'Arpedjio', s: 'Akkord tovushlari bir-bir', src: '', h: `
<p>Arpedjio — akkord tovushlarini ketma-ket, bir-bir chalish, xuddi akkord «ochilgandek». Oʻng qoʻl chaladi: har barmoqning oʻz tori bor.</p><p><b>p</b> (bosh barmoq) akkordning bas torini, <b>i</b> (koʻrsatkich) — 3-torni, <b>m</b> (oʻrta) — 2-torni, <b>a</b> (nomsiz) — 1-torni chaladi.</p>
{{lab:garp}}
<p>Barmoqlar torlar ustida oldindan turadi va torni yuqoriga va sal ichkariga tortadi. Avval toʻrt tovush «p i m a» teng, toʻrt qadamdek; keyin oltita va sakkizta.</p>
${key('Arpedjio teng tovushlarga tayanadi: bir xil balandlik va teng hisob tezlikdan muhimroq.')}
${tip('Am ni qoʻyib, «p i m a» ni metronom 60 da chaling — har hisobga bitta tovush.')}
` },
  { id: 'g22', t: 'Bogʻlamlarda arpedjio', s: 'Xuddi shu akkordlar — yumshoqroq', src: '', h: `
<p>Endi tanish akkordlarda arpedjio: Am, C, G, Em. «p i m a m i» chizmasi — akkordga oltita tovush, metronomga teng.</p>
{{lab:garp6}}
<p>Akkordni taktning oxirgi hisobida almashtiring; oʻng qoʻl toʻxtamaydi. Bas tor akkord bilan almashadi, shuning uchun p har safar boshqa torni chaladi.</p>
${key('Chap qoʻl yangi akkordni oʻng qoʻl hali eskisini chalayotganda tayyorlaydi.')}
${tip('Am – C – G – Em – Am ni «p i m a m i» bilan chalib, oʻzingizni yozib oling.')}
` },
  { id: 'g23', t: 'Kichik barre', s: 'Bitta barmoq bir nechta torda', src: '', h: `
<p>Barre — bitta barmoq (odatda koʻrsatkich) bir ladda bir nechta torni birdaniga bosganda. Bu boshlovchi uchun eng qiyin qadam, shuning uchun zina-zina boramiz. Birinchisi — eng ingichka ikki torda kichik barre.</p>
{{lab:gboxb}}
<p>Toʻrt torli F akkordi (sxemada «F (kichik)»): koʻrsatkich 1- va 2-torning 1-ladida yotadi, 2-barmoq 3-torning 2-ladida, 3-barmoq 4-torning 3-ladida.</p>
${key('Koʻrsatkichning yon tomoni bilan, tirnoqqa yaqin joyi bilan va ladga yaqin bosing — barmoq oʻrtasi bilan emas.')}
${tip('Koʻrsatkichni ikki ingichka torga qoʻyib, ularni torting: ikkalasi ham jaranglashi kerak.')}
` },
  { id: 'g24', t: 'F akkordi (barre)', s: 'Birinchi ladda toʻliq barre', src: '', h: `
<p>Toʻliq F akkordi: koʻrsatkich 1-ladda barcha oltita tor boʻylab yotadi. Qolgan uch barmoq — Em akkordidagidek, faqat bir lad yuqorida.</p>
{{lab:gboxf}}
<p>Bu boʻyin boʻylab siljitilgan tanish shakl va barre. Avval chiqmasa — «F (kichik)» ni chalib, bir necha kundan keyin toʻliq shaklga qayting.</p>
${key('F — bir lad yuqoriga siljitilgan Em va koʻrsatkich barmoq bilan barre.')}
${tip('F ni qoʻyib, oltita torni birma-bir torting va ovozsizini toping — barmoqni siljiting.')}
` },
  { id: 'g25', t: 'Bm akkordi (barre)', s: 'Ikkinchi ladda barre', src: '', h: `
<p>Bm («si minor»): koʻrsatkich barmoq besh torning (5-dan 1-gacha) 2-ladida. Qolgan uch barmoq — Am akkordidagidek, faqat ikki lad yuqorida.</p>
{{lab:gboxbm}}
<p>6-tor chalinmaydi: sxemada uning ustida «×» bor.</p>
${key('Barre akkordlar — boʻyin boʻylab siljitilgan tanish shakllar: Em shakli F ni, Am shakli Bm ni beradi.')}
${tip('Am, keyin Bm ni chaling — bir xil shaklni turli ladlarda eshiting.')}
` },
  { id: 'g26', t: 'Am7, Em7, Dm7', s: 'Minor septakkordlar', src: '', h: `
<p>Minor septakkord — yumshoq septima qoʻshilgan minor akkord. U oddiy minordan iliqroq va xotirjamroq jaranglaydi.</p>
{{lab:gboxm7}}
<p>Shakllar tanish, har birida bitta barmoq oʻzgargan: Am7 — 3-barmoqsiz Am, Em7 — 3-barmoqsiz Em, Dm7 — ikki ingichka torda koʻrsatkich barresi bilan Dm.</p>
${key('Bitta barmoq harakati — boshqa kayfiyat.')}
${tip('Am, keyin Am7 ni chaling — farqni eshiting.')}
` },
  { id: 'g27', t: 'Cmaj7 va septakkord bogʻlamlari', s: 'Tarangilik va xotirjamlik', src: '', h: `
<p>Cmaj7 — koʻrsatkich barmogʻi olingan C: 2- va 3-tor ochiq jaranglaydi. Tovush yumshoq, «havodor».</p>
{{lab:gprogj}}
<p>Septakkordli eng mashhur bogʻlam — <b>ii–V–I</b>: Dm7 – G7 – Cmaj7. G7 tarangilik yaratadi, Cmaj7 uni hal qiladi — xotirjamlik. Bu bogʻlam qoʻshiqlarda, balladalarda va jazzda uchraydi.</p>
${key('Dm7 – G7 – Cmaj7: yon tomonga qadam, tarangilik va uyga qaytish.')}
${tip('Dm7 – G7 – Cmaj7 ni boy yoki arpedjio bilan metronom 60 da chalib, oʻzingizni yozib oling.')}
` },
  { id: 'g28', t: 'Gammalar: do major va sol major', s: 'Formula boʻyicha ketma-ket notalar', src: '', h: `
<p>Gamma — asosiy notadan (tonikadan) bir oktava yuqoridagi xuddi shu notagacha ketma-ket notalar. Major gamma «yorqin» jaranglaydi. U ton va yarim tonlar formulasi boʻyicha quriladi: <b>1 – 1 – ½ – 1 – 1 – 1 – ½</b>.</p>
{{lab:gscmaj}}
<p>Birinchi pozitsiyadagi do major diyez va bemolsiz: sakkizta nota, ladlarda 0–1–2–3 barmoqlar. Sol major — sol dan xuddi shu formula; shu sababli ettinchi nota fa-diyez (F♯) boʻladi.</p>
${key('«Ton, ton, yarim ton, ton, ton, ton, yarim ton» formulasi har qanday notadan oʻzining major gammasini beradi.')}
${tip('Do majorni metronom 60 da yuqoriga va pastga, har hisobga bitta nota, notalarni ovoz chiqarib aytib chaling.')}
` },
  { id: 'g29', t: 'Gamma: lya minor', s: 'Xuddi shu notalar, boshqa markaz', src: '', h: `
<p>Lya minor (tabiiy) — do major notalari, lekin lya dan. Formula: <b>1 – ½ – 1 – 1 – ½ – 1 – 1</b>. Majordan yumshoqroq va qaygʻuliroq jaranglaydi.</p>
{{lab:gscmin}}
<p>Lya minor va do major — «qarindosh» gammalar: ularning notalari bir xil. Farq — qaysi nota asosiy, tonika hisoblanishida.</p>
${key('Minor gamma — yangi notalar emas, yangi markaz: tonika — lya.')}
${tip('Gammadan keyin Am akkordini va yana gammani chaling: ular bir-biriga qanday mos kelishini eshiting.')}
` },
  { id: 'g30', t: 'Pentatonika', s: 'Har holat uchun besh nota', src: '', h: `
<p>Pentatonika — besh notali gamma. Unda «oʻtkir» pogʻonalar yoʻq, shuning uchun istalgan tartibda chiroyli jaranglaydi; kuy va soʻlolar unga quriladi. Lya minor pentatonikasi: <b>lya, do, re, mi, sol</b>.</p>
{{lab:gscpent}}
<p>Gitarada u 5–8 lad pozitsiyasida chalinadi: har torda ikki nota. Barmoqlar: 5-ladda — 1, 7-ladda — 3, 8-ladda — 4.</p>
${key('Xato qilmaydigan besh nota: ularni Am akkordi ustida istalgan tartibda chalish mumkin.')}
${tip('Shu besh notadan qisqa kuy oʻylab topib, metronomga chaling.')}
` },
  { id: 'g31', t: 'Xromatik gamma', s: 'Barcha oʻn ikki tovush ketma-ket', src: '', h: `
<p>Xromatik gamma — barcha tovushlar ketma-ket, har biri oldingisidan yarim ton yuqori («½ – ½ – ½ …» formulasi). Gitarada bu oddiygina lad ortidan lad.</p>
{{lab:gscchrom}}
<p>Bu barmoqlar uchun eng yaxshi mashq: <b>bir barmoq — bir lad</b>. Birinchi barmoq 1-ladda, ikkinchi 2-ladda, uchinchi 3-ladda, toʻrtinchi 4-ladda; keyin keyingi tor.</p>
${key('Oktavada oʻn ikki tovush bor; qolgan barcha gammalar — ulardan formula boʻyicha tanlov.')}
${tip('Xromatik gammani metronom 60 da yuqoriga va pastga chalib, notalarni ovoz chiqarib ayting.')}
` },
];
