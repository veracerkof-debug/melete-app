// Textbook (en): "First steps" — the beginner's book (author's decision 31.10.2026). Plain words, short sentences, every
// new word explained in place, no term links; one chapter is one 10–15 minute lesson. No teacher is nearby, so every
// lesson has "Easier" (the same in other words) and "If it doesn't work" (common mistakes). The exercises are our own.
const tip = (t) => '<aside class="btip"><b>Try it</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Remember</b>' + t + '</aside>';
const ul = (...xs) => '<ul>' + xs.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

export const S = {
  'bk.lvl': 'Level', 'bk.lvl.beginner': 'Beginner', 'bk.lvl.amateur': 'Intermediate', 'bk.lvl.advanced': 'Advanced', 'bk.lvl.pro': 'Pro',
  'bk.lvlMore': 'Open: the lesson for the "{l}" level',
  'bk.lead.first': 'Music from the very start: plain words, one step at a time, straight on the instrument. No knowledge needed.',
  'bk.part8': 'First steps', 'bk.sec.first': 'First steps', 'bk.sub.first': 'For starting from zero.',
  'lp.first.kicker': 'From zero', 'lp.first.title': 'First steps', 'lp.first.sub': '24 short lessons: from the first sound to a song of one\'s own',
  'lp.first.lead': 'A lesson takes 10–15 minutes. Every step can be heard, repeated and checked: the app listens to the playing and gives hints. When something does not work, the bottom of the lesson has "Easier" and "If it doesn\'t work".',
  'lx.easy': 'Easier', 'lx.fix': 'If it doesn\'t work',

  'ls.f1': 'Music is made of sounds', 'ls.f2': 'Meeting the instrument', 'ls.f3': 'How to sit and hold the hands', 'ls.f4': 'Tuning',
  'ls.f5': 'Note names', 'ls.f6': 'Where the notes live', 'ls.f7': 'The beat: the steps of music', 'ls.f8': 'Long and short sounds',
  'ls.f9': 'The first tune', 'ls.f10': 'Counting to four', 'ls.f11': 'Quick notes', 'ls.f12': 'Silence is music too',
  'ls.f13': 'A whole song', 'ls.f14': 'What a chord is', 'ls.f15': 'The first chords', 'ls.f16': 'Changing chords',
  'ls.f17': 'Playing along with a song', 'ls.f18': 'Happy and sad', 'ls.f19': 'A ladder of notes', 'ls.f20': 'Black keys: sharp and flat',
  'ls.f21': 'Waltz: counting to three', 'ls.f22': 'Notes on paper', 'ls.f23': 'Blues: first playing of one\'s own', 'ls.f24': 'One\'s own song, and what comes next',

  // 1
  'lx.f1.p': ul('The lowest white key (far left), then the highest (far right). The left one sounds low, the right one high.', 'One key played softly (barely touching it), then louder.', 'A key pressed and let go at once: the sound is short. Pressed and held: the sound is long.'),
  'lx.f1.g': ul('The thickest string plucked, then the thinnest. The thick one sounds low, the thin one high.', 'One string plucked softly, then louder.', 'A string plucked and stopped at once with the palm: the sound is short. Plucked and left alone: the sound is long.'),
  'lx.f1.b': ul('The thickest string plucked, then the thinnest. The thick one sounds low, the thin one higher.', 'Soft, then louder.', 'Short (stopped at once with the palm) and long (left alone).'),
  'lx.f1.t': 'The same on the phone, in the "Piano" tool: low on the left, high on the right.',
  'lx.f1.easy': 'A sound can be high (like a bird\'s chirp) or low (like a ship\'s horn), long or short, soft or loud. Any music is made of sounds like these.',
  'lx.f1.fix': ul('The check does not hear the sound: the phone should be closer to the instrument, and the playing louder.', 'A digital piano makes no sound: worth checking the volume and the headphones.'),
  // 2
  'lx.f2.p': ul('The white keys go in a row. The black ones come in groups: twos and threes. The task: to find all the groups of two black keys.', 'Three neighbouring keys in a row: white, black, white. These are three different sounds.', 'The pedal under the foot (the right one) makes the sound longer. Not needed yet.'),
  'lx.f2.g': ul('The neck is the long part. The metal strips on it are frets. There are six strings: the thickest is at the top (closest to the face).', 'The body is the big hollow part. The sound comes out of the round hole.', 'All six strings plucked one by one, from top to bottom.'),
  'lx.f2.b': ul('A bass has four thick strings and a long neck with frets (metal strips).', 'The bass sounds low. It is the base the whole band stands on.', 'All four strings plucked one by one, from top to bottom.'),
  'lx.f2.t': 'On the screen piano: finding the groups of two and three black keys.',
  'lx.f2.easy': 'Every instrument has a place where the sound is born (a key or a string) and a place where the height of the sound is chosen (which key, which fret).',
  'lx.f2.fix': 'Hard to tell the strings apart? On a guitar and a bass, the thickest string is the one closest to the face when the instrument is held.',
  // 3
  'lx.f3.p': ul('The chair is high enough for the elbows to be a little above the keys. Sitting on the front half of the chair, back straight.', 'The hand is rounded, as if holding an apple. The fingers stand on their pads (the soft tips), not on the nails.', 'The fingers have numbers: thumb 1, index 2, middle 3, ring 4, little finger 5.'),
  'lx.f3.g': ul('Sitting straight, the guitar resting on the right leg, the neck pointing a little upwards.', 'The left hand holds the neck: the thumb behind, the other fingers on the strings from above.', 'The right hand rests on the body and plucks the strings over the hole (with the fingers or with a pick, a small plastic plate).'),
  'lx.f3.b': ul('Sitting straight, or standing with a strap; the neck points a little upwards.', 'Left hand: the thumb behind the neck, one finger for each fret.', 'Right hand: the index and middle fingers pluck the string in turn, as if walking.'),
  'lx.f3.t': 'A photo of oneself at the instrument (or a look in the mirror): back straight, shoulders loose.',
  'lx.f3.easy': 'The main thing: nothing should be tense. If a shoulder goes up or the hand gets tired, the hands go down, get a shake, and then it starts again.',
  'lx.f3.fix': ul('The wrist hurts: the hand is bent too much; it should be held straighter.', 'Sore fingertips on the strings in the first weeks are normal. It passes after 2–3 weeks of short practice.'),
  // 4
  'lx.f4.p': 'A piano does not need tuning by its owner: a digital one is always in tune, and an acoustic one is tuned by a technician once every six months to a year. A quick check: A (la) in the middle of the keyboard, compared with the tuner.',
  'lx.f4.g': ul('With the tuner open: the thickest string plucked, eyes on the needle. It should stop in the middle, on the letter E.', 'Needle too far left: the tuning peg (the knob at the end of the neck) is turned to pull the string tighter. Too far right: to loosen it.', 'The same for all six strings: E A D G B E.'),
  'lx.f4.b': ul('With the tuner open: the thickest string plucked. The needle should stop on E.', 'Left: tighter with the peg. Right: looser.', 'The same for all four strings: E A D G.'),
  'lx.f4.t': 'With the tuner open, any note sung: the tuner shows which one it is.',
  'lx.f4.easy': 'To tune means to make every string sound exactly the right sound. An out-of-tune instrument sounds "crooked" even when the playing is right.',
  'lx.f4.fix': ul('The needle jumps: one pluck, then a short wait.', 'Small turns only: a string can snap if pulled too tight.', 'The tuner does not hear: the phone should be closer.'),
  // 5
  'lx.f5.p': ul('Finding C (do): the white key just left of a group of two black keys. C, D, E (do, re, mi): three white keys in a row.', 'C, D, E (do, re, mi) played while saying the names out loud.'),
  'lx.f5.g': ul('C (do): string 5 (A, second from the top), fret 3. D (re): string 4 (D), no finger. E (mi): string 4, fret 2.', 'C, D, E (do, re, mi) played while saying the names out loud.'),
  'lx.f5.b': ul('C (do): the A string (second thickest), fret 3. D (re): the D string (third), no finger. E (mi): the D string, fret 2.', 'C, D, E (do, re, mi) played while saying the names out loud.'),
  'lx.f5.t': 'The "Note on the staff" drill below: for now just a look at what notes there are.',
  'lx.f5.easy': 'There are only seven notes: C, D, E, F, G, A, B (do, re, mi, fa, sol, la, ti). Then they repeat in a circle, higher and lower. Many countries use the letters; others use the syllables do, re, mi.',
  'lx.f5.fix': 'The names get mixed up: "C-D-E-F-G-A-B" (or "do-re-mi-fa-sol-la-ti") sung a few times, like a counting rhyme.',
  // 6
  'lx.f6.p': ul('Right hand: the thumb on C (do), the other fingers on D, E, F, G (re, mi, fa, sol). Each finger on its own key.', 'C-D-E-F-G and back, slowly.'),
  'lx.f6.g': ul('String 1 (E, the thinnest): open is E (mi), fret 1 is F (fa), fret 3 is G (sol).', 'E-F-G and back; the finger goes just behind the metal strip of the fret.'),
  'lx.f6.b': ul('The thickest string (E): open is E (mi), fret 1 is F (fa), fret 3 is G (sol).', 'E-F-G and back.'),
  'lx.f6.t': 'On the screen piano: finding all the Cs (there are several). They sound alike, only higher or lower.',
  'lx.f6.easy': 'On a piano, the height of a note is which key. On a guitar and a bass, it is which string and which fret. The further right (or the closer to the body), the higher.',
  'lx.f6.fix': ul('The sound buzzes: the string needs pressing harder and closer to the fret.', 'The check does not count it: one note at a time, waiting until it lights up.'),
  // 7
  'lx.f7.p': 'The metronome at 60, and C (do) pressed on every click: evenly, like steps.',
  'lx.f7.g': 'The metronome at 60, and an open string (no finger) plucked on every click.',
  'lx.f7.b': 'The metronome at 60, and the open thickest string plucked on every click, fingers taking turns.',
  'lx.f7.t': 'Tapping the button below along with the clicks.',
  'lx.f7.easy': 'Music has even steps called the beat, like a heartbeat or footsteps when walking. A metronome is a little machine that clicks these steps.',
  'lx.f7.fix': ul('Losing the beat: first just clapping along with the clicks, then playing.', 'Late or rushing: listening to the click, not to the fingers.'),
  // 8
  'lx.f8.p': 'C (do) long (held for 2 clicks), long again, then four short ones (one per click).',
  'lx.f8.g': 'An open string: held for 2 clicks, 2 more, then four plucks, one per click.',
  'lx.f8.b': 'An open string: held for 2 clicks, 2 more, then four plucks, one per click.',
  'lx.f8.t': 'Tapping the pattern below: two long, four short.',
  'lx.f8.easy': 'A note can last one step (a quarter note), two steps (a half note) or four (a whole note). The steps are counted out loud: "one, two…"',
  'lx.f8.fix': 'A long note gets cut off: the key stays down (or the string ringing) until the count is finished.',
  // 9
  'lx.f9.p': 'The tune below with the right hand; the fingers rest on C-D-E-F-G (do-re-mi-fa-sol) and do not move away.',
  'lx.f9.g': 'The tune from the tab below (short for tablature): a line is a string, a number is a fret.',
  'lx.f9.b': 'The tune on bass: in the tab, a number is a fret and a line is a string.',
  'lx.f9.t': 'Listening to the tune and singing it.',
  'lx.f9.easy': 'A tune (melody) is notes one after another that can be sung. First listening, then playing slowly, one note at a time.',
  'lx.f9.fix': ul('Going wrong: one line (4 notes) at a time, then joining them.', 'Tab: the six (or four) lines are the strings, the top one is the thinnest; the number says which fret to press, 0 means no finger.'),
  // 10
  'lx.f10.p': 'Counting "one-two-three-four", with "one" played a little louder; then "Frère Jacques" below.',
  'lx.f10.g': 'One pluck on every count, a stronger one on "one"; then the tune below.',
  'lx.f10.b': 'The root (the main note of the chord) on every count, stronger on "one"; then the tune below.',
  'lx.f10.t': 'Eight even taps; in "Frère Jacques", singing while counting to four.',
  'lx.f10.easy': 'The steps of music gather in fours: that group is a bar. The first step of a bar is a little stronger, like the stressed part of a word.',
  'lx.f10.fix': 'Lost the count: a stop, then a fresh start from "one".',
  // 11
  'lx.f11.p': 'Two quick Cs on every click: "ti-ti". Then "ta" (one) and "ti-ti" (two) taking turns.',
  'lx.f11.g': 'Two strums on every click: down and up ("ti-ti").',
  'lx.f11.b': 'Two notes on every click, fingers taking turns.',
  'lx.f11.t': 'Tapping the pattern: "ti-ti" and "ta".',
  'lx.f11.easy': 'A step can be split in half: that gives two quick notes (eighth notes). On one step it is "ti-ti".',
  'lx.f11.fix': 'The eighths come out uneven: a slower metronome and counting "one-and, two-and".',
  // 12
  'lx.f12.p': 'A pattern with rests (silences): on a rest the hands stay above the keys and play nothing.',
  'lx.f12.g': 'On a rest, the strings are muted with the palm.',
  'lx.f12.b': 'On a rest, the string is muted with a finger of the left hand.',
  'lx.f12.t': 'Tapping the pattern: no tap on the rests.',
  'lx.f12.easy': 'A rest is silence of the right length. It is counted too: "one" (silence), "two" (silence)…',
  'lx.f12.fix': 'The rest gets swallowed: counting it out loud just as loudly as the notes.',
  // 13
  'lx.f13.p': '"Ode to Joy" with the right hand, fingers on C to G. First line by line, then all of it.',
  'lx.f13.g': '"Ode to Joy" from the tab: line by line first.',
  'lx.f13.b': '"Ode to Joy" from the tab, on bass.',
  'lx.f13.t': 'Listening with the backing and singing along.',
  'lx.f13.easy': 'A song is a few short lines. One line learned at a time, then they are stuck together.',
  'lx.f13.fix': ul('Going wrong in one spot: just that spot, 5 times in a row.', 'Slow playing (the "slowly" button); speed comes by itself.'),
  // 14
  'lx.f14.p': 'C, E, G (do, mi, sol) one by one, then all three together: this is the C major chord (C). Fingers 1, 3, 5.',
  'lx.f14.g': 'The C chord: fingers on fret 1 of string 2 (B), fret 2 of string 4 (D) and fret 3 of string 5 (A); the five thinner strings strummed.',
  'lx.f14.b': 'On bass, a chord is played one note at a time: C, E, G (do, mi, sol), one after another.',
  'lx.f14.t': 'Listening to the chord and singing its notes one by one.',
  'lx.f14.easy': 'A chord is several notes sounding at the same time. The simplest one has three notes.',
  'lx.f14.fix': ul('Guitar: one string sounds dead because a finger touches it; the fingers should stand more upright, on the very tips.', 'Piano: not all three sound; the keys go down together and equally.'),
  // 15
  'lx.f15.p': 'Three chords: C (C-E-G), F (C-F-A), G (B-D-G). This way the hand hardly moves.',
  'lx.f15.g': 'Em (two fingers on fret 2 of strings 4 and 5), A (three fingers in a row on fret 2), D (a triangle on frets 2–3).',
  'lx.f15.b': 'The roots (main notes) of the chords: E (the open thickest string), A (the open A string, second thickest), D (the open D string, third).',
  'lx.f15.t': 'The "Triad by ear" drill: which chord was played.',
  'lx.f15.easy': 'Every chord is its own hand shape. One at a time, until the hand finds it by itself.',
  'lx.f15.fix': 'The chord does not ring: fingers placed one by one, each string checked on its own, then all together.',
  // 16
  'lx.f16.p': 'With the metronome at 60: C for 4 clicks, G for 4 clicks, with no stop between them.',
  'lx.f16.g': 'With the metronome at 60: A for 4 clicks, D for 4; all fingers move at once.',
  'lx.f16.b': 'With the metronome at 60: A for 4 clicks, D for 4, with no gap.',
  'lx.f16.t': 'Counting how many chord changes in a minute came out without a stop, and writing the number down.',
  'lx.f16.easy': 'The key thing about chords is not the chords themselves but the move between them. The quicker the hand jumps, the easier songs become.',
  'lx.f16.fix': ul('A gap at the change: a look ahead at where the fingers go, and moving them all together.', 'A slower metronome, down to 50.'),
  // 17
  'lx.f17.p': 'Left hand: the chords C, F, G as the song goes; right hand: the tune. At first, just the chords along with the recording.',
  'lx.f17.g': 'The song\'s chords along with the recording (the "Listen" button with backing); one down-strum on every click.',
  'lx.f17.b': 'The roots of the song\'s chords on every "one" and "three".',
  'lx.f17.t': 'Listening to the song and finding where the chord changes.',
  'lx.f17.easy': 'Accompaniment (backing) is chords under a song. A chord can simply be held while a line is sung.',
  'lx.f17.fix': 'No time for the change: the chord only on the first count of the bar, the rest held.',
  // 18
  'lx.f18.p': 'C (C-E-G), then Cm (C-E♭-G): one note changed, and the sound turned sad.',
  'lx.f18.g': 'A and Am: in Am one finger moves one fret back, and the chord turns sad.',
  'lx.f18.b': 'A-C-E, then A-C♯-E: sad and happy.',
  'lx.f18.t': 'Drill: a happy (major) or sad (minor) chord.',
  'lx.f18.easy': 'Major sounds bright and happy, minor sounds sad and thoughtful. The difference is one middle note.',
  'lx.f18.fix': 'No difference heard: both chords played slowly, one note at a time.',
  // 19
  'lx.f19.p': 'The C major scale with the right hand: C-D-E with fingers 1-2-3, then the thumb slips under the hand onto F, and on F-G-A-B-C with fingers 1-2-3-4-5.',
  'lx.f19.g': 'The C major scale from string 5 (A), fret 3: following the chart in the exercise.',
  'lx.f19.b': 'The C major scale from string 3 (A), fret 3.',
  'lx.f19.t': 'Singing "do-re-mi-fa-sol-la-ti-do": the tuner checks it.',
  'lx.f19.easy': 'A scale is a ladder of notes in order, up and down. Warm-ups start with it.',
  'lx.f19.fix': 'Piano: the fingers get tangled. First only C-D-E (1-2-3), then F-G-A-B-C (1-2-3-4-5).',
  // 20
  'lx.f20.p': 'All the keys in a row from C, white and black. The black key right of C is C sharp (C♯), also called D flat (D♭).',
  'lx.f20.g': 'On string 1 (E), every fret in a row: E, F, F♯, G, G♯.',
  'lx.f20.b': 'On the thickest string, every fret in a row.',
  'lx.f20.t': 'On the screen piano: finding F sharp (F♯) and B flat (B♭).',
  'lx.f20.easy': 'Sharp (♯) means a little higher, flat (♭) a little lower. The black key between C and D is both C sharp and D flat.',
  'lx.f20.fix': 'The names get mixed up: black keys have two names, and both are right.',
  // 21
  'lx.f21.p': 'Counting to three: "one-two-three". Left hand: the low note on "one", the chord on "two" and "three".',
  'lx.f21.g': 'Waltz: the thick string on "one", the thin strings on "two" and "three".',
  'lx.f21.b': 'Waltz: the root only on "one"; silence on "two" and "three".',
  'lx.f21.t': 'Tapping a waltz: tap-tap-tap, the first one stronger.',
  'lx.f21.easy': 'In a waltz the steps gather in threes, not fours: "one-two-three, one-two-three".',
  'lx.f21.fix': 'Slipping into four: counting "one-two-three" out loud and swaying on "one".',
  // 22
  'lx.f22.p': 'Finding middle C in the sheet music (on its own short line below the five lines) and playing it.',
  'lx.f22.g': 'Guitar music is written the same way; tab is simpler: the fret number on the string\'s line.',
  'lx.f22.b': 'Bass music is read in the bass clef (a sign for low notes); tab: the fret number on the string\'s line.',
  'lx.f22.t': 'The "Note on the staff" drill.',
  'lx.f22.easy': 'Notes are written on five lines: the higher the dot, the higher the sound. A filled-in dot is a short note, a hollow one is long.',
  'lx.f22.fix': 'It does not stick: three notes a day, no more.',
  // 23
  'lx.f23.p': 'Five notes: A, C, D, E, G (la, do, re, mi, sol). Played in any order with the metronome: there are no wrong notes here.',
  'lx.f23.g': 'Five notes around fret 5 (A, C, D, E, G): played in any order.',
  'lx.f23.b': 'Five notes: A, C, D, E, G; short phrases.',
  'lx.f23.t': 'A short phrase sung, then another one as an "answer".',
  'lx.f23.easy': 'Improvising means playing one\'s own music, made up on the spot. These five notes are chosen so that together they always sound nice.',
  'lx.f23.fix': 'No idea what to play: the same short phrase repeated, changing one note.',
  // 24
  'lx.f24.p': 'A song chosen in "Songs", its chords learned and the whole song played; then a recording of oneself.',
  'lx.f24.g': 'One\'s own song: chords, strumming, all of it with the metronome; then a recording.',
  'lx.f24.b': 'One\'s own song: the roots on every "one"; then a recording.',
  'lx.f24.t': 'The first recording and the latest one, side by side: the difference can be heard.',
  'lx.f24.easy': 'The first path is done. Next is the "Intermediate" textbook: the level switch is at the top of the "Textbook".',
  'lx.f24.fix': 'The song is too hard: another one with 3–4 chords, or the recording slowed down in the media library.',
};

export const TERMS = {};

const ch = (id, t, s, h) => ({ id, t, s, src: '', h });
export const CH = [
  ch('f1', 'Music is made of sounds', 'High and low, long and short, soft and loud', `
<p>All music is sounds. Every sound has four features: it is <b>high or low</b>, <b>long or short</b>, <b>soft or loud</b>, and every instrument has its own "voice", so a piano is never mistaken for a guitar.</p>
<p>Songs are made of these simple things: which sounds, in what order and for how long.</p>
${key('High or low, long or short, loud or soft. That is all the first step needs.')}
`),
  ch('f2', 'Meeting the instrument', 'What it is made of and where the sound is born', `
<p>On a piano, the sound is born when a key moves a little hammer and it strikes a string inside. On a guitar and a bass, the sound is born when the fingers pluck a string.</p>
<p>The height of the sound is chosen in different ways: on a piano by which key, on a guitar and a bass by which string and where it is pressed.</p>
${tip('Finding the lowest and the highest sound on the instrument.')}
`),
  ch('f3', 'How to sit and hold the hands', 'Comfortable means right', `
<p>Good posture is not about looks: this way the hands do not get tired and play faster. Back straight, shoulders down, hands soft.</p>
<p>If something gets tense, it is time to stop, drop the hands and shake them. After a minute, again.</p>
${key('Nothing should hurt. Tired means time for a rest.')}
`),
  ch('f4', 'Tuning', 'So the instrument sounds right', `
<p>Strings loosen over time, and the instrument starts to sound "crooked". Tuning means bringing each string up to the right sound. A tuner helps: it listens to the sound and its needle shows whether it is higher or lower than needed.</p>
<p>A guitar and a bass are tuned before every practice; it takes a minute. A piano is tuned by a technician.</p>
`),
  ch('f5', 'Note names', 'C, D, E, F, G, A, B (do, re, mi, fa, sol, la, ti)', `
<p>There are only seven notes: <b>C, D, E, F, G, A, B</b> (or by syllables: do, re, mi, fa, sol, la, ti). After B comes C again, only higher. This way the notes repeat in a circle across the whole instrument.</p>
<p>Many countries name the notes with letters, others with syllables: C is do, D is re, and so on. The app uses both.</p>
${key('Seven notes in a circle: C-D-E-F-G-A-B, and C again.')}
`),
  ch('f6', 'Where the notes live', 'On the keyboard and on the neck', `
<p>On a piano the notes are easy to find by the black keys: just left of two black keys there is always C. From there to the right, along the white keys: D, E, F, G, A, B.</p>
<p>On a guitar and a bass: an open string (no finger) is one note, and each fret higher is the next one. Closer to the body means higher.</p>
`),
  ch('f7', 'The beat: the steps of music', 'Even, like a heart', `
<p>Every song has an even beat, like footsteps or a heartbeat. People clap to it at concerts and nod their heads. The beat can be slow or fast: that is the tempo.</p>
<p>A metronome clicks the beat evenly. Playing along with it is the best way to learn to keep time.</p>
${tip('Clapping along with the metronome at 60, then at 80.')}
`),
  ch('f8', 'Long and short sounds', 'Counting the steps', `
<p>A note can last one step of the beat, two steps or four. The length is counted out loud: "one" is one step, "one-two" is two.</p>
<p>In written music, long notes have a hollow dot and short ones a filled-in dot. More on this in the lesson "Notes on paper".</p>
`),
  ch('f9', 'The first tune', 'Five notes, and already a song', `
<p>A tune (melody) is notes one after another that can be sung. Five notes are enough for the first tune: C, D, E, F, G (do, re, mi, fa, sol).</p>
<p>First, listening. Then playing slowly, one note at a time. A mistake is no problem: the playing just goes on, without stopping.</p>
`),
  ch('f10', 'Counting to four', 'The bar and the strong step', `
<p>The steps of music gather into groups, most often of four: "one-two-three-four". Such a group is called a bar. The first step of a bar is strong; it is played a little brighter.</p>
<p>Counting keeps the place: it is always clear where the start is.</p>
`),
  ch('f11', 'Quick notes', 'Two notes on one step', `
<p>A step can be split in half: that gives two quick notes. They are counted "ti-ti" or "one-and".</p>
${tip('Clapping: "ta, ta, ti-ti, ta".')}
`),
  ch('f12', 'Silence is music too', 'Rests', `
<p>A rest is silence of the right length. It is counted just like notes: the sound is skipped, but the count does not stop.</p>
<p>Rests make music alive, like a breath between phrases.</p>
`),
  ch('f13', 'A whole song', '"Ode to Joy"', `
<p>A song is learned in small pieces: line by line. When every line works, they are stuck together and played all the way through.</p>
<p>Slow and without stops is better than fast and with mistakes.</p>
${key('After a mistake, the playing goes on. Stopping is a habit, and a hard one to break.')}
`),
  ch('f14', 'What a chord is', 'Several notes together', `
<p>Several notes played at the same time make a chord. The simplest chord has three notes: for example, C, E and G (do, mi, sol). This is the "C major" chord, written with the letter C.</p>
<p>Chords sound under a song and make it full.</p>
`),
  ch('f15', 'The first chords', 'Three chords, and thousands of songs', `
<p>Every chord is its own hand shape. Three chords come first; a huge number of songs stand on them.</p>
<p>A chord is placed with all fingers at once, not one by one, and then checked: does every note ring?</p>
`),
  ch('f16', 'Changing chords', 'Without stopping', `
<p>The hardest part of chords is moving from one to another. The fingers should fly over all together.</p>
<p>A simple exercise helps: two chords, back and forth. How many changes come out in a minute? The number is written down and compared a week later.</p>
`),
  ch('f17', 'Playing along with a song', 'Chords under the tune', `
<p>Accompaniment (backing) is chords under a song. The tune can be sung by a voice or played by the other hand, and the chords hold it up from below.</p>
<p>At first, one chord per bar, evenly with the metronome.</p>
`),
  ch('f18', 'Happy and sad', 'Major and minor', `
<p>Chords can be bright and happy, called <b>major</b>, or sad and thoughtful, called <b>minor</b>. A minor chord is written with a small m: Am is A minor.</p>
<p>The difference is one middle note of the chord, but it is heard at once.</p>
`),
  ch('f19', 'A ladder of notes', 'The scale', `
<p>A scale is notes in order, like the steps of a ladder: C-D-E-F-G-A-B-C going up, and back down.</p>
<p>Scales are played as a warm-up: they wake the fingers up and teach them to walk evenly.</p>
`),
  ch('f20', 'Black keys: sharp and flat', 'Sounds between the notes', `
<p>Between some notes there are more sounds: on a piano these are the black keys, on a guitar and a bass the next fret along. A sound a little higher than a note is called <b>sharp</b> (♯), a little lower is called <b>flat</b> (♭).</p>
<p>That is why one black key has two names: C sharp is the same as D flat.</p>
`),
  ch('f21', 'Waltz: counting to three', 'One-two-three', `
<p>Not all music walks in fours. A waltz is counted in three: "one-two-three, one-two-three", the first step strong.</p>
${tip('Swaying to a waltz: down on "one", up on "two-three".')}
`),
  ch('f22', 'Notes on paper', 'How to read music', `
<p>Notes are written on five lines. The higher the dot, the higher the sound. A hollow dot is a long note, a filled-in one is short, and one with a little flag on its tail is shorter still.</p>
<p>Guitar and bass players often read tab (tablature): the lines are the strings, and the number says which fret to press.</p>
`),
  ch('f23', 'Blues: first playing of one\'s own', 'Five notes that cannot go wrong', `
<p>Blues is music where people play their own ideas, made up on the spot. Five notes are enough to start (A, C, D, E, G): together they always sound nice.</p>
<p>A short phrase, a pause, another phrase: like a conversation, a question and an answer.</p>
`),
  ch('f24', 'One\'s own song, and what comes next', 'The first whole song', `
<p>Time to choose a song: any song with three or four chords. Learning the chords and the rhythm, playing it all the way through with the metronome, and then a recording of oneself.</p>
<p>Next comes the "Intermediate" textbook: the same topics in more depth, plus new ones such as intervals, modes and keys. The level switch is at the top of the "Textbook".</p>
${key('A recording of oneself is the best teacher: listened to the next day, it shows what came out well.')}
`),
];
