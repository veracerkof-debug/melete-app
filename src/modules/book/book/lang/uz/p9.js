// Учебник (uz): «Первые шаги» — книга новичка (перевод ru/p9.js). Простым языком, короткими фразами, каждое новое слово
// объясняется на месте, без терминов-ссылок; одна глава — один урок на 10–15 минут. У каждого урока — «Проще» и
// «Если не получается». Упражнения — свои.
const tip = (t) => '<aside class="btip"><b>Sinab koʻrish</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Esda qolsin</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'bk.lvl': 'Daraja', 'bk.lvl.beginner': 'Yangi', 'bk.lvl.amateur': 'Oʻrta', 'bk.lvl.advanced': 'Ilgʻor', 'bk.lvl.pro': 'Profi',
  'bk.lvlMore': 'Ochish: «{l}» darajadagi dars',
  'bk.lead.first': 'Musiqa eng boshidan: oddiy soʻzlar bilan, har safar bir qadam, darhol cholgʻuda. Oldindan hech narsa bilish shart emas.',
  'bk.part8': 'Ilk qadamlar', 'bk.sec.first': 'Ilk qadamlar', 'bk.sub.first': 'Noldan boshlovchilar uchun.',
  'lp.first.kicker': 'Noldan', 'lp.first.title': 'Ilk qadamlar', 'lp.first.sub': '24 ta qisqa dars: birinchi tovushdan oʻz qoʻshigʻigacha',
  'lp.first.lead': 'Bir dars — 10–15 daqiqa. Har bir qadamni tinglash, takrorlash va tekshirish mumkin: ilova chalishni eshitadi va maslahat beradi. Biror narsa chiqmasa — dars pastida «Soddaroq» va «Chiqmasa» boʻlimlari bor.',
  'lx.easy': 'Soddaroq', 'lx.fix': 'Chiqmasa',

  'ls.f1': 'Tovushlardan musiqa', 'ls.f2': 'Cholgʻu bilan tanishuv', 'ls.f3': 'Qanday oʻtirish va qoʻllarni tutish', 'ls.f4': 'Sozlash',
  'ls.f5': 'Notalarning nomlari', 'ls.f6': 'Notalar qayerda yashaydi', 'ls.f7': 'Puls — musiqaning qadamlari', 'ls.f8': 'Uzun va qisqa tovushlar',
  'ls.f9': 'Birinchi kuy', 'ls.f10': 'Toʻrtgacha sanaymiz', 'ls.f11': 'Tez notalar', 'ls.f12': 'Jimlik ham musiqa',
  'ls.f13': 'Butun qoʻshiq', 'ls.f14': 'Akkord nima', 'ls.f15': 'Birinchi akkordlar', 'ls.f16': 'Akkordlarni almashtirish',
  'ls.f17': 'Qoʻshiq bilan chalamiz', 'ls.f18': 'Quvnoq va gʻamgin', 'ls.f19': 'Notalar zinapoyasi', 'ls.f20': 'Qora klavishlar: diyez va bemol',
  'ls.f21': 'Vals: uchgacha sanash', 'ls.f22': 'Qogʻozdagi notalar', 'ls.f23': 'Bluz: oʻzidan birinchi chalish', 'ls.f24': 'Oʻz qoʻshigʻi va keyin nima',

  // 1
  'lx.f1.p': ul('Eng chapdagi oq klavish bosiladi, keyin eng oʻngdagisi. Chapdagisi past, oʻngdagisi baland jaranglaydi.', 'Bitta klavish sekin (zoʻrgʻa tegib), keyin kuchliroq bosiladi.', 'Bosib darhol qoʻyib yuborilsa — tovush qisqa. Bosib ushlab turilsa — tovush uzun.'),
  'lx.f1.g': ul('Eng yoʻgʻon tor chertiladi, keyin eng ingichkasi. Yoʻgʻoni past, ingichkasi baland jaranglaydi.', 'Tor sekin, keyin kuchliroq chertiladi.', 'Chertib darhol kaft bilan bosilsa — tovush qisqa. Chertib tegilmasa — uzun.'),
  'lx.f1.b': ul('Eng yoʻgʻon tor chertiladi, keyin eng ingichkasi. Yoʻgʻoni past, ingichkasi balandroq jaranglaydi.', 'Sekin, keyin kuchliroq.', 'Qisqa (darhol kaft bilan bosiladi) va uzun (tegilmaydi).'),
  'lx.f1.t': 'Telefonda «Pianino» asbobi ochiladi va xuddi shunday qilinadi: chapda past, oʻngda baland.',
  'lx.f1.easy': 'Tovush baland (qushning chiyillashi kabi) yoki past (paroxod gudogi kabi), uzun yoki qisqa, sekin yoki baland ovozli boʻladi. Har qanday musiqa shunday tovushlardan tuziladi.',
  'lx.f1.fix': ul('Tekshiruv tovushni eshitmasa — telefon cholgʻuga yaqinroq qoʻyiladi va balandroq chalinadi.', 'Raqamli pianino ovozsiz boʻlsa — ovoz balandligi va quloqchinlar tekshiriladi.'),
  // 2
  'lx.f2.p': ul('Oq klavishlar ketma-ket keladi. Qoralari — guruh-guruh: ikkitadan va uchtadan. Ikkita qoradan iborat hamma guruhlar topiladi.', 'Yonma-yon uchta klavish ketma-ket chalinadi: oq, qora, oq — bu uchta har xil tovush.', 'Oyoq ostidagi pedal (oʻngdagisi) tovushni uzaytiradi — hozircha kerak emas.'),
  'lx.f2.g': ul('Grif — uzun qism, unda metall chiziqchalar bor, ular parda deyiladi. Torlar oltita: yuqorida (yuzga yaqin) eng yoʻgʻoni.', 'Korpus — katta ichi boʻsh qism, tovush dumaloq teshikdan chiqadi.', 'Oltita tor yuqoridan pastga navbat bilan chertiladi.'),
  'lx.f2.b': ul('Basda toʻrtta yoʻgʻon tor va pardali uzun grif bor.', 'Bas past jaranglaydi: u poydevor, butun guruh unga tayanadi.', 'Toʻrtta tor yuqoridan pastga navbat bilan chertiladi.'),
  'lx.f2.t': 'Ekrandagi pianinoda ikkita va uchta qora klavishdan iborat guruhlar topiladi.',
  'lx.f2.easy': 'Har bir cholgʻuda tovush tugʻiladigan joy (klavish yoki tor) va balandlik tanlanadigan joy (qaysi klavish, qaysi parda) bor.',
  'lx.f2.fix': 'Qaysi tor qayerdaligi koʻrinmayaptimi? Cholgʻu qoʻlda boʻlganda gitara va basning eng yoʻgʻon tori yuzga yaqinroq turadi.',
  // 3
  'lx.f3.p': ul('Stul shunday balandlikda boʻladiki, tirsaklar klavishlardan sal yuqorida turadi. Stulning old yarmida oʻtiriladi, orqa tik.', 'Kaft yumaloq, xuddi olma ushlab turgandek. Barmoqlar tirnoqda emas, uchidagi yumshoq joyda turadi.', 'Barmoqlar raqam bilan ataladi: bosh barmoq — 1, koʻrsatkich — 2, oʻrta — 3, nomsiz — 4, jimjiloq — 5.'),
  'lx.f3.g': ul('Tik oʻtiriladi, gitara oʻng oyoqda yotadi, grif sal yuqoriga qaragan.', 'Chap qoʻl grifni ushlaydi: bosh barmoq — orqada, qolganlari — yuqorida, torlarda.', 'Oʻng qoʻl korpusda yotadi va torlarni teshik ustida chertadi (barmoqlar bilan yoki mediator — kichik plastinka bilan).'),
  'lx.f3.b': ul('Tik oʻtiriladi yoki tasma bilan tik turiladi; grif sal yuqoriga qaragan.', 'Chap qoʻl: bosh barmoq grif orqasida, har bir pardaga — oʻz barmogʻi.', 'Oʻng qoʻl: koʻrsatkich va oʻrta barmoq torni navbat bilan chertadi, xuddi qadam tashlagandek.'),
  'lx.f3.t': 'Cholgʻu yonida oʻzini suratga olish (yoki koʻzguga qarash) mumkin: orqa tik, yelkalar boʻsh.',
  'lx.f3.easy': 'Eng muhimi — hech narsa tarang boʻlmasin. Yelka koʻtarilsa yoki kaft charchasa — qoʻllar tushiriladi, silkitiladi va qaytadan boshlanadi.',
  'lx.f3.fix': ul('Bilak ogʻrisa — kaft juda bukilgan; uni tekisroq tutish kerak.', 'Torlarda barmoq uchlari dastlabki haftalarda ogʻriydi — bu odatiy hol, oz-ozdan shugʻullanilsa, 2–3 haftada oʻtib ketadi.'),
  // 4
  'lx.f4.p': 'Pianinoni oʻzi sozlash shart emas: raqamli pianino doim sozda, akustik pianinoni usta yarim yilda yoki yilda bir marta sozlaydi. Klaviatura oʻrtasidagi lya chalinadi va tyuner bilan solishtiriladi.',
  'lx.f4.g': ul('Tyuner ochiladi. Eng yoʻgʻon tor chertiladi va strelkaga qaraladi: u oʻrtada, E harfida turishi kerak.', 'Strelka chaproqda boʻlsa — qoziq (grif uchidagi burama) buraladi, tor qattiqroq tortiladi; oʻngroqda boʻlsa — boʻshatiladi.', 'Oltita torning hammasi shunday: E A D G B E.'),
  'lx.f4.b': ul('Tyuner ochiladi. Eng yoʻgʻon tor chertiladi — strelka E da turishi kerak.', 'Chaproqda — qoziq bilan tortiladi, oʻngroqda — boʻshatiladi.', 'Toʻrtta torning hammasi shunday: E A D G.'),
  'lx.f4.t': 'Tyuner ochiladi va istalgan nota kuylanadi — tyuner qaysi nota ekanini koʻrsatadi.',
  'lx.f4.easy': 'Sozlash — har bir tor aynan kerakli tovushda jaranglashini taʼminlash. Sozi buzilgan cholgʻu toʻgʻri chalinsa ham «qiyshiq» jaranglaydi.',
  'lx.f4.fix': ul('Strelka sakrasa — tor bir marta chertiladi va biroz kutiladi.', 'Oz-ozdan buraladi: tor juda qattiq tortilsa, uzilishi mumkin.', 'Tyuner eshitmasa — telefon yaqinroq qoʻyiladi.'),
  // 5
  'lx.f5.p': ul('Do topiladi: ikkita qora klavish chapidagi oq klavish. Do — re — mi: ketma-ket uchta oq klavish.', 'Do, re, mi chalinadi va nomi ovoz chiqarib aytiladi.'),
  'lx.f5.g': ul('Do — 5-tor (yuqoridan ikkinchi), 3-parda. Re — 4-tor, barmoqsiz. Mi — 4-tor, 2-parda.', 'Do, re, mi chalinadi va nomi ovoz chiqarib aytiladi.'),
  'lx.f5.b': ul('Do — A tor (yoʻgʻonligi boʻyicha ikkinchi), 3-parda. Re — D tor (uchinchi), barmoqsiz. Mi — D tor, 2-parda.', 'Do, re, mi chalinadi va nomi ovoz chiqarib aytiladi.'),
  'lx.f5.t': 'Pastdagi «Nota yoʻlidagi nota» treningi — hozircha qanday notalar borligini koʻrish uchun.',
  'lx.f5.easy': 'Notalar hammasi boʻlib yettita: do, re, mi, fa, sol, lya, si. Keyin ular aylana boʻylab takrorlanadi — yuqoriroq va pastroq. Koʻp mamlakatlarda boʻgʻinlar oʻrniga harflar yoziladi: C D E F G A B.',
  'lx.f5.fix': 'Nomlar chalkashsa — «do-re-mi-fa-sol-lya-si» sanoq sheʼri kabi bir necha marta kuylanadi.',
  // 6
  'lx.f6.p': ul('Oʻng qoʻl: bosh barmoq do da, qolganlari — re, mi, fa, sol da. Har bir barmoq — oʻz klavishida.', 'Do-re-mi-fa-sol va orqaga sekin chalinadi.'),
  'lx.f6.g': ul('Birinchi (eng ingichka) tor: ochiq — mi, 1-parda — fa, 3-parda — sol.', 'Mi-fa-sol va orqaga chalinadi; barmoq parda metall chiziqchasining darhol orqasiga qoʻyiladi.'),
  'lx.f6.b': ul('Eng yoʻgʻon tor: ochiq — mi, 1-parda — fa, 3-parda — sol.', 'Mi-fa-sol va orqaga chalinadi.'),
  'lx.f6.t': 'Ekrandagi pianinoda hamma do lar topiladi (ular bir nechta) — ular oʻxshash jaranglaydi, faqat balandroq yoki pastroq.',
  'lx.f6.easy': 'Pianinoda nota balandligi — qaysi klavish; gitara va basda — qaysi tor va qaysi parda. Oʻngga (yoki korpusga) qancha yaqin boʻlsa — shuncha baland.',
  'lx.f6.fix': ul('Tovush shitirlasa — tor kuchliroq va pardaga yaqinroq bosiladi.', 'Tekshiruv hisoblamasa — bittadan nota chalinadi va u yonguncha kutiladi.'),
  // 7
  'lx.f7.p': 'Metronom 60 ga qoʻyiladi va har bir chiqillashda do bosiladi — xuddi qadamlar kabi tekis.',
  'lx.f7.g': 'Metronom 60 ga qoʻyiladi va har bir chiqillashda ochiq tor chertiladi.',
  'lx.f7.b': 'Metronom 60 ga qoʻyiladi va har bir chiqillashda ochiq yoʻgʻon tor chertiladi, barmoqlar navbat bilan.',
  'lx.f7.t': 'Pastdagi tugmaga chiqillashlar bilan birga barmoq bilan urib boriladi.',
  'lx.f7.easy': 'Musiqaning tekis qadamlari bor — puls, xuddi yurak urishi yoki yurgandagi qadamlar kabi. Metronom — shu qadamlarni chiqillatib turadigan moslama.',
  'lx.f7.fix': ul('Adashib ketilsa — avval chiqillashlar bilan shunchaki qarsak chalinadi, keyin cholgʻu chalinadi.', 'Orqada qolinsa yoki shoshilinsa — oʻz barmoqlari emas, chiqillash tinglanadi.'),
  // 8
  'lx.f8.p': 'Do uzun (2 chiqillash ushlab turiladi), yana bir marta uzun, keyin toʻrtta qisqa (har chiqillashga bittadan).',
  'lx.f8.g': 'Ochiq tor: 2 chiqillash ushlab turiladi, yana 2, keyin har chiqillashga bittadan toʻrtta zarb.',
  'lx.f8.b': 'Ochiq tor: 2 chiqillash ushlab turiladi, yana 2, keyin har chiqillashga bittadan toʻrtta zarb.',
  'lx.f8.t': 'Pastdagi naqsh urib chiqiladi: ikkita uzun, toʻrtta qisqa.',
  'lx.f8.easy': 'Nota bir qadam (chorak), ikki qadam (yarim) yoki toʻrt qadam (butun) uzunlikda boʻladi. Qadamlar ovoz chiqarib sanaladi: «bir, ikki…»',
  'lx.f8.fix': 'Uzun nota uzilib qolsa — sanab boʻlmaguncha klavish qoʻyib yuborilmaydi yoki tor bosib oʻchirilmaydi.',
  // 9
  'lx.f9.p': 'Pastdagi kuy — oʻng qoʻl bilan, barmoqlar do-re-mi-fa-sol da turadi va joyidan ketmaydi.',
  'lx.f9.g': 'Pastdagi tabulatura boʻyicha kuy: chiziq — tor, raqam — parda.',
  'lx.f9.b': 'Basda kuy: tabulaturada raqam — parda, chiziq — tor.',
  'lx.f9.t': 'Kuy tinglanadi va kuylab beriladi.',
  'lx.f9.easy': 'Kuy — navbat bilan keladigan, kuylasa boʻladigan notalar. Avval tinglanadi, keyin sekin, bittadan nota chalinadi.',
  'lx.f9.fix': ul('Adashilsa — bittadan satr (4 nota) chalinadi, keyin ulanadi.', 'Tabulatura: oltita (yoki toʻrtta) chiziq — bu torlar, yuqoridagisi — eng ingichkasi; raqam — qaysi parda bosilishi, 0 — barmoqsiz.'),
  // 10
  'lx.f10.p': '«Bir-ikki-uch-toʻrt» sanaladi va «bir» da sal balandroq chalinadi; keyin pastdagi «Frère Jacques».',
  'lx.f10.g': 'Har bir sanoqda tor chertiladi, «bir» da — kuchliroq; keyin pastdagi kuy.',
  'lx.f10.b': 'Har bir sanoqda — asosiy nota, «bir» da — kuchliroq; keyin pastdagi kuy.',
  'lx.f10.t': 'Sakkizta tekis zarb urib chiqiladi; «Frère Jacques» toʻrtgacha sanab kuylanadi.',
  'lx.f10.easy': 'Musiqa qadamlari toʻrttadan yigʻiladi — bu takt. Taktning birinchi qadami sal kuchliroq, xuddi soʻzdagi urgʻu kabi.',
  'lx.f10.fix': 'Sanoq yoʻqolsa — toʻxtab, «bir» dan qaytadan boshlanadi.',
  // 11
  'lx.f11.p': 'Har bir chiqillashga — ikkita tez do: «ti-ti». Keyin «ta» (bitta) va «ti-ti» (ikkita) navbatlanadi.',
  'lx.f11.g': 'Har bir chiqillashga — ikkita zarb: pastga va yuqoriga («ti-ti»).',
  'lx.f11.b': 'Har bir chiqillashga — ikkita nota, barmoqlar navbat bilan.',
  'lx.f11.t': 'Naqsh urib chiqiladi: «ti-ti» va «ta».',
  'lx.f11.easy': 'Qadamni teng ikkiga boʻlish mumkin — ikkita tez nota (sakkizlik) chiqadi. Bir qadamga «ti-ti» deyiladi.',
  'lx.f11.fix': 'Sakkizliklar notekis chiqsa — metronom sekinlashtiriladi va «bir-va, ikki-va» deb sanaladi.',
  // 12
  'lx.f12.p': 'Pauzali naqsh: pauza joyida qoʻllar klavishlar ustida turadi, tovush chalinmaydi.',
  'lx.f12.g': 'Pauzada torlar kaft bilan bosib oʻchiriladi.',
  'lx.f12.b': 'Pauzada tor chap qoʻl barmogʻi bilan bosib oʻchiriladi.',
  'lx.f12.t': 'Naqsh urib chiqiladi: pauzalarda tegilmaydi.',
  'lx.f12.easy': 'Pauza — kerakli uzunlikdagi jimlik. U ham sanaladi: «bir» (jimlik), «ikki» (jimlik)…',
  'lx.f12.fix': 'Pauza yutilib ketsa — u ham notalar kabi baland ovozda sanaladi.',
  // 13
  'lx.f13.p': '«Shodlik qasidasi» — oʻng qoʻl bilan, do holatida. Avval satrma-satr, keyin butunligicha.',
  'lx.f13.g': '«Shodlik qasidasi» tabulatura boʻyicha: avval satrma-satr.',
  'lx.f13.b': '«Shodlik qasidasi» basda, tabulatura boʻyicha.',
  'lx.f13.t': 'Akkompanement bilan tinglanadi va kuylanadi.',
  'lx.f13.easy': 'Qoʻshiq — bir nechta qisqa satr. Bittadan satr oʻrganiladi, keyin ular ulanadi.',
  'lx.f13.fix': ul('Bir joyda adashilsa — faqat shu joy ketma-ket 5 marta chalinadi.', 'Sekin chalinadi («sekin» tugmasi), tezlik oʻzi keladi.'),
  // 14
  'lx.f14.p': 'Do, mi, sol navbat bilan, keyin uchalasi birga chalinadi — bu do major (C) akkordi. Barmoqlar 1, 3, 5.',
  'lx.f14.g': 'C akkordi: barmoqlar 2-torning 1-pardasida, 4-torning 2-pardasida va 5-torning 3-pardasida; beshta ingichka tor chertiladi.',
  'lx.f14.b': 'Basda akkord bittadan nota bilan chalinadi: do, mi, sol — navbat bilan.',
  'lx.f14.t': 'Akkord tinglanadi va uning notalari navbat bilan kuylanadi.',
  'lx.f14.easy': 'Akkord — bir vaqtda jaranglaydigan bir nechta nota. Eng oddiysi uchta notadan iborat.',
  'lx.f14.fix': ul('Gitara: bitta tor boʻgʻiq — barmoq unga tegib ketyapti; barmoqlar tikroq, eng uchlari bilan qoʻyiladi.', 'Pianino: uchalasi ham jaranglamasa — bir vaqtda va bir xil kuch bilan bosiladi.'),
  // 15
  'lx.f15.p': 'Uchta akkord: C (do-mi-sol), F (do-fa-lya), G (si-re-sol) — shunda qoʻl deyarli qimirlamaydi.',
  'lx.f15.g': 'Em (4- va 5-torlarning 2-pardasida ikkita barmoq), A (2-pardada qator turgan uchta barmoq), D (2–3-pardalarda uchburchak).',
  'lx.f15.b': 'Akkordlarning asosiy notalari: mi (ochiq yoʻgʻon tor), lya (ochiq 2-tor), re (ochiq 3-tor).',
  'lx.f15.t': '«Uchtovush eshitib» treningi — qaysi akkord jaranglaganini topish.',
  'lx.f15.easy': 'Har bir akkord — qoʻlning oʻz shakli. Qoʻl oʻzi qoʻyadigan boʻlguncha bittadan oʻrganiladi.',
  'lx.f15.fix': 'Akkord jaranglamasa — barmoqlar bittadan qoʻyiladi, har bir tor alohida tekshiriladi, keyin hammasi birga.',
  // 16
  'lx.f16.p': 'Metronom 60 da: C — 4 chiqillash, G — 4 chiqillash, ular orasida toʻxtamasdan.',
  'lx.f16.g': 'Metronom 60 da: A — 4 chiqillash, D — 4; barmoqlar hammasi birdaniga koʻchiriladi.',
  'lx.f16.b': 'Metronom 60 da: lya — 4 chiqillash, re — 4, pauzasiz.',
  'lx.f16.t': 'Bir daqiqada akkord necha marta toʻxtamasdan almashtirilgani sanaladi va son yozib qoʻyiladi.',
  'lx.f16.easy': 'Akkordlarda asosiysi — akkordlarning oʻzi emas, ular orasidagi oʻtish. Qoʻl qancha tez oʻtsa, qoʻshiq chalish shuncha oson.',
  'lx.f16.fix': ul('Almashtirishda toʻxtalsa — barmoqlar qayerga borishiga oldindan qaraladi va ular hammasi birga siljitiladi.', 'Metronom 50 gacha sekinlashtiriladi.'),
  // 17
  'lx.f17.p': 'Chap qoʻl — qoʻshiq davomida C, F, G akkordlari, oʻng qoʻl — kuy; avval faqat akkordlar yozuv ostida.',
  'lx.f17.g': 'Qoʻshiq akkordlari yozuv ostida (akkompanementli «Tinglash» tugmasi); har bir chiqillashga pastga zarb.',
  'lx.f17.b': 'Qoʻshiq akkordlarining asosiy notalari har «bir» va «uch» sanogʻida.',
  'lx.f17.t': 'Qoʻshiq tinglanadi va akkord qayerda almashishi topiladi.',
  'lx.f17.easy': 'Akkompanement — qoʻshiq ostidagi akkordlar. Satr kuylanayotganda akkordni shunchaki ushlab turish mumkin.',
  'lx.f17.fix': 'Almashtirishga ulgurilmasa — akkord faqat taktning birinchi sanogʻida chalinadi, qolgani ushlab turiladi.',
  // 18
  'lx.f18.p': 'C (do-mi-sol), keyin Cm (do-mi-bemol-sol): bitta nota oʻzgardi — tovush gʻamgin boʻlib qoldi.',
  'lx.f18.g': 'A va Am: Am da bitta barmoq bir parda orqaga suriladi — akkord gʻamginlashadi.',
  'lx.f18.b': 'Lya–do–mi, keyin lya–do-diyez–mi chalinadi: gʻamgin va quvnoq.',
  'lx.f18.t': 'Trening: quvnoq (major) yoki gʻamgin (minor) akkord.',
  'lx.f18.easy': 'Major yorqin va quvnoq, minor — gʻamgin va oʻychan jaranglaydi. Farqi — bitta oʻrtadagi notada.',
  'lx.f18.fix': 'Farq eshitilmasa — ikkala akkord sekin, bittadan nota bilan chalinadi.',
  // 19
  'lx.f19.p': 'Oʻng qoʻl bilan do major gammasi: do-re-mi — 1-2-3 barmoqlar, keyin bosh barmoq kaft ostidan fa ga oʻtkaziladi, soʻng fa-sol-lya-si-do — 1-2-3-4-5 barmoqlar.',
  'lx.f19.g': '5-torning 3-pardasidan do major gammasi — mashqdagi jadval boʻyicha.',
  'lx.f19.b': '3-torning 3-pardasidan do major gammasi.',
  'lx.f19.t': '«Do-re-mi-fa-sol-lya-si-do» kuylanadi — tyuner tekshiradi.',
  'lx.f19.easy': 'Gamma — tartib boʻyicha, yuqoriga va pastga ketadigan notalar zinapoyasi. Mashqqa tayyorlanish undan boshlanadi.',
  'lx.f19.fix': 'Pianino: barmoqlar chalkashsa — avval faqat do-re-mi (1-2-3), keyin fa-sol-lya-si-do (1-2-3-4-5) chalinadi.',
  // 20
  'lx.f20.p': 'Do dan boshlab hamma klavishlar ketma-ket chalinadi, oq ham, qora ham. Do ning oʻngidagi qora klavish — do-diyez, u re-bemol ham.',
  'lx.f20.g': '1-torda har bir parda ketma-ket: mi, fa, fa-diyez, sol, sol-diyez.',
  'lx.f20.b': 'Yoʻgʻon torda har bir parda ketma-ket.',
  'lx.f20.t': 'Ekrandagi pianinoda fa-diyez va si-bemol topiladi.',
  'lx.f20.easy': 'Diyez (♯) — sal balandroq, bemol (♭) — sal pastroq. Do va re orasidagi qora klavish — bir vaqtning oʻzida do-diyez ham, re-bemol ham.',
  'lx.f20.fix': 'Nomlar chalkashsa — qora klavishlarning ikki nomi bor, ikkalasi ham toʻgʻri.',
  // 21
  'lx.f21.p': 'Uchgacha sanash: «bir-ikki-uch». Chap qoʻl: «bir» da pastki nota, «ikki» va «uch» da akkord.',
  'lx.f21.g': 'Vals: «bir» da — yoʻgʻon tor, «ikki» va «uch» da — ingichkalari.',
  'lx.f21.b': 'Vals: asosiy nota faqat «bir» da, «ikki» va «uch» da — jimlik.',
  'lx.f21.t': 'Vals urib chiqiladi: zarb-zarb-zarb, birinchisi kuchliroq.',
  'lx.f21.easy': 'Valsda qadamlar toʻrttadan emas, uchtadan yigʻiladi: «bir-ikki-uch, bir-ikki-uch».',
  'lx.f21.fix': 'Toʻrtga oʻtib ketilsa — «bir-ikki-uch» ovoz chiqarib sanaladi va «bir» da tebraniladi.',
  // 22
  'lx.f22.p': 'Notalarda birinchi oktava do si topiladi (beshta chiziq ostidagi alohida chiziqchada) va chalinadi.',
  'lx.f22.g': 'Gitara notalari xuddi shunday yoziladi; tabulatura soddaroq — tor chizigʻida parda raqami.',
  'lx.f22.b': 'Bas uchun notalar bas kalitida oʻqiladi; tabulatura — tor chizigʻida parda raqami.',
  'lx.f22.t': '«Nota yoʻlidagi nota» treningi.',
  'lx.f22.easy': 'Notalar beshta chiziqqa yoziladi: doiracha qancha baland boʻlsa — tovush shuncha baland. Boʻyalgan doiracha — qisqa nota, boʻsh doiracha — uzun.',
  'lx.f22.fix': 'Esda qolmasa — kuniga uchtadan, ortiq emas, nota oʻrganiladi.',
  // 23
  'lx.f23.p': 'Beshta nota: lya, do, re, mi, sol. Ular metronom ostida istalgan tartibda chalinadi — bu yerda notoʻgʻri nota yoʻq.',
  'lx.f23.g': '5-pardadagi beshta nota (lya, do, re, mi, sol) — istalgan tartibda chalinadi.',
  'lx.f23.b': 'Beshta nota: lya, do, re, mi, sol — qisqa jumlalar.',
  'lx.f23.t': 'Qisqa jumla kuylanadi, keyin unga boshqasi bilan «javob» beriladi.',
  'lx.f23.easy': 'Improvizatsiya — oʻzidan chalish. Beshta nota shunday tanlanganki, birga doim chiroyli jaranglaydi.',
  'lx.f23.fix': 'Nima chalish kerakligi bilinmasa — bitta qisqa jumla takrorlanadi, har safar bitta notasi oʻzgartiriladi.',
  // 24
  'lx.f24.p': '«Qoʻshiqlar»da qoʻshiq tanlanadi, akkordlari oʻrganiladi va butunligicha chalinadi; oʻz chalishi yozib olinadi.',
  'lx.f24.g': 'Oʻz qoʻshigʻi: akkordlar, zarb, metronom ostida butunligicha; yozib olinadi.',
  'lx.f24.b': 'Oʻz qoʻshigʻi: har «bir» sanogʻida asosiy nota; yozib olinadi.',
  'lx.f24.t': 'Birinchi va oxirgi yozuv tinglanadi — farqi eshitiladi.',
  'lx.f24.easy': 'Boshlangʻich yoʻl bosib oʻtildi. Keyingisi — «Oʻrta» darajadagi darslik: daraja almashtirgichi «Darslik» yuqorisida.',
  'lx.f24.fix': 'Qoʻshiq juda qiyin boʻlsa — 3–4 akkordli boshqasi tanlanadi yoki yozuv mediatekada sekinlashtiriladi.',
};

export const TERMS = {};

const ch = (id, t, s, h) => ({ id, t, s, src: '', h });
export const CH = [
  ch('f1', 'Tovushlardan musiqa', 'Baland va past, uzun va qisqa, sekin va baland ovozli', `
<p>Har qanday musiqa — bu tovushlar. Har bir tovushning toʻrtta belgisi bor: u <b>baland yoki past</b>, <b>uzun yoki qisqa</b>, <b>sekin yoki baland ovozli</b> boʻladi, yana har bir cholgʻuning oʻz «ovozi» bor — shunga koʻra pianinoni gitara bilan adashtirib boʻlmaydi.</p>
<p>Qoʻshiqlar shu oddiy narsalardan tuziladi: qanday tovushlar, qaysi tartibda va qancha davom etadi.</p>
${key('Baland — past, uzun — qisqa, baland ovoz — sekin ovoz. Birinchi qadamda kerak boʻlgani shu.')}
`),
  ch('f2', 'Cholgʻu bilan tanishuv', 'U nimadan iborat va tovush qayerda tugʻiladi', `
<p>Pianinoda klavish kichik bolgʻachani harakatlantiradi, u ichkaridagi torga uriladi — tovush shunda tugʻiladi. Gitara va basda tovush barmoqlar torni chertganda tugʻiladi.</p>
<p>Tovush balandligi turlicha tanlanadi: pianinoda — qaysi klavish bilan, gitara va basda — qaysi tor va uni qayerda bosish bilan.</p>
${tip('Cholgʻuda eng past va eng baland tovush topiladi.')}
`),
  ch('f3', 'Qanday oʻtirish va qoʻllarni tutish', 'Qulay — demak, toʻgʻri', `
<p>Toʻgʻri oʻtirish chiroy uchun emas: shunda qoʻllar charchamaydi va tezroq chaladi. Orqa tik, yelkalar tushirilgan, qoʻllar yumshoq.</p>
<p>Biror joy tarang boʻlsa — toʻxtab, qoʻllar tushiriladi va silkitiladi. Bir daqiqadan keyin — yana.</p>
${key('Hech narsa ogʻrimasligi kerak. Charchoq sezilsa — dam olinadi.')}
`),
  ch('f4', 'Sozlash', 'Cholgʻu toʻgʻri jaranglashi uchun', `
<p>Vaqt oʻtishi bilan torlar boʻshaydi va cholgʻu «qiyshiq» jaranglay boshlaydi. Sozlash — har bir torni kerakli tovushgacha tortish. Bunda tyuner yordam beradi: u tovushni eshitadi va strelka bilan koʻrsatadi — kerakligidan balandmi yoki pastmi.</p>
<p>Gitara va bas har bir mashgʻulotdan oldin sozlanadi — bu bir daqiqa. Pianinoni usta sozlaydi.</p>
`),
  ch('f5', 'Notalarning nomlari', 'Do, re, mi, fa, sol, lya, si', `
<p>Notalar hammasi boʻlib yettita: <b>do, re, mi, fa, sol, lya, si</b>. Si dan keyin yana do keladi — faqat balandroq. Shunday qilib notalar butun cholgʻu boʻylab aylana boʻyicha takrorlanadi.</p>
<p>Koʻp mamlakatlarda notalar harflar bilan ataladi: C D E F G A B. Do — bu C, re — D va hokazo. Ilovada ikkala usul ham uchraydi.</p>
${key('Aylana boʻylab yettita nota: do-re-mi-fa-sol-lya-si, va yana do.')}
`),
  ch('f6', 'Notalar qayerda yashaydi', 'Klaviaturada va grifda', `
<p>Pianinoda notalarni qora klavishlar yordamida topish oson: ikkita qora klavishning chapida — doim do. Undan oʻngga, oq klavishlar boʻylab: re, mi, fa, sol, lya, si.</p>
<p>Gitara va basda: ochiq tor (barmoqsiz) — bitta nota, har bir yuqoriroq parda — keyingi nota. Korpusga qancha yaqin — shuncha baland.</p>
`),
  ch('f7', 'Puls — musiqaning qadamlari', 'Yurak kabi tekis', `
<p>Har bir qoʻshiqning tekis pulsi bor — xuddi qadamlar yoki yurak urishi kabi. Konsertda shunga qarsak chalinadi va bosh qimirlatiladi. Puls sekin va tez boʻladi — bu temp deyiladi.</p>
<p>Metronom pulsni tekis chiqillatadi. Uning ostida chalish — ritmni ushlashni oʻrganishning eng yaxshi yoʻli.</p>
${tip('Metronom 60 da, keyin 80 da qarsak chalinadi.')}
`),
  ch('f8', 'Uzun va qisqa tovushlar', 'Qadamlarni sanaymiz', `
<p>Nota puls bir qadami, ikki qadami yoki toʻrt qadami davomida jaranglashi mumkin. Uzunlik ovoz chiqarib sanaladi: «bir» — bir qadam, «bir-ikki» — ikki qadam.</p>
<p>Notalar yozuvida uzun notalarning doirachasi boʻsh, qisqalariniki — boʻyalgan. Bu haqda batafsil — «Qogʻozdagi notalar» darsida.</p>
`),
  ch('f9', 'Birinchi kuy', 'Beshta nota — va bu allaqachon qoʻshiq', `
<p>Kuy — navbat bilan keladigan, kuylasa boʻladigan notalar. Birinchi kuy uchun beshta nota yetarli: do, re, mi, fa, sol.</p>
<p>Avval — tinglanadi. Keyin sekin, bittadan nota chalinadi. Xato boʻlsa — qoʻrqinchli emas: toʻxtamasdan davom ettiriladi.</p>
`),
  ch('f10', 'Toʻrtgacha sanaymiz', 'Takt va kuchli qadam', `
<p>Musiqa qadamlari guruhlarga yigʻiladi, koʻpincha toʻrttadan: «bir-ikki-uch-toʻrt». Bunday guruh takt deyiladi. Taktning birinchi qadami — kuchli, u sal yorqinroq chalinadi.</p>
<p>Sanash adashmaslikka yordam beradi: boshi qayerdaligi doim aniq.</p>
`),
  ch('f11', 'Tez notalar', 'Bir qadamga ikkita nota', `
<p>Qadamni teng ikkiga boʻlish mumkin — ikkita tez nota chiqadi. Ular «ti-ti» yoki «bir-va» deb sanaladi.</p>
${tip('Qarsak chalinadi: «ta, ta, ti-ti, ta».')}
`),
  ch('f12', 'Jimlik ham musiqa', 'Pauzalar', `
<p>Pauza — kerakli uzunlikdagi jimlik. U ham notalar kabi sanaladi: zarb tashlab ketiladi, lekin sanoq toʻxtatilmaydi.</p>
<p>Pauzalar musiqani jonli qiladi — xuddi jumlalar orasidagi nafas kabi.</p>
`),
  ch('f13', 'Butun qoʻshiq', '«Shodlik qasidasi»', `
<p>Qoʻshiq boʻlakma-boʻlak oʻrganiladi: satrma-satr. Har bir satr chiqqanda — ular ulanadi va hammasi ketma-ket chalinadi.</p>
<p>Sekin va toʻxtamasdan chalish tez va xatolar bilan chalishdan yaxshiroq.</p>
${key('Xato boʻlsa — davom ettiriladi. Toʻxtash — odat, undan qutulish qiyin.')}
`),
  ch('f14', 'Akkord nima', 'Bir nechta nota birga', `
<p>Bir nechta nota bir vaqtda chalinsa, akkord hosil boʻladi. Eng oddiy akkord — uchta notadan: masalan, do, mi va sol. Bu «do major» akkordi, u C harfi bilan yoziladi.</p>
<p>Akkordlar qoʻshiq ostida jaranglaydi va uni toʻliq qiladi.</p>
`),
  ch('f15', 'Birinchi akkordlar', 'Uchta akkord — va minglab qoʻshiqlar', `
<p>Har bir akkord — qoʻlning oʻz shakli. Avval uchta akkord oʻrganiladi; juda koʻp qoʻshiqlar ularga tayanadi.</p>
<p>Akkord bittadan emas, darhol hamma barmoqlar bilan qoʻyiladi va tekshiriladi: har bir nota jaranglayaptimi.</p>
`),
  ch('f16', 'Akkordlarni almashtirish', 'Toʻxtamasdan', `
<p>Akkordlarda eng qiyini — biridan boshqasiga oʻtish. Barmoqlar hammasi birga, birdaniga oʻtishi kerak.</p>
<p>Oddiy mashq yordam beradi: ikki akkord oldinga-orqaga — bir daqiqada necha marta chiqadi? Son yozib qoʻyiladi va bir haftadan keyin solishtiriladi.</p>
`),
  ch('f17', 'Qoʻshiq bilan chalamiz', 'Kuy ostida akkordlar', `
<p>Akkompanement — qoʻshiq ostidagi akkordlar. Kuyni ovoz kuylashi yoki boshqa qoʻl chalishi mumkin, akkordlar esa uni pastdan ushlab turadi.</p>
<p>Avval — har taktga bitta akkord, metronom ostida tekis.</p>
`),
  ch('f18', 'Quvnoq va gʻamgin', 'Major va minor', `
<p>Akkordlar yorqin, quvnoq — <b>major</b>, va gʻamgin, oʻychan — <b>minor</b> boʻladi. Minor akkord kichik m harfi bilan yoziladi: Am — lya minor.</p>
<p>Farqi — akkordning bitta oʻrtadagi notasida, lekin u darhol eshitiladi.</p>
`),
  ch('f19', 'Notalar zinapoyasi', 'Gamma', `
<p>Gamma — xuddi zinapoya pogʻonalari kabi tartib boʻyicha keladigan notalar: do-re-mi-fa-sol-lya-si-do yuqoriga va orqaga pastga.</p>
<p>Gamma mashq boshidagi tayyorgarlikda chalinadi: u barmoqlarni uygʻotadi va tekis yurishga oʻrgatadi.</p>
`),
  ch('f20', 'Qora klavishlar: diyez va bemol', 'Notalar orasidagi tovushlar', `
<p>Baʼzi notalar orasida yana tovushlar bor — pianinoda bu qora klavishlar, gitara va basda — qoʻshni pardalar. Notadan sal baland tovush <b>diyez</b> (♯), sal past tovush <b>bemol</b> (♭) deyiladi.</p>
<p>Shuning uchun bitta qora klavishning ikki nomi bor: do-diyez — bu re-bemol bilan bir xil.</p>
`),
  ch('f21', 'Vals: uchgacha sanash', 'Bir-ikki-uch', `
<p>Hamma musiqa ham toʻrttadan qadam tashlamaydi. Vals uchgacha sanaladi: «bir-ikki-uch, bir-ikki-uch», birinchi qadam — kuchli.</p>
${tip('Vals taktiga tebraniladi: «bir» da — pastga, «ikki-uch» da — yuqoriga.')}
`),
  ch('f22', 'Qogʻozdagi notalar', 'Notalarni qanday oʻqish', `
<p>Notalar beshta chiziqqa yoziladi. Doiracha qancha baland boʻlsa — tovush shuncha baland. Boʻsh doiracha — uzun nota, boʻyalgani — qisqa, bayroqcha-dumchasi borini — yanada qisqa.</p>
<p>Gitarachilar va basistlar koʻpincha tabulatura oʻqiydi: chiziqlar — bu torlar, raqam esa — qaysi parda bosilishi.</p>
`),
  ch('f23', 'Bluz: oʻzidan birinchi chalish', 'Xato qilib boʻlmaydigan beshta nota', `
<p>Bluz — oʻzidan chalish, yaʼni chalish paytida oʻylab topish odat boʻlgan musiqa. Boshlash uchun beshta nota yetarli (lya, do, re, mi, sol) — birga ular doim chiroyli jaranglaydi.</p>
<p>Qisqa jumla — pauza — yana jumla, xuddi suhbat kabi: savol va javob.</p>
`),
  ch('f24', 'Oʻz qoʻshigʻi va keyin nima', 'Birinchi qoʻshiq butunligicha', `
<p>Oʻz qoʻshigʻini tanlash vaqti keldi: uch-toʻrt akkordli istalgan qoʻshiq. Akkordlar, ritm oʻrganiladi va metronom ostida butunligicha chalinadi — keyin oʻz chalishi yozib olinadi.</p>
<p>Keyingisi — «Oʻrta» darajadagi darslik: u yerda oʻsha mavzular chuqurroq va yangilari bor — intervallar, ladlar, tonalliklar. Daraja almashtirgichi — «Darslik» yuqorisida.</p>
${key('Oʻz yozuvi — eng yaxshi ustoz: ertasi kuni tinglab, nima chiqqanini eshitish mumkin.')}
`),
];
