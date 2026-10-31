// Учебник (en), часть 2: Основы гармонии. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — собственный пересказ: «Джазология» (основа), Левайн (теория и фортепиано), Фридкин (классический взгляд), Kubistra.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';
// второе мнение: другой автор смотрит иначе — оба взгляда рядом
const two = (who, t) => '<aside class="btwo"><b>Second opinion · ' + who + '</b>' + t + '</aside>';

export const S = {
  'im.harm': '(harm.)', 'im.where': 'Occurs {n} times: from degrees {list}.', 'im.none': 'This mode has no such interval.', 'im.tap': 'Tap a degree — the interval and its resolution.',
  'ti.maj': 'maj.', 'ti.min': 'min.', 'ti.dim': 'dim.', 'ti.aug': 'aug.', 'ti.inv0': 'root position (5/3)', 'ti.inv1': 'sixth chord (6)', 'ti.inv2': 'six-four chord (6/4)',
  'ti.bass': 'In the bass', 'ti.bass0': 'root', 'ti.bass1': 'third', 'ti.bass2': 'fifth', 'ti.ivs': 'Structure',
  'ti.iv.maj0': 'M3 + m3', 'ti.iv.maj1': 'm3 + P4', 'ti.iv.maj2': 'P4 + M3', 'ti.iv.min0': 'm3 + M3', 'ti.iv.min1': 'M3 + P4', 'ti.iv.min2': 'P4 + m3',
  'ti.iv.dim0': 'm3 + m3', 'ti.iv.dim1': 'm3 + A4', 'ti.iv.dim2': 'A4 + m3', 'ti.iv.aug0': 'M3 + M3', 'ti.iv.aug1': 'M3 + d4', 'ti.iv.aug2': 'd4 + M3',
  'd7.n0': 'D7 — root position', 'd7.n1': 'D6/5 — degree VII in the bass', 'd7.n2': 'D4/3 — degree II in the bass', 'd7.n3': 'D2 — degree IV in the bass',
  'd7.r0': 'Resolves to an incomplete tonic triad: VII → I, II → I, IV → III, bass V → I. The tonic is tripled, the fifth is left out.', 'd7.r1': 'Resolves to a complete tonic triad: the bass VII rises to the tonic.',
  'd7.r2': 'Resolves to the tonic triad (or its sixth chord): the bass II goes to I.', 'd7.r3': 'The seventh in the bass (degree IV) moves down — resolution to the tonic sixth chord.',
  'su.no3': 'No third', 'su.3up': 'Third above the fourth', 'su.m9': 'Fourth above the third', 'su.phr': 'Phrygian sus♭9', 'su.res': 'Sound and resolution',
  'su.n.no3': 'Gsus as F/G: root, fourth, ♭7, 9 — no third. It sounds open and leads gently to C.',
  'su.n.3up': 'The third B sits above the fourth C — as Wynton Kelly played it. Contrary to the myth, a third in a sus chord is possible; it may be its most beautiful sound.',
  'su.n.m9': 'The fourth C above the third B makes a minor ninth — a sharp clash. It is saved for modal tunes, where the harmony stays put for a long time.',
  'su.n.phr': 'Esus♭9: root, ♭9, fourth, fifth, ♭7 — the Phrygian chord. It works as a dominant and resolves down a fifth (here to A).',
  'un.lh': 'left hand — the tritone 3 and ♭7 (sometimes with the root in the bass)', 'un.twin': 'Twin', 'un.noTwin': 'none: the structure already sounds like a tritone substitute', 'un.twinIs': 'the same structure — {u} over {r}',
  'un.root': 'Root in the bass', 'un.rootYes': 'needed — otherwise a tritone substitute is heard', 'un.rootNo': 'optional', 'un.res': 'Down a fifth', 'un.resYes': 'pulls — a classic dominant', 'un.resNo': 'sounds like a tonic, bluesy', 'un.go': 'Resolution to {t}',
  'sl.s.db': '≈ Csus♭9 (♭13)', 'sl.s.d': 'CΔ♯4 — Lydian', 'sl.s.eb': 'just Cm7', 'sl.s.e': 'CΔ♯5', 'sl.s.f': 'F in 2nd inversion', 'sl.s.gb': '≈ C7♭9 without the 3rd', 'sl.s.g': 'CΔ9', 'sl.s.ab': 'A♭ in 1st inversion', 'sl.s.a': '≈ C13♭9', 'sl.s.bb': 'Csus (C9sus4)', 'sl.s.b': 'instead of the tonic',
  'sl.n.db': 'A D♭ major seventh chord with its major seventh C in the bass. As a dominant it leads to F.', 'sl.n.d': 'A triad a whole step above the bass gives 9, ♯11, 13 — Lydian major.', 'sl.n.eb': 'The notes of Cm7; written this way only within a chain of chords over one bass.',
  'sl.n.e': 'A triad a major third higher — the Lydian augmented chord.', 'sl.n.f': 'An ordinary F triad with the fifth in the bass.', 'sl.n.gb': 'A triad a tritone higher: ♭5, ♭7, ♭9 — a dominant without the third.',
  'sl.n.g': 'A triad a fifth higher: 5, 7, 9 — a major ninth chord.', 'sl.n.ab': 'An A♭ triad with the third in the bass; together with G♭/C it gives C7alt.', 'sl.n.a': 'A triad a sixth higher: 13, ♭9, 3 — a dominant with a minor ninth.',
  'sl.n.bb': 'A triad a whole step below the bass — a dominant sus.', 'sl.n.b': 'A triad a half step below the bass — the sound of the diminished scale; with Red Garland and Miles, a final chord instead of the tonic.',
  'sl.scale': 'Scale: {s}.', 'sl.alt': 'G♭/C + A♭/C = C7alt', 'sl.top': 'Chord over G', 'sl.sounds': 'Sounds like',
  'fs.maj': 'Major chords', 'fs.min': 'Minor chords', 'fs.dom': 'Dominants', 'fs.dim': 'Diminished and half-diminished', 'fs.hint': 'struck through — avoid note; tap — chord and scale',
  'ad.mixed': 'mixed — check the tensions',
  'ad.n.mixolydian': 'Natural 9 and 13 — the Mixolydian mode.', 'ad.n.lyddom': '♯11 without altered ninths — Lydian dominant (4th mode of melodic minor).',
  'ad.n.altered': '♭9 or ♯9 together with ♭13 and without natural 5, 9, 13 — the altered scale (7th mode of melodic minor).', 'ad.n.dimhw': '♭9 or ♯9 together with natural 5 and 13 — the half-whole diminished scale.',
  'ad.n.phrdom': '♭9 and ♭13 with a natural fifth — Phrygian dominant (5th mode of harmonic minor), V in minor.', 'ad.n.whole': '9, ♯11 and ♭13 without a natural fifth — the whole-tone scale.',
  'ad.n.mixob13': '9 and ♭13 with a natural fifth — Mixolydian ♭13 (5th mode of melodic minor).', 'ad.n.mixed': 'No main scale has this combination: the symbol is worth checking against the melody.',
  'cr.up': 'Up', 'cr.down': 'Down', 'cr.n.maj': 'Major: going up — raised degrees, except III and VI, while VII is lowered; going down — lowered degrees, except I and V (a raised IV instead of a lowered V).', 'cr.n.min': 'Minor: degrees I and V are not repeated in either direction — fewer accidentals, and the key stays clear.',
  'mm.hint': 'one voice on top, only the bass changes', 'mm.all': 'All basses in turn', 'mm.iiv': 'Minor ii–V–i in C: ø → alt a m3 higher',
  'mm.n0': 'I: minor with a major seventh — the tonic minor. It can also be played as m6.', 'mm.n1': 'II: sus♭9 — Phrygian sus with a natural 13; works as a dominant.', 'mm.n2': 'III: Δ♯5 — Lydian augmented.',
  'mm.n3': 'IV: 7♯11 — Lydian dominant; the tritone twin of the altered dominant on degree VII.', 'mm.n4': 'V: 7♭13 is rarely played — in practice it is the minor-major chord of degree I with the fifth in the bass.',
  'mm.n5': 'VI: ø — half-diminished with a natural ninth (Locrian ♮2).', 'mm.n6': 'VII: 7alt — the altered dominant; it resolves a half step up, to the tonic of melodic minor.',
  'hm.ok': 'Every strong beat is in its chord. Ready to listen.', 'hm.bad': 'Bars where the strong-beat note is not in the chord: {n} (highlighted). Hint: degrees II, IV, VI — S; V, VII, II — D.', 'hm.sol': 'Sample answer',
};

export const TERMS = {
  ivAbbr: ['Interval shorthand', 'major and perfect — a plain number (3, 5), minor — with ♭ (♭3), augmented — with ♯ (♯4), diminished perfect — with ♭ (♭5), diminished seventh — 𝄫7.', 'iv'],
  ivMode: ['Intervals in a key', 'where each interval sits in major and minor; stable intervals consist of notes of the tonic triad, unstable ones resolve to stable ones.', 'iv'],
  charIv: ['Characteristic intervals', 'intervals formed by the altered degree of a harmonic mode: A2, d7, A5, d4.', 'iv'],
  sixth: ['Sixth chord and six-four chord', 'inversions of a triad: the third (6) or the fifth (6/4) in the bass.', 'chords'],
  d7: ['Dominant seventh (V7)', 'the seventh chord on degree V: a major triad with a minor seventh; inversions — D6/5, D4/3, D2.', 'chords'],
  leadseventh: ['Leading-note seventh chords', 'seventh chords on degree VII: half-diminished (viiø7, m7♭5) in natural major and fully diminished (vii°7) in harmonic modes.', 'chords'],
  susb9: ['Phrygian chord (sus♭9)', 'a dominant sus with a minor ninth: 1, ♭9, 4, 5, ♭7; the main chord of the Phrygian mode.', 'chords'],
  ustnum: ['Upper structure number', 'a name for a triad over the dominant’s tritone by its interval from the root: II, ♭III, ♭V, ♭VI, VI and the minor Im, ♭IIm, ♭IIIm, ♯IVm.', 'chords'],
  hybrid: ['Hybrid chord', 'a chord over a foreign bass note that does not belong to it: D/C, F/G.', 'slash'],
  parent4: ['Four parent scales', 'Levine’s view: almost all chords derive from major, melodic minor, the diminished and the whole-tone scales.', 'scales'],
  famscale: ['Chord and scale families', 'scales grouped by chord type — major, minor, dominant, diminished — and written as degrees and tensions.', 'scales'],
  tonalDeg: ['Tonal and modal degrees', '1, 4, 5 are the same in five modes of major (all but Lydian and Locrian); 2, 3, 6, 7 change and define the mode.', 'scales'],
  chromscale: ['Chromatic scale', 'a scale of twelve semitones; its spelling depends on the key and the direction.', 'scales'],
  varmode: ['Variable mode', 'a mode with two tonics, most often relative major and minor.', 'scales'],
  thinkKey: ['Thinking in keys', 'Levine’s principle: several chords from one scale are one key, not a string of different chords.', 'melmin'],
  mainTriads: ['Primary triads', 'the triads of the tonic (I), subdominant (IV) and dominant (V).', 'key'],
};

export const CH = [
{ id: 'iv', t: 'Intervals', s: 'The building blocks of harmony', src: 'jazzology,levine,fridkin', h: `
<p>An [[interval|interval]] is the distance between two notes. It is measured with two numbers: how many <b>letters</b> (degrees) it spans and how many <b>semitones</b> it contains. The first gives the name (second, third, fourth…), the second the quality (minor, major, perfect, augmented, diminished). That is why C–E♯ and C–F are different intervals although they are the same key on the keyboard: the first is an augmented third, the second a perfect fourth. The size of an interval can also be measured in tones: a perfect fourth is 2½ tones, a perfect fifth 3½, a major sixth 4½, a major seventh 5½.</p>
<p>In jazz intervals are usually named as degrees above the chord root: ♭3, ♯11, ♭13. It is the same language: “♭9” is a minor second an octave up, “13” is a major sixth an octave up. The rules of [[ivAbbr|shorthand]]: major and perfect intervals are written as a plain number (3, 5, 7), minor ones with a flat (♭3, ♭7), augmented ones with a sharp (♯4, ♯5), diminished perfect ones with one flat (♭5), the diminished seventh with two (𝄫7). For a note the sign comes after the letter (F♯), for a degree before the number (♯4).</p>
<table class="bktab"><tr><th>Diminished</th><td>←</td><th>Minor</th><td>↔</td><th>Major</th><td>→</td><th>Augmented</th></tr><tr><td>𝄫3, 𝄫7</td><td></td><td>♭3, ♭6, ♭7</td><td></td><td>3, 6, 7</td><td></td><td>♯2, ♯6</td></tr></table>
<p>Perfect intervals (unison, fourth, fifth, octave) have no “minor” step: from perfect they go straight to diminished or augmented. So there is no “minor fifth” — only a diminished one (♭5). The tritone is sometimes written TT.</p>
${lab('iv')}
<h3>All intervals up to the thirteenth</h3>
<p>Intervals wider than an octave are <b>compound</b>: a ninth is a second plus an octave, a tenth a third plus an octave, an eleventh a fourth plus an octave, a twelfth a fifth plus an octave, a thirteenth a sixth plus an octave. They give chords their [[tension|tensions]] — 9, 11, 13.</p>
${lab('ivtable')}
<h3>Enharmonically equivalent intervals</h3>
<p>Intervals with the same number of semitones but different names sound the same and mean different things: a minor third (C–E♭) and an augmented second (C–D♯), the tritone as an augmented fourth (C–F♯) and as a diminished fifth (C–G♭). The pairs: m2 = A1, M2 = d3, m3 = A2, M3 = d4, P4 = A3, A4 = d5, P5 = d6, m6 = A5, M6 = d7, m7 = A6, M7 = d8. Which name is correct depends on the spelling of the notes, and so on the key and the chord.</p>
<h3>Inverting an interval</h3>
<p>When the lower note moves up an octave, the interval is inverted. The names always add up to 9 (third ↔ sixth, second ↔ seventh, fourth ↔ fifth), the quality flips: major ↔ minor, augmented ↔ diminished, perfect stays perfect. The semitones add up to 12. Inversion is a handy way to transpose in the head: a major sixth up is easier to find as a minor third down.</p>
${key('The [[tritone|tritone]] (6 semitones) halves the octave and stays a tritone when inverted. It is the engine of the dominant and the basis of the tritone substitute.')}
${tip('A sixth is easy to build from the octave: a major sixth is an octave minus a minor third, a minor sixth an octave minus a major third; a seventh is an octave minus a second.')}
<h3>Consonance and dissonance</h3>
<p>[[consonance|Perfect consonances]] are the unison, octave, fifth and fourth; imperfect ones are thirds and sixths; dissonances are seconds, sevenths and the tritone. The fourth is a conditional consonance: above the bass it sounds unstable, inside a chord it sounds calm. Augmented and diminished intervals are dissonances even when they sound like consonances: on the piano an augmented second equals a minor third, but in a key it needs resolution.</p>
<p>In jazz a dissonance is not a mistake but a colour: the major seventh in maj7, the minor ninth in 7♭9. What matters is where it sits and where it resolves.</p>
${tip('An interval is worth singing before it is played. The most useful ones for jazz are thirds and sevenths: [[guide|guide tones]] are made of them.')}
<h3>Intervals by ear: tune openings</h3>
<p>An interval is easier to recognise when it is tied to a familiar melody. Levine compiled a table where an interval is the first two notes of a well-known jazz tune. Singing them every day without an instrument is useful, and so is naming the intervals between melody notes while listening to recordings.</p>
<table class="bktab"><tr><th>Interval</th><th>Up</th><th>Down</th></tr>
<tr><td>minor second</td><td>Blue Monk</td><td>Bolivia</td></tr><tr><td>major second</td><td>Four</td><td>—</td></tr><tr><td>minor third</td><td>Confirmation</td><td>—</td></tr>
<tr><td>major third</td><td>Monk's Dream</td><td>Giant Steps</td></tr><tr><td>perfect fourth</td><td>Jordu</td><td>ESP</td></tr><tr><td>tritone</td><td>Isotope</td><td>—</td></tr>
<tr><td>perfect fifth</td><td>Bags' Groove</td><td>Katrina Ballerina</td></tr><tr><td>minor sixth</td><td>In a Capricornian Way</td><td>—</td></tr><tr><td>major sixth</td><td>Misterioso</td><td>All Blues</td></tr>
<tr><td>minor seventh</td><td>Aisha (end of the bridge)</td><td>Chelsea Bridge (bridge)</td></tr><tr><td>major seventh</td><td>Serenity (2nd and 3rd notes)</td><td>Lady Day</td></tr><tr><td>octave</td><td>Del Sasser</td><td>—</td></tr></table>
<h3>Intervals in a key</h3>
<p>So far an interval has been just a distance. In a key it gains a role. In major each interval sits on certain degrees: minor seconds only on III and VII, major thirds on I, IV and V, and there is a single tritone: the augmented fourth on IV (F–B in C major) and the diminished fifth on VII (B–F). Harmonic minor adds the [[charIv|characteristic intervals]] — from the raised degree VII: the augmented second VI–VII, the diminished seventh VII–VI, the augmented fifth III–VII and the diminished fourth VII–III.</p>
<p>[[ivMode|Stable intervals]] are made of notes of the tonic triad (I, III, V); the others are unstable and resolve: a stable note stays, an unstable one moves to the nearest stable note. Augmented intervals expand when they resolve, diminished ones contract: the tritone F–B opens to E–C, B–F closes to C–E. It is the same force that drives the dominant in jazz, only at the level of two voices.</p>
${lab('ivmode')}
` },
{ id: 'chords', t: 'Chords', s: 'From the triad to the thirteenth; classical and jazz names', src: 'jazzology,levine,piano,fridkin', h: `
<p>A jazz chord is built in thirds from the root: 1–3–5–7, then 9, 11, 13. The lower four notes define the <b>quality</b>, the upper ones the <b>colour</b>. Almost all standard harmony comes down to five main [[seventh|seventh chords]] — maj7, m7, 7, m7♭5, °7 — and two additional ones, m(maj7) and 7sus4.</p>
<h3>Triads</h3>
<p>[[triad|Triads]]: major (M3 + m3), minor (m3 + M3), diminished (m3 + m3) and augmented (M3 + M3). Their notes are called the root, the third and the fifth. Apart from them are [[sus|sus chords]], where a fourth takes the place of the third: they sound open and lean neither to major nor minor. Each type of triad has its own character: major — strength and light, minor — sadness and reflection, diminished — unease, augmented — haze, enchantment.</p>
<p>On the degrees of major there are major triads (I, IV, V), minor ones (II, III, VI) and one diminished (VII). In harmonic minor: minor on I and IV, major on V and VI, diminished on II and VII and augmented on III — it is the raised degree VII that gives the major dominant and the augmented triad. Diminished and augmented triads are unstable and pull to the tonic.</p>
${lab('triads')}
<h3>Inversions</h3>
<p>In root position the root is at the bottom. In the [[inversion|first inversion]] the 3rd is at the bottom, in the second the 5th, in the third (for seventh chords) the 7th. Classical harmony gives inversions their own names and figures — by the intervals above the bass: the triad 5/3, the [[sixth|sixth chord]] 6 (the third in the bass), the six-four chord 6/4 (the fifth in the bass); for a seventh chord — the six-five chord 6/5, the four-three chord 4/3 and the two (four-two) chord 2. In jazz the same is written with a slash: C/E is the sixth chord of C major, C/G the six-four chord. Inversions keep voices moving smoothly and shape bass lines.</p>
${lab('chord')}
<h3>Seven seventh chords</h3>
<p>Compared on one root, they differ by one note — and with it the character changes: maj7 → 7 (the 7th drops), 7 → m7 (the 3rd drops), m7 → m7♭5 (the 5th drops), m7♭5 → °7 (the 7th drops another half step). They are written in different ways: maj7 = M7 = Δ, m(maj7) = −Δ = mM7, m7 = −7 = min7, m7♭5 = ø, °7 = dim7, 7sus4 = 7sus.</p>
${lab('seventh')}
<p>Classical theory has its own names for seventh chords. The [[d7|dominant seventh]] (V7, D7) is the seventh chord on degree V, a major triad with a minor seventh: in jazz it is simply “7”. The [[leadseventh|leading-note seventh chords]] stand on degree VII: the half-diminished viiø7 (m7♭5) in natural major and the fully diminished vii°7 (°7) in harmonic minor and major. D7 resolves to the tonic by the rules of voice leading: degree VII rises to I, IV falls to III, II goes to I; each inversion has its own resolution and its own bass note.</p>
${lab('d7')}
${key('The 3rd and 7th decide what chord it is. The 5th can be left out almost always (except ♭5 and ♯5), the root — whenever the bass plays it.')}
<h3>Sixth chords</h3>
<p>C6 (1–3–5–6) and Cm6 (1–♭3–5–6) are tonics often used instead of maj7 and m7, especially when the melody is on the root: a major seventh under a root in the melody makes a harsh minor second. 6/9 is the same sixth chord with a ninth — the calmest major sound. The symbol also hints at the chord type: 6 is written on major and minor chords, 13 on dominants; 4 on major and sus chords (C♯4, Csus4), 11 on dominants and minor chords (C7♯11, Cm11).</p>
<h3>Tensions</h3>
<p>The 9th, 11th and 13th add colour. The main rule of alteration: altering a triad note (3 or 5) changes the chord type; altering a tension (9, 11, 13) keeps the type and changes the colour. Not all tensions are available: a tension a half step above a chord tone (except ♭9 on a dominant) clashes with it. So 11 over a major 3rd (F over E in Cmaj7) sounds wrong, and major chords take ♯11 instead.</p>
${lab('tens')}
<p>The <b>dominant</b> is the most flexible chord. The short formula: a dominant takes everything except 11 and the major seventh. It takes natural tensions (9, 13) or altered ones (♭9, ♯9, ♯11, ♭13). ♭9/♯9 with ♭13 gives the [[altered|altered dominant]] — 7alt, the chord with the strongest pull to resolve. The symbol G7♭13 is risky: many will read it as alt, although a natural 9 is meant; a whole-tone chord is safer written as G7♯5. And °7 and m7♭5 often have enough dissonance without tensions.</p>
<h3>Sus chords</h3>
<p>A sus chord is usually explained as a chord with the third replaced by a fourth. That is true for the symbol, but Levine looks at sus functionally: it is a dominant in which the fourth does not sound like an avoid note. Gsus is Dm7 over G, or F/G: in effect ii–V in one chord. The defining notes of sus are 1, 4 and ♭7; a convenient voicing is a major triad a whole step below the root, over the bass.</p>
${two('Levine', 'The claim that “a sus chord cannot take a third” is a myth. Pianists (Wynton Kelly) play both the third and the fourth, with the third above the fourth. With the fourth above the third, a minor ninth appears between them — the harshest interval; it is saved for modal tunes, where the harmony stays put.')}
<p>A close relative is the [[susb9|Phrygian chord]] sus♭9: 1, ♭9, 4, 5, ♭7 (the same five notes as the Japanese In-sen scale). The Phrygian mode hardly works over an ordinary m7 — its ♭6 clashes with the chord — but it gives this chord. Sus♭9 works as a dominant and resolves down a fifth; it often replaces sus, V7 and a whole ii–V.</p>
${lab('sus')}
<h3>Upper structures</h3>
<p>An easy way to get a rich dominant: the left hand holds 1–3–♭7, the right hand plays an ordinary triad. The triad on top adds three tensions at once — an [[ust|upper structure]]. Any of the 24 triads can be chosen to hear what it does over the dominant. Red cells are triads with the 11th or the major 7th: they clash with the dominant.</p>
${lab('ust')}
<p>Levine organises the good upper structures into a system of nine, naming each by a [[ustnum|number]] — the interval from the dominant’s root to the triad’s root. Five major: II (9, ♯11, 13), ♭III (♯9, 5, ♭7), ♭V (♭5, ♭7, ♭9), ♭VI (♭13, 1, ♯9), VI (13, ♭9, 3); four minor: Im, ♭IIm, ♭IIIm, ♯IVm. The most common are II, ♭VI and VI: the three main colours of the dominant — ♯11, alt and ♭9. Structures of one scale are interchangeable; when it is unclear whether the soloist plays ♭9 or alt, ♭V fits: it belongs to both scales. Three structures (♭V, ♭IIm, ♭IIIm) without the root in the bass sound like an ordinary tritone substitute — the root is added to them. ♭III and Im sound like a tonic, “bluesy”, and do not pull down a fifth.</p>
${lab('ustnum')}
${tip('If the third is already in the right hand, the left hand does not double it. Guitarists often take only 1 and ♭7 at the bottom, freeing fingers for the triad. A doubled note of the upper structure goes on top. Going through all the good structures over one dominant shows that almost the whole chromatic scale is available to it.')}
<p>Chords over a bass and polychords are the subject of the next chapter.</p>
` },
{ id: 'slash', t: 'Chords over a bass', s: 'A triad or seventh chord over a foreign bass: what it sounds like and which scale', src: 'levine,jazzology,piano', h: `
<p>A symbol with a slash (C/E, D/C, F/G) is a [[slash|chord over a bass note]]. It stands for three different things, and they are worth telling apart. An <b>inversion</b>: the bass is a note of the chord itself (C/E). A <b>[[hybrid|hybrid chord]]</b>: the bass does not belong to the chord, and together they make a new sound (D/C, F/G). An <b>upper structure</b>: a triad over a left-hand chord — covered in the chapter “Chords”. A fraction with a horizontal line is a [[poly|polychord]]: two chords at once.</p>
<h3>Twelve triads over one bass</h3>
<p>Levine suggests a simple exercise: C in the bass and all the major triads over it in turn. Each gives its own chord with its own scale. D/C is Lydian major (9, ♯11, 13), E/C Lydian augmented, G/C simply Cmaj9, B♭/C a dominant sus, A/C a dominant with ♭9, G♭/C a dominant without the third, D♭/C a Phrygian sound, B/C the sound of the diminished scale, which Red Garland and Miles Davis used as the last chord instead of the tonic. The triad sounds best in second inversion — with the fifth at the bottom. Bud Powell was the first to play such chords systematically; they often go over a descending bass line.</p>
${lab('slashtri')}
${tip('Two triads together — G♭/C and A♭/C — give a complete C7alt. The whole-tone scale is not among the twelve: it contains no major triads.')}
<h3>Seventh chords over a bass</h3>
<p>“Jazzology” extends the idea to seventh chords: any seventh chord over a foreign bass reads as one chord with tensions. Fmaj7/G is G13sus4, Dm7/G is G11, B♭maj7/G is Gm9, Fm7/G is G7sus4♭9♭13, A♭maj7/G is the Phrygian chord. Such symbols appear in modern standards and fusion: the musician sees a familiar top and a bass, and hears a complex chord.</p>
${lab('slash7')}
<h3>Two more sounds</h3>
<p>The fifth mode of melodic minor over its own bass (Fm(maj7)/C) hardly works as C7♭13 — 4 and 5 are awkward — but as a chord over a bass it is “beautiful and mysterious”. It can be written in six equivalent ways: F−Δ/C, Gsus♭9/C, A♭Δ♯5/C, B♭7♯11/C, Dø/C, E7alt/C. And the harmonic major chord — maj7 with ♭6 (C–E–G–A♭–B): it replaces an ordinary maj7 when the melody is on the fifth and sounds mysterious and dark (Herbie Hancock, “Dolphin Dance”).</p>
${key('A chord over a bass is not “a chord with a wrong bass note” but a simple way to write a complex sound: a familiar shape on top, a bass below. What has to be heard is the whole.')}
` },
{ id: 'scales', t: 'Scales and modes', s: 'Major and its modes, scales by chord family, minor, symmetric scales, the chromatic scale', src: 'jazzology,levine,kubistra,alekseev,fridkin', h: `
<p>A [[scale|scale]] is the set of notes a melody over a chord is made from. The jazz approach is simple: <b>each chord has a scale</b> that contains all its notes and suitable tensions. There are many scales, but they come from three parents — major, melodic minor and harmonic minor — plus a few symmetric ones.</p>
${two('Levine', 'There are not three parent scales but [[parent4|four]]: major, melodic minor, diminished and whole-tone. Levine removes harmonic minor from the foundation: the masters hardly ever play it whole over a minor ii–V–i, and take three different melodic minors instead — for ø, for alt and for the tonic minor. A chord and its scale are “two forms of the same thing”; in the 1950s–60s jazz turned from thinking in chords to thinking in scales, and Levine considers this turn almost as important as the arrival of bebop.')}
<h3>Modes of major</h3>
<p>Playing the notes of C major from D to D gives the Dorian [[mode|mode]], from E the Phrygian, and so on. Same notes, new centre — new character. It is easier to think of a mode as major or minor with one changed degree: Dorian is minor with a major 6th, Lydian is major with ♯4, Mixolydian is major with ♭7. These modes lived in folk music long before jazz, and their characteristic degrees have their own names: the Dorian sixth, the Phrygian second, the Lydian fourth, the Mixolydian seventh.</p>
${lab('scale')}
<h3>The brightness ladder</h3>
<p>The seven modes on one root can be arranged by brightness: from Lydian to Locrian each next mode lowers exactly one degree. Tapping the steps of the ladder lets the light leave one note at a time. The five middle modes — Ionian, Dorian, Phrygian, Mixolydian, Aeolian — share degrees 1, 4 and 5: these are the [[tonalDeg|tonal degrees]], the support; 2, 3, 6 and 7 change and define the mode. Lydian (♯4) and Locrian (♭5) break this support — which is why they stand at the ends of the ladder, with Dorian in the middle.</p>
${lab('bright')}
${key('A mode is recognised by its [[chartone|characteristic degree]]: Dorian — 6, Phrygian — ♭2, Lydian — ♯4, Mixolydian — ♭7, Aeolian — ♭6, Locrian — ♭5. Stressed in the melody, it makes the mode heard.')}
<h3>Scales by chord family</h3>
<p>There is also the opposite view: not “which scale this mode comes from” but “which scales suit this chord”. Scales are grouped into [[famscale|families]] — major, minor, dominant, diminished — and written as degrees and tensions: 1 9 3 11 5 13 7. This shows at once how the scales of one family differ (usually by one or two degrees) and where the [[avoid|avoid note]] is: 4 over a major chord, ♭6 in Aeolian, ♭2 and ♭6 in Phrygian, ♭2 in Locrian.</p>
${lab('famscale')}
<p>A short practical list — ten essential modes. Major: Ionian, Lydian (♯4), Mixolydian (♭7). Minor: Aeolian, Dorian (6), Phrygian (♭2) and Locrian (♭2, ♭5). Dominant: Mixolydian, Lydian dominant (♯4), altered and half-whole diminished. Over Bø the beboppers played Locrian, Bud Powell harmonic minor, and since the 1960s Locrian ♮2 more often; many use both.</p>
<h3>Melodic minor</h3>
<p>Jazz [[melmin|melodic minor]] is the same up and down: minor with a major 6th and a major 7th. Its modes give sounds that major does not have: Lydian dominant, altered, Locrian ♮2, Lydian augmented. The essentials are in a separate chapter: it is not just a scale but a whole key from which six chords grow.</p>
<h3>Harmonic minor and harmonic major</h3>
<p>[[harmmin|Harmonic minor]] is minor with a major 7th. Its fifth mode — <b>Phrygian dominant</b> (Mixolydian ♭9 ♭13) — is the main scale of the dominant in minor: G7♭9 in C minor. Its characteristic interval is the minor third (augmented second) between the 6th and 7th degrees: it is found neither in major, nor in melodic minor, nor in the symmetric scales.</p>
${two('Levine', 'Harmonic minor as a whole fits none of the chords of a minor ii–V–i: a sustained note clashes with the chord (over Dø — E♭ and B, over G7♭9 — C and E♭, over Cm(maj7) — A♭). In eighth notes the whole progression sounds fine — the awkward notes fly past. The scale works best over a V7♭9 resolving down a fifth to minor. “Everything in theory, this book included, should be taken with a grain of salt.”')}
<p>[[harmmaj|Harmonic major]] — major with ♭6 — gives the maj7 chord with ♭6, a “mysterious” version of the tonic; it is used when the melody over maj7 is on the fifth.</p>
<h3>Altered or diminished?</h3>
<p>Over an altered dominant the tensions themselves point to the scale. ♭9 or ♯9 together with ♭13 (♯5) — the altered scale: it has no natural 9 and no natural 5 or 13. ♭9 or ♯9 together with natural 5 and 13 — the half-whole diminished scale. 9, ♯11 and ♭13 without a fifth — the whole-tone scale. G13♭9 is diminished, G7♯9♭13 is altered.</p>
${lab('altdim')}
<h3>Symmetric scales</h3>
<p>The [[dimscale|diminished scale]] alternates whole and half steps. Shifting its start gives only three different ones, each fitting four °7 chords and four 7♭9 dominants at once. The ♭9 symbol on a dominant usually implies the whole set of this scale: ♭9, ♯9, ♯11, natural 5 and 13. A °7 in a tune is almost always a rootless V7♭9 of the next chord (GΔ G♯° Am7 = GΔ E7♭9 Am7), sometimes of the chord after it; since bebop, °7 in old tunes has often been replaced with V7♭9. A plain °7 sounds bland: any of its notes raised a whole step stays in the same scale and gives the chord a “bite”.</p>
${lab('dimeq')}
<p>The [[wholetone|whole-tone scale]] has six notes a whole step apart; there are only two of them, and they fit 7♯5. Half of the intervals are missing from it (minor second, minor third, fourth, fifth), so it quickly wears thin: it is used in small doses, and alt is often played instead of 7♯5. The master of the whole-tone scale is Thelonious Monk, and his secret lies in the rhythm, not the notes.</p>
<h3>Pentatonics and the blues scale</h3>
<p>A [[pentatonic|pentatonic]] has five notes without half steps: major (1 2 3 5 6) and minor (1 ♭3 4 5 ♭7) are the same scale from different notes. It is major without degrees IV and VII, so it contains no tritone — no tendencies, which is why the pentatonic fits almost anything. The [[blues|blues scale]] is the minor pentatonic with an added ♭5. Japanese modes Kumoi, In-sen and Hirajoshi are pentatonics with half steps; they sound modern over m6, sus and maj7♯11.</p>
<h3>Bebop scales</h3>
<p>A [[bebop|bebop scale]] is a seven-note scale plus one chromatic note. Moving in eighths from a chord tone puts chord tones on the strong beats. Bebop dominant is Mixolydian with a major 7th (chromatic between ♭7 and 1); bebop major is major with ♯5; bebop Dorian is Dorian with a major 3rd; there is also bebop melodic minor (chromatic between 5 and 6). Bebop Dorian on D has the same notes as bebop dominant on G: one scale covers the whole ii–V. Bebop scales most often sound from the top down.</p>
${tip('A scale is best learned through its chord: chord in the left hand, scale in the right, starting not only from the root but from every chord tone. The diagram above has an “Over the chord” button.')}
<h3>The chromatic scale</h3>
<p>The [[chromscale|chromatic scale]] is all twelve semitones in a row. It always sounds the same but is spelled differently — by key and direction. In major, going up, all degrees except III and VI are repeated raised, and VII comes lowered; going down, all except I and V are repeated lowered. In minor, I and V are not repeated in either direction. This rule also explains bebop chromaticism: why a passing note is written now with a sharp, now with a flat.</p>
${lab('chromsc')}
<h3>Variable mode</h3>
<p>Sometimes a melody has two centres: one phrase in F major, the next in D minor, and neither dominates. This is a [[varmode|variable mode]] — usually relative major and minor. There is no modulation: both centres live in one set of notes. The jazz ear finds this familiar — it is how “tonal centres” and modal thinking work.</p>
<h3>All scales</h3>
<p>The full list: modes of major, melodic and harmonic minor, harmonic major, symmetric scales, pentatonics, bebop and world scales — Hungarian, Gypsy, Persian, Arabian, Balinese and more.</p>
${lab('refsc')}
` },
{ id: 'melmin', t: 'Melodic minor', s: 'One key — six chords; thinking in keys, not chords', src: 'levine,piano,jazzology', h: `
<p>Melodic minor is the main discovery of modern jazz harmony and, according to Levine, the key to the whole sound after the 1960s. Its seven degrees give seven chords; in C melodic minor they are Cm(maj7), Dsus♭9, E♭Δ♯5, F7♯11, G7♭13, Aø and B7alt. The mode numbers are worth learning as a family, as one row: minor-major — I, sus♭9 — II, Δ♯5 — III, 7♯11 — IV, ø — VI, alt — VII. The fifth mode (7♭13) is rarely played: in practice it is the minor-major chord of degree I with the fifth in the bass.</p>
<h3>No avoid notes</h3>
<p>In major every chord has an “avoid” note: 4 over I, 4 over V. Melodic minor has none — every note of the scale suits every chord of its family. Hence the main conclusion: everything within one melodic minor key is interchangeable. The same voicing, the same phrase, the same lick fit Cm(maj7), Dsus♭9, E♭Δ♯5, F7♯11, Aø and B7alt — only the bass changes. This is [[thinkKey|“thinking in keys, not chords”]].</p>
${lab('mmfamily')}
<p>Two “characteristic four-note groups” help identify the key: the notes 1–3–5–7 and 3–5–7–9 of melodic minor (C–E♭–G–B and E♭–G–B–D) occur together in no other key — not in major, not in diminished, not in whole-tone. Either of them “names” the key at once, which is why pianists play them over all six chords of the family. Fourths in melodic minor come in three kinds — perfect, tritones and one “fourth” that sounds like a major third (B–E♭); hence its dark, unusual sound.</p>
<h3>Tritone twins</h3>
<p>The two dominant chords of one key — 7♯11 (degree IV) and alt (VII) — lie a tritone apart and are in effect one chord: F7♯11 = B7alt, with the same notes and the same goals (both lead to E). Hence voicings without the third for 7♯11 and without the seventh for alt — the whole key is played, not a chord. The “scary” progression D♯ø, C♯ø, GΔ♯5, A7♯11, F♯sus♭9, E−Δ turns out to be a single E melodic minor — a single chord.</p>
<h3>Minor ii–V</h3>
<p>Whatever is played over ø can be repeated a minor third higher over alt. Dø takes the notes of F melodic minor, G7alt those of A♭ melodic minor — a minor third higher. The result is a sequence, and the ear hears logic in it. A minor ii–V can also resolve to major: Gø — C7alt — FΔ.</p>
<h3>Minor-major instead of m7</h3>
<p>One more consequence. When an m7 is not part of a ii–V pair — no dominant a fourth higher or its tritone substitute follows it — it plays the role of the tonic minor and can be played as m6 or m(maj7). The exception is a ♭7 in the melody. Many reharmonizations and comping voicings rest on this rule.</p>
${key('Melodic minor is one key and six chords. Seeing the key behind the symbols means seeing two or three scales instead of a dozen chords in a “hard” progression.')}
${tip('One melodic minor key a day: the row “−Δ, sus♭9, Δ♯5, 7♯11, ø, alt” aloud and on the instrument. Response speed is also worth training: “C7alt — D♭ melodic minor, F7alt — F♯ melodic minor…” around the circle of fifths, first in ten seconds, then in a fraction of a second.')}
` },
{ id: 'key', t: 'Keys and functions', s: 'Degrees, Roman numerals, functions, primary triads, cadences', src: 'jazzology,fridkin,maksimov', h: `
<p>Building a seventh chord on every degree of the scale gives the family of chords of the key. In major: Imaj7, iim7, iiim7, IVmaj7, V7, vim7, viiø. The degrees are written in [[roman|Roman numerals]]: upper case for major chords, lower case for minor ones. So a progression is written independently of the key: “ii–V–I” in any of the twelve.</p>
${lab('key')}
<h3>Three functions</h3>
<p>Chords fall into three groups by role — [[function|functions]]: [[tonic|tonic]] (rest: I, iii, vi), subdominant (moving away from rest: ii, IV) and [[dominant|dominant]] (tension that wants resolution: V, vii). Chords of one group can replace each other — the basis of diatonic substitution. Degree vi is ambiguous: it shares two notes with both the tonic and the subdominant, so its role depends on its place — after V (V–vi) it sounds like a tonic, before V (vi–V–I) like a subdominant. In minor the tonic is i and ♭III, the subdominant ii, iv and ♭VI, the dominant V and ♭VII.</p>
<p>The character of the functions can also be put into words. The tonic is complete rest, almost always the end of a piece. The dominant is dynamic: it contains the leading note, and V7 the tritone as well. The subdominant is softer: IV contains the tonic itself (F–A–C in C major), so its motion is calmer.</p>
${key('Almost any jazz progression alternates “subdominant → dominant → tonic”. ii–V–I is its densest form.')}
<h3>Primary triads and voice leading</h3>
<p>Classical harmony begins with the three [[mainTriads|primary triads]] — T, S and D on I, IV and V. They connect by a simple rule: a common note stays in place, the other voices move to the nearest notes of the next chord, without leaps. From S to T two voices move down a step, from D to T up. Typical progressions are T–S–T, T–D–T, T–S–D–T; an incomplete D7 without the fifth often replaces D. In minor the dominant is taken from harmonic minor — a major one.</p>
<p>The simplest and most useful harmony exercise is fitting primary triads to a melody: the melody note on a strong beat has to belong to the chord. Jazz reharmonization (the chapter “Arranging”) is the same thing, only with a wider choice of chords.</p>
${lab('harmtsd')}
<h3>Minor</h3>
<p>Minor in jazz blends several scales. “Jazzology” names four parent scales of minor: Aeolian, Dorian, harmonic and melodic minor. A static minor chord more often takes Dorian and melodic minor, a minor progression natural and harmonic minor. The tonic is usually m6 or m(maj7), ii is m7♭5, V is 7♭9 or 7alt. Switching the diagram to harmonic and melodic minor shows where these chords come from.</p>
<h3>Cadences</h3>
<p>A [[cadence|cadence]] closes a phrase. The authentic one (V–I) is the main one. The plagal (IV–I) is the “amen”. The deceptive (V–vi) fools the ear: a substitute sounds instead of the tonic. A half cadence stops on V. The same language works for a melody without chords (the chapter “Melody and musical structure”).</p>
<h3>The circle of fifths</h3>
<p>On the [[circle|circle of fifths]] keys sit a fifth apart, and neighbours differ by one accidental. What matters for jazz: roots usually move <b>counter-clockwise</b> — down a fifth: D → G → C → F. The circle itself, key signatures and related keys are covered in the chapter “Keys”.</p>
` },
];
