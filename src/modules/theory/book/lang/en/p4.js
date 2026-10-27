// Учебник (en), часть 4: Игра. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — собственный пересказ: «Джазология» (основа), Левайн — «The Jazz Theory Book» и «The Jazz Piano Book», Алексеев.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';
const two = (who, t) => '<aside class="btwo"><b>Second opinion · ' + who + '</b>' + t + '</aside>';
const table = (head, rows) => '<div class="bktw"><table><thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c, i) => '<td>' + (i ? c : '<b>' + c + '</b>') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';

export const S = {
  'cl.son': 'son', 'cl.rumba': 'rumba', 'cl.groove': 'Groove', 'cl.mel': 'Melody and clave', 'cl.clave': 'Clave', 'cl.mont': 'Montuno', 'cl.bass': 'Tumbao', 'cl.melody': 'Melody',
  'cl.note': 'Circled are the bombo (2+ of the “three” bar) and the ponche (4) — the strongest points of the clave. Piano and bass coincide only on 2+; the last note of the montuno and the bass on 4 already belong to the next chord (I – IV – V – IV).',
  'cl.hits': '{n} of {t} coincide', 'cl.bombo': 'bombo', 'cl.ponche': 'ponche', 'cl.hint': 'tapping a cell sets a melody note',
  'cl.ph0': 'Phrase 1', 'cl.ph1': 'Phrase 2', 'cl.ph2': 'Even eighths', 'cl.ph3': 'Long notes',
  'cl.fit32': 'The melody’s rhythm is closer to 3-2.', 'cl.fit23': 'The melody’s rhythm is closer to 2-3.', 'cl.none': 'The melody leans in neither direction: such a tune is adjusted — notes are shifted or a bar is added.',
  'fl.blues': 'Blues · 12', 'fl.letters': 'Sections', 'fl.lens': 'Bars', 'fl.total': '{n} bars in all.',
  'fl.p0': 'Song form: hundreds of tunes.', 'fl.p1': 'With a tag: the last A is longer.', 'fl.p2': 'Long As, a short bridge.', 'fl.p3': 'Blues with a bridge: A is a twelve-bar blues.', 'fl.p4': 'The same AABA, twice as long.',
  'fl.p5': 'A short four-bar bridge.', 'fl.p6': 'The second half starts like the first.', 'fl.p7': 'The ending does not repeat the beginning.', 'fl.p8': 'Four different sections, the last with a tag.',
  'fl.p9': 'After the head, E replaces the first four bars of A.', 'fl.p10': 'The form is agreed on before playing.', 'fl.p11': 'Two sections; before the solos it is often played twice.', 'fl.p12': 'Twelve bars, three phrases.',
  'bl.maj': 'major', 'bl.min': 'minor', 'bl.up': 'Scale up', 'bl.down': 'Scale down', 'bl.ph': 'Phrase', 'bl.close': 'close', 'bl.shear': 'Shearing',
  'bl.n.close': 'Four-part close position: a chord tone in the melody gets {six}, a passing note gets {dim} (that is {v}7♭9 without the root). The line sounds as I – V – I – V — the smoothest harmonic motion.',
  'bl.n.shear': 'As George Shearing did it: close chords plus the melody doubled an octave lower in the left hand.', 'bl.n.drop2': 'The second voice from the top is dropped an octave: wider and softer, it sounds like a saxophone section. The bottom voice is a melody in its own right.',
  'vk.ex0': 'Muddy low, ♭9', 'vk.ex1': 'Half step on top', 'vk.ex2': 'A good Fmaj7', 'vk.ex3': 'A good Cm7', 'vk.hint': 'tapping a key adds or removes a note', 'vk.clear': 'Clear',
  'vk.core': 'the third and seventh are present', 'vk.coreX': 'no third or seventh — the chord quality is unclear',
  'vk.tri': 'the dominant has its tritone (3 and ♭7)', 'vk.triX': 'the dominant has no tritone', 'vk.five': 'the ø has its ♭5', 'vk.fiveX': 'without ♭5 the ø loses its quality',
  'vk.b9': 'no minor ninth between voices', 'vk.b9X': 'a minor ninth between voices (fitting only in 7♭9)', 'vk.top': 'no half step on top', 'vk.topX': 'a half step on top',
  'vk.wide': 'not too wide on top', 'vk.wideX': 'too wide an interval on top', 'vk.low': 'not crowded at the bottom', 'vk.lowX': 'low and close — a rumble',
  'vk.dbl': 'the seventh is not doubled in the bass and on top', 'vk.dblX': 'the seventh is both in the bass and on top', 'vk.foreign': 'every note is a chord tone or a tension', 'vk.foreignX': 'there is a note outside the chord',
  'stk.th': 'in thirds', 'stk.q4': 'in fourths', 'stk.q5': 'in fifths', 'stk.ab': 'Thirds → new',
  'stk.n.th': 'The notes in order of thirds — the way the chord is spelled.', 'stk.n.q4': 'The same notes over the same bass, rewritten in fourths (a fourth may be augmented). Red marks where the chain breaks.', 'stk.n.q5': 'The same notes in fifths (a fifth may be diminished) — the widest and most transparent sound.',
  'pk.hint': 'tapping a cell gives the pentatonic over the chord; ★ marks the best choice',
  'pk.n.ii': 'On ii the I, IV and V pentatonics all work; V is best — it gives the 6 and 9 of the minor chord.', 'pk.n.V': 'On V7 — only the V pentatonic: I and IV contain the 4 of the dominant, an avoid note; II contains a foreign ♯4.',
  'pk.n.I': 'On I — I and V (V is richer: 7 and 9); II gives a Lydian colour. IV contains the 4 — an avoid note.', 'pk.n.Valt': 'On 7alt — the pentatonic a tritone from the root of the dominant: it lies in the melodic minor of the alt scale.',
  'fr.m6': 'minor sixth', 'fr.com': '1–2–4–5', 'fr.degs': 'over {c}: {d}', 'fr.none': 'There are no such four-note groups for this chord.',
  'fr.n.m6': 'Four notes, 1–♭3–5–6. In major harmony — from degree II (over I — from VI, a Lydian colour), in melodic minor — from its tonic, on 7♯9 — from the root. It sounds “bluesy”, like the minor pentatonic.',
  'fr.n.com': 'The “common” four-note group 1–2–4–5 lies in four major keys and two melodic minors: one phrase fits many chords.',
  'sq.motif': 'Motif', 'sq.dia': 'by degrees', 'sq.m3': 'by m3', 'sq.q4': 'by fourths', 'sq.grow': 'growing leap',
  'sq.n.dia': 'The motif repeats from the next degree of the scale: the intervals change slightly, the key holds.', 'sq.n.m3': 'An exact copy a minor third higher: four steps make an octave; the ear follows the logic even when the harmony moves away.',
  'sq.n.q4': 'The motif moves by fourths — like harmony around the circle of fifths.', 'sq.n.grow': 'The leap grows: a fourth, a tritone, a fifth, a minor and a major sixth — the tension rises by itself (a Herbie Hancock device).',
  'ou.tri': 'triad', 'ou.pent': 'pentatonic', 'ou.s1': 'by a half step', 'ou.s2': 'by a whole step', 'ou.s3': 'by m3', 'ou.s6': 'by a tritone', 'ou.play': 'Inside — outside — inside',
  'ou.count': 'Foreign notes outside: {n} of 4.', 'ou.n1': 'A half-step shift is the harshest, but the ear easily connects it to the basis.', 'ou.n2': 'A whole-step shift often stays “inside” or almost inside.',
  'ou.n3': 'A minor third is the path of the diminished scale: “outside”, but within a system.', 'ou.n6': 'A tritone is the tritone substitution in the line itself.',
  'lh.stride': 'Classic stride', 'lh.modern': 'Modern stride', 'lh.tenth': 'Walking tenths', 'lh.powell': 'Bud Powell voicings',
  'lh.n.stride': 'Root on 1, a tenth on 3, a chord on 2 and 4. The progression I – VI7 – ii – V.', 'lh.n.modern': 'Root on 1 and 3, a rootless voicing on 2 and 4 (A and B alternate).',
  'lh.n.tenth': 'The tonic bar is filled with tenths: below 1 – 2 – ♯2 – 3, above 3 – 4 – ♯4 – 5. If a tenth is out of reach — an arpeggio, not violence to the hand.',
  'lh.n.powell0': 'Root and seventh, root and third: in ii–V–I one voice changes — the guide tones.', 'lh.n.powell1': 'The tenth and the seventh swap places — the same guide-tone line in another octave.', 'lh.n.powell2': 'Three notes: root, seventh and tenth. The right hand keeps the whole middle octave.',
};

export const TERMS = {
  clave: ['Clave', 'the two-bar rhythm that holds Afro-Cuban music together: 3-2 or 2-3. Its direction does not change within a piece.', 'latin'],
  montuno: ['Montuno', 'the repeated piano figure in Latin music (guajeo); in salsa also the section where the chorus and the soloist trade calls.', 'latin'],
  tumbao: ['Tumbao', 'the bass pattern in Latin music: on 2+ and 4, without the first beat; on 4 — the root of the next chord.', 'latin'],
  leadsheet: ['Lead sheet', 'the written form of a tune: melody, chord symbols and lyrics. Collections of lead sheets are fake books (the Real Book).', 'comp'],
  vamp: ['Vamp', 'a short repeated progression, most often in an intro or an ending; not to be confused with an ostinato.', 'arr'],
  blockch2: ['Block chords', 'a melody harmonized with close chords that move together with it: a chord tone gets 6, a passing note °7.', 'arr'],
  contrafact: ['Contrafact', 'a new melody on the harmony of a well-known tune.', 'forms'],
  soloform: ['Solo form', 'what the improvisation follows: usually the form of the head without intro, interludes and coda; it may be shorter than the head.', 'forms'],
  chscale: ['Chord–scale family', 'chords sharing key notes, and their scales; within a family chords and modes are often interchangeable.', 'impro'],
  contScale: ['Continuous scale', 'Levine’s exercise: the scale of each chord runs on without returning to the root; at a change it goes to the nearest note of the new scale.', 'impro'],
  pentaKey: ['I, IV, V pentatonics', 'the three major pentatonics of a key; the V pentatonic is the major scale without its two avoid notes.', 'lines'],
  m6scale: ['Minor sixth scale', 'four notes, 1–♭3–5–6; played over many chords of one key.', 'lines'],
  sequence2: ['Sequence in a solo', 'a motif repeated at another pitch (melodic) or with the same rhythm (rhythmic).', 'lines'],
  outsideT: ['Playing “outside”', 'notes outside the harmony that clearly outline another key; it rests on structure and confidence.', 'outside'],
  bitonal: ['Bitonality', 'the accompaniment in one key, the soloist in another; with clear, rhythmically strong players it sounds intended rather than wrong.', 'outside'],
  powell: ['Bud Powell voicings', 'two or three notes with the root at the bottom: root + seventh or third (tenth); 7 and 3 alternate as guide tones.', 'trad'],
};

export const CH = [
{ id: 'comp', t: 'Comping', s: 'Rhythm, register, a conversation with the soloist, playing from a lead sheet', src: 'jazzology,levine,piano', h: `
<p>[[comping|Comping]] answers the soloist; it is not a background. A pianist or guitarist chooses <b>what</b> to play (voicings), <b>where</b> (register) and <b>when</b> (rhythm). Rhythm matters most.</p>
<h3>Principles</h3>
<p>Space is left: short chords, rests, repeated rhythmic figures. The soloist’s melody is not doubled, and the soloist’s register is left free: behind a soprano, not high up. The drummer is the reference: comping hits complement the drum pattern. In swing, figures are not repeated bar after bar as in rock or R&B — comping converses rather than holding a pattern.</p>
<p>Comping has no right to restrict the soloist. While it is unclear where the soloist is going, 3 and 7 are enough: once the pianist has played ♭9, the soloist can no longer play a natural 9. On a dominant, 1–3–7 is “neutral” — it fits 7, 7♭9 and 7alt alike; on a tonic minor, m6 is safe — it lies in both Dorian and melodic minor. A soloist usually repeats the same alterations in the same places, so on the next chorus they can be anticipated. Tensions can also be agreed in advance.</p>
${two('Levine', 'Reharmonization on the fly happens without words, by ear alone, and a clash is not always a disaster. McCoy Tyner played C7♭9 while Coltrane played C7alt over the same chord, and it sounded wonderful: with clear, rhythmically strong players a clash turns into bitonality. Good soloists like it when the rhythm section feeds them harmonic ideas; the first chorus behind an unfamiliar soloist is played more simply, “testing” the soloist.')}
<h3>What is safe to change</h3>
<p>Levine’s guidelines for comping are not rules but things that almost always work.</p>
${table(['Chord on the sheet', 'What can be played'], [
  ['ii outside a ii–V (behaving as a minor tonic)', 'm(maj7)'],
  ['V', 'the tritone substitute'],
  ['V in a ii–V or resolving down a fifth', '7♭9 or 7alt'],
  ['V without a ii and without resolving down a fifth', '7♯11 — Lydian dominants usually do not move down a fifth'],
  ['I', 'maj7♯4 almost always; maj7♯5 — listening to the soloist'],
  ['VI in I–VI–ii–V', 'a dominant (V of ii)'],
])}
<p>Anything beyond this (a sus or a Phrygian chord instead of V) — only with a strong improviser.</p>
<h3>Rhythmic figures</h3>
<p>A ii–V–I plays with a walking bass. A figure is chosen from the list or built by tapping the cells. A hit on the “and” of beat four already belongs to the next chord: comping <b>anticipates</b> the change.</p>
${lab('comp')}
<p>The most common mistake is dragging: a chord on the “and” after the beat of the change pulls the time back. The cure is the same rhythm moved half a beat ahead of the change. Anticipating by more than half a beat behind a soloist is risky: it can collide with the soloist’s phrase. The jazz waltz (3/4) and Latin music have their own figures: in Latin the eighths are even and the pattern repeats — it holds the groove (see the chapter “Latin”).</p>
<h3>Avoid notes</h3>
<p>An [[avoid|avoid note]] is a scale note that clashes with the chord on a strong beat.</p>
${lab('avoid')}
${two('Jazzology', 'For the Dorian ii the book explicitly calls the 6 (13) an avoid note — not merely a “careful” one. Levine considers the Dorian mode free of avoid notes. The difference is audible: 13 on m7 sounds good inside a voicing, but exposed in the melody it may clash with the ♭7.')}
<h3>Playing from a lead sheet</h3>
<p>A [[leadsheet|lead sheet]] gives melody, chord symbols and lyrics. Rules for playing from one: if the melody anticipates the beat, so does the chord; an active melody calls for calm comping, and vice versa; under the melody 3 and 7 are enough, and the melody on top can be doubled. If the melody and bass already express the harmony, the chord may be left out — this is “implied” harmony. With a bassist the left hand plays rootless, and its rhythm echoes the rhythm of the melody. Recordings by different performers disagree — it helps to find the composer’s version.</p>
<h3>The left hand and practice</h3>
<p>Left-hand voicings must be one hundred per cent reliable before work on soloing begins. When comping for oneself, the left hand plays when the right is silent, underlines its phrases and need not take every change. Simplicity matters more than “brilliant” voicings.</p>
<p>The root with a bassist present is not forbidden (Tyner played many roots), but not a habit either; the bassist can be asked. Behind a bass solo less is played, but just as confidently and not only high up. By the soloist’s style: behind a follower of Parker, ♭9 on V; behind a follower of Coltrane, alt. With singers the harmony is more cautious (a voice has no keys or frets), and the rule is simple: the piano plays when the voice is silent. The accompanist is a “second fiddle”: midway between boldness and restraint.</p>
${key('The faster the tempo, the fewer notes: at fast tempos 3 and 7 are enough. In a ballad — full voicings and arpeggios. Ahead of the change, not behind it.')}
` },
{ id: 'latin', t: 'Latin: clave', s: 'Clave 3-2 and 2-3, montuno, tumbao, a tune in clave', src: 'levine,piano,jazzology', h: `
<p>“Latin” is not one style but a mosaic from the Rio Grande to Tierra del Fuego: Andean music and mariachi resemble each other no more than Mozart and B. B. King. Brazil and Cuba influenced jazz most. “Salsa” is a word coined by New York promoters, and many Latin American musicians dislike it. This chapter covers the core mechanism of Afro-Cuban music as Levine describes it; he gives no drum patterns — those are best taken from specialised method books.</p>
<h3>Clave</h3>
<p>The [[clave|clave]] is a two-bar pattern that glues everything together: each instrument has its own rhythm, and they all fit like a jigsaw. The montuno, the bass, the drums, the phrasing of the melody and the horn lines are all “in clave”. There are two directions: 3-2 (three hits in the first bar: 1, 2+, 4; two in the second: 2 and 3) and 2-3 — the same bars reversed. In the rumba clave the third hit of the “three” bar is shifted by half a beat, to 4+. The main rule: once the piece has started, <b>the clave direction does not change</b>.</p>
${lab('clave')}
<h3>Montuno and tumbao</h3>
<p>The piano [[montuno|montuno]] is a two-bar figure in eighths, both hands in octaves (later in tenths), without breaks. The strong beat of the montuno always falls on the “two” side of the clave; the last note of each bar is tied over the bar line and already belongs to the next chord. The montuno is not changed until a new section — it holds the groove. This is the opposite of swing, where comping does not repeat.</p>
<p>The bass [[tumbao|tumbao]] accents the fourth beat and anticipates the next chord; the bass does not play the first beat. Piano and bass coincide only on the “and” of beat two. Salsa solos are played rhythmically, in octaves and big chords: a single-note bebop line would be drowned by the rhythm section.</p>
<h3>A tune in clave</h3>
<p>The direction is chosen by the melody: the rhythm of the tune is laid against both versions and <b>the coincidences are counted</b>. Sometimes the fit is almost perfect (nine out of ten on 2-3), sometimes it is half and half. Most important is hitting the strongest points of the clave — the bombo (2+ of the “three” bar) and the ponche (4). Jazz tunes are most often “partly 2-3, partly 3-2, mostly neither”, so not every tune can be “played as a mambo”. A tune can be adjusted: the rhythm of one or two notes is changed (three quarters in a bar → two dotted quarters and a quarter), or a bar is added or removed. If even that does not help, the tune is not suited to salsa. A drummer who listens to the melody adjusts the pattern to coincide more often with it and with the clave.</p>
<p>In the diagram above, the “Melody and clave” mode counts the coincidences for both directions; a note can be moved to see how the count changes.</p>
<h3>The invisible bar line</h3>
<p>By the Western rule, notes are not tied across the middle of a 4/4 bar — in Latin music this rule gets in the way. A typical montuno written “by the rules” takes twelve notes and three ties; written “the Latin way”, ten notes and one tie. Once accustomed, reading the Latin way is easier.</p>
<h3>Bossa nova</h3>
<p>In bossa nova the rhythm is also two bars long, but the rules are looser: one-bar figures work, they can change, and solos are swung or in even eighths. A jazz tune “as a mambo” is often played like this: the A sections in Latin, the bridge in swing.</p>
${tip('The clave in claps or with the foot, the montuno in the hands; then the direction is switched and the montuno rebuilt. Without the clave in the body, Latin sounds like “swing with even eighths”.')}
` },
{ id: 'forms', t: 'Forms', s: 'Performance plan, section lengths, blues, rhythm changes, how a tune is built', src: 'jazzology,levine', h: `
<p>[[form|Form]] is the plan of a piece: its sections and how they repeat. Improvisation follows the same form — the chorus — so it has to be known by heart. The usual plan for performing a standard: intro → head → choruses of improvisation → head and ending.</p>
<h3>Song forms</h3>
<p>Most standards are 32 bars: [[aaba|AABA]] (the [[bridge|bridge]] B contrasts and usually moves to another key) or ABAC. There are also AABC, ABC and ABCD; the letters are conventional — a varied repeat is written A1/A2 or with a new letter. Levine shows that “even” eight-bar sections are only the most frequent case: lengths can be anything. The diagram holds the forms from his table; letters and lengths can be entered freely.</p>
${lab('flen')}
<h3>Head form and solo form</h3>
<p>The intro, interlude, special ending, shout chorus and verse are part of the arrangement: they are played every time and known like the tune itself, but they are not part of the [[soloform|solo form]]. The solo form may also be shorter than the head. Alterations are the norm: the bridge is replaced, an A section is repeated a half step higher; on the bandstand the version is agreed on. A [[contrafact|contrafact]] is a new melody on someone else’s harmony.</p>
<h3>Blues</h3>
<p>The [[bluesform|blues]] is 12 bars, three phrases of four: the statement of a motif (bars 1–4), its repetition (5–8) and a contrast (9–12). The basic form uses three dominants I7, IV7, V7. Jazz blues adds ii–Vs, secondary dominants and °7; the bebop version descending ii–V chains; the minor blues sits on i, iv and ♭VI7–V7. “Listen” lights up the bars as they sound.</p>
${lab('form')}
<p>Levine sees three generations of the blues: three chords; then IV7 in the second bar and V7 in the last (the 1930s); then bebop — a ii–V in the fourth bar, chromatic ii–Vs in bars 6–10, a turnaround at the end. Musicians mix all three on the fly, even within one chorus: the soloist is free, the accompanist listens and follows. There are special blues forms too: the 24-bar blues waltz, the blues with a bridge (12 + 12 + 8 + 12 = 44 bars), the descending “Parker” blues, the blues on sus chords, the 14-bar blues. “Blues” in a title does not make a blues: the blues is also a sound and an attitude.</p>
<h3>Rhythm changes</h3>
<p>[[rhythmch|Rhythm changes]] is the second most popular form after the blues: a 32-bar AABA, almost always in B♭. The A section has quick I–vi–ii–V turnarounds moving to IV; the bridge is a chain of dominants around the circle of fifths, two bars each: III7–VI7–II7–V7. There are many versions, and they too are mixed: an opening of circling dominants (F♯7 B7 E7 A7 D7 G7 C7 F7 — up to B♭ in the fifth bar), a bridge descending chromatically (D7 C♯7 C7 B7), an A with E♭maj7–A♭7 in the sixth bar. Playing rhythm changes is “like playing several songs at once”; that is why musicians judge one another by it.</p>
<h3>Modal tunes</h3>
<p>A [[modaltune|modal tune]] has “few chords, lots of space”: one mode for 4–16 bars, and the thinking is “D Dorian” rather than “Dm7”. Motion is driven by colour, not function, so shifts and parallel moves are the norm. The improviser shows how the modes connect through common tones, and tension and release through alternating “tense” sus chords and “soft” maj7s. The Ionian mode (major — no “modality”) and the Locrian (♭5 does not hold the centre) are usually not used for modal tunes.</p>
<h3>Polytonality</h3>
<p>Two tonal centres at once: for example, a D triad over a C chord. In small doses these are upper structures. Tunes with rapidly changing centres (Giant Steps, Lady Bird) give a feeling of “floating” keys — they are covered in the chapter “Tonal centres”.</p>
<h3>How a tune is built</h3>
<p>A good tune balances predictability (form, repetition, familiar progressions) and surprise. The surprise usually comes not in the bridge but nearer the end — in the coda, in the penultimate bar. The last bar of a tune is more often a turnaround to the top than a tonic. Analysing a tune is easiest through four questions: (1) the form and section lengths; (2) how the roots move; (3) which notes the chords share; (4) where the surprise is. A composer’s signature shows in the form too: some favour long forms, others short or odd-length ones.</p>
${key('The form is known by heart — by letters, lengths and harmony. Getting lost in the form is worse than playing the “wrong” note.')}
` },
{ id: 'arr', t: 'Arranging', s: 'Pedal point, ostinato, harmonizing a melody, voicing rules, block chords', src: 'jazzology,piano,levine,alekseev', h: `
<p>A [[constant|constant structure]] is three or more chords of one quality in a row (often maj7 or m11), moved in parallel to different roots. The harmony stops being functional and becomes colour.</p>
<p>A [[pedal|pedal point]] is a sustained note under changing chords, almost always the tonic or dominant. It need not sound literally: it can be a rhythmic figure with rests, as long as the ear hears it as sustained, and it can sit in a middle or upper voice. A typical device for intros and endings.</p>
<p>An [[ostinato|ostinato]] is a repeated figure in the bass or accompaniment; a [[vamp|vamp]] is something else: a short repeated progression, usually in an intro. Pedal point and ostinato are especially good in modal harmony.</p>
<h3>New harmony for a melody</h3>
<p>Five rules. (1) The important melody notes are found — long ones and those on strong beats. (2) For each, chords are chosen where it is a chord tone or an available tension. (3) The chords are connected so the bass moves meaningfully: by fifths, steps, chromatics. (4) The function is kept at cadences. (5) Not everything is changed at once: one new phrase against familiar harmony sounds stronger. Not every note needs to be harmonized.</p>
<p>Jazzology ties the choice to how the melody moves. <b>A sustained or repeated note</b> — a chromatic bass, dominant substitutes, chromatic °7s; the calmer the melody, the more active the harmony. <b>A chromatic or symmetric melody</b> — parallel motion of all voices (constant structure, block chords, fourths) or contrary motion: chains of dominants. <b>A melody in leaps</b> — beats 1 and 3 and their anticipations are harmonized, and on a leap the previous chord is revoiced.</p>
${two('Levine', 'The melody on a lead sheet is written for ease of reading — it can be played an octave higher: that way the hands do not collide, and changing octave from section to section gives contrast. Parallelism — one chord shape following the melody — sounds “structural”, and listeners like it; it works best in modal tunes.')}
<h3>Voicing rules</h3>
<p>A minor second or minor ninth between voices is avoided — except in 7♭9 and a Phrygian context. A dominant (except sus) contains a tritone; the skeleton — 3 and 7 — is enough. Close intervals are not placed at the bottom, nor too-wide ones on top. The fifth may be omitted, except in m7♭5. The seventh is not doubled in the bass if it is in the melody. 9 often replaces the root, 13 the fifth. The tritone often stays unresolved, and the fourth in V7sus4 anticipates the tonic. In the diagram notes are placed by tapping the keys, and the diagram checks the rules.</p>
${lab('vcheck')}
<h3>Block chords</h3>
<p>[[blockch2|Block chords]] are a melody “dressed” in close chords that move together with it. Levine’s recipe is the bebop scale: on the chord tones (in C major — C, E, G, A) C6 sounds, on the passing notes (D, F, A♭, B) °7. This °7 is G7♭9 without the root, so the line sounds as I – V – I – V, the smoothest harmonic motion; this is how four saxophones are written for. In minor — the same with Cm6.</p>
${lab('block')}
<p>Variants. George Shearing doubled the melody an octave lower in the left hand — five voices. Drop 2 lowers the second voice from the top by an octave: the bottom voice becomes an independent melody in tenths with the top one, and it is played legato and twice as loud. The °7 on the root of the tonic is V of V (D7♭9 without the root in C major): it connects I and ii. Raising one note of the °7 a whole step keeps the chord in the same diminished scale, but it “bites”. The ♭9/alt pair (melody ♭9 → ♯9) moves in a sequence of minor thirds — when the melody on ii or V follows the diminished scale. A warning: drop 2 in comping easily “buries” the soloist.</p>
${tip('The C6 and Cm6 scales in drop 2, up and down through two octaves, then in all keys; then the first bars of a familiar slow tune in block chords.')}
<h3>In fourths and in fifths</h3>
<p>An exercise from Alekseev’s collection: the notes of a chord spelled in thirds are rewritten in fourths (a fourth may be augmented) or in fifths over the same bass. The chord stays the same, but the sound becomes open and modern; where the chain breaks, one interval of another size is needed.</p>
${lab('stack')}
` },
{ id: 'impro', t: 'Improvisation', s: 'A scale for a chord, families, approaches, the continuous scale, common tones, lessons from recordings', src: 'jazzology,levine', h: `
<p>Improvisation rests on three pillars: <b>the ear</b> (what one wants to hear), <b>harmony</b> (what is sounding now) and <b>vocabulary</b> (phrases and devices in the fingers). Theory supplies material, but recordings are the main teacher. Music came before theory.</p>
<h3>A scale for a chord</h3>
<p>Any chord can be typed into the field — the diagram finds the scales that contain all its notes. The most natural choices come first.</p>
${lab('cscale')}
<p>Chords and scales form [[chscale|families]] by their key notes; within a family chords and modes are often interchangeable (Jazzology).</p>
${table(['Family', 'Key notes', 'Chords → scales'], [
  ['Major', '3 and 7', 'maj7, 6, maj9 → major, Lydian, Lydian augmented; with ♯11 — the Lydian ones'],
  ['Dominant', '3 and ♭7', '7, 9, 13, 7♭9, 7♯9, 7alt → Mixolydian, Lydian dominant, altered; 7♭9 — “half step – whole step”'],
  ['Minor', '♭3 and 5', 'm7 → Dorian, Aeolian, Phrygian; m6 → Dorian, melodic minor; m(maj7) → melodic and harmonic minor'],
  ['Half-diminished', '♭3 and ♭5', 'm7♭5 → Locrian, Locrian ♮2'],
  ['Diminished', '♭5 and 𝄫7', '°7 → diminished “whole step – half step”'],
  ['Whole-tone', '3 and ♯5', '7♯5 → whole-tone'],
])}
<p>Another view from the same book: every mode is two seventh chords on adjacent degrees. The lower one is the chord itself, the upper one gives its 9, 11 and 13.</p>
${table(['Mode', 'Two chords'], [
  ['Major', 'Cmaj7 + Dm7'], ['Lydian', 'Cmaj7 + Dmaj7'], ['Lydian augmented', 'Cmaj7♯5 + D7'], ['Mixolydian', 'C7 + Dm7'], ['Lydian dominant', 'C7 + D7'],
  ['Altered', 'Cm7♭5 + D♭m(maj7)'], ['Dorian', 'Cm7 + Dm7'], ['Aeolian', 'Cm7 + Dm7♭5'], ['Melodic minor', 'Cm(maj7) + Dm7'], ['Harmonic minor', 'Cm(maj7) + Dm7♭5'],
  ['Phrygian', 'Cm7 + D♭maj7'], ['Locrian', 'Cm7♭5 + D♭maj7'], ['Locrian ♮2', 'Cm7♭5 + Dm7♭5'], ['Diminished “whole step – half step”', 'C°7 + D°7'], ['“Half step – whole step”', 'C°7 + D♭°7'],
])}
<h3>Harmonic generalization</h3>
<p>On fast changes not every chord has to be played: a ii–V can be heard as one V7, and a whole ii–V–I as one key. This is [[generalize|harmonic generalization]]: one major scale for the whole ii–V–I and turnaround; harmonic minor for the whole minor ii–V–i; the major scale of the key with one adjustment for a secondary dominant. The device is older than bebop — it was known to musicians who looked for notes common to several chords. For Levine it is not a device for fast changes but the main way of seeing: thinking in keys rather than chords.</p>
<h3>Approaching a target note</h3>
<p>An [[enclosure|enclosure]] is a way to aim at a chord tone: approaching it from above and below, diatonically or chromatically. A chromatic approach is an unprepared dissonance that resolves by a half step to a chord tone; it can stand on a strong beat (delaying the chord tone) or on a weak one. The only requirement is that the chord can be recognized from the notes on the strong beats. Without approaches a line is “acceptable but bland”.</p>
${lab('encl')}
<h3>The continuous scale</h3>
<p>An exercise of Levine’s that breaks the “tie to the root” is the [[contScale|continuous scale]]. Over the changes of a song, the scale of each chord is played in quarters, starting not from the root. At a change the line goes to the nearest note of the new scale in the same direction — without returning to the root; it turns around at the edge of the range anywhere in the bar. In a bar with two chords — two notes per chord. In the exercise avoid notes are raised (♯4 on maj7, ♯11 on a dominant). Variants: in eighths, in thirds up and down, in triplets, “step and leap”. The aim is to join the scales into one long line and to make all degrees equal.</p>
<h3>Common tones and stretching the changes</h3>
<p>A note common to several chords is the glue of a solo: it holds across the changes, and the “minefield” of a difficult tune becomes passable. Levine’s method is to write out the scales of three or four neighbouring chords and find the notes common to all of them (sometimes a whole pentatonic). The length of a chord is “elastic”: an experienced soloist changes chords when ready, not at the bar line — anticipating the change or delaying it. A ii–V is not two chords but a “ii–V zone”.</p>
<h3>Patterns and upper triads</h3>
<p>Symmetric figures on the diminished and whole-tone scales, augmented triads by whole steps, minor thirds along a chromatic ladder give a feeling of “perpetual motion” and lead out of the key logically. Over a chord a triad of its upper notes can be played: over Cmaj7 — G (5–7–9) and D (9–♯11–13), over Dm7 — F and C, over G7alt — E♭ and D♭. A melody from a triad sounds clear and still brings tensions. Pentatonics, sequences and four-note scales are covered in the chapter “The language of the solo”.</p>
<h3>What recordings teach</h3>
<p>The solo analyses in Jazzology yield conclusions not found in the rules. The blue notes (♭3, ♭5, ♭7) work “over” the chords as one scale; ♭3 on the tonic suggests I7♯9. The minor blues demands following the chords more closely; the most “minor” note is the ♭6 of the key. On m7♭5 the melody more often has ♭9 than 9: the natural 9 is a note foreign to the key, and exposed it is audible; the key matters more than the individual chord. At fast tempos a dominant is almost equal to the major key; what matters is 3, 7 and the roots, and it helps to have 5–10 ready-made figures. In a modal solo the motifs develop out of themselves. On unexpected chords the playing is more direct, on familiar ones freer. A solo “tells a story”: zones of texture, question and answer, a gradual build-up of tension; quotes and Parker figures are part of the language.</p>
${key('Chord tones on strong beats, passing notes on weak ones. Aim at 3 and 7 on the chord change — and the line spells out the harmony even without accompaniment.')}
${tip('Listening with the instrument in hand, playing what appeals straight away, writing it down and memorizing it. The aim is to understand, not to stock up on “ammunition”. A limit (only eighths, only chord tones, phrases starting on beat two) grows vocabulary faster than freedom.')}
` },
{ id: 'lines', t: 'The language of the solo', s: 'Pentatonics in a key, four-note groups, bebop scales, sequences', src: 'levine,piano,jazzology', h: `
<p>A scale for a chord is only raw material. The language of a solo is made of smaller and clearer units: pentatonics, four-note groups, bebop scales and motifs developed through sequences.</p>
<h3>Pentatonics over a chord</h3>
<p>Several [[pentatonic|pentatonics]] fit one chord, each with its own set of tensions: over Cmaj7 the pentatonic on D gives 9, 3, ♯11, 13, 7 — a Lydian colour. A pentatonic stays clear in meaning even under strong dissonance and does not sound banal even when played “head-on”.</p>
${lab('penta')}
<h3>The I, IV, V pentatonics</h3>
<p>Levine looks not from the chord but from the key. In major there are three major [[pentaKey|pentatonics — on degrees I, IV and V]] (the names are his own). The main observation: the V pentatonic is the major scale without its two avoid notes (1 and 4), so it sounds over any chord of the key and alone covers the whole ii–V–I. One pentatonic belongs to three keys (I in C, IV in G, V in F). The II pentatonic over maj7 gives a Lydian colour; melodic minor has only one pentatonic — on degree IV, and hence the shortcut: on 7alt, the pentatonic a tritone from the root of the dominant. A tritone substitute takes the pentatonic of the substitute. The diminished and whole-tone scales contain no pentatonics.</p>
${lab('pentakey')}
<p>The blues scale and the minor pentatonic for a chord lie a minor third below the fitting major pentatonic. One blues scale sounds over all three chords of a blues, although its notes taken singly clash with them; Levine honestly admits that Western theory does not explain this. The in-sen scale (half step, major third, whole step, minor third) is built from degree III of major (Phrygian) or degree II of melodic minor and sounds best on sus♭9. Pentatonics are practised in groups of four notes, with rhythmic variety and with skips; Giant Steps can be played on three V pentatonics — coherent, but played that way throughout, dull.</p>
<h3>Four notes</h3>
<p>Smaller still than a pentatonic are four-note scales. The [[m6scale|minor sixth]] (1–♭3–5–6): in major harmony — from degree II, over every chord except I (on the tonic its note 4 is an avoid note); over maj7 — from degree VI (a Lydian colour); in melodic minor — from its tonic (over Eø — Gm6, over A7alt — B♭m6); on 7♯9 — from the root. It sounds “bluesy” and is interchangeable with the minor pentatonic and the blues scale; everyone played it, from Lester Young to McCoy Tyner. The “common” group 1–2–4–5 lies in four major keys and two melodic minors. A personal four-note group is built like this: four notes are chosen out of seven, learned in all inversions, and whatever sounds good is kept.</p>
${lab('four')}
<p>On a ø – 7alt chain the minor sixth scale is played from the tonic of the melodic minor the pair is taken from — 1, 3, 5, 6 of that minor. Melodic minor also has characteristic groups 1–3–5–7 and 3–5–7–9: a whole line through ø–alt can be carried with them. The minor sixth scale lends itself to fast “cascades” across registers and across the chord change.</p>
<h3>Bebop scales</h3>
<p>A bebop scale is a scale with one chromatic note inserted so that, starting from a chord tone on the beat, the chord tones fall on the beats: “the scale comes out even”. The dominant one has the chromatic note between ♭7 and 1 and is played over V and over ii–V; the Dorian one has it between ♭3 and 4, and these are the same notes as the dominant one from V (G Dorian = C dominant), so a ii–V is one scale. The major and melodic ones have it between 5 and 6. Armstrong was already playing the bebop dominant scale in 1927.</p>
<h3>Sequences</h3>
<p>A [[sequence2|sequence]] can be melodic (a phrase at another pitch, its shape preserved) or rhythmic (the rhythm repeats, the notes do not). It gives a solo structure and “sounds as if the musician knows what they are doing”; it also leads beyond the harmony — the ear follows the logic. A growing leap inside a sequence raises the tension. Eight-bar phrases need not be a limit: a sequence can start in the last bar of a phrase. A short three-note motif in different rhythms is a Joe Henderson device.</p>
${lab('seq')}
${key('Pentatonics, four-note groups and motifs are the units of the language, and the scale is the dictionary. Listeners remember motifs and their development, not scales.')}
` },
{ id: 'outside', t: 'Playing “outside”', s: 'Side-stepping, bitonality, six ways', src: 'levine,jazzology', h: `
<p>[[outsideT|“Outside”]] means notes outside the chord, a stretched change or recognizable material in another key; free atonal jazz is a separate topic. What is “inside” and what is “outside” is subjective and changes over time: Parker and Coltrane were considered “out” in their day.</p>
<p>The best examples are [[bitonal|bitonality]]: the accompaniment in one key, the soloist clearly outlining another. Such playing has to be confident, or it will sound like a mistake. The ear holds on to structure: “inside → outside → inside”, “predictability → surprise”. Any note works on any chord if it sounds right to the musician.</p>
${lab('outside')}
<h3>Six ways</h3>
<p>(1) <b>A sequence</b> that moves beyond the harmony: the ear follows the logic of the motif. (2) <b>A half step to the side</b> — maximum dissonance, but the ear easily connects it to the basis: a D♭ triad over Cmaj7 is as “outside” as it gets, while a D triad (a half step further) is “inside”: 9, ♯11, 13. A pentatonic shifted by a half step is the classic side-step in a solo (E♭ minor over A13♭9, D♭ major over G7alt); pentatonics can be chained by half steps. (3) <b>By a tritone</b> — the tritone substitution in the line itself. (4) <b>A scale or pentatonic of another key</b>. (5) For a pianist: one hand in the key, the other in “a key of fourths” shifted chromatically. (6) <b>The chromatic scale</b> — it “belongs to every chord and to none”; it must not be overused.</p>
${key('Outside — briefly and confidently, with a clear return. The power of “outside” lies in its contrast with “inside”.')}
${tip('Modal tunes make learning easier: lots of space, and static harmony itself asks for dissonance. First — a pentatonic shifted by a half step for two bars, and back.')}
` },
{ id: 'trad', t: 'Traditional jazz', s: 'The language of the 1920s, ragtime, early improvisation, stride', src: 'jazzology,piano', h: `
<p>The harmonic language of the 1920s is simpler, and also different. Major is a triad or a 6, almost never maj7; minor is a triad, sometimes with 6 or 9; m7 is rare, m7♭5 almost never appears. °7 occurs both as a triad and as a seventh chord; augmented chords and the whole-tone scale are frequent. <b>There are almost no ii–Vs</b>: a dominant stands unprepared or after V/V, and tunes circle through the dominants of the circle of fifths (I–VI7–II7–V7–I). Adding the related ii to each such dominant gives bebop “changes”. Half of all bebop tunes are written on the blues, rhythm changes or a handful of patterns — whereas in the 1920s every piece had its own harmony.</p>
<h3>Forms</h3>
<p>Ragtime is not a forerunner of jazz but a neighbouring style: it is played straight, without swing. Its form has many sections, like a march (AABBACCDD), with a trio in the subdominant key. Early pieces include “break” sections and modulating interludes. Early blues is not always 12 bars and was already full of substitutions in the 1910s.</p>
<h3>Accompaniment and ensemble</h3>
<p>The rhythm section plays “in four” or “in two” (bass on 1 and 3). The ensemble is collective improvisation: the trumpet leads the melody, the clarinet decorates above, the trombone answers below. The piano plays [[stride|stride]]: bass — chord — bass — chord. Levine also shows modern stride (root on 1 and 3, a rootless voicing on 2 and 4), walking tenths and [[powell|Bud Powell voicings]] — two or three notes with the root at the bottom, where 7 and 3 alternate as guide tones.</p>
${lab('lefthand')}
<p>Stride is brought to life by motion within the chord (3 → ♯11 → 3 on a dominant), by moving a voice a minor third on 7♭9, by reversing the order to “chord — root” on beats three and four, and by inserting a ii or V on beat three of a tonic bar. Practising stride without the pedal is useful: the hand learns to hold the notes by itself.</p>
<h3>Improvising in the early style</h3>
<p>Jazzology’s ten guidelines differ from bebop habits. (1) Notes are chosen sparingly. (2) No clinging to the current chord: thinking in zones and a shared tonic. (3) <b>Common</b> tones are sought rather than guide tones — jumping at every change is not in the style. (4) References to the melody are always appropriate. (5) Secondary chords (quick turnarounds) can be ignored. (6) Pentatonics. (7) Repetition, variation and development of a motif. (8) Playing with the listener’s expectations. (9) Blue notes. (10) Natural 9 and 13 on major and dominant chords — freely, even in exposed places.</p>
${key('The early style is not a caricature of simplicity. The reference is Armstrong’s Hot Five and Hot Seven recordings and Bix Beiderbecke, not “striped waistcoats”.')}
` },
];
