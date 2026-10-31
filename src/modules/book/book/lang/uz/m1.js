// Учебник (uz): простые версии глав для среднего уровня. Те же подзаголовки и схемы, что в p1.js, текст проще.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';

export const CHM = {
sound: `
<p>Bu bob — alifbo: tovush nima, u qanday yoziladi va qanday ataladi. Har qanday qoidani eshitib tekshirgan maʼqul.</p>
<h3>Tovushning toʻrt xossasi</h3>
<p>Tovushning toʻrt xossasi bor: [[pitchT|balandlik]] (baland yoki past), [[duration|choʻzim]] (qancha yangraydi), kuch va [[timbre|tembr]] — ovozni gitaradan ajratib turadigan rang. Tor qancha tez tebransa, tovush shuncha baland. Sozlash uchun lya tovushi olinadi — soniyasiga 440 tebranish (440 Gs); ilovaning tyuneri ham shunga tayanadi. Nota balandlikni nota yoʻlidagi oʻrni bilan, choʻzimni esa koʻrinishi bilan koʻrsatadi.</p>
<h3>Obertonlar</h3>
<p>Tor bitta tovush bilan yangramaydi: asosiy tovush bilan birga ohista qoʻshimcha tovushlar — [[overtone|obertonlar]] — yangraydi, ular 2, 3, 4 marta yuqori. Ularning aralashmasi tembrni hosil qiladi: shuning uchun skripka fleytaga oʻxshamaydi. Birinchi obertonlar birga major akkordni beradi — musiqadagi eng barqaror akkordni.</p>
${lab('overtones')}
<h3>Nota yoʻli</h3>
<p>Notalar [[staff|nota yoʻliga]] yoziladi — bu pastdan yuqoriga sanaladigan besh chiziq. Nota chiziqda yoki chiziqlar orasida turadi; juda baland va past notalar uchun qisqa qoʻshimcha chiziqlar chiziladi. Nota qancha baland tursa, tovush shuncha baland. Notadagi tayoqcha past notalarda yuqoriga, baland notalarda pastga qaraydi.</p>
<h3>Tovushlar nomi</h3>
<p>Tovushlar yettita: do, re, mi, fa, sol, lya, si, keyin yana doira boʻylab. Klaviaturada do — ikkita qora klavishdan chapdagi oq klavish, fa — uchta qora klavishdan chapdagisi.</p>
<table class="bktab"><tr><th>Boʻgʻin</th><td>do</td><td>re</td><td>mi</td><td>fa</td><td>sol</td><td>lya</td><td>si</td></tr><tr><th>Harf</th><td>C</td><td>D</td><td>E</td><td>F</td><td>G</td><td>A</td><td>B (H)</td></tr></table>
<p>Ilovada va qoʻshiq akkordlarida notalar C D E F G A B harflari bilan yoziladi. Eski rus va nemis notalarida si — bu H, B esa u yerda si-bemolni bildiradi.</p>
<h3>Oktavalar</h3>
<p>Bir do dan keyingi do gacha — [[octaveR|oktava]]. Royalda 88 klavish bor, bu taxminan yetti oktava. Oʻrtada — birinchi oktava, pastda — kichik, katta va yana ikkitasi, yuqorida — ikkinchi, uchinchi va undan keyingilari. Raqamli yozuv ham bor: birinchi oktava do tovushi — C4, lya — A4. Uni ilovaning tyuneri, MIDI va studiyasi koʻrsatadi.</p>
${lab('octaves')}
<h3>Kalitlar</h3>
<p>Qaysi chiziqda qaysi tovush turishini qator boshidagi [[clef|kalit]] hal qiladi. Skripka kaliti — baland tovushlar uchun: uning jingalagi ikkinchi chiziqni oʻraydi, u yerda birinchi oktava sol tovushi turadi. Bas kaliti — past tovushlar uchun: uning nuqtalari toʻrtinchi chiziqni oʻraydi, u yerda kichik oktava fa tovushi turadi. Birinchi oktava do tovushi skripka kalitida pastdagi qoʻshimcha chiziqda, bas kalitida esa yuqoridagisida: kalitlar shu yerda uchrashadi.</p>
${lab('clefs')}
${tip('Gitara notalari skripka kalitida yoziladi, lekin gitara bir oktava past yangraydi. Notalar ustidagi 8va belgisi bir oktava yuqori chalishni bildiradi.')}
<h3>Qatorlar va partitura</h3>
<p>Ovoz, gitara yoki fleyta bitta qatorga yoziladi. Fortepiano — qavs bilan birlashtirilgan ikkita qatorga: yuqorida oʻng qoʻl, pastda chap qoʻl. Ansamblning barcha partiyalari birining ostida biri yozilsa — bu [[score|partitura]].</p>
<h3>Diapazon va registr</h3>
<p>[[range|Diapazon]] — ovoz yoki cholgʻuning barcha tovushlari, eng pastidan eng balandigacha. Registr — uning bir qismi: past, oʻrta va baland, har birining oʻz rangi bor. Qoʻshiq diapazonga sigʻishi, lekin uzoq vaqt chetda tursa, noqulay boʻlishi mumkin; unda u yuqoriroq yoki pastroqqa koʻchiriladi. Ovozlar: ayollarniki — soprano, metso-soprano, alt; erkaklarniki — tenor, bariton, bas (balanddan pastga).</p>
${lab('ranges')}
${key('Nota oʻrni — balandlik, nota koʻrinishi — choʻzim. Qaysi chiziqda qaysi tovush turishini kalit aytadi.')}
`,

rhythm: `
<p>[[duration|Choʻzim]] — tovush qancha ushlanishi. U soniyalarda emas, hissalarda sanaladi: sanoq tez yoki sekin boʻlishini temp hal qiladi. Har bir keyingi choʻzim oldingisidan ikki marta qisqa.</p>
<h3>Asosiy boʻlinish</h3>
<p>Butun = ikki yarimtalik = toʻrt chorak = sakkiz sakkizlik = oʻn olti oʻn oltitalik. Butun — tayoqchasiz oq kallak, yarimtalik — tayoqchali oq, chorak — tayoqchali qora, sakkizlikda bitta bayroqcha, oʻn oltitalikda ikkita. Sxema qatorlari bosilganda yangraydi.</p>
${lab('durs')}
<p>Notalarni guruh bilan koʻrish foydali: yarimtalik — bu ikki chorak, bitta tovushdagi uchta sakkizlik — nuqtali chorak. Shunda ritm harflab emas, soʻzlab oʻqiladi.</p>
<h3>Pauzalar</h3>
<p>[[rest|Pauza]] — aniq choʻzimli sukut; har bir choʻzimning oʻz pauzasi bor. Butun pauza — chiziq ostidagi toʻrtburchak, u «butun takt jim turish»ni ham bildiradi; yarimtalik — chiziq ustidagi toʻrtburchak. Pauza — nafas, vergul kabi. Koʻp uchraydigan xato — pauzani oxirigacha sanamay, erta kirish.</p>
<h3>Nuqta, liga, fermata</h3>
<p>[[dot|Nuqta]] notaga uning yarim choʻzimini qoʻshadi: nuqtali yarimtalik — uch chorak. [[tie|Liga]] — bir xil ikki nota orasidagi yoy: ikkinchisi qayta chalinmaydi, balki ushlab turiladi. Turli notalar ustidagi yoy boshqa narsani bildiradi: bogʻlab chalish. [[fermata|Fermata]] — nuqtali yarim doira: tovush his boʻyicha uzoqroq ushlanadi.</p>
<h3>Guruhlash</h3>
<p>Bir hissadagi sakkizlik va oʻn oltitaliklar umumiy qovurgʻa bilan birlashtiriladi — shunda hissa qayerda boshlanishi darhol koʻrinadi.</p>
<h3>Triol va punktir</h3>
<p>[[triplet|Triol]] — ikki nota oʻrnidagi uchta teng nota: 3 raqamli uchta sakkizlik bitta chorak kabi yangraydi. Xato — birinchi yoki oxirgi notani choʻzib yuborish.</p>
<p>[[dotted|Punktir]] — «uzun va qisqa» juftligi: nuqtali sakkizlik va oʻn oltitalik. Ichida «bir-va-ta-va» deb sanab, «bir» va oxirgi «va» da chalish qulay.</p>
<h3>Tekis va sving sakkizliklar</h3>
<p>Klassikada sakkizliklar tekis. Jazda ular xuddi shunday yoziladi, lekin [[swing8|sving bilan]] chalinadi: birinchisi uzunroq va ogʻirroq, ikkinchisi qisqaroq — «taa-ta, taa-ta». Tez tempda sving yumshoqroq, sakkizliklar deyarli tekis. Toʻr kataklari bosiladi: oʻz ritmini tuzish mumkin.</p>
${lab('rgrid')}
${tip('Hissalar — oyoq bilan, ritm — qarsak yoki boʻgʻinlar bilan («ta — ti-ti»). Avval sekin, metronom bilan, keyin tezroq.')}
${key('Har bir choʻzim oldingisidan ikki marta qisqa; nuqta yarmini qoʻshadi, triol hissani uchga boʻladi. Pauza ham tovush kabi aniq sanaladi.')}
`,

meter: `
<p>Kuy ostida bir tekis puls boradi — hissalar, xuddi qadamlar kabi. Baʼzi hissalar ogʻirroq (kuchli), boshqalari yengilroq (kuchsiz). Ularning bir tekis almashinuvi — [[metre|metr]].</p>
<h3>Sheʼrdagi metr</h3>
<p>Sheʼrda kuchli hissa — urgʻuli yoki turoq boshidagi boʻgʻin. Bolalar qoʻshigʻi «Laylak keldi, yoz boʻldi» aytilganda kuchli boʻgʻin bir oralab keladi — sanoq ikkiga. «Boychechagim boylandi» — 4 + 3 boʻgʻin, xuddi 7/8 dagi guruhlar kabi. Har bir kuchli boʻgʻin oldidagi chiziq qatorni taktlarga boʻladi. Birinchi chiziqdan oldingi kuchsiz boʻgʻin — zatakt.</p>
${lab('verse')}
<h3>Takt va oʻlcham</h3>
<p>[[bar|Takt]] — bir kuchli hissadan keyingisigacha; chiziq kuchli hissa oldiga qoʻyiladi. [[timesig|Oʻlcham]] kasr bilan yoziladi: yuqorida — taktda nechta hissa, pastda — qaysi nota hissa hisoblanadi. 3/4 — uchta chorak, 6/8 — oltita sakkizlik.</p>
<h3>Oddiy, murakkab, aralash</h3>
<p>Oddiy oʻlchamda bitta kuchli hissa: 2/4, 3/4 (vals: «bir-ikki-uch»). Murakkab — bir nechta bir xil oddiy oʻlcham: 4/4 — ikki marta 2/4, uchinchi hissa ham kuchli, lekin birinchisidan kuchsizroq; bu qoʻshiqlarning eng koʻp uchraydigan oʻlchami, u C harfi bilan ham yoziladi. 6/8 — ikki marta uchtadan sakkizlik, tebranish kabi. Aralash oʻlcham turli guruhlardan tuziladi: 5/4 = 3 + 2, 7/8 = 2 + 2 + 3. Chizilgan C — yarimtaliklar bilan «ikkiga» sanash.</p>
${lab('meter')}
<h3>Taktni koʻrsatish</h3>
<p>Hissalar qoʻl bilan koʻrsatiladi: «bir» — pastga, oxirgi hissa — yuqoriga. Uchga: pastga, oʻngga, yuqoriga. Toʻrtga: pastga, chapga, oʻngga, yuqoriga. Yuqoridagi sxema sanoqni yoritib boradi; uni qoʻl bilan takrorlash — oʻlchamni his qilishning yaxshi usuli.</p>
<h3>Sanoq hissasi</h3>
<p>Sakkizliklar «bir-va, ikki-va», oʻn oltitaliklar — «bir-va-ta-va» deb sanaladi: har bir notaning oʻz boʻgʻini bor.</p>
<h3>Zatakt</h3>
<p>[[anacrusis|Zatakt]] — boshdagi, birinchi kuchli hissagacha boʻlgan toʻliq boʻlmagan takt: kuy zarbadan oldin yugurib oladi. 3/4 da qoʻshiq uchinchi hissadan boshlanishi mumkin: «uch | BIR-ikki-uch». Asarning oxirgi takti ham odatda toʻliq emas va zatakt bilan birga butun taktni beradi.</p>
<h3>Sinkopa</h3>
<p>[[syncopation|Sinkopa]] — urgʻu kuchsiz hissaga koʻchadi: tovush kuchsiz joyda boshlanib, kuchli joy orqali choʻziladi, goʻyo erta kelgandek. U takt chizigʻi orqali ham boʻladi — liga bilan. Kuchli hissadagi pauza ham shunga oʻxshash samara beradi. Sinkopalar — jaz, fank va pop musiqaning asosi.</p>
${lab('syncop')}
${key('Oʻlcham taktda nechta hissa borligini va qaysilari kuchli ekanini aytadi; ritm — ular ustida nima yangrashini. Avval hissalarni his qilish, keyin ritmni oʻqish.')}
`,

pitch: `
<p>Fortepianoning qoʻshni klavishlari musiqamizdagi eng kichik masofani beradi — [[semitone|yarim ton]]; gitarada bu bitta lad. Ikki yarim ton — bir ton. Oq klavishlar orasida yarim tonlar faqat mi — fa va si — do: ular orasida qora klavish yoʻq. Qolgan qoʻshni oq klavishlar — bir ton oraligʻida.</p>
<h3>Alteratsiya belgilari</h3>
<p>[[accidental|Belgilar]] balandlikni oʻzgartiradi: diyez ♯ — yarim ton yuqori, bemol ♭ — yarim ton past, bekar ♮ — bekor qilish; dubl-diyez 𝄪 va dubl-bemol 𝄫 — birdaniga bir tonga. Nota nomi saqlanadi: fa-diyez — baribir fa. Kalit belgilari (qator boshida) butun asarda va barcha oktavalarda amal qiladi, tasodifiy belgilar (nota oldida) — takt oxirigacha va faqat shu nota uchun.</p>
${lab('semis')}
<h3>Oktavaning oʻn ikki tovushi</h3>
<p>Oktavada oʻn ikkita yarim ton bor: yettita oq klavish va beshta qora. Qora klavishning kamida ikki nomi bor: do-diyez = re-bemol. Yangrashi bir xil, nomi turlicha notalar — [[enharmonic|enharmonik teng]]. Oq klavishlarning ham ikkinchi nomlari bor: mi-diyez fa kabi yangraydi. Qaysi nomni yozishni tonallik hal qiladi.</p>
${lab('enh')}
<h3>Diatonik va xromatik yarim ton</h3>
<p>Turli harflar orasidagi yarim ton (mi — fa) — diatonik, nota va uning belgili varianti orasidagisi (fa — fa-diyez) — xromatik. Ular bir xil yangraydi, lekin gammada har bir harf bir marta uchraydi. Shuning uchun sol majorda yettinchi nota — fa-diyez, sol-bemol emas: sol harfi band.</p>
<h3>Temperatsiya</h3>
<p>Fortepiano va gitara [[temperament|teng temperatsiyada]] sozlangan: barcha oʻn ikki yarim ton bir xil, shuning uchun istalgan tonallikda chalish mumkin. Ovoz va skripka nozikroq moslashadi — asosiy tovushga intiluvchi nota biroz balandroq olinadi. Shuning uchun fortepianosiz xor ayniqsa toza yangrashi mumkin: eshitish klavishdan muhimroq.</p>
${tip('Do dan do gacha barcha yarim tonlarni yuqoriga va pastga kuylab, har birini ilova tyuneri bilan tekshirish foydali.')}
${key('Yarim ton — qoʻshni klavishlar yoki bitta lad, ton — bittadan keyingisi. Belgi balandlikni oʻzgartiradi, lekin nota nomini emas; nom tonallikka qarab tanlanadi.')}
`,
};
