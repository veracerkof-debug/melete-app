// Учебник (uz): простые версии глав для среднего уровня — «Интервалы», «Аккорды», «Гаммы и лады», «Тональность и функции».
// Собственный пересказ глав из p2.js простыми словами: те же подзаголовки и схемы, меньше терминов.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';

export const CHM = {
iv: `
<p>[[interval|Interval]] — ikki tovush orasidagi masofa. Intervalning ikki soni bor. Birinchisi — u ikki chetdagisini ham qoʻshib, nechta nota-harfni qamrab olishi: do dan mi gacha — do, re, mi, uchta harf, demak, bu tersiya. Ikkinchisi — unda nechta yarim ton borligi. Yarim ton — fortepianoning qoʻshni klavishlari yoki gitaraning qoʻshni ladlari. Birinchi son nomni beradi (sekunda, tersiya, kvarta, kvinta…), ikkinchisi — sifatni: kichik, katta, sof, orttirilgan, kamaytirilgan.</p>
<p>Bundan bir nozik jihat kelib chiqadi: C–F va C–E♯ — yuqorida bitta klavish, lekin turli intervallar. C–F — toʻrtta harf, bu kvarta. C–E♯ — uchta harf, bu tersiya (orttirilgan).</p>
<p>Jazda va qoʻshiqlarda intervallar koʻpincha pastki tovushdan raqam bilan yoziladi. Bu [[ivAbbr|qisqa yozuv]]: katta va sof intervallar — shunchaki raqam bilan (3, 5, 7), kichiklari — bemol bilan (♭3, ♭7), orttirilganlari — diyez bilan (♯4). Notada belgi harfdan keyin (F♯), pogʻonada — raqamdan oldin qoʻyiladi (♯4).</p>
<p>Prima, kvarta, kvinta va oktavaning «kichik» va «katta» turi yoʻq — ular sof boʻladi. Sof interval yarim tonga toraytirilsa, kamaytirilgan, kengaytirilsa — orttirilgan boʻladi. Shuning uchun «kichik kvinta» boʻlmaydi: kamaytirilgani bor (♭5).</p>
${lab('iv')}
<h3>Tersdesimagacha barcha intervallar</h3>
<p>Oktavadan keng intervallar <b>murakkab</b> deyiladi: bu oddiy interval va oktava. Nona — oktava orqali sekunda, desima — tersiya, undesima — kvarta, duodesima — kvinta, tersdesima — oktava orqali seksta. Akkord nomlaridagi 9, 11 va 13 raqamlari aynan shundan olinadi. Akkord ustidagi bunday tovushlar [[tension|tarangliklar]] deyiladi: ular rang qoʻshadi.</p>
${lab('ivtable')}
<h3>Bir xil yangrash — turli nomlar</h3>
<p>Baʼzan ikki interval bir xil yangraydi, lekin turlicha ataladi. Masalan, C–E♭ — kichik tersiya, C–D♯ esa — orttirilgan sekunda: klavishlar oʻsha. C–F♯ (orttirilgan kvarta) va C–G♭ (kamaytirilgan kvinta) ham shunday. Qaysi nom toʻgʻriligi notalar qanday yozilganiga — yaʼni tonallik va akkordga bogʻliq. Eshitishda farq yoʻq, yozuvda va maʼnoda — bor.</p>
<h3>Intervalning aylanmasi</h3>
<p>Pastki tovush oktava yuqoriga koʻchirilsa, intervalning aylanmasi hosil boʻladi. Qoida oddiy: nomlar yigʻindisi 9 ni beradi (tersiya sekstaga, sekunda septimaga, kvarta kvintaga aylanadi). Sifat teskarisiga oʻzgaradi: katta kichikka, orttirilgan kamaytirilganga aylanadi, sof esa sof qoladi. Bu xayolda hisoblash uchun qulay: yuqoriga katta sekstani pastga kichik tersiya sifatida topish oson.</p>
${key('[[tritone|Triton]] — 6 yarim ton, oktavaning aniq yarmi. Aylanganda u triton boʻlib qoladi. Bu eng tarang interval, dominantaning tonikaga tortilishi unga tayanadi.')}
${tip('Katta seksta — kichik tersiyasiz oktava, kichik seksta — katta tersiyasiz oktava. Septima — sekundasiz oktava. Shunda seksta va septimalarni grifda va klavishlarda topish osonroq.')}
<h3>Konsonans va dissonans</h3>
<p>[[consonance|Konsonanslar]] qoʻshilib, osoyishta yangraydi: prima, oktava, kvinta, kvarta (eng «toza»lari), tersiya va sekstalar (yumshoqroq va iliqroq). Dissonanslar keskin yangraydi va harakat talab qiladi: sekundalar, septimalar va triton. Kvarta — alohida holat: akkordning eng pastida u beqaror, ichida esa osoyishta yangraydi.</p>
<p>Dissonans — xato emas. Bu musiqaga oʻtkirlik beradigan taranglik, ayniqsa jazda. Muhimi — u qayerda turishi va keyin qayoqqa ketishi.</p>
${tip('Intervalni avval kuylab, keyin chalish foydali. Tersiya va septimalardan boshlash maʼqul: akkordlarning [[guide|yoʻnaltiruvchi tonlari]] ulardan iborat.')}
<h3>Intervallarni eshitib: mavzular boshlanishi</h3>
<p>Interval mashhur kuyga bogʻlansa, uni tanish osonroq: mavzuning dastlabki ikki tovushi — kerakli interval. Quyida jaz mavzularining boshlanishlari keltirilgan. Har qanday oʻz qoʻshiqlari ham yaraydi: asosiysi, kuy yaxshi tanish boʻlsin.</p>
<table class="bktab"><tr><th>Interval</th><th>Yuqoriga</th><th>Pastga</th></tr>
<tr><td>kichik sekunda</td><td>Blue Monk</td><td>Bolivia</td></tr><tr><td>katta sekunda</td><td>Four</td><td>—</td></tr><tr><td>kichik tersiya</td><td>Confirmation</td><td>—</td></tr>
<tr><td>katta tersiya</td><td>Monk's Dream</td><td>Giant Steps</td></tr><tr><td>sof kvarta</td><td>Jordu</td><td>ESP</td></tr><tr><td>triton</td><td>Isotope</td><td>—</td></tr>
<tr><td>sof kvinta</td><td>Bags' Groove</td><td>Katrina Ballerina</td></tr><tr><td>katta seksta</td><td>Misterioso</td><td>All Blues</td></tr><tr><td>oktava</td><td>Del Sasser</td><td>—</td></tr></table>
<h3>Laddagi intervallar</h3>
<p>Tonallikda intervalning roli paydo boʻladi. Tonika uchtovushining tovushlari — I, III va V pogʻonalar (do majorda: do, mi, sol) — barqaror, ularda musiqa dam oladi. Shu tovushlardan tuzilgan intervallar [[ivMode|barqaror]] deyiladi. Qolganlari beqaror: beqaror tovush eng yaqin barqaror tovushga intiladi.</p>
<p>Misol — do majordagi fa — si tritoni. U «ajraladi»: fa pastga, mi ga, si yuqoriga, do ga boradi. Mi — do hosil boʻladi, osoyishta seksta. Garmonik minorda (VII pogʻonasi koʻtarilgan minorda) oʻzining oʻtkir intervallari paydo boʻladi — ular [[charIv|xarakterli]] deyiladi.</p>
${lab('ivmode')}
`,
chords: `
<p>Akkord — birga yangraydigan bir nechta tovush. Koʻpincha u tersiyalar bilan, bitta nota oralatib quriladi: do dan — do, mi, sol, si. Pastki tovush — asos, akkord nomini undan oladi. Uchta tovush uchtovushni, toʻrttasi — [[seventh|septakkordni]] beradi. Yuqoriroqdagi tovushlar (9, 11, 13) rang qoʻshadi.</p>
<h3>Uchtovushlar</h3>
<p>[[triad|Uchtovush]] — tersiyalar boʻyicha uchta tovush. Turlari toʻrtta:</p>
<ul><li><b>major</b> (C: do–mi–sol) — yorugʻ, kuchli;</li><li><b>minor</b> (Cm: do–mi♭–sol) — gʻamgin, oʻychan;</li><li><b>kamaytirilgan</b> (C°: do–mi♭–sol♭) — xavotirli;</li><li><b>orttirilgan</b> (C+: do–mi–sol♯) — «tumanli», noaniq.</li></ul>
<p>Major va minor bitta nota — tersiya bilan farq qiladi. [[sus|Sus-akkordda]] tersiya umuman yoʻq, uning oʻrnida kvarta turadi (Csus4: do–fa–sol). U ochiq yangraydi, na major, na minor.</p>
<p>Major gammada I, IV va V pogʻonalarda major uchtovushlar, II, III va VI da — minorlar, VII da — kamaytirilgan turadi. Do majorda: C, Dm, Em, F, G, Am, B°.</p>
${lab('triads')}
<h3>Aylanmalar</h3>
<p>Akkord tovushlarining oʻrnini almashtirish mumkin. Pastda asos boʻlsa — bu asosiy koʻrinish. Pastda tersiya boʻlsa — birinchi [[inversion|aylanma]], kvinta boʻlsa — ikkinchisi. Qoʻshiq toʻplamlarida bu qiya chiziq bilan yoziladi: C/E — basda mi bilan do major, C/G — basda sol bilan. Klassik nazariyada aylanmalarning oʻz nomlari bor: [[sixth|sekstakkord]] (pastda tersiya) va kvartsekstakkord (pastda kvinta). Aylanmalar akkordlar bir-biriga ortiqcha sakrashlarsiz, ravon oʻtishi uchun kerak.</p>
${lab('chord')}
<h3>Yettita septakkord</h3>
<p>Uchtovush ustiga yana bitta tersiya qoʻshilsa, septakkord hosil boʻladi. Asosiy turlari beshta va ular bir-biridan bitta nota bilan farq qiladi:</p>
<ul><li><b>Cmaj7</b> (do–mi–sol–si) — yumshoq, xayolchan;</li><li><b>C7</b> (si — si♭ ga pasayadi) — dominanta akkordi, yechilishni xohlaydi;</li><li><b>Cm7</b> (mi ham mi♭ ga pasayadi) — minor, osoyishta;</li><li><b>Cm7♭5</b> (sol — sol♭ ga pasayadi) — yarim kamaytirilgan, ø;</li><li><b>C°7</b> (septima yana yarim ton pastroq) — kamaytirilgan, eng tarangi.</li></ul>
<p>Yana ikkitasi bor: katta septimali minor m(maj7) va 7sus4.</p>
${lab('seventh')}
<p>Ularning eng muhimi — [[d7|dominantseptakkord]], V pogʻona akkordi (do majorda — G7). U tonikaga hammadan kuchli tortadi: G7 → C. Uning tovushlari tonikaning eng yaqin tovushlariga boradi: si yuqoriga, do ga, fa pastga, mi ga. VII pogʻonada [[leadseventh|kirish septakkordlari]] turadi — ular ham tonikaga olib boradi.</p>
${lab('d7')}
${key('Akkord turini tersiya va septima belgilaydi. Kvintani deyarli doim chalmaslik mumkin, asosni ham — agar uni bas chalayotgan boʻlsa.')}
<h3>Sekstakkordlar</h3>
<p>C6 — sekstali major uchtovush: do–mi–sol–lya. Cm6 — oʻsha sekstali minor. Ular koʻpincha tonikada maj7 va m7 oʻrniga chalinadi, ayniqsa kuy asosda turganda: unda asos yonidagi katta septima juda keskin yangrar edi. C6/9 — nonali (re bilan) oʻsha C6, juda osoyishta major yangrash.</p>
<h3>Tarangliklar</h3>
<p>Tarangliklar — septakkord ustidagi 9, 11 va 13 tovushlari. Ular akkord rangini oʻzgartiradi, lekin turini emas: Cmaj9 major boʻlib qoladi, faqat boyroq yangraydi. Har bir taranglik har bir akkordga mos kelavermaydi: tovush akkord tovushidan yarim ton yuqori boʻlsa, ular toʻqnashadi. Tarangliklar ilgʻor darajada batafsil koʻrib chiqiladi.</p>
${lab('tens')}
<h3>Sus-akkordlar</h3>
<p>Sus-akkordda kvarta tersiya oʻrnida turadi: Gsus4 — sol–do–re. U «osilib qolgan» kabi yangraydi va odatda tersiyali akkordga oʻtadi yoki yumshoq dominanta kabi ishlaydi. Undan oʻtkirroq qarindoshi ham bor — [[susb9|frigiy akkord]]. Sus nozikliklari — ilgʻor darajada.</p>
${lab('sus')}
<h3>Yuqori tuzilmalar</h3>
<p>Murakkab dominantani oddiy chalish mumkin: chap qoʻl asos, tersiya va septimani ushlaydi, oʻng qoʻl yuqorida oddiy uchtovush chaladi. Bunday uchtovush [[ust|yuqori tuzilma]] deyiladi: u birdaniga uchta rang qoʻshadi. Quyidagi sxemalar bitta dominanta ustida turli uchtovushlarni tinglash imkonini beradi. Yuqori tuzilmalar tizimi ilgʻor darajada batafsil koʻrib chiqiladi.</p>
${lab('ust')}
${lab('ustnum')}
`,
scales: `
<p>[[scale|Gamma]] — kuy tuziladigan, tartib bilan joylashgan tovushlar toʻplami. Har bir akkord ustida uning barcha tovushlari bor gammani chalish mumkin. Shuning uchun gammalar mashq uchun emas, akkordga qaysi notalar «mos kelishini» tushunish uchun oʻrganiladi.</p>
<h3>Major ladlari</h3>
<p>Oq klavishlar do dan do gacha chalinsa, major chiqadi. Oʻsha oq klavishlar re dan re gacha chalinsa — boshqa [[mode|lad]], doriy chiqadi. Mi dan — frigiy, fa dan — lidiy, sol dan — miksolidiy, lya dan — eoliy (tabiiy minor), si dan — lokriy. Tovushlar oʻsha, bosh nota oʻzgaradi — u bilan kayfiyat ham.</p>
<p>Bunday oʻylash osonroq: lad — bitta pogʻonasi oʻzgargan major yoki minor. Doriy — oltinchi pogʻonasi baland minor. Lidiy — toʻrtinchisi koʻtarilgan major (♯4). Miksolidiy — yettinchisi pasaytirilgan major (♭7).</p>
${lab('scale')}
<h3>Yorqinlik zinapoyasi</h3>
<p>Yettita ladni eng yorugʻidan eng qorongʻisigacha tizish mumkin. Yuqorida lidiy, pastroqda ioniy (major), miksolidiy, doriy, eoliy, frigiy va eng pastda lokriy. Har bir qadam pastga bitta pogʻona yarim tonga pasayadi — va yangrash qorongʻilashadi. Beshta oʻrta ladning I, IV va V pogʻonalari bir xil — bular [[tonalDeg|tonal pogʻonalar]], lad tayanchi.</p>
${lab('bright')}
${key('Har bir lad oʻzining [[chartone|xarakterli pogʻonasi]] bilan taniladi: doriy — 6, frigiy — ♭2, lidiy — ♯4, miksolidiy — ♭7, eoliy — ♭6, lokriy — ♭5. Bu pogʻona kuyda ajratilsa, lad darhol eshitiladi.')}
<h3>Akkord oilalari boʻyicha gammalar</h3>
<p>Akkorddan ham borish mumkin: unga qaysi gammalar mos keladi? Gammalar [[famscale|oilalar]] boʻyicha guruhlanadi: major akkordlarga, minorlarga, dominantalarga, kamaytirilganlarga. Oila ichida gammalar bir-ikki pogʻona bilan farq qiladi. Baʼzan gammada [[avoid|noqulay nota]] boʻladi — unda toʻxtalinsa, u akkord bilan toʻqnashadi. Masalan, do major akkordi ustidagi fa: uni choʻzmay, oʻtib ketgan maʼqul.</p>
${lab('famscale')}
<h3>Melodik minor</h3>
<p>[[melmin|Melodik minor]] — oltinchi va yettinchi pogʻonalari baland minor: lya–si–do–re–mi–fa♯–sol♯. Mohiyatan bu uchinchi pogʻonasi pasaytirilgan major. Jazda u yuqoriga va pastga bir xil chalinadi. Batafsil — alohida bobda.</p>
<h3>Garmonik minor va garmonik major</h3>
<p>[[harmmin|Garmonik minor]] — yettinchi pogʻonasi koʻtarilgan tabiiy minor: lya–si–do–re–mi–fa–sol♯. Sol♯ tufayli oltinchi va yettinchi pogʻonalar orasida bir yarim tonlik keng qadam chiqadi — «sharqona» yangrash shundan. Buning evaziga V pogʻonada major akkord paydo boʻladi (lya minorda E) va u tonikaga kuchli tortadi.</p>
<p>[[harmmaj|Garmonik major]] — aksincha, oltinchi pogʻonasi pasaytirilgan major. U oddiy majordan sirliroq yangraydi.</p>
<h3>Alteratsiyalanganmi yoki kamaytirilganmi?</h3>
<p>Oʻtkir tovushli (♭9, ♯9, ♭13) dominanta ustida maxsus gammalar chalinadi: [[altered|alteratsiyalangan]], kamaytirilgan yoki butun tonli. Ulardan qaysi birini tanlashni akkord nomidagi raqamlar koʻrsatadi. Bu ilgʻor daraja materiali; quyidagi sxema raqamlar gammaga qanday olib borishini koʻrsatadi.</p>
${lab('altdim')}
<h3>Simmetrik gammalar</h3>
<p>Simmetrik gammalar bir xil, takrorlanuvchi qadamlardan qurilgan. [[dimscale|Kamaytirilgan gamma]] ton va yarim tonni almashtiradi, [[wholetone|butun tonli]] gamma faqat tonlar bilan yuradi. Ular gʻaroyib yangraydi va maxsus akkordlarga — kamaytirilganlarga va oʻtkir tovushli dominantalarga mos keladi. Batafsil — ilgʻor darajada.</p>
${lab('dimeq')}
<h3>Pentatonikalar va bluz gammasi</h3>
<p>[[pentatonic|Pentatonika]] — yarim tonsiz besh tovushli gamma. Do dan major: do–re–mi–sol–lya. Lya dan minor: lya–do–re–mi–sol — oʻsha tovushlar, faqat boshqa notadan. Pentatonikada oʻtkir intervallar yoʻq, shuning uchun u deyarli har qanday musiqaga mos keladi va improvizatsiyani undan boshlash qulay. [[blues|Bluz gammasi]] — bitta tovush, ♭5 qoʻshilgan minor pentatonika: lya–do–re–mi♭–mi–sol.</p>
<h3>Bibop gammalari</h3>
<p>[[bebop|Bibop gammasi]] — bitta ortiqcha oraliq tovushli oddiy yetti pogʻonali gamma. U tufayli sakkizliklar bilan chalinganda akkord tovushlari kuchli hissalarga tushadi. Bu jaz improvizatsiyasining usuli, u ilgʻor darajada koʻrib chiqiladi.</p>
${tip('Gammani akkord bilan birga oʻrganish foydali: akkord yangraydi (chap qoʻlda, luperda yoki pad bilan), gamma ustidan chalinadi. Shunda quloq qaysi notalar osoyishta, qaysilari tarang ekanini darhol eshitadi.')}
<h3>Xromatik gamma</h3>
<p>[[chromscale|Xromatik gamma]] — ketma-ket barcha oʻn ikki yarim ton, oʻtkazib yubormasdan barcha klavishlar. U doim bir xil yangraydi, lekin turlicha yoziladi: yuqoriga koʻpincha diyezlar, pastga — bemollar yoziladi, tonallikka qarab tuzatishlar bilan. Sxema toʻgʻri yozuvni koʻrsatadi.</p>
${lab('chromsc')}
<h3>Oʻzgaruvchan lad</h3>
<p>Baʼzan kuyning ikki markazi boʻladi: bir ibora fa majorda, keyingisi — re minorda yangraydi. Bu tonalliklarning tovushlari bir xil va birortasi ham bosh emas. Bu [[varmode|oʻzgaruvchan lad]]. Koʻp xalq va estrada qoʻshiqlari shunday tuzilgan.</p>
<h3>Barcha gammalar</h3>
<p>Toʻliq maʼlumotnoma: major va minor ladlari, simmetrik gammalar, pentatonikalar, bibop va turli xalqlar gammalari. Uni notanish nom uchraganda ochish qulay.</p>
${lab('refsc')}
`,
key: `
<p>Tonallik — bitta bosh nota atrofidagi tovushlar va akkordlar oilasi. Major gammaning har bir pogʻonasida uning oʻz tovushlaridan akkord qurilsa, tonallikning yettita akkordi hosil boʻladi. Do majorda: C, Dm, Em, F, G, Am, B°. Ularning raqamlari [[roman|rim raqamlari]] bilan yoziladi: bosh harflar — major akkordlar (I, IV, V), kichiklari — minor (ii, iii, vi). Shunda ketma-ketlikni birdaniga istalgan tonallik uchun yozish mumkin: do majorda «I–IV–V» — bu C–F–G, sol majorda — G–C–D.</p>
${lab('key')}
<h3>Uchta funksiya</h3>
<p>Tonallikning har bir akkordida rol bor — [[function|funksiya]]. Ular uchta:</p>
<ul><li>[[tonic|tonika]] — osoyishtalik, «uyda» (I, shuningdek iii va vi);</li><li>subdominanta — uydan harakat (IV va ii);</li><li>[[dominant|dominanta]] — uyga qaytishni xohlaydigan taranglik (V va vii).</li></ul>
<p>Bir funksiyali akkordlarni bir-birining oʻrniga qoʻyish mumkin. Masalan, do majorda F (IV) oʻrniga Dm (ii) chalish mumkin — rol saqlanadi. vi akkordi (Am) ikki yoqlama: V dan keyin u tonika kabi, V dan oldin — subdominanta kabi yangraydi.</p>
${key('Deyarli har qanday ketma-ketlik — «subdominanta → dominanta → tonika» yoʻli: uydan chiqish, taranglashish va qaytish. ii–V–I (Dm–G–C) — bu yoʻlning eng qisqa shakli.')}
<h3>Bosh uchtovushlar va ovoz yurishi</h3>
<p>Uchta [[mainTriads|bosh uchtovush]] — I, IV va V pogʻonalarda: tonika (T), subdominanta (S) va dominanta (D). Do majorda bular C, F va G. Ular bilan juda koʻp qoʻshiqlarga joʻr boʻlish mumkin. Akkorddan akkordga ravon oʻtgan maʼqul: umumiy tovush joyida qoladi, qolgan tovushlar keyingi akkordning eng yaqin notalariga boradi.</p>
<p>Oddiy va foydali mashq — kuyga bosh uchtovushlarni tanlash. Qoida: kuchli hissadagi kuy notasi akkordga kirishi kerak.</p>
${lab('harmtsd')}
<h3>Minor</h3>
<p>Minorda hammasi oʻsha, faqat tonika minor. Lya minorda bosh uchtovushlar — Am, Dm va E. E ning roli alohida: minordagi dominanta odatda major qilinadi (garmonik minordan), toki u tonikaga kuchliroq tortsin. Oddiy Em bilan Am ga oʻtish yumshoqroq va kuchsizroq yangraydi. Yuqoridagi sxema garmonik va melodik minorga oʻtkaziladi.</p>
<h3>Kadensiyalar</h3>
<p>[[cadence|Kadensiya]] — iboraning yakuni, nutqdagi nuqta yoki vergul kabi. Asosiylari:</p>
<ul><li>V–I (G–C) — toʻliq yakun, nuqta;</li><li>IV–I (F–C) — yumshoq yakun, «omin»;</li><li>V–vi (G–Am) — aldash: tonika kutilgan edi, uning oʻrinbosari yangradi;</li><li>V da toʻxtash — yarim kadensiya, vergul: davomi bor.</li></ul>
<h3>Kvinta doirasi</h3>
<p>[[circle|Kvinta doirasida]] tonalliklar kvinta oraligʻida turadi va qoʻshnilarda faqat bitta belgi farq qiladi. Qoʻshiqlarda akkordlar koʻpincha doira boʻylab kvintaga pastga yuradi: D → G → C → F. Doiraning oʻzi va tonallik belgilari — «Tonalliklar» bobida.</p>
`,
};
