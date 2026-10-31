// Учебник (uz): простые версии глав для среднего уровня — лад, тональности, мелодия, исполнение.
// Пересказ своих глав из p1.js проще и короче; подзаголовки и схемы — те же, в том же порядке.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';

export const CHM = {
mode: `
<p>Har bir qoʻshiqda bosh tovush bor — [[tonicT|tonika]]. Bu kuyning «uyi»: kuy koʻpincha undan boshlanadi va deyarli doim u bilan tugaydi. Qolgan tovushlarning baʼzilari osoyishta, boshqalari qoʻshnilariga intiladi. Tonika atrofidagi bu tartib [[lad|lad]] deyiladi. Eng mashhur ladlar — major (yorugʻroq yangraydi) va minor (yumshoqroq, gʻamginroq yangraydi).</p>
<h3>Kuydan tovushqator</h3>
<p>Ladni tanish kuyning oʻzidan topish mumkin. Uning tovushlari bir martadan, pastdan yuqoriga yozilsa, tovushqator hosil boʻladi. Tovushlar tonikadan (kuy tinchlanadigan tovushdan) raqamlanadi: I, II, III… Bu raqamlar — pogʻonalar. Endi kuy — pogʻonalar boʻylab yoʻl, uni istalgan notadan kuylash yoki chalish mumkin: notalar nomi emas, raqamlar muhim.</p>
${lab('tonic')}
<p>[[scale|Gamma]] — lad tovushlari ketma-ket, tonikadan oktava yuqoridagi oʻsha tonikagacha. Pogʻonalar sakkizta, sakkizinchisi birinchisini takrorlaydi.</p>
<h3>Major</h3>
<p>Major gamma bitta qadamlar formulasi bilan quriladi: ton — ton — yarim ton — ton — ton — ton — yarim ton. Yarim ton — eng kichik qadam, qoʻshni klavish. Ton — ikki yarim ton. Qisqa qadamlar III va IV hamda VII va I pogʻonalar orasida turadi. Do notasidan bu formula faqat oq klavishlarga tushadi. Sol dan — endi yoʻq: yettinchi tovush fa-diyez boʻlishi kerak, aks holda tonika oldida yarim ton chiqmaydi. Qator boshidagi belgilar shundan kelib chiqadi.</p>
${lab('majsteps')}
<h3>Barqaror va beqaror pogʻonalar</h3>
<p>I, III va V pogʻonalar [[stable|barqaror]]: ularda toʻxtash mumkin va bu osoyishta yangraydi. Qolgan pogʻonalar — II, IV, VI va VII — beqaror: ularda musiqa goʻyo osilib qoladi va davomini soʻraydi. Har biri eng yaqin barqaror qoʻshnisiga intiladi: VII — yuqoriga, I ga (bu eng kuchli tortilish), IV — pastga, III ga, VI — pastga, V ga, II — pastga, I ga yoki yuqoriga, III ga. Tonikaning qoʻshnilari VII va II [[leadingtone|kirish tovushlari]] deyiladi.</p>
${lab('pull')}
<p>Uchta pogʻona qolganlaridan muhimroq: I — tonika, IV — subdominanta, V — dominanta. Qoʻshiqning uchta bosh akkordi ularda quriladi.</p>
<h3>Tetraxordlar</h3>
<p>[[tetrachord|Tetraxord]] — gammaning toʻrtta qoʻshni tovushi. Major gamma «ton — ton — yarim ton» formulali ikkita bir xil yarmidan iborat, ular orasida esa bir ton qadam. Do majorda bular do-re-mi-fa va sol-lya-si-do. Do majorning yuqori yarmi — sol majorning pastki yarmi; yangi yuqori yarmi fa-diyez qoʻshadi. Shunday qilib har bir keyingi gamma bitta diyezga koʻproq oladi. Boshqa tetraxordlar ham bor: minor, frigiy, garmonik.</p>
${lab('tetra')}
<h3>Minor: uch turi</h3>
<p>Minorda qisqa qadamlar boshqa joylarda: II va III hamda V va VI pogʻonalar orasida. Minor uch xil boʻladi. Tabiiy — oddiy, oʻzgarishsiz. Garmonik — VII pogʻonasi koʻtarilgan: u tonikadan yarim ton past boʻlib qoladi va unga kuchli intiladi, VI va VII orasida esa «sharqona» tusli keng qadam paydo boʻladi. Melodik — yuqoriga harakatda VI va VII koʻtarilgan; klassik musiqada pastga u tabiiy kabi chalinadi.</p>
<p>Major va minorni birinchi uch pogʻonadan ajratish oson. Majorda ular orasida ketma-ket ikki ton, minorda II va III orasida yarim ton turadi. Aralash varianti ham bor — [[harmmaj|garmonik major]]: VI pogʻonasi pasaytirilgan major.</p>
${lab('minors')}
${key('Lad — shunchaki notalar toʻplami emas, ularning munosabatlari: tonika, osoyishta va beqaror pogʻonalar va ular orasidagi tortilishlar. Shuning uchun boshqa notadan chalingan kuy tanish boʻlib qoladi.')}
`,
keys: `
<p>[[keyT|Tonallik]] — muayyan notaga qoʻyilgan lad: tonika va major yoki minor. Do major, lya minor, mi-bemol major — turli tonalliklar. Gitaraga sol, re, mi va lya qulay, puflama cholgʻularga — bemolli tonalliklar, xonandaga esa qoʻshiq juda baland yoki past ketmaydigan tonallik.</p>
<h3>Kalit belgilari</h3>
<p>Tonallikning diyez va bemollari har bir qator boshida, kalitdan keyin darhol yoziladi. Bular kalit belgilari: ular butun asarda amal qiladi. Diyezlar tartibi doim bir xil: fa, do, sol, re, lya, mi, si. Bemollar tartibi — teskari: si, mi, lya, re, sol, do, fa. Belgilar boʻyicha major tonallikni topish oson. Diyezlarda: oxirgi diyez tonikadan yarim ton past. Bemollarda: oxiridan ikkinchi bemol — tonikaning oʻzi. Bitta bemol — fa major. Har bir belgilar toʻplami ikki tonallikka mos: majorga va unga parallel minorga.</p>
${lab('keysig')}
<h3>Parallel va nomdosh</h3>
<p>[[relkey|Parallel tonalliklar]] — belgilari bir xil major va minor: do major va lya minor, sol major va mi minor. Minor tonikasi major tonikasidan uch yarim ton pastda. Qoʻshiq bandi minorda, naqarot esa parallel majorda yangrashi mumkin. [[parkey|Nomdosh tonalliklar]] — tonikasi bir xil major va minor: do major va do minor. Ularning belgilari turlicha: do majorda belgi yoʻq, do minorda — uchta bemol.</p>
<h3>Hammasi boʻlib nechta tonallik</h3>
<p>Major tonalliklar — oʻn beshta, minorlari ham oʻn beshta; ularda noldan yettitagacha belgi bor. Lekin ulardan uch jufti bir xil yangraydi, faqat turlicha yozilgan. Masalan, fa-diyez major va sol-bemol major bir xil klavishlarda chalinadi.</p>
<h3>Kvinta doirasi</h3>
<p>Tonalliklar har bir keyingisi kvintaga (yetti yarim tonga) yuqoriroqdan boshlanadigan qilib tizilsa, [[circle|kvinta doirasi]] hosil boʻladi. Doiradagi qoʻshnilar faqat bitta belgi bilan farq qiladi. Soat strelkasi boʻyicha diyezlar, teskari — bemollar qoʻshiladi va oʻn ikki qadamdan keyin doira yopiladi.</p>
${lab('circle')}
${tip('Gamma yoki akkordni doira boʻylab, har safar keyingi tonallikda chalish foydali: shunda oʻn ikkalasi ham oʻtiladi.')}
<h3>Tonalliklar qardoshligi</h3>
<p>[[kinship|Qardosh tonalliklar]] berilgan tonallikdan koʻpi bilan bitta belgi bilan farq qiladi. Do majorda ular beshta: lya minor (parallel), sol major va mi minor (doiradagi oʻngdagi qoʻshni va uning paralleli), fa major va re minor (chapdagi qoʻshni va uning paralleli). Qardosh tonallikka oʻtish yumshoq yangraydi.</p>
${lab('related')}
<h3>Bitta tovush — turli pogʻonalar</h3>
<p>Bitta nota turli tonalliklarda turli rollarni oʻynaydi. Do notasi — do majorda I pogʻona, sol majorda IV pogʻona, fa majorda V pogʻona va hokazo. Xuddi uyda — oʻgʻil, ishda esa — boshliq boʻlgan odam kabi.</p>
${lab('degreeof')}
<h3>Transpozitsiya</h3>
<p>[[transpose|Transpozitsiya qilish]] — musiqani oʻzini oʻzgartirmay boshqa tonallikka koʻchirish. Usullari ikkita. Birinchisi — pogʻonalar boʻyicha: kuy qaysi pogʻonalar bilan yurishini aniqlab, oʻsha pogʻonalarni yangi tonallikda chalish. Ikkinchisi — masofa boʻyicha: har bir notani bir xil sondagi yarim tonga siljitish. Ilovada buni tugma bajaradi, lekin xayolan transpozitsiya qila olish eshitib chalishga yordam beradi.</p>
${lab('transp')}
${key('Tonallik — bu tonika va lad. Belgilar gamma formulasidan kelib chiqadi, kvinta doirasi qoʻshnilarni koʻrsatadi, qardosh tonalliklar esa — eng yaqin va tabiiy oʻtishlar.')}
`,
melody: `
<p>[[melody|Kuy]] — bitta ovoz kuylaydigan musiqiy fikr. Unda alohida nota emas, notalar qanday bogʻlangani ifodali: kuy qayoqqa boradi — yuqorigami yoki pastga, qayerda tezlashadi, qayerda toʻxtab dam oladi.</p>
<h3>Motiv, ibora, jumla, period</h3>
<p>Kuy nutq soʻz va gaplarga boʻlingani kabi qismlarga boʻlinadi. [[motif|Motiv]] — eng kichik boʻlak, odatda taktdan qisqa yoki bir takt, bitta urgʻu bilan. Bir nechta motiv [[phrase|iborani]] tashkil etadi. Ibora oxiri uzun nota yoki pauzadan eshitiladi — xonanda nafas oladigan joyda. Ikki-uch ibora jumlani, ikki jumla esa [[period|periodni]] — tugallangan musiqiy fikrni hosil qiladi. Odatda birinchi jumla notinch, savol kabi tugaydi, ikkinchisi esa — tonikada, javob kabi.</p>
${lab('period')}
<h3>Kuy kadensiyalari</h3>
<p>[[mcad|Kadensiya]] — iboraning yakuni. Uni akkordlarsiz ham, kuyning oxirgi notalaridan bilish mumkin. Toʻliq kadensiya tonikada tugaydi (masalan, VII — I yoki II — I): nuqta kabi yangraydi. III yoki V pogʻonadagi yakun osoyishta, lekin unchalik qatʼiy yangramaydi. Yarim kadensiya — beqaror pogʻonada, koʻpincha V yoki VII da toʻxtash: ibora savol kabi yangraydi va davomini kutadi.</p>
${lab('cadmel')}
<h3>Sekvensiya</h3>
<p>[[sequenceT|Sekvensiya]] — bitta motivni boshqa notadan, yuqoriroq yoki pastroqdan, zinapoya qadamlari kabi takrorlash. Motiv har safar aynan bir xil masofaga siljitilsa, kuy tonallikdan tonallikka oʻtadi. Sekvensiya — kuyni rivojlantirishning eng koʻp uchraydigan usullaridan biri: klassikada ham, jaz improvizatsiyasida ham.</p>
${lab('sequence')}
<h3>Takrorlar va oddiy shakllar</h3>
<p>[[reprise|Repriza]] — takt chizigʻi yonidagi ikki nuqta: shunday belgilar orasidagi qism yana bir marta chalinadi. [[volta|Voltalar]] — «1» va «2» raqamli qavslar: birinchi safar 1 raqami ostidagi yakun, takrorda — 2 raqami ostidagisi chalinadi. D.C. (da capo) — «boshidan», D.S. (dal segno) — «𝄋 belgisidan» degani. Al Coda — 𝄌 belgisigacha chalib, [[coda|kodaga]], asar yakuniga oʻtish.</p>
<p>Qoʻshiqning eng koʻp uchraydigan shakli — [[verseform|kuplet shakli]]: bir xil musiqa yangi soʻzlar bilan takrorlanadi, har bir banddan keyin esa naqarot yangraydi.</p>
${key('Kuy iboralar bilan nafas oladi. Uni mazmunli chalish — ibora qayerda boshlanishi, qayoqqa borishi va nima bilan tugashini — savol bilanmi yoki javob bilanmi — tushunish demakdir.')}
`,
perform: `
<p>Notalar qaysi tovush va qanday choʻzimda chalinishini koʻrsatadi. Qanday chalish esa — tez yoki sekin, qattiq yoki ohista, ravon yoki uzib — notalar ustida soʻzlar va belgilar bilan yoziladi. Anʼanaga koʻra soʻzlar italyancha yoziladi: ularni butun dunyo musiqachilari tushunadi.</p>
<h3>Temp</h3>
<p>[[tempo|Temp]] — musiqa tezligi, yaʼni bir daqiqada nechta hissa yangrashi. U asar boshida soʻz bilan, baʼzan metronom uchun raqam bilan birga yoziladi. Sxemadagi raqamlar — taxminiy.</p>
${lab('tempo')}
<p>Temp asar ichida oʻzgarishi mumkin. Accelerando — asta-sekin tezlashtirish. Ritardando va rallentando — asta-sekin sekinlashtirish. A tempo — avvalgi tempga qaytish. Molto — juda, più mosso — jonliroq, meno mosso — osoyishtaroq. Rubato — erkin temp: baʼzi notalar biroz choʻziladi, boshqalari biroz tezlashtiriladi.</p>
${tip('Yangi asarni koʻrsatilgan tempdan sekinroq oʻrganib, joy toza chiqa boshlaganda metronomda bir necha zarbadan qoʻshib borish qulay.')}
<h3>Kuch</h3>
<p>[[dynamics|Dinamika]] — ovoz kuchi va uning oʻzgarishlari. Belgilar: pp — juda ohista, p — ohista, mp — oʻrtacha ohista, mf — oʻrtacha qattiq, f — qattiq, ff — juda qattiq. Asta-sekin kuchaytirish — crescendo, u ochiluvchi «vilka» bilan chiziladi. Asta-sekin susaytirish — diminuendo, yopiluvchi «vilka» bilan. Nota ustidagi &gt; belgisi — aksent: bu nota ajratiladi. Har bir iborada bitta bosh nota bor, qolganlari unga olib boradi.</p>
${lab('dyn')}
<h3>Shtrixlar</h3>
<p>[[articulation|Shtrixlar]] — tovushlarning bir-biri bilan qanday bogʻlanishi. Legato — bogʻlab, bir nota boshqasiga ravon oʻtadi; bunday notalar ustida yoy chiziladi. Staccato — uzib, qisqa; nota ustiga nuqta qoʻyiladi. Tenuto — notani toʻliq ushlab turish; ustiga chiziqcha qoʻyiladi. Torli cholgʻularda pizzicato bor — chertib chalish. Turli shtrixlar bilan bitta motiv goh nozik, goh tetik yangraydi.</p>
${lab('artic')}
<h3>Bezaklar</h3>
<p>[[ornament|Melizmlar]] — tovushning kichik bezaklari. Forshlag — asosiy notadan oldingi qisqa tez notacha, u mayda nota bilan yoziladi. [[trill|Trel]] — notaning yuqoridagi qoʻshnisi bilan tez almashinishi. Mordent — asosiy, qoʻshni va yana asosiy, bitta tez harakat bilan. Gruppetto — asosiy tovush atrofidagi toʻrt tovushli qisqa «jingalak». Jazda ular deyarli yozilmaydi — musiqachilar ularni oʻzlari, uslubga qarab qoʻshadi.</p>
${lab('orn')}
<h3>Xarakter</h3>
<p>Notalar ustida koʻpincha qanday kayfiyatda chalish yoziladi: dolce — nozik, cantabile — ohangdor, espressivo — ifodali, leggiero — yengil, maestoso — salobatli, tranquillo — osoyishta, agitato — hayajonli, scherzando — hazilomuz.</p>
${key('Temp, kuch, shtrixlar va bezaklar notalarni musiqaga aylantiradi. Belgilar italyancha yoziladi, lekin eshitish hal qiladi: bir xil notalarni juda turli xarakterda chalish mumkin.')}
`,
};
