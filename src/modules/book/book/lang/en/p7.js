// Учебник (en), уроки: глава «Игра на инструменте», названия уроков, упражнения по инструментам (lessons.js).
// Упражнения — свои, по общепринятой методике начального обучения (школы для пианино, гитары и баса, программа сольфеджио);
// чужие упражнения и песни не переносятся. Песни — народные или из своей библиотеки.
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'pc.lightly': 'Lightly Row (Hänschen klein)', 'pc.lightly.by': 'German folk song; five-finger C position',
  'pc.jacques': 'Frère Jacques', 'pc.jacques.by': 'French folk song; a round',
  'pc.korobeiniki': 'Korobeiniki', 'pc.korobeiniki.by': 'Russian folk song (19th century)',
  'bk.part7': 'Playing an instrument',
  'ls.n': 'Lesson {n}', 'ls.list': 'Chapter lessons',
  'lx.title': 'Exercises', 'lx.inst': 'Instrument', 'lx.i.p': 'Piano', 'lx.i.g': 'Guitar', 'lx.i.b': 'Bass', 'lx.phone': 'No instrument',
  'lx.markDone': 'Lesson done', 'lx.isDone': 'Done', 'lx.go': 'Play', 'lx.stop': 'Stop', 'lx.hear': 'Example', 'lx.done': 'Correct ✓',
  'lx.chordHint': 'The microphone hears whether the chord is major or minor and on which note. The chord is held until it lights up.',
  'lx.tap': 'Tap', 'lx.tapGo': 'Tap it · {bpm}', 'lx.tapRes': 'Hits: {ok} of {n}; extra taps: {x}.', 'lx.tapHint': 'First a count-in bar, then the pattern tapped on the button to the metronome clicks.',
  'lx.open.metro': 'Metronome · {bpm}', 'lx.open.tuner': 'Tuner', 'lx.open.theory': 'Theory: circle of fifths', 'lx.open.audio': 'Library and recording', 'lx.open.piano': 'Piano',
  'lp.start.kicker': 'From scratch', 'lp.start.title': 'First steps', 'lp.start.sub': '20 lessons: rhythm, notes, chords, a first song — on piano, guitar or bass',
  'lp.prog': '{d} of {n} done', 'lp.start.lead': 'Lessons from the chapters of the academic part in teaching order: theory goes straight to the instrument and into a song. A lesson takes 15–25 minutes; one lesson every two or three days works well.',
  'lp.begin': 'Start: lesson {n} — {t}', 'lp.cont': 'Continue: lesson {n} — {t}',
  'lp.note': 'The “Lesson done” mark is set by hand: the app’s checks give hints but never lock lessons. No streaks and no reminders — only the progress of the path.',

  // названия уроков
  'ls.play1': 'Posture, tuning, first sounds', 'ls.play2': 'First chords and changes', 'ls.play3': 'Accompaniment: I – IV – V', 'ls.play4': 'Bass and voice leading', 'ls.play5': 'Blues and pentatonic', 'ls.play6': 'A whole song',
  'ls.sound1': 'Sound and its properties', 'ls.sound2': 'Notes and octaves', 'ls.sound3': 'Clefs, score, range',
  'ls.rhythm1': 'Pulse and note values', 'ls.rhythm2': 'Rests, dots, ties', 'ls.rhythm3': 'Beaming, triplets, dotted rhythm', 'ls.rhythm4': 'Straight and swung eighths',
  'ls.meter1': 'Metre and bar', 'ls.meter2': '3/4 and 6/8, conducting', 'ls.meter3': 'Upbeat and syncopation',
  'ls.pitch1': 'Tone, semitone, accidentals', 'ls.pitch2': 'Semitones and temperament',
  'ls.mode1': 'Mode and the major scale', 'ls.mode2': 'Tendencies and tetrachords', 'ls.mode3': 'Minor',
  'ls.keys1': 'Key signatures', 'ls.keys2': 'Circle of fifths and related keys', 'ls.keys3': 'Degrees and transposition',
  'ls.melody1': 'Motif, phrase, period', 'ls.melody2': 'Sequence and form',
  'ls.perform1': 'Tempo and dynamics', 'ls.perform2': 'Articulation, ornaments, character',
  'ls.iv1': 'Intervals', 'ls.iv2': 'Table, enharmonics, inversion', 'ls.iv3': 'Consonance and ear', 'ls.iv4': 'Intervals in a key',
  'ls.chords1': 'Triads', 'ls.chords2': 'Inversions', 'ls.chords3': 'Seventh chords', 'ls.chords4': 'Tensions and sus', 'ls.chords5': 'Upper structures',
  'ls.scales1': 'Modes of major', 'ls.scales2': 'Scales by chord family', 'ls.scales3': 'Melodic and harmonic minor', 'ls.scales4': 'Symmetric, pentatonic, bebop', 'ls.scales5': 'Chromatic, shifting mode, all scales',
  'ls.key1': 'Functions T, S, D', 'ls.key2': 'Minor and cadences',

  // упражнения: p — пианино, g — гитара, b — бас, t — без инструмента
  'lx.play1.p': ul('Seat height so that the elbows are slightly above the keys; the hand rounded, as if holding a ball; fingers are numbered from the thumb (1) to the little finger (5).', 'All the Cs: just left of each group of two black keys. Middle C (C4) is in the centre.', 'Right hand: C–D–E–F–G with fingers 1-2-3-4-5 and back, slowly and evenly; then the left hand from C3 with fingers 5-4-3-2-1.'),
  'lx.play1.g': ul('Seated, guitar on the right thigh (classical posture — on the left), neck tilted slightly up; back straight.', 'Strings tuned with the tuner, from thick to thin: E A D G B E.', 'The string is pressed with the fingertip just behind the fret (close to the metal fret wire), thumb behind the neck. Each open string in turn, then the note at the 3rd fret of the first string (G) — a clean sound, no buzz.'),
  'lx.play1.b': ul('Strap adjusted so that the bass hangs at the same height seated and standing; neck tilted slightly up.', 'Strings tuned with the tuner: E A D G (from the thickest).', 'Right hand: fingers 2 and 3 (index and middle) alternating, thumb resting on the pickup or on the E string. Left hand: one finger per fret — 1st finger at the 1st fret, 2nd at the 2nd and so on.'),
  'lx.play1.t': 'C on the on-screen piano (the “Piano” tool), then C–G; the note from the “Example” button sung back and checked by singing in the “Interval” drill.',
  'lx.play2.p': ul('C major chord (C): left hand C–E–G with fingers 5-3-1; F major (F) — F–A–C; G major (G) — G–B–D or, closer, B–D–G (G/B).', 'Changes per minute: two chords back and forth (C ↔ F) — how many clean changes in a minute? The number is written down and compared a week later.', 'With the metronome at 60: a chord on every beat, changes without stopping.'),
  'lx.play2.g': ul('A and D: the first two chords (A — three fingers in a row at the 2nd fret; D — a triangle on the 2nd and 3rd frets). Then E.', 'Changes per minute: A ↔ D, then D ↔ E, A ↔ E. The number of clean changes per minute is written down; it is an honest measure of progress.', 'All fingers go down together, not one at a time; the chord is held and every string checked — does it ring?'),
  'lx.play2.b': ul('Root and fifth: from the root A (5th fret on E or open A) the fifth is two frets higher on the next string (E).', 'A – D – E as roots with the metronome at 60, four strokes on each.', 'Then “root – fifth – root – fifth” on each chord.'),
  'lx.play2.t': 'The “Triad by ear” drill: major or minor. The “Triads” diagram in the “Chords” chapter — played on the on-screen piano.',
  'lx.play3.p': ul('In C major: C – F – G – C (I – IV – V – I). Left hand — bass (root), right hand — chord: “bass – chord – chord – chord”.', 'Inversions for smooth changes: C (C–E–G) → F/C (C–F–A) → G/B (B–D–G) → C.', 'A three-chord song (folk or from the own library) with the metronome at 80.'),
  'lx.play3.g': ul('Chords G, C, D (in G major these are I, IV, V). Changes per minute G ↔ C, C ↔ D.', 'Strumming: down on every beat, then “down – down-up – up-down-up”.', 'A song on G, C, D with the metronome at 80; then the same song with a capo — in another key.'),
  'lx.play3.b': ul('Roots of I – IV – V in G: G – C – D. In crotchets, then in quavers.', 'A passing note before the chord change: to C from G via A or B.', 'A three-chord song: bass on 1 and 3, then on every beat.'),
  'lx.play3.t': 'A song opened in “Songs”, with I, IV and V found in it (the key is on the song card); the song transposed to see how the chords change.',
  'lx.play4.p': ul('Left hand — octaves on the roots, right hand — chords in the nearest inversions: C – G/B – Am – F.', 'Walking bass: C – B – A – F – G – C (a descending line under the chords).', 'Each new chord moves to the nearest notes: the common note stays in place.'),
  'lx.play4.g': ul('Alternating bass: root – chord – fifth – chord (on C: 5th string, chord, 6th string 3rd fret, chord).', 'Walking bass in C – G/B – Am: C – B – A on the 5th string.', 'Fingerpicking p-i-m-a over the same chords.'),
  'lx.play4.b': ul('Line C – B – A – F – G – C under the chords C – G/B – Am – F – G – C.', 'Approach to the new root by a semitone from below or above on the last beat of the bar.', 'Root – third – fifth – third (arpeggio) on each chord.'),
  'lx.play4.t': 'Library: a song recording opened, the “bass” track switched on (if the recording is split), and the bass followed between the chords.',
  'lx.play5.p': ul('Blues in C (12 bars): C7 ×4, F7 ×2, C7 ×2, G7, F7, C7, G7. Left hand — a “shuffle”: C–G and C–A in turn.', 'Right hand — the minor pentatonic from A (A – C – D – E – G) or from C (C – E♭ – F – G – B♭) over the blues.', 'Call and response: a short two-bar phrase, then an answer to it.'),
  'lx.play5.g': ul('Blues in A: A7 ×4, D7 ×2, A7 ×2, E7, D7, A7, E7. Shuffle on the 5th and 6th strings: fifth and sixth in turn.', 'The first pentatonic “box” at the 5th fret (A minor): two notes per string.', 'Improvisation over 2 choruses: 3–4 notes, rests, repetitions.'),
  'lx.play5.b': ul('Blues line 1 – 3 – 5 – 6 – ♭7 – 6 – 5 – 3 on A7, D7, E7.', 'A minor pentatonic as a bass line and a short fill at the end of the chorus.', 'Two choruses of blues without losing the form, to drums (metronome with accent).'),
  'lx.play5.t': 'The “Form” diagram in the “Forms” chapter of the jazz part: the blues, with the bars lit up; an answer sung to a pentatonic phrase.',
  'lx.play6.p': ul('A song of one’s own choice: form (verse, chorus) → melody → chords.', 'Played through with the metronome without stopping — mistakes are not corrected, the playing goes on.', 'Recorded and compared with the recording from the first lessons.'),
  'lx.play6.g': ul('A song of one’s own choice: form → chords → strumming or fingerpicking.', 'Played through with the metronome without stopping.', 'Recorded; two spots where the change comes late are found and practised separately.'),
  'lx.play6.b': ul('A song of one’s own choice: form → roots → bass rhythm.', 'Played through with the metronome or with a recording from the library.', 'Recorded; does the bass line up with the drums (on 1 and 3)?'),
  'lx.play6.t': 'A song chosen in “Songs”, its form and chords worked out, the hard spot repeated with an A–B loop in the library (slowed down without changing pitch).',

  'lx.sound1.p': 'One note, quiet and loud, short and long: the four properties of sound. Then the same note in different octaves.',
  'lx.sound1.g': 'One note at the 5th fret of the 1st string and the same pitch on the 2nd string (10th fret): different timbre, same pitch. Then a harmonic at the 12th fret.',
  'lx.sound1.b': 'One note near the neck and near the bridge: the timbre changes. Harmonics at the 12th, 7th and 5th frets — the first overtones.',
  'lx.sound1.t': 'The “Overtones” diagram in the chapter: the series listened to; an interval sung on request.',
  'lx.sound2.p': 'All the notes from middle C (C4) to C5 named and played; then the same notes in the C3 octave. Every C on the keyboard found.',
  'lx.sound2.g': 'Notes on the 1st and 2nd strings in first position: E–F–G, B–C–D. Each note named aloud while playing.',
  'lx.sound2.b': 'Notes on the E string: E–F–G (frets 0, 1, 3); on A: A–B–C (0, 2, 3). Each one named while playing.',
  'lx.sound2.t': 'The “Note on the staff” drill: 10 questions.',
  'lx.sound3.p': 'Bass clef notes found on the keyboard: G2 – C3 – F3.',
  'lx.sound3.g': 'Guitar music is written an octave above the sound: E4 found on the neck from the notation (open 1st string).',
  'lx.sound3.b': 'The bass reads the bass clef and sounds an octave below the written note: A1 (open A) and G2 (5th fret on D) found.',
  'lx.sound3.t': 'The “Note on the staff” drill in treble and bass clefs.',

  'lx.rhythm1.p': 'With the metronome at 70: C in crotchets, then in minims, counting aloud “one-and, two-and”. Then the pattern below tapped.',
  'lx.rhythm1.g': 'With the metronome at 70: an open string in crotchets (pick downstrokes), then in minims.',
  'lx.rhythm1.b': 'With the metronome at 70: open A in crotchets, fingers alternating; then in minims.',
  'lx.rhythm1.t': 'The pattern tapped on the screen; then clapped to the metronome.',
  'lx.rhythm2.p': 'A pattern with rests and a dot — on one note, then on C–E–G.',
  'lx.rhythm2.g': 'The pattern on an open string: on the rest the string is muted with the palm.',
  'lx.rhythm2.b': 'The pattern on open A: on the rest the string is muted with the left hand.',
  'lx.rhythm2.t': 'The pattern tapped on the screen; then read in rhythm syllables.',
  'lx.rhythm3.p': 'Triplets in the right hand on C–E–G against crotchets in the left (C).',
  'lx.rhythm3.g': 'Triplets: down-up-down per beat, slowly; then dotted rhythm “long dotted – short”.',
  'lx.rhythm3.b': 'Triplets on one note, fingers alternating; then dotted rhythm.',
  'lx.rhythm3.t': 'The triplet pattern tapped on the screen.',
  'lx.rhythm4.p': 'C major scale in straight quavers, then swung (the first quaver longer).',
  'lx.rhythm4.g': 'Strumming in straight quavers, then swung.',
  'lx.rhythm4.b': 'Quavers on the root, straight, then swung; accent on 2 and 4.',
  'lx.rhythm4.t': 'The “Rhythm grid” diagram in the chapter: “straight / swing” switched to hear the difference; quavers tapped.',

  'lx.meter1.p': 'A melody in 4/4: accent on “one”. A chord on every beat, louder on the strong beat.',
  'lx.meter1.g': 'Downstrokes on every beat, stronger on “one”.',
  'lx.meter1.b': 'The root on every beat, stronger on “one”.',
  'lx.meter1.t': 'Crotchets tapped on the screen; a four-beat pattern conducted to the metronome.',
  'lx.meter2.p': 'A waltz in 3/4: left hand “bass – chord – chord” on C and G7.',
  'lx.meter2.g': 'Waltz: bass on “one”, chord on “two” and “three”; fingerpicking p-i-m on C and G.',
  'lx.meter2.b': 'Waltz: the root on “one”, a rest or the fifth on “two” and “three”.',
  'lx.meter2.t': 'A pattern in 3/4 tapped; the “Metre” diagram — 3/4 and 6/8 compared.',
  'lx.meter3.p': 'A chord on the “and” before the strong beat — a syncopation; then a melody with an upbeat.',
  'lx.meter3.g': 'Syncopated strumming: down – down-up – up-down-up (the stroke on “three” skipped).',
  'lx.meter3.b': 'A quaver before the beat of the change — the new note comes before “one”.',
  'lx.meter3.t': 'Syncopations tapped on the screen.',

  'lx.pitch1.p': 'Chromatically from C: every key in a row, white and black; each one named with a sharp and with a flat.',
  'lx.pitch1.g': 'Chromatically on the 1st string from fret 0 to fret 5: one fret is a semitone.',
  'lx.pitch1.b': 'Chromatically on the E string from fret 0 to fret 5: one fret is a semitone.',
  'lx.pitch1.t': 'The “Twelve notes” diagram — each key named with two names.',
  'lx.pitch2.p': 'E–F and B–C: semitones with no black key between them.',
  'lx.pitch2.g': 'Compared with the tuner: A at the 5th fret of the 6th string and the open 5th string — the same pitch.',
  'lx.pitch2.b': 'Compared with the tuner: 5th fret on E and open A — the same pitch; tuning by the 5th fret works the same way.',
  'lx.pitch2.t': 'The tuner opened and A sung; how many cents off?',

  'lx.mode1.p': 'C major scale, right hand: fingers 1-2-3, thumb under, 1-2-3-4-5; left hand: 5-4-3-2-1, 3rd finger over. Up and down with the metronome at 60.',
  'lx.mode1.g': 'C major scale in first position from the 3rd fret of the 5th string, up and down; one finger per fret.',
  'lx.mode1.b': 'C major scale from the 3rd fret on A: fingers 2-4, 1-2-4, 1-3-4 (one position).',
  'lx.mode1.t': 'The scale sung with the tuner: degrees from the tonic.',
  'lx.mode2.p': 'Tendencies: B → C, D → C, F → E; an unstable degree and its resolution.',
  'lx.mode2.g': 'The same resolutions on the 2nd and 3rd strings; then the two tetrachords of the scale — lower and upper — with one finger pattern.',
  'lx.mode2.b': 'Resolutions on the A and D strings; the scale as two tetrachords: the same finger pattern on neighbouring strings.',
  'lx.mode2.t': 'Degrees sung over a triad — the tuner checks.',
  'lx.mode3.p': 'A minor: natural, then harmonic (G sharp), then melodic ascending.',
  'lx.mode3.g': 'A minor in first position from the open 5th string; then with G sharp.',
  'lx.mode3.b': 'A minor from open A; then with G sharp.',
  'lx.mode3.t': 'The “Minor: three forms” diagram — all three listened to; the leading note G sharp → A sung.',

  'lx.keys1.p': 'G major scale with F sharp: right hand as in C major, 4th finger on F sharp.',
  'lx.keys1.g': 'G major scale from the 3rd fret of the 6th string.',
  'lx.keys1.b': 'G major scale from the 3rd fret on E.',
  'lx.keys1.t': 'The “Key signatures” drill.',
  'lx.keys2.p': 'Tonics around the circle of fifths: C – G – D – A, each as a tonic triad.',
  'lx.keys2.g': 'Chords around the circle: C – G – D – A – E; then back: E – A – D – G – C.',
  'lx.keys2.b': 'Roots around the circle of fifths downwards: C – F – B♭ – E♭ (on the E and A strings).',
  'lx.keys2.t': '“Theory”: circle of fifths — the relative minor and related keys found.',
  'lx.keys3.p': 'The melody from the lesson “Motif, phrase, period” played from G and from F.',
  'lx.keys3.g': 'The same song with a capo at the 2nd fret — which key is it now?',
  'lx.keys3.b': 'The same line from another string (a fourth higher).',
  'lx.keys3.t': 'The “Note as a degree” drill; transposition in “Theory”.',

  'lx.melody1.p': 'The “Ode to Joy” melody (Beethoven, public domain) in the right hand; its phrases and cadence found.',
  'lx.melody1.g': '“Ode to Joy” on the 2nd and 3rd strings; where do the phrases end?',
  'lx.melody1.b': '“Ode to Joy” in the low register: from E at the 2nd fret on D.',
  'lx.melody1.t': 'The “Period” diagram — question and answer found.',
  'lx.melody2.p': 'Sequence: the motif C–D–E repeated from D and from E.',
  'lx.melody2.g': 'A sequence on one string — the motif moves along the frets.',
  'lx.melody2.b': 'A sequence across the strings: the same finger pattern on the next string.',
  'lx.melody2.t': 'The “Sequence” diagram — listened to and the motif continued by voice.',

  'lx.perform1.p': 'The scale at tempo 60 and 120; then quiet (p) and loud (f), then a crescendo.',
  'lx.perform1.g': 'Chords with the metronome at 60 and 120; strumming quiet and loud.',
  'lx.perform1.b': 'Roots at tempo 60 and 120; even volume with alternating fingers.',
  'lx.perform1.t': 'The “Tempo” diagram — the marking guessed by ear.',
  'lx.perform2.p': 'Legato and staccato on one scale; a trill C–D.',
  'lx.perform2.g': 'Legato (hammer-on and pull-off) and staccato (muting); vibrato on one note.',
  'lx.perform2.b': 'Staccato and legato on the roots; a slide into a note.',
  'lx.perform2.t': 'The “Articulation” diagram — the difference heard.',

  'lx.iv1.p': 'From C, every interval upwards to the octave, each one named.',
  'lx.iv1.g': 'Intervals on one string (fret = semitone) and on neighbouring strings (fourth — the same fret on the next string).',
  'lx.iv1.b': 'Fifth, fourth and octave — shapes under the fingers (next string, one string over).',
  'lx.iv1.t': 'The “Interval from notes” and “Interval by ear” drills; an interval sung.',
  'lx.iv2.t': 'The “Interval inversion” and “Interval building” drills.',
  'lx.iv3.t': 'The “Interval by ear” drill: by the openings of familiar tunes.',
  'lx.iv4.t': 'The “Intervals in a key” diagram; the “Interval building” drill.',

  'lx.chords1.p': 'Triads C, F, G, Am in the right hand; major and minor differ in the third (E – E flat).',
  'lx.chords1.g': 'A, D, E, Am, Em: A and Am compared — one note changes (the third).',
  'lx.chords1.b': 'Triad arpeggios: root – third – fifth on C and Am.',
  'lx.chords1.t': 'The “Triad by ear” drill.',
  'lx.chords2.p': 'C in three shapes: C–E–G, E–G–C, G–C–E; then C – F/C – G/B – C.',
  'lx.chords2.g': 'The chord G/B (B in the bass) between C and Am.',
  'lx.chords2.b': 'Third in the bass: E under C — this is how C/E sounds.',
  'lx.chords2.t': 'The “Inversion by ear” drill.',
  'lx.chords3.t': 'The “Seventh chord by ear” and “Chord notes” drills.',
  'lx.chords4.t': 'The “Seventh chord by ear” drill; the “Sus” diagram — the resolution listened to.',

  'lx.scales1.p': 'D Dorian: the scale from D on the white keys; its characteristic degree (B) found.',
  'lx.scales1.g': 'D Dorian from the 5th fret of the 5th string.',
  'lx.scales1.b': 'D Dorian from the 5th fret on A.',
  'lx.scales1.t': 'The “Scale for the chord” drill.',
  'lx.scales2.t': 'The “Scale for the chord” drill.',
  'lx.scales3.p': 'A melodic minor ascending (F sharp, G sharp).',
  'lx.scales3.g': 'A melodic minor in the position from the 5th fret.',
  'lx.scales3.b': 'A melodic minor from open A.',
  'lx.scales3.t': 'The “Altered or diminished?” diagram — both colours listened to.',
  'lx.scales4.p': 'A blues scale over an A7 chord.',
  'lx.scales4.g': 'A blues scale in the first box (E flat added).',
  'lx.scales4.b': 'A blues scale as a bass riff.',

  'lx.key1.p': 'C – F – G – C: T – S – D – T; in inversions, the hand barely moves.',
  'lx.key1.g': 'G – C – D – G: T – S – D – T; strumming in crotchets.',
  'lx.key1.b': 'Roots T – S – D – T in C: C – F – G – C.',
  'lx.key1.t': 'The “Chord function” and “Chord degree” drills.',
  'lx.key2.p': 'A minor: Am – Dm – E – Am (the dominant is major — with G sharp).',
  'lx.key2.g': 'Am – Dm – E – Am; then E7 instead of E.',
  'lx.key2.b': 'Roots A – D – E – A; on E — G sharp in the line.',
  'lx.key2.t': 'The perfect and half cadences listened to in the chapter diagram.',
};

export const TERMS = {
  chordchange: ['Changes per minute', 'an exercise: how many times in a minute two chords can be changed cleanly; the number is written down and compared a week later.', 'play'],
  shuffle: ['Shuffle', 'a blues accompaniment pattern: the fifth and sixth above the root in turn, in swung quavers.', 'play'],
};

export const CH = [
{ id: 'play', t: 'Playing an instrument', s: 'Posture and tuning, chords, accompaniment, bass, blues, a whole song', src: '', h: `
<p>Theory comes alive only in the hands. This chapter gathers what is needed on piano, guitar and bass from day one: how to sit and tune, how to place chords and change them without gaps, how to accompany a song, how to lead the bass and how to play the blues. The lesson exercises follow the chosen instrument; the switch is at the start of the exercises.</p>
<h3>Posture and hands</h3>
<p>A comfortable posture is not about looks but about speed and healthy hands. At the piano the elbows are slightly above the keys, the hand rounded, the fingers standing on their pads; on guitar and bass the neck tilts slightly up, the shoulders are free, the left thumb is behind the neck. If something is tense, it is time to stop and shake the hand out: tension does not go away by itself.</p>
<h3>Tuning and first sounds</h3>
<p>Guitar and bass are tuned with a tuner before every session: strings stretch and drift out of tune. A piano is tuned by a technician, and a digital one never goes out of tune. The first sounds should be even and clean: on strings the string is pressed with the fingertip just behind the fret; on keys the sound comes from the weight of the arm, not the force of the finger.</p>
${tip('The app’s tuner shows the deviation in cents. A string is best brought up to pitch from below: that way it stays in tune longer.')}
<h3>Chords and changes</h3>
<p>The first chords are learned in pairs, by what suits the hands. On piano — C, F and G major (C, F, G), then A minor. On guitar — A and D, then E, then the minor Am, Em, Dm and finally G and C. On bass a chord is its root and fifth. The main difficulty is not the chord but the change: all fingers move at once, not one at a time, and the change is practised on its own — with [[chordchange|changes per minute]].</p>
${key('Progress is measured simply: the number of clean changes per minute and the tempo at which the song goes through without stopping. A week later the numbers are compared.')}
<h3>Accompaniment: I – IV – V</h3>
<p>Three chords — tonic, subdominant and dominant — carry thousands of songs. In C major these are C, F and G; in G, they are G, C and D. Accompaniment is rhythm: on piano “bass — chord”, on guitar strumming or fingerpicking, on bass the root on the strong beats. First, one chord per bar, evenly with the metronome; a whole song without stopping matters more than a fancy but broken rhythm.</p>
<h3>Bass and voice leading</h3>
<p>Chords connect smoothly when the common note stays in place and the others move to the nearest notes: inversions serve this purpose (G/B instead of G). The bass need not jump either; it can walk step by step — C, B, A, F, G. A bassist links chords with passing notes: on the last beat of the bar, a note a semitone or a tone away from the next root.</p>
<h3>Blues and pentatonic</h3>
<p>The twelve-bar blues is the shortest road to playing together: three chords (I7, IV7, V7) and a form everyone knows. The accompaniment is the [[shuffle|shuffle]]: the fifth and sixth above the root in turn. Over the blues sounds the minor pentatonic of the key — five notes in which it is almost impossible to go wrong. A first improvisation is call and response: a short phrase and its reply, with rests.</p>
<h3>A whole song</h3>
<p>A song is learned in the order “form → melody → chords”: first the parts (verse, chorus, intro), then the melody, then the harmony and rhythm. It is played through with the metronome or a recording, without stopping at mistakes: stopping is a habit that is hard to unlearn. A recording of oneself, listened to the next day, reveals what cannot be heard while playing.</p>
${tip('In the app: the song is in “Songs” with chords and transposition, recordings are in the library, slowing down without changing pitch and the A–B loop are in the player, and self-recording is the record button in any tool.')}
` },
];
