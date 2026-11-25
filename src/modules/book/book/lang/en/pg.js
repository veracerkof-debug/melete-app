// Book (en): "Guitar from scratch" — classical guitar, 9 short lessons (author 25.11.2026: classical; major chords first, minor later).
const tip = (t) => '<aside class="btip"><b>Try it</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Remember</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'bk.part9': 'Guitar from scratch',
  'lp.guitar.kicker': 'Classical guitar', 'lp.guitar.title': 'Guitar from scratch', 'lp.guitar.sub': '9 lessons: posture, parts, tuning, first major chords',
  'lp.guitar.lead': 'For classical guitar (nylon strings). First how to sit and what the guitar is made of, then tuning and reading chord diagrams, then three major chords and changing between them. Minor chords come next, once major is clean.',
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
{{lab:gparts}}
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
];
