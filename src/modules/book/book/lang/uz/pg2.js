// «Гитара с нуля»: новый порядок и уроки (слово автора 25.11.2026): сначала устройство и посадка, потом схема аккорда, ритм, минор, бой, гармония, песни,
// гаммы (мажор, минор, хроматика), слух, ступени, септаккорды. Переопределяет и дополняет pg.js (одинаковые id — берутся отсюда).
const tip = (t) => '<aside class="btip"><b>Sinab ko‘ring</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Esda tuting</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  "ls.g2": "Gitara tuzilishi",
  "lx.g2.g": ul("Sxemadagi torlarga tegish: 6-si past, 1-si baland; raqam va tovushni aytish.", "Modelni aylantirib, qismlarga ajratish; har bir qismga tegib, nima qilishini o‘qish."),
  "lx.g2.t": "O‘z gitarangizda 1- va 6-torni, porogni, 1-ladni va kolkalarni ko‘rsatish.",
  "lx.g2.easy": "Ikki ibora: «torlar ingichkadan» va «ladlar boshchadan».",
  "lx.g2.fix": "Torlar adashtiryaptimi? Sxemada 6-tor tepada va eng yo‘g‘on; gitarada tegib ko‘ring, sezilarli farq qiladi.",
  "ls.g1": "O‘tirish",
  "lx.g1.g": ul("O‘tirib, chap oyoq ostiga tagoyoq qo‘yish, gitarani chap songa yotqizish.", "Tekshirish: yelkalar pastda, bo‘yin erkin, bilaklar bukilmagan, nafas tekis."),
  "lx.g1.t": "Gitara bilan ikki daqiqa o‘tirib, gritni qo‘l bilan bir marta ham to‘g‘rilamaslik.",
  "lx.g1.easy": "Gitarasiz boshlash: o‘tirish, oyoqni qo‘yish va keyin asbobni olish.",
  "lx.g1.fix": "Bo‘yin qotyaptimi — gitara juda past, tagoyoqni ko‘taring. Bilak og‘riyaptimi — grit juda tekis, uni baland ko‘taring.",
  "ls.g32": "Puls va o‘lchov",
  "lx.g32.g": ul("Metronom 60: har zarbaga qarsak chalib, ovoz chiqarib to‘rtgacha sanash.", "Faqat «bir» da qarsak chalib, bir necha o‘lchov adashmaslik."),
  "lx.g32.t": "Metronom bilan bir daqiqa tekis «bir-ikki-uch-to‘rt» sanoqni saqlash.",
  "lx.g32.easy": "Daqiqasiga 50 zarbadan boshlash — sekin pulsni eshitish osonroq.",
  "lx.g32.fix": "Oldinga o‘tib yoki orqada qolyapsizmi? Qo‘lga emas, chiqillashga quloq solib, unga «tushish» kerak.",
  "ls.g5": "Akkord sxemasi va dastlabki uchta akkord",
  "lx.g5.g": ul("C: 1-2-3 barmoqlar zinapoyasimon, beshta ingichka torni chalish (6-torga tegmaslik).", "D: uch barmoq yonma-yon, to‘rtta ingichka tor. E: 1-2-3 barmoqlar, oltita torni chalish."),
  "lx.g5.t": "C, D va E ni navbat bilan qo‘yib, qaysi torlar jim ekanini ovoz chiqarib aytish.",
  "lx.g5.easy": "Bitta akkorddan boshlash: C — toza jaranglagandan keyingina D ga o‘tish.",
  "lx.g5.fix": "Tor o‘chiq — barmoq qo‘shni torga tegyapti: uchi bilan va tikroq bosing. Vizillayapti — barmoqni lad chizig‘iga yaqinroq qo‘ying.",
  "ls.g7": "G va A akkordlari",
  "lx.g7.g": ul("G: 2-barmoq 6-torning 3-ladida, 1-barmoq 5-torning 2-ladida, 3-barmoq 1-torning 3-ladida; oltita torni chalish.", "A: 1-2-3 barmoqlar 4, 3 va 2-torlarning ikkinchi ladida qatorda; 6-torni chalmaslik."),
  "lx.g7.t": "C → G ni to‘xtamay to‘rt marta almashtirish.",
  "lx.g7.easy": "Almashtirish silliq bo‘lguncha faqat ikki akkord bilan ishlash.",
  "lx.g7.fix": "Almashtirish qotib qolsa — undan oldin yangi sxemaga qarab, butun shaklni ko‘ring.",
  "ls.g23": "F akkordi: yengillashtirilgan",
  "lx.g23.g": ul("Ko‘rsatkich 1- va 2-torlarning 1-ladida yonboshlab yotadi; 2-barmoq — 3-tor, 2-lad; 3-barmoq — 4-tor, 3-lad.", "To‘rtta ingichka tor (4-dan 1-gacha) chalinadi, yo‘g‘onlariga tegilmaydi."),
  "lx.g23.t": "C → F → C ni metronom 60 da har biriga to‘rt sanoq bilan almashtirish.",
  "lx.g23.easy": "Avval faqat ko‘rsatkichni ikki ingichka torga qo‘yib, toza jaranglashini tinglash.",
  "lx.g23.fix": "Tovush o‘chiq — ko‘rsatkichni lad chizig‘iga yaqinlashtirib, barmoqni qirrasiga biroz buring.",
  "ls.g33": "Barcha major akkordlar bitta ekranda",
  "lx.g33.g": ul("C D E G A F ni ketma-ket, har biriga to‘rt sanoq, metronom 60 da chalish.", "Eng qiyin almashtirishni tanlab, o‘n marta takrorlash."),
  "lx.g33.t": "Butun doirani to‘xtamay ikki marta chalish.",
  "lx.g33.easy": "Uchtadan chalish: avval C D E, keyin G A F.",
  "lx.g33.fix": "Almashtirishda adashsangiz — metronomni 50 ga sekinlashtirib, barmoqni oldindan tayyorlang.",
  "ls.g13": "Pastga zarba va cho‘zilishlar",
  "lx.g13.g": ul("Har zarbada pastga urish, o‘lchovda to‘rtta, metronom 60–70.", "Shu akkord: butun (bir), yarimlar (bir-uch), choraklar (bir-ikki-uch-to‘rt)."),
  "lx.g13.t": "Butun, yarim va choraklarni to‘rt o‘lchovdan to‘xtamay chalish.",
  "lx.g13.easy": "Butunlardan boshlash: o‘lchovda bitta zarba va ichda sanash.",
  "lx.g13.fix": "Zarba chiqillashga tushmasa — sekinroq chalib, bilakka qarash: qo‘l erkin «tushadi».",
  "ls.g9": "Birinchi qo‘shiq",
  "lx.g9.g": ul("Har akkordga to‘rtta pastga zarba, metronom 60.", "Doirani to‘xtamay uch marta chalish."),
  "lx.g9.t": "O‘zingizni yozib, almashtirish kechikkan joyni topish.",
  "lx.g9.easy": "Akkordga ikki zarbadan chalib, asta tezlashtirish.",
  "lx.g9.fix": "Almashtirishda kechiksangiz — yangi akkord barmoqlarini birin-ketin qo‘ying, porogga yaqinidan boshlab.",
  "ls.g10": "Minor: Am, Em va Dm",
  "lx.g10.g": ul("Am: 1-barmoq 2-torning 1-ladida, 2- va 3-barmoq 4- va 3-torlarning 2-ladida; 6-torni chalmaslik.", "Em: 2- va 3-barmoq 5- va 4-torlarning 2-ladida; oltita tor. Dm: 1-2-3 barmoq, to‘rtta ingichka tor."),
  "lx.g10.t": "Quloq bilan ketma-ket besh juftlikda «major yoki minor» ni topish.",
  "lx.g10.easy": "Avval Em ni o‘rganish — eng oson, keyin Am, so‘ng Dm.",
  "lx.g10.fix": "Minor major kabi jaranglasa — ortiqcha tor yo‘qligini tekshiring: Am va Dm da 6-tor chalinmaydi.",
  "ls.g24": "To‘liq barre: F va Bm",
  "lx.g24.g": ul("F: 1-ladda barre; 2-barmoq — 3-tor, 2-lad; 3- va 4-barmoq — 5- va 4-tor, 3-lad.", "Bm: 2-ladda barre; qolgan barmoqlar sxemada; beshta tor chalinadi."),
  "lx.g24.t": "Barreni qo‘yib, urinishlar orasida dam olib, uch daqiqa ushlash.",
  "lx.g24.easy": "Faqat barreni, qolgan barmoqlarsiz, urinishiga 10 soniyadan mashq qilish.",
  "lx.g24.fix": "Qo‘l charchasa — urinishlar orasida dam oling, kuchliroq bosmang; barre haftalab o‘sadi.",
  "ls.g34": "Yana minor: F#m, Fm va Bb",
  "lx.g34.g": ul("Fm: 1-ladda barre, qolgan barmoqlar sxemada; F#m — shu 2-ladda.", "Bb: 1-ladda barre, 2-, 3- va 4-barmoq 3-ladda."),
  "lx.g34.t": "F, Fm, F#m ni ketma-ket chalib, farqni eshitish.",
  "lx.g34.easy": "Bitta akkordni olib, tovush toza bo‘lguncha ushlash.",
  "lx.g34.fix": "Surishda barre sirpansa — avval ko‘rsatkichni qo‘yib, keyin qolgan barmoqlarni.",
  "ls.g35": "Barcha akkordlar xaritasi",
  "lx.g35.g": ul("Barcha majorlarni, keyin barcha minorlarni to‘rt sanoqdan chalish.", "Major va minorni almashtirish: C – Am – D – Bm – E – F#m."),
  "lx.g35.t": "Butun doirani to‘xtamay chalish, unutilgan akkordni xaritadan topib.",
  "lx.g35.easy": "To‘rtta akkorddan olib, birin-ketin qo‘shish.",
  "lx.g35.fix": "Shaklni unutdingizmi — xaritani ochib, sxemani o‘qing va barmoqlarni sekin qo‘ying.",
  "ls.g36": "Sakkizdan bir: zarbani ikkiga bo‘lish",
  "lx.g36.g": ul("Metronom 60: sakkizdan birlarni «bir-va-ikki-va-uch-va-to‘rt-va» deb sanab qarsak chalish.", "Faqat «va» ga qarsak chalib, adashmaslik."),
  "lx.g36.t": "Bitta akkordni sakkizdan birlarda (pastga-yuqoriga) to‘rt o‘lchov ketma-ket chalish.",
  "lx.g36.easy": "Qo‘l jim turganda ovoz chiqarib sanash, keyin qarsakni qo‘shish.",
  "lx.g36.fix": "«Va» siljisa — sekin sanash: metronom 50, har «va» chiqillashlar o‘rtasida.",
  "ls.g14": "«Sakkizlik» jangi",
  "lx.g14.g": ul("Metronom 70: ↓ ↓↑ ↑↓↑ naqshi bitta akkordda, to‘rt o‘lchov.", "Akkordni har o‘lchovda almashtirish: Am – C – G – Em."),
  "lx.g14.t": "«Sakkizlik»ni sakkiz o‘lchov to‘xtamay va sanoqdan adashmay chalish.",
  "lx.g14.easy": "Avval havoda urib, ovoz chiqarib sanash, keyin torlarda.",
  "lx.g14.fix": "Naqsh buzilsa — 50 ga sekinlashtirib «bir-va-ikki-va» sanog‘ini qaytaring; qo‘l to‘xtamasligi kerak.",
  "ls.g15": "Barcha akkordlar bilan jang",
  "lx.g15.g": ul("Am – Em – Am – Dm, akkordga bir o‘lchov, «sakkizlik» bilan.", "C – G – Am – F, keyin D – A – Bm – G."),
  "lx.g15.t": "Ikki to‘rt akkordli ketma-ketlikni qo‘lni to‘xtatmay chalish.",
  "lx.g15.easy": "Avval o‘tkazmasdan sakkizdan birlarni pastga-yuqoriga, keyin o‘tkazmalarni qo‘shish.",
  "lx.g15.fix": "Almashtirishda jang buzilsa — metronomni sekinlashtirib, almashtirishga bitta «va» ajrating.",
  "ls.g19": "Birinchi garmoniya: C – Am – F – G",
  "lx.g19.g": ul("Metronom 60: C – Am – F – G, akkordga bir o‘lchov, choraklar pastga.", "Shuning o‘zi «sakkizlik» bilan; G da to‘xtab, keyin C ga qaytish."),
  "lx.g19.t": "Ketma-ketlikni to‘xtamay to‘rt doira chalish.",
  "lx.g19.easy": "Ikkitadan chalish: C – Am, keyin F – G.",
  "lx.g19.fix": "F ga o‘tish qolganlaridan qiyinroq — 8-darsdagi yengil F ga qayting yoki barreni alohida mashq qiling.",
  "ls.g20": "Shu garmoniya boshqa tonallikda",
  "lx.g20.g": ul("G – Em – C – D, akkordga bir o‘lchov, «sakkizlik» bilan, metronom 70.", "Ikki tonallikni almashtirish: C – Am – F – G va G – Em – C – D."),
  "lx.g20.t": "Ikkala ketma-ketlikni qo‘lni to‘xtatmay ketma-ket chalish.",
  "lx.g20.easy": "Choraklardan boshlab, keyin «sakkizlik»ka o‘tish.",
  "lx.g20.fix": "Akkordlar adashsa — raqamlar bo‘yicha o‘qing: «birinchi, oltinchi, to‘rtinchi, beshinchi».",
  "ls.g37": "Qo‘shiq: «Oh! Susanna»",
  "lx.g37.g": ul("Metronom 80: C – C – G – G – C – C – G – C, akkordga bir o‘lchov, «sakkizlik».", "Doirani uch marta takrorlab, o‘zini yozib olish."),
  "lx.g37.t": "Qo‘shiqni to‘liq to‘xtamay chalib, yozuvni tinglash.",
  "lx.g37.easy": "Avval choraklarda, keyin «sakkizlik»da chalish.",
  "lx.g37.fix": "C → G almashtirishi adashtirsa — uni metronom 60 da alohida mashq qiling.",
  "ls.g38": "Qo‘shiq: «Skarbor yarmarkasi»",
  "lx.g38.g": ul("Metronom 70: Am – G – Am – C – D – Am, har biriga bir o‘lchov, yumshoq jang.", "Doirani ikki marta: balandroq va pastroq; yozuvni tinglash."),
  "lx.g38.t": "Qo‘shiqni yumshoq, to‘xtamay chalib, yozib olish.",
  "lx.g38.easy": "Choraklarda pastga, keyin «sakkizlik».",
  "lx.g38.fix": "Tovush juda o‘tkir — tirnoq va barmoq uchi bilan urib, tebranishni kichraytiring.",
  "ls.g39": "Qo‘shiq: «Chiqayotgan quyosh uyi»",
  "lx.g39.g": ul("Metronom 60: Am – C – D – F – Am – C – E – E, har biriga bir o‘lchov.", "Doirani uch marta chalib, eng notekis almashtirishlarni belgilash."),
  "lx.g39.t": "Qo‘shiqni F da to‘xtamasdan to‘liq chalish.",
  "lx.g39.easy": "Barre mustahkamlanguncha yengil F ni ishlatish (8-dars).",
  "lx.g39.fix": "D → F almashtirishi kechiksa — ko‘rsatkichni oldindan 1-ladga qo‘ying.",
  "ls.g28": "Do major gammasi",
  "lx.g28.g": ul("Metronom 60: do majorni sxema bo‘yicha yuqoriga-pastga, sanoqqa bir nota.", "Pog‘onalarni ovoz chiqarib aytish; yarim tonlarni belgilash (3→4 va 7→8)."),
  "lx.g28.t": "Sxemaga qaramay gammani to‘rt marta xatosiz chalish.",
  "lx.g28.easy": "Sanoqqa ikki notadan, keyin bittadan chalish.",
  "lx.g28.fix": "Barmoqlar adashsa — ladlar bo‘yicha: har torda 0, 2, 3; keyingi torga o‘tishdan oldin barmoqni tayyorlang.",
  "ls.g40": "Sol major gammasi va qo‘shiq",
  "lx.g40.g": ul("Metronom 60: sol majorni sxema bo‘yicha yuqoriga-pastga.", "Pog‘onalar bo‘yicha kuy 1 1 5 5 6 6 5, avval do majorda, so‘ng sol majorda."),
  "lx.g40.t": "Kuyni ikki tonallikda yoddan chalish.",
  "lx.g40.easy": "Avval kuyni bitta torda chalish.",
  "lx.g40.fix": "Fa-diyez jaranglamasa — barmoq 1-torning 2-ladida turganini tekshiring, 1-ladda emas.",
  "ls.g41": "Major va minor yonma-yon",
  "lx.g41.g": ul("Do major gammasini, keyin lya minorni chalish; tovushda nimasi bilan farq qilishini aytish.", "Quloq bilan uch juftlikda «major yoki minor» ni topish (pastdagi test)."),
  "lx.g41.t": "So‘z bilan tushuntirish: do major do minordan nimasi bilan farq qiladi.",
  "lx.g41.easy": "Faqat dastlabki uch notani tinglash — major yoki minor.",
  "lx.g41.fix": "Farq eshitilmasa — C va Cm akkordlarini ketma-ket chalib, «yorqin — yumshoq» ni solishtiring.",
  "ls.g42": "Gammalardagi qo‘shiqlar",
  "lx.g42.g": ul("«Shodlik qo‘shig‘i»: 3 3 4 5 5 4 3 2 1 1 2 3 3 2 2 do majorda, metronom 70.", "Minor kuy: 1 3 5 5 4 3 2 1 lya minor gammasida."),
  "lx.g42.t": "«Shodlik qo‘shig‘i»ni qaramay chalish.",
  "lx.g42.easy": "Ikki-uch notadan chalib, keyin iboralarni birlashtirish.",
  "lx.g42.fix": "Pog‘onalar unutilsa — sxemaga raqamlarni yozib, shular bo‘yicha chaling.",
  "ls.g43": "Akkordlar nimadan iborat",
  "lx.g43.g": ul("C va Cm ni tinglash: o‘rta tovushdagi farqni topish.", "Gitarada A va Am ni chalish: qaysi barmoq yarim tonga «tushganini» ko‘rsatish."),
  "lx.g43.t": "C va Am ning uchta tovushini aytib, minor nimasi bilan farq qilishini tushuntirish.",
  "lx.g43.easy": "Qoidani eslab qolish: majorning o‘rtasi yarim ton baland.",
  "lx.g43.fix": "Farq eshitilmasa — faqat o‘rta tovushni (mi va mi-bemol) tinglang.",
  "ls.g44": "Sus2 va sus4 akkordlari",
  "lx.g44.g": ul("D – Dsus4 – D va A – Asus4 – A, akkordga bir o‘lchov.", "Dsus2 va Asus2: chalib, sus4 bilan solishtirish."),
  "lx.g44.t": "«Oh! Susanna» ni har ibora oxirida sus4 bilan chalish.",
  "lx.g44.easy": "A – Asus4 – A dan boshlash: faqat bitta barmoq o‘zgaradi.",
  "lx.g44.fix": "«Osilganlik» eshitilmasa — majorni, keyin susni chalib, quloq bilan solishtiring.",
  "ls.g45": "O‘n oltidan birlar",
  "lx.g45.g": ul("Metronom 50: o‘n oltidan birlarni «bir-e-va-a» deb sanab qarsak chalish.", "Bitta akkordni o‘n oltidan birlarda chalish (zarbaga pastga-yuqoriga-pastga-yuqoriga)."),
  "lx.g45.t": "To‘rt o‘lchovni o‘n oltidan birlarda to‘xtamay chalish.",
  "lx.g45.easy": "Sakkizdan birlardan boshlab, oraliq zarbalarni asta qo‘shish.",
  "lx.g45.fix": "Qo‘l zo‘riqsa — bilakni bo‘shashtiring: qo‘l yelkadan emas, bilakdan tebranadi.",
  "ls.g46": "Barre: Bb va B",
  "lx.g46.g": ul("Bb: 1-ladda barre, 2-, 3- va 4-barmoq 4-, 3- va 2-torning 3-ladida.", "Shaklni bir lad yuqoriga surib, B ni chalish."),
  "lx.g46.t": "Zanjirni chalish: Bb – B – C – Bb.",
  "lx.g46.easy": "Avval faqat barre va shaklni almashtirmay mashq qilish.",
  "lx.g46.fix": "Tovush o‘chiq — barreni ladga yaqinlashtirib, ishonchli bosing, lekin butun qo‘l kuchi bilan emas.",
  "ls.g47": "Gammalar: re minor va do minor",
  "lx.g47.g": ul("Metronom 60: re minorni sxema bo‘yicha yuqoriga-pastga.", "Do minorni yuqoriga-pastga; lya minor bilan solishtirish."),
  "lx.g47.t": "1 3 5 5 4 3 2 1 kuyini re minor va do minorda chalish.",
  "lx.g47.easy": "Sanoqqa ikki notadan, keyin bittadan chalish.",
  "lx.g47.fix": "Lad barmoqlari adashsa — har gammaning ladlarini yozib, ovoz chiqarib o‘qing.",
  "ls.g48": "Garmonik minor",
  "lx.g48.g": ul("Metronom 60: lya minor garmonik yuqoriga-pastga sxema bo‘yicha.", "E – Am ketma-ketligi: akkordlarni, keyin gammani chalish."),
  "lx.g48.t": "Lya minorning ikkala shaklini chalib, nimasi bilan farq qilishini aytish.",
  "lx.g48.easy": "Avval gammaning oxirgi to‘rt notasini chalish.",
  "lx.g48.fix": "Sol – sol-diyez – lya intervali quloqqa «chiqib turadi» — uni sekin va bir necha marta chaling.",
  "ls.g49": "Gammalar uyg‘unligi",
  "lx.g49.g": ul("Metronom 60: do major yuqoriga, lya minor pastga, xromatika yuqoriga.", "Sxemaga qaramay qaysi gamma jaranglayotganini ovoz chiqarib aytish."),
  "lx.g49.t": "Sxemaga qaramay uchta gammani ketma-ket chalish.",
  "lx.g49.easy": "Ikkita gammadan chalib, keyin uchinchisini qo‘shish.",
  "lx.g49.fix": "Tartib yo‘qolsa — qog‘ozga yozing: do major, lya minor, xromatika — va ro‘yxat bo‘ylab yuring.",
  "gp.nm.aria": "Gitara torlari: raqamlar va tovushlar; tegish — tovush",
  "gp.nm.str": "{n}-tor: {name}",
  "gp.nm.fret": "Ladlar porogdan sanaladi: 1-lad boshchaga eng yaqini.",
  "gp.nm.fing": "Chap qo‘l barmoqlari: 1 — ko‘rsatkich, 2 — o‘rta, 3 — nomsiz, 4 — jimjiloq.",
  "gp.nm.hint": "Torga tegib, tovushini eshiting.",
  "gp.bar.aria": "Teng qismlarga bo‘lingan o‘lchov",
  "gp.bar.1": "Butun",
  "gp.bar.2": "Yarimlar",
  "gp.bar.4": "Choraklar",
  "gp.bar.8": "Sakkizdan birlar",
  "gp.bar.16": "O‘n oltidan birlar",
  "gp.bar.1.d": "Butun o‘lchovga bitta tovush: to‘rt zarba.",
  "gp.bar.2.d": "O‘lchovda ikki tovush: har biri ikki zarba.",
  "gp.bar.4.d": "O‘lchovda to‘rt tovush: zarbaga bittadan.",
  "gp.bar.8.d": "O‘lchovda sakkiz tovush: «bir-va, ikki-va, uch-va, to‘rt-va».",
  "gp.bar.16.d": "O‘lchovda o‘n olti tovush: «bir-e-va-a, ikki-e-va-a…».",
  "gp.strum.metro": "Metronom",
  "gp.all.maj": "Major",
  "gp.all.min": "Minor",
  "gp.all.all": "Hammasi",
  "gp.all.hint": "Akkordni eshitish uchun sxemaga teging.",
  "gp.all.seq": "Ketma-ket chalish",
  "gp.fm.maj": "Major",
  "gp.fm.min": "Minor",
  "gp.fm.chrom": "Xromatika",
  "gp.fm.par": "Parallel",
  "gp.fm.t": "t",
  "gp.fm.s": "y",
  "gp.fm.hint.maj": "t — ton (ikki lad), y — yarim ton (bir lad). Major: t t y t t t y.",
  "gp.fm.hint.min": "«Lya» dan minor — o‘sha oq notalar, lekin formula t y t t y t t.",
  "gp.fm.hint.chrom": "Xromatik gamma — ketma-ket o‘n ikki tovush, faqat yarim tonlar.",
  "gp.fm.hint.par": "Bir xil notalar, boshqa markaz: do major va lya minor.",
  "gp.tr.4": "katta tersiya (4 y.t.)",
  "gp.tr.3": "kichik tersiya (3 y.t.)",
  "gp.tr.maj": "Major uchtovush",
  "gp.tr.maj.d": "Pastda katta tersiya, tepada kichik: yorqin jaranglaydi.",
  "gp.tr.min": "Minor uchtovush",
  "gp.tr.min.d": "Pastda kichik tersiya, tepada katta: yumshoq va g‘amgin jaranglaydi.",
  "gp.sc.dmin": "Re minor",
  "gp.sc.cmin": "Do minor",
  "gp.sc.aharm": "Lya garmonik",
  "gp.prog.cavg": "C Am F G",
  "gp.prog.gevd": "G Em C D",
  "gp.prog.amfc": "Am F C G",
};
export const TERMS = {};
export const CH = [
  { id: "g2", t: "Gitara tuzilishi", s: "Chalishdan oldin tanishib olish", src: '', h: `
<p>Birinchi akkorddan oldin gitaraga diqqat bilan qarash kerak: har bir qismning o‘z vazifasi bor, bu so‘zlar har darsda uchraydi. Modelni barmoq bilan aylantirib, qismlarga ajratish mumkin.</p>
{{lab:gmodel}}
<p><b>Torlar</b> ingichkadan yo‘g‘onga qarab raqamlanadi: 1-tor eng ingichka va baland, 6-tor eng yo‘g‘on va past. Ularning tovushlari: mi, si, sol, re, lya, mi (1-dan 6-gacha).</p>
{{lab:gnames}}
<p><b>Ladlar</b> — gritdagi metall chiziqlar, porogdan, ya’ni boshchadan sanaladi: boshchaga eng yaqini 1-lad. Chap qo‘l <b>barmoqlari</b>: 1 — ko‘rsatkich, 2 — o‘rta, 3 — nomsiz, 4 — jimjiloq; bosh barmoq gritning orqasida tayanch bo‘ladi.</p>
${key(`Torlar ingichkadan (1) yo‘g‘onga (6); ladlar porogdan (1, 2, 3…); chap qo‘l barmoqlari 1, 2, 3, 4. Kursning qolgan qismi shu raqamlarga tayanadi.`)}
${tip(`Sxemadagi har bir torga tegib, tovushini eshitish va raqami bilan nomini ovoz chiqarib aytish. So‘ng modelda porog, 1-lad va kolkalarni topish.`)}
` },
  { id: "g1", t: "O‘tirish", s: "Qulay, siqilishsiz", src: '', h: `
<p>O‘tirishning asosiy qoidasi — <b>qulaylik</b>. Hech yerda siqilish bo‘lmasligi kerak: yelka, bo‘yin, bilak, oyoqlarda. Biror joy charchasa yoki og‘risa, bu o‘tirishni to‘g‘rilash belgisi, chidash emas.</p>
{{lab:gpos}}
<p>Akustik va klassik gitarada qo‘ltiqsiz barqaror stulda, orqa tik, lekin zo‘riqmagan holda o‘tiriladi. Chap oyoq <b>tagoyoq</b>ga (past o‘rindiq yoki kitoblar to‘plami) qo‘yiladi: gitara chap sonda yotadi, grit biroz yuqoriga qaraydi. Elektrogitara odatda <b>tasma</b> bilan, tik turib yoki o‘tirib chalinadi.</p>
<p>O‘ng bilak korpusning yuqori chetida yotadi, kaft teshik ustida. Chap qo‘l gritni erkin ushlaydi: bosh barmoq orqada, yelka pastda, tirsak tanaga qisilmagan.</p>
${key(`Gitarani korpus, son va bilak ushlab turadi, qo‘l emas. Barmoq yoki yelka erta charchasa, o‘tirish noto‘g‘ri.`)}
${tip(`O‘tirib, oyoqni tagoyoqqa qo‘yib, gitarani yotqizish. Yelkalarni qimirlatish, qo‘llarni silkitish, chuqur nafas olish — hech yerda siqilish yo‘qligiga ishonch hosil qilish.`)}
` },
  { id: "g32", t: "Puls va o‘lchov", s: "Bir-ikki-uch-to‘rt", src: '', h: `
<p>Musiqa <b>puls</b>da yashaydi — qadamlar kabi tekis zarbalar. Pulsga tushish to‘g‘ri nota chalishdan muhimroq. Metronomni yoqib, u bilan birga qarsak chalish kifoya.</p>
{{lab:gbar}}
<p>Zarbalar to‘rttadan guruhlanadi: <b>bir</b>-ikki-uch-to‘rt. Bunday guruh — <b>o‘lchov</b>. Birinchi zarba qolganlaridan kuchliroq: u «tayanch». Ovoz chiqarib sanash: «bir, ikki, uch, to‘rt» — chalganda ham, eshitganda ham.</p>
${key(`Puls qadamlar kabi tekis. O‘lchov — to‘rt zarbali guruh, birinchisi eng kuchli.`)}
${tip(`Metronomni 60 ga qo‘yib, har bir chiqillashga qarsak chalish va «bir, ikki, uch, to‘rt» deb sanash. Keyin faqat «bir» da qarsak chalish.`)}
` },
  { id: "g5", t: "Akkord sxemasi va dastlabki uchta akkord", s: "C, D va E", src: '', h: `
<p>Akkordlar <b>sxema</b> bilan yoziladi: bu tik burilgan grit. Yo‘g‘on 6-tor chapda, ingichka 1-tor o‘ngda, yuqoridagi yo‘g‘on chiziq — porog.</p>
{{lab:gbox}}
<ul><li><b>Raqamli nuqta</b> — barmoqni qayerga qo‘yish; raqam — qaysi barmoq.</li><li><b>Tor ustidagi ○</b> — ochiq torni chalish.</li><li><b>Tor ustidagi ×</b> — bu torni chalmaslik: <b>hamma tor kerak emas</b>.</li></ul>
<p>Dastlabki uchta akkord: <b>C</b> («do major»), <b>D</b> («re major») va <b>E</b> («mi major»). C va D da barmoqlar yonma-yon, E da «zinapoya». Uchalasi ham yorqin va ochiq jaranglaydi — <b>major</b> shunday eshitiladi.</p>
${key(`Sxema yuqoridan pastga o‘qiladi: avval qaysi torlar chalinadi (○ va nuqtalar), keyin qaysi barmoq qayerga. «×» li torlar jim turadi.`)}
${tip(`Akkordni tanlab, «Tinglash» ni bosish va tovushni sxema bilan solishtirish. C ni qo‘yib, har bir torni alohida tortish — hammasi toza jaranglashi kerak.`)}
` },
  { id: "g7", t: "G va A akkordlari", s: "Yana ikkita major", src: '', h: `
<p><b>G</b> («sol major») kengroq jaranglaydi: oltita tor chalinadi, ikki barmoq yo‘g‘on torlarda, bittasi eng ingichkada. <b>A</b> («lya major») — ikkinchi ladda uch barmoq qatorda; 6-torga tegilmaydi.</p>
{{lab:gboxg}}
<p>Akkord nomi — harf: C — do, D — re, E — mi, F — fa, G — sol, A — lya, B — si. Harfni o‘qib, akkordning «egasi» tovushi ma’lum bo‘ladi.</p>
${key(`Harf — akkordning asosiy tovushi: C — «do», G — «sol», A — «lya». Hozircha faqat major.`)}
${tip(`C, keyin G ni chalish — metronom 60 da har biriga to‘rt sanoq; so‘ng D va A.`)}
` },
  { id: "g23", t: "F akkordi: yengillashtirilgan", s: "Ikki torda mini-barre", src: '', h: `
<p><b>F</b> («fa major») akkordi to‘liq ko‘rinishda qiyin: ko‘rsatkich barmoq oltita torni bosadi. Avval — <b>yengil</b> variant: to‘rtta ingichka tor chalinadi, ko‘rsatkich eng ingichka ikki torni 1-ladda bosadi — bu <b>mini-barre</b>.</p>
{{lab:gboxb}}
<p>Qolgan barmoqlar 3-torning 2-ladida va 4-, 5-torlarning 3-ladida turadi. 1-ladda ikki ingichka torni bitta ko‘rsatkich bosadi — yotiq, barmoqning yon tomoni bilan.</p>
${key(`Barre — bitta barmoq bir necha torni birdan bosishi. Ikki-uch tordan boshlanadi, to‘liq barre keyin, minor blokda keladi.`)}
${tip(`Yengil F ni qo‘yib, har bir torni tortish va ikkala ingichka tor jaranglashiga ishonch hosil qilish; so‘ng C → F ni almashtirish.`)}
` },
  { id: "g33", t: "Barcha major akkordlar bitta ekranda", s: "Xarita va almashtirishlar", src: '', h: `
<p>Oltita major akkord bitta xaritada yig‘ilgan. Uni ko‘z oldida ushlab, shu bo‘yicha o‘rganish mumkin: akkordni topish, sxemani o‘qish, qo‘yish, tovushni tekshirish.</p>
{{lab:gallmaj}}
<p>«Ketma-ket chalish» ni bosish — akkordlar birin-ketin jaranglaydi. Nomlarni birga aytish: «C, D, E, G, A, F» — shunda qo‘l shakli tovush bilan birga yodda qoladi.</p>
${key(`Xarita — ish quroli: ochib, sxemaga qarab, qo‘yish. Almashtirishlarni xotiradan emas, shu xarita bo‘yicha o‘rganish.`)}
${tip(`Oltitasini ketma-ket, har biriga to‘rt sanoq, metronom 60 da chalish. Eng qiyin almashtirishni belgilab, alohida takrorlash.`)}
` },
  { id: "g13", t: "Pastga zarba va cho‘zilishlar", s: "Chorak, yarim, butun", src: '', h: `
<p>O‘ng qo‘l akkordni har bir zarbada torlar bo‘ylab <b>pastga</b> urib chaladi. Bu <b>choraklar</b>: o‘lchovda to‘rt zarba, tempi 60–70.</p>
{{lab:gstrum}}
<p>Tovushlar turli uzunlikda bo‘ladi. <b>Chorak</b> — bir zarba. <b>Yarim</b> — ikki zarba, ikki barobar uzun. <b>Butun</b> — to‘rt zarba: tovush <b>butun o‘lchov</b> cho‘ziladi. O‘lchov sxemasida «Butun» va «Yarim» ni tanlab, farqni eshitish.</p>
{{lab:gbar}}
${key(`Butun nota butun o‘lchov, yarim nota yarim o‘lchov, chorak o‘lchovning choragi davom etadi. Metronom har chorakka chiqillaydi.`)}
${tip(`Metronom 70. C akkordini o‘lchovda bir marta (butun), ikki marta (yarimlar), to‘rt marta (choraklar) chalib, ovoz chiqarib sanash.`)}
` },
  { id: "g9", t: "Birinchi qo‘shiq", s: "Akkordlar va pastga zarbalar", src: '', h: `
<p>Birinchi qo‘shiqni chalish vaqti. «Avliyolar kirib kelganda» — xalq spirichuali — uchta akkordda chalinadi: C, G va D. Har akkordga to‘rtta pastga zarba, metronom 60.</p>
{{lab:gprog}}
<p>Akkordlar tartibi: C – G – C – G – D – G – C. Almashtirishdan oldin barmoqlar eski akkord hali jaranglab turganda yangisiga yo‘l oladi. O‘sishning halol o‘lchovi — daqiqada nechta toza almashtirish: sonni bugun yozib, bir haftadan keyin tekshirish.</p>
${key(`Toza va sekin — tez va xatolidan yaxshi. Tezlik o‘zi keladi.`)}
${tip(`C–G–C–G–D–G–C doirasini metronom 60 da chalib, o‘zini yozib olish — almashtirish qayerda kechikayotganini tinglash.`)}
` },
  { id: "g10", t: "Minor: Am, Em va Dm", s: "O‘sha lad, lekin g‘amginroq", src: '', h: `
<p><b>Minor</b> — majorning «g‘amgin» ukasi: o‘sha akkord, lekin o‘rtasi boshqa — tovush yumshoqroq va g‘amginroq. Nomida <b>m</b> harfi bor: Am «lya minor» deb o‘qiladi.</p>
{{lab:gboxm}}
<p>Uchta minor akkord: <b>Am</b> (E ga o‘xshash, ikki lad pastda), <b>Em</b> (atigi ikki barmoq) va <b>Dm</b> (D ning qarindoshi). Minorning major yonida qanday jaranglashini eshitish: A — Am, E — Em, D — Dm.</p>
${key(`Major — yorqin, minor — yumshoq va g‘amgin. Farqi — akkorddagi bitta tovush, lekin quloq buni darhol eshitadi.`)}
${tip(`Juftliklab o‘tish: A — Am, E — Em, D — Dm. Ko‘zni yumib, major yoki minor jaranglashini topish.`)}
` },
  { id: "g24", t: "To‘liq barre: F va Bm", s: "Ko‘rsatkich barcha torlarda", src: '', h: `
<p><b>To‘liq barre</b> minordan boshlanadi: ko‘rsatkich barmoq qirrasi bilan grit bo‘ylab yotib, barcha torni birdan bosadi. <b>F</b> (1-ladda barre) va <b>Bm</b> (2-ladda barre) shunday chalinadi.</p>
{{lab:gboxf}}
{{lab:gboxbm}}
<p>Barre butun qo‘l kuchini talab qilmaydi: richag — bilakning og‘irligi, barmoq esa lad chizig‘iga yaqin yotadi. Tovush o‘chiq bo‘lsa — barmoqni surib, qirrasiga biroz buring.</p>
${key(`Barre — kuch emas, joylashuv: barmoq qirrasi bilan, ladga yaqin, tirsak biroz yonga. Dastlab tovush biroz iflos bo‘ladi — bu normal.`)}
${tip(`1-ladda barreni qo‘yib, har bir torni tortish; o‘chiqlarini topib, barmoqni surish. So‘ng qolgan barmoqlarni qo‘shib F ni chalish.`)}
` },
  { id: "g34", t: "Yana minor: F#m, Fm va Bb", s: "Boshqa joylarda barre", src: '', h: `
<p>Bir xil barre shakli gritda siljitilsa, yangi akkordlar beradi. <b>Fm</b> («fa minor») — 1-ladda barre, <b>F#m</b> («fa-diyez minor») — shu 2-ladda. <b>Bb</b> («si-bemol major») — 1-ladda «A» shaklidagi barre.</p>
{{lab:gall}}
<p>Bunday akkordlarni o‘rganish uchun bitta shakl yetarli: gritda bir lad yuqoriga surilsa, akkord yarim tonga ko‘tariladi.</p>
${key(`Barre shakli gritda «ko‘chadi»: qo‘shni ladda xuddi shu naqsh — yarim ton baland akkord.`)}
${tip(`Fm ni chalib, shaklni bir lad yuqoriga surish — F#m chiqadi; farqni eshitish.`)}
` },
  { id: "g35", t: "Barcha akkordlar xaritasi", s: "Major va minor yonma-yon", src: '', h: `
<p>Endi oltita major va oltita minor akkord ma’lum. Hammasi bitta xaritada yig‘ilgan — major va minor yonma-yon, bitta ekranda.</p>
{{lab:gall}}
<p>«Ketma-ket chalish» ni bosib, tartib bilan tinglash. Keyin akkordlarni o‘zi chalib chiqish: sxemani topish, qo‘yish, tovushni tekshirish.</p>
${key(`Xaritani qo‘l ostida saqlash: kursning barcha akkordlari shu yerda. Xotiradan emas, shu bo‘yicha o‘rganish.`)}
${tip(`Majorlarni, keyin minorlarni har akkordga to‘rt sanoq, metronom 60 da chalish. So‘ng almashtirish: C – Am – D – Bm.`)}
` },
  { id: "g36", t: "Sakkizdan bir: zarbani ikkiga bo‘lish", s: "Bir-va, ikki-va", src: '', h: `
<p>Har zarbani ikkiga bo‘lish mumkin: <b>sakkizdan birlar</b> chiqadi — «bir-va, ikki-va, uch-va, to‘rt-va». O‘lchovda ularning sakkizta. Pastga zarbalar sanoqqa, yuqoriga zarbalar «va» ga to‘g‘ri keladi.</p>
{{lab:gbar}}
<p>«8» bo‘linmasini tanlab, tinglash: metronom raqamlarga chiqillaydi, «va» ular orasida jaranglaydi. Metronom bilan birga ovoz chiqarib sanash.</p>
${key(`Bo‘lish — kichikroq qismlarda sanash: chorak ikkita sakkizdan birga bo‘linadi («bir-va»).`)}
${tip(`Metronom 60. Har «va» ga va har raqamga qarsak chalish: bir-va-ikki-va-uch-va-to‘rt-va.`)}
` },
  { id: "g14", t: "«Sakkizlik» jangi", s: "Pastga, pastga-yuqoriga, yuqoriga-pastga-yuqoriga", src: '', h: `
<p>Zarbaning eng mashhur naqshi — «<b>sakkizlik</b>»: pastga, pastga-yuqoriga, yuqoriga-pastga-yuqoriga. U sakkiz sanoqqa quriladi va tekis, «qo‘shiqsimon» jaranglaydi.</p>
{{lab:gstrumf}}
<p>Qo‘l to‘xtamaydi: pastga-yuqoriga mayatnik kabi to‘xtovsiz tebranadi, o‘tkazilgan zarbalarda esa torlarga tegmaydi. Avval «bir-va-ikki-va…» deb sanab, havoda urish.</p>
${key(`Qo‘l doim tekis tebranadi; naqsh — qaysi tebranishlar torlarga tegishi.`)}
${tip(`Metronom 70. Bitta akkordda «sakkizlik»ni to‘rt o‘lchov, keyin ikki akkordda har biriga bir o‘lchov.`)}
` },
  { id: "g15", t: "Barcha akkordlar bilan jang", s: "Xarita bo‘yicha mashq", src: '', h: `
<p>Endi «sakkizlik» va barcha akkordlar birga ishlaydi. Xaritani olib, to‘rtta akkordni tanlab, naqshni uzmay har birini bir o‘lchovdan chalish.</p>
{{lab:gstrume}}
<p>Akkordni almashtirishda qo‘lni to‘xtatmaslik: oxirgi «va» da barmoqlar yangi akkordga o‘tib bo‘lgan bo‘ladi. Naqshni soddalashtirish mumkin — avval o‘tkazmasdan sakkizdan birlarni pastga-yuqoriga chalish.</p>
${key(`Akkord almashinuvi yangi o‘lchovning «bir» ida; qo‘l shu paytda to‘xtamay tebranishda davom etadi.`)}
${tip(`Metronom 70. Har biriga bir o‘lchov: Am – Em – Am – Dm; keyin C – G – Am – F.`)}
` },
  { id: "g19", t: "Birinchi garmoniya: C – Am – F – G", s: "Eng oson va tushunarli ketma-ketlik", src: '', h: `
<p><b>C – Am – F – G</b> to‘rt akkordi eng mashhur ketma-ketlikni tashkil qiladi: yuzlab qo‘shiqlar shu asosda yozilgan. Har akkordga bir o‘lchovdan «sakkizlik» yoki choraklar bilan chalish.</p>
{{lab:gprogc}}
<p>Akkordlarni <b>raqamlar</b> bilan atash mumkin: C — birinchi pog‘ona (tonika, «uy»), Am — oltinchi, F — to‘rtinchi, G — beshinchi. Ketma-ketlik «birinchi — oltinchi — to‘rtinchi — beshinchi» deb o‘qiladi. Tonika tinchlikdek, G esa hal bo‘lishni istaydigan tarangdek jaranglaydi.</p>
${key(`Tonalliktagi akkordlar raqamlanadi: I, vi, IV, V. Tonika (I) — «uy»; V uyga qaytishga tortadi.`)}
${tip(`C – Am – F – G ni har biriga bir o‘lchov, metronom 60 da chalib, G da to‘xtab, C ga qaytish qanday istalishini eshitish.`)}
` },
  { id: "g20", t: "Shu garmoniya boshqa tonallikda", s: "G – Em – C – D", src: '', h: `
<p>Pog‘onalarni boshqa tonallikka «ko‘chirish» mumkin: G tonalligida <b>I – vi – IV – V</b> bu <b>G – Em – C – D</b>. Naqsh o‘sha, faqat balandroq jaranglaydi. <b>Tonallik</b> shunday ishlaydi: bitta tonika atrofidagi akkordlar to‘plami.</p>
{{lab:gprogc}}
<p>Sxemada «G – Em – C – D» tugmasini bosib, C – Am – F – G bilan solishtirish: shakl bir xil, tovushlar boshqa. Har akkordga bir o‘lchovdan «sakkizlik» bilan chalish.</p>
${key(`Tonallik — uy (tonika) va uning atrofidagi akkordlar. Raqamlar qoladi, harflar o‘zgaradi.`)}
${tip(`G – Em – C – D ni, keyin C – Am – F – G ni chalib, ketma-ketlik «o‘sha, lekin balandroq» ekanini eshitish.`)}
` },
  { id: "g37", t: "Qo‘shiq: «Oh! Susanna»", s: "Ikki akkord va quvnoq jang", src: '', h: `
<p>Stiven Fosterning «<b>Oh! Susanna</b>» qo‘shig‘i (1848) allaqachon xalqniki bo‘lib ketgan. U ikki akkordda chalinadi: <b>C</b> va <b>G</b>. Tempi 80, «sakkizlik» jangi.</p>
{{lab:gprog}}
<p>Akkordlar tartibi: <b>C – C – G – G – C – C – G – C</b>. Kuy quloq bilan topiladi: akkordlar — asos, ustidan kuyni kuylash yoki pianinoda chalish mumkin.</p>
${key(`Qo‘shiq — akkordlar doirasi va tekis jang. Asosiysi — almashtirishda qo‘lni to‘xtatmaslik.`)}
${tip(`Doirani ikki marta chalib, so‘ng akkordlar ustidan biror tanish kuyni kuylash.`)}
` },
  { id: "g38", t: "Qo‘shiq: «Skarbor yarmarkasi»", s: "Minor xalq kuyi", src: '', h: `
<p>«<b>Scarborough Fair</b>» — qadimiy ingliz xalq qo‘shig‘i. U minorda va sokin jaranglaydi, arpedjio va yumshoq jangga yaxshi mos.</p>
{{lab:gprog}}
<p>Akkordlar tartibi: <b>Am – G – Am – C – D – Am</b> (har biriga bir o‘lchov). Tempi 70, yumshoq «sakkizlik» yoki arpedjio. Pastga ehtiyotkor, baland ovozsiz urish.</p>
${key(`Minor qo‘shiqlar sekinroq va yumshoqroq chalinadi: ovoz balandligi ham naqshning bir qismi.`)}
${tip(`Am – G – Am – C – D – Am doirasini chalib, keyin pastroq takrorlash — kayfiyat qanday o‘zgarishini eshitish.`)}
` },
  { id: "g39", t: "Qo‘shiq: «Chiqayotgan quyosh uyi»", s: "Minor, barre va E", src: '', h: `
<p>«<b>House of the Rising Sun</b>» — o‘rganilgan deyarli hamma narsani birlashtirgan xalq balladasi: minor, F barresi va major E. Tempi 60–70, arpedjio yoki sokin jang.</p>
{{lab:gprog}}
<p>Akkordlar tartibi: <b>Am – C – D – F – Am – C – E – E</b>. Har akkord bir o‘lchov. Aynan shu yerda barreli F va Am → E almashtirishi asqotadi.</p>
${key(`Bu kursning birinchi «katta» qo‘shig‘i: akkordlar tanish — ularni to‘xtamay birlashtirish qoldi.`)}
${tip(`Doirani sekin (metronom 60) chalib, keyin 70 gacha tezlashtirish; yozib, tinglash.`)}
` },
  { id: "g28", t: "Do major gammasi", s: "Formula bo‘yicha ketma-ket notalar", src: '', h: `
<p><b>Gamma</b> — «uy» notadan yuqoriga ketma-ket yetti nota. Major gamma <b>ton</b> (t) va <b>yarim ton</b> (y) formulasi bo‘yicha quriladi: <b>t – t – y – t – t – t – y</b>. Yarim ton — bir lad, ton — ikki lad.</p>
{{lab:gformmaj}}
<p>Gitarada do major gammasi: ochiq, diyez va bemolsiz. Notalar raqamlanadi — bu <b>pog‘onalar</b>: 1 (do), 2 (re), 3 (mi) … 7 (si), keyin yana 1 (do) balandroq.</p>
{{lab:gscc}}
${key(`Major gamma — «t t y t t t y» formulasi. U yorqin va «tugallangan» jaranglaydi: birinchi pog‘onada to‘xtash yoqimli.`)}
${tip(`Gammani metronom 60 da yuqoriga-pastga chalib, pog‘onalarni ovoz chiqarib aytish: «bir, ikki, uch…»; oxirgi nota birinchisiga qanday tortishini eshitish.`)}
` },
  { id: "g40", t: "Sol major gammasi va qo‘shiq", s: "O‘sha formula, boshqa nota", src: '', h: `
<p><b>t – t – y – t – t – t – y</b> formulasi istalgan notadan ishlaydi. «Sol» dan <b>sol major</b> chiqadi: unda bitta belgi bor — fa-diyez (faga nisbatan bir lad baland).</p>
{{lab:gscg}}
<p>Gammani chalib, do major bilan solishtirish: tovush o‘sha, faqat balandroq. Endi pog‘onalar bo‘yicha kuyni chalish: <b>1 – 1 – 5 – 5 – 6 – 6 – 5</b> («Twinkle, twinkle») — sol majorda.</p>
${key(`Formulani istalgan notaga ko‘chirish mumkin: tovush nomlari o‘zgaradi, «major» jaranglashi qoladi.`)}
${tip(`1 1 5 5 6 6 5 kuyini avval do majorda, keyin sol majorda metronom 60 da chalish.`)}
` },
  { id: "g41", t: "Major va minor yonma-yon", s: "Bir nomli va parallel", src: '', h: `
<p>Har bir major tonallikning «qarindosh» minori bor. <b>Parallel</b> tonalliklar — do major va lya minor: ularda <b>aynan bir xil notalar</b>, lekin «asosiy» nota boshqa. <b>Bir nomli</b> — do major va do minor: tonika bitta, lekin minorda uchinchi pog‘ona pasaygan.</p>
{{lab:gformpar}}
<p>Do major va lya minor gammalarini ketma-ket chalib, farqni eshitish: bir xil notalar — boshqa kayfiyat. Keyin do major va do minorni quloq bilan solishtirish.</p>
${key(`Major va minor markaz (parallel) yoki uchinchi pog‘ona (bir nomli) bilan farq qiladi. Quloq uchun — yorqin va g‘amgin.`)}
${tip(`Do major va undan keyin darhol lya minorni chalib, ko‘zni yumib qaysisi qaysi ekanini topish.`)}
` },
  { id: "g42", t: "Gammalardagi qo‘shiqlar", s: "Pog‘onalar bo‘yicha kuylar", src: '', h: `
<p>Gamma faqat mashq emas: kuylar pog‘onalar bo‘yicha quriladi. Birinchisi — do majorda «Shodlik qo‘shig‘i» (Betxoven): <b>3 3 4 5 5 4 3 2 1 1 2 3 3 2 2</b>. Ikkinchisi — lya minorda minor kuy: <b>1 3 5 5 4 3 2 1</b>.</p>
{{lab:gscmaj}}
<p>Kuylarni gamma sxemasi bo‘yicha chalish: pog‘onani topish, barmoqni qo‘yish, chalish. Akkordlar bilan birga ham mumkin: kuy — bir qo‘lda gamma bo‘ylab, akkordlar — C, G, Am.</p>
${key(`Kuy — gamma pog‘onalari bo‘ylab yuqoriga-pastga yo‘l. Gammani bilib, istalgan oddiy kuyni topish mumkin.`)}
${tip(`«Shodlik qo‘shig‘i»ni 3 3 4 5 5 4 3 2 1 1 2 3 3 2 2 pog‘onalar bo‘yicha do majorda chalish; keyin sol majorda urinib ko‘rish.`)}
` },
  { id: "g43", t: "Akkordlar nimadan iborat", s: "Major nega yorqin, minor nega g‘amgin", src: '', h: `
<p>Har qanday oddiy akkord — <b>uchtovush</b>: gammadan «bittadan» olingan uch tovush: 1-, 3- va 5-. C da bu do – mi – sol.</p>
{{lab:gtriad}}
<p>1-tovushdan 3-tovushgacha masofa <b>tersiya</b> deyiladi. Majorda u <b>katta</b> — to‘rt yarim ton (ikki lad), minorda <b>kichik</b> — uch yarim ton. Yorqin tovushni g‘amginga aylantirish uchun shu bitta yarim ton yetarli.</p>
${key(`Major: 1 – katta tersiya – 3 – kichik – 5. Minor: 1 – kichik tersiya – 3 – katta – 5. Faqat o‘rtasi farq qiladi.`)}
${tip(`C va Cm, keyin A va Am uchun «Tinglash» ni bosish; gitarada shu juftni chalish: barmoq shaklida nima o‘zgaradi?`)}
` },
  { id: "g44", t: "Sus2 va sus4 akkordlari", s: "Na major, na minor", src: '', h: `
<p><b>Sus</b> akkordlarida uchinchi pog‘ona qo‘shni tovush bilan almashtiriladi va akkord major yoki minor bo‘lmay qoladi: «osilgandek» jaranglaydi. <b>sus2</b> — uchinchi o‘rniga ikkinchi, <b>sus4</b> — to‘rtinchi pog‘ona.</p>
{{lab:gtriad}}
<p>Gitarada sus akkordlari bitta barmoqni siljitishdan chiqadi: D da — Dsus2 (barmoqlar olinadi) va Dsus4 (jimjiloq qo‘shiladi), A da — Asus2 va Asus4. Ketma-ketlikda chalish: D – Dsus4 – D.</p>
${key(`Sus akkord — «na major, na minor». U savolga o‘xshaydi: tarang jaranglab, oddiy akkordga hal bo‘lishni istaydi.`)}
${tip(`D – Dsus4 – D va A – Asus4 – A ni chalib, taranglik va hal bo‘lishni eshitish.`)}
` },
  { id: "g45", t: "O‘n oltidan birlar", s: "16 ga bo‘lish", src: '', h: `
<p>Zarba nafaqat ikkiga, balki <b>to‘rtga</b> ham bo‘linadi: <b>o‘n oltidan birlar</b> chiqadi — «bir-e-va-a, ikki-e-va-a…». O‘lchovda ularning o‘n oltita.</p>
{{lab:gbar}}
<p>«16» bo‘linmasini tanlab, tinglash: metronom raqamlarga chiqillaydi, har zarbaga to‘rt tovush to‘g‘ri keladi. Qo‘l sakkizdan birlarga nisbatan ikki barobar tez tebranadi: avval sekin chalish, metronom 50–60.</p>
${key(`O‘lchov bo‘linmalari: 1 (butun), 2 (yarimlar), 4 (choraklar), 8 (sakkizdan birlar), 16 (o‘n oltidan birlar). Har keyingisi ikki barobar tez.`)}
${tip(`Metronom 50. O‘n oltidan birlarni «bir-e-va-a, ikki-e-va-a…» deb sanab qarsak chalish; so‘ng bitta akkordni o‘n oltidan birlarda chalish.`)}
` },
  { id: "g46", t: "Barre: Bb va B", s: "Grit bo‘ylab «A» shakli", src: '', h: `
<p>«A» akkordi shakli (uch barmoq qatorda) <b>barre</b> bilan istalgan ladda akkord beradi. <b>Bb</b> («si-bemol major») — 1-ladda barre, <b>B</b> («si major») — 2-ladda.</p>
{{lab:gall}}
<p>Barreni ko‘rsatkich barcha torlarda ushlaydi, qolgan uch barmoq ikki lad nariga «A» shaklini hosil qiladi. Shaklni ko‘chirish mumkin: har lad yuqoriga — yarim ton baland akkord.</p>
${key(`Barreli shakl — «harakatchan»: bitta shakl 12 akkord beradi. Gitarachilar yuzlab akkordlarni shunday eslab qoladi.`)}
${tip(`Bb ni chalib, shaklni bir lad yuqoriga surish — B chiqadi; tovush yarim tonga ko‘tarilganini eshitish.`)}
` },
  { id: "g47", t: "Gammalar: re minor va do minor", s: "Boshqa tonalliklarda minor", src: '', h: `
<p>Tabiiy minor formulasi — <b>t – y – t – t – y – t – t</b> — istalgan notadan ishlaydi. «Re» dan <b>re minor</b>, «do» dan <b>do minor</b> chiqadi.</p>
{{lab:gscmin2}}
<p>Ikkala gammani chalib, lya minor bilan solishtirish: formula va xarakter bir xil, notalar boshqa. Har bir gammada <b>1 3 5 5 4 3 2 1</b> kuyini chalish.</p>
${key(`«t y t t y t t» formulasi — istalgan notadan minor. Balandlik o‘zgaradi, «g‘amgin» xarakter qoladi.`)}
${tip(`Re minorni metronom 60 da yuqoriga-pastga chalib, keyin do minorni; pog‘onalarni ovoz chiqarib aytish.`)}
` },
  { id: "g48", t: "Garmonik minor", s: "Ko‘tarilgan yettinchi pog‘onali minor", src: '', h: `
<p><b>Garmonik minor</b>da yettinchi pog‘ona yarim tonga ko‘tariladi: tonikaga tortilish va «sharqona» tus paydo bo‘ladi. «Lya» dan formula: <b>t y t t y 1½ y</b>, bunda 1½ — bir yarim ton (uch lad).</p>
{{lab:gscharm}}
<p>Tabiiy va garmonik lya minorni ketma-ket chalish: faqat bitta nota farq qiladi — sol va sol-diyez. Shu sababli lya minorda E akkordi majorcha jaranglaydi: E – Am minordagi eng kuchli ketma-ketlik.</p>
${key(`Garmonik minor — yettinchisi ko‘tarilgan minor. Yettinchi tonikaga tomon yuqoriga tortiladi.`)}
${tip(`Tabiiy va garmonik Am ni, keyin E – Am ketma-ketligini chalib, «tortilish»ni eshitish.`)}
` },
  { id: "g49", t: "Gammalar uyg‘unligi", s: "Major, minor va xromatika birga", src: '', h: `
<p>O‘rganilgan barcha gammalarni birga yig‘ish mumkin: major, minor va xromatika. Xromatikada <b>barcha</b> o‘n ikki tovush bor; major va minor ulardan yettitasini oladi.</p>
{{lab:gformall}}
<p>«Kesishuvchi» chalishni sinab ko‘rish: do major yuqoriga, keyin lya minor pastga — bir xil notalar, lekin markaz siljigan. Xromatika bilan tugatish — yarim tondan yarim tonga.</p>
${key(`Major, minor va xromatika — bir xil o‘n ikki tovushdan turli «tanlovlar».`)}
${tip(`Do majorni yuqoriga, lya minorni pastga, keyin xromatikani chalib, navbat bilan nima jaranglaganini aytish.`)}
` },
];
