// Book (en): "Guitar from scratch" — classical guitar, 9 short lessons (author 25.11.2026: classical; major chords first, minor later).
const tip = (t) => '<aside class="btip"><b>Try it</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Remember</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'ls.teacherLock': 'The teacher will open this lesson',
  'bk.part9': 'Guitar from scratch',
  'lp.guitar.kicker': 'Classical guitar', 'lp.guitar.title': 'Guitar from scratch', 'lp.guitar.sub': '31 lessons: posture, parts, tuning, chords, strumming, arpeggios, barre, progressions, scales',
  'lp.guitar.lead': 'For classical guitar (nylon strings). First how to sit and what the guitar is made of, then tuning and reading chord diagrams, then major and minor chords, seventh chords, strumming, arpeggios, barre, chord progressions and scales.',
  'ls.g1': 'Posture', 'ls.g2': 'Parts of the guitar', 'ls.g3': 'Tuning', 'ls.g4': 'Pain-free hands', 'ls.g5': 'Reading a chord diagram',
  'ls.g6': 'Chord C', 'ls.g7': 'Chord G', 'ls.g8': 'Chord D', 'ls.g9': 'Chord changes and a first song',

  'lx.g1.g': ul('Sit on the front half of the chair, back straight, shoulders down.', 'Put the left foot on a footstool (or a pile of books) and rest the guitar on the left thigh.', 'Point the neck up at an angle and hold the body to the chest with the right forearm.'),
  'lx.g1.t': 'Take a photo from the side (or use a mirror) and compare with the picture: back, footstool, thigh.',
  'lx.g1.easy': 'Three supports hold the guitar: thigh, chest and right forearm. The left hand does not hold it — it only places fingers.',
  'lx.g1.fix': ul('The guitar slides — the footstool is too low or the neck points too steeply up.', 'Back or neck hurts — do not reach for the neck with the head: bring the neck to you.'),
  'lx.g2.g': ul('Find all nine parts on your guitar and say them aloud.', 'Pluck each of the six strings and see which peg it goes to.'),
  'lx.g2.t': 'Tap the numbers on the picture and read what each part is for.',
  'lx.g2.easy': 'A guitar is a body that amplifies sound, a neck where pitch is chosen, and strings that sound.',
  'lx.g2.fix': 'Cannot tell which string is which? The thickest (6th) is closest to your face with the guitar on the knee; the thinnest (1st) is closest to the floor.',
  'lx.g3.g': ul('Open the tuner and pluck the 6th string. Needle left — too low, right — too high.', 'Turn the peg slowly, bringing the string up to pitch from below.', 'Tune all six strings, then check them again in a circle.'),
  'lx.g3.t': 'No guitar nearby? Play the tuning on the on-screen piano and sing each note.',
  'lx.g3.easy': 'Tuning means bringing each string to the right pitch. Guitar tuning: E, A, D, G, B, E (thick to thin).',
  'lx.g3.fix': ul('New nylon strings drift for the first days — tune before every practice, this is normal.', 'A string will not hold — check that it is wound well on the peg.'),
  'lx.g4.g': ul('Left hand: thumb behind the neck, fingertips on the strings right next to the fret (not in the middle between frets).', 'Right hand: thumb (p) plays the bass strings, index (i), middle (m) and ring (a) the thin ones.', 'Play the open 1st string in quarter notes at 60, alternating i and m.'),
  'lx.g4.t': 'Tap even quarter notes on the screen to the metronome.',
  'lx.g4.easy': 'Right-hand fingers have letters: p thumb, i index, m middle, a ring. Left-hand fingers have numbers: 1 index, 2 middle, 3 ring, 4 little.',
  'lx.g4.fix': ul('Fingertips hurt — normal for 2–3 weeks; practice 10–15 minutes and rest.', 'A string buzzes — the finger is far from the fret; move it next to the metal bar.', 'Left nails short, right nails slightly past the fingertip.'),
  'lx.g5.g': ul('Pick a chord on the diagram and read every string: "×", "○" or fret and finger.', 'Press "Listen" and compare the sound to the name.'),
  'lx.g5.t': 'Pick three chords and say aloud which frets the fingers are on.',
  'lx.g5.easy': 'The diagram is the neck turned upright: the thick string is on the left. A dot shows where to put a finger; the number in the dot says which finger.',
  'lx.g5.fix': 'Not sure which fret? The thick top line is the nut; below it the first box is fret 1, the second is fret 2, and so on.',
  'lx.g6.g': ul('Fingers: 1 on fret 1 of string 2, 2 on fret 2 of string 4, 3 on fret 3 of string 5.', 'Play the five thin strings (5th to 1st), skip the 6th.', 'Pluck each string alone and check that it rings clearly.'),
  'lx.g6.t': 'Learn the hand shape: three fingers like stairs.',
  'lx.g6.easy': 'Chord C is a three-finger staircase: finger 1 is nearest the floor, finger 3 is at the thickest string.',
  'lx.g6.fix': ul('One string is dead — a finger touches its neighbour; set the finger steeper, on the tip.', 'The hand cramps — relax the shoulder and do not squeeze with the thumb.'),
  'lx.g7.g': ul('Fingers: 2 on fret 3 of string 6, 1 on fret 2 of string 5, 3 on fret 3 of string 1.', 'Play all six strings.', 'Pluck them one by one and check that all ring clearly.'),
  'lx.g7.t': 'Listen to the chord on the diagram and repeat the fingers in the air.',
  'lx.g7.easy': 'G has two fingers by the thick strings and one by the thinnest — the hand is spread wide.',
  'lx.g7.fix': ul('Cannot reach the 1st string — bring the hand closer, the neck a little farther.', 'The thin string is dead — finger 3 lies flat; set it on the tip.'),
  'lx.g8.g': ul('Fingers: 1 on fret 2 of string 3, 3 on fret 3 of string 2, 2 on fret 2 of string 1.', 'Play the four thin strings (4th to 1st), skip the 5th and 6th.', 'The three fingers form a triangle next to each other.'),
  'lx.g8.t': 'Learn the shape: a triangle of three fingers in one box of the neck.',
  'lx.g8.easy': 'D is the most compact of the three: all fingers are close and only four thin strings are played.',
  'lx.g8.fix': ul('The 5th string rings — do not play it: start from the 4th.', 'Fingers crowd each other — set them steeper, on the tips.'),
  'lx.g9.g': ul('Change C → G → C → G → D → G → C at 60: four beats per chord, change in the gap.', 'Count clean changes in one minute and write the number down. Compare in a week.', 'Play "When the Saints" with these chords.'),
  'lx.g9.t': 'Listen to your recording and find where the change drags.',
  'lx.g9.easy': 'A change is not speed but preparation: the fingers go to the new chord while the old one still rings.',
  'lx.g9.fix': ul('Cannot keep up — slow down: metronome 50, change on "four".', 'Fingers search for the frets — look at the diagram and see the whole shape before the change.'),

  'gm.aria': '3D guitar model: drag to rotate', 'gm.nogl': 'The 3D model could not be shown: no WebGL. Part names are listed below.',
  'gm.explode': 'Explode', 'gm.assemble': 'Assemble', 'gm.view': 'View', 'gm.parts': 'Parts', 'gm.pick': 'Tap a part to read what it is', 'gm.hint': 'Drag to rotate, pinch to zoom, double-tap to explode or assemble.',
  'gm.types': 'Guitar type', 'gm.t.classic': 'Classical', 'gm.t.acoustic': 'Acoustic', 'gm.t.electric': 'Electric', 'gp.top.n': 'Top (soundboard)', 'gp.top.d': 'A thin spruce plate with a hole. It vibrates with the strings and radiates most of the sound.', 'gp.braces.n': 'Braces', 'gp.braces.d': 'Wooden ribs under the top (X-shaped and cross braces). They hold the string tension and shape the tone.', 'gp.sides.n': 'Sides and back', 'gp.sides.d': 'The side walls and the back plate. They close the body, reflect the sound and give it depth.', 'gp.pickguard.n': 'Pickguard', 'gp.pickguard.d': 'A plate on the body. On an acoustic it protects the top from the pick and nails; on an electric it covers the electronics.', 'gp.rod.n': 'Truss rod', 'gp.rod.d': 'A steel rod inside the neck. It adjusts the neck bow to the string tension; its cover sits on the headstock.', 'gp.pickups.n': 'Pickups', 'gp.pickups.d': 'Magnet coils under the strings. The vibration of a steel string becomes an electric signal and goes to the amplifier.', 'gp.controls.n': 'Controls', 'gp.controls.d': 'Volume and tone knobs, the pickup switch and the cable jack.', 'gp.body.e.n': 'Solid body', 'gp.body.e.d': 'A solid wooden slab with no hollow. The pickups make the sound; the wood affects sustain and tone.', 'gp.bridge.e.n': 'Bridge', 'gp.bridge.e.d': 'A metal block with saddles that anchors the strings. Screws set the length and height of each string.', 'gp.bridge.a.n': 'Bridge', 'gp.bridge.a.d': 'A plate on the top that holds the strings with pegs. The bone saddle passes the vibration to the top.', 'gp.strings.s.n': 'Strings', 'gp.strings.s.d': 'Six steel strings: three thick wound and three thin plain. Same tuning — E, A, D, G, B, E.',
  'gp.parts.aria': 'Guitar from the front: tap a number to see the part', 'gp.parts.hint': 'Tap a number to read what it is and why it matters.',
  'gp.pegs.n': 'Tuning pegs', 'gp.pegs.d': 'They turn and tighten the strings: tension sets the pitch. Tuning is turning the pegs.',
  'gp.head.n': 'Headstock', 'gp.head.d': 'The top end of the neck with the pegs. Strings run over it to the pegs.',
  'gp.nut.n': 'Nut', 'gp.nut.d': 'A bar at the start of the neck with slots for the strings. Frets are counted from it.',
  'gp.neck.n': 'Neck', 'gp.neck.d': 'The long part where fingers press the strings. The closer to the body, the higher the sound.',
  'gp.fret.n': 'Frets', 'gp.fret.d': 'Metal bars across the neck. A string pressed at a fret sounds a half step higher than the previous one.',
  'gp.strings.n': 'Strings', 'gp.strings.d': 'Six strings: three thick bass strings (6, 5, 4) and three thin (3, 2, 1). Tuning: E, A, D, G, B, E.',
  'gp.hole.n': 'Sound hole', 'gp.hole.d': 'The round opening in the body: the air inside amplifies the sound. The right hand plays above it.',
  'gp.body.n': 'Body', 'gp.body.d': 'The hollow wooden part. It amplifies the strings and makes the sound loud and warm.',
  'gp.bridge.n': 'Bridge', 'gp.bridge.d': 'The bar on the body where the strings are fixed. It passes vibrations to the top.',
  'gp.pos.aria': 'Classical guitar posture: side view', 'gp.pos.1': 'Back straight, shoulders down.', 'gp.pos.2': 'Left foot on the footstool.', 'gp.pos.3': 'Guitar on the left thigh, neck up.',
  'gp.box.aria': 'Chord diagram {n}', 'gp.box.mute': 'do not play', 'gp.box.open': 'open string', 'gp.box.fret': 'fret {f}, finger {p}', 'gp.box.hear': 'Listen',
  // strumming and minor (25.11.2026)
  'ls.g10': 'Minor: chord Am',
  'ls.g11': 'Chord Em',
  'ls.g12': 'Chord Dm',
  'ls.g13': 'Down strum',
  'ls.g14': 'Down-up strum',
  'ls.g15': 'A song with strumming',
  'lx.g10.g': '<ul><li>Fingers: 2 on fret 2 of string 4, 3 on fret 2 of string 3, 1 on fret 1 of string 2.</li><li>Play five strings (5th to 1st), skip the 6th.</li><li>Listen to Am and A (major): minor sounds softer and sadder.</li></ul>',
  'lx.g10.t': 'Listen to major and minor in turn and say which is sadder.',
  'lx.g10.easy': 'Minor is the sad brother of major. The difference is one finger: in Am it sits on fret 1 of string 2.',
  'lx.g10.fix': '<ul><li>Fingers 2 and 3 get mixed up — place them in order: 1 first, then 2 and 3.</li><li>The thin string is dead — finger 1 lies flat; set it on the tip.</li></ul>',
  'lx.g11.g': '<ul><li>Fingers: 2 on fret 2 of string 5, 3 on fret 2 of string 4.</li><li>Play all six strings — the rest are open.</li><li>Change Am → Em: fingers 2 and 3 slide one string down, as a whole.</li></ul>',
  'lx.g11.t': 'Learn the shape: two fingers side by side on the second fret.',
  'lx.g11.easy': 'Em is the easiest chord: just two fingers and all strings sound.',
  'lx.g11.fix': '<ul><li>Some strings buzz — fingers touch neighbours; set them steeper.</li><li>The hand is tense — the chord is easy, press more lightly.</li></ul>',
  'lx.g12.g': '<ul><li>Fingers: 1 on fret 1 of string 1, 3 on fret 3 of string 2, 2 on fret 2 of string 3.</li><li>Play the four thin strings (4th to 1st).</li><li>Compare with D: the triangle is placed differently.</li></ul>',
  'lx.g12.t': 'Listen to D and Dm one after another.',
  'lx.g12.easy': 'Dm is the same position as D, but the finger on fret 1 of the thinnest string makes it sad.',
  'lx.g12.fix': '<ul><li>The 5th string rings — do not play it.</li><li>Fingers get in each other\'s way — set them on the tips and steeper.</li></ul>',
  'lx.g13.g': '<ul><li>Right hand: loose wrist, the arm swings from the wrist as if shaking off water.</li><li>Down stroke: thumb or index passes over the strings from thick to thin.</li><li>One stroke per beat at 70, on chord Am.</li></ul>',
  'lx.g13.t': 'Tap four strokes in a row on the screen to the metronome.',
  'lx.g13.easy': 'Strumming is even strokes over all strings. Even matters more than loud.',
  'lx.g13.fix': '<ul><li>The hand is tight and tires — relax the shoulder and play from the wrist, not the elbow.</li><li>You miss the strings — watch where the hand passes and keep it over the sound hole.</li></ul>',
  'lx.g14.g': '<ul><li>Count "one-and two-and three-and four-and": on the number — down, on "and" — up.</li><li>The hand swings without stopping — even when it does not hit the strings, it moves in the air.</li><li>All eighths: ↓↑↓↑↓↑↓↑ at 70, then the "folk" pattern ↓ ·↓↑ ·↑↓↑.</li></ul>',
  'lx.g14.t': 'Tap eighths on the screen — down-up without stops.',
  'lx.g14.easy': 'Down on the beat, up between beats. The hand always swings; up strokes can be softer and only on the thin strings.',
  'lx.g14.fix': '<ul><li>The count slips — first only count aloud "one-and two-and" and swing the hand without strings.</li><li>The up stroke is too loud — play it only on thin strings and half as strong.</li></ul>',
  'lx.g15.g': '<ul><li>Play Am – Em – Am – Dm – Am – Em – Am – Am with the "folk" strum at 70.</li><li>Change the chord on the last beat of the bar; the hand does not stop.</li><li>Record yourself and listen: is the strum even?</li></ul>',
  'lx.g15.t': 'Listen to the recording and compare with the start of the course.',
  'lx.g15.easy': 'A song is chords plus strumming. If the change breaks the strum — slow down and change the chord without stopping the hand.',
  'lx.g15.fix': '<ul><li>The strum stops on the change — keep the hand swinging even if the chord is not ready.</li><li>Too fast — metronome 55, then raise it.</li></ul>',
  'gp.strum.q': '↓ even',
  'gp.strum.e': '↓↑ all',
  'gp.strum.f': 'folk',
  'gp.strum.aria': 'Strum pattern for eight beats',
  'gp.strum.hint': '↓ down, ↑ up, · the hand moves in the air. "Listen" plays two bars.',
  // остальные аккорды и связки (25.11.2026)
  'ls.g16': 'Chord A',
  'ls.g17': 'Chord E',
  'ls.g18': 'Seventh chords',
  'ls.g19': 'Chord progressions',
  'ls.g20': 'Songs from progressions',
  'lx.g16.g': '<ul><li>Fingers: 1, 2 and 3 side by side on fret 2 of strings 4, 3 and 2.</li><li>Play five strings (5th to 1st), skip the 6th.</li><li>Change D → A: three fingers move to the neighbouring strings.</li></ul>',
  'lx.g16.t': 'Learn the shape: three fingers in a row on one fret.',
  'lx.g16.easy': 'A is three fingers in a row on the second fret. It is tight — set the fingers steeper, on the tips.',
  'lx.g16.fix': '<ul><li>The fingers do not fit — set them slightly slanted, curving the hand more.</li><li>The thin string is dead — finger 3 touches it from below; lift it.</li></ul>',
  'lx.g17.g': '<ul><li>Fingers: 2 on fret 2 of string 5, 3 on fret 2 of string 4, 1 on fret 1 of string 3.</li><li>Play all six strings.</li><li>Compare with Em: one finger is added on string 3.</li></ul>',
  'lx.g17.t': 'Listen to Em and E in a row — hear how the mood changes.',
  'lx.g17.easy': 'E is Em and one finger: it makes the chord bright, major.',
  'lx.g17.fix': '<ul><li>The third string is dead — the finger presses flat; use the tip.</li><li>It buzzes — press closer to the metal fret bar.</li></ul>',
  'lx.g18.g': '<ul><li>A seventh chord is a major chord with an added bitterness: it is tense and wants to move on.</li><li>E7: like E but with one finger lifted — all six strings sound.</li><li>Play E → E7 → A → A7: hear how the 7 pulls towards the next chord.</li></ul>',
  'lx.g18.t': 'Listen to E and E7, then D and D7.',
  'lx.g18.easy': 'The 7 in the name (E7, A7) adds tension. Such a chord is rarely last: a calm one follows.',
  'lx.g18.fix': '<ul><li>E7 sounds like E — did you lift a finger? In E7 there is no finger on string 3.</li><li>D7 is tight — set the fingertips and count from string 3.</li></ul>',
  'lx.g19.g': '<ul><li>A progression is several chords in a row. The most common is I–IV–V: the 1st, 4th and 5th degrees of the key.</li><li>In G it is G–C–D, in D — D–G–A, in A — A–D–E, in E — E–A–B7.</li><li>Play each at 60, four beats per chord.</li></ul>',
  'lx.g19.t': 'Say aloud which chords are in the progression and sing their first notes.',
  'lx.g19.easy': 'Degrees are the ordinal numbers of chords in a key. I is home, IV a step aside, V "come back home".',
  'lx.g19.fix': '<ul><li>The progressions get mixed up — learn one key a day.</li><li>Cannot keep up with the change — slow down: metronome 50, change in the gap.</li></ul>',
  'lx.g20.g': '<ul><li>Play G–D–Em–C (the "pop" progression I–V–vi–IV) with strumming at 70.</li><li>Play Am–Dm–E–Am (a minor progression).</li><li>Record yourself and listen.</li></ul>',
  'lx.g20.t': 'Listen to the recording and compare with the start of the course.',
  'lx.g20.easy': 'The G–D–Em–C progression is in hundreds of songs. Learn it and you can play a lot of familiar music.',
  'lx.g20.fix': '<ul><li>The strum stops on the change — keep the hand moving.</li><li>Em is hard — it is the same shape as Am, moved one string.</li></ul>',
  'gp.prog.g': 'in G',
  'gp.prog.d': 'in D',
  'gp.prog.a': 'in A',
  'gp.prog.e': 'in E',
  'gp.prog.pop': 'pop',
  'gp.prog.min': 'minor',
  'gp.prog.hint': 'Degrees: {r}. "Listen" plays the progression, one chord per two beats.',
  // арпеджио, барре, септаккорды на минор (25.11.2026)
  'ls.g21': 'Arpeggios',
  'ls.g22': 'Arpeggios on progressions',
  'ls.g23': 'Small barre',
  'ls.g24': 'Chord F (barre)',
  'ls.g25': 'Chord Bm (barre)',
  'ls.g26': 'Am7, Em7, Dm7',
  'ls.g27': 'Cmaj7 and seventh-chord progressions',
  'lx.g21.g': '<ul><li>The left hand sets Am; the right hand waits over the strings: p over the bass string (for Am it is the 5th), i over the 3rd, m over the 2nd, a over the 1st.</li><li>Each finger pulls its string up and slightly in, one after another: p i m a — four notes, one per beat at 60.</li><li>Then six notes (p i m a m i) and eight (p i m i a i m i).</li></ul>',
  'lx.g21.t': 'Listen to each pattern and picture the fingers moving across the strings.',
  'lx.g21.easy': 'An arpeggio is a chord played one note at a time. Each right-hand finger has its own string: p is bass, i m a are the three thin strings.',
  'lx.g21.fix': '<ul><li>The fingers get in each other\'s way — keep the hand calm, fingers i m a slightly curved.</li><li>Notes of uneven loudness — pull all fingers the same way, without jerks.</li></ul>',
  'lx.g22.g': '<ul><li>Play Am – C – G – Em – Am with the pattern p i m a m i at 60: one bar per chord.</li><li>Change the chord on the last beat of the bar; the right hand does not stop.</li><li>Record yourself and listen: is the picking even?</li></ul>',
  'lx.g22.t': 'Listen to the recording and compare with strumming: how does it sound different?',
  'lx.g22.easy': 'The same progression sounds different: strummed — energetic, as arpeggios — soft and singing.',
  'lx.g22.fix': '<ul><li>The picking slips on the change — slow down: metronome 50, the right hand keeps playing while the left finds the chord.</li><li>The bass string changes with the chord — look at the diagram for the new chord\'s bass.</li></ul>',
  'lx.g23.g': '<ul><li>Lay the index finger on fret 1 of the two thinnest strings (1st and 2nd) and press them with the side of the finger, close to the nail.</li><li>The other fingers: 2 on fret 2 of string 3, 3 on fret 3 of string 4. Play the four thin strings.</li><li>Check each string separately: do all four ring?</li></ul>',
  'lx.g23.t': 'Learn the shape: a finger flat across two strings and two fingers like stairs beside it.',
  'lx.g23.easy': 'A barre is when one finger presses several strings at one fret. The small barre is only two strings, a step before the full one.',
  'lx.g23.fix': '<ul><li>Dead strings — press right next to the fret (not in the middle between frets) and with the side of the finger.</li><li>The finger hurts — normal; hold the chord briefly, rest, repeat a little on different days.</li></ul>',
  'lx.g24.g': '<ul><li>Lay the index across all six strings at fret 1; the other fingers as in an Em chord shifted one fret: finger 3 on fret 3 of string 5, finger 4 on fret 3 of string 4, finger 2 on fret 2 of string 3.</li><li>Play all six strings.</li><li>Go through the strings one by one and find a dead one: move the finger until it rings.</li></ul>',
  'lx.g24.t': 'Listen to F and Em in a row — the same shape, shifted along the neck.',
  'lx.g24.easy': 'F is the familiar Em shifted one fret up, plus a barre with the index finger.',
  'lx.g24.fix': '<ul><li>The 3rd or 2nd string is dead — the barre does not press fully; turn the index slightly onto its edge, close to the nail.</li><li>The hand tires — relax the shoulder and do not squeeze the neck with the thumb behind it.</li></ul>',
  'lx.g25.g': '<ul><li>Lay the index on fret 2 of five strings (5th to 1st); the other fingers as in an Am chord shifted two frets: finger 3 on fret 4 of string 4, finger 4 on fret 4 of string 3, finger 2 on fret 3 of string 2.</li><li>Play five strings (5th to 1st), skip the 6th.</li><li>Check each string separately.</li></ul>',
  'lx.g25.t': 'Listen to Am and Bm in a row — the same shape moved two frets.',
  'lx.g25.easy': 'Barre chords are familiar shapes moved along the neck: the Em shape gives F, the Am shape gives Bm.',
  'lx.g25.fix': '<ul><li>Not all strings ring — set the index closer to the fret and turn it slightly.</li><li>Holding the breath — hold the chord briefly and release between repeats.</li></ul>',
  'lx.g26.g': '<ul><li>Am7: like Am but without finger 3; Em7: like Em but without finger 3; Dm7: the index presses fret 1 of the two thin strings, finger 2 on fret 2 of string 3.</li><li>Play Am7 – Em7 – Dm7, four beats each at 60.</li><li>Listen to how a minor seventh is softer than a plain minor.</li></ul>',
  'lx.g26.t': 'Compare Am and Am7, Em and Em7 by ear.',
  'lx.g26.easy': 'A minor seventh chord is a minor with an added soft seventh. A familiar shape with one finger removed.',
  'lx.g26.fix': '<ul><li>Extra bass strings ring — do not play the 6th on Am7 and Dm7.</li><li>Dm7: the index must press both thin strings at fret 1.</li></ul>',
  'lx.g27.g': '<ul><li>Cmaj7: like C but without finger 1 — the 3rd and 2nd strings ring open.</li><li>Play the progression Dm7 – G7 – Cmaj7 ("ii–V–I"), then Am7 – Dm7 – G7 – Cmaj7, two bars per chord at 60.</li><li>Play strummed or arpeggiated and record yourself.</li></ul>',
  'lx.g27.t': 'Listen to how G7 "wants" to go to Cmaj7: tension and rest.',
  'lx.g27.easy': 'Dm7 – G7 – Cmaj7: a step aside, tension and rest. This progression is in songs, ballads and jazz.',
  'lx.g27.fix': '<ul><li>Cannot keep up with the changes — slow down: metronome 50, one chord per bar.</li><li>Cmaj7 sounds like C — check that finger 1 is off and the 2nd string is open.</li></ul>',
  'gp.lbl.F3': 'F (small)',
  'gp.arp.p4': 'p i m a',
  'gp.arp.p6': 'p i m a m i',
  'gp.arp.p8': 'p i m i a i m i',
  'gp.arp.aria': 'Arpeggio pattern: right-hand fingers on the strings',
  'gp.arp.hint': 'Rows are strings (6 thick, 1 thin), circles are right-hand fingers by beat. "Listen" plays two rounds at 80 beats per minute.',
  'gp.prog.ii': 'ii–V–I',
  'gp.prog.vi': 'vi–ii–V–I',
  'gp.prog.bal': 'I–vi–ii–V',
  // гаммы (25.11.2026)
  'ls.g28': 'Scales: C major and G major',
  'ls.g29': 'Scale: A minor',
  'ls.g30': 'Pentatonic',
  'ls.g31': 'Chromatic scale',
  'lx.g28.g': '<ul><li>Play C major in first position up and down: 8 notes, one per beat at 60. Fingers follow the frets: finger 1 on fret 1, 2 on fret 2, 3 on fret 3; an open string takes no finger.</li><li>Say the notes aloud: C, D, E, F, G, A, B, C.</li><li>Then G major — the same formula, but the seventh note is F♯.</li></ul>',
  'lx.g28.t': 'Sing the scale with the guitar: each sound on its own note.',
  'lx.g28.easy': 'A major scale is eight notes going up by the formula "whole, whole, half, whole, whole, whole, half". From any note this formula gives that note\'s major scale.',
  'lx.g28.fix': '<ul><li>The sound cuts off — do not lift the finger until the next note.</li><li>The count slips — play slowly first (metronome 50) and evenly, then speed up.</li></ul>',
  'lx.g29.g': '<ul><li>Play A minor in first position: the same white notes as C major, but from A — up to the next A.</li><li>One note per beat at 60, up and down.</li><li>Listen to how it is sadder than C major.</li></ul>',
  'lx.g29.t': 'Sing C major and A minor in a row and hear the difference in mood.',
  'lx.g29.easy': 'A natural minor is the notes of C major, but starting from A. Formula: "whole, half, whole, whole, half, whole, whole". A minor and C major are "relatives".',
  'lx.g29.fix': '<ul><li>Cannot hear it is "minor" — after the scale play chord Am, then the scale again.</li><li>Fingers get mixed up — keep them over the frets in advance: 0–2–3 on a string.</li></ul>',
  'lx.g30.g': '<ul><li>Play the A minor pentatonic in the 5th–8th fret position: two notes on each string — index (1) at fret 5, ring (3) at fret 7 or little (4) at fret 8.</li><li>Up and down, one note per beat, metronome 60.</li><li>Then play the notes in any order over chord Am: there are no wrong notes here.</li></ul>',
  'lx.g30.t': 'Play any short melody from these five notes and remember it.',
  'lx.g30.easy': 'A pentatonic is a scale of five notes. It has no "sharp" degrees, so it sounds good in any order. Melodies and solos are built on it.',
  'lx.g30.fix': '<ul><li>The hand is far — it is a high position: move the whole hand to the 5th fret, thumb behind the neck.</li><li>It buzzes — press right next to the fret, on the fingertip.</li></ul>',
  'lx.g31.g': '<ul><li>Play the chromatic scale from E (6th string): every fret in turn — open string, then frets 1, 2, 3, 4, and so on across the strings up to E an octave higher.</li><li>The rule "one finger — one fret": finger 1 on fret 1, 2 on fret 2, 3 on fret 3, 4 on fret 4.</li><li>Metronome 60, one note per beat, up and down.</li></ul>',
  'lx.g31.t': 'Say all 12 sounds of the octave aloud: C, C♯, D, D♯, E, F, F♯, G, G♯, A, A♯, B.',
  'lx.g31.easy': 'The chromatic scale is all the sounds in a row, each a half step higher than the last. On the guitar it is simply fret after fret.',
  'lx.g31.fix': '<ul><li>Fingers tire — pause after each string and shake the hand out.</li><li>The sound dies — set the fingers on the tips and do not touch the neighbouring strings.</li></ul>',
  'gp.sc.cmaj': 'C major',
  'gp.sc.gmaj': 'G major',
  'gp.sc.amin': 'A minor',
  'gp.sc.apent': 'A minor: pentatonic',
  'gp.sc.chrom': 'Chromatic (from E)',
  'gp.sc.aria': 'Scale on the neck: numbers are the order of notes, a circle left of the nut is an open string',
  'gp.sc.notes': 'Notes',
  'gp.sc.steps': 'Steps (½ half step, 1 whole step)',
  'gp.sc.hint': 'The numbers in the circles are the order of the notes; the outlined circle is the main note (tonic). "Listen" plays up and down.',
};
export const TERMS = {};
export const CH = [
  { id: 'g1', t: 'Posture', s: 'Three supports: foot, thigh, chest', src: '', h: `
<p>A classical guitar has its own posture: the body holds it, not the hand, so the left hand is free and only places fingers.</p>
{{lab:gpos}}
<p>The left foot goes on a footstool (a low bench or a pile of books) and the guitar rests on the left thigh. The neck points slightly up and the body is lightly held to the chest by the right forearm.</p>
<p>The right hand rests at the top edge of the body: wrist over the sound hole, fingers pulling the strings up and in. Shoulders down, back straight but not stiff.</p>
${key('The thigh, chest and right forearm hold the guitar. If an arm tires, something needs fixing — do not just endure it.')}
${tip('Sit, put the foot on the footstool and rest the guitar: check that it does not slide and you do not hold it by hand.')}
` },
  { id: 'g2', t: 'Parts of the guitar', s: 'Nine parts and what they are for', src: '', h: `
<p>Only nine parts matter — they are used in every lesson. Tap a number on the picture: the name and a short note appear.</p>
{{lab:gmodel}}
<p>Sound is born like this: a string vibrates, the bridge passes the vibration to the body, the body and the air inside amplify it, and the sound leaves through the sound hole.</p>
${key('Pegs change tension, frets choose pitch, the body amplifies.')}
` },
  { id: 'g3', t: 'Tuning', s: 'E, A, D, G, B, E', src: '', h: `
<p>Tune the guitar before every practice — it takes a minute, but without it any chord sounds off.</p>
<p>Classical guitar tuning, from the thickest (6th) to the thinnest (1st): <b>E, A, D, G, B, E</b>.</p>
<p>A tuner helps: it listens to the string and shows with a needle whether it is above or below. Turn the peg slowly and bring the string to pitch from below.</p>
${key('Tune upward: if the sound is too high, loosen below the pitch and tighten again.')}
${tip('Pluck the 6th string and tune it with the tuner; then the others in order.')}
` },
  { id: 'g4', t: 'Pain-free hands', s: 'Placing fingers without hurting the fingertips', src: '', h: `
<p>For the first weeks the left fingertips hurt — it is normal while the skin hardens. To avoid making it worse, practice 10–15 minutes and rest.</p>
<p>Left hand: thumb behind the neck, fingertips on the strings next to the fret. Fingers are numbers: 1 index, 2 middle, 3 ring, 4 little.</p>
<p>Right hand: fingers are letters — <b>p</b> thumb, <b>i</b> index, <b>m</b> middle, <b>a</b> ring. p plays the bass strings, i, m and a the thin ones.</p>
${key('Nothing should hurt badly. If it is pain, not just unfamiliar — stop and rest.')}
${tip('Play the open 1st string in quarter notes at 60, alternating i and m.')}
` },
  { id: 'g5', t: 'Reading a chord diagram', s: 'Understand once, then it reads itself', src: '', h: `
<p>Chords are written as a diagram: the neck turned upright. The thick 6th string is on the left, the thin 1st on the right.</p>
{{lab:gbox}}
<ul>
<li><b>The thick top line</b> is the nut; frets follow below it.</li>
<li><b>A dot with a number</b> shows where to put a finger; the number says which finger.</li>
<li><b>○ above a string</b> — play the open string.</li>
<li><b>× above a string</b> — do not play this string.</li>
</ul>
${key('Read top to bottom and left to right: first which strings to play, then where the fingers go.')}
${tip('Pick a chord, press "Listen" and compare the sound with the diagram.')}
` },
  { id: 'g6', t: 'Chord C', s: 'The first major chord', src: '', h: `
<p>Chord C is the most recognisable. Three fingers stand like stairs: 1 on fret 1, 2 on fret 2, 3 on fret 3.</p>
{{lab:gbox}}
<p>Play the five thin strings, 5th to 1st; do not touch the 6th (there is "×" above it).</p>
${key('Put all fingers down together, on the tips, not flat — otherwise the neighbouring string goes dead.')}
${tip('Set the chord, pluck each string alone and check that all ring clearly.')}
` },
  { id: 'g7', t: 'Chord G', s: 'The second major chord', src: '', h: `
<p>Chord G sounds wider: all six strings are played. Two fingers by the thick strings and one by the thinnest.</p>
{{lab:gboxg}}
<p>From C to G the hand spreads: the fingers go up and sideways. It is the most common change in songs.</p>
${key('A change is not speed but a planned move: the fingers go to the new chord while the old one still rings.')}
${tip('Play C, then G — four beats each at 60.')}
` },
  { id: 'g8', t: 'Chord D', s: 'The third major chord', src: '', h: `
<p>Chord D is the most compact of the three: three fingers side by side, only the four thin strings (4th to 1st) are played.</p>
{{lab:gboxd}}
<p>C, G and D are the base of a huge number of songs: with them and clean changes you can already play a simple accompaniment.</p>
${key('Major only for now. Minor chords (Am, Em, Dm) come next, once major is clean and without stops.')}
${tip('Set D, play the four thin strings and check that the 5th and 6th are silent.')}
` },
  { id: 'g9', t: 'Chord changes and a first song', s: 'C, G and D together', src: '', h: `
<p>Now the three chords need to be changed. Four beats per chord at 60; on the last beat of the bar the fingers are already going to the next one.</p>
<p>The honest measure of growth is the number of clean changes in a minute. Write it down today, check in a week.</p>
<p>"When the Saints Go Marching In" needs only three chords — C, G and D. Try it slowly first, then faster.</p>
${key('Clean and slow beats fast and sloppy. Speed comes on its own.')}
${tip('Play C–G–C–G–D–G–C around at 60 and record yourself.')}
` },
  { id: 'g10', t: 'Minor: chord Am', s: 'The same frets, but sadder', src: '', h: `
<p>Minor is the sad brother of major. The chord name has an <b>m</b>: Am reads "A minor". Now that major works, minor can be added.</p>
{{lab:gboxm}}
<p>Chord Am looks like E, two frets lower. Three fingers: 1 on fret 1 of string 2, 2 and 3 on fret 2 of strings 4 and 3.</p>
${key('Major is bright, minor is soft and sad. The difference is one finger.')}
${tip('Listen to Am and A (major): play five strings, do not touch the 6th.')}
` },
  { id: 'g11', t: 'Chord Em', s: 'The easiest chord', src: '', h: `
<p>Em ("E minor") is the simplest: two fingers side by side on the second fret, and all six strings sound.</p>
{{lab:gboxem}}
<p>The change Am → Em is the easiest in the course: two fingers move one string down and the shape stays the same.</p>
${key('The change is a slide: the hand keeps the shape and moves as a whole.')}
${tip('Play Am, then Em — four beats each at 60.')}
` },
  { id: 'g12', t: 'Chord Dm', s: 'A relative of D', src: '', h: `
<p>Dm ("D minor") is set like D, but finger 1 sits on fret 1 of the thinnest string. Four thin strings are played, as in D.</p>
{{lab:gboxdm}}
<p>Six chords are known now: C, G, D, Am, Em, Dm. That is already enough for many simple songs.</p>
${key('D and Dm differ by one finger — hear the difference.')}
${tip('Play Dm, then D — listen to how the sound changes.')}
` },
  { id: 'g13', t: 'Down strum', s: 'The first right-hand pattern', src: '', h: `
<p>Strumming is even strokes of the right hand over all strings. Start simple: one down stroke per beat.</p>
{{lab:gstrum}}
<p>The hand swings from the wrist as if shaking off water. The thumb or index passes over the strings from thick to thin.</p>
${key('Strumming is steady rhythm, not force. Even and soft beats loud and ragged.')}
${tip('Pick a chord, press "Listen" and play along — one stroke per beat.')}
` },
  { id: 'g14', t: 'Down-up strum', s: 'Eighths and the "folk" pattern', src: '', h: `
<p>Now add the upward motion. Count "one-and two-and three-and four-and": on the number — down, on "and" — up.</p>
{{lab:gstrume}}
<p>The hand swings without stopping: down on the beat, up between beats. Sometimes a stroke is skipped, but the hand still moves in the air — that makes a lively pattern.</p>
${key('The hand never stops: a skipped stroke is a swing that misses the strings.')}
${tip('First eighths ↓↑↓↑↓↑↓↑ with no skips, then the "folk" pattern.')}
` },
  { id: 'g15', t: 'A song with strumming', s: 'Chords and strumming together', src: '', h: `
<p>Put it all together: chords and strumming. Play Am – Em – Am – Dm – Am – Em – Am – Am with the "folk" strum to the metronome.</p>
{{lab:gstrumf}}
<p>Change on the last beat of the bar; the hand does not stop. If the strum slips — slow down and keep the hand moving.</p>
${key('When the hand stops, the strum breaks. Better to play an incomplete chord than to stop the hand.')}
${tip('Record yourself on this sequence and listen the next day.')}
` },
  { id: 'g16', t: 'Chord A', s: 'Three fingers in a row', src: '', h: `
<p>Chord A is set with three fingers in a row on the second fret: strings 4, 3 and 2. Play five strings, 5th to 1st.</p>
{{lab:gboxa}}
<p>It is a tight shape: the fingers stand side by side, and each must not touch the neighbouring strings.</p>
${key('Fingertips and slightly slanted, otherwise the thin string goes dead.')}
${tip('Set A, pluck five strings one by one and check that all ring.')}
` },
  { id: 'g17', t: 'Chord E', s: 'Em plus one finger', src: '', h: `
<p>Chord E is Em with one more finger: finger 1 goes on fret 1 of string 3. Play all six strings.</p>
{{lab:gboxe}}
<p>From Em to E: fingers 2 and 3 stay, finger 1 is added. One finger makes the chord bright.</p>
${key('E and Em are the same shape — the difference is one finger.')}
${tip('Play Em, then E — hear how the mood changes.')}
` },
  { id: 'g18', t: 'Seventh chords', s: 'E7, A7, D7, G7, C7, B7', src: '', h: `
<p>A seventh chord is a major chord with an added bitterness. The name has a 7. It sounds tense and wants to move on to the next chord.</p>
{{lab:gboxs}}
<p>These six are open chords — no barre. E7, A7 and D7 are the most common; they are built from familiar shapes: E7 is E with one finger lifted, A7 is A with one lifted.</p>
${key('A seventh is not a new world, just a familiar chord with one finger changed.')}
${tip('Listen to E and E7, then A and A7.')}
` },
  { id: 'g19', t: 'Chord progressions', s: 'I–IV–V and the "pop" progression', src: '', h: `
<p>A progression is several chords in a row. The most common is <b>I–IV–V</b>: the 1st, 4th and 5th degrees of the key.</p><p>Each key has its own set: in G it is G–C–D, in D — D–G–A, in A — A–D–E, in E — E–A–B7.</p>
{{lab:gprog}}
<p>Another common one is the "pop" progression I–V–vi–IV: in G it is G–D–Em–C. A minor progression is Am–Dm–E–Am. Press the buttons below, look at the diagrams and listen.</p>
${key('I is home, IV a step aside, V "come back home". Thousands of songs are built this way.')}
${tip('Play each progression at 60: four beats per chord.')}
` },
  { id: 'g20', t: 'Songs from progressions', s: 'Chords and strumming together', src: '', h: `
<p>Now many songs are in reach: any song on G–D–Em–C, A–D–E or Am–Dm–E will do. Pick a favourite and find its progression.</p>
{{lab:gprogp}}
<p>Strum at 70: change on the last beat of the bar, the hand does not stop.</p>
${key('One progression, one strum, until the change is clean. Then the next.')}
${tip('Pick a progression, strum two rounds and record yourself.')}
` },
  { id: 'g21', t: 'Arpeggios', s: 'The notes of a chord one at a time', src: '', h: `
<p>An arpeggio is the notes of a chord played one after another, as if the chord "opened up". The right hand plays: each finger has its own string.</p><p><b>p</b> (thumb) plays the bass string of the chord, <b>i</b> (index) the 3rd, <b>m</b> (middle) the 2nd, <b>a</b> (ring) the 1st.</p>
{{lab:garp}}
<p>The fingers wait over the strings and pull up and slightly in. First four notes "p i m a" evenly, like four steps; then six and eight.</p>
${key('Picking rests on even notes: equal loudness and a steady count matter more than speed.')}
${tip('Set Am and play "p i m a" at 60 — one note per beat.')}
` },
  { id: 'g22', t: 'Arpeggios on progressions', s: 'The same chords, softer', src: '', h: `
<p>Now arpeggios on familiar chords: Am, C, G, Em. The pattern "p i m a m i" gives six notes per chord, evenly to the metronome.</p>
{{lab:garp6}}
<p>Change the chord on the last beat of the bar; the right hand does not stop. The bass string changes with the chord, so p plays a different string each time.</p>
${key('The left hand prepares the new chord while the right still plays the old one.')}
${tip('Play Am – C – G – Em – Am with "p i m a m i" and record yourself.')}
` },
  { id: 'g23', t: 'Small barre', s: 'One finger on several strings', src: '', h: `
<p>A barre is when one finger (usually the index) presses several strings at one fret. It is the hardest step for a beginner, so we go in stairs. The first is a small barre on the two thinnest strings.</p>
{{lab:gboxb}}
<p>Chord F on four strings ("F (small)" in the diagram): the index lies on fret 1 of strings 1 and 2, finger 2 on fret 2 of string 3, finger 3 on fret 3 of string 4.</p>
${key('Press with the side of the index finger, close to the nail, and right next to the fret — not with the middle of the pad.')}
${tip('Lay the index on the two thin strings and pluck them: both must ring.')}
` },
  { id: 'g24', t: 'Chord F (barre)', s: 'A full barre on the first fret', src: '', h: `
<p>The full chord F: the index lies across all six strings at fret 1. The other three fingers are as in an Em chord, one fret higher.</p>
{{lab:gboxf}}
<p>It is a familiar shape moved along the neck plus a barre. If it does not work at first, play "F (small)" and come back to the full one in a few days.</p>
${key('F is Em moved one fret up with an index-finger barre.')}
${tip('Set F, pluck the six strings one by one and find a dead one — move the finger.')}
` },
  { id: 'g25', t: 'Chord Bm (barre)', s: 'A barre on the second fret', src: '', h: `
<p>Bm ("B minor"): the index finger on fret 2 of five strings (5th to 1st). The other three fingers are as in an Am chord, two frets higher.</p>
{{lab:gboxbm}}
<p>The 6th string is not played: there is an "×" above it in the diagram.</p>
${key('Barre chords are familiar shapes moved along the neck: the Em shape gives F, the Am shape gives Bm.')}
${tip('Play Am, then Bm — hear the same shape on different frets.')}
` },
  { id: 'g26', t: 'Am7, Em7, Dm7', s: 'Minor seventh chords', src: '', h: `
<p>A minor seventh chord is a minor chord with an added soft seventh. It sounds warmer and calmer than a plain minor.</p>
{{lab:gboxm7}}
<p>The shapes are familiar, each with one finger changed: Am7 is Am without finger 3, Em7 is Em without finger 3, Dm7 is Dm with an index barre on the two thin strings.</p>
${key('One finger\'s move, a different mood.')}
${tip('Play Am, then Am7 — hear the difference.')}
` },
  { id: 'g27', t: 'Cmaj7 and seventh-chord progressions', s: 'Tension and rest', src: '', h: `
<p>Cmaj7 is C with the index finger lifted: the 2nd and 3rd strings ring open. The sound is soft and airy.</p>
{{lab:gprogj}}
<p>The best-known progression with sevenths is <b>ii–V–I</b>: Dm7 – G7 – Cmaj7. G7 creates tension, Cmaj7 resolves it — rest. This progression is in songs, ballads and jazz.</p>
${key('Dm7 – G7 – Cmaj7: a step aside, tension, and back home.')}
${tip('Play Dm7 – G7 – Cmaj7 strummed or arpeggiated at 60 and record yourself.')}
` },
  { id: 'g28', t: 'Scales: C major and G major', s: 'Notes in a row by a formula', src: '', h: `
<p>A scale is notes in a row going up from the main note (the tonic) to the same note an octave higher. A major scale sounds "bright". It is built by a formula of whole and half steps: <b>1 – 1 – ½ – 1 – 1 – 1 – ½</b>.</p>
{{lab:gscmaj}}
<p>C major in first position has no sharps or flats: eight notes, fingers 0–1–2–3 on the frets. G major uses the same formula from G; because of it the seventh note becomes F♯.</p>
${key('The formula "whole, whole, half, whole, whole, whole, half" from any note gives that note\'s major scale.')}
${tip('Play C major up and down at 60, one note per beat, saying the notes aloud.')}
` },
  { id: 'g29', t: 'Scale: A minor', s: 'The same notes, a different centre', src: '', h: `
<p>A natural minor is the notes of C major, but from A. Formula: <b>1 – ½ – 1 – 1 – ½ – 1 – 1</b>. It sounds softer and sadder than major.</p>
{{lab:gscmin}}
<p>A minor and C major are "related" scales: they have the same notes. The difference is which note is the main one, the tonic.</p>
${key('A minor scale is not new notes, but a new centre: the tonic is A.')}
${tip('After the scale play chord Am and the scale again: hear how they fit each other.')}
` },
  { id: 'g30', t: 'Pentatonic', s: 'Five notes for every occasion', src: '', h: `
<p>A pentatonic is a scale of five notes. It has no "sharp" degrees, so it sounds good in any order; melodies and solos are built on it. A minor pentatonic: <b>A, C, D, E, G</b>.</p>
{{lab:gscpent}}
<p>On the guitar it is played in a position on frets 5–8: two notes on each string. Fingers: 1 at fret 5, 3 at fret 7, 4 at fret 8.</p>
${key('Five notes that do not go wrong: play them in any order over chord Am.')}
${tip('Make up a short melody from these five notes and play it to the metronome.')}
` },
  { id: 'g31', t: 'Chromatic scale', s: 'All twelve sounds in a row', src: '', h: `
<p>The chromatic scale is all the sounds in a row, each a half step above the last (formula "½ – ½ – ½ …"). On the guitar it is simply fret after fret.</p>
{{lab:gscchrom}}
<p>It is also the best exercise for the fingers: <b>one finger — one fret</b>. First finger on fret 1, second on fret 2, third on fret 3, fourth on fret 4; then the next string.</p>
${key('An octave has twelve sounds; every other scale is a choice among them by a formula.')}
${tip('Play the chromatic scale up and down at 60 and say the notes aloud.')}
` },
];
