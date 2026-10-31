// Учебник (en): простые версии глав для среднего уровня — «Интервалы», «Аккорды», «Гаммы и лады», «Тональность и функции».
// Собственный пересказ глав из p2.js простыми словами: те же подзаголовки и схемы, меньше терминов.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';

export const CHM = {
iv: `
<p>An [[interval|interval]] is the distance between two notes. An interval has two numbers. The first is how many letters it spans, counting both ends: from C to E is C, D, E — three letters, so it is a third. The second is how many semitones it contains. A semitone is two neighbouring piano keys or two neighbouring guitar frets. The first number gives the name (second, third, fourth, fifth…), the second gives the quality: minor, major, perfect, augmented, diminished.</p>
<p>This leads to a fine point: C–F and C–E♯ use the same upper key but are different intervals. C–F spans four letters, so it is a fourth. C–E♯ spans three letters, so it is a third (an augmented one).</p>
<p>In jazz and in songs intervals are often written as a number above the lower note. This is [[ivAbbr|shorthand]]: major and perfect intervals are a plain number (3, 5, 7), minor ones get a flat (♭3, ♭7), augmented ones a sharp (♯4). For a note the sign comes after the letter (F♯), for a degree before the number (♯4).</p>
<p>The unison, fourth, fifth and octave have no “minor” or “major” form — they are perfect. A perfect interval made a semitone narrower becomes diminished; made a semitone wider, augmented. So there is no “minor fifth”: there is a diminished one (♭5).</p>
${lab('iv')}
<h3>All intervals up to the thirteenth</h3>
<p>Intervals wider than an octave are called <b>compound</b>: a simple interval plus an octave. A ninth is a second an octave up, a tenth a third, an eleventh a fourth, a twelfth a fifth, a thirteenth a sixth an octave up. This is where the numbers 9, 11 and 13 in chord names come from. Such notes above a chord are called [[tension|tensions]]: they add colour.</p>
${lab('ivtable')}
<h3>Enharmonically equivalent intervals</h3>
<p>Sometimes two intervals sound the same but have different names. For example, C–E♭ is a minor third and C–D♯ is an augmented second: the keys are the same. Likewise C–F♯ (augmented fourth) and C–G♭ (diminished fifth). Which name is right depends on how the notes are spelled — that is, on the key and the chord. The ear hears no difference; in writing and in meaning there is one.</p>
<h3>Inverting an interval</h3>
<p>If the lower note moves up an octave, the interval is inverted. The rule is simple: the names add up to 9 (a third becomes a sixth, a second a seventh, a fourth a fifth). The quality flips: major becomes minor, augmented becomes diminished, perfect stays perfect. This is handy for thinking in one’s head: a major sixth up is easy to find as a minor third down.</p>
${key('The [[tritone|tritone]] is 6 semitones, exactly half an octave. When inverted, it stays a tritone. It is the tensest interval, and the pull of the dominant to the tonic rests on it.')}
${tip('A major sixth is an octave minus a minor third, a minor sixth is an octave minus a major third. A seventh is an octave minus a second. This makes sixths and sevenths easier to find on the fretboard and the keys.')}
<h3>Consonance and dissonance</h3>
<p>[[consonance|Consonances]] sound blended and calm: the unison, octave, fifth and fourth (the most “pure”), thirds and sixths (softer and warmer). Dissonances sound sharp and want to move: seconds, sevenths and the tritone. The fourth is a special case: at the very bottom of a chord it sounds unstable, inside a chord it sounds calm.</p>
<p>A dissonance is not a mistake. It is tension that gives music its edge, especially in jazz. What matters is where it sits and where it goes next.</p>
${tip('An interval is best sung first and played after. Thirds and sevenths are a good place to start: the [[guide|guide tones]] of chords are made of them.')}
<h3>Intervals by ear: tune openings</h3>
<p>An interval is easier to recognise when it is linked to a well-known melody: the first two notes of the tune are the interval. Below are openings of jazz tunes. Any familiar songs will do as well: what matters is that the melody is well known.</p>
<table class="bktab"><tr><th>Interval</th><th>Up</th><th>Down</th></tr>
<tr><td>minor second</td><td>Blue Monk</td><td>Bolivia</td></tr><tr><td>major second</td><td>Four</td><td>—</td></tr><tr><td>minor third</td><td>Confirmation</td><td>—</td></tr>
<tr><td>major third</td><td>Monk's Dream</td><td>Giant Steps</td></tr><tr><td>perfect fourth</td><td>Jordu</td><td>ESP</td></tr><tr><td>tritone</td><td>Isotope</td><td>—</td></tr>
<tr><td>perfect fifth</td><td>Bags' Groove</td><td>Katrina Ballerina</td></tr><tr><td>major sixth</td><td>Misterioso</td><td>All Blues</td></tr><tr><td>octave</td><td>Del Sasser</td><td>—</td></tr></table>
<h3>Intervals in a key</h3>
<p>In a key an interval gains a role. The notes of the tonic triad — degrees I, III and V (in C major: C, E, G) — are stable; the music rests on them. Intervals made of these notes are called [[ivMode|stable intervals]]. The others are unstable: an unstable note moves to the nearest stable one.</p>
<p>An example is the tritone F — B in C major. It “opens out”: F goes down to E, B goes up to C. The result is E — C, a calm sixth. Harmonic minor (minor with a raised degree VII) has its own sharp intervals — they are called [[charIv|characteristic intervals]].</p>
${lab('ivmode')}
`,
chords: `
<p>A chord is several notes sounding together. Most often it is built in thirds, skipping every other note: from C — C, E, G, B. The lowest note is the root, and the chord takes its name from it. Three notes make a triad, four a [[seventh|seventh chord]]. Notes above that (9, 11, 13) add colour.</p>
<h3>Triads</h3>
<p>A [[triad|triad]] is three notes in thirds. There are four kinds:</p>
<ul><li><b>major</b> (C: C–E–G) — bright, strong;</li><li><b>minor</b> (Cm: C–E♭–G) — sad, thoughtful;</li><li><b>diminished</b> (C°: C–E♭–G♭) — uneasy;</li><li><b>augmented</b> (C+: C–E–G♯) — hazy, unsettled.</li></ul>
<p>Major and minor differ by one note — the third. A [[sus|sus chord]] has no third at all; a fourth takes its place (Csus4: C–F–G). It sounds open, neither major nor minor.</p>
<p>In the major scale there are major triads on degrees I, IV and V, minor ones on II, III and VI, and a diminished one on VII. In C major: C, Dm, Em, F, G, Am, B°.</p>
${lab('triads')}
<h3>Inversions</h3>
<p>The notes of a chord can be rearranged. With the root at the bottom it is root position. With the third at the bottom it is the first [[inversion|inversion]]; with the fifth, the second. Song charts write this with a slash: C/E is C major with E in the bass, C/G is C major with G in the bass. Classical theory gives inversions their own names: the [[sixth|sixth chord]] (third at the bottom) and the six-four chord (fifth at the bottom). Inversions let chords move into each other smoothly, without needless leaps.</p>
${lab('chord')}
<h3>Seven seventh chords</h3>
<p>Adding one more third on top of a triad gives a seventh chord. There are five main kinds, and each differs from the next by one note:</p>
<ul><li><b>Cmaj7</b> (C–E–G–B) — soft, dreamy;</li><li><b>C7</b> (B drops to B♭) — dominant, wants to resolve;</li><li><b>Cm7</b> (E also drops to E♭) — minor, calm;</li><li><b>Cm7♭5</b> (G drops to G♭) — half-diminished, ø;</li><li><b>C°7</b> (the seventh drops another semitone) — diminished, the tensest.</li></ul>
<p>There are two more: minor with a major seventh, m(maj7), and 7sus4.</p>
${lab('seventh')}
<p>The most important of them is the [[d7|dominant seventh]], the chord on degree V (in C major, G7). It pulls to the tonic more strongly than any other: G7 → C. Its notes move to the nearest notes of the tonic: B up to C, F down to E. On degree VII stand the [[leadseventh|leading-note seventh chords]] — they also lead to the tonic.</p>
${lab('d7')}
${key('The third and the seventh decide what kind of chord it is. The fifth can almost always be left out, and so can the root, if the bass plays it.')}
<h3>Sixth chords</h3>
<p>C6 is a major triad with a sixth: C–E–G–A. Cm6 is a minor triad with the same sixth. They are often played instead of maj7 and m7 on the tonic, especially when the melody is on the root: then a major seventh next to the root would sound too harsh. C6/9 is the same C6 with a ninth (D), a very calm major sound.</p>
<h3>Tensions</h3>
<p>Tensions are the notes 9, 11 and 13 above a seventh chord. They change the colour of a chord but not its kind: Cmaj9 is still major, it only sounds richer. Not every tension suits every chord: if a note is a semitone above a chord tone, the two clash. Tensions are covered in detail at the advanced level.</p>
${lab('tens')}
<h3>Sus chords</h3>
<p>In a sus chord a fourth stands in place of the third: Gsus4 is G–C–D. It sounds “suspended” and usually moves to a chord with a third, or works as a soft dominant. It has a sharper relative — the [[susb9|Phrygian chord]]. The finer points of sus are at the advanced level.</p>
${lab('sus')}
<h3>Upper structures</h3>
<p>A complex dominant can be played simply: the left hand holds the root, third and seventh, the right hand plays an ordinary triad on top. Such a triad is called an [[ust|upper structure]]: it adds three colours at once. The diagrams below let different triads be heard over one dominant. The system of upper structures is covered in detail at the advanced level.</p>
${lab('ust')}
${lab('ustnum')}
`,
scales: `
<p>A [[scale|scale]] is a set of notes in order from which a melody is made. Over each chord a scale can be played that contains all of the chord’s notes. So scales are learned not as an exercise but to understand which notes “fit” a chord.</p>
<h3>Modes of major</h3>
<p>Playing the white keys from C to C gives major. Playing the same white keys from D to D gives another [[mode|mode]], Dorian. From E it is Phrygian, from F Lydian, from G Mixolydian, from A Aeolian (natural minor), from B Locrian. The notes are the same; the main note changes — and with it the mood.</p>
<p>It is simpler to think of it this way: a mode is major or minor with one changed degree. Dorian is minor with a raised sixth degree. Lydian is major with a raised fourth (♯4). Mixolydian is major with a lowered seventh (♭7).</p>
${lab('scale')}
<h3>The brightness ladder</h3>
<p>The seven modes can be arranged from the brightest to the darkest. At the top is Lydian, below it Ionian (major), Mixolydian, Dorian, Aeolian, Phrygian, and Locrian at the bottom. With each step down, one degree drops a semitone — and the sound grows darker. The five middle modes share degrees I, IV and V — these are the [[tonalDeg|tonal degrees]], the support of the mode.</p>
${lab('bright')}
${key('Each mode is recognised by its [[chartone|characteristic degree]]: Dorian — 6, Phrygian — ♭2, Lydian — ♯4, Mixolydian — ♭7, Aeolian — ♭6, Locrian — ♭5. When this degree is stressed in the melody, the mode is heard at once.')}
<h3>Scales by chord family</h3>
<p>It also works the other way round, starting from the chord: which scales fit it? Scales are grouped into [[famscale|families]]: for major chords, for minor chords, for dominants, for diminished chords. Within a family the scales differ by one or two degrees. Sometimes a scale has an [[avoid|avoid note]] — it clashes with the chord if held. For example, F over a C major chord: it is better passed through than held.</p>
${lab('famscale')}
<h3>Melodic minor</h3>
<p>[[melmin|Melodic minor]] is minor with a raised sixth and a raised seventh degree: A–B–C–D–E–F♯–G♯. In effect it is major with a lowered third degree. In jazz it is played the same way up and down. More in a separate chapter.</p>
<h3>Harmonic minor and harmonic major</h3>
<p>[[harmmin|Harmonic minor]] is natural minor with a raised seventh degree: A–B–C–D–E–F–G♯. Because of the G♯ there is a wide step of a tone and a half between the sixth and seventh degrees — hence the “eastern” sound. In return, a major chord appears on degree V (E in A minor), and it pulls strongly to the tonic.</p>
<p>[[harmmaj|Harmonic major]] is the opposite: major with a lowered sixth degree. It sounds more mysterious than ordinary major.</p>
<h3>Altered or diminished?</h3>
<p>Over a dominant with sharp notes (♭9, ♯9, ♭13) special scales are played: the [[altered|altered]] scale, the diminished scale or the whole-tone scale. The numbers in the chord name suggest which one to choose. This is advanced material; the diagram below shows how the numbers lead to the scale.</p>
${lab('altdim')}
<h3>Symmetric scales</h3>
<p>Symmetric scales are built from the same steps repeated. The [[dimscale|diminished scale]] alternates a tone and a semitone; the [[wholetone|whole-tone scale]] moves in tones only. They sound unusual and fit special chords — diminished chords and dominants with sharp notes. Covered in detail at the advanced level.</p>
${lab('dimeq')}
<h3>Pentatonics and the blues scale</h3>
<p>A [[pentatonic|pentatonic]] is a five-note scale with no semitones. Major from C: C–D–E–G–A. Minor from A: A–C–D–E–G — the same notes, only from another note. A pentatonic has no sharp intervals, so it fits almost any music, and it is a handy place to start improvising. The [[blues|blues scale]] is the minor pentatonic with one added note, ♭5: A–C–D–E♭–E–G.</p>
<h3>Bebop scales</h3>
<p>A [[bebop|bebop scale]] is an ordinary seven-note scale with one extra passing note. Thanks to it, when playing in eighths, the chord tones fall on the strong beats. It is a technique of jazz improvisation, covered at the advanced level.</p>
${tip('A scale is best learned together with its chord: the chord sounds (in the left hand, in the looper or as a pad), and the scale is played on top. This way the ear hears at once which notes are calm and which are tense.')}
<h3>The chromatic scale</h3>
<p>The [[chromscale|chromatic scale]] is all twelve semitones in a row, every key with none skipped. It always sounds the same but is spelled in different ways: going up, sharps are more common; going down, flats, with adjustments for the key. The diagram shows the correct spelling.</p>
${lab('chromsc')}
<h3>Variable mode</h3>
<p>Sometimes a melody has two centres: one phrase sounds in F major, the next in D minor. These keys share the same notes, and neither is the main one. This is a [[varmode|variable mode]]. Many folk and pop songs work this way.</p>
<h3>All scales</h3>
<p>The full reference: modes of major and minor, symmetric scales, pentatonics, bebop and scales of different peoples. It is handy to open when an unfamiliar name comes up.</p>
${lab('refsc')}
`,
key: `
<p>A key is a family of notes and chords around one main note. Building a chord from the scale’s own notes on each degree of the major scale gives the seven chords of the key. In C major: C, Dm, Em, F, G, Am, B°. Their numbers are written in [[roman|Roman numerals]]: upper case for major chords (I, IV, V), lower case for minor ones (ii, iii, vi). So a progression can be written for every key at once: “I–IV–V” in C major is C–F–G, in G major G–C–D.</p>
${lab('key')}
<h3>Three functions</h3>
<p>Each chord of a key has a role — a [[function|function]]. There are three:</p>
<ul><li>[[tonic|tonic]] — rest, “at home” (I, and also iii and vi);</li><li>subdominant — moving away from home (IV and ii);</li><li>[[dominant|dominant]] — tension that wants to return home (V and vii).</li></ul>
<p>Chords of the same function can replace each other. For example, instead of F (IV) in C major, Dm (ii) can be played — the role stays the same. The vi chord (Am) is two-sided: after V it sounds like a tonic, before V like a subdominant.</p>
${key('Almost any progression is the path “subdominant → dominant → tonic”: leaving home, building tension and coming back. ii–V–I (Dm–G–C) is the shortest form of this path.')}
<h3>Primary triads and voice leading</h3>
<p>The three [[mainTriads|primary triads]] are on degrees I, IV and V: the tonic (T), the subdominant (S) and the dominant (D). In C major they are C, F and G. They can accompany a huge number of songs. Moving from chord to chord works best smoothly: a common note stays in place, and the other notes move to the nearest notes of the next chord.</p>
<p>A simple and useful exercise is fitting primary triads to a melody. The rule: the melody note on a strong beat has to belong to the chord.</p>
${lab('harmtsd')}
<h3>Minor</h3>
<p>Minor works the same way, only the tonic is minor. In A minor the primary triads are Am, Dm and E. E has a special role: in minor the dominant is usually made major (taken from harmonic minor) so that it pulls more strongly to the tonic. With a plain Em the move to Am sounds softer and weaker. The diagram above switches to harmonic and melodic minor.</p>
<h3>Cadences</h3>
<p>A [[cadence|cadence]] is the ending of a phrase, like a full stop or a comma in speech. The main ones:</p>
<ul><li>V–I (G–C) — a full ending, a full stop;</li><li>IV–I (F–C) — a soft ending, the “amen”;</li><li>V–vi (G–Am) — a deception: the tonic was expected, its substitute sounded instead;</li><li>a stop on V — a half cadence, a comma: more to come.</li></ul>
<h3>The circle of fifths</h3>
<p>On the [[circle|circle of fifths]] keys stand a fifth apart, and neighbours differ by only one accidental. Chords in songs often move around the circle, down a fifth each time: D → G → C → F. The circle itself and the key signatures are in the chapter “Keys”.</p>
`,
};
