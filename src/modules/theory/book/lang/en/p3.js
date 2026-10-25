// Учебник (en), часть 3: Гармония джаза. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — собственный пересказ: «Джазология» (основа), Левайн — «The Jazz Theory Book» и «The Jazz Piano Book».
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';
const two = (who, t) => '<aside class="btwo"><b>Second opinion · ' + who + '</b>' + t + '</aside>';

export const S = {
  'turn.t10': 'Dameron: I – V7/♭VI – ♭VI – ♭II7', 'turn.t11': 'Up a major third: I – VII7 – III – V7', 'turn.t12': 'By step: I – ii – iii – IV', 'turn.t13': 'Barron: all dominants iii – VI – II – V',
  'ana.a8': 'Section boundary: no ii–V across it',
  'rh.r13': 'ii → ø', 'rh.r13n': 'The minor ii became half-diminished and V took a ♭9: the fifth of ii (♭5) becomes the ♭9 of the dominant. Not possible if the melody over ii is 5 or 6.',
  'rh.r14': 'ii–V → secondary dominants', 'rh.r14n': 'The minor chords of the ii–V pairs became altered dominants: V chords can be altered far more richly than ii.',
  'rh.r15': 'Double passing dominants', 'rh.r15n': 'Two dominants a half step apart (B7, B♭7) are inserted before A7, each of the same length: V7/iii, SubV7/vi, V7/ii.',
  'rh.r16': 'Sus instead of ii–V', 'rh.r16n': 'A whole ii–V pair is folded into one sus chord on the root of the dominant (Em7 A7 → A7sus4♭9, Dm7 G7 → G7sus4).',
  'rh.r17': 'Ellington cadence', 'rh.r17n': '♭VI7 over the tonic bass resolves straight to I6 (a “German sixth”) — a soft, “orchestral” ending.',
  'rh.r18': 'Dameron turnaround', 'rh.r18n': 'I–vi–ii–V: every chord becomes a dominant, then each is replaced by its tritone substitute. The bass moves by major thirds and half steps.',
  'la.n.m7b5': 'Five left-hand forms of ø: the usual A and B, plus 1–11–♭5–♭7, ♭5–♭7–9–11 and 11–♭5–♭7–9. The natural 9 comes from Locrian ♮2.', 'la.n.7b9': 'Like an ordinary dominant, but the 9 is lowered to ♭9: 3–13–♭7–♭9 or ♭7–♭9–3–13.',
  'la.n.7s5': '♭13 (♯5) instead of 13: 3–♭13–♭7–9.', 'la.n.7alt': 'Both ninths and ♭13: 3–♭13–♭7–♯9. Note for note it is the voicing of the dominant a tritone away: “alt is the voicing of the tritone substitute”.',
  'la.n.7s11': 'The note nearest to ♯11 (usually the third) moves to ♯11: ♭7–9–♯11–13; there is also a version with the third, ♭7–3–♯11–13.', 'la.n.7s9': 'With the fifth and without 13: 3–5–♭7–♯9. With the third at the bottom it sounds stronger.',
  'la.n.mmaj7': 'The same voicing as 7♯11 a fourth lower: Dm(maj7) = G7♯11.', 'la.n.d7': 'A diminished seventh with its top note raised a whole step: the result is a 7♭9 voicing — the same diminished-scale sound, but “with a bite”.',
  'la.n.7sus4': 'The three-note 1–4–♭7, or the ii voicing over the root of V (Gsus = Dm7/G).', 'la.n.phr': 'Phrygian sus♭9: 1–♭9–4–5 — a dense, “Spanish” sound.',
  'la.sub': 'The same voicing over {r}',
  'ab.start': 'start', 'ab.second': 'root by a second — same type', 'ab.fourth': 'root by a fourth/fifth — type changes', 'ab.third': 'root by a third — the nearest', 'ab.same': 'same root', 'ab.hint': 'the text is editable: chords separated by spaces, bars by |',
  'ov2.hint': 'the type A C13 voicing (3–13–♭7–9) over different basses', 'ov2.all': 'All five in a row', 'ov2.v13': 'C13: the voicing in its own role — a dominant with 9 and 13.', 'ov2.valt': 'Over a bass a tritone higher — F♯7alt: the same tritone pair, the tensions swap places.',
  'ov2.hd': 'Over a bass a major third higher — Em7♭5 (Em11♭5): half-diminished.', 'ov2.phr': 'Over a bass a minor third lower — A7sus4♭9: Phrygian sus.', 'ov2.m69': 'Over a bass a fourth lower — Gm6/9: the tonic minor. All five are notes of G melodic minor.',
  'hd.any': 'any', 'hd.top': '{d} on top', 'hd.none': 'No voicings for this top note.', 'hd.lr': 'Purple is the left hand, green the right.', 'hd.iivi': 'ii–V–I: every voice moves down',
  'hd.sw': 'So What', 'hd.kb': 'Kenny Barron', 'hd.st3': 'Stacked thirds', 'hd.jm7': 'LH rootless + RH', 'hd.swM': 'So What (maj7)', 'hd.q69': 'Fourths 6/9', 'hd.jmaj': 'LH 7–3–6 + RH', 'hd.triD': 'II triad over the root',
  'hd.swL': 'So What (Lydian)', 'hd.jlyd': 'LH 3–6 + RH ♯11', 'hd.q6': 'Fourths: six-note dominant', 'hd.j7': 'LH 3–♭7 + RH', 'hd.usII': 'Upper structure II', 'hd.usbVI': 'Upper structure ♭VI', 'hd.jalt': 'LH 3–♭7–♭9 + RH',
  'hd.usVI': 'Upper structure VI', 'hd.dd': 'Double diminished', 'hd.susT': 'Triad a whole step below', 'hd.jsus': 'LH 1–♭7 + RH 9–11–13', 'hd.jhd': 'LH 1–4–♭5–♭7 + RH',
  'hd.n.sw': 'Three fourths and a major third on top. The 5 is on top — the voicing for an m7 with the melody on its fifth.', 'hd.n.kb': 'Two identical “fifths”, one in each hand, a half step between the thumbs. For an m7 with 11 in the melody.',
  'hd.n.st3': 'The chord in thirds up to 11: 1–♭3–5 | ♭7–9–11 — the whole Dorian scale in two hands.', 'hd.n.jm7': 'Left hand without the root (♭3–5–♭7), the right adds 9, 5 and the root on top.',
  'hd.n.swM': 'The same So What shape from the third of maj7: the major seventh on top.', 'hd.n.q69': 'Five notes in perfect fourths from the third: 6/9 with the root on top — the most open major sound.',
  'hd.n.jmaj': 'Left 7–3–6, right 9–5: a dense, soft maj7.', 'hd.n.triD': 'A triad a whole step above the root over the bass — the Lydian colour: 9, ♯11, 13.',
  'hd.n.swL': 'The So What shape from the seventh: ♯11 on top — for a Lydian melody.', 'hd.n.jlyd': 'Left 3–6, right ♯11–7–3: Lydian colour without the root.',
  'hd.n.q6': '♭7–3–13 | 9–5–1: “the six-note dominant everybody plays”; good as the first chord of a blues.', 'hd.n.j7': 'Left — the tritone 3–♭7, right — 3, 13, 9.',
  'hd.n.usII': 'A triad a whole step above the root over the tritone: 9, ♯11, 13 — the Lydian dominant.', 'hd.n.usbVI': 'A triad a minor sixth higher: ♭13, 1, ♯9 — alt.', 'hd.n.jalt': 'Left 3–♭7–♭9, right ♯5–♭7–♯9: alt with ♭9 at the bottom.',
  'hd.n.usVI': 'A triad a major sixth higher: 13, ♭9, 3 — the 13♭9 dominant.', 'hd.n.dd': 'Two diminished seventh chords, one in each hand: the whole diminished scale; it moves in minor thirds.',
  'hd.n.susT': 'A major triad a whole step below the root, in second inversion over the bass: Gsus = F/G.', 'hd.n.jsus': 'Root and ♭7 at the bottom, 9–11–13 on top.', 'hd.n.jhd': 'Left 1–4–♭5–♭7 (11 instead of ♭3), right 9–11 — a soft ø.',
  'sw.dia': 'In the mode', 'sw.chr': 'By half steps', 'sw.base': 'root position', 'sw.inv': 'inv. {n}', 'sw.walk': 'Shift up and back',
  'sw.n.m7': 'Over a D bass — Dm7: {top} on top. Shifting up and down through the notes of D Dorian, the harmony stays while the voices move.', 'sw.n.maj7': 'Over a B♭ bass — B♭maj7 without the root: {top} on top.', 'sw.n.lyd': 'Over an E♭ bass — E♭maj7♯11: {top} on top, the Lydian colour.',
  'mg.hint': 'tap a cell — I → chord → I', 'mg.note': 'Common borrowings with ♭6: vii°7, iiø, iv, ♭VI; with ♭3: i, ♭III, ♭VII. Chords of the parallel minor also make it easier to modulate to its related keys.',
  'mg.harm': 'Harm. minor', 'mg.mel': 'Mel. minor', 'mg.nat': 'Nat. minor', 'mg.dor': 'Dorian', 'mg.phr': 'Phrygian', 'mg.lyd': 'Lydian', 'mg.mix': 'Mixolydian', 'mg.loc': 'Locrian',
  'dk.n.b9': 'V7♭9 (half-whole diminished) can go anywhere, most often down a fifth. Not possible if the melody has a natural 9 or ♭13. Its twin is {tw}.',
  'dk.n.alt': 'V7alt and its tritone twin {tw} come from the same melodic minor and share their goals. Not possible if the melody has a natural 9 or 13.',
  'dk.n.s11': 'V7♯11 moves gently down a half step and to the ii on the same root; its twin is {tw}. Not possible if the melody has ♭9, ♯9 or ♭13.',
  'dk.q5': 'down a fifth — the classic resolution', 'dk.q5m': 'down a fifth to minor', 'dk.semi': 'down a half step', 'dk.semiUp': 'up a half step', 'dk.b3down': 'down a major third', 'dk.q4down': 'down a fourth', 'dk.toneUp': 'up a whole step', 'dk.iiSameRoot': 'to the minor ii on the same root (II7 → ii)',
  'tc.mel': 'Melody', 'tc.is': 'the melody is {d}', 'tc.ok': 'chord tone or tension', 'tc.alt': 'alteration — needs the alt scale or ♭9', 'tc.bad': 'clashes with the chord',
  'tc.note': 'A substitute is justified if the bass becomes chromatic or the melody note becomes more interesting (for example 9 → ♯5). If the note turns into an avoid note, the substitute does not work.',
  'on.note': 'Note', 'on.hint': 'chords in which this note is a chord tone or a tension; tap — the chord under the note',
  'tr2.mel': 'melody: {d}', 'tr2.up': 'the tonic a half step up: the melody root becomes the major seventh, the fifth becomes ♯11', 'tr2.s5': 'Δ♯5: both melody notes lie in the triad a major third higher', 'tr2.tri': 'the triad a half step below over the root (B/C), then back to C', 'tr2.b6': 'maj7♭6 — harmonic major: a mysterious colour under the fifth', 'tr2.lyd': '♯11 instead of 4 — Lydian almost always works',
  'ce.q': 'down a fifth — the nearest path', 'ce.tone': 'down a whole step', 'ce.semi': 'down a half step', 'ce.b3': 'down a major third — Coltrane’s path', 'ce.m3': 'down a minor third — the octave in four',
  'cf.count': 'Countdown: a four-bar ii–V–I', 'cf.lady': 'Lady Bird (Dameron)', 'cf.barron': 'Kenny Barron', 'cf.up3': 'Up by major thirds', 'cf.maj3': 'Three maj7s a major third apart', 'cf.min3': 'Centres a minor third apart',
  'cf.n.count': 'ii – V/♭VI – ♭VI – V/III – III – V – I: the first ii is kept, the centre moves down a major third three times, each tonic gets its own dominant.', 'cf.n.lady': 'I – V7/♭VI – ♭VImaj7 – ♭II7 – I: the centre moves down a major third and comes back.',
  'cf.n.barron': 'iii – V7/♭VI – ♭VImaj7 – SubV – I: the same move in place of vi–ii–V.', 'cf.n.up3': 'I – VII7 – III – V7 – I: the centre rises a major third and comes back.', 'cf.n.maj3': 'Three maj7s without dominants divide the octave into three — the way Coltrane and Red Garland ended a tune.',
  'cf.n.min3': 'Four centres a minor third (and a tritone) apart, each with its own ii–V.',
  'lv.n': 'Instead of {v}7 — the {b} triad over a {v} bass: notes 1, ♭5, ♭7, ♭9 — a dominant without a third, from the key a major third below {k}. On top — the {p} pentatonic.', 'lv.pent': 'With the {p} pentatonic',
};

export const TERMS = {
  lhAlt: ['Left-hand alterations', 'rootless voicings for 7♭9, 7alt, 7♯11, ø and others; the left-hand alt voicing is the same as the voicing of the tritone substitute.', 'voice'],
  abRule: ['A/B rule', 'when the root moves by a second, the voicing type stays; by a fourth or a fifth, it changes; by a third, either.', 'voice'],
  sowhatC: ['So What chord', 'three perfect fourths and a major third on top; one shape serves m7, maj7 and the Lydian chord.', 'hands'],
  blockch: ['Voicing by the melody', 'choosing a voicing by the chord degree that sits on top (in the melody).', 'hands'],
  dblDim: ['Double diminished', 'two diminished seventh chords, one in each hand; the whole diminished scale.', 'hands'],
  modalSub: ['Modal substitution', 'a chord is replaced by any chord built from the notes of the same mode, without functional pull.', 'reharm'],
  anyBass: ['Any chord over any bass', 'a reharmonization method: a bass note is chosen under the melody note, then a chord quality in which that note is a chord tone or a tension.', 'reharm'],
  tonalCenter: ['Tonal centre', 'a temporary key within a piece; several chords of one key are read as one centre.', 'centers'],
  locV: ['Locrian dominant', 'McCoy Tyner’s device: instead of V7, a ♭II triad over the root of V (A♭/D → G); a dominant without a third.', 'centers'],
};

export const CH = [
{ id: 'iivi', t: 'ii–V–I', s: 'The main progression of jazz', src: 'jazzology,levine', h: `
<p>[[iivi|ii–V–I]] is the frame of a huge part of the standards. Roots go down by fifths, functions go S → D → T. Whoever can hear, play and improvise on ii–V–I in every key has done half the work. The progression usually takes two or four bars. For the cadence to sound, 4 is not stressed on I and V, nor 6 on ii: these notes give away the next chord too early.</p>
<h3>Guide tones</h3>
<p>The 3rd and 7th of each chord in ii–V–I connect by step: the 7th of ii becomes the 3rd of V (a half step lower), the 7th of V becomes the 3rd of I. These are [[guide|guide tones]]: two lines take turns while the hand barely moves. It is the main voice-leading mechanism in jazz — and a ready-made background line for a horn player playing behind another soloist.</p>
${lab('guide')}
${tip('3 and 7 are played with the left hand around the whole circle without looking at the keys. Then the root is added in the bass. Then the same with the right hand over the bass.')}
<h3>ii–V–I in every key</h3>
<p>First around the circle of fifths, then in random keys: on stage, keys do not come in order.</p>
${lab('iivitable')}
<h3>Turnarounds</h3>
<p>At the end of a section the harmony returns to the start — a [[turnaround|turnaround]]. The basic I–vi–ii–V becomes dozens of variants: vi turns into VI7 (a secondary dominant — a stronger pull, more alterations), I into iii, dominants into tritone substitutes. Tadd Dameron turned the turnaround into a path by major thirds (Lady Bird: I – V7/♭VI – ♭VI – ♭II7); Kenny Barron makes all four chords dominants. Pianists bring a long tonic to life by moving up the degrees I–ii–iii–IV; a major chord is often followed by a chord a fourth higher — maj7 or a dominant. In minor, turnarounds are built the same way: i – viø – iiø – V7alt.</p>
${lab('turn')}
<h3>Chains of ii–Vs</h3>
<p>A ii–V does not have to resolve: right after the dominant a new ii–V from another key begins — each link of the chain sounds like an interrupted cadence. Most often the chain moves down by whole or half steps, and guide tones lead the ear.</p>
${lab('chain')}
<h3>Incomplete ii–Vs</h3>
<p>Sometimes only the ii or only the V of the goal is played. It is still motion towards the goal and is marked the same way in analysis — with an arrow or a bracket. An unresolved ii–V repeated many times is the ostinato of Brazilian and Afro-Cuban music (montuno): two chords per bar or one chord per bar.</p>
` },
{ id: 'ana', t: 'Analysis', s: 'Arrows, brackets, secondary dominants, section boundaries', src: 'jazzology,levine', h: `
<p>Analysis means reading harmony like a language. The symbols: a <b>solid arrow</b> is a dominant resolving down a fifth; a <b>dashed one</b> resolves down a half step (tritone substitute); a <b>bracket</b> under two chords is a ii–V. Under each chord goes its role: a degree or V7/x (“dominant of x”). Any progression can be typed in and the diagram marks it up; the sign ‖ marks a section boundary.</p>
${lab('ana')}
<p>For a first step Levine suggests a deliberate simplification: m7 is ii, 7 is V, maj7 is I; alterations are ignored for now. The ii–V, V–I and ii–V–I groups are found, and each group is labelled with its key. Even a “tangled” tune turns out to be a string of short keys. Not every ii–V resolves, and not every V–I is preceded by a ii.</p>
<h3>When a ii–V is not a ii–V</h3>
<p>A dominant resolves across a section boundary too — the arrow stays. But a ii–V pair is not read across a boundary: in |Fmaj7 Am7 ‖ D7 Gm7| the Am7 continues the F tonic and does not prepare D7. There is also a metric rule: ii stands in a strong place of the harmonic rhythm. With one chord per bar, ii falls in odd bars and V in even ones; with two chords per bar, ii is in the first half. An m7 in the second half of a bar is most likely not a ii.</p>
<h3>Secondary dominants</h3>
<p>Every chord of the key except viiø can have its own dominant — a [[secdom|secondary dominant]]: V7/ii, V7/iii, V7/IV, V7/V, V7/vi. It differs from the chord on the same degree by one note: for ii, iii and vi the third is raised, for I the seventh is lowered. In major: VI7 → ii, VII7 → iii, I7 → IV, II7 → V, III7 → vi. There is no V7/vii: a diminished chord cannot be tonicized (for the same reason there is no V7/ii in minor). IV7 in major is not a secondary dominant: down a fifth it leads to ♭VII, which is not in the key. A secondary dominant keeps its name even when it does not resolve: A7 in C is always V7/ii.</p>
<h3>Backcycling</h3>
<p>A goal can be prepared by a chain of dominants worked backwards — [[backcycle|backcycling]]: E7 → A7 → D7 → G7 → C. Denser still, with [[relii|related ii]] chords before each dominant: Bm7 E7 | Em7 A7 | Am7 D7 | Dm7 G7. Backcycling is usually not written in Roman numerals — or is written in brackets.</p>
<h3>Contiguous dominants</h3>
<p>Two dominants in a row without a fifth move (A♭7 → G7) read as a tritone substitute (A♭7 = SubV7/C) or as a side-step. Such dominants (or unresolved ii–Vs) move in patterns — up a half step, a whole step, a minor or major third, down a third — hinting at keys and delaying the final resolution; the device goes back to Schumann and Chopin. In a chain of alt and ♯11 dominants each chord can be written as its twin a tritone away — one and the same progression can have up to eight spellings, and they sound almost alike: only the bass note differs.</p>
<h3>°7 as a dominant</h3>
<p>A diminished seventh a half step below the goal is a rootless 7♭9 dominant: C♯°7 → Dm7 = A7♭9 → Dm7. Analysis writes “°7 → ii” or vii°7/ii. A °7 counts as functional only if it is followed by a diatonic chord a half step above any of its four notes — any note of a °7 can turn out to be the “root”.</p>
${key('First come the ii–V pairs (brackets), then the dominants (arrows), then the tonic. A chord with no arrow and outside the key is borrowing or a new key.')}
` },
{ id: 'voice', t: 'Left-hand voicings', s: 'Shells, rootless, A and B, alterations, drop 2, fourths, clusters', src: 'jazzology,piano,levine', h: `
<p>A [[voicing|voicing]] is which chord notes are played and in what order. A good voicing sounds full, stays out of the way of the bass and the soloist and moves smoothly to the next one. Why are voicings needed at all? Chords in root position one after another give parallel fifths, the hand jumps after the roots, and the inner voices are not led.</p>
<h3>Shells</h3>
<p>[[shell|Shell]]: root + 3 + 7 or root + 7 + 3. The minimal chord that clearly shows the quality. The two forms alternate in ii–V–I so that 3 and 7 move by step. Without a bassist these chords with the root — “Bud Powell voicings” — are the main way of accompanying oneself. With two hands: the root in the left, 3 and 7 in the right; in ii–V–I one voice changes — the seventh drops a half step and becomes the third. If the melody is the 3 or 7 itself, nothing extra is added, the note is simply put on top; a fourth note is needed when the melody is a tension. The first additions: 5 to ii, 9 to V (the same note, held across the change), 5 and 9 to I.</p>
<h3>Rootless voicings</h3>
<p>With a bassist the root is not needed in the chord. Four-note [[rootless|rootless]] voicings are the basis of piano comping: <b>type A</b> (3–5–7–9 bottom to top) and <b>type B</b> (7–9–3–5). In ii–V–I they alternate — A–B–A or B–A–B — and each voice moves no more than a whole step.</p>
${lab('voice')}
${two('Levine', 'On the tonic, type A often takes the sixth instead of the major seventh: 3–5–6–9 (Bill Evans, Wynton Kelly); type B for major is 7–1–3–5, with the root inside. The form 7–9–3–5 on its own sounds like G6 rather than Cmaj7 — only the preceding G7 or the root in the bass saves it. In the diagram the type B tonic now sounds as 7–1–3–5.')}
<p>Which type comes next is suggested by the [[abRule|A/B rule]] (Jazzology): if the root moves by a second, the type stays; by a fourth or a fifth, it changes; by a third, either — whichever is nearer. Type A sounds more open on major and minor chords, type B on dominants. Any progression can be typed in — the diagram chooses the types and explains the choice.</p>
${lab('abrule')}
${key('Voice leading: common notes stay, the rest move to the nearest note of the next chord. The 7th falling a half step to the 3rd is the key move of every ii–V.')}
<h3>Range</h3>
<p>A left-hand chord sounds clear roughly from D3 to G4: the left little finger sits comfortably between C3 and C4. Lower is mud (especially thirds), higher steps into the soloist’s register. If the nearest option falls below the limit, it is better to jump to the other type than to “sink”. Many voicings weed themselves out — too low or too high — and the favourites that remain become the start of a personal style.</p>
<h3>Left-hand alterations</h3>
<p>The same A/B principle works for all altered chords. ø is played in five ways; 7♭9 takes ♭9 instead of 9, 7♯5 takes ♭13 instead of 13, 7alt takes both alterations at once; 7♯11 comes from moving the nearest note to ♯11. A useful hint from Levine: [[lhAlt|the 7alt voicing matches, note for note, the voicing of the dominant a tritone away]] — “alt is the voicing of the tritone substitute”. m(maj7) sounds like 7♯11 a fourth lower, and °7 becomes a 7♭9 voicing if its top note is raised a whole step.</p>
${lab('lhalt')}
<p>One voicing can serve several chords at once. The type A C13 voicing (3–13–♭7–9) also fits F♯7alt (the tritone substitute), Em7♭5, A7sus4♭9 and Gm6/9: all five are notes of G melodic minor. In functions this is V13 = ii♭V7alt = viiø = III7sus4♭9 = iim6/9.</p>
${lab('onevoice')}
<h3>Drop 2 and drop 2-4</h3>
<p>When the second voice from the top of a close four-note chord is dropped an octave, the result is [[drop2|drop 2]]: wider, it sounds like a sax section. Drop 2-4 drops the second and fourth voices. These voicings suit guitarists and two-handed piano; drop 2 sounds best in the range from F2 to G5. How drop 2 turns a melody into “block chords” is covered in the chapter “Arranging”.</p>
<h3>Quartal voicings</h3>
<p>A [[quartal|quartal chord]] sounds open and modern. Quartal chords are ambiguous: one voicing fits several chords. Any pentatonic can be arranged in fourths, so tonal fourths are taken from the pentatonics of the chord. Three-note fourths for the left hand: over Imaj7 — 2–5–1, 3–6–9, 6–9–5, 7–3–6; over iim7 — 1–4–♭7, 2–5–1, 4–♭7–♭3, 5–1–4, 6–9–5; over V7 — ♭7–3–6; over the tonic minor — ♭3–6–9, 4–♭7–♭3; over iiø — 1–♭5–♭7, ♭5–1–4; over V7alt — ♭7–3–♭13 or 3–♭7–♯9. In tonal music a minor ninth between voices is avoided. Five- and six-note fourths for two hands are in the next chapter.</p>
<h3>Three-note left-hand voicings</h3>
<p>At fast tempos three notes are enough: ii — 3–5–9, V — ♭7–3–13, I — 3–6–9, neighbouring chords keep a common note. Thelonious Monk has his own three-note voicings with a half step at the bottom, and he builds them from the key, not from the chord: over maj7 — 7–1–3, over any other chord of major harmony (ii, V, sus, Lydian) — 3–4–6 of the key, over chords of melodic minor — 2–3–5 of its key.</p>
<h3>Clusters and fragments</h3>
<p>A [[cluster|cluster]] is a dense chord with seconds (9 next to 3, 13 next to ♭7). The rules: never a minor second on top; the lower limit is around E♭3; they are played softly or at medium volume. Clusters are especially good in minor, on iiø. A fragment is two or three notes with a half step (less often a whole step) at the bottom: 7–1–3 for maj7, ♭7–1–♭3 for m7, 4–♭5–♭7 for ø, 4–5–♭7 for sus, 1–♭2–4 for sus♭9, 5–6–9 for 6/9. It sounds light and ambiguous — especially good in 3/4; one three-note voicing fits many chords, and Bill Evans’s type B is the sum of two fragments.</p>
<h3>Myths, not rules</h3>
<p>Levine examines four “rules” that are in fact myths. “A pianist in a band must not play the root” — Powell and Monk almost always played it, Tyner and Barron often; not overusing it, yes; forbidding it, no. “A dominant must have 3 and 7” — true for a plain V7, but after any alteration they lose importance. “A sus chord must not have a third” — it can, above the fourth. “There are interesting notes (9, 11, 13) and dull ones (1 and 5)” — the accompanist’s sound is only part of the overall mosaic, and the root can be the most beautiful note.</p>
${tip('Type A around the circle of fifths, then type B. After a week, the minor ii–V–i; a week later, the alterations. The goal is not to think of notes but to see the chord shape under the hand.')}
` },
{ id: 'hands', t: 'Two-handed voicings', s: 'So What, fourths, upper structures, Barron, double diminished; voicing by the melody', src: 'piano,jazzology', h: `
<p>With two hands a chord gains space: the left holds the foundation (root, 3–7, fourths), the right adds colour and melody. There are dozens of such voicings, and Levine offers a handy key: for each one, it is worth remembering <b>which degree is on top</b>. Then, when reading a tune, the question “how to play this chord” turns into “what is in the melody” — that is [[blockch|voicing by the melody]].</p>
${lab('hands')}
<h3>So What</h3>
<p>The [[sowhatC|So What chord]] is three perfect fourths and a major third on top (D–G–C–F–A). One and the same shape serves three chords: over a D bass it is Dm7 (5 on top), over B♭ — B♭maj7 without the root (7 on top), over E♭ — E♭maj7♯11 (♯11 on top). Its five notes are a pentatonic. The shape has five inversions: the minor third moves around, and in one inversion there are no thirds at all — only fourths. In a modal tune the shape is shifted through the notes of the mode or by half steps while the harmony stays put — this is parallel shifting. There are also “stretched” versions: raising the two lower notes a whole step brings a dark “bite” of a minor ninth; higher still, the hands end up a whole step and a half step from each other, and the sound becomes “spacey”.</p>
${lab('sowhat')}
<h3>Five- and six-note fourths</h3>
<p>Five notes in perfect fourths (four fourths) from the third give 6/9 with the root on top (E–A–D–G–C over C). The same shape from the minor third is m6/9, the tonic minor; and the same voicing is G7: ♭7–3–13–9–5. Adding one more fourth on top gives “the six-note dominant everybody plays”: ♭7–3–13–9–5–1 — good as the first chord of a blues. Without the top note come four-note versions; the choice depends on the melody. McCoy Tyner plays an octave (or an octave with a fifth) in the left hand on the first beat, then three-note fourths.</p>
<h3>Thirds, Barron, Hancock</h3>
<p>A chord can be stacked in thirds: 1–♭3–5 in the left, ♭7–9–11 in the right — the whole Dorian scale in two hands; shifting the starting point gives voicings with 11, 13 or the root on top. The Kenny Barron voicing for m11: left 1–5–9, right ♭3–♭7–11 — two identical “fifths”, a half step between the thumbs. Herbie Hancock builds a “floating” m7 over the root with the ninth on top.</p>
<h3>Double diminished</h3>
<p>The [[dblDim|double diminished chord]] puts a diminished seventh in each hand: together they give the whole diminished scale. Over D7♭9: in the right hand a °7 with the root on top, in the left a °7 from the third. The shape moves in minor thirds without leaving the scale. A similar Ellington move: a half step at the bottom and motion in minor thirds.</p>
<h3>Combinations in ii–V–I</h3>
<p>Voicings of different types connect well if every voice moves down: Gsus (G | C–F–A) → G7♭9 (upper structure VI: F | B–E–G♯) → Cmaj7 in fourths (E | A–D–G). Another path is contrary motion: top and bottom spread apart, and the number of voices grows from four to five (Gsus → G7alt → Cmaj7 So What).</p>
<h3>A voicing of one’s own</h3>
<p>New voicings are invented like this: a scale, a number of notes and a shape are chosen (for example two minor triads, the upper a fifth higher), and the shape is moved up the scale, keeping to its accidentals. The triads become major, diminished, augmented, the interval between the hands changes — the result is a sound “in the spirit of Gil Evans”. Only what sounds good is worth keeping.</p>
${key('For each voicing, the degree on top should be known. Then the melody itself suggests the voicing: m7 with the fifth — So What, maj7 with the seventh — So What, with the root — fourths, an altered dominant — an upper structure, everything else — a rootless left hand.')}
${tip('Left-hand voicings first — one hundred per cent reliable around the circle of fifths; then with the melody an octave higher; when the hands collide, the melody is raised rather than the voicing lowered. “Seeing the hand shape” — the interval between the thumbs (a fourth, a minor third, a whole step, a half step) — is faster than reading notes.')}
` },
{ id: 'mod', t: 'Modulation and borrowing', s: 'Moving between keys, mixing modes', src: 'jazzology,maksimov', h: `
<p>A [[modulation|modulation]] is a move to another key, confirmed by a cadence (V–I). A <b>tonicization</b> is a short visit after which the harmony returns. In jazz the line is blurry: a one-bar ii–V into a new key is already a tonicization. Most standards only seem to modulate: they are easier to analyse in the main key. The sequence of keys in a piece is called its key plan; it is tied to the form. The key signature does not have to change at a modulation.</p>
<h3>Kinds of modulation</h3>
<p><b>Direct</b> — no preparation: the new key simply starts (often at the start of a section or right after V7). <b>Prepared</b> — through a ii–V of the new key or a °7: one diminished chord leads to four keys (F♯° = rootless D7♭9, B7♭9, A♭7♭9, F7♭9). <b>Through a [[pivot|pivot chord]]</b> — a chord of both keys is reinterpreted: Am7 is vi in C and ii in G. The pivot can also be a pair of chords (Cm7–F7 is vi–II7 in E♭ and ii–V in B♭) or a single maj7 (Cmaj7 = I in C and ♭VI in E minor). <b>Transitional</b> — a short chain (for example ii–Vs by half steps), after which the key changes for good. Music most often moves to the relative key, to the dominant and its relative; to the subdominant usually as a tonicization, nearer the end.</p>
<h3>Backdoor</h3>
<p>Instead of V7–I comes ♭VII7–I (B♭7 → C) or iv–♭VII7–I (Fm7 B♭7 → Cmaj7) — the [[backdoor|backdoor]], borrowed from the parallel minor: a soft, warm resolution. Many “modulations” in standards are in fact a backdoor: IVmaj7 → ivm7 → ♭VII7 → I.</p>
<h3>Modal interchange</h3>
<p>In major one can take chords of the parallel minor and other modes on the same tonic: iv, ♭VI, ♭VII, ♭III, iiø — that is [[interchange|modal interchange]]. The melody usually suggests the moment: a ♭6 or ♭3 in the melody is the cue. The “Phrygian cadence” is ivm6 in first inversion before V. In minor, chords are taken from major — the Picardy tonic and iim7.</p>
${lab('mi')}
<p>The full picture is the table “eight modes × seven degrees”: for each degree of major, the chord in the same place in harmonic, melodic and natural minor, and in the Dorian, Phrygian, Lydian, Mixolydian and Locrian modes on the same tonic.</p>
${lab('migrid')}
<h3>Picardy third</h3>
<p>The [[picardy|Picardy third]] is a minor piece ending on a major tonic. In jazz it is a common final gesture.</p>
` },
{ id: 'reharm', t: 'Reharmonization', s: 'Substitutes and when they are justified, tonic and minor by the melody, any chord over any bass', src: 'jazzology,levine,piano,alekseev', h: `
<p>[[reharm|Reharmonization]] puts new chords under the same melody. The main rule: <b>the melody must stay a chord tone or an available tension</b>. If a melody note becomes an avoid note, the substitute does not work.</p>
<h3>Diatonic substitution</h3>
<p>Chords of one function replace each other: I ↔ iii ↔ vi, ii ↔ IV. Cmaj7 → Em7 — three common notes. The reason is simple: ii and IV both contain the tonic and the unstable degree IV, V7 and viiø contain the tritone (IV and VII), and I, iii and vi contain the tonic notes.</p>
<h3>Modal substitution</h3>
<p>In modal music a substitute is chosen not by function but by the shared scale — [[modalSub|modal substitution]]: any chord on a note of the mode built only from notes of the mode will do. In F Lydian, instead of Bm7♭5 — Cmaj7, Dm7, Em7, Fmaj7, G7, Am7. There is one prohibition: the chord must not create functional pull — in B Locrian, Cmaj7 instead of Bm7♭5 would destroy the mode and pull towards C.</p>
<h3>Tritone substitute</h3>
<p>The [[tritsub|tritone substitute]] replaces a dominant with the dominant a tritone away, G7 → D♭7. The shared tritone (B–F / C♭–F) stays, both pull to C, and the bass falls a half step instead of leaping a fifth. The symbol is SubV7/I; secondary dominants have their own substitutes (in C, SubV7/ii = E♭7). An unaltered SubV7 takes the Lydian dominant scale.</p>
${lab('tritone')}
<p>When is a substitute really justified? Levine gives two criteria: a chromatic bass appears — or the melody note becomes more interesting. G over F7 is the 9, but over B7 it is the ♯5: more interesting. E♭ over G7♯5 is the ♯5, but over D♭7 it is the 9: paler. If a chromatic bass is already there, the substitute breaks it; the whole ii–V cannot be moved a tritone if the melody over ii becomes the major third or major seventh of the new m7.</p>
${lab('ttcheck')}
<h3>Diminished substitute</h3>
<p>Any °7 is a rootless 7♭9 dominant on four different roots. So G7♭9 can be replaced by B♭7♭9, D♭7♭9 or E7♭9 — they share the same diminished chord on top. That is the [[dimsub|diminished substitute]]. All 12 °7 chords and 12 7♭9 dominants reduce to three groups, and each of the four dominants of a group can “deceptively” go to any of the four tonics.</p>
${lab('dimsub')}
<h3>Before and after</h3>
<p>The original progression and the reharmonization are worth comparing by ear. Each example is one device.</p>
${lab('reharm')}
<h3>A new look at ii and minor</h3>
<p>The ii can be made half-diminished (then V becomes ♭9 or alt) — if the melody over ii has no 5 or 6. A ii–V pair can be replaced by secondary dominants (D−7 G7 → D7 G7), especially in iii–VI–ii–V. A tonic minor with 3 or 7 in the melody sounds good as a major triad a half step below over the root (B/C instead of Cm6 with E♭ in the melody). A long minor is brought to life by the line 5 → ♭6 → 6 → ♭7 going up — or 1 → 7 → ♭7 → 6 going down (a chromatic line). Levine’s warning: the surprise should not be “telegraphed” — the chord that is meant to surprise later should not be placed earlier.</p>
<h3>The tonic by the melody note</h3>
<p>“maj7” on the page does not oblige one to play the major seventh: 6, 6/9 and Δ♯4 will do — Lydian almost always works (unless the soloist deliberately holds the 4). By the melody note on the tonic: with 3 or 7 — Δ♯5; with the root or the fifth — the tonic a half step up (the melody root becomes the major seventh, the fifth becomes ♯11; most often done on the last chord); with ♯4 or 7 — the triad a half step below over the root (B/C) and back; with the fifth — the harmonic-major maj7♭6.</p>
${lab('tonicre')}
${tip('For a horn player or singer on the last chord: the written note is played — or one’s own, but after waiting a second and cueing the last chord with a nod. Otherwise, a “train wreck”.')}
<h3>Quality change and passing chords</h3>
<p>A dominant can replace a maj7 or m7 on the same root; the I–vi–ii–V turnaround in dominants only, and then with tritone substitutes, is the Tadd Dameron turnaround. A diatonic passing chord goes between chords a third apart (Cmaj7 Dm7 Em7), a chromatic one of the same quality between chords a half step apart (Em7 E♭m7 Dm7). Before VI7 two passing dominants a half step apart are inserted, each of the same length.</p>
<h3>Passing and auxiliary °7</h3>
<p>A [[passdim|passing °7]] sits between chords a whole step apart: Cmaj7 C♯°7 Dm7. Typical places in major: on ♯1 → iim7, on ♭3 → iim7 or iiim7, on ♯4 → V7, on ♯5 → vim7; the scale is the whole-half diminished. An <b>auxiliary</b> °7 sits on the same root between two identical chords: Cmaj7 C°7 Cmaj7 — it brings a long tonic to life.</p>
<h3>Side-steps and inserted ii–Vs</h3>
<p>A [[sidestep|side-step]] moves a chord or a ii–V a half step up or down and back: a brief step outside the key. It can also be by a third (an inserted ii–V a major third lower), and in a modal tune the side-step is the main source of tension and release. A ii–V pair can be placed before any chord; pairs link into chains and mix with tritone substitutes.</p>
<h3>Chromatic line</h3>
<p>Inside a long chord one voice moves by half steps — a [[cesh|chromatic line]] (line cliché): in minor 1 → 7 → ♭7 → 6 (Cm → Cm(maj7) → Cm7 → Cm6), in major 5 → ♯5 → 6 → ♭7. It works on a ii–V too, and in four- to eight-bar intros; in Latin music it often runs in the bass over a long minor chord.</p>
<h3>Any chord over any bass</h3>
<p>Levine describes a method that opens an almost unlimited choice: [[anyBass|any chord over any bass]]. First a bass line is chosen — by half steps up or down, around the circle of fifths — then, on each bass note, a chord quality in which the melody note is a chord tone or an available tension. With the melody on ♭7 over the bass, m7, 7 and sus fit; with the melody on 11 — m7, ø, sus and sus♭9, but not maj7 and not a plain dominant. The reverse task — one melody note and all the chords under it — is a good ear exercise too: singing one note and finding as many harmonizations for it as possible (G6, Em7, E♭maj7, D7sus4, D♭7♯11, Cmaj7, B7alt… under B).</p>
${lab('onenote')}
<p>Other devices from Levine’s chapter belong here too. Contrary motion: melody up, bass down — a new chord on every note. Parallelism: one voicing follows a chromatic melody (function does not matter — the colour is what is heard). Sus and sus♭9 instead of a whole ii–V pair. Deceptive cadences: V a major third below the tonic (A7 → D♭). Common tone: a repeated melody note is harmonized with different chords that share it (G over E♭7, C7, B7♯5, B♭7, A7). Sometimes the melody itself is changed to fit the new chords — as Joe Henderson and McCoy Tyner did.</p>
<h3>A dominant can resolve anywhere</h3>
<p>The expectation of V7 resolving is so strong that an unexpected chord sounds like an event, not a mistake. Jazzology explains this through functional families: a dominant goes to a tonic (down a fifth, down a half step, up a whole step to vi, down a third to iii or ♭III), to a subdominant (down a fourth to ii, down a whole step to IV, up a half step to ♭VI) or to another dominant.</p>
${lab('v7res')}
<p>Levine answers a different question: which alteration to take for a given resolution. V7♭9 goes anywhere, most often down a fifth. V7alt and V7♯11 are tritone twins from the same melodic minor and share their goals. V7♯11 moves gently to the ii on the same root (D7♯11 → Dm7). V7♯9 often works as a tonic (the first chord of a blues) and does not pull anywhere in particular. The melody sets limits: with a natural 9 or 13 in the melody — not alt; with ♭9, ♯9 or ♭13 — not ♯11.</p>
${lab('domkind')}
${tip('It helps to reharmonize one tune with one device at a time: first only tritone substitutes, then only secondary dominants. What supports the melody is kept.')}
` },
{ id: 'centers', t: 'Tonal centres', s: 'Coltrane changes, major and minor thirds, the Locrian dominant', src: 'levine,jazzology', h: `
<p>A [[tonalCenter|tonal centre]] is a temporary key within a piece. Giant Steps has twenty-six chords but only three keys (B, G and E♭) and ten key changes. This count is the best argument for Levine’s main principle: thinking in keys, not in chords.</p>
<h3>How the centre moved before Coltrane</h3>
<p>In standards before 1959 the centre moved along three usual paths: around the circle of fifths (ii–V–I in C, then in F), down a whole step (C → B♭) and down a half step (C → B). A shift by a major third occurred only briefly, for a bar or two; the one exception is the bridge of “Have You Met Miss Jones”, where all eight bars move by major thirds. Before Giant Steps this tune was considered the hardest.</p>
${lab('centers')}
<h3>Coltrane changes</h3>
<p>The octave is split into three major thirds, and ii–V–I becomes a path through three tonics, each preceded by its own dominant — [[coltrane|Coltrane changes]]. The recipe for a four-bar ii–V–I (the Countdown formula): the starting point is the goal (C); then come the keys a major third down (C → A♭ → E); each is preceded by its V; the ii of C returns at the start; optionally, each V gets its own ii. The formula in degrees: ii – V/♭VI – ♭VI – V/III – III – V – I. Coltrane deliberately left the last bars as in the original — the soloist needs a breather.</p>
${lab('coltrane')}
<p>The places for such substitutes are ii–V–Is at least four bars long and the I–VI–ii–V and iii–VI–ii–V turnarounds. The new chords are usually written out in advance, but masters do it on the fly: in one tag George Coleman suddenly switched to motion by major thirds, and Herbie Hancock and Ron Carter followed without a word. Related moves are the Dameron turnaround, the Kenny Barron version, the path up by major thirds, three maj7s without dominants — and also dividing the octave into four: centres a minor third apart, each with its own ii–V (sometimes with a tritone substitute instead of V).</p>
${lab('ctform')}
<h3>Locrian dominant</h3>
<p>Instead of D7 → G, McCoy Tyner plays an A♭ triad over a D bass. All the notes come from E♭ major, the key a major third below the goal, and over the D bass this is D Locrian: 1, ♭5, ♭7, ♭9 — [[locV|a dominant without a third]]. The short rule: a ♭II triad over the root of V → I. Over this chord Tyner improvises with material of the ♭VI key: the E♭, A♭ and B♭ pentatonics. Levine counts this device among the same Coltrane changes — a centre a major third lower.</p>
${lab('locv')}
${tip('A single tune with Coltrane changes gives only three keys. It is more useful to improvise slowly over the first four bars of Countdown in all twelve keys and to raise the tempo only once the changes are heard.')}
` },
];
