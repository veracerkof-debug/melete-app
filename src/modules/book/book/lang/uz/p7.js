// Учебник (uz), уроки: глава «Игра на инструменте», названия уроков, упражнения по инструментам (lessons.js).
// Текст — перевод ru/p7.js. Упражнения — свои, по общепринятой методике начального обучения; чужие упражнения и песни не переносятся.
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'pc.lightly': 'Hänschen klein', 'pc.lightly.by': 'Nemis xalq qoʻshigʻi; do pozitsiyasi — besh barmoq',
  'pc.jacques': 'Frère Jacques', 'pc.jacques.by': 'Fransuz xalq qoʻshigʻi; kanon',
  'pc.korobeiniki': 'Korobeyniki', 'pc.korobeiniki.by': 'Rus xalq qoʻshigʻi (XIX asr)',
  'bk.part7': 'Cholgʻuda chalish',
  'ls.n': '{n}-dars', 'ls.list': 'Bob darslari',
  'lx.title': 'Mashqlar', 'lx.inst': 'Cholgʻu', 'lx.i.p': 'Pianino', 'lx.i.g': 'Gitara', 'lx.i.b': 'Bas', 'lx.phone': 'Cholgʻusiz',
  'lx.markDone': 'Dars oʻtildi', 'lx.isDone': 'Oʻtildi', 'lx.go': 'Chalish', 'lx.stop': 'Toʻxtatish', 'lx.hear': 'Misol', 'lx.done': 'Hammasi toʻgʻri ✓',
  'lx.chordHint': 'Mikrofon akkord major yoki minor ekanini va qaysi notadan ekanini eshitadi. Akkord belgi yonguncha ushlab turiladi.',
  'lx.tap': 'Tegish', 'lx.tapGo': 'Urib chiqish · {bpm}', 'lx.tapRes': 'Aniq tushish: {ok} / {n}; ortiqcha tegish: {x}.', 'lx.tapHint': 'Avval sanoq takti, soʻng naqsh metronom kliklari ostida tugmaga tegish bilan urib chiqiladi.',
  'lx.open.metro': 'Metronom · {bpm}', 'lx.open.tuner': 'Tyuner', 'lx.open.theory': 'Nazariya: kvinta doirasi', 'lx.open.audio': 'Mediateka va yozuv', 'lx.open.piano': 'Pianino',
  'lp.start.kicker': 'Noldan', 'lp.start.title': 'Boshlangʻich yoʻl', 'lp.start.sub': '20 dars: ritm, notalar, akkordlar, birinchi qoʻshiq — pianino, gitara yoki basda',
  'lp.prog': 'Oʻtildi: {d} / {n}', 'lp.start.lead': 'Akademik boʻlim boblaridan darslar oʻquv tartibida: nazariya — darhol cholgʻuda va qoʻshiqda. Bir dars — 15–25 daqiqa; qulayi — ikki-uch kunda bir dars.',
  'lp.begin': 'Boshlash: {n}-dars — {t}', 'lp.cont': 'Davom etish: {n}-dars — {t}',
  'lp.note': '«Dars oʻtildi» belgisi qoʻlda qoʻyiladi: ilova tekshiruvlari yoʻl koʻrsatadi, lekin darslarni qulflamaydi. Seriyalar va eslatmalar yoʻq — faqat yoʻlning borishi.',

  // названия уроков
  'ls.play1': 'Oʻtirish, sozlash, ilk tovushlar', 'ls.play2': 'Ilk akkordlar va almashtirish', 'ls.play3': 'Akkompanement: I – IV – V', 'ls.play4': 'Bas va ovoz yurishi', 'ls.play5': 'Bluz va pentatonika', 'ls.play6': 'Butun qoʻshiq',
  'ls.sound1': 'Tovush va uning xossalari', 'ls.sound2': 'Notalar va oktavalar', 'ls.sound3': 'Kalitlar, partitura, diapazon',
  'ls.rhythm1': 'Puls va choʻzimlar', 'ls.rhythm2': 'Pauzalar, nuqta, liga', 'ls.rhythm3': 'Guruhlash, triol, punktir', 'ls.rhythm4': 'Tekis va sving sakkizliklar',
  'ls.meter1': 'Metr va takt', 'ls.meter2': '3/4 va 6/8 oʻlchamlari, taktni koʻrsatish', 'ls.meter3': 'Zatakt va sinkopa',
  'ls.pitch1': 'Ton, yarim ton, belgilar', 'ls.pitch2': 'Yarim tonlar va temperatsiya',
  'ls.mode1': 'Lad va major gamma', 'ls.mode2': 'Intilishlar va tetraxordlar', 'ls.mode3': 'Minor',
  'ls.keys1': 'Kalit belgilari', 'ls.keys2': 'Kvinta doirasi va qardoshlik', 'ls.keys3': 'Pogʻonalar va transpozitsiya',
  'ls.melody1': 'Motiv, ibora, period', 'ls.melody2': 'Sekvensiya va shakl',
  'ls.perform1': 'Temp va kuch', 'ls.perform2': 'Shtrixlar, bezaklar, xarakter',
  'ls.iv1': 'Intervallar', 'ls.iv2': 'Jadval, enharmonizm, aylanma', 'ls.iv3': 'Konsonans va eshitish', 'ls.iv4': 'Laddagi intervallar',
  'ls.chords1': 'Uchtovushlar', 'ls.chords2': 'Aylanmalar', 'ls.chords3': 'Septakkordlar', 'ls.chords4': 'Tarangliklar va sus', 'ls.chords5': 'Yuqori tuzilmalar',
  'ls.scales1': 'Major ladlari', 'ls.scales2': 'Akkord oilalari boʻyicha gammalar', 'ls.scales3': 'Melodik va garmonik minor', 'ls.scales4': 'Simmetrik gammalar, pentatonikalar, bibop', 'ls.scales5': 'Xromatik gamma, oʻzgaruvchan lad, barcha gammalar',
  'ls.key1': 'T, S, D funksiyalari', 'ls.key2': 'Minor va kadensiyalar',

  // упражнения: p — пианино, g — гитара, b — бас, t — без инструмента
  'lx.play1.p': ul('Tirsaklar klavishlardan biroz yuqori, kaft — xuddi toʻp ushlab turgandek dumaloq holda oʻtiriladi; barmoqlar bosh barmoqdan (1) jimjiloqqacha (5) raqamlanadi.', 'Barcha do tovushlari topiladi: ikkita qora klavish guruhining chap tomonida. Birinchi oktava do tovushi — oʻrtada.', 'Oʻng qoʻl bilan do–re–mi–fa–sol 1-2-3-4-5 barmoqlar bilan va orqaga, sekin va tekis chalinadi; soʻng chap qoʻl bilan kichik oktava do tovushidan 5-4-3-2-1 barmoqlar bilan.'),
  'lx.play1.g': ul('Gitara oʻng sonda (klassik oʻtirishda — chap sonda), grif biroz yuqoriga; qad tik.', 'Torlar tyuner bilan sozlanadi: yoʻgʻonidan ingichkasiga — E A D G B E.', 'Tor barmoq uchi bilan pardaning darhol orqasida (metall porogga yaqinroq) bosiladi, bosh barmoq — grif ortida. Har bir ochiq tor, soʻng 1-torning 3-pardasidagi nota (sol) chalinadi — tovush shitirlashsiz.'),
  'lx.play1.b': ul('Kamar bas oʻtirganda ham, turganda ham bir xil balandlikda osilib turadigan qilib sozlanadi; grif biroz yuqoriga.', 'Torlar tyuner bilan sozlanadi: E A D G (yoʻgʻonidan).', 'Oʻng qoʻl — 2 va 3 barmoqlar (koʻrsatkich va oʻrta) navbat bilan, bosh barmoq datchikda yoki E torda turadi. Chap qoʻl — bir pardaga bir barmoq: 1-barmoq 1-pardada, 2-barmoq 2-pardada va hokazo.'),
  'lx.play1.t': 'Ekrandagi pianinoda («Pianino» asbobi) do topiladi va do–sol chalinadi; «Misol» tugmasi bergan tovush kuylanadi va «Interval» treningida kuylab tekshiriladi.',
  'lx.play2.p': ul('Do major akkordi (C): chap qoʻl do–mi–sol 5-3-1 barmoqlar bilan; fa major (F) — fa–lya–do; sol major (G) — sol–si–re yoki yaqinroq — si–re–sol (G/B).', 'Bir daqiqada almashtirish: ikki akkord oldinga va orqaga (C ↔ F) — bir daqiqada necha marta toza chiqdi? Son yozib qoʻyiladi; bir haftadan keyin — solishtiriladi.', 'Metronom 60 ostida: har hissaga akkord, almashtirish — toʻxtamasdan.'),
  'lx.play2.g': ul('A va D: ilk ikki akkord (A da uch barmoq 2-pardada qator; D da — 2- va 3-pardalarda uchburchak). Soʻng E.', 'Bir daqiqada almashtirish: A ↔ D, soʻng D ↔ E, A ↔ E. Bir daqiqadagi toza almashtirishlar soni yozib qoʻyiladi; bu oʻsishning halol oʻlchovi.', 'Barmoqlar bittalab emas, hammasi birdaniga qoʻyiladi; akkord ushlab turiladi va har bir tor tekshiriladi — jaranglayaptimi.'),
  'lx.play2.b': ul('Asos va kvinta: A asosidan (E torning 5-pardasi yoki ochiq A) kvinta — qoʻshni torda (E) 2 parda yuqorida.', 'A – D – E asoslari metronom 60 ostida chalinadi, har biriga toʻrt zarba.', 'Soʻng har bir akkordda «asos – kvinta – asos – kvinta».'),
  'lx.play2.t': '«Uchtovush eshitib» treningi: major yoki minor. «Akkordlar» bobidagi «Uchtovushlar» sxemasi — ular ekrandagi pianinoda chalinadi.',
  'lx.play3.p': ul('Do majorda: C – F – G – C (I – IV – V – I). Chap qoʻl — bas (asos), oʻng qoʻl — akkord: «bas – akkord – akkord – akkord».', 'Silliq almashtirish uchun aylanmalar: C (do–mi–sol) → F/C (do–fa–lya) → G/B (si–re–sol) → C.', 'Uch akkordli qoʻshiq (xalq qoʻshigʻi yoki oʻz kutubxonasidan) metronom 80 ostida.'),
  'lx.play3.g': ul('G, C, D akkordlari (sol majorda bular I, IV, V). Bir daqiqada almashtirish G ↔ C, C ↔ D.', 'Zarb: har hissaga pastga, soʻng «pastga – pastga-yuqoriga – yuqoriga-pastga-yuqoriga».', 'G, C, D dagi qoʻshiq metronom 80 ostida; soʻng oʻsha qoʻshiq kapo bilan — boshqa tonallikda.'),
  'lx.play3.b': ul('Sol majorda I – IV – V asoslari: G – C – D. Choraklar bilan, soʻng sakkizliklar bilan.', 'Akkord almashishidan oldin — oʻtkinchi nota: G dan C ga A yoki B orqali.', 'Uch akkordli qoʻshiq: bas 1 va 3 da, soʻng har hissada.'),
  'lx.play3.t': '«Qoʻshiqlar»da qoʻshiq ochiladi, undagi I, IV va V topiladi (tonallik — qoʻshiq kartochkasida); qoʻshiq transpozitsiya qilinadi va akkordlar qanday oʻzgarishi kuzatiladi.',
  'lx.play4.p': ul('Chap qoʻl — asoslar oktavasi, oʻng qoʻl — eng yaqin aylanmalardagi akkordlar: C – G/B – Am – F.', 'Yurishli bas: do – si – lya – fa – sol – do (akkordlar ostida pasayuvchi chiziq).', 'Har bir yangi akkord — eng yaqin notalarga: umumiy tovush joyida qoladi.'),
  'lx.play4.g': ul('Navbatlashuvchi bas: asos – akkord – kvinta – akkord (C da: 5-tor, akkord, 6-tor 3-parda, akkord).', 'C – G/B – Am da yurishli bas: 5-torda do – si – lya.', 'Oʻsha akkordlar boʻyicha p-i-m-a terib chalish.'),
  'lx.play4.b': ul('C – B – A – F – G – C chizigʻi: C – G/B – Am – F – G – C akkordlari ostida.', 'Taktning oxirgi hissasida yangi asosga pastdan yoki yuqoridan yarim ton bilan yaqinlashish.', 'Har bir akkordda asos – tersiya – kvinta – tersiya (arpedjio).'),
  'lx.play4.t': 'Mediateka: qoʻshiq yozuvi ochiladi, «bas» yoʻlagi yoqiladi (agar yozuv ajratilgan boʻlsa) va bas akkordlar orasida qanday yurishi kuzatiladi.',
  'lx.play5.p': ul('C da bluz (12 takt): C7 ×4, F7 ×2, C7 ×2, G7, F7, C7, G7. Chap qoʻl — «shaffl»: do–sol, do–lya navbat bilan.', 'Oʻng qoʻl — bluz ustida lya dan (lya – do – re – mi – sol) yoki do dan (do – mi♭ – fa – sol – si♭) minor pentatonika.', 'Savol – javob: 2 taktli qisqa ibora, soʻng unga javob.'),
  'lx.play5.g': ul('A da bluz: A7 ×4, D7 ×2, A7 ×2, E7, D7, A7, E7. 5- va 6-torlarda shaffl: kvinta va seksta navbat bilan.', '5-pardadagi pentatonikaning birinchi «qutichasi» (lya minor): har torda ikkitadan nota.', '2 kvadrat improvizatsiya: 3–4 nota, pauzalar, takrorlar.'),
  'lx.play5.b': ul('A7, D7, E7 da 1 – 3 – 5 – 6 – ♭7 – 6 – 5 – 3 bluz chizigʻi.', 'Lya minor pentatonikasi bas chizigʻi sifatida va kvadrat oxirida qisqa fill.', 'Barabanlar (aksentli metronom) ostida shaklni yoʻqotmasdan 2 aylana bluz.'),
  'lx.play5.t': 'Jaz boʻlimining «Shakllar» bobidagi «Shakl» sxemasi: bluz, taktlar yonib boradi; pentatonikadagi iboraga javob kuylanadi.',
  'lx.play6.p': ul('Oʻz qoʻshigʻi: shakl (kuplet, naqarot) → kuy → akkordlar.', 'Metronom ostida toʻxtamasdan boshidan oxirigacha chalinadi — xatolar tuzatilmaydi, chalish davom etadi.', 'Yozib olinadi va ilk darslar yozuvi bilan solishtiriladi.'),
  'lx.play6.g': ul('Oʻz qoʻshigʻi: shakl → akkordlar → zarb yoki terib chalish.', 'Metronom ostida toʻxtamasdan boshidan oxirigacha.', 'Yozib olinadi; almashtirish kechikadigan ikki joy topiladi va alohida mashq qilinadi.'),
  'lx.play6.b': ul('Oʻz qoʻshigʻi: shakl → asoslar → bas ritmi.', 'Metronom ostida yoki mediatekadagi yozuv bilan boshidan oxirigacha.', 'Yozib olinadi; bas barabanlar bilan mos tushishi (1 va 3 da) tekshiriladi.'),
  'lx.play6.t': '«Qoʻshiqlar»da qoʻshiq tanlanadi, shakli va akkordlari tahlil qilinadi, qiyin joy mediatekada A–B halqasi bilan takrorlanadi (balandlikni oʻzgartirmasdan sekinlashtirish).',

  'lx.sound1.p': 'Bitta nota sekin va baland, qisqa va uzun chalinadi: tovushning toʻrt xossasi. Soʻng oʻsha nota turli oktavalarda.',
  'lx.sound1.g': '1-torning 5-pardasidagi nota va 2-tordagi oʻsha balandlik (10-parda): tembr turlicha, balandlik bitta. Soʻng 12-pardada flajolet.',
  'lx.sound1.b': 'Bitta nota grif yonida va tirgak yonida: tembr oʻzgaradi. 12-, 7- va 5-pardalarda flajoletlar — ilk obertonlar.',
  'lx.sound1.t': 'Bobdagi «Obertonlar» sxemasi: qator tinglanadi; topshiriq boʻyicha interval kuylanadi.',
  'lx.sound2.p': 'Birinchi oktava do tovushidan ikkinchi oktava do tovushigacha barcha notalar aytiladi va chalinadi; soʻng oʻsha notalar kichik oktavada. Barcha oktavalarda «do» topiladi.',
  'lx.sound2.g': 'Birinchi pozitsiyada 1- va 2-torlardagi notalar: mi–fa–sol, si–do–re. Chalish paytida har bir nota ovoz chiqarib aytiladi.',
  'lx.sound2.b': 'E tordagi notalar: mi–fa–sol (0, 1, 3-pardalar), A torda: lya–si–do (0, 2, 3). Chalish paytida har biri aytiladi.',
  'lx.sound2.t': '«Nota yoʻlidagi nota» treningi: 10 savol.',
  'lx.sound3.p': 'Klaviaturada bas kaliti notalari topiladi: katta oktava sol – kichik oktava do – kichik oktava fa.',
  'lx.sound3.g': 'Gitara notalari yangrashidan oktava yuqori yoziladi: notalar boʻyicha grifda «birinchi oktava mi» topiladi (ochiq 1-tor).',
  'lx.sound3.b': 'Bas bas kalitida oʻqiydi, yozuvdan oktava past yangraydi: katta oktava lya (ochiq A) va kichik oktava sol (D torning 5-pardasi) topiladi.',
  'lx.sound3.t': 'Skripka va bas kalitlarida «Nota yoʻlidagi nota» treningi.',

  'lx.rhythm1.p': 'Metronom 70 ostida: do choraklar bilan, soʻng yarimtaliklar bilan, ovoz chiqarib «bir-va, ikki-va» sanab. Soʻng quyidagi naqsh urib chiqiladi.',
  'lx.rhythm1.g': 'Metronom 70 ostida: ochiq tor choraklar bilan (mediator bilan pastga), soʻng yarimtaliklar bilan.',
  'lx.rhythm1.b': 'Metronom 70 ostida: ochiq A choraklar bilan, barmoqlar navbat bilan; soʻng yarimtaliklar bilan.',
  'lx.rhythm1.t': 'Naqsh tegish bilan urib chiqiladi; soʻng metronom ostida qarsak bilan.',
  'lx.rhythm2.p': 'Pauzali va nuqtali naqsh — bitta notada, soʻng do–mi–sol da.',
  'lx.rhythm2.g': 'Ochiq tordagi naqsh: pauzada tor kaft bilan bosib oʻchiriladi.',
  'lx.rhythm2.b': 'Ochiq A dagi naqsh: pauzada tor chap qoʻl bilan bosib oʻchiriladi.',
  'lx.rhythm2.t': 'Naqsh tegish bilan urib chiqiladi; soʻng ritm boʻgʻinlari bilan oʻqiladi.',
  'lx.rhythm3.p': 'Oʻng qoʻl do–mi–sol da triollar, chap qoʻl (do) choraklariga qarshi.',
  'lx.rhythm3.g': 'Triollar: bir hissaga pastga-yuqoriga-pastga, sekin; soʻng punktir «nuqtali uzun – qisqa».',
  'lx.rhythm3.b': 'Bitta notada barmoqlar navbat bilan triollar; soʻng punktir.',
  'lx.rhythm3.t': 'Triolli naqsh tegish bilan urib chiqiladi.',
  'lx.rhythm4.p': 'Do major gammasi sakkizliklar bilan tekis, soʻng sving bilan (birinchi sakkizlik uzunroq).',
  'lx.rhythm4.g': 'Sakkizliklar bilan zarb tekis, soʻng sving bilan.',
  'lx.rhythm4.b': 'Asosda sakkizliklar tekis, soʻng sving bilan; aksent 2 va 4 da.',
  'lx.rhythm4.t': 'Bobdagi «Ritm toʻri» sxemasi: «tekis / sving» almashtiriladi va farq tinglanadi; sakkizliklar urib chiqiladi.',

  'lx.meter1.p': '4/4 dagi kuy: aksent «bir» da. Har hissaga akkord, kuchli hissada — balandroq.',
  'lx.meter1.g': 'Har hissaga pastga zarb, «bir» da — kuchliroq.',
  'lx.meter1.b': 'Har hissaga asos, «bir» da — kuchliroq.',
  'lx.meter1.t': 'Choraklar tegish bilan urib chiqiladi; metronom ostida toʻrtga takt koʻrsatiladi.',
  'lx.meter2.p': '3/4 dagi vals: chap qoʻl C va G7 da «bas – akkord – akkord».',
  'lx.meter2.g': 'Vals: bas «bir» da, akkord «ikki» va «uch» da; C va G da p-i-m terib chalish.',
  'lx.meter2.b': 'Vals: asos «bir» da, «ikki» va «uch» da — pauza yoki kvinta.',
  'lx.meter2.t': '3/4 dagi naqsh urib chiqiladi; «Metr» sxemasida 3/4 va 6/8 solishtiriladi.',
  'lx.meter3.p': 'Kuchli hissa oldidan «va» ga akkord — sinkopa; soʻng zataktli kuy.',
  'lx.meter3.g': 'Sinkopali zarb: pastga – pastga-yuqoriga – yuqoriga-pastga-yuqoriga («uch» da zarba tushirib qoldiriladi).',
  'lx.meter3.b': 'Almashish hissasi oldidan sakkizlik — yangi nota «bir» dan oldinroq.',
  'lx.meter3.t': 'Sinkopalar tegish bilan urib chiqiladi.',

  'lx.pitch1.p': 'Do dan xromatik: har bir klavish ketma-ket, oq va qora; har biri diyez va bemol bilan aytiladi.',
  'lx.pitch1.g': '1-torda 0 dan 5-pardagacha xromatik: bir parda — yarim ton.',
  'lx.pitch1.b': 'E torda 0 dan 5-pardagacha xromatik: bir parda — yarim ton.',
  'lx.pitch1.t': '«Oktavaning oʻn ikki tovushi» sxemasi — har bir klavish ikki nom bilan aytiladi.',
  'lx.pitch2.p': 'Mi–fa va si–do chalinadi: ular orasida qora klavishsiz yarim tonlar.',
  'lx.pitch2.g': 'Tyuner bilan solishtiriladi: 6-torning 5-pardasidagi lya va ochiq 5-tor — bitta balandlik.',
  'lx.pitch2.b': 'Tyuner bilan solishtiriladi: E torning 5-pardasi va ochiq A — bitta balandlik; 5-parda boʻyicha sozlash ham shunday.',
  'lx.pitch2.t': 'Tyuner ochiladi va lya kuylanadi; necha sentga farq qilishi koʻriladi.',

  'lx.mode1.p': 'Oʻng qoʻl bilan do major gammasi: 1-2-3 barmoqlar, 1-barmoq ostidan oʻtkaziladi, 1-2-3-4-5; chap qoʻl — 5-4-3-2-1, 3-barmoq ustidan oʻtkaziladi. Metronom 60 ostida yuqoriga va pastga.',
  'lx.mode1.g': 'Birinchi pozitsiyada 5-torning 3-pardasidan do major gammasi, yuqoriga va pastga; bir pardaga bir barmoq.',
  'lx.mode1.b': 'A torning 3-pardasidan do major gammasi: 2-4, 1-2-4, 1-3-4 barmoqlar (bitta pozitsiya).',
  'lx.mode1.t': 'Gamma tyuner bilan kuylanadi: tonikadan pogʻonalar.',
  'lx.mode2.p': 'Intilishlar: si → do, re → do, fa → mi; beqaror pogʻona va uning yechimi chalinadi.',
  'lx.mode2.g': '2- va 3-torlarda oʻsha yechimlar; soʻng gammaning ikki tetraxordi — pastki va yuqori — bir xil barmoq chizmasi bilan.',
  'lx.mode2.b': 'A va D torlarda yechimlar; ikki tetraxordli gamma: qoʻshni torlarda bir xil barmoq chizmasi.',
  'lx.mode2.t': 'Uchtovush ustida pogʻonalar kuylanadi — tyuner tekshiradi.',
  'lx.mode3.p': 'Lya minor: tabiiy, soʻng garmonik (sol-diyez), soʻng yuqoriga melodik.',
  'lx.mode3.g': 'Birinchi pozitsiyada ochiq 5-tordan lya minor; soʻng sol-diyez bilan.',
  'lx.mode3.b': 'Ochiq A dan lya minor; soʻng sol-diyez bilan.',
  'lx.mode3.t': '«Minor: uch turi» sxemasi — uchalasi tinglanadi; sol-diyez kirish tovushi → lya kuylanadi.',

  'lx.keys1.p': 'Fa-diyezli sol major gammasi: oʻng qoʻl — do majordagi kabi, 4-barmoq fa-diyezda.',
  'lx.keys1.g': '6-torning 3-pardasidan sol major gammasi.',
  'lx.keys1.b': 'E torning 3-pardasidan sol major gammasi.',
  'lx.keys1.t': '«Tonallik belgilari» treningi.',
  'lx.keys2.p': 'Kvinta doirasi boʻyicha tonikalar: do – sol – re – lya, har biri — tonika uchtovushi bilan.',
  'lx.keys2.g': 'Doira boʻyicha akkordlar: C – G – D – A – E; soʻng orqaga: E – A – D – G – C.',
  'lx.keys2.b': 'Kvintalar doirasi boʻyicha pastga asoslar: C – F – B♭ – E♭ (E va A torlarda).',
  'lx.keys2.t': '«Nazariya»: kvinta doirasi — parallel minor va qardosh tonalliklar topiladi.',
  'lx.keys3.p': '«Motiv, ibora, period» darsidagi kuy sol dan va fa dan chalinadi.',
  'lx.keys3.g': 'Oʻsha qoʻshiq 2-pardadagi kapo bilan chalinadi — tonallik qanday boʻldi?',
  'lx.keys3.b': 'Oʻsha chiziq boshqa tordan (kvarta yuqori) chalinadi.',
  'lx.keys3.t': '«Tovush pogʻona sifatida» treningi; «Nazariya»da transpozitsiya.',

  'lx.melody1.p': '«Shodlik qasidasi» kuyi (Betxoven, ommaviy mulk) oʻng qoʻl bilan; undagi iboralar va kadensiya topiladi.',
  'lx.melody1.g': '2- va 3-torlarda «Shodlik qasidasi»; iboralar qayerda tugaydi?',
  'lx.melody1.b': 'Pastki registrda «Shodlik qasidasi»: D torning 2-pardasidagi mi dan.',
  'lx.melody1.t': '«Period» sxemasi — savol va javob topiladi.',
  'lx.melody2.p': 'Sekvensiya: do–re–mi motivi re dan va mi dan takrorlanadi.',
  'lx.melody2.g': 'Bitta torda sekvensiya — motiv pardalar boʻylab suriladi.',
  'lx.melody2.b': 'Torlar boʻylab sekvensiya: qoʻshni torda oʻsha barmoq chizmasi.',
  'lx.melody2.t': '«Sekvensiya» sxemasi — tinglanadi va motiv ovoz bilan davom ettiriladi.',

  'lx.perform1.p': 'Gamma 60 va 120 tempda chalinadi; soʻng sekin (p) va baland (f), soʻng kreshendo.',
  'lx.perform1.g': 'Metronom 60 va 120 ostida akkordlar; zarb sekin va baland.',
  'lx.perform1.b': '60 va 120 tempda asoslar; barmoqlar navbat bilan tekis kuchda.',
  'lx.perform1.t': '«Temp» sxemasi — belgi yangrashidan topiladi.',
  'lx.perform2.p': 'Bitta gammada legato va stakkato; do–re treli.',
  'lx.perform2.g': 'Legato (hammer-on va pull-off) va stakkato (oʻchirish); bitta notada vibrato.',
  'lx.perform2.b': 'Asoslarda stakkato va legato; notaga slayd.',
  'lx.perform2.t': '«Shtrixlar» sxemasi — farq eshitiladi.',

  'lx.iv1.p': 'Do dan oktavagacha barcha intervallar yuqoriga chalinadi, har biri nomlanadi.',
  'lx.iv1.g': 'Bitta tordagi (parda = yarim ton) va qoʻshni torlardagi intervallar (kvarta — qoʻshni torning oʻsha pardasi).',
  'lx.iv1.b': 'Kvinta, kvarta va oktava — barmoq ostidagi shakllar (qoʻshni tor, bir tor oralab).',
  'lx.iv1.t': '«Interval notalar boʻyicha» va «Interval eshitib» treninglari; interval kuylanadi.',
  'lx.iv2.t': '«Interval aylanmasi» va «Interval qurish» treninglari.',
  'lx.iv3.t': '«Interval eshitib» treningi: tanish kuylar boshlanishi boʻyicha.',
  'lx.iv4.t': '«Laddagi intervallar» sxemasi; «Interval qurish» treningi.',

  'lx.chords1.p': 'Oʻng qoʻl bilan C, F, G, Am uchtovushlari; major va minor — tersiyada farq (mi – mi-bemol).',
  'lx.chords1.g': 'A, D, E, Am, Em: A va Am solishtiriladi — bitta nota (tersiya) oʻzgaradi.',
  'lx.chords1.b': 'Uchtovushlar arpedjiosi: C va Am da asos – tersiya – kvinta.',
  'lx.chords1.t': '«Uchtovush eshitib» treningi.',
  'lx.chords2.p': 'C uch koʻrinishda: do–mi–sol, mi–sol–do, sol–do–mi; soʻng C – F/C – G/B – C.',
  'lx.chords2.g': 'C va Am orasida G/B akkordi (basda si).',
  'lx.chords2.b': 'Basda tersiya: C ostida mi chalinadi — C/E shunday yangraydi.',
  'lx.chords2.t': '«Aylanma eshitib» treningi.',
  'lx.chords3.t': '«Septakkord eshitib» va «Akkord notalari» treninglari.',
  'lx.chords4.t': '«Septakkord eshitib» treningi; «Sus» sxemasi — yechim tinglanadi.',

  'lx.scales1.p': 'Re doriy: oq klavishlarda re dan gamma; xarakterli pogʻona (si) topiladi.',
  'lx.scales1.g': '5-torning 5-pardasidan re doriy.',
  'lx.scales1.b': 'A torning 5-pardasidan re doriy.',
  'lx.scales1.t': '«Akkordga gamma» treningi.',
  'lx.scales2.t': '«Akkordga gamma» treningi.',
  'lx.scales3.p': 'Lya melodik minor yuqoriga (fa-diyez, sol-diyez).',
  'lx.scales3.g': '5-pardadan pozitsiyada lya melodik minor.',
  'lx.scales3.b': 'Ochiq A dan lya melodik minor.',
  'lx.scales3.t': '«Alteratsiyalanganmi yoki kamaytirilganmi?» sxemasi — ikkala rang tinglanadi.',
  'lx.scales4.p': 'A7 akkordi ustida lya bluz gammasi.',
  'lx.scales4.g': 'Birinchi qutichada lya bluz gammasi (mi-bemol qoʻshiladi).',
  'lx.scales4.b': 'Lya bluz gammasi bas riffi sifatida.',

  'lx.key1.p': 'C – F – G – C: T – S – D – T; aylanmalarda, qoʻl deyarli qimirlamaydi.',
  'lx.key1.g': 'G – C – D – G: T – S – D – T; choraklar bilan zarb.',
  'lx.key1.b': 'Do majorda T – S – D – T asoslari: C – F – G – C.',
  'lx.key1.t': '«Akkord funksiyasi» va «Akkord pogʻonasi» treninglari.',
  'lx.key2.p': 'Lya minor: Am – Dm – E – Am (dominanta major — sol-diyez bilan).',
  'lx.key2.g': 'Am – Dm – E – Am; soʻng E oʻrniga E7.',
  'lx.key2.b': 'A – D – E – A asoslari; E da chiziqda sol-diyez.',
  'lx.key2.t': 'Bob sxemasida mukammal va yarim kadensiya tinglanadi.',
};

export const TERMS = {
  chordchange: ['Bir daqiqada almashtirish', 'mashq: bir daqiqada ikki akkord necha marta toza almashtirilgani sanaladi; son yozib qoʻyiladi va bir haftadan keyin solishtiriladi.', 'play'],
  shuffle: ['Shaffl', 'bluz akkompanementi naqshi: asosdan kvinta va seksta navbat bilan, sving bilan sakkizliklar.', 'play'],
};

export const CH = [
{ id: 'play', t: 'Cholgʻuda chalish', s: 'Oʻtirish va sozlash, akkordlar, akkompanement, bas, bluz, butun qoʻshiq', src: '', h: `
<p>Nazariya faqat qoʻlda jonlanadi. Bob pianino, gitara va basda birinchi kundan kerak boʻladigan narsalarni jamlaydi: qanday oʻtirish va sozlash, akkordlarni qanday qoʻyish va ularni pauzasiz almashtirish, qoʻshiqqa qanday akkompanement qilish, basni qanday yuritish va bluzni qanday chalish. Dars mashqlari tanlangan cholgʻu uchun; almashtirgich — mashqlar boshida.</p>
<h3>Oʻtirish va qoʻllar</h3>
<p>Qulay oʻtirish — chiroy uchun emas, tezlik va qoʻllar sogʻligʻi uchun. Pianinoda tirsaklar klavishlardan biroz yuqori, kaft dumaloq, barmoqlar yostiqchalarida turadi; gitara va basda grif biroz yuqoriga, yelkalar erkin, chap qoʻlning bosh barmogʻi — grif ortida. Biror joy tarang boʻlsa, toʻxtab qoʻlni silkitib olish kerak: taranglik oʻz-oʻzidan ketmaydi.</p>
<h3>Sozlash va ilk tovushlar</h3>
<p>Gitara va bas har bir mashgʻulot oldidan tyuner boʻyicha sozlanadi: torlar choʻziladi va sozdan chiqadi. Pianinoni sozlovchi usta sozlaydi, raqamli pianino esa sozdan chiqmaydi. Ilk tovushlar — tekis va toza: torlarda tor barmoq uchi bilan pardaning darhol orqasida bosiladi, klavishlarda barmoq kuchi bilan emas, qoʻl ogʻirligi bilan chalinadi.</p>
${tip('Ilova tyuneri ogʻishni sentlarda koʻrsatadi. Torni pastdan yuqoriga tortib sozlash yaxshiroq: shunda u sozni uzoqroq ushlaydi.')}
<h3>Akkordlar va almashtirish</h3>
<p>Ilk akkordlar juft-juft, qoʻl qulayligiga qarab oʻrganiladi. Pianinoda — do, fa va sol major (C, F, G), soʻng lya minor. Gitarada — A va D, soʻng E, keyin minor Am, Em, Dm va nihoyat G va C. Basda akkord — bu uning asosi va kvintasi. Asosiy qiyinchilik akkordda emas, almashtirishda: barmoqlar bittalab emas, hammasi birdaniga qoʻyiladi, almashtirish esa alohida — [[chordchange|bir daqiqada almashtirish]] bilan oʻrganiladi.</p>
${key('Oʻsish oddiy oʻlchanadi: bir daqiqadagi toza almashtirishlar soni va qoʻshiq toʻxtamasdan ketadigan temp. Bir haftadan keyin — solishtiriladi.')}
<h3>Akkompanement: I – IV – V</h3>
<p>Uchta akkord — tonika, subdominanta va dominanta — minglab qoʻshiqlarni ushlab turadi. Do majorda bular C, F va G, sol majorda — G, C va D. Akkompanement — bu ritm: pianinoda «bas — akkord», gitarada zarb yoki terib chalish, basda kuchli hissalarga asos. Avval — taktga bitta akkord, metronom ostida tekis; qoʻshiqni toʻxtamasdan boshidan oxirigacha chalish chiroyli, lekin uzuq-yuluq ritmdan muhimroq.</p>
<h3>Bas va ovoz yurishi</h3>
<p>Umumiy tovush joyida qolsa, qolganlari esa eng yaqinlariga borsa, akkordlar silliq ulanadi: buning uchun aylanmalar olinadi (G oʻrniga G/B). Bas ham sakramasdan, yurish bilan borishi mumkin — do, si, lya, fa, sol. Basist akkordlarni oʻtkinchi notalar bilan bogʻlaydi: taktning oxirgi hissasida — keyingi asosdan yarim ton yoki ton narida turgan nota.</p>
<h3>Bluz va pentatonika</h3>
<p>Oʻn ikki taktli bluz — birga chalishga eng qisqa yoʻl: uchta akkord (I7, IV7, V7) va hamma biladigan shakl. Akkompanement — [[shuffle|shaffl]]: asosdan kvinta va seksta navbat bilan. Bluz ustida tonallikning minor pentatonikasi yangraydi — xato qilish deyarli mumkin boʻlmagan besh tovush. Ilk improvizatsiya — savol va javob: qisqa ibora va unga javob, pauzalar bilan.</p>
<h3>Butun qoʻshiq</h3>
<p>Qoʻshiq «shakl → kuy → akkordlar» tartibida oʻrganiladi: avval qismlar (kuplet, naqarot, kirish) tushuniladi, soʻng kuy, soʻng garmoniya va ritm. Metronom ostida yoki yozuv bilan xatolarda toʻxtamasdan boshidan oxirigacha chalinadi: toʻxtash — tashlab yuborish qiyin boʻlgan odat. Oʻzini yozib olib, ertasi kuni tinglash kerak — shunda chalish paytida eshitilmagan narsa eshitiladi.</p>
${tip('Ilovada: qoʻshiq — «Qoʻshiqlar»da akkordlar va transpozitsiya bilan, yozuv — mediatekada, balandlikni oʻzgartirmasdan sekinlashtirish va A–B halqasi — pleyerda, oʻzini yozib olish — istalgan asbobdagi yozuv tugmasi bilan.')}
` },
];
