// Учебник (uz), часть 5: Тема. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — перевод ru/p5.js (собственный пересказ: Левайн — «The Jazz Theory Book» (гл. 18–21), «Джазология» (лид-лист)).
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>Cholgʻu yonida</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Asosiysi</b>' + t + '</aside>';

export const S = {
  'dt.hint': 'Oʻquv qatori: akkord — listdagidek, ustida kuy notasi. Har bir belgi uchun — toʻgʻri, xato yoki ixtiyoriy.',
  'dt.mel': 'kuyda {n}', 'dt.nomel': 'kuysiz', 'dt.v.ok': 'Toʻgʻri', 'dt.v.err': 'Xato', 'dt.v.opt': 'Ixtiyoriy', 'dt.asis': 'Listdagidek', 'dt.score': 'Koʻrib chiqildi: {n}, toʻgʻri: {ok}', 'dt.reset': 'Qaytadan',
  'dt.w0': 'Belgida ♯11, kuyda esa natural 4 — ♯11 u bilan toʻqnashadi.', 'dt.w1': 'm7 dan keyin kvarta yuqoridagi dominanta yoʻq, kuyda ♭7 ham yoʻq: bu tonik minor. Septima — ixtiyoriy, m6 yoki m(maj7) yaxshiroq yangraydi.',
  'dt.w2': 'Kuy — akkord tersiyasi, alteratsiya unga xalaqit bermaydi: ♭9 ixtiyoriy. Kvinta pastga ketayotgan V da ♭9 yaxshi.', 'dt.w3': 'Kuy — maj7 tersiyasi: belgi toʻgʻri.',
  'dt.w4': 'Kuyda natural 13 — alt da u yoʻq. Dominanta ii–V juftligida emas va kvinta pastga ketmaydi: 7♯11 yaxshiroq.', 'dt.w5': 'Kuyda natural 5 — alt da u yoʻq. Taktni boʻlish ham mumkin: ikki hissa C7, ikki hissa — C7alt.',
  'dt.w6': 'Kuyda natural 6 — u na lokriy ladda, na melodik minorning oltinchi ladida bor. m7 (doriy) yaxshiroq.', 'dt.w7': 'Xato emas, lekin zaif tanlov: ii–V juftligidagi, kvinta pastga ketayotgan V ♭9 bilan yaxshiroq yangraydi.',
  'dt.w8': 'Kuyda natural 9 — ♭9 u bilan toʻqnashadi.', 'dt.w9': 'Kuyda ♭6 — u m6 akkordining natural 6 si bilan toʻqnashadi. Oldingi dominantani ikki hissaga choʻzish yaxshiroq.',
  'dt.w10': 'Kuy yoʻq (ikkinchi volta): barcha alteratsiyalar ixtiyoriy; minor ii–V (ø va 7♭9) minorga yaxshi olib boradi.', 'dt.w11': 'D notasi oldingi taktdan choʻziladi: F7alt ga nisbatan bu ♭13 ga qarshi 13. F7♭9 yaxshiroq — «yarim ton — ton» gammasida 13 bor.',
  'dt.w12': 'Kuy — tersiya: belgi toʻgʻri.',
  'sq2.full': 'Listdagidek', 'sq2.short': 'Takrorlarni yigʻish', 'sq2.count': '{b} takt, {c} akkord.', 'sq2.count2': '{b0} va {c0} oʻrniga {b} takt va {c} akkord.',
  'sq2.order': 'Tartib: 1-yakunli A — 2-yakunli A — B — 3-yakunli A.',
};

export const TERMS = {
  head: ['Head (mavzu kuyi)', 'mavzu kuyi; boshqa maʼnoda — boshqa mavzu garmoniyasiga yozilgan yangi mavzu (kontrafakt). Tarkibli head-lar va «head ustidagi head-lar» ham boʻladi.', 'tune'],
  realbook: ['Feykbuk (fake book)', 'lid-listlar toʻplami (Real Book va boshqalar); qulay, lekin kuy va akkordlarda xatolar koʻp.', 'tune'],
  sheetcheck: ['Toʻgʻri, xato, ixtiyoriy', 'list belgisini kuy boʻyicha tekshirish: asoslar va akkord turi toʻgʻri hisoblanadi, tarangliklar, alteratsiyalar va minor akkord septimasi shubhali.', 'tune'],
};

export const CH = [
{ id: 'tune', t: 'Listdan mavzu', s: 'Avval nimaga qaraladi, list detektivi, mavzuni qanday yodlash, head-lar, repertuar', src: 'levine,jazzology', h: `
<p>Mavzu — musiqachining asosiy materiali: unda garmoniya, shakl, tovush va improvizatsiya birlashadi. Levayn unga bir nechta bob bagʻishlaydi: listni qanday oʻqish, uni qanday tekshirish va mavzuni qanday yodlash.</p>
<h3>Avval nimaga qaraladi</h3>
<p>(1) <b>Kalit yonidagi belgilar faqat kuyga taalluqli</b>, akkordlarga emas: kalitda bitta bemol boʻlsa ham, Gmaj7 ustida F♯ boʻlishi mumkin. Birinchi akkord tonallik haqida chalgʻitishi mumkin. (2) <b>Temp</b> — odatda soʻz bilan: ballada, tez, medium. (3) <b>Tekis yoki sving sakkizliklar</b>: «bossa», «samba», «Latin», «jazz rock» belgilari — tekis; belgisiz — sving. (4) <b>Registr</b>: kuy oʻqishga qulay boʻlishi uchun skripka kalitining oʻrtasida yoziladi, uni istalgan registrda chalish mumkin. Ibora oʻrtasida oktavaga koʻchirish «soʻzlashuvdek» yangraydi, lekin bu tez-tez qilinmaydi.</p>
<p>[[leadsheet|Lid-list]] boʻyicha qanday akkompanement qilinadi — «Akkompanement» bobida.</p>
<h3>Listlardagi xatolar qayerdan</h3>
<p>Standart hayoti — sakkiz qadam: muallif qoʻshiq yozadi; uni noshirga beradi; yollangan pianinochi sotuv uchun soddalashtirilgan nota tayyorlaydi; qoʻshiq yozib olinadi; yozuv mashhur boʻladi, notalar sotiladi; jaz musiqachilari akkordlarni oʻzgartiradi; mashhur jaz musiqachisi mavzuni yangi akkordlar, kirish va yakun bilan yozib oladi; bu yozuv «yangi standart versiya»ga aylanadi. Shuning uchun standartning «asl akkordlari» deyarli yoʻq, baʼzan esa bir nechta versiyani bilish kerak boʻladi. Jaz musiqachilarining oʻz mavzulari aslga yaqinroq — ular toʻgʻridan-toʻgʻri muallif yozuvidan olingan. Ishonchli yoʻl bitta — mavzuni yozuvdan eshitib olish; [[realbook|feykbuklar]] qulay, lekin xatolarga toʻla.</p>
<h3>List detektivi</h3>
<p>Bobning asosiy koʻnikmasi — [[sheetcheck|belgini kuy boʻyicha tekshirish]]. Akkord asoslari va turi (major, minor, dominanta) toʻgʻri hisoblanadi. Tarangliklar, alteratsiyalar va minor akkord septimasi shubhali: ularning har biri kuyga nisbatan <b>toʻgʻri, xato yoki ixtiyoriy</b> boʻladi. Soloda erkinlik koʻproq.</p>
${lab('detect')}
<p>Javoblar ortidagi qoidalar: kvarta yuqoridagi dominantasiz va kuyda ♭7 boʻlmagan m7 — tonik minor (m6, m(maj7)); kuy akkord tovushi boʻlganda alteratsiya — ixtiyoriy; kuyda natural 4 boʻlganda ♯11 — xato; kuyda natural 5, 9 yoki 13 boʻlganda alt — xato; natural 9 da ♭9 — xato; natural 6 da ø — xato; ♭6 da m6 — toʻqnashuv; almashinuv orqali choʻzilgan nota yangi akkordga nisbatan ham tekshiriladi. Kuy boʻlmasa, hammasi ixtiyoriy.</p>
<h3>Mavzuni qanday yodlash</h3>
<p>Tartib — <b>shakl → kuy → akkordlar</b>. Shakl: bir xil sakkiz taktliklar topiladi va takrorlar hamda voltalar bilan yoziladi — list ikki baravar qisqaradi.</p>
${lab('squeeze')}
<p>Kuy: bir necha marta chalinadi, keyin kuylanadi; iboralar boʻyicha oʻrganiladi; ibora qayerda akkordni chizishi, qayerda tovushga xromatik yondashishi kuzatiladi. Qoʻshiq soʻzlari kuyni ushlab turadi va u nima haqida ekanini tushuntiradi; yozuv bilan birga kuylanadi. Akkordlar: yodlanmaydi, mantiq izlanadi — ii–V juftliklari va ularning markazlari, taktlar boʻyicha tonika va ii–V almashinuvi, bridjda sxemaning kvarta yuqorida takrorlanishi (koʻplab standartlarning eski umumiy usuli).</p>
<h3>Head-lar</h3>
<p>[[head|Head]] — mavzu kuyi, tor maʼnoda esa boshqa mavzu garmoniyasiga yozilgan yangi mavzu, [[contrafact|kontrafakt]]. Head-lar asl mavzuga yaqin va undan uzoq, tarkibli (A qismi — bir mavzudan, bridj — boshqasidan) va «head ustidagi head» boʻladi — yangi mavzu kontrafakt garmoniyasiga yozilganda. Head-larning eng koʻpi — ritm-cheynjes va bluzga: repertuar koʻringanidan kichikroq.</p>
<h3>Repertuar</h3>
<p>Haftasiga yoki ikki haftada bitta mavzu — bir necha oyda asos toʻplanadi; bu mashgʻulotlarning haftalik ritmiga mos keladi. Baʼzi mavzular ikki va undan ortiq tonallikda chalinadi — hammasi oʻrganiladi. Bitta mavzu turli versiyalarda turlicha yangraydi, «zerikarli» mavzu esa boshqa ijroda ochilishi mumkin. Chalishdan oldin shakl va versiya aniqlashtiriladi.</p>
${key('List — ishora, yozuv — manba. Kuy quloq bilan, belgi — kuy boʻyicha tekshiriladi.')}
${tip('Ilovada: qoʻshiq — «Qoʻshiqlar»da tonallik va transpozitsiya bilan, yozuv — mediatekada; pleyer yozuvni balandligini oʻzgartirmay sekinlashtiradi va qiyin joyni A–B halqasi bilan takrorlaydi.')}
` },
];
