// Учебник (en): простые версии глав для среднего уровня — лад, тональности, мелодия, исполнение.
// Пересказ своих глав из p1.js проще и короче; подзаголовки и схемы — те же, в том же порядке.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';

export const CHM = {
mode: `
<p>Every song has a main note — the [[tonicT|tonic]]. It is the “home” of the melody: the melody often starts on it and almost always ends on it. Of the other notes, some are calm and some pull towards their neighbours. This order around the tonic is called a [[lad|mode]]. The best-known modes are major (it sounds brighter) and minor (it sounds softer, sadder).</p>
<h3>A pitch set from a tune</h3>
<p>A mode can be found right inside a familiar melody. If its notes are written out once each, from low to high, the result is a pitch set. The notes are numbered from the tonic (the note where the melody comes to rest): I, II, III… These numbers are degrees. Now the melody is a path through the degrees, and it can be sung or played from any note: what matters is the numbers, not the note names.</p>
${lab('tonic')}
<p>A [[scale|scale]] is the notes of a mode in a row, from the tonic to the same tonic an octave higher. There are eight degrees; the eighth repeats the first.</p>
<h3>Major</h3>
<p>The major scale follows one formula of steps: tone — tone — semitone — tone — tone — tone — semitone. A semitone is the smallest step, the very next key. A tone is two semitones. The short steps are between degrees III and IV and between VII and I. From C this formula falls on white keys only. From G it does not: the seventh note has to be F♯, otherwise there would be no semitone before the tonic. This is where the signs at the start of the line come from.</p>
${lab('majsteps')}
<h3>Stable and unstable degrees</h3>
<p>Degrees I, III and V are [[stable|stable]]: the music can stop on them, and it sounds calm. The other degrees — II, IV, VI and VII — are unstable: on them the music seems to hang in the air and ask to go on. Each one pulls to the nearest stable neighbour: VII up to I (the strongest pull), IV down to III, VI down to V, II down to I or up to III. VII and II, the neighbours of the tonic, are called [[leadingtone|leading notes]].</p>
${lab('pull')}
<p>Three degrees matter more than the rest: I is the tonic, IV the subdominant, V the dominant. The three main chords of a song are built on them.</p>
<h3>Tetrachords</h3>
<p>A [[tetrachord|tetrachord]] is four neighbouring notes of a scale. The major scale is made of two identical halves with the formula “tone — tone — semitone”, with a tone between them. In C major they are C-D-E-F and G-A-B-C. The upper half of C major is the lower half of G major; the new upper half adds F♯. In this way each next scale gets one more sharp. There are other tetrachords too: minor, Phrygian, harmonic.</p>
${lab('tetra')}
<h3>Minor: three forms</h3>
<p>In minor the short steps are in other places: between degrees II and III and between V and VI. Minor comes in three forms. Natural minor is plain, with nothing changed. Harmonic minor has a raised degree VII: it ends up a semitone below the tonic and pulls to it strongly, and a wide step with an “eastern” flavour appears between VI and VII. Melodic minor has raised VI and VII going up; in classical music it is played as natural minor going down.</p>
<p>Major and minor are easy to tell apart by the first three degrees. In major there are two tones in a row; in minor there is a semitone between II and III. There is also a mixed form — [[harmmaj|harmonic major]]: major with a lowered degree VI.</p>
${lab('minors')}
${key('A mode is not just a set of notes but the relations between them: the tonic, the calm and restless degrees and the pulls between them. That is why a melody played from another note is still recognisable.')}
`,
keys: `
<p>A [[keyT|key]] is a mode placed on a certain note: a tonic plus major or minor. C major, A minor and E♭ major are different keys. The guitar favours G, D, E and A, wind instruments favour flat keys, and a singer needs the key in which the song does not go too high or too low.</p>
<h3>Key signatures</h3>
<p>The sharps and flats of a key are written at the start of every line, right after the clef. This is the key signature: it applies to the whole piece. The order of sharps is always the same: F, C, G, D, A, E, B. The order of flats is the reverse: B, E, A, D, G, C, F. The signature makes the major key easy to find. With sharps, the last sharp is a semitone below the tonic. With flats, the second-to-last flat is the tonic itself. One flat means F major. Each signature fits two keys: a major key and its relative minor.</p>
${lab('keysig')}
<h3>Relative and parallel keys</h3>
<p>[[relkey|Relative keys]] are a major and a minor key with the same signature: C major and A minor, G major and E minor. The tonic of the minor key lies three semitones below the tonic of the major. The verse of a song may be in minor and the chorus in the relative major. [[parkey|Parallel keys]] are a major and a minor key with the same tonic: C major and C minor. Their signatures differ: C major has none, C minor has three flats.</p>
<h3>How many keys there are</h3>
<p>There are fifteen major keys and fifteen minor keys, with from zero to seven accidentals. But three pairs of them sound the same and are only written differently. For example, F♯ major and G♭ major are played on the same keys.</p>
<h3>The circle of fifths</h3>
<p>If the keys are lined up so that each next one starts a fifth (seven semitones) higher, the result is the [[circle|circle of fifths]]. Neighbours on the circle differ by only one accidental. Clockwise, sharps are added; anticlockwise, flats; after twelve steps the circle closes.</p>
${lab('circle')}
${tip('It is useful to play a scale or a chord around the circle, each time in the next key: this way all twelve keys are covered.')}
<h3>Related keys</h3>
<p>[[kinship|Closely related keys]] differ from a given key by no more than one accidental. C major has five: A minor (the relative), G major and E minor (the neighbour to the right on the circle and its relative), F major and D minor (the neighbour to the left and its relative). A move into a related key sounds smooth.</p>
${lab('related')}
<h3>One note — different degrees</h3>
<p>The same note plays different roles in different keys. C is degree I in C major, degree IV in G major, degree V in F major, and so on. Like a person who is a son at home and a manager at work.</p>
${lab('degreeof')}
<h3>Transposition</h3>
<p>To [[transpose|transpose]] means to move music into another key without changing the music itself. There are two ways. The first is by degrees: the degrees of the melody are worked out, and the same degrees are played in the new key. The second is by distance: every note is shifted by the same number of semitones. In the app a button does this, but transposing in one’s head helps when playing by ear.</p>
${lab('transp')}
${key('A key is a tonic and a mode. The accidentals follow from the scale formula, the circle of fifths shows the neighbours, and related keys are the closest and most natural moves.')}
`,
melody: `
<p>A [[melody|melody]] is a musical idea sung by one voice. What makes it expressive is not a single note but how the notes connect: where the melody goes — up or down, where it speeds up, where it pauses and rests.</p>
<h3>Motif, phrase, sentence, period</h3>
<p>A melody divides into parts, as speech divides into words and sentences. A [[motif|motif]] is the smallest piece, usually one bar or shorter, with one stress. Several motifs make a [[phrase|phrase]]. The end of a phrase is heard as a long note or a rest — where a singer takes a breath. Two or three phrases make a sentence, and two sentences make a [[period|period]], a complete musical idea. Usually the first sentence ends restlessly, like a question, and the second on the tonic, like an answer.</p>
${lab('period')}
<h3>Melodic cadences</h3>
<p>A [[mcad|cadence]] is the ending of a phrase. It can be recognised from the last notes of the melody, even without chords. A perfect cadence ends on the tonic (for example VII — I or II — I): it sounds like a full stop. An ending on degree III or V sounds calm, but not as final. A half cadence is a stop on an unstable degree, most often V or VII: the phrase sounds like a question and waits for more.</p>
${lab('cadmel')}
<h3>Sequence</h3>
<p>A [[sequenceT|sequence]] is the same motif repeated from another note, higher or lower, like steps on a staircase. If the motif moves by exactly the same distance each time, the melody passes from key to key. A sequence is one of the most common ways to develop a melody, in classical music and in jazz improvisation alike.</p>
${lab('sequence')}
<h3>Repeats and simple forms</h3>
<p>A [[reprise|repeat sign]] is two dots by a bar line: the section between such signs is played again. [[volta|Voltas]] are brackets with the numbers “1” and “2”: the first time, the ending under 1 is played; on the repeat, the ending under 2. D.C. (da capo) means “from the beginning”, D.S. (dal segno) means “from the sign 𝄋”. Al Coda means play up to the sign 𝄌 and jump to the [[coda|coda]], the ending of the piece.</p>
<p>The most common song form is [[verseform|strophic]]: the same music repeats with new words, and a chorus follows each verse.</p>
${key('A melody breathes in phrases. Playing it with meaning means knowing where a phrase begins, where it goes and how it ends: with a question or an answer.')}
`,
perform: `
<p>Notes show which sound to play and how long. How to play — fast or slow, loud or soft, smooth or detached — is written in words and signs above the notes. By tradition the words are in Italian: musicians all over the world understand them.</p>
<h3>Tempo</h3>
<p>[[tempo|Tempo]] is the speed of the music, that is, how many beats sound per minute. It is written at the start of a piece as a word, sometimes with a number for the metronome. The numbers in the lab are approximate.</p>
${lab('tempo')}
<p>The tempo can change within a piece. Accelerando — gradually faster. Ritardando and rallentando — gradually slower. A tempo — back to the previous tempo. Molto — very, più mosso — livelier, meno mosso — calmer. Rubato — free tempo: some notes are stretched a little, others hurried a little.</p>
${tip('A new piece is easier to learn below the marked tempo, adding a few beats on the metronome once a passage starts to come out clean.')}
<h3>Dynamics</h3>
<p>[[dynamics|Dynamics]] is loudness and its changes. The markings: pp — very soft, p — soft, mp — moderately soft, mf — moderately loud, f — loud, ff — very loud. A gradual increase is crescendo, drawn as an opening “hairpin”. A gradual decrease is diminuendo, drawn as a closing one. The sign &gt; above a note is an accent: that note stands out. Each phrase has one main note, and the others lead to it.</p>
${lab('dyn')}
<h3>Articulation</h3>
<p>[[articulation|Articulation]] is how notes are connected to each other. Legato — connected, one note flows into the next; a curve is drawn over such notes. Staccato — detached, short; a dot is placed above the note. Tenuto — hold the note for its full length; a short line is placed above it. String players also have pizzicato — playing by plucking. With different articulation one motif can sound tender or lively.</p>
${lab('artic')}
<h3>Ornaments</h3>
<p>[[ornament|Ornaments]] are small decorations of a note. A grace note is a short quick note before the main one, written as a small note. A [[trill|trill]] is a rapid alternation of a note with its upper neighbour. A mordent is main note, neighbour, main note again, in one quick move. A turn is a short “curl” of four notes around the main one. In jazz ornaments are hardly ever written — musicians add them on their own, by style.</p>
${lab('orn')}
<h3>Character</h3>
<p>The mood of the music is often written above the notes too: dolce — sweetly, cantabile — singing, espressivo — expressively, leggiero — lightly, maestoso — majestically, tranquillo — calmly, agitato — agitated, scherzando — playfully.</p>
${key('Tempo, dynamics, articulation and ornaments turn notes into music. The markings are in Italian, but the ear decides: the same notes can be played in very different characters.')}
`,
};
