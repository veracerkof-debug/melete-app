// Учебник (uz), часть 3: Гармония джаза. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — перевод ru/p3.js (собственный пересказ: «Джазология» (основа), Левайн — «The Jazz Theory Book» и «The Jazz Piano Book»).
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';
// ikkinchi fikr: boshqa muallif boshqacha qaraydi — ikki nuqtai nazar yonma-yon
const two = (who, t) => '<aside class="btwo"><b>Ikkinchi fikr · ' + who + '</b>' + t + '</aside>';

export const S = {
  'turn.t10': 'Demeron: I – V7/♭VI – ♭VI – ♭II7', 'turn.t11': 'K3 ga yuqoriga: I – VII7 – III – V7', 'turn.t12': 'Pogʻonalar boʻylab: I – ii – iii – IV', 'turn.t13': 'Barron: hammasi dominanta iii – VI – II – V',
  'ana.a8': 'Qismlar chegarasi: ii–V oʻqilmaydi',
  'rh.r13': 'ii → ø', 'rh.r13n': 'Minor ii yarim kamaytirilganga aylandi, V — ♭9 bilan: ii ning kvintasi (♭5) dominantaning ♭9 iga oʻtadi. Kuyda ii ustida 5 yoki 6 boʻlsa, mumkin emas.',
  'rh.r14': 'ii–V → ikkilamchi dominantalar', 'rh.r14n': 'ii–V juftliklarining minor akkordlari alteratsiyali dominantalarga aylandi: V akkordlarni ii ga qaraganda ancha boyroq alteratsiya qilish mumkin.',
  'rh.r15': 'Ikkita oʻtuvchi dominanta', 'rh.r15n': 'A7 dan oldin yarim tonlab ikkita dominanta (B7, B♭7) qoʻyilgan — har biri oʻsha uzunlikda: V7/iii, SubV7/vi, V7/ii.',
  'rh.r16': 'ii–V oʻrniga sus', 'rh.r16n': 'Butun ii–V juftligi dominanta asosidagi bitta sus-akkordga yigʻilgan (Em7 A7 → A7sus4♭9, Dm7 G7 → G7sus4).',
  'rh.r17': 'Ellington kadensiyasi', 'rh.r17n': 'Tonika basi ustidagi ♭VI7 toʻgʻridan-toʻgʻri I6 ga yechiladi («nemis sekstasi») — yumshoq, «orkestrcha» yakun.',
  'rh.r18': 'Demeron aylanmasi', 'rh.r18n': 'I–vi–ii–V: barcha akkordlar — dominantalar, keyin har biri triton almashtirish bilan almashtirilgan. Bas katta tersiyalar va yarim tonlar boʻylab yuradi.',
  'la.n.m7b5': 'Chap qoʻl bilan ø ning besh turi: oddiy A va B, shuningdek 1–11–♭5–♭7, ♭5–♭7–9–11 va 11–♭5–♭7–9. Tabiiy 9 — lokriy ♮2 dan.', 'la.n.7b9': 'Oddiy dominanta kabi, lekin 9 ♭9 gacha pasaytirilgan: 3–13–♭7–♭9 yoki ♭7–♭9–3–13.',
  'la.n.7s5': '13 oʻrniga — ♭13 (♯5): 3–♭13–♭7–9.', 'la.n.7alt': 'Ikkala nona va ♭13: 3–♭13–♭7–♯9. Har bir notasi bilan triton yuqoridagi dominanta joylashuviga mos: «alt — triton almashtirish joylashuvi».',
  'la.n.7s11': '♯11 ga eng yaqin tovush (odatda tersiya) ♯11 ga siljitiladi: ♭7–9–♯11–13; tersiyali variant ham bor: ♭7–3–♯11–13.', 'la.n.7s9': 'Kvinta bilan va 13 siz: 3–5–♭7–♯9. Pastda tersiya boʻlsa, kuchliroq yangraydi.',
  'la.n.mmaj7': 'Kvarta pastdagi 7♯11 joylashuvi bilan bir xil: Dm(maj7) = G7♯11.', 'la.n.d7': 'Yuqori tovushi tonga koʻtarilgan kamaytirilgan septakkord: 7♭9 joylashuvi hosil boʻladi — oʻsha kamaytirilgan gamma yangrashi, lekin «oʻtkirroq».',
  'la.n.7sus4': 'Uch tovushli 1–4–♭7 yoki V asosi ustidagi ii joylashuvi (Gsus = Dm7/G).', 'la.n.phr': 'Frigiy sus♭9: 1–♭9–4–5 — zich, «ispancha» yangrash.',
  'la.sub': '{r} ustida oʻsha joylashuv',
  'ab.start': 'boshlanish', 'ab.second': 'asos sekundaga — tur oʻsha', 'ab.fourth': 'asos kvarta/kvintaga — tur oʻzgaradi', 'ab.third': 'asos tersiyaga — eng yaqini', 'ab.same': 'oʻsha asos', 'ab.hint': 'matn tahrirlanadi: akkordlar boʻsh joy bilan, taktlar — «|»',
  'ov2.hint': 'A turidagi C13 joylashuvi (3–13–♭7–9) turli baslar ustida', 'ov2.all': 'Beshalasi ketma-ket', 'ov2.v13': 'C13: joylashuv oʻz koʻrinishida — 9 va 13 li dominanta.', 'ov2.valt': 'Triton yuqoridagi bas ustida — F♯7alt: oʻsha triton juftligi, tarangliklar oʻrin almashadi.',
  'ov2.hd': 'Katta tersiya yuqoridagi bas ustida — Em7♭5 (Em11♭5): yarim kamaytirilgan.', 'ov2.phr': 'Kichik tersiya pastdagi bas ustida — A7sus4♭9: frigiy sus.', 'ov2.m69': 'Kvarta pastdagi bas ustida — Gm6/9: tonika minori. Beshalasi ham — G melodik minor tovushlari.',
  'hd.any': 'istalgan', 'hd.top': 'yuqorida {d}', 'hd.none': 'Bu yuqori nota uchun joylashuvlar yoʻq.', 'hd.lr': 'Binafsha — chap qoʻl, yashil — oʻng qoʻl.', 'hd.iivi': 'ii–V–I: barcha ovozlar pastga',
  'hd.sw': 'So What', 'hd.kb': 'Kenni Barron', 'hd.st3': 'Tersiyalar ustma-ust', 'hd.jm7': 'ChQ asosiy tonsiz + OʻQ', 'hd.swM': 'So What (maj7)', 'hd.q69': 'Kvartalar 6/9', 'hd.jmaj': 'ChQ 7–3–6 + OʻQ', 'hd.triD': 'Asos ustida II uchtovushi',
  'hd.swL': 'So What (lidiy)', 'hd.jlyd': 'ChQ 3–6 + OʻQ ♯11', 'hd.q6': 'Kvartalar: olti tovushli dominanta', 'hd.j7': 'ChQ 3–♭7 + OʻQ', 'hd.usII': 'II yuqori tuzilmasi', 'hd.usbVI': '♭VI yuqori tuzilmasi', 'hd.jalt': 'ChQ 3–♭7–♭9 + OʻQ',
  'hd.usVI': 'VI yuqori tuzilmasi', 'hd.dd': 'Qoʻsh kamaytirilgan', 'hd.susT': 'Ton pastdagi uchtovush', 'hd.jsus': 'ChQ 1–♭7 + OʻQ 9–11–13', 'hd.jhd': 'ChQ 1–4–♭5–♭7 + OʻQ',
  'hd.n.sw': 'Uchta kvarta va yuqorida katta tersiya. Yuqorida 5 — kuy m7 ning kvintasida boʻlganda shunday qoʻyiladi.', 'hd.n.kb': 'Qoʻllarda ikkita bir xil «kvinta», bosh barmoqlar orasida — yarim ton. Kuyda 11 boʻlgan m7 uchun.',
  'hd.n.st3': 'Tersiyalar boʻylab 11 gacha akkord: 1–♭3–5 | ♭7–9–11 — ikki qoʻlda butun doriy tovushqator.', 'hd.n.jm7': 'Chap qoʻl asosiy tonsiz (♭3–5–♭7), oʻng qoʻl 9, 5 va yuqorida asosiy tonni qoʻshadi.',
  'hd.n.swM': 'maj7 tersiyasidan oʻsha So What shakli: yuqorida katta septima.', 'hd.n.q69': 'Tersiyadan sof kvartalar boʻylab besh tovush: yuqorida asosiy toni bilan 6/9 — eng ochiq major yangrash.',
  'hd.n.jmaj': 'Chap 7–3–6, oʻng 9–5: zich va yumshoq maj7.', 'hd.n.triD': 'Bas ustida asosiy tondan bir ton yuqoridagi uchtovush — lidiy rangi: 9, ♯11, 13.',
  'hd.n.swL': 'Septimadan So What shakli: yuqorida ♯11 — lidiy kuy uchun.', 'hd.n.jlyd': 'Chap 3–6, oʻng ♯11–7–3: asosiy tonsiz lidiy rangi.',
  'hd.n.q6': '♭7–3–13 | 9–5–1: «hamma chaladigan olti tovushli dominanta»; bluzning birinchi akkordi sifatida yaxshi.', 'hd.n.j7': 'Chap — 3–♭7 tritoni, oʻng — 3, 13, 9.',
  'hd.n.usII': 'Triton ustida asosiy tondan bir ton yuqoridagi uchtovush: 9, ♯11, 13 — lidiy dominanta.', 'hd.n.usbVI': 'Kichik seksta yuqoridagi uchtovush: ♭13, 1, ♯9 — alt.', 'hd.n.jalt': 'Chap 3–♭7–♭9, oʻng ♯5–♭7–♯9: pastda ♭9 li alt.',
  'hd.n.usVI': 'Katta seksta yuqoridagi uchtovush: 13, ♭9, 3 — 13♭9 dominanta.', 'hd.n.dd': 'Ikkita kamaytirilgan septakkord — har bir qoʻlda bittadan: butun kamaytirilgan gamma; kichik tersiyalar boʻylab siljiydi.',
  'hd.n.susT': 'Asosiy tondan bir ton pastdagi major uchtovush 2-aylanmada bas ustida: Gsus = F/G.', 'hd.n.jsus': 'Pastda asosiy ton va ♭7, yuqorida 9–11–13.', 'hd.n.jhd': 'Chap 1–4–♭5–♭7 (♭3 oʻrniga 11), oʻng 9–11 — yumshoq ø.',
  'sw.dia': 'Lad boʻylab', 'sw.chr': 'Yarim tonlab', 'sw.base': 'asosiy', 'sw.inv': '{n}-ayl.', 'sw.walk': 'Borib-qaytib siljish',
  'sw.n.m7': 'D bas ustida — Dm7: yuqorida {top}. Re doriy tovushlari boʻylab yuqoriga-pastga siljish — garmoniya turadi, ovozlar esa harakatlanadi.', 'sw.n.maj7': 'B♭ bas ustida — asosiy tonsiz B♭maj7: yuqorida {top}.', 'sw.n.lyd': 'E♭ bas ustida — E♭maj7♯11: yuqorida {top}, lidiy rangi.',
  'mg.hint': 'katakka teginish — I → akkord → I', 'mg.note': '♭6 li keng tarqalgan oʻzlashtirishlar: vii°7, iiø, iv, ♭VI; ♭3 li: i, ♭III, ♭VII. Nomdosh minor akkordlari unga qarindosh tonalliklarga modulyatsiyani ham osonlashtiradi.',
  'mg.harm': 'Garm. minor', 'mg.mel': 'Melod. minor', 'mg.nat': 'Tabiiy minor', 'mg.dor': 'Doriy', 'mg.phr': 'Frigiy', 'mg.lyd': 'Lidiy', 'mg.mix': 'Miksolidiy', 'mg.loc': 'Lokriy',
  'dk.n.b9': 'V7♭9 (kamaytirilgan «yarim ton — ton») istalgan joyga borishi mumkin, koʻpincha — kvintaga pastga. Kuyda tabiiy 9 yoki ♭13 boʻlsa, mumkin emas. Egizagi — {tw}.',
  'dk.n.alt': 'V7alt va uning triton egizagi {tw} — bitta melodik minordan, maqsadlari ham umumiy. Kuyda tabiiy 9 yoki 13 boʻlsa, mumkin emas.',
  'dk.n.s11': 'V7♯11 yumshoq ravishda yarim tonga pastga va oʻsha asosdagi ii ga boradi; egizagi — {tw}. Kuyda ♭9, ♯9 yoki ♭13 boʻlsa, mumkin emas.',
  'dk.q5': 'kvintaga pastga — klassik yechilish', 'dk.q5m': 'kvintaga pastga, minorga', 'dk.semi': 'yarim tonga pastga', 'dk.semiUp': 'yarim tonga yuqoriga', 'dk.b3down': 'katta tersiyaga pastga', 'dk.q4down': 'kvartaga pastga', 'dk.toneUp': 'tonga yuqoriga', 'dk.iiSameRoot': 'oʻsha asosdagi minor ii ga (II7 → ii)',
  'tc.mel': 'Kuy', 'tc.is': 'kuy — {d}', 'tc.ok': 'akkord tovushi yoki taranglik', 'tc.alt': 'alteratsiya — alt gammasi yoki ♭9 kerak', 'tc.bad': 'akkord bilan toʻqnashadi',
  'tc.note': 'Bas xromatik boʻlib qolsa yoki kuy notasi qiziqroq boʻlib qolsa (masalan, 9 → ♯5), almashtirish oʻzini oqlaydi. Nota «noqulay»ga aylansa — almashtirish yaramaydi.',
  'on.note': 'Nota', 'on.hint': 'bu nota akkord tovushi yoki taranglik boʻlgan akkordlar; teginish — nota ostidagi akkord',
  'tr2.mel': 'kuyda {d}', 'tr2.up': 'tonika yarim tonga yuqoriga: kuydagi asosiy ton katta septimaga, kvinta — ♯11 ga aylanadi', 'tr2.s5': 'Δ♯5: kuyning ikkala tovushi katta tersiya yuqoridagi uchtovushda yotadi', 'tr2.tri': 'asosiy ton ustida yarim ton pastdagi uchtovush (B/C), keyin yana C ga', 'tr2.b6': 'maj7♭6 — garmonik major: kvinta ostida sirli rang', 'tr2.lyd': '4 oʻrniga ♯11 — lidiyni deyarli doim qoʻllash mumkin',
  'ce.q': 'kvintaga pastga — eng yaqin yoʻl', 'ce.tone': 'tonga pastga', 'ce.semi': 'yarim tonga pastga', 'ce.b3': 'katta tersiyaga pastga — Koltreyn yoʻli', 'ce.m3': 'kichik tersiyaga pastga — oktavani toʻrtga boʻlish',
  'cf.count': 'Countdown: toʻrt taktga ii–V–I', 'cf.lady': 'Lady Bird (Demeron)', 'cf.barron': 'Kenni Barron', 'cf.up3': 'Katta tersiyalar boʻylab yuqoriga', 'cf.maj3': 'Katta tersiyalar boʻylab uchta maj7', 'cf.min3': 'Kichik tersiyalar boʻylab markazlar',
  'cf.n.count': 'ii – V/♭VI – ♭VI – V/III – III – V – I: birinchi ii saqlanadi, markaz uch marta katta tersiyaga pastga siljiydi, har bir tonikaga — oʻz dominantasi.', 'cf.n.lady': 'I – V7/♭VI – ♭VImaj7 – ♭II7 – I: markaz katta tersiyaga pastga ketadi va qaytadi.',
  'cf.n.barron': 'iii – V7/♭VI – ♭VImaj7 – SubV – I: vi–ii–V oʻrnida oʻsha yurish.', 'cf.n.up3': 'I – VII7 – III – V7 – I: markaz katta tersiyaga koʻtariladi va qaytadi.', 'cf.n.maj3': 'Dominantasiz uchta maj7 oktavani uch qismga boʻladi — Koltreyn va Red Garlend mavzuni shunday tugatishgan.',
  'cf.n.min3': 'Kichik tersiyalar (va tritonlar) boʻylab toʻrtta markaz, har biriga — oʻz ii–V si.',
  'lv.n': '{v}7 oʻrniga — {v} bas ustida {b} uchtovushi: 1, ♭5, ♭7, ♭9 tovushlari — katta tersiya pastdagi {k} tonalligidan tersiyasiz dominanta. Yuqorida — {p} pentatonikasi.', 'lv.pent': '{p} pentatonikasi bilan',
};

export const TERMS = {
  lhAlt: ['Chap qoʻl bilan alteratsiyalar', '7♭9, 7alt, 7♯11, ø va boshqalar uchun asosiy tonsiz joylashuvlar; chap qoʻldagi alt triton almashtirish joylashuviga mos keladi.', 'voice'],
  abRule: ['A/B qoidasi', 'asos sekundaga siljisa — joylashuv turi saqlanadi, kvarta yoki kvintaga — oʻzgaradi, tersiyaga — tanlov boʻyicha.', 'voice'],
  sowhatC: ['So What akkordi', 'uchta sof kvarta va yuqorida katta tersiya; bitta shakl m7, maj7 va lidiy akkordga xizmat qiladi.', 'hands'],
  blockch: ['Kuy ostidagi joylashuv', 'joylashuvni yuqorida (kuyda) turgan akkord pogʻonasi boʻyicha tanlash.', 'hands'],
  dblDim: ['Qoʻsh kamaytirilgan', 'ikkita kamaytirilgan septakkord — har bir qoʻlda bittadan; butun kamaytirilgan gamma.', 'hands'],
  modalSub: ['Modal asarda almashtirish', 'akkord funksional tortilishsiz, oʻsha lad tovushlaridan iborat istalgan akkord bilan almashtiriladi.', 'reharm'],
  anyBass: ['Istalgan bas ustida akkord', 'reharmonizatsiya usuli: kuy notasi ostida bas tanlanadi, keyin bu nota akkord tovushi yoki taranglik boʻladigan akkord turi.', 'reharm'],
  tonalCenter: ['Tonal markaz', 'asar ichidagi vaqtinchalik tonallik; bitta tonallikning bir nechta akkordi bitta markaz sifatida oʻqiladi.', 'centers'],
  locV: ['Lokriy dominanta', 'Makkoy Tayner usuli: V7 oʻrniga V asosi ustida ♭II uchtovushi (A♭/D → G); tersiyasiz dominanta.', 'centers'],
};

export const CH = [
{ id: 'iivi', t: 'ii–V–I', s: 'Jazning asosiy aylanmasi', src: 'jazzology,levine', h: `
<p>[[iivi|ii–V–I]] — standartlarning katta qismining karkasi. Asoslar kvintalab pastga yuradi, funksiyalar — S → D → T. ii–V–I ni barcha tonalliklarda eshitib, chalib va improvizatsiya qila olgan kishi ishning yarmini bajargan. Odatda aylanma ikki yoki toʻrt taktni egallaydi. Kadensiya yangrashi uchun I va V da 4, ii da esa 6 taʼkidlanmaydi: bu tovushlar keyingi akkordni vaqtidan oldin «oshkor qiladi».</p>
<h3>Yoʻnaltiruvchi tonlar</h3>
<p>ii–V–I dagi har bir akkordning tersiya va septimasi qadam bilan bogʻlanadi: ii ning septimasi V ning tersiyasiga aylanadi (yarim ton pastroq), V ning septimasi — I ning tersiyasiga. Bular [[guide|yoʻnaltiruvchi tonlar]]: ikki chiziq bir-birini almashtiradi, qoʻl deyarli qimirlamaydi. Jazdagi ovoz yetaklashning asosiy mexanizmi — va boshqa solist ortidan chaladigan puflama cholgʻuchi uchun tayyor fon chizigʻi.</p>
${lab('guide')}
${tip('3 va 7 ni chap qoʻl bilan klavishlarga qaramasdan butun doira boʻylab chalish foydali. Keyin basda asosiy ton qoʻshiladi. Keyin — xuddi shuni bas ustida oʻng qoʻl bilan.')}
<h3>Barcha tonalliklarda ii–V–I</h3>
<p>Avval — kvinta doirasi boʻylab, keyin tasodifiy tonalliklarda: sahnada tonalliklar tartib bilan kelmaydi.</p>
${lab('iivitable')}
<h3>Aylanmalar</h3>
<p>Qism oxirida garmoniya boshiga qaytadi — bu [[turnaround|aylanma]]. Asosiy I–vi–ii–V oʻnlab variantlarga aylanadi: vi VI7 ga (ikkilamchi dominanta — tortilish kuchliroq, alteratsiyalar koʻproq), I — iii ga, dominantalar — triton almashtirishlarga oʻzgaradi. Tedd Demeron aylanmani katta tersiyalar boʻylab yoʻlga aylantirdi (Lady Bird: I – V7/♭VI – ♭VI – ♭II7), Kenni Barron esa toʻrtala akkordni dominanta qiladi. Uzun tonikani pianinochilar I–ii–iii–IV pogʻonalar boʻylab yurish bilan jonlantiradi; major akkorddan keyin koʻpincha kvarta yuqoridagi akkord keladi — maj7 yoki dominanta. Minorda aylanmalar xuddi shunday quriladi: i – viø – iiø – V7alt.</p>
${lab('turn')}
<h3>ii–V zanjirlari</h3>
<p>ii–V yechilishi shart emas: dominantadan keyin darhol boshqa tonallikdan yangi ii–V boshlanadi — zanjirning har bir halqasi uzilgan kadensiya kabi yangraydi. Koʻpincha zanjir tonga yoki yarim tonga pastga yuradi, quloqni esa yoʻnaltiruvchi tonlar yetaklaydi.</p>
${lab('chain')}
<h3>Toʻliq boʻlmagan ii–V</h3>
<p>Baʼzan maqsaddan faqat ii yoki faqat V yangraydi. Bu baribir maqsadga harakat va tahlilda xuddi shunday — strelka yoki qavs bilan belgilanadi. Koʻp marta takrorlanadigan yechilmagan ii–V — braziliya va afrokuba musiqasining ostinatosi (montuno): taktga ikki akkord yoki har taktga bitta akkord.</p>
` },
{ id: 'ana', t: 'Tahlil', s: 'Strelkalar, qavslar, ikkilamchi dominantalar, qismlar chegaralari', src: 'jazzology,levine', h: `
<p>Tahlil — garmoniyani til kabi oʻqish. Belgilar: <b>yaxlit strelka</b> — kvintaga pastga yechilgan dominanta; <b>uzuq-uzuq</b> — yarim tonga pastga (triton almashtirish); juftlik ostidagi <b>qavs</b> — ii–V. Akkord ostida uning roli yoziladi: pogʻona yoki V7/x («x ga dominanta»). Sxemaga istalgan ketma-ketlikni yozish mumkin — u uni belgilab beradi; ‖ belgisi qismlar chegarasini koʻrsatadi.</p>
${lab('ana')}
<p>Birinchi qadam uchun Levayn ongli soddalashtirishni taklif qiladi: m7 — bu ii, 7 — V, maj7 — I; alteratsiyalarga hozircha eʼtibor berilmaydi. ii–V, V–I va ii–V–I juftliklari topiladi va har bir guruh ustiga uning tonalligi yoziladi. Hatto «chalkash» mavzu ham qisqa tonalliklar ketma-ketligi boʻlib chiqadi. Har bir ii–V yechilmaydi va har bir V–I dan oldin ii kelmaydi.</p>
<h3>ii–V qayerda ii–V emas</h3>
<p>Dominanta qism chegarasi orqali ham yechiladi — strelka qoladi. Lekin ii–V juftligi chegara orqali oʻqilmaydi: |Fmaj7 Am7 ‖ D7 Gm7| da Am7 akkordi D7 ni tayyorlamaydi, balki F tonikasini davom ettiradi. Metr qoidasi ham bor: ii garmonik ritmning kuchli oʻrnida turadi. Har taktga bitta akkord boʻlsa, ii — toq taktlarda, V — juft taktlarda; taktga ikki akkord boʻlsa, ii — birinchi yarmida. Taktning ikkinchi yarmidagi m7 — katta ehtimol bilan ii emas.</p>
<h3>Ikkilamchi dominantalar</h3>
<p>Tonallikning viiø dan boshqa har bir akkordining oʻz dominantasi boʻlishi mumkin — [[secdom|ikkilamchi dominanta]]: V7/ii, V7/iii, V7/IV, V7/V, V7/vi. U oʻsha pogʻonadagi akkorddan bitta nota bilan farqlanadi: ii, iii va vi da tersiya koʻtariladi, I da septima pasayadi. Majorda: VI7 → ii, VII7 → iii, I7 → IV, II7 → V, III7 → vi. V7/vii boʻlmaydi: kamaytirilgan akkordni tonikallashtirib boʻlmaydi (xuddi shu sababdan minorda V7/ii yoʻq). Majordagi IV7 — ikkilamchi dominanta emas: kvintaga pastga u tonallikda yoʻq ♭VII ga olib boradi. Ikkilamchi dominanta yechilmasa ham nomini saqlaydi: C dagi A7 — doim V7/ii.</p>
<h3>Orqaga yurish</h3>
<p>Maqsadni orqaga dominantalar zanjiri bilan tayyorlash mumkin — [[backcycle|orqaga yurish]]: E7 → A7 → D7 → G7 → C. Yanada zichroq — har bir dominantadan oldin [[relii|bogʻliq ii]]: Bm7 E7 | Em7 A7 | Am7 D7 | Dm7 G7. Orqaga yurish rim raqamlari bilan odatda yozilmaydi — yoki qavsda yoziladi.</p>
<h3>Qoʻshni dominantalar</h3>
<p>Kvinta yurishisiz ketma-ket ikki dominanta (A♭7 → G7) triton almashtirish (A♭7 = SubV7/C) yoki yon siljish deb oʻqiladi. Bunday dominantalar (yoki yechilmagan ii–V) andozalar boʻyicha yuradi — yarim tonga, tonga, kichik yoki katta tersiyaga yuqoriga, tersiyaga pastga, — tonalliklarga ishora qiladi va yakuniy yechilishni kechiktiradi; usul Shuman va Shopenga borib taqaladi. alt va ♯11-dominantalar zanjirida har bir akkordni triton naridagi egizagi bilan yozish mumkin — bitta yurishning sakkiztagacha yozuvi boʻladi, ular esa deyarli bir xil yangraydi: farq faqat bas notasida.</p>
<h3>Dominanta sifatida °7</h3>
<p>Maqsaddan yarim ton pastdagi kamaytirilgan septakkord — asosiy tonsiz 7♭9 dominanta: C♯°7 → Dm7 = A7♭9 → Dm7. Tahlilda «°7 → ii» yoki vii°7/ii yoziladi. °7 faqat undan keyin uning toʻrt tovushidan istalganidan yarim ton yuqoridagi diatonik akkord kelsagina funksional hisoblanadi — °7 ning istalgan tovushi «asos» boʻlib chiqishi mumkin.</p>
${key('Avval ii–V juftliklari (qavslar), keyin dominantalar (strelkalar), keyin tonika qidiriladi. Strelkasiz va tonallikdan tashqari akkord — oʻzlashtirish yoki yangi tonallik.')}
` },
{ id: 'voice', t: 'Chap qoʻl joylashuvlari', s: 'Asos, asosiy tonsiz, A va B, alteratsiyalar, drop 2, kvartalar, klasterlar', src: 'jazzology,piano,levine', h: `
<p>[[voicing|Joylashuv]] — akkordning qaysi tovushlarini va qanday tartibda chalish. Yaxshi joylashuv toʻliq yangraydi, basga va solistga xalaqit bermaydi va keyingisiga silliq oʻtadi. Joylashuvlar umuman nima uchun kerak? Asosiy koʻrinishdagi akkordlar ketma-ket parallel kvintalar beradi, qoʻl asosiy tonlar ortidan sakraydi, ichki ovozlar yetaklanmaydi.</p>
<h3>Asos</h3>
<p>[[shell|Asos]]: asosiy ton + 3 + 7 yoki asosiy ton + 7 + 3. Turni aniq belgilaydigan eng kichik akkord. Ikki variant ii–V–I da almashinadi, shunda 3 va 7 qadam bilan yuradi. Basistsiz asosiy tonli bunday akkordlar — «Bad Pauell joylashuvlari» — oʻziga akkompanement qilishning asosiy usuli. Ikki qoʻl bilan: asosiy ton chapda, 3 va 7 — oʻngda; ii–V–I da bitta ovoz oʻzgaradi — septima yarim tonga tushib, tersiyaga aylanadi. Kuy 3 yoki 7 ning oʻzi boʻlsa, ortiqcha narsa qoʻshilmaydi, faqat shu nota yuqoriga qoʻyiladi; kuy taranglik boʻlganda toʻrtinchi tovush kerak. Birinchi qoʻshimchalar: ii ga — 5, V ga — 9 (bu bitta tovush, u akkord almashganda ushlab turiladi), I ga — 5 va 9.</p>
<h3>Asosiy tonsiz</h3>
<p>Basist boʻlsa, akkordda asosiy ton shart emas. Toʻrt tovushli [[rootless|asosiy tonsiz]] joylashuvlar — fortepiano akkompanementining asosi: <b>A turi</b> (pastdan yuqoriga 3–5–7–9) va <b>B turi</b> (7–9–3–5). ii–V–I da ular almashinadi — A–B–A yoki B–A–B, — va har bir ovoz tondan uzoq yurmaydi.</p>
${lab('voice')}
${two('Levayn', 'Tonikada A turida katta septima oʻrniga koʻpincha seksta olinadi: 3–5–6–9 (Bill Evans, Uinton Kelli); major uchun B turi — 7–1–3–5, asosiy ton ichkarida. 7–9–3–5 varianti oʻz-oʻzidan Cmaj7 emas, G6 kabi yangraydi — uni faqat oldingi G7 yoki basdagi asosiy ton qutqaradi. Sxemada B turidagi tonika endi 7–1–3–5 kabi yangraydi.')}
<p>Keyingi qaysi turni olishni [[abRule|A/B qoidasi]] («Jazzologiya») aytadi: asos sekundaga siljisa — tur saqlanadi; kvarta yoki kvintaga — oʻzgaradi; tersiyaga — tanlov boʻyicha, eng yaqiniga. A turi major va minor akkordlarda, B turi — dominantalarda ochiqroq yangraydi. Sxemaga istalgan ketma-ketlikni yozish mumkin — u turlarni tanlab, tanlovni tushuntiradi.</p>
${lab('abrule')}
${key('Ovoz yetaklash: umumiy tovushlar qoladi, qolganlari keyingi akkordning eng yaqin tovushiga yuradi. Septimaning yarim ton pastdagi tersiyaga oʻtishi — har qanday ii–V ning asosiy yurishi.')}
<h3>Diapazon</h3>
<p>Chap qoʻl akkordi taxminan kichik oktava re sidan birinchi oktava sol igacha toza yangraydi: chap qoʻl jimjilogʻini kichik oktava do si bilan birinchi oktava do si orasida tutish qulay. Pastroqda — gʻuvillash (ayniqsa tersiyalar), yuqoriroqda akkord solist registriga kirib ketadi. Eng yaqin variant chegaradan pastga tushsa, «choʻkib ketish»dan koʻra boshqa turga sakragan maʼqul. Koʻp joylashuvlar oʻz-oʻzidan chiqib ketadi — juda past yoki juda baland, — qolgan sevimlilari esa oʻz uslubining boshlanishiga aylanadi.</p>
<h3>Chap qoʻl bilan alteratsiyalar</h3>
<p>Oʻsha A/B tamoyili barcha alteratsiyalangan akkordlar uchun ishlaydi. ø besh usulda chalinadi; 7♭9 da 9 oʻrniga ♭9, 7♯5 da 13 oʻrniga ♭13, 7alt da — ikkala alteratsiya birdaniga olinadi; 7♯11 eng yaqin tovushni ♯11 ga siljitish bilan hosil boʻladi. Levaynning foydali maslahati: [[lhAlt|7alt joylashuvi har bir notasi bilan triton yuqoridagi dominanta joylashuviga mos keladi]] — «alt — triton almashtirish joylashuvi». m(maj7) kvarta pastdagi 7♯11 kabi yangraydi, °7 esa yuqori tovushi tonga koʻtarilsa, 7♭9 joylashuviga aylanadi.</p>
${lab('lhalt')}
<p>Bitta joylashuv bir vaqtning oʻzida bir nechta akkordga xizmat qilishi mumkin. A turidagi C13 joylashuvi (3–13–♭7–9) F♯7alt (triton almashtirish), Em7♭5, A7sus4♭9 va Gm6/9 uchun ham yaraydi: beshalasi ham — G melodik minor tovushlari. Funksiyalarda bu V13 = ii♭V7alt = viiø = III7sus4♭9 = iim6/9.</p>
${lab('onevoice')}
<h3>Drop 2 va drop 2-4</h3>
<p>Zich toʻrt tovushlining yuqoridan ikkinchi ovozi oktavaga tushirilsa, [[drop2|drop 2]] chiqadi: kengroq, saksofonlar seksiyasi kabi yangraydi. Drop 2-4 — ikkinchi va toʻrtinchi ovozlar tushirilgan. Bu joylashuvlar gitarachilar va ikki qoʻl bilan chalish uchun qulay; drop 2 katta oktava fa sidan ikkinchi oktava sol igacha boʻlgan diapazonda eng yaxshi yangraydi. Drop 2 kuyni qanday «blokli» qilishi haqida — «Aranjirovka» bobida.</p>
<h3>Kvartali joylashuvlar</h3>
<p>[[quartal|Kvartali akkord]] ochiq va zamonaviy yangraydi. Kvartali akkordlar koʻp maʼnoli: bitta joylashuv bir nechta akkordga mos keladi. Har qanday pentatonika kvartalarga yoyiladi, shuning uchun tonal kvartalar akkord pentatonikalaridan olinadi. Chap qoʻl uchun uch tovushli kvartalar: Imaj7 ustida — 2–5–1, 3–6–9, 6–9–5, 7–3–6; iim7 ustida — 1–4–♭7, 2–5–1, 4–♭7–♭3, 5–1–4, 6–9–5; V7 ustida — ♭7–3–6; tonika minori ustida — ♭3–6–9, 4–♭7–♭3; iiø ustida — 1–♭5–♭7, ♭5–1–4; V7alt ustida — ♭7–3–♭13 yoki 3–♭7–♯9. Tonal musiqada ovozlar orasida kichik nonadan qochiladi. Ikki qoʻl bilan besh va olti tovushli kvartalar — keyingi bobda.</p>
<h3>Chap qoʻl bilan uch tovushli joylashuvlar</h3>
<p>Tez templarda uch tovush yetarli: ii — 3–5–9, V — ♭7–3–13, I — 3–6–9, qoʻshni akkordlar umumiy tovushni ushlab turadi. Telonius Monkning pastida yarim tonli oʻz uch tovushli joylashuvlari bor va u ularni akkorddan emas, tonallikdan quradi: maj7 ustida — 7–1–3, major garmoniyasining istalgan boshqa akkordi (ii, V, sus, lidiy) ustida — tonallikning 3–4–6 si, melodik minor akkordlari ustida — uning tonalligining 2–3–5 i.</p>
<h3>Klasterlar va fragmentlar</h3>
<p>[[cluster|Klaster]] — sekundali zich akkord (9 va 3, 13 va ♭7 yonma-yon). Qoidalar: kichik sekunda hech qachon yuqoriga qoʻyilmaydi; pastki chegara — taxminan kichik oktava mi-bemoli; ohista yoki oʻrtacha kuch bilan chalinadi. Klasterlar ayniqsa minorda, iiø da yaxshi. Fragment — pastida yarim tonli (kamroq — tonli) ikki-uch tovush: maj7 uchun 7–1–3, m7 uchun ♭7–1–♭3, ø uchun 4–♭5–♭7, sus uchun 4–5–♭7, sus♭9 uchun 1–♭2–4, 6/9 uchun 5–6–9. Kuchsiz va koʻp maʼnoli yangraydi — ayniqsa 3/4 da yaxshi; bitta uch tovushli fragment koʻp akkordlarga mos keladi, Bill Evansning B turi esa — ikki fragment yigʻindisi.</p>
<h3>Toʻrt afsona</h3>
<p>Levayn amalda afsona boʻlib chiqadigan toʻrtta «qoida»ni koʻrib chiqadi. «Ansambldagi pianinochi asosiy tonni chalmasligi kerak» — Pauell va Monk deyarli doim asosiy ton bilan chalishgan, Tayner va Barron — tez-tez; haddan oshirmaslik — ha, taqiqlash — yoʻq. «Dominantada 3 va 7 shart» — oddiy V7 uchun toʻgʻri, lekin har qanday alteratsiyadan keyin ular ahamiyatini yoʻqotadi. «Sus da tersiya olish mumkin emas» — mumkin, kvarta ustida. «Qiziq tovushlar (9, 11, 13) va zerikarli tovushlar (1 va 5) bor» — akkompaniator tovushi umumiy mozaikaning bir qismi xolos, asosiy ton esa eng goʻzal tovush boʻlishi mumkin.</p>
${tip('Kvinta doirasi boʻylab A turi, keyin B turi. Bir haftadan keyin — minor ii–V–i, yana bir haftadan keyin — alteratsiyalar. Maqsad — notalar haqida oʻylamaslik, akkord shaklini qoʻl ostida koʻrish.')}
` },
{ id: 'hands', t: 'Ikki qoʻl bilan joylashuvlar', s: 'So What, kvartalar, yuqori tuzilmalar, Barron, qoʻsh kamaytirilgan; kuy ostidagi joylashuv', src: 'piano,jazzology', h: `
<p>Ikki qoʻl bilan akkord kenglik oladi: chap qoʻl asosni (asosiy ton, 3–7, kvartalar), oʻng qoʻl — rang va kuyni ushlaydi. Bunday joylashuvlar oʻnlab, va Levayn qulay kalitni taklif qiladi: har biri uchun <b>yuqorida qaysi pogʻona turishini</b> eslab qolish. Shunda mavzuni oʻqiyotganda «bu akkordni qanday chalish kerak» degan savol «kuyda nima bor» degan savolga aylanadi — bu [[blockch|kuy ostidagi joylashuv]].</p>
${lab('hands')}
<h3>So What</h3>
<p>[[sowhatC|So What akkordi]] — uchta sof kvarta va yuqorida katta tersiya (D–G–C–F–A). Bitta shakl uchta akkordga xizmat qiladi: D bas ustida — Dm7 (yuqorida 5), B♭ ustida — asosiy tonsiz B♭maj7 (yuqorida 7), E♭ ustida — E♭maj7♯11 (yuqorida ♯11). Uning besh tovushi — pentatonika. Shaklning beshta aylanmasi bor: kichik tersiya oʻrin almashadi, bitta aylanmada esa tersiyalar umuman yoʻq — faqat kvartalar. Modal asarda shakl lad tovushlari yoki yarim tonlar boʻylab siljitiladi, garmoniya esa joyida turadi — bu parallel siljish. «Choʻzilgan» variantlar ham bor: ikki pastki nota tonga koʻtarilsa, kichik nonaning qorongʻi «tishlashi» paydo boʻladi, yanada yuqoriroq koʻtarilsa — qoʻllar bir-biridan ton va yarim ton masofasida boʻlib qoladi va yangrash «kosmik» tus oladi.</p>
${lab('sowhat')}
<h3>Besh va olti tovushli kvartalar</h3>
<p>Tersiyadan sof kvartalar boʻylab besh tovush yuqorida asosiy toni bilan 6/9 ni beradi (C ustida E–A–D–G–C). Kichik tersiyadan oʻsha shakl — m6/9, tonika minori; oʻsha joylashuvning oʻzi — G7: ♭7–3–13–9–5. Yuqoridan yana bir kvarta qoʻshilsa, «hamma chaladigan olti tovushli dominanta» chiqadi: ♭7–3–13–9–5–1 — bluzning birinchi akkordi sifatida yaxshi. Yuqori tovushsiz toʻrt tovushli variantlar hosil boʻladi; tanlov — kuy boʻyicha. Makkoy Tayner chap qoʻl bilan birinchi hissaga oktava (yoki kvintali oktava), keyin uch tovushli kvartalar chaladi.</p>
<h3>Tersiyalar, Barron, Xenkok</h3>
<p>Akkordni tersiyalar bilan yigʻish mumkin: chapda 1–♭3–5, oʻngda ♭7–9–11 — ikki qoʻlda butun doriy tovushqator; boshlanishni siljitib, yuqorida 11, 13 yoki asosiy ton boʻlgan joylashuvlar olinadi. Kenni Barronning m11 uchun joylashuvi: chap 1–5–9, oʻng ♭3–♭7–11 — ikkita bir xil «kvinta», bosh barmoqlar orasida yarim ton. Xerbi Xenkok asosiy ton ustida yuqorida nona boʻlgan «muallaq» m7 quradi.</p>
<h3>Qoʻsh kamaytirilgan</h3>
<p>[[dblDim|Qoʻsh kamaytirilgan akkord]] — har bir qoʻlda bittadan kamaytirilgan septakkord: birgalikda ular butun kamaytirilgan gammani beradi. D7♭9 ustida: oʻngda yuqorida asosiy toni bor °7, chapda — tersiyadan °7. Shakl gammadan chiqmasdan kichik tersiyalar boʻylab siljiydi. Ellingtonning oʻxshash yurishi — pastda yarim ton va kichik tersiyalar boʻylab harakat.</p>
<h3>ii–V–I dagi birikmalar</h3>
<p>Har bir ovoz pastga yursa, turli turdagi joylashuvlar yaxshi ulanadi: Gsus (G | C–F–A) → G7♭9 (VI yuqori tuzilmasi: F | B–E–G♯) → kvartalardagi Cmaj7 (E | A–D–G). Boshqa yoʻl — tarqaluvchi harakat: yuqori va pastki ovozlar bir-biridan uzoqlashadi, ovozlar soni esa toʻrtdan beshgacha oʻsadi (Gsus → G7alt → So What Cmaj7).</p>
<h3>Oʻz joylashuvi</h3>
<p>Yangi joylashuvlar shunday oʻylab topiladi: gamma, tovushlar soni va shakl tanlanadi (masalan, ikkita minor uchtovush, yuqorisi — kvinta yuqorida) va bu shakl gamma belgilarini saqlagan holda gamma boʻylab yuqoriga yetaklanadi. Uchtovushlar major, kamaytirilgan, orttirilgan boʻlib qoladi, qoʻllar orasidagi interval oʻzgaradi — «Gil Evans ruhidagi» yangrash chiqadi. Faqat yangraydiganini qoldirgan maʼqul.</p>
${key('Har bir joylashuv uchun — yuqorida qaysi pogʻona turishini bilish. Shunda kuyning oʻzi joylashuvni aytadi: kvintali m7 — So What, septimali maj7 — So What, asosiy tonli — kvartalar, alteratsiyalangan dominanta — yuqori tuzilma, qolgani — asosiy tonsiz chap qoʻl.')}
${tip('Avval chap qoʻl joylashuvlari — kvinta doirasi boʻylab yuz foiz ishonchli; keyin oktava yuqorida kuy bilan; qoʻllar toʻqnashsa, joylashuv tushirilmaydi, kuy koʻtariladi. «Qoʻl shaklini koʻrish» — bosh barmoqlar orasidagi interval (kvarta, kichik tersiya, ton, yarim ton) — notalarni oʻqishdan tezroq.')}
` },
{ id: 'mod', t: 'Modulyatsiya va oʻzlashtirish', s: 'Tonalliklar orasidagi oʻtishlar, ladlarni aralashtirish', src: 'jazzology,maksimov', h: `
<p>[[modulation|Modulyatsiya]] — kadensiya (V–I) bilan mustahkamlangan boshqa tonallikka oʻtish. <b>Tonikallashtirish</b> (klassikada — ogʻish) — qisqa tashrif, undan keyin garmoniya qaytadi. Jazda chegara xira: yangi tonallikka bir taktli ii–V — allaqachon tonikallashtirish. Koʻpchilik standartlar faqat modulyatsiyali boʻlib koʻrinadi: ularni asosiy tonallikda tahlil qilish qulayroq. Asardagi tonalliklar ketma-ketligi tonal reja deyiladi; u shakl bilan bogʻliq. Modulyatsiyada kalit belgilarini oʻzgartirish shart emas.</p>
<h3>Modulyatsiya turlari</h3>
<p><b>Toʻgʻridan-toʻgʻri</b> — tayyorgarliksiz: yangi tonallik shunchaki boshlanadi (koʻpincha qism boshida yoki V7 dan darhol keyin). <b>Tayyorlangan</b> — yangi tonallikning ii–V si yoki °7 orqali: bitta kamaytirilgan akkord toʻrt tonallikka olib boradi (F♯° = asosiy tonsiz D7♭9, B7♭9, A♭7♭9, F7♭9). <b>[[pivot|Umumiy akkord]] orqali</b> — ikki tonallik akkordi qayta tushuniladi: Am7 C da — vi, G da — ii. Akkordlar juftligi ham (Cm7–F7 — E♭ da vi–II7 va B♭ da ii–V), bitta maj7 ham (Cmaj7 = C da I va mi minorda ♭VI) umumiy boʻlishi mumkin. <b>Oʻtuvchi</b> — qisqa zanjir (masalan, yarim tonlab ii–V), undan keyin tonallik butunlay oʻzgaradi. Musiqa koʻpincha parallel tonallikka, dominantaga va uning paralleliga ketadi; subdominantaga — odatda ogʻish bilan, oxirroqda.</p>
<h3>Bekdor</h3>
<p>V7–I oʻrniga ♭VII7–I (B♭7 → C) yoki iv–♭VII7–I (Fm7 B♭7 → Cmaj7) yangraydi — bu [[backdoor|bekdor]], nomdosh minordan oʻzlashtirish: yumshoq, iliq yechilish. Standartlardagi koʻp «modulyatsiyalar» aslida bekdor: IVmaj7 → ivm7 → ♭VII7 → I.</p>
<h3>Modal oʻzlashtirish</h3>
<p>Majorda nomdosh minor va oʻsha tonikadagi boshqa ladlar akkordlarini olish mumkin: iv, ♭VI, ♭VII, ♭III, iiø — bu [[interchange|oʻzlashtirish]]. Odatda kuy paytni koʻrsatadi: kuydagi ♭6 yoki ♭3 — sabab. «Frigiy kadensiya» — V dan oldin 1-aylanmadagi ivm6. Minorda majordan olinadi — Pikardiya tonikasi va iim7.</p>
${lab('mi')}
<p>Toʻliq manzara — «sakkiz lad × yetti pogʻona» jadvali: majorning har bir pogʻonasi uchun — oʻsha tonikadagi garmonik, melodik va tabiiy minor, doriy, frigiy, lidiy, miksolidiy va lokriy ladlarida oʻsha oʻrindagi akkord.</p>
${lab('migrid')}
<h3>Pikardiya tersiyasi</h3>
<p>[[picardy|Pikardiya tersiyasi]] — major tonika bilan tugaydigan minor asar. Jazda — tez-tez uchraydigan yakuniy imo.</p>
` },
{ id: 'reharm', t: 'Reharmonizatsiya', s: 'Almashtirishlar va ular qachon oʻzini oqlaydi, kuy boʻyicha tonika va minor, istalgan bas ustida akkord', src: 'jazzology,levine,piano,alekseev', h: `
<p>[[reharm|Reharmonizatsiya]] — oʻsha kuy ostida yangi akkordlar. Asosiy qoida: <b>kuy akkord tovushi yoki mumkin boʻlgan taranglik boʻlib qolishi kerak</b>. Kuy notasi «noqulay» boʻlib qolsa, almashtirish yaramaydi.</p>
<h3>Diatonik almashtirish</h3>
<p>Bir funksiyadagi akkordlar bir-birini almashtiradi: I ↔ iii ↔ vi, ii ↔ IV. Cmaj7 → Em7 — uchta umumiy tovush. Sababi oddiy: ii va IV ikkalasida ham tonika va beqaror IV pogʻona bor, V7 va viiø da — triton (IV va VII), I, iii va vi esa — tonika tovushlari.</p>
<h3>Modal asarda almashtirish</h3>
<p>Modal musiqada almashtirish funksiya boʻyicha emas, umumiy gamma boʻyicha tanlanadi — [[modalSub|modal almashtirish]]: lad tovushida qurilgan, faqat lad tovushlaridan iborat istalgan akkord yaraydi. Fa lidiyda Bm7♭5 oʻrniga — Cmaj7, Dm7, Em7, Fmaj7, G7, Am7. Taqiq bitta: akkord funksional tortilish yaratmasligi kerak — si lokriyda Bm7♭5 oʻrniga Cmaj7 ladni buzadi va do ga tortib ketadi.</p>
<h3>Triton almashtirish</h3>
<p>[[tritsub|Triton almashtirish]]: dominanta triton yuqoridagi dominanta bilan almashtiriladi, G7 → D♭7. Umumiy triton (B–F / C♭–F) qoladi, ikkalasi ham C ga tortadi, bas esa kvintaga sakrash oʻrniga yarim tonga pastga yuradi. Belgilanishi — SubV7/I; ikkilamchi dominantalarning oʻz almashtirishlari bor (C da SubV7/ii = E♭7). Alteratsiyalanmagan SubV7 lidiy dominanta gammasini oladi.</p>
${lab('tritone')}
<p>Almashtirish qachon haqiqatan oʻzini oqlaydi? Levayn ikki mezon beradi: xromatik bas paydo boʻladi — yoki kuy notasi qiziqroq boʻlib qoladi. F7 ustida G — 9, B7 ustida esa — ♯5: qiziqroq. G7♯5 ustida E♭ — ♯5, D♭7 ustida esa — 9: rangsizroq. Xromatik bas allaqachon boʻlsa, almashtirish uni buzadi; ii dagi kuy yangi m7 ning katta tersiyasi yoki katta septimasiga aylansa, butun ii–V ni tritonga almashtirib boʻlmaydi.</p>
${lab('ttcheck')}
<h3>Kamaytirilgan almashtirish</h3>
<p>Har qanday °7 — toʻrt xil asosdan asosiy tonsiz 7♭9 dominanta. Demak, G7♭9 ni B♭7♭9, D♭7♭9 yoki E7♭9 bilan almashtirish mumkin — ularning ustida bir xil kamaytirilgan akkord. Bu [[dimsub|kamaytirilgan almashtirish]]. Barcha 12 ta °7 va 12 ta 7♭9 dominanta uchta guruhga keltiriladi va guruhning toʻrt dominantasidan har biri toʻrt tonikadan istalganiga «aldamchi» ketishi mumkin.</p>
${lab('dimsub')}
<h3>Edi va boʻldi</h3>
<p>Dastlabki ketma-ketlik va reharmonizatsiyani eshitib solishtirish foydali. Har bir misol — bitta usul.</p>
${lab('reharm')}
<h3>ii va minor yangicha</h3>
<p>ii ni yarim kamaytirilgan qilish mumkin (shunda V ♭9 yoki alt boʻladi) — agar kuyda ii ustida 5 yoki 6 boʻlmasa. ii–V juftligini ikkilamchi dominantalar bilan almashtirish mumkin (D−7 G7 → D7 G7), ayniqsa iii–VI–ii–V da. Kuyda 3 yoki 7 boʻlgan tonika minori asosiy ton ustida yarim ton pastdagi major uchtovush sifatida yaxshi yangraydi (kuyda E♭ boʻlgan Cm6 oʻrniga B/C). Uzun minor 5 → ♭6 → 6 → ♭7 yuqoriga — yoki 1 → 7 → ♭7 → 6 pastga yurish bilan jonlantiriladi (xromatik chiziq). Levaynning ogohlantirishi: syurprizni «telegraf qilmaslik» — keyin hayratga solishi kerak boʻlgan akkordni oldindan qoʻymaslik.</p>
<h3>Kuy notasi boʻyicha tonika</h3>
<p>Varaqdagi «maj7» katta septima chalishga majbur qilmaydi: 6, 6/9 va Δ♯4 ham yaraydi — lidiyni deyarli doim qoʻllash mumkin (agar solist ataylab 4 ni ushlab turmasa). Tonikadagi kuy notasi boʻyicha: 3 yoki 7 da — Δ♯5; asosiy ton yoki kvintada — yarim ton yuqoridagi tonika (kuydagi asosiy ton katta septimaga, kvinta — ♯11 ga aylanadi; koʻpincha bu oxirgi akkordda qilinadi); ♯4 yoki 7 da — asosiy ton ustida yarim ton pastdagi uchtovush (B/C) va qaytish; kvintada — garmonik majorning maj7♭6 si.</p>
${lab('tonicre')}
${tip('Puflama cholgʻuchi va xonanda uchun oxirgi akkordda: yozilgan notani chalish — yoki oʻzinikini, lekin bir soniya kutib, bosh irgʻab oxirgi akkordni koʻrsatish. Aks holda — «poyezd halokati».')}
<h3>Turni almashtirish va oʻtuvchi akkordlar</h3>
<p>Dominanta oʻsha asosdagi maj7 yoki m7 ni almashtirishi mumkin; faqat dominantalardan iborat, keyin triton almashtirishli I–vi–ii–V aylanmasi — Tedd Demeron aylanmasi. Diatonik oʻtuvchi akkord tersiya oraligʻidagi akkordlar orasiga qoʻyiladi (Cmaj7 Dm7 Em7), xromatik — oʻsha turdagi, yarim ton oraligʻidagi akkordlar orasiga (Em7 E♭m7 Dm7). VI7 dan oldin yarim tonlab ikkita oʻtuvchi dominanta qoʻyiladi — har biri oʻsha uzunlikda.</p>
<h3>Oʻtuvchi va yordamchi °7</h3>
<p>[[passdim|Oʻtuvchi °7]] bir-biridan ton oraligʻidagi akkordlar orasida turadi: Cmaj7 C♯°7 Dm7. Majordagi odatiy oʻrinlar: ♯1 da → iim7, ♭3 da → iim7 yoki iiim7, ♯4 da → V7, ♯5 da → vim7; gamma — kamaytirilgan «ton — yarim ton». <b>Yordamchi</b> °7 ikki bir xil akkord orasida oʻsha asosda turadi: Cmaj7 C°7 Cmaj7 — uzun tonikani jonlantiradi.</p>
<h3>Saydstep va qoʻyma ii–V</h3>
<p>[[sidestep|Saydstep]] — akkord yoki ii–V ni yarim ton yuqoriga yoki pastga siljitish va qaytish: tonallikdan qisqa «chiqish». Tersiyaga ham boʻladi (katta tersiya pastdagi qoʻyma ii–V), modal asarda esa saydstep — taranglik va boʻshashishning asosiy manbai. Istalgan akkorddan oldin ii–V juftligini qoʻyish mumkin; juftliklar zanjirlarga ulanadi va triton almashtirishlar bilan aralashadi.</p>
<h3>Xromatik chiziq</h3>
<p>Uzun akkord ichida bitta ovoz yarim tonlab yuradi — [[cesh|xromatik chiziq]] (line cliché): minorda 1 → 7 → ♭7 → 6 (Cm → Cm(maj7) → Cm7 → Cm6), majorda 5 → ♯5 → 6 → ♭7. ii–V da ham, toʻrt-sakkiz taktli kirishlarda ham ishlaydi; lotin musiqasida koʻpincha uzun minorda basda yuradi.</p>
<h3>Istalgan bas ustida akkord</h3>
<p>Levayn deyarli cheksiz tanlov ochadigan usulni tasvirlaydi: [[anyBass|istalgan bas ustida akkord]]. Avval bas chizigʻi tanlanadi — yarim tonlab yuqoriga yoki pastga, kvinta doirasi boʻylab, — keyin bas har bir notasida kuy notasi akkord tovushi yoki mumkin boʻlgan taranglik boʻladigan akkord turi. Bas ustida kuy ♭7 boʻlsa — m7, 7 va sus mos keladi; kuy 11 boʻlsa — m7, ø, sus va sus♭9, lekin maj7 ham, oddiy dominanta ham emas. Teskari masala — bitta kuy notasi va uning ostidagi barcha akkordlar — eshitish uchun ham yaxshi mashq: bitta notani kuylab, unga iloji boricha koʻproq garmonizatsiya topish (si ostida G6, Em7, E♭maj7, D7sus4, D♭7♯11, Cmaj7, B7alt…).</p>
${lab('onenote')}
<p>Levayn bobining boshqa usullari ham shu yerga kiradi. Qarama-qarshi harakat: kuy yuqoriga, bas pastga — har bir notaga yangi akkord. Parallelizm: bitta joylashuv xromatik kuy ortidan harakatlanadi (funksiya muhim emas — rang eshitiladi). Butun ii–V juftligi oʻrniga sus va sus♭9. Soxta kadensiyalar: tonikadan katta tersiya pastdagi V (A7 → D♭). Umumiy tovush: kuyning takrorlanuvchi notasi u umumiy boʻlgan turli akkordlar bilan garmonizatsiya qilinadi (E♭7, C7, B7♯5, B♭7, A7 ustida G). Baʼzan yangi akkordlar uchun kuyning oʻzi ham oʻzgartiriladi — Jo Xenderson va Makkoy Tayner shunday qilgan.</p>
<h3>Dominanta istalgan joyga yechilishi mumkin</h3>
<p>V7 yechilishini kutish shu qadar kuchliki, kutilmagan akkord xato emas, voqea kabi yangraydi. «Jazzologiya» buni funksional oilalar bilan tushuntiradi: dominanta tonikaga (kvintaga pastga, yarim tonga pastga, tonga yuqoriga — vi ga, tersiyaga pastga — iii yoki ♭III ga), subdominantaga (kvartaga pastga — ii ga, tonga pastga — IV ga, yarim tonga yuqoriga — ♭VI ga) yoki boshqa dominantaga boradi.</p>
${lab('v7res')}
<p>Levayn boshqa savolga javob beradi: berilgan yechilish uchun qaysi alteratsiyani olish kerak. V7♭9 istalgan joyga, koʻpincha kvintaga pastga boradi. V7alt va V7♯11 — bitta melodik minordan triton egizaklar, ularning maqsadlari umumiy. V7♯11 yumshoq ravishda oʻsha asosdagi ii ga boradi (D7♯11 → Dm7). V7♯9 koʻpincha tonika sifatida ishlaydi (bluzning birinchi akkordi) va hech qayerga alohida tortmaydi. Kuy cheklovlar qoʻyadi: kuyda tabiiy 9 yoki 13 boʻlsa — alt emas, ♭9, ♯9 yoki ♭13 boʻlsa — ♯11 emas.</p>
${lab('domkind')}
${tip('Bitta qoʻshiqni bir vaqtda bitta usul bilan reharmonizatsiya qilish foydali: avval faqat triton almashtirishlar, keyin faqat ikkilamchi dominantalar. Kuyni qoʻllab-quvvatlaydigani qoldiriladi.')}
` },
{ id: 'centers', t: 'Tonal markazlar', s: 'Koltreyn almashtirishlari, katta va kichik tersiyalar, lokriy dominanta', src: 'levine,jazzology', h: `
<p>[[tonalCenter|Tonal markaz]] — asar ichidagi vaqtinchalik tonallik. Giant Steps — yigirma olti akkord, lekin faqat uchta tonallik (si, sol va mi-bemol) va tonallikning oʻnta almashinuvi. Bu hisob — Levaynning asosiy tamoyili foydasiga eng yaxshi dalil: akkord bilan emas, tonallik bilan fikrlash.</p>
<h3>Koltreyngacha markaz qanday harakatlangan</h3>
<p>1959-yilgacha boʻlgan standartlarda markaz uchta odatiy yoʻl bilan oʻtgan: kvinta doirasi boʻylab (C da ii–V–I, keyin F da), tonga pastga (C → B♭) va yarim tonga pastga (C → B). Katta tersiyaga siljish qisqa vaqtga, bir-ikki taktga uchragan; yagona istisno — «Have You Met Miss Jones» brij, unda barcha sakkiz takt katta tersiyalar boʻylab yuradi. Giant Steps gacha bu mavzu eng qiyin hisoblangan.</p>
${lab('centers')}
<h3>Koltreyn almashtirishlari</h3>
<p>Oktava uchta katta tersiyaga boʻlinadi, ii–V–I esa har biridan oldin oʻz dominantasi keladigan uchta tonika orqali yoʻlga aylanadi — [[coltrane|Koltreyn almashtirishlari]]. Toʻrt taktli ii–V–I uchun retsept (Countdown formulasi): maqsaddan (C) boshlanadi; katta tersiya pastdagi tonalliklar topiladi (C → A♭ → E); har biridan oldin uning V si qoʻyiladi; C ning ii si boshiga qaytariladi; xohishga koʻra har bir V dan oldin — uning ii si. Pogʻonalardagi formula: ii – V/♭VI – ♭VI – V/III – III – V – I. Oxirgi taktlarni Koltreyn ataylab asl holicha qoldirgan — solistga nafas rostlash joyi kerak.</p>
${lab('coltrane')}
<p>Bunday almashtirishlar uchun oʻrinlar — kamida toʻrt taktli ii–V–I hamda I–VI–ii–V va iii–VI–ii–V aylanmalari. Odatda yangi akkordlar oldindan yozib qoʻyiladi, lekin ustalar buni chalish davomida qiladi: teglardan birida Jorj Koulman birdan katta tersiyalar boʻylab yurishga oʻtdi, Xerbi Xenkok va Ron Karter esa soʻzsiz ilib ketishdi. Qarindosh yurishlar — Demeron aylanmasi, Kenni Barron varianti, katta tersiyalar boʻylab yuqoriga yoʻl, dominantasiz uchta maj7, — shuningdek oktavani toʻrt qismga boʻlish: kichik tersiyalar boʻylab markazlar, har biriga — oʻz ii–V si (baʼzan V oʻrniga triton almashtirish bilan).</p>
${lab('ctform')}
<h3>Lokriy dominanta</h3>
<p>Makkoy Tayner D7 → G oʻrniga D basi ustida A♭ uchtovushini chaladi. Barcha tovushlar — mi-bemol majordan, maqsaddan katta tersiya pastdagi tonallikdan, D basi ustida esa bu re lokriy: 1, ♭5, ♭7, ♭9 — [[locV|tersiyasiz dominanta]]. Qisqa qoida: V asosi ustida ♭II uchtovushi → I. Bunday akkord ustida Tayner ♭VI tonalligi materiali bilan improvizatsiya qiladi: mi-bemol, lya-bemol va si-bemol pentatonikalari. Levayn bu usulni oʻsha Koltreyn almashtirishlariga kiritadi — markaz katta tersiya pastda.</p>
${lab('locv')}
${tip('Koltreyn almashtirishli bitta mavzu faqat uchta tonallik beradi. Countdown ning birinchi toʻrt taktida barcha oʻn ikki tonallikda sekin improvizatsiya qilish va almashinuvlar eshitilgandagina tempni oshirish foydaliroq.')}
` },
];
