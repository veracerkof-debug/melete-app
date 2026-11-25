// «Гитара с нуля»: новый порядок и уроки (слово автора 25.11.2026): сначала устройство и посадка, потом схема аккорда, ритм, минор, бой, гармония, песни,
// гаммы (мажор, минор, хроматика), слух, ступени, септаккорды. Переопределяет и дополняет pg.js (одинаковые id — берутся отсюда).
const tip = (t) => '<aside class="btip"><b>Try it</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Remember</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  "ls.g2": "Parts of the guitar",
  "lx.g2.g": ul("Touch the strings in the diagram: the 6th is low, the 1st is high; say number and note.", "Rotate the model and take it apart; touch each part and read what it does."),
  "lx.g2.t": "Point at the 1st and 6th strings, the nut, the 1st fret and the tuning pegs on your own guitar.",
  "lx.g2.easy": "Remember two phrases: “strings go from thin” and “frets go from the head”.",
  "lx.g2.fix": "Mixing up strings? In the diagram the 6th is on top and the thickest; touch them on your guitar, they feel different.",
  "ls.g1": "Posture",
  "lx.g1.g": ul("Sit down, put the footstool under the left foot, rest the guitar on the left thigh.", "Check: shoulders down, neck free, wrists not bent, breathing even."),
  "lx.g1.t": "Sit with the guitar for two minutes without once fixing the neck by hand.",
  "lx.g1.easy": "Start without the guitar: sit, put the foot up, and only then pick up the instrument.",
  "lx.g1.fix": "Neck gets stiff — the guitar is too low, raise the stool. Wrist hurts — the neck is too flat, lift it higher.",
  "ls.g32": "Pulse and bar",
  "lx.g32.g": ul("Metronome 60: clap on every beat and count aloud to four.", "Clap only on “one” and stay steady for several bars in a row."),
  "lx.g32.t": "Keep an even count “one-two-three-four” for one minute with the metronome.",
  "lx.g32.easy": "Start at 50 beats per minute — it is easier to hear the pulse when slow.",
  "lx.g32.fix": "Rushing or dragging? Do not watch the hands, listen to the click and “land” on it.",
  "ls.g5": "Chord diagram and the first three chords",
  "lx.g5.g": ul("C: fingers 1-2-3 as a staircase, play the five thin strings (skip the 6th).", "D: three fingers side by side, play the four thin strings. E: fingers 1-2-3, play all six."),
  "lx.g5.t": "Play C, D and E in turn and say aloud which strings are silent.",
  "lx.g5.easy": "Start with one chord, C — and only when it rings clean move on to D.",
  "lx.g5.fix": "A string is dead — a finger touches its neighbour: press with the tip and more upright. Buzzing — move the finger closer to the fret wire.",
  "ls.g7": "Chords G and A",
  "lx.g7.g": ul("G: finger 2 on fret 3 of string 6, finger 1 on fret 2 of string 5, finger 3 on fret 3 of string 1; play all six.", "A: fingers 1-2-3 in a row on fret 2 of strings 4, 3 and 2; skip the 6th."),
  "lx.g7.t": "Change C → G four times in a row without stopping.",
  "lx.g7.easy": "Change only two chords until the change is smooth.",
  "lx.g7.fix": "Change gets stuck — before it, look at the new diagram and see the whole shape.",
  "ls.g23": "Chord F: the easy version",
  "lx.g23.g": ul("Index lies sideways on fret 1 of strings 1 and 2; finger 2 — string 3, fret 2; finger 3 — string 4, fret 3.", "Play four thin strings (4th to 1st), do not touch the thick ones."),
  "lx.g23.t": "Change C → F → C, four beats each with the metronome at 60.",
  "lx.g23.easy": "First place only the index on the two thin strings and listen for a clean ring.",
  "lx.g23.fix": "The sound is dull — slide the index nearer to the fret wire and roll the finger slightly onto its edge.",
  "ls.g33": "All major chords on one screen",
  "lx.g33.g": ul("Play C D E G A F in a row, four beats each, metronome 60.", "Pick the hardest change and repeat it ten times."),
  "lx.g33.t": "Play the whole round twice without stopping.",
  "lx.g33.easy": "Play three chords at a time: C D E, then G A F.",
  "lx.g33.fix": "Losing it on a change — slow the metronome to 50 and prepare the finger early.",
  "ls.g13": "Down strum and note lengths",
  "lx.g13.g": ul("A down strum on every beat, four per bar, metronome 60–70.", "Same chord: whole (one), halves (one-three), quarters (one-two-three-four)."),
  "lx.g13.t": "Play four bars each of wholes, halves and quarters without stopping.",
  "lx.g13.easy": "Start with wholes: one strum per bar and count in your head.",
  "lx.g13.fix": "The strum misses the click — play slightly slower and watch the wrist: the hand falls down loosely.",
  "ls.g9": "The first song",
  "lx.g9.g": ul("Four down strums per chord, metronome 60.", "Play the round three times in a row without stopping."),
  "lx.g9.t": "Record yourself and find the place where the change is late.",
  "lx.g9.easy": "Play two strums per chord and speed up gradually.",
  "lx.g9.fix": "Late on a change — place the fingers of the new chord one at a time, starting with the one nearest the nut.",
  "ls.g10": "Minor: Am, Em and Dm",
  "lx.g10.g": ul("Am: finger 1 on fret 1 of string 2, fingers 2 and 3 on fret 2 of strings 4 and 3; skip the 6th.", "Em: fingers 2 and 3 on fret 2 of strings 5 and 4; play all six. Dm: fingers 1-2-3, play the four thin strings."),
  "lx.g10.t": "Guess five “major or minor” pairs in a row by ear.",
  "lx.g10.easy": "Learn Em first — the easiest — then Am, then Dm.",
  "lx.g10.fix": "Minor sounds like major — check for an extra string: for Am and Dm the 6th is not played.",
  "ls.g24": "Full barre: F and Bm",
  "lx.g24.g": ul("F: barre on fret 1; finger 2 — string 3, fret 2; fingers 3 and 4 — strings 5 and 4, fret 3.", "Bm: barre on fret 2; see the diagram for the other fingers; play five strings."),
  "lx.g24.t": "Place the barre and hold it for three minutes with rests between tries.",
  "lx.g24.easy": "Practise only the barre without the other fingers, 10 seconds per try.",
  "lx.g24.fix": "The hand tires — rest between tries, do not press harder; a barre grows over weeks.",
  "ls.g34": "More minor: F#m, Fm and Bb",
  "lx.g34.g": ul("Fm: barre on fret 1, see the diagram for the other fingers; F#m — the same on fret 2.", "Bb: barre on fret 1, fingers 2, 3 and 4 on fret 3."),
  "lx.g34.t": "Play F, Fm, F#m in a row and hear the difference.",
  "lx.g34.easy": "Take one chord at a time and hold it until the sound is clean.",
  "lx.g34.fix": "The barre slips when moving — place the index first, then the other fingers.",
  "ls.g35": "Map of all chords",
  "lx.g35.g": ul("Play all the majors, then all the minors, four beats each.", "Alternate major and minor: C – Am – D – Bm – E – F#m."),
  "lx.g35.t": "Play the whole round without stopping, looking up any forgotten chord on the map.",
  "lx.g35.easy": "Take four chords and add one at a time.",
  "lx.g35.fix": "Forgot a shape — open the map, read the diagram and place the fingers slowly.",
  "ls.g36": "Eighth notes: splitting the beat",
  "lx.g36.g": ul("Metronome 60: clap eighths counting “one-and-two-and-three-and-four-and”.", "Clap only on the “and” and stay steady."),
  "lx.g36.t": "Play one chord in eighths (down-up) for four bars in a row.",
  "lx.g36.easy": "Count aloud while the hand is silent, then add the clap.",
  "lx.g36.fix": "The “and” drifts — count slowly: metronome 50, and every “and” exactly between clicks.",
  "ls.g14": "The “figure eight” strum",
  "lx.g14.g": ul("Metronome 70: the pattern ↓ ↓↑ ↑↓↑ on one chord, four bars.", "Change chord every bar: Am – C – G – Em."),
  "lx.g14.t": "Play the “figure eight” for eight bars without stopping or losing count.",
  "lx.g14.easy": "First strum on empty air, counting aloud, then on the strings.",
  "lx.g14.fix": "The pattern falls apart — slow to 50 and restore the “one-and-two-and” count; the hand must not stop.",
  "ls.g15": "Strumming with all chords",
  "lx.g15.g": ul("Am – Em – Am – Dm, one bar per chord, with the “figure eight”.", "C – G – Am – F, then D – A – Bm – G."),
  "lx.g15.t": "Play two four-chord sequences without stopping the hand.",
  "lx.g15.easy": "Play eighths down-up with no gaps, then switch gaps on.",
  "lx.g15.fix": "The strum breaks on a change — slow the metronome and give the change one “and”.",
  "ls.g19": "First harmony: C – Am – F – G",
  "lx.g19.g": ul("Metronome 60: C – Am – F – G, one bar per chord, quarters down.", "The same with the “figure eight”; stop on G and then return to C."),
  "lx.g19.t": "Play the progression for four rounds without stopping.",
  "lx.g19.easy": "Play two chords at a time: C – Am, then F – G.",
  "lx.g19.fix": "The F change is harder than the rest — go back to the easy F of lesson 8 or practise the barre separately.",
  "ls.g20": "The same harmony in another key",
  "lx.g20.g": ul("G – Em – C – D, one bar per chord, with the “figure eight”, metronome 70.", "Alternate the two keys: C – Am – F – G and G – Em – C – D."),
  "lx.g20.t": "Play both progressions in a row without stopping the hand.",
  "lx.g20.easy": "Start with quarters, then move to the “figure eight”.",
  "lx.g20.fix": "Mixing up chords — read by numbers: “one, six, four, five”.",
  "ls.g37": "Song: “Oh! Susanna”",
  "lx.g37.g": ul("Metronome 80: C – C – G – G – C – C – G – C, one bar per chord, “figure eight”.", "Repeat the round three times and record yourself."),
  "lx.g37.t": "Play the whole song without stopping and listen to the recording.",
  "lx.g37.easy": "Play quarters, then the “figure eight”.",
  "lx.g37.fix": "The C → G change trips you — practise it separately with the metronome at 60.",
  "ls.g38": "Song: “Scarborough Fair”",
  "lx.g38.g": ul("Metronome 70: Am – G – Am – C – D – Am, one bar each, soft strum.", "Play the round twice: louder and quieter; listen to the recording."),
  "lx.g38.t": "Play the song softly, without stopping, and record it.",
  "lx.g38.easy": "Play quarters down, then the “figure eight”.",
  "lx.g38.fix": "The sound is too sharp — strum with the nail and fingertip, smaller swing.",
  "ls.g39": "Song: “House of the Rising Sun”",
  "lx.g39.g": ul("Metronome 60: Am – C – D – F – Am – C – E – E, one bar each.", "Play the round three times; note the roughest changes."),
  "lx.g39.t": "Play the whole song without stopping on F.",
  "lx.g39.easy": "Use the easy F (lesson 8) until the barre grows stronger.",
  "lx.g39.fix": "The D → F change is late — place the index on fret 1 in advance.",
  "ls.g28": "C major scale",
  "lx.g28.g": ul("Metronome 60: play C major up and down by the diagram, one note per beat.", "Name the degrees aloud; mark the semitones (3→4 and 7→8)."),
  "lx.g28.t": "Play the scale four times with no mistakes without looking at the diagram.",
  "lx.g28.easy": "Play two notes per beat, then one.",
  "lx.g28.fix": "The fingers get lost — fingers by fret: 0, 2, 3 on each string; prepare a finger before the next string.",
  "ls.g40": "G major scale and a song",
  "lx.g40.g": ul("Metronome 60: G major up and down by the diagram.", "The melody by degrees 1 1 5 5 6 6 5, first in C major, then in G major."),
  "lx.g40.t": "Play the melody from memory in two keys.",
  "lx.g40.easy": "First play the melody on a single string.",
  "lx.g40.fix": "F-sharp does not sound — check the finger is on fret 2 of string 1, not fret 1.",
  "ls.g41": "Major and minor side by side",
  "lx.g41.g": ul("Play the C major scale, then A minor; say how they differ in sound.", "Guess three “major or minor” pairs by ear (the test below)."),
  "lx.g41.t": "Explain in words how C major differs from C minor.",
  "lx.g41.easy": "Listen only to the first three notes — major or minor.",
  "lx.g41.fix": "No difference heard — play the chords C and Cm in a row and compare “bright — soft”.",
  "ls.g42": "Songs on scales",
  "lx.g42.g": ul("“Ode to Joy”: 3 3 4 5 5 4 3 2 1 1 2 3 3 2 2 in C major, metronome 70.", "The minor melody: 1 3 5 5 4 3 2 1 on the A minor scale."),
  "lx.g42.t": "Play “Ode to Joy” without peeking.",
  "lx.g42.easy": "Play two or three notes at a time, then join the phrases.",
  "lx.g42.fix": "Degrees get forgotten — write the numbers on the diagram and play by them.",
  "ls.g43": "What chords are made of",
  "lx.g43.g": ul("Listen to C and Cm: find the difference in the middle note.", "On the guitar play A and Am: show which finger “dropped” by a semitone."),
  "lx.g43.t": "Name the three notes of C and Am and explain how minor differs.",
  "lx.g43.easy": "Remember the rule: the middle note of major is a semitone higher.",
  "lx.g43.fix": "No difference heard — listen only to the middle note (E and E-flat).",
  "ls.g44": "Sus2 and sus4 chords",
  "lx.g44.g": ul("D – Dsus4 – D and A – Asus4 – A, one bar per chord.", "Dsus2 and Asus2: play and compare with sus4."),
  "lx.g44.t": "Play “Oh! Susanna” with sus4 at the end of each phrase.",
  "lx.g44.easy": "Start with A – Asus4 – A: only one finger changes.",
  "lx.g44.fix": "No “suspension” heard — play the major, then the sus, and compare by ear.",
  "ls.g45": "Sixteenth notes",
  "lx.g45.g": ul("Metronome 50: clap sixteenths counting “one-e-and-a”.", "Play one chord in sixteenths (down-up-down-up per beat)."),
  "lx.g45.t": "Play four bars of sixteenths without stopping.",
  "lx.g45.easy": "Start with eighths and gradually add the in-between strokes.",
  "lx.g45.fix": "The hand tenses — relax the wrist: the hand swings from the wrist, not the shoulder.",
  "ls.g46": "Barre: Bb and B",
  "lx.g46.g": ul("Bb: barre on fret 1, fingers 2, 3 and 4 on fret 3 of strings 4, 3 and 2.", "Slide the shape up a fret and play B."),
  "lx.g46.t": "Play the chain: Bb – B – C – Bb.",
  "lx.g46.easy": "Practise first only the barre and the shape, without changing.",
  "lx.g46.fix": "The sound is dull — move the barre closer to the fret and press firmly, but without the strength of the whole hand.",
  "ls.g47": "Scales: D minor and C minor",
  "lx.g47.g": ul("Metronome 60: D minor up and down by the diagram.", "C minor up and down; compare with A minor."),
  "lx.g47.t": "Play the melody 1 3 5 5 4 3 2 1 in D minor and C minor.",
  "lx.g47.easy": "Play two notes per beat, then one.",
  "lx.g47.fix": "Fretting fingers get mixed up — write out the frets of each scale and read them aloud.",
  "ls.g48": "Harmonic minor",
  "lx.g48.g": ul("Metronome 60: A harmonic minor up and down by the diagram.", "The progression E – Am: play the chords and then the scale."),
  "lx.g48.t": "Play both forms of A minor and say how they differ.",
  "lx.g48.easy": "First play only the last four notes of the scale.",
  "lx.g48.fix": "The interval G – G-sharp – A “sticks out” by ear — play it slowly several times.",
  "ls.g49": "Combining scales",
  "lx.g49.g": ul("Metronome 60: C major up, A minor down, chromatic up.", "Name aloud which scale is sounding, without looking at the diagram."),
  "lx.g49.t": "Play three scales in a row without looking at the diagram.",
  "lx.g49.easy": "Play two scales, then add the third.",
  "lx.g49.fix": "The order gets lost — write on paper: C major, A minor, chromatic — and go down the list.",
  "gp.nm.aria": "Guitar strings: numbers and notes; touch for sound",
  "gp.nm.str": "String {n}: {name}",
  "gp.nm.fret": "Frets are counted from the nut: the 1st fret is the one nearest the head.",
  "gp.nm.fing": "Left-hand fingers: 1 — index, 2 — middle, 3 — ring, 4 — little.",
  "gp.nm.hint": "Touch a string to hear its note.",
  "gp.bar.aria": "A bar divided into equal parts",
  "gp.bar.1": "Whole",
  "gp.bar.2": "Halves",
  "gp.bar.4": "Quarters",
  "gp.bar.8": "Eighths",
  "gp.bar.16": "Sixteenths",
  "gp.bar.1.d": "One sound for the whole bar: four beats.",
  "gp.bar.2.d": "Two sounds per bar: each lasts two beats.",
  "gp.bar.4.d": "Four sounds per bar: one per beat.",
  "gp.bar.8.d": "Eight sounds per bar: “one-and, two-and, three-and, four-and”.",
  "gp.bar.16.d": "Sixteen sounds per bar: “one-e-and-a, two-e-and-a…”.",
  "gp.strum.metro": "Metronome",
  "gp.all.maj": "Major",
  "gp.all.min": "Minor",
  "gp.all.all": "All",
  "gp.all.hint": "Touch a diagram to hear the chord.",
  "gp.all.seq": "Play in a row",
  "gp.fm.maj": "Major",
  "gp.fm.min": "Minor",
  "gp.fm.chrom": "Chromatic",
  "gp.fm.par": "Parallel",
  "gp.fm.t": "T",
  "gp.fm.s": "S",
  "gp.fm.hint.maj": "T — tone (two frets), S — semitone (one fret). Major: T T S T T T S.",
  "gp.fm.hint.min": "Minor from A — the same white notes, but the formula T S T T S T T.",
  "gp.fm.hint.chrom": "The chromatic scale is twelve sounds in a row, semitones only.",
  "gp.fm.hint.par": "The same notes, a different centre: C major and A minor.",
  "gp.tr.4": "major third (4 st.)",
  "gp.tr.3": "minor third (3 st.)",
  "gp.tr.maj": "Major triad",
  "gp.tr.maj.d": "A major third below, a minor third above: it sounds bright.",
  "gp.tr.min": "Minor triad",
  "gp.tr.min.d": "A minor third below, a major third above: it sounds soft and sad.",
  "gp.sc.dmin": "D minor",
  "gp.sc.cmin": "C minor",
  "gp.sc.aharm": "A harmonic",
  "gp.prog.cavg": "C Am F G",
  "gp.prog.gevd": "G Em C D",
  "gp.prog.amfc": "Am F C G",
  "gm.hint": "Drag a finger to rotate freely; two fingers zoom, move and twist; double-tap to take apart or put together.",
  "gp.g.body.a.n": "Body (“the drum”)",
  "gp.g.body.a.d": "The hollow wooden part. The top, together with the air inside, amplifies the strings, and the sound hole lets the sound out.",
  "gp.g.body.e.n": "Body (“the drum”)",
  "gp.g.body.e.d": "A wooden slab that carries everything else: pickups, volume and tone knobs, the pickguard. The pickups pick up the sound.",
  "gp.g.neck.n": "Neck",
  "gp.g.neck.d": "The long part where the fingers press the strings. It has the headstock at the top, the fingerboard and the frets; the closer to the body, the higher the sound.",
  "gp.g.pegs.n": "Tuning pegs",
  "gp.g.pegs.d": "They turn and tighten the strings: the pitch depends on the tension. Tuning is turning the pegs.",
  "gp.g.strings.n": "Strings",
  "gp.g.strings.d": "Six strings: the 1st is the thinnest and highest, the 6th the thickest and lowest. They sound E, B, G, D, A, E (1st to 6th).",
  "gp.g.bridge.a.n": "Bridge",
  "gp.g.bridge.a.d": "A plate on the top that anchors the ends of the strings. Through the saddle it passes the vibration to the top.",
  "gp.g.bridge.e.n": "Bridge",
  "gp.g.bridge.e.d": "A metal block with saddles that anchors the strings; screws set the length and height of each.",
};
export const TERMS = {};
export const CH = [
  { id: "g2", t: "Parts of the guitar", s: "Look before you play", src: '', h: `
<p>Before the first chord it helps to look closely at the guitar: every part has its own job, and these words will appear in every lesson. The model can be spun by finger and taken apart.</p>
{{lab:gmodel}}
<p><b>Strings</b> are numbered from thin to thick: the 1st is the thinnest and highest, the 6th the thickest and lowest. Their notes are E, B, G, D, A, E (from 1st to 6th).</p>
{{lab:gnames}}
<p><b>Frets</b> are the metal strips on the neck, counted from the nut, i.e. from the headstock: the fret nearest to the head is the 1st. <b>Fingers</b> of the left hand: 1 — index, 2 — middle, 3 — ring, 4 — little; the thumb stays behind the neck as support.</p>
${key(`Strings go from thin (1) to thick (6); frets from the nut (1, 2, 3…); left-hand fingers are 1, 2, 3, 4. The rest of the course relies on these numbers.`)}
${tip(`Touch each string in the diagram, listen and say its number and note aloud. Then find the nut, the 1st fret and the tuning pegs on the model.`)}
` },
  { id: "g1", t: "Posture", s: "Comfortable, no tension", src: '', h: `
<p>The main rule of posture is <b>comfort</b>. There must be no tension anywhere — shoulders, neck, wrists or legs. If something gets tired or starts to hurt, that is a signal to adjust the posture, not to endure it.</p>
{{lab:gpos}}
<p>On an acoustic or classical guitar, sit on a stable chair without armrests, back straight but relaxed. Put the left foot on a <b>footstool</b> (a low stool or a pile of books): the guitar rests on the left thigh and the neck points slightly up. An electric guitar is usually played with a <b>strap</b>, standing or sitting.</p>
<p>The right forearm lies on the body near the upper edge, the hand over the sound hole. The left hand holds the neck loosely: thumb behind, shoulder down, elbow not pressed to the body.</p>
${key(`The guitar is held by the body, thigh and forearm, not by the hand. If fingers or shoulders tire early, the posture is wrong.`)}
${tip(`Sit down, put the foot on the stool and lay the guitar down. Roll the shoulders, shake the hands out, take a deep breath — and check there is no tension anywhere.`)}
` },
  { id: "g32", t: "Pulse and bar", s: "One-two-three-four", src: '', h: `
<p>Music lives on a <b>pulse</b> — even beats, like steps. Hitting the pulse matters more than playing the right note. Turn on the metronome and simply clap along.</p>
{{lab:gbar}}
<p>Beats gather into groups of four: <b>one</b>-two-three-four. Such a group is a <b>bar</b>. The first beat is stronger than the rest: it carries the “weight”. Count aloud: “one, two, three, four” — both when playing and when listening.</p>
${key(`The pulse is even, like steps. A bar is a group of four beats; the first is the strongest.`)}
${tip(`Set the metronome to 60 and clap on every click, counting “one, two, three, four”. Then clap only on “one”.`)}
` },
  { id: "g5", t: "Chord diagram and the first three chords", s: "C, D and E", src: '', h: `
<p>Chords are written as a <b>diagram</b>: the neck turned upright. The thick 6th string is on the left, the thin 1st on the right, the thick top line is the nut.</p>
{{lab:gbox}}
<ul><li><b>A dot with a number</b> — where to put the finger; the number is the finger.</li><li><b>○ above a string</b> — play the open string.</li><li><b>× above a string</b> — do not play it: <b>not all strings are needed</b>.</li></ul>
<p>The first three chords: <b>C</b>, <b>D</b> and <b>E</b>. C and D keep the fingers close together; E is a “staircase”. All three sound bright and open — that is how <b>major</b> sounds.</p>
${key(`Read a diagram top to bottom: first which strings to play (○ and dots), then which finger goes where. Strings with “×” stay silent.`)}
${tip(`Pick a chord, press “Listen” and compare the sound with the diagram. Fret C and pluck each string separately — every one must ring clean.`)}
` },
  { id: "g7", t: "Chords G and A", s: "Two more major chords", src: '', h: `
<p><b>G</b> sounds wider: all six strings are played, two fingers near the thick strings and one by the thinnest. <b>A</b> is three fingers in a row on the 2nd fret; the 6th string is not played.</p>
{{lab:gboxg}}
<p>A chord name is a letter: C — do, D — re, E — mi, F — fa, G — sol, A — la, B — si. Reading the letter shows the “home” note of the chord.</p>
${key(`The letter is the chord’s main note: C is “do”, G is “sol”, A is “la”. For now only major.`)}
${tip(`Play C, then G — four beats each with the metronome at 60; then D and A.`)}
` },
  { id: "g23", t: "Chord F: the easy version", s: "Mini barre on two strings", src: '', h: `
<p>The full <b>F</b> chord is hard: the index finger presses all six strings. Start with the <b>easy</b> version: four thin strings are played and the index presses the two thinnest ones on the 1st fret — a <b>mini barre</b>.</p>
{{lab:gboxb}}
<p>The other fingers sit on fret 2 of string 3 and fret 3 of strings 4 and 5. The two thin strings on fret 1 are pressed by the index alone — flat, with the side of the finger.</p>
${key(`A barre is one finger pressing several strings at once. Start with two or three strings; the full barre comes later, in the minor block.`)}
${tip(`Fret the easy F, pluck every string and make sure both thin strings ring; then change C → F and back.`)}
` },
  { id: "g33", t: "All major chords on one screen", s: "The map and changes", src: '', h: `
<p>The six major chords are gathered on one map. Keep it in front of you and learn from it: find a chord, read the diagram, play it, check the sound.</p>
{{lab:gallmaj}}
<p>Press “Play in a row” and the chords sound one after another. Sing the names along: “C, D, E, G, A, F” — this way the hand shape is remembered together with the sound.</p>
${key(`The map is a working tool: open it, look at the diagram, play. Learn the changes from it rather than from memory.`)}
${tip(`Play all six in a row, four beats each, metronome 60. Note the hardest change and repeat it separately.`)}
` },
  { id: "g13", t: "Down strum and note lengths", s: "Quarter, half, whole", src: '', h: `
<p>The right hand plays the chord with a <b>down</b> strum on every beat. These are <b>quarter notes</b>: four strums per bar, tempo 60–70.</p>
{{lab:gstrum}}
<p>Sounds come in different lengths. A <b>quarter</b> is one beat. A <b>half</b> is two beats, twice as long. A <b>whole</b> is four beats: the sound lasts <b>a whole bar</b>. Choose “whole” and “half” in the bar diagram and hear the difference.</p>
{{lab:gbar}}
${key(`A whole note lasts a whole bar, a half note half a bar, a quarter a quarter of a bar. The metronome clicks on every quarter.`)}
${tip(`Metronome 70. Play chord C once per bar (whole), twice (halves), four times (quarters), counting aloud.`)}
` },
  { id: "g9", t: "The first song", s: "Chords and down strums", src: '', h: `
<p>Time for a first song. “When the Saints Go Marching In” — a folk spiritual — is played on three chords: C, G and D. Play four down strums per chord, metronome 60.</p>
{{lab:gprog}}
<p>The chord order: C – G – C – G – D – G – C. Before each change the fingers are already moving to the new chord while the old one still rings. An honest measure of growth is the number of clean changes per minute: write it down today and check in a week.</p>
${key(`Clean and slow beats fast and sloppy. Speed will come by itself.`)}
${tip(`Play the round C–G–C–G–D–G–C with the metronome at 60 and record yourself — listen for where the change is late.`)}
` },
  { id: "g10", t: "Minor: Am, Em and Dm", s: "The same step, but sadder", src: '', h: `
<p><b>Minor</b> is the “sad” brother of major: the same chord with a different middle — a softer, sadder sound. The name has the letter <b>m</b>: Am reads “A minor”.</p>
{{lab:gboxm}}
<p>Three minor chords: <b>Am</b> (like E, two frets lower), <b>Em</b> (just two fingers) and <b>Dm</b> (a relative of D). Hear how minor sounds next to major: A — Am, E — Em, D — Dm.</p>
${key(`Major is bright, minor is soft and sad. The difference is one note in the chord, but the ear hears it at once.`)}
${tip(`Go through the pairs: A — Am, E — Em, D — Dm. Close the eyes and guess whether major or minor is sounding.`)}
` },
  { id: "g24", t: "Full barre: F and Bm", s: "The index across all strings", src: '', h: `
<p>The <b>full barre</b> begins with minor: the index finger lies on its edge across the neck and presses all the strings at once. This is how <b>F</b> (barre on fret 1) and <b>Bm</b> (barre on fret 2) are played.</p>
{{lab:gboxf}}
{{lab:gboxbm}}
<p>A barre does not need the strength of the whole hand: the weight of the forearm is the lever and the finger lies closer to the fret wire. If it sounds dull — shift the finger and roll it slightly onto the edge.</p>
${key(`A barre is not strength but position: the finger on its edge, close to the fret, the elbow slightly out. At first the sound will be a bit dirty — that is normal.`)}
${tip(`Place the barre on fret 1 and pluck every string; find the dull ones and shift the finger. Then add the other fingers and play F.`)}
` },
  { id: "g34", t: "More minor: F#m, Fm and Bb", s: "Barre in other places", src: '', h: `
<p>The same barre shape moved along the neck gives new chords. <b>Fm</b> (“F minor”) is a barre on fret 1, <b>F#m</b> (“F-sharp minor”) the same on fret 2. <b>Bb</b> (“B-flat major”) is a barre on fret 1 in the “A” shape.</p>
{{lab:gall}}
<p>To learn such chords one shape is enough: moving it up the neck by a fret raises the chord by a semitone.</p>
${key(`The barre shape “travels” along the neck: the same pattern on the next fret is a chord a semitone higher.`)}
${tip(`Play Fm, slide the shape up a fret — F#m appears; hear the difference.`)}
` },
  { id: "g35", t: "Map of all chords", s: "Major and minor side by side", src: '', h: `
<p>Now six major and six minor chords are known. All are gathered on one map — major and minor side by side on one screen.</p>
{{lab:gall}}
<p>Press “Play in a row” and listen in order. Then go through the chords yourself: find the diagram, play, check the sound.</p>
${key(`Keep the map at hand: every chord of the course is here. Learn from it, not from memory.`)}
${tip(`Play the majors, then the minors, four beats per chord, metronome 60. Then alternate: C – Am – D – Bm.`)}
` },
  { id: "g36", t: "Eighth notes: splitting the beat", s: "One-and, two-and", src: '', h: `
<p>Each beat can be split in half: these are <b>eighth notes</b> — “one-and, two-and, three-and, four-and”. There are eight in a bar. Down strums fall on the numbers, up strums on the “and”.</p>
{{lab:gbar}}
<p>Choose the division “8” and listen: the metronome clicks on the numbers and the “and” sounds between them. Count aloud with the metronome.</p>
${key(`Division is just counting in smaller parts: a quarter splits into two eighths (“one-and”).`)}
${tip(`Metronome 60. Clap on every “and” and every number: one-and-two-and-three-and-four-and.`)}
` },
  { id: "g14", t: "The “figure eight” strum", s: "Down, down-up, up-down-up", src: '', h: `
<p>The best-known strumming pattern is the “<b>figure eight</b>”: down, down-up, up-down-up. It sits on eight counts and sounds even and “song-like”.</p>
{{lab:gstrumf}}
<p>The hand never stops: down-up swings like a pendulum, and on the skipped beats it simply does not touch the strings. First count aloud “one-and-two-and…” and strum on empty air.</p>
${key(`The hand swings evenly all the time; the pattern is only which swings touch the strings.`)}
${tip(`Metronome 70. One chord, the “figure eight” for four bars, then two chords, one bar each.`)}
` },
  { id: "g15", t: "Strumming with all chords", s: "Practice from the map", src: '', h: `
<p>Now the “figure eight” and all the chords work together. Take the map, pick four chords and play each for a bar without interrupting the pattern.</p>
{{lab:gstrume}}
<p>When changing chord, do not stop the hand: on the last “and” the fingers are already moving to the new chord. The pattern can be simplified — first play eighths down-up without gaps.</p>
${key(`A chord change lands on “one” of the new bar; meanwhile the hand keeps swinging without a stop.`)}
${tip(`Metronome 70. Play one bar each: Am – Em – Am – Dm; then C – G – Am – F.`)}
` },
  { id: "g19", t: "First harmony: C – Am – F – G", s: "The easiest, clearest progression", src: '', h: `
<p>The four chords <b>C – Am – F – G</b> make the best-known progression: hundreds of songs are built on it. Play one bar per chord with the “figure eight” or with quarters.</p>
{{lab:gprogc}}
<p>Chords can be called by <b>numbers</b>: C is the first degree (the tonic, “home”), Am the sixth, F the fourth, G the fifth. The progression reads “one — six — four — five”. The tonic sounds like rest, G like tension that wants to resolve.</p>
${key(`Chords in a key are numbered: I, vi, IV, V. The tonic (I) is “home”; V pulls back home.`)}
${tip(`Play C – Am – F – G one bar each, metronome 60, then stop on G and hear how it wants to return to C.`)}
` },
  { id: "g20", t: "The same harmony in another key", s: "G – Em – C – D", src: '', h: `
<p>Degrees can be “moved” to another key: <b>I – vi – IV – V</b> in the key of G is <b>G – Em – C – D</b>. The pattern sounds the same, only higher. This is how <b>key</b> works: a set of chords around one tonic.</p>
{{lab:gprogc}}
<p>Press “G – Em – C – D” in the diagram and compare with C – Am – F – G: same shape, different sounds. Play one bar per chord with the “figure eight”.</p>
${key(`A key is a home (the tonic) and the chords around it. The numbers stay, the letters change.`)}
${tip(`Play G – Em – C – D, then C – Am – F – G, and hear that the progression is “the same, but higher”.`)}
` },
  { id: "g37", t: "Song: “Oh! Susanna”", s: "Two chords and a cheerful strum", src: '', h: `
<p>“<b>Oh! Susanna</b>” by Stephen Foster (1848) is a song that long ago became folk. It is played on two chords: <b>C</b> and <b>G</b>. Tempo 80, “figure eight” strum.</p>
{{lab:gprog}}
<p>The chord order (one bar each): <b>C – C – G – G – C – C – G – C</b>. The melody is found by ear: the chords are the base, and a melody can be sung or played on the piano over them.</p>
${key(`A song is a round of chords and an even strum. The main thing is not to stop the hand on a change.`)}
${tip(`Play the round twice, then sing any familiar melody over the chords.`)}
` },
  { id: "g38", t: "Song: “Scarborough Fair”", s: "A minor folk melody", src: '', h: `
<p>“<b>Scarborough Fair</b>” is an old English folk song. It sounds minor and calm and sits well with arpeggio and a soft strum.</p>
{{lab:gprog}}
<p>The chord order: <b>Am – G – Am – C – D – Am</b> (one bar each). Tempo 70, a soft “figure eight” or an arpeggio. Strum down gently, not loud.</p>
${key(`Minor songs are played quieter and softer: volume is part of the pattern too.`)}
${tip(`Play the round Am – G – Am – C – D – Am, then repeat quieter — and hear how the mood changes.`)}
` },
  { id: "g39", t: "Song: “House of the Rising Sun”", s: "Minor, barre and E", src: '', h: `
<p>“<b>House of the Rising Sun</b>” is a folk ballad that gathers almost everything learned: minor, the F barre and major E. Tempo 60–70, arpeggio or a calm strum.</p>
{{lab:gprog}}
<p>The chord order: <b>Am – C – D – F – Am – C – E – E</b>. One chord per bar. This is where the F barre and the change Am → E come in handy.</p>
${key(`This is the first “grown-up” song of the course: all the chords are known — what is left is to join them without stopping.`)}
${tip(`Play the round slowly (metronome 60), then speed up to 70; record and listen.`)}
` },
  { id: "g28", t: "C major scale", s: "Notes in a row by a formula", src: '', h: `
<p>A <b>scale</b> is seven notes in a row upward from the “home” note. The major scale is built by a formula of <b>tones</b> (T) and <b>semitones</b> (S): <b>T – T – S – T – T – T – S</b>. A semitone is one fret, a tone is two frets.</p>
{{lab:gformmaj}}
<p>The C major scale on the guitar: open, with no sharps or flats. The notes are numbered — these are <b>degrees</b>: 1 (C), 2 (D), 3 (E) … 7 (B), then 1 (C) again higher.</p>
{{lab:gscc}}
${key(`The major scale is the formula “T T S T T T S”. It sounds bright and “finished”: it likes to stop on the first degree.`)}
${tip(`Play the scale up and down with the metronome at 60, naming degrees aloud: “one, two, three…”; hear how the last note pulls to the first.`)}
` },
  { id: "g40", t: "G major scale and a song", s: "The same formula, another note", src: '', h: `
<p>The formula <b>T – T – S – T – T – T – S</b> works from any note. From “G” you get <b>G major</b>: it has one sharp — F-sharp (one fret higher than F).</p>
{{lab:gscg}}
<p>Play the scale and compare it with C major: the sound is the same, only higher. Now play a melody by degrees: <b>1 – 1 – 5 – 5 – 6 – 6 – 5</b> (“Twinkle, twinkle”) — in G major.</p>
${key(`The formula moves to any note: the names of the sounds change while the “major” sound stays.`)}
${tip(`Play the melody 1 1 5 5 6 6 5 first in C major, then in G major, with the metronome at 60.`)}
` },
  { id: "g41", t: "Major and minor side by side", s: "Parallel and same-name", src: '', h: `
<p>Every major key has a “relative” minor. <b>Parallel</b> keys — C major and A minor: they have <b>the very same notes</b> but a different “main” note. <b>Same-name</b> keys — C major and C minor: one tonic, but the minor has a lowered third degree.</p>
{{lab:gformpar}}
<p>Play the C major and A minor scales in a row and hear the difference: the same notes, a different mood. Then compare C major and C minor by ear.</p>
${key(`Major and minor differ by the centre (parallel) or by the third degree (same-name). By ear — bright and sad.`)}
${tip(`Play C major and right after it A minor — and, eyes closed, guess which is which.`)}
` },
  { id: "g42", t: "Songs on scales", s: "Melodies by degrees", src: '', h: `
<p>A scale is not only an exercise: melodies are built by degrees. The first is “Ode to Joy” (Beethoven) in C major: <b>3 3 4 5 5 4 3 2 1 1 2 3 3 2 2</b>. The second is a minor melody in A minor: <b>1 3 5 5 4 3 2 1</b>.</p>
{{lab:gscmaj}}
<p>Play the melodies by the scale diagram: find the degree, place the finger, play. They can go with chords: the melody with one hand along the scale, the chords C, G, Am.</p>
${key(`A melody is a path along the degrees of the scale, up and down. Knowing the scale, any simple melody can be found.`)}
${tip(`Play “Ode to Joy” by degrees 3 3 4 5 5 4 3 2 1 1 2 3 3 2 2 in C major; then try it in G major.`)}
` },
  { id: "g43", t: "What chords are made of", s: "Why major is bright and minor is sad", src: '', h: `
<p>Any simple chord is a <b>triad</b>: three notes taken “every other one” from a scale: the 1st, 3rd and 5th. In C that is C – E – G.</p>
{{lab:gtriad}}
<p>The distance from the 1st note to the 3rd is called a <b>third</b>. In major it is <b>major</b> — four semitones (two frets), in minor <b>minor</b> — three semitones. That single semitone is enough to turn a bright sound into a sad one.</p>
${key(`Major: 1 – major third – 3 – minor third – 5. Minor: 1 – minor third – 3 – major third – 5. Only the middle differs.`)}
${tip(`Press “Listen” for C and Cm, then for A and Am; play the same pair on the guitar: what changes in the finger shape?`)}
` },
  { id: "g44", t: "Sus2 and sus4 chords", s: "Neither major nor minor", src: '', h: `
<p>In <b>sus</b> chords the third degree is replaced by a neighbouring note and the chord stops being major or minor: it sounds “suspended”. <b>sus2</b> replaces the third with the second degree, <b>sus4</b> with the fourth.</p>
{{lab:gtriad}}
<p>On the guitar sus chords come from moving one finger: for D — Dsus2 (fingers removed) and Dsus4 (the little finger added), for A — Asus2 and Asus4. Play them in a progression: D – Dsus4 – D.</p>
${key(`A sus chord is “neither major nor minor”. It is like a question: it sounds tense and wants to resolve into an ordinary chord.`)}
${tip(`Play D – Dsus4 – D and A – Asus4 – A, and hear the tension and resolution.`)}
` },
  { id: "g45", t: "Sixteenth notes", s: "Dividing into 16", src: '', h: `
<p>A beat can be divided not only into two but into <b>four</b>: these are <b>sixteenth notes</b> — “one-e-and-a, two-e-and-a…”. There are sixteen in a bar.</p>
{{lab:gbar}}
<p>Choose the division “16” and listen: the metronome clicks on the numbers, four sounds fall on each beat. The hand swings twice as fast as with eighths: play slowly at first, metronome 50–60.</p>
${key(`Bar divisions: 1 (whole), 2 (halves), 4 (quarters), 8 (eighths), 16 (sixteenths). Each next one is twice as fast.`)}
${tip(`Metronome 50. Clap sixteenths, counting “one-e-and-a, two-e-and-a…”; then play one chord in sixteenths.`)}
` },
  { id: "g46", t: "Barre: Bb and B", s: "The “A” shape along the neck", src: '', h: `
<p>The “A” chord shape (three fingers in a row) with a <b>barre</b> gives chords on any fret. <b>Bb</b> (“B-flat major”) is a barre on fret 1, <b>B</b> (“B major”) on fret 2.</p>
{{lab:gall}}
<p>The barre is held by the index across all strings, the other three fingers make the “A” shape two frets further. The shape can be moved: each fret up is a chord a semitone higher.</p>
${key(`A barre shape is “movable”: one shape gives 12 chords. That is how guitarists remember hundreds of chords.`)}
${tip(`Play Bb, slide the shape up a fret — B appears; hear that the sound rose by a semitone.`)}
` },
  { id: "g47", t: "Scales: D minor and C minor", s: "Minor in other keys", src: '', h: `
<p>The formula of natural minor — <b>T – S – T – T – S – T – T</b> — works from any note. From “D” you get <b>D minor</b>, from “C” — <b>C minor</b>.</p>
{{lab:gscmin2}}
<p>Play both scales and compare with A minor: the same formula and character, but different notes. Play the melody <b>1 3 5 5 4 3 2 1</b> in each scale.</p>
${key(`The formula “T S T T S T T” is minor from any note. The pitch changes, the “sad” character stays.`)}
${tip(`Play D minor up and down with the metronome at 60, then C minor; name the degrees aloud.`)}
` },
  { id: "g48", t: "Harmonic minor", s: "Minor with a raised seventh", src: '', h: `
<p>In <b>harmonic minor</b> the seventh degree is raised by a semitone: you get a pull toward the tonic and an “oriental” colour. The formula from “A”: <b>T S T T S 1½ S</b>, where 1½ is one and a half tones (three frets).</p>
{{lab:gscharm}}
<p>Play natural and harmonic A minor in a row: only one note differs — G and G-sharp. It is because of it that the E chord in A minor sounds major: E – Am is the strongest progression in minor.</p>
${key(`Harmonic minor is minor with a raised seventh. The seventh pulls upward to the tonic.`)}
${tip(`Play natural and harmonic Am, then the progression E – Am; hear the “pull”.`)}
` },
  { id: "g49", t: "Combining scales", s: "Major, minor and chromatic together", src: '', h: `
<p>All the scales learned can be put together: major, minor and chromatic. The chromatic scale contains <b>all</b> twelve sounds; major and minor use seven of them.</p>
{{lab:gformall}}
<p>Try “crossover” playing: C major up, then A minor down — the same notes, but the centre has moved. Finish with the chromatic scale — semitone after semitone.</p>
${key(`Major, minor and chromatic are different “selections” of the same twelve sounds.`)}
${tip(`Play C major up, A minor down, then the chromatic scale; name in turn what has been sounding.`)}
` },
];
