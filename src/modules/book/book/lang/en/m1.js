// Учебник (en): простые версии глав для среднего уровня. Те же подзаголовки и схемы, что в p1.js, текст проще.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';

export const CHM = {
sound: `
<p>This chapter is the alphabet: what a sound is, how it is written down and how it is named. Every rule is best checked by ear.</p>
<h3>Four properties of sound</h3>
<p>A sound has four properties: [[pitchT|pitch]] (higher or lower), [[duration|duration]] (how long it lasts), loudness and [[timbre|timbre]] — the colour that tells a voice from a guitar. The faster a string vibrates, the higher the sound. For tuning, musicians use A at 440 vibrations per second (440 Hz); the app’s tuner works from it too. A note shows pitch by its place on the staff and duration by its shape.</p>
<h3>Overtones</h3>
<p>A string does not sound as one single tone. Along with the main sound, quiet extra sounds ring out — [[overtone|overtones]], 2, 3 or 4 times higher. Their mix makes the timbre: this is why a violin does not sound like a flute. The first overtones together form a major chord — the most stable chord in music.</p>
${lab('overtones')}
<h3>The staff</h3>
<p>Notes are written on the [[staff|staff]] — five lines counted from the bottom up. A note sits on a line or in a space between lines; very high and very low notes get short extra lines called ledger lines. The higher the note, the higher the sound. The thin line attached to a note is the stem: on low notes it points up, on high notes it points down.</p>
<h3>Note names</h3>
<p>There are seven notes: C, D, E, F, G, A, B, and then the names start again. On the keyboard, C is the white key to the left of a pair of black keys, and F is to the left of a group of three.</p>
<table class="bktab"><tr><th>Solfège</th><td>do</td><td>re</td><td>mi</td><td>fa</td><td>sol</td><td>la</td><td>ti (si)</td></tr><tr><th>Letter</th><td>C</td><td>D</td><td>E</td><td>F</td><td>G</td><td>A</td><td>B (H)</td></tr></table>
<p>The app and song chord charts use the letters C D E F G A B. In German scores B natural is called H, and the letter B there means B♭.</p>
<h3>Octaves</h3>
<p>From one C to the next C is an [[octaveR|octave]]. A piano has 88 keys, about seven octaves. The one-line octave is in the middle; below it are the small and great octaves and two more; above it are the two-line, three-line octaves and higher. Octaves can also be written with numbers: middle C is C4, the A above it is A4. The app’s tuner, MIDI and studio show this notation.</p>
${lab('octaves')}
<h3>Clefs</h3>
<p>The [[clef|clef]] at the start of the line decides which note sits on which line. The treble clef is for high notes: its curl wraps around the second line, where G4 sits. The bass clef is for low notes: its two dots surround the fourth line, where F3 sits. Middle C is on a ledger line below the treble staff and on a ledger line above the bass staff: this is where the two clefs meet.</p>
${lab('clefs')}
${tip('Guitar music is written in the treble clef, but the guitar sounds an octave lower. The sign 8va above the notes means: play an octave higher.')}
<h3>Staves and the score</h3>
<p>A voice, a guitar or a flute is written on one staff. The piano uses two staves joined by a brace: the right hand on top, the left hand below. All the parts of an ensemble written one under another make a [[score|score]].</p>
<h3>Range and register</h3>
<p>[[range|Range]] is all the notes of a voice or instrument, from the lowest to the highest. A register is one part of the range: low, middle or high, each with its own colour. A song may fit a singer’s range and still be uncomfortable if it stays near the edge for long; then it is moved higher or lower. Female voices are soprano, mezzo-soprano and alto; male voices are tenor, baritone and bass (from high to low).</p>
${lab('ranges')}
${key('The place of a note is its pitch; the shape of a note is its duration. The clef says which sound stands on which line.')}
`,

rhythm: `
<p>[[duration|Duration]] is how long a sound is held. It is counted not in seconds but in beats: the tempo decides whether the count is fast or slow. Each note value is half as long as the one before it.</p>
<h3>The basic division</h3>
<p>One whole note = two half notes = four quarter notes = eight eighth notes = sixteen sixteenth notes. A whole note is an open circle with no stem; a half note is open with a stem; a quarter note is filled with a stem; an eighth note has one flag, a sixteenth two. Each row of the lab plays on a tap.</p>
${lab('durs')}
<p>It helps to see notes in groups: a half note is two quarters; three eighths played as one sound make a dotted quarter. Then rhythm is read in words, not letter by letter.</p>
<h3>Rests</h3>
<p>A [[rest|rest]] is silence of an exact length; each note value has its own rest. The whole rest is a block hanging below a line, and it also means “silent for the whole bar”; the half rest is a block sitting on a line. A rest is a breath, like a comma. A common mistake is not counting a rest to its end and coming in too early.</p>
<h3>Dot, tie, fermata</h3>
<p>A [[dot|dot]] adds half of a note’s length: a dotted half note lasts three quarters. A [[tie|tie]] is a curve between two notes of the same pitch: the second note is not played again but held. A curve over different notes means something else: play them smoothly. A [[fermata|fermata]] — a half circle with a dot — means hold the sound longer, by feel.</p>
<h3>Beaming</h3>
<p>Eighths and sixteenths within one beat are joined by a common beam — so it is easy to see where each beat starts.</p>
<h3>Triplets and dotted rhythm</h3>
<p>A [[triplet|triplet]] is three equal notes in the time of two: three eighths marked with a 3 last as long as one quarter. A common mistake is to stretch the first or the last note.</p>
<p>[[dotted|Dotted rhythm]] is a “long and short” pair: a dotted eighth and a sixteenth. A handy way is to count “one-e-and-a” silently and play on “one” and on “a”.</p>
<h3>Straight and swing eighths</h3>
<p>In classical music eighths are even. In jazz they are written the same way but played [[swing8|with swing]]: the first is longer and heavier, the second shorter — “taa-ta, taa-ta”. At fast tempos the swing is lighter and the eighths are almost even. The cells of the grid can be tapped to build a rhythm of one’s own.</p>
${lab('rgrid')}
${tip('Beats with the foot, rhythm with claps or syllables (“ta — ti-ti”). Slowly at first, with the metronome, then faster.')}
${key('Each note value is half the previous one; a dot adds half, a triplet divides the beat into three. A rest is counted as precisely as a note.')}
`,

meter: `
<p>Under a melody runs a steady pulse of beats, like steps. Some beats are heavier (strong), others lighter (weak). Their regular pattern is called [[metre|metre]].</p>
<h3>Metre in verse</h3>
<p>In verse the strong beat is the stressed syllable. “TY-ger TY-ger, BURN-ing BRIGHT” — a stress on every other syllable: counted in two. “THIS is the FOR-est pri-ME-val” — a stress on every third syllable: counted in three. A bar line before each stressed syllable divides the line into bars. An unstressed syllable before the first bar line (“the CUR-few TOLLS…”) is an anacrusis.</p>
${lab('verse')}
<h3>Bar and time signature</h3>
<p>A [[bar|bar]] runs from one strong beat to the next; the bar line goes before the strong beat. The [[timesig|time signature]] is written as a fraction: the top number is how many beats are in a bar, the bottom number is which note counts as one beat. 3/4 means three quarter-note beats, 6/8 means six eighth-note beats.</p>
<h3>Simple, compound, mixed</h3>
<p>A simple metre has one strong beat: 2/4, 3/4 (a waltz: “one-two-three”). A compound metre is made of several equal simple ones: 4/4 is two bars of 2/4 joined, so the third beat is also strong, but weaker than the first; it is the most common metre in songs and is also written with the letter C. 6/8 is two groups of three eighths, like rocking. A mixed metre is made of different groups: 5/4 = 3 + 2, 7/8 = 2 + 2 + 3. A C with a line through it means counting “in two”, in half notes.</p>
${lab('meter')}
<h3>Conducting patterns</h3>
<p>Beats are shown with the hand: “one” is down, the last beat is up. In three: down, right, up. In four: down, left, right, up. The diagram above lights up the count; following it with the hand is a good way to feel a metre.</p>
<h3>The counting unit</h3>
<p>Eighths are counted “one-and, two-and”, sixteenths “one-e-and-a”: each note gets its own syllable.</p>
<h3>Anacrusis</h3>
<p>An [[anacrusis|anacrusis]] (upbeat) is an incomplete bar at the start, before the first strong beat: the melody takes a run-up before the stress. In 3/4 a song may start on the third beat: “three | ONE-two-three”. The last bar of a piece is usually incomplete too, and together with the upbeat it makes a full bar.</p>
<h3>Syncopation</h3>
<p>[[syncopation|Syncopation]] moves the accent to a weak beat: a note starts on a weak spot and is held through the strong one, as if it came early. It can also cross the bar line, with a tie. A rest on a strong beat gives a similar effect. Syncopation is the basis of jazz, funk and pop music.</p>
${lab('syncop')}
${key('The time signature tells how many beats are in a bar and which are strong; rhythm is what sounds on top. First the beats are felt, then the rhythm is read.')}
`,

pitch: `
<p>Neighbouring piano keys give the smallest distance in Western music — the [[semitone|semitone]]; on the guitar it is one fret. Two semitones make a tone. Among the white keys there are semitones only at E — F and B — C: there is no black key between them. All other neighbouring white keys are a tone apart.</p>
<h3>Accidentals</h3>
<p>[[accidental|Accidentals]] change the pitch: a sharp ♯ raises a note by a semitone, a flat ♭ lowers it by a semitone, a natural ♮ cancels a sign; a double sharp 𝄪 and a double flat 𝄫 move it by a whole tone. The note keeps its name: F♯ is still F. Accidentals in the key signature (at the start of the line) apply to the whole piece in every octave; accidentals before a note apply only until the end of the bar and only to that note.</p>
${lab('semis')}
<h3>Twelve notes in an octave</h3>
<p>An octave has twelve semitones: seven white keys and five black ones. Each black key has at least two names: C♯ = D♭. Notes that sound the same but have different names are [[enharmonic|enharmonically equivalent]]. White keys have second names too: E♯ sounds as F. The key decides which name to write.</p>
${lab('enh')}
<h3>Diatonic and chromatic semitones</h3>
<p>A semitone between different letters (E — F) is diatonic; a semitone between a note and the same letter with a sign (F — F♯) is chromatic. They sound the same, but in a scale each letter appears only once. That is why the seventh note of G major is F♯, not G♭: the letter G is already taken.</p>
<h3>Temperament</h3>
<p>Piano and guitar are tuned in [[temperament|equal temperament]]: all twelve semitones are the same size, so any key can be played. Voices and violins adjust more finely — a note pulling towards the main note is taken slightly higher. That is why a choir without piano can sound especially pure: the ear matters more than the key.</p>
${tip('It is useful to sing all the semitones from C to C, up and down, and check each one with the app’s tuner.')}
${key('A semitone is neighbouring keys or one fret; a tone is two keys apart. An accidental changes the pitch but not the name of the note; the name is chosen by the key.')}
`,
};
