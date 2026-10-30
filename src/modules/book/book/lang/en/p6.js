// Учебник (en), часть 6: Практика и справка. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — собственный пересказ: «Джазология» (гл. 14), Левайн (гл. 4, 12, 23), Максимов, Фридкин, Алексеев.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';

export const S = {
  'pl.d6': 'Sun', 'pl.day': 'Lesson or performance day', 'pl.noday': 'none',
  'pl.w.lesson': 'lesson', 'pl.w.heavy': 'heavy', 'pl.w.mid': 'medium', 'pl.w.light': 'light', 'pl.w.off': 'rest',
  'pl.w.note': 'Heavy days come right after the lesson, the day off just before it, not after. The teacher’s remarks are written down the same day.',
  'ex.t.staff': 'Note on the staff', 'ex.t.degof': 'Note as a degree', 'ex.t.rel': 'Relative key', 'ex.t.ivbuild': 'Interval building', 'ex.t.inv': 'Interval inversion',
  'ex.t.triear': 'Triad by ear', 'ex.t.invear': 'Inversion by ear', 'ex.t.parent': 'Parent scale', 'ex.t.twin': 'Tritone twin', 'ex.t.dim7': '°7 = which 7♭9',
  'ex.t.countdown': 'Coltrane changes', 'ex.t.locv': 'Locrian dominant', 'ex.t.verdict': 'Sheet detective', 'ex.t.m6over': 'Minor sixth scale', 'ex.t.secdom': 'Secondary dominant',
  'ex.t.flen': 'Form length', 'ex.t.clave': 'Clave by ear',
  'ex.q.staff': 'Which note is this?', 'ex.q.degof': '{n} is degree {d} of which major?', 'ex.q.rel': 'Relative minor of {k} major?', 'ex.q.ivbuild': 'From {n} up — {i}. Which note?', 'ex.q.inv': 'Inversion of the interval “{i}”?',
  'ex.q.triear': 'Which triad?', 'ex.q.invear': 'Which inversion?', 'ex.q.parent': 'Parent scale of {c}?', 'ex.q.twin': 'Tritone twin of {c}?', 'ex.q.dim7': '{c} is a rootless 7♭9 on which roots?',
  'ex.q.countdown': 'ii–V–I in {k}: Coltrane changes over four bars?', 'ex.q.locv': 'Locrian dominant before {k}?', 'ex.q.verdict': '{c}, melody {n}: the symbol is…', 'ex.q.m6over': 'Minor sixth scale over {c}?',
  'ex.q.secdom': '{c} in {k} major — dominant of which chord?', 'ex.q.flen': 'How many bars in the {f} form?', 'ex.q.clave': 'Which clave?',
  'ex.minor': 'minor', 'ex.tq.maj': 'Major', 'ex.tq.min': 'Minor', 'ex.tq.dim': 'Diminished', 'ex.tq.aug': 'Augmented',
  'sg.deg': 'Degrees', 'sg.iv': 'Interval', 'sg.miss': 'Missing note', 'sg.nine': 'Ninth',
  'sg.q.deg': 'In {k} major: degrees {s}', 'sg.q.iv': 'From {n} up: {i}', 'sg.q.miss': '{c} is missing one note', 'sg.q.nine': 'Over {c}: the ninth',
  'sg.hear': 'Play note', 'sg.sing': 'Sing', 'sg.stop': 'Stop', 'sg.new': 'New task', 'sg.listen': 'Listening…', 'sg.done': 'Done ✓',
  'sg.err.denied': 'No microphone permission.', 'sg.err.none': 'Microphone unavailable.',
  'sg.note': 'The microphone turns on only with the “Sing” button; the sound is analysed on the device. Any octave; a note counts if it is held for a third of a second within ±35 cents.',
  'sp.chain': 'Mode chain', 'sp.rev': 'Reversed', 'sp.chrom': 'Mode by semitones', 'sp.thirds': 'In thirds',
  'sp.n.chain': 'Ionian up, Dorian down, Phrygian up… — each mode of the key in turn, alternating direction. The scale no longer starts from the root.',
  'sp.n.rev': 'The same modes in reverse order of degrees: from I down, from VII up, from VI down…',
  'sp.n.chrom': 'One mode in all twelve keys, rising by semitones, alternating direction (the first four are shown).',
  'sp.n.thirds': 'A pattern in thirds going up. Each day — a new starting degree; a pattern that sounds unmusical is not worth the time.',
  'bkr.jazzology': 'The basis of the textbook: jazz theory from intervals to reharmonization and solo analysis.', 'bkr.levine': 'Jazz harmony through the key and melodic minor; reharmonization, form, tunes, Latin.',
  'bkr.piano': 'Piano voicings and devices: left-hand voicings, So What, upper structures, block chords, stride.', 'bkr.maksimov': 'Classical rudiments: notation, metre, mode, intervals, chords, vocal exercises.',
  'bkr.fridkin': 'Practical exercises in rudiments: building, identifying, transposing, solfège.', 'bkr.alekseev': 'Harmony exercises at the piano and with the voice; playing modes.', 'bkr.kubistra': 'A chart of jazz scale degrees by chord type, with avoid notes.',
};

export const TERMS = {
  woodshed: ['Woodshed', 'long solitary work at the instrument, “going to the woodshed”: a word from jazz musicians’ slang.', 'practice'],
  fourmem: ['Four memories', 'ear, theory, the feel of the hand and the look on the instrument; a tune or a chord is best known with all four.', 'practice'],
  tradefours: ['Trading fours', 'soloists (often with the drummer) take turns playing four or eight bars each.', 'ref'],
  shout: ['Shout chorus', 'a written climactic section for the whole ensemble, usually after the solos.', 'ref'],
  tag: ['Tag', 'a repeat of the last bars of the tune at the end of the piece, often several times.', 'ref'],
  interlude: ['Interlude', 'an inserted passage between sections or between solos; not part of the solo form.', 'ref'],
  intro: ['Intro', 'the beginning of a piece before the head; often a vamp or a pedal.', 'ref'],
  cadenza: ['Cadenza', 'a free solo without the rhythm section, usually at the end of a piece.', 'ref'],
  breakT: ['Break', 'the ensemble stops for a bar or two while the soloist plays alone.', 'ref'],
  stoptime: ['Stop-time', 'the ensemble plays only short hits (for example, on beat one once every bar or two), and the soloist fills the gaps.', 'ref'],
  stroll: ['Stroll', 'the pianist or guitarist drops out, and the solo continues with bass and drums only.', 'ref'],
  doubletime: ['Double time', 'playing twice as fast over the same rhythm-section tempo; “double-time feel” — when the whole band plays twice as fast.', 'ref'],
  straight8: ['Straight eighths', 'eighths without swing — in Latin, bossa nova, jazz rock.', 'ref'],
  pocket: ['In the pocket', 'playing right in the ensemble’s groove; “lay back” — slightly behind the beat without slowing the tempo.', 'ref'],
  outchorus: ['Out chorus', 'the last statement of the head after the solos, often with a tag or an ending.', 'ref'],
  chart: ['Chart', 'the written arrangement or lead sheet for an ensemble.', 'ref'],
  trainwreck: ['Train wreck', 'slang: the ensemble has lost the form or the ending and the piece has fallen apart.', 'ref'],
  vampcue: ['Vamp till cue', 'the vamp repeats until the soloist or the leader signals to move on.', 'ref'],
};

export const CH = [
{ id: 'practice', t: 'Practice', s: 'Building a session and a week, scales without the root, recordings, singing, training', src: 'jazzology,levine,piano,alekseev,maksimov,fridkin', h: `
<p>Theory becomes music only through the instrument and the ear. A few rules: <b>all 12 keys</b>, not only the comfortable ones; <b>slowly and accurately</b> — speed comes from accuracy and relaxation; <b>tunes</b> are the main material (every exercise is for a specific tune); <b>listen</b> to recordings every day. Music is made in exercises too: the melody of a tune is played beautifully and personally — in a ballad, the performance is mostly the melody.</p>
<h3>How to build a session</h3>
<p>The length of a session determines its content: five tasks do not fit into thirty minutes, yet thirty minutes on one task is too little. It is convenient to divide the time into three thirds: fundamentals (long notes, scales, arpeggios), studies and exercises (new material and review), pieces, improvisation and sight-reading. Long notes are a warm-up and a calm way to correct habits; if the sound or how one feels is not right, it is better to stop: practice reinforces whatever sounds now. Scales are never “learned” — they are an exercise, like an athlete’s warm-up. Pieces are not played through again and again but worked on passage by passage. It pays to start with what was shaky at the last performance: then even fifteen minutes are productive.</p>
<p>A good goal is clear, specific, not too hard and reachable soon. A complex goal (“a better sound”) is turned into a task (“five minutes of long notes”), but the task is not confused with the goal. Joy in one’s own growth is a better driving force than the wish to look successful or comparison with others. The task sits at the edge of one’s abilities: a challenge without despair. A slow tempo and breaking things into chunks are devices beginners avoid for no good reason. The aim of practice is to grow, not to “prepare for an event”.</p>
<h3>A plan for the week</h3>
${lab('plan')}
<h3>Scales without the root</h3>
<p>A scale from root to root trains both the ear and the fingers towards the root — and improvisation starts from the root. Levine suggests a chain of modes: up Ionian, down Dorian, up Phrygian and so on; each day a new starting degree; patterns in thirds, fourths, groups of four. Alekseev adds a strict form: a mode from each degree in turn, a mode in reverse order of degrees and “mode by semitones” — one mode in all twelve keys in a row. The patterns are not written out in every key: the ear and the fingers are being trained, not the eyes.</p>
${lab('scalepat')}
<h3>How to learn from recordings</h3>
<p>Transcribing from the record, not from ready-made transcriptions. The order: (1) work out the form — in AABA a difficult passage will come back twice more; (2) the melody in short chunks, tapping the beats; (3) the bass notes on the changes; (4) the chords from the bass — major or minor is checked by playing a major and a minor third over the recording; (5) a difficult chord is skipped — it will come back in the next chorus. A solo is best learned by playing along with the recording (breathing, phrasing), and only then, if desired, written down. It is worth playing both with backing tracks and with real recordings: getting into their groove and energy.</p>
<p>Knowing a tune and a chord is helped by the [[fourmem|four memories]]: the ear (“this is how C7alt sounds”), theory (“the seventh mode of D♭ melodic minor”), the hand (“this is how it feels in the fingers”) and the eye (“this is how it looks”). A familiar tune with the same moves is worth playing a half step higher — it shows at once what has been learned and what rests on habit. A finished arrangement of a tune — into all twelve keys. Weak spots show in reaction time: how many seconds it takes to find a chord in a difficult key.</p>
${tip('In the app: the recording goes into the media library; the player slows it down to half speed without changing pitch, the A–B loop holds a difficult passage; stems separate the bass. One’s own playing is recorded with the record button in the instruments and listened to the next day.')}
<h3>One tune — every device</h3>
<p>Levine’s method: one tune (its first bars) is taken through each device in turn — three-note voicings, tritone substitutes, left-hand voicings, ♭9 and ♯11, sequence, fourths and So What, upper structures, pentatonics, four-note groups, stride and Powell voicings. For each device: on its own around the circle of fifths → into the tune wherever possible → several devices combined → all keys → other tunes. Two hands together is a separate skill: the right hand plays a sequence, the left hand stride.</p>
<h3>Singing</h3>
<p>Both rudiments books agree: the main ear exercise is singing. Degrees over the tonic triad, intervals from a note, the missing note of a chord, a ninth over a chord, a guide-tone line — and Alekseev recommends singing one note and finding as many harmonizations for it as possible. The app’s tuner checks the pitch: the diagram plays a note and listens.</p>
${lab('sing')}
<h3>The exercises</h3>
<p>Everything that has to be done with the hands. There is no need to track progress — what counts is time at the instrument.</p>
<ol class="bexl">
<li><b>Intervals.</b> All intervals sung and played up and down from one note, then from each of the twelve.</li>
<li><b>Seventh chords.</b> The five basic seventh chords on every root, in root position and inversions.</li>
<li><b>Harmonization.</b> Seventh chords of major, harmonic and melodic minor in every key; the chords of melodic minor as a family, in one row.</li>
<li><b>Modes.</b> The seven modes on one root along the brightness ladder, with the characteristic degree stressed. The mode chain and mode by semitones.</li>
<li><b>Guide tones.</b> 3 and 7 around the circle of fifths: dominants, minor, major.</li>
<li><b>ii–V–I.</b> Shells, then rootless (A/B) — around the circle and down by whole steps; major and minor; then in random keys.</li>
<li><b>Turnarounds.</b> All the I–vi–ii–V variants in three keys.</li>
<li><b>Analysis.</b> Three tunes: arrows, brackets, degrees — in pencil over the chords; tonal centres.</li>
<li><b>Voicings.</b> Drop 2, quartal voicings, So What and upper structures on ii–V–I.</li>
<li><b>Reharmonization.</b> One tune — five versions, one device each.</li>
<li><b>Coltrane changes.</b> The first four bars of Countdown in all twelve keys, slowly.</li>
<li><b>Comping.</b> A blues in F with three different rhythmic figures; ahead of the change, not behind it.</li>
<li><b>Latin.</b> The clave in claps, the montuno in the hands; switching the direction.</li>
<li><b>Scale for a chord.</b> A continuous scale through the chord changes of a tune, without returning to the root.</li>
<li><b>Pentatonics and four-note groups.</b> The V pentatonic on ii–V–I; the minor sixth scale on ø – alt.</li>
<li><b>Approaches.</b> Enclosures of 3 and 7 of every chord in ii–V–I.</li>
<li><b>Block chords.</b> The C6 and Cm6 scales in drop 2, up and down through two octaves.</li>
<li><b>Tune.</b> A new tune every week or two: form → melody → chords; the lyrics; the sheet checked against the recording.</li>
<li><b>Ear.</b> The training below — a few minutes before playing.</li>
</ol>
<h3>Training</h3>
<p>Questions are chosen at random from the selected types. The score counts only this round — no streaks or rankings.</p>
${lab('ex')}
${key('Recording oneself and listening back is the best critic. A mistake is let go at once: the next note is the start of the rest of the solo.')}
` },
{ id: 'ref', t: 'Reference', s: 'Chords, scales, tensions, terms, books', src: 'jazzology,levine,kubistra,maksimov', h: `
<h3>Chords</h3>
${lab('refch')}
<h3>Scales</h3>
${lab('refsc')}
<h3>Available tensions</h3>
${lab('tens')}
<h3>Avoid notes</h3>
${lab('avoid')}
<h3>Terms</h3>
<p>All the terms of the textbook, with search. Ensemble jargon: [[tradefours|trading fours]], [[shout|shout chorus]], [[tag|tag]], [[interlude|interlude]], [[intro|intro]], [[cadenza|cadenza]], [[breakT|break]], [[stoptime|stop-time]], [[stroll|stroll]], [[doubletime|double time]], [[straight8|straight eighths]], [[pocket|in the pocket]], [[outchorus|out chorus]], [[chart|chart]], [[vampcue|vamp till cue]], [[trainwreck|train wreck]], [[woodshed|woodshed]].</p>
${lab('gloss')}
<h3>Pieces</h3>
<p>World classics and folk tunes in the public domain, in our own notation. Notation for piano, notation and tab for guitar and bass, playback with accompaniment and a check of playing.</p>
${lab('pieces')}
<h3>Further reading</h3>
<p>The books the textbook is built on. Its diagrams, examples and melodies are its own; the books offer more: notated examples, analyses of recordings and exercises.</p>
${lab('books')}
` },
];
