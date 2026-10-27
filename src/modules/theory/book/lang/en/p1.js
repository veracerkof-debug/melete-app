// Учебник (en), часть 1: Музыкальная грамота. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — собственный пересказ по книгам С. Е. Максимова и Г. А. Фридкина (см. SRC); примеры свои, стихи — общественное достояние.
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';

export const S = {
  // note names by letter; verse lines for the “Metre in verse” lab (stressed syllables in capitals, syllables separated by hyphens)
  'ov.fund': 'fundamental', 'ov.up': 'One by one', 'ov.six': 'First six together', 'ov.note': 'The nearest keys sound; the true 7th and 11th overtones are noticeably lower (¢ — hundredths of a semitone).',
  'oc.s0': 'Sub', 'oc.s1': 'Contra', 'oc.s2': 'Great', 'oc.s3': 'Small', 'oc.s4': '1-line', 'oc.s5': '2-line', 'oc.s6': '3-line', 'oc.s7': '4-line', 'oc.s8': '5-line',
  'oc.n0': 'Sub-contra octave', 'oc.n1': 'Contra octave', 'oc.n2': 'Great octave', 'oc.n3': 'Small octave', 'oc.n4': 'One-line octave', 'oc.n5': 'Two-line octave', 'oc.n6': 'Three-line octave', 'oc.n7': 'Four-line octave', 'oc.n8': 'Five-line octave',
  'oc.g0': 'of the sub-contra octave', 'oc.g1': 'of the contra octave', 'oc.g2': 'of the great octave', 'oc.g3': 'of the small octave', 'oc.g4': 'of the one-line octave (middle C)', 'oc.g5': 'of the two-line octave', 'oc.g6': 'of the three-line octave', 'oc.g7': 'of the four-line octave', 'oc.g8': 'of the five-line octave',
  'oc.sci': 'Scientific', 'oc.only': 'on the piano only', 'oc.do': 'The note C', 'oc.oct': 'Octave',
  'cl.treble': 'Treble', 'cl.bass': 'Bass', 'cl.alto': 'Alto', 'cl.tenor': 'Tenor', 'cl.up': 'Higher', 'cl.down': 'Lower', 'cl.line': 'Position', 'cl.onl': 'on a line', 'cl.btw': 'in a space',
  'rg.voices': 'Voices', 'rg.instr': 'Instruments', 'rg.note': 'Ranges are approximate: professionals go further. Instruments are shown at sounding pitch (guitar and double bass sound an octave below written).',
  'rg.sop': 'Soprano', 'rg.mez': 'Mezzo-soprano', 'rg.alt': 'Alto (contralto)', 'rg.ten': 'Tenor', 'rg.bar': 'Baritone', 'rg.bas': 'Bass',
  'rg.pno': 'Piano', 'rg.gtr': 'Guitar', 'rg.bgt': 'Bass guitar', 'rg.vln': 'Violin', 'rg.vla': 'Viola', 'rg.vcl': 'Cello', 'rg.cb': 'Double bass', 'rg.fl': 'Flute', 'rg.cl': 'Clarinet', 'rg.asx': 'Alto saxophone', 'rg.tsx': 'Tenor saxophone', 'rg.tpt': 'Trumpet', 'rg.tbn': 'Trombone',
  'du.hint': 'beat tempo', 'du.w': 'Whole', 'du.h': 'Halves', 'du.q': 'Quarters', 'du.e': 'Eighths', 'du.s': 'Sixteenths', 'du.dot': 'Dotted', 'du.tie': 'Ties', 'du.trip': 'Triplets', 'du.punct': 'Dotted rhythm', 'du.rest': 'Rests',
  'rg.p.q': 'Quarters', 'rg.p.e': 'Eighths', 'rg.p.dot': 'Dotted', 'rg.p.sync': 'Syncopation', 'rg.p.trip': 'Triplets', 'rg.p.off': 'Offbeats', 'rg.p.ch': 'Charleston', 'rg.p.mix': 'Mixed',
  'rg.even': 'Straight', 'rg.swing': 'Swing', 'rg.swingNote': 'Written as straight eighths, played with swing: the first eighth of each pair is longer, the second falls where the third note of a triplet would be.', 'rg.hint': 'cells can be tapped to make a rhythm of one’s own',
  'mt.count': 'one two three four five six seven eight nine ten eleven twelve', 'mt.size': 'Time signature',
  'mt.simple': 'Simple metre: one strong beat per bar.', 'mt.compound': 'Compound metre: equal simple metres joined — a strong beat and relatively strong ones.', 'mt.mixed': 'Mixed metre: different simple metres joined — the beat groups are unequal.',
  'se.dia': 'Diatonic semitone', 'se.chr': 'Chromatic semitone', 'se.tone': 'Whole tone',
  'en.note': 'One key — several names. Which one to write depends on the key and the direction of the melody.',
  'to.mel': 'Tune', 'to.row': 'Pitch set', 'to.deg': 'Degrees', 'to.tonic': 'Tonic',
  'to.note.mel': 'On which note does the melody come to rest? The “Tonic” button plays it.', 'to.note.row': 'Each note of the tune once, in order of pitch: this is the pitch set of the mode.', 'to.note.deg': 'Degrees from the tonic: the melody is a path through the degrees and can be sung from any note.',
  'ms.h': 'semitone', 'ms.w': 'tone', 'ms.signs': 'To keep the formula, accidentals were needed: {s} — these are the key signature of the key.', 'ms.none': 'From C the formula falls on white keys only — no accidentals.',
  'pu.st': 'stable', 'pu.harm': 'harmonic', 'pu.stable': 'A stable degree: the melody can rest on it.', 'pu.go': '{a} pulls towards {b}: the triad, the degree and its resolution sound.', 'pu.or': ' or ', 'pu.around': 'Circling the tonic',
  'te.next': 'Upper tetrachord — down', 'te.reset': 'Back to C major', 'te.low': 'lower', 'te.up': 'upper', 'te.sig': 'New scale — {n}: to keep a semitone below the tonic, degree VII became {s}.', 'te.c': 'C major: two identical “tone — tone — semitone” tetrachords a tone apart.',
  'te.kinds': 'Kinds of tetrachord', 'te.maj': 'major', 'te.min': 'minor', 'te.phr': 'Phrygian', 'te.harm': 'harmonic',
  'mi.maj': 'Major', 'mi.nat': 'Natural minor', 'mi.harm': 'Harmonic minor', 'mi.mel': 'Melodic minor', 'mi.melDown': 'Melodic descending (classical)', 'mi.hmaj': 'Harmonic major',
  'mi.note': 'Altered degrees are in red. Tapping a row plays the scale up (melodic descending — from the top down).',
  'ks.order': 'Order', 'ks.sharp': 'The last sharp ({last}) is degree VII of the major key; the tonic is a semitone higher: {t}.', 'ks.flat': 'The second-to-last flat ({pen}) is the tonic of the major key: {t}.', 'ks.one': 'One flat — F major (simply worth memorising).', 'ks.none': 'No accidentals — C major and A minor.',
  're.par': 'relative', 're.dom': 'dominant', 're.domPar': 'relative of the dominant', 're.sub': 'subdominant', 're.subPar': 'relative of the subdominant', 're.more': 'Also close', 're.same': 'parallel', 're.hSub': 'minor subdominant', 're.hDom': 'major dominant',
  're.note': 'A tap plays the tonic and the chosen key: moves between related keys sound smooth.',
  'dg.deg': 'Degree', 'dg.natural': '(natural)', 'dg.note': '{n} is the same key in every row, but its role differs. Tapping a row plays the tonic of that key and this note.',
  'tr.by': 'shift: {iv}', 'tr.up': 'up', 'tr.down': 'down',
  'pe.half': 'half', 'pe.full': 'full', 'pe.mot': 'Motifs', 'pe.phr': 'Phrases', 'pe.sen': 'Sentences', 'pe.first': 'First sentence',
  'pe.note.mot': 'Motifs — one bar each: short units with one strong beat.', 'pe.note.phr': 'Phrases — two bars each: every one ends on a long note.', 'pe.note.sen': 'Two four-bar sentences: the first ends on degree V (a question), the second on the tonic (an answer). Together they form a period.',
  'cm.full': 'Perfect', 'cm.imp': 'Imperfect', 'cm.half': 'Half (V)', 'cm.half2': 'Half (VII)',
  'cm.n.full': 'Perfect authentic: II → I, the melody arrives on the tonic — a full stop.', 'cm.n.imp': 'Imperfect: ends on the third of the tonic — stable, but not completely.', 'cm.n.half': 'Half: a stop on degree V — a question waiting for an answer.', 'cm.n.half2': 'Half on degree VII — the strongest pull onwards, to the tonic.',
  'sq.dia': 'Diatonic', 'sq.mod': 'Modulating', 'sq.down': 'Down', 'sq.up': 'Up',
  'sq.n.dia': 'The motif moves through the degrees of C major: its intervals change slightly, the key stays.', 'sq.n.mod': 'The motif moves by exactly a tone: each link is in a new key.',
  'tm.Largo': 'broad, very slow', 'tm.Lento': 'slow, drawn out', 'tm.Adagio': 'slow, at ease', 'tm.Andante': 'unhurried, at walking pace', 'tm.Andantino': 'a little faster than andante', 'tm.Moderato': 'moderate', 'tm.Allegretto': 'lively', 'tm.Allegro': 'fast', 'tm.Vivace': 'brisk', 'tm.Presto': 'very fast',
  'tm.note': 'The numbers are rough guides (beats per minute); a tap plays eight beats at this tempo.',
  'dy.pp': 'very soft', 'dy.p': 'soft', 'dy.mp': 'moderately soft', 'dy.mf': 'moderately loud', 'dy.f': 'loud', 'dy.ff': 'very loud',
  'dy.note': 'A tap plays four notes at this level. How clear the difference is depends on the piano sound chosen in the settings.',
  'ar.leg': 'Legato', 'ar.nonleg': 'Non legato', 'ar.stacc': 'Staccato', 'ar.ten': 'Tenuto', 'ar.acc': 'Accent', 'ar.marc': 'Marcato', 'ar.slur': 'In the score legato is marked by a slur over the phrase.',
  'ar.n.leg': 'Note into note, without gaps.', 'ar.n.nonleg': 'Each note separate, but not shortened.', 'ar.n.stacc': 'Short and detached — a dot above the note.', 'ar.n.ten': 'Held for the full value — a line above the note.', 'ar.n.acc': 'The note is emphasised — the sign >.', 'ar.n.marc': 'Sharp and emphasised — the sign ^.',
  'or.grace': 'Acciaccatura', 'or.appog': 'Appoggiatura', 'or.trill': 'Trill', 'or.mord': 'Mordent', 'or.mordL': 'Lower mordent', 'or.turn': 'Turn', 'or.ferm': 'Fermata', 'or.play': 'How it sounds', 'or.slow': 'Slowly',
  'or.n.grace': 'Short grace note: a quick note before the main one, taken from its value; the stem is crossed.', 'or.n.appog': 'The appoggiatura takes half the value of the main note.', 'or.n.trill': 'Rapid alternation with the upper neighbour for the whole value.',
  'or.n.mord': 'Main — upper neighbour — main, quickly, on the beat.', 'or.n.mordL': 'A crossed mordent uses the lower neighbour.', 'or.n.turn': 'Four notes: upper, main, lower, main.', 'or.n.ferm': 'The note is held longer than written — as long as the performer decides.',
};

export const TERMS = {
  pitchT: ['Pitch', 'the property of a sound that depends on the frequency of vibration: the faster the vibration, the higher the sound; A4 is 440 Hz.', 'sound'],
  duration: ['Duration', 'how long a note sounds; in notation it is relative: whole, half, quarter, eighth, sixteenth.', 'rhythm'],
  timbre: ['Timbre', 'the colour of a sound that tells one voice or instrument from another; it depends on the overtones.', 'sound'],
  overtone: ['Overtones', 'partials above the fundamental at 2, 3, 4… times its frequency; their mix gives the timbre.', 'sound'],
  staff: ['Staff', 'five lines for writing notes; the lines are counted from the bottom up, ledger lines go above and below.', 'sound'],
  octaveR: ['Octave (on the keyboard)', 'the notes from one C to the next C; keyboard octaves are named sub-contra, contra, great, small, one-line… five-line, or numbered: C4 is middle C.', 'sound'],
  clef: ['Clef', 'a sign at the start of a staff that fixes the pitch of the lines: treble (G), bass (F), C clefs (alto, tenor).', 'sound'],
  score: ['Score', 'the written parts of a whole ensemble or orchestra, each on its own staff.', 'sound'],
  range: ['Range', 'the span of a voice or instrument from its lowest note to its highest; tessitura is the part of the range where a piece lies.', 'sound'],
  rest: ['Rest', 'a sign of silence of a given duration; a whole rest also means a full bar of silence.', 'rhythm'],
  dot: ['Dot', 'lengthens a note or rest by half its value.', 'rhythm'],
  tie: ['Tie', 'a curve between notes of the same pitch that joins them into one sound; over notes of different pitch it is a slur (legato).', 'rhythm'],
  fermata: ['Fermata', 'a sign that makes a note or rest last longer than written.', 'rhythm'],
  triplet: ['Triplet', 'three equal notes in the time of two of the same kind.', 'rhythm'],
  dotted: ['Dotted rhythm', 'a “long dotted note — short note” pair, most often a dotted eighth and a sixteenth.', 'rhythm'],
  swing8: ['Swing eighths', 'eighths played unevenly: the first longer and heavier, the second shorter, roughly like triplet notes.', 'rhythm'],
  metre: ['Metre', 'the regular alternation of strong and weak beats.', 'meter'],
  bar: ['Bar', 'the stretch from one strong beat to the next; the bar line stands before the strong beat.', 'meter'],
  timesig: ['Time signature', 'the fraction at the start of a piece: how many beats in a bar (top) and which note value is the beat (bottom).', 'meter'],
  anacrusis: ['Anacrusis', 'an incomplete bar before the first strong beat; also called an upbeat or pickup.', 'meter'],
  syncopation: ['Syncopation', 'shifting the accent from a strong beat to the preceding weak one.', 'meter'],
  semitone: ['Semitone and tone', 'a semitone is the smallest distance between notes (adjacent keys); a tone is two semitones.', 'pitch'],
  accidental: ['Accidentals', 'sharp, flat, double sharp, double flat, natural: they raise, lower or restore a note.', 'pitch'],
  enharmonic: ['Enharmonic equivalence', 'notes, intervals or keys equal in pitch but different in name: C♯ = D♭.', 'pitch'],
  temperament: ['Equal temperament', 'a tuning in which the octave is divided into twelve equal semitones.', 'pitch'],
  lad: ['Mode', 'a system of relations between notes around a central one, the tonic: major, minor, folk modes.', 'mode'],
  tonicT: ['Tonic (note)', 'the central, most stable note of a mode — degree I.', 'mode'],
  stable: ['Stable degrees', 'degrees I, III and V; the unstable ones (II, IV, VI, VII) pull towards the nearest stable degree.', 'mode'],
  leadingtone: ['Leading note', 'a degree next to the tonic: VII (lower leading note) or II (upper leading note).', 'mode'],
  tetrachord: ['Tetrachord', 'four notes by step within a fourth; the major scale is two identical tetrachords a tone apart.', 'mode'],
  harmmaj: ['Harmonic major', 'major with a lowered degree VI.', 'mode'],
  keyT: ['Key', 'a mode at a given pitch: tonic plus kind of mode (C major, A minor).', 'keys'],
  relkey: ['Relative keys', 'a major and a minor key with the same key signature: C major and A minor.', 'keys'],
  parkey: ['Parallel keys', 'a major and a minor key with the same tonic: C major and C minor.', 'keys'],
  kinship: ['Closely related keys', 'keys that differ from a given key by no more than one accidental.', 'keys'],
  transpose: ['Transposition', 'moving music into another key — by degrees or by interval.', 'keys'],
  melody: ['Melody', 'a musical idea expressed in a single voice.', 'melody'],
  motif: ['Motif', 'the smallest complete unit of a melody, usually with one strong beat.', 'melody'],
  phrase: ['Phrase', 'a part of a melody from caesura to caesura; several phrases form a sentence.', 'melody'],
  period: ['Period', 'a complete musical idea, usually of two sentences: question and answer.', 'melody'],
  mcad: ['Melodic cadence', 'the ending of a phrase judged by the last degrees of the melody: perfect (on the tonic), imperfect (on III or V), half (on an unstable note).', 'melody'],
  sequenceT: ['Sequence', 'repetition of a figure from another degree: diatonic (by degrees of the mode) or modulating (exactly by an interval).', 'melody'],
  reprise: ['Repeat', 'a sign to repeat part of a piece; reprise is also the section where the opening music returns.', 'melody'],
  volta: ['Volta', 'a numbered bracket that sets the ending of a section on the first and second time through.', 'melody'],
  coda: ['Coda', 'the closing section of a piece.', 'melody'],
  verseform: ['Strophic form', 'the same music with new words in each verse, often with a chorus.', 'melody'],
  tempo: ['Tempo', 'the speed of performance — beats per minute; marked in words (Andante, Allegro) or by metronome.', 'perform'],
  dynamics: ['Dynamics', 'loudness and its changes: pp, p, mp, mf, f, ff, crescendo, diminuendo.', 'perform'],
  articulation: ['Articulation', 'ways of producing and connecting notes: legato, non legato, staccato, tenuto, accent.', 'perform'],
  ornament: ['Ornaments', 'small embellishments of a note: grace note, trill, mordent, turn.', 'perform'],
  trill: ['Trill', 'rapid alternation of a note with its upper neighbour.', 'perform'],
};

export const NN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Verse: t — label, l — line (stressed syllables in capitals, syllables separated by hyphens), n — explanation
export const VERSE = [
  { t: 'Trochee', l: 'TY-ger TY-ger, BURN-ing BRIGHT', n: 'Stress on every other syllable, starting on the stress: “TY-ger | TY-ger” — duple metre, each foot like a bar of 2/4; the last foot is cut short. (William Blake)' },
  { t: 'Iamb', l: 'the CUR-few TOLLS the KNELL of PART-ing DAY', n: 'Also duple, but the line begins with an unstressed syllable — an anacrusis (upbeat). (Thomas Gray)' },
  { t: 'Dactyl', l: 'THIS is the FOR-est pri-ME-val, the MUR-mur-ing PINES and the HEM-locks', n: 'Stress on every third syllable: triple metre, like a waltz in 3/4. (Henry Wadsworth Longfellow)' },
  { t: 'Anapest', l: '’twas the NIGHT be-fore CHRIST-mas, and ALL through the HOUSE', n: 'Triple metre with a two-syllable anacrusis: the line starts on an upbeat. (Clement Clarke Moore)' },
];

export const CH = [
{ id: 'sound', t: 'Sound and its notation', s: 'Properties of sound, overtones, notes, clefs, octaves, ranges', src: 'maksimov,fridkin', h: `
<p>Music is the art of sound, and its laws are best learned not in the abstract but with an instrument at hand and one’s own voice: the final judge of any rule is the ear. This part of the book is the alphabet: how sound works, how it is written down and named.</p>
<h3>Four properties of sound</h3>
<p>A musical sound has four properties: [[pitchT|pitch]], [[duration|duration]], loudness and [[timbre|timbre]]. Pitch depends on the frequency of vibration: the faster, the higher. The reference pitch for tuning is A4 (the A above middle C), 440 vibrations per second (440 Hz): an orchestra tunes to it, and so does the app’s tuner. Notation shows two properties at once: pitch by the position of the note on the staff, duration by its shape. Loudness and character are written in words and signs — they are the subject of the last chapter of this part.</p>
<h3>Overtones</h3>
<p>The sound of a string, a trumpet or a voice is not a single frequency. Together with the fundamental sound partials — [[overtone|overtones]] — at 2, 3, 4 and more times its frequency. Separately they are hardly audible, but their mix is what tells a violin from a flute: this is timbre. The overtone series is always the same: octave, fifth, fourth, major third, minor third, then ever smaller intervals. The first six notes of the series form a major triad — nature itself suggests the most stable chord.</p>
${lab('overtones')}
<h3>The staff</h3>
<p>Notes are written on the [[staff|staff]] — five parallel lines counted from the bottom up. A note sits on a line or in a space; above and below the staff it goes on short ledger lines. The higher the note on the staff, the higher the sound. Half notes, quarters and shorter values have a stem: below the third line it goes up on the right of the notehead, on the third line and above it goes down on the left.</p>
<h3>Note names</h3>
<p>There are seven basic notes: C, D, E, F, G, A, B; after that the names repeat in a cycle. On the keyboard they are easy to find by the black keys: C is the white key to the left of a group of two black keys, F is to the left of a group of three.</p>
<table class="bktab"><tr><th>Solfège</th><td>do</td><td>re</td><td>mi</td><td>fa</td><td>sol</td><td>la</td><td>ti (si)</td></tr><tr><th>Letter</th><td>C</td><td>D</td><td>E</td><td>F</td><td>G</td><td>A</td><td>B (H)</td></tr></table>
<p>Besides letters, notes are named by syllables. In Italy, France, Spain, Russia and Latin America solfège is “fixed”: do is always C; in English-speaking teaching do often means the tonic of the current key (“movable do”), and the seventh syllable is ti. The app and jazz use letters: C D E F G A B. The German tradition differs: B natural is H, and the letter B means B♭; a sharp is marked by the ending -is (Fis — F♯), a flat by -es (Des — D♭; exceptions are Es, As and B). This is worth knowing when reading old scores or playing with European musicians: “B” in a German score and “B” on a jazz lead sheet are different notes.</p>
<h3>Octaves</h3>
<p>The notes from one C to the next form an [[octaveR|octave]]. A piano has 88 keys — seven full octaves and four more notes. In the traditional (Helmholtz) naming each octave has a name: in the middle of the keyboard is the one-line octave; below it the small, great, contra and sub-contra octaves; above it the two-line, three-line, four-line and five-line octaves (of the last, the piano has only C). Scientific pitch notation numbers the octaves instead: middle C is C4, the A above it is A4. This notation is used in the tuner, in MIDI and in the app’s studio.</p>
${lab('octaves')}
<h3>Clefs</h3>
<p>The same place on the staff can stand for different notes — the [[clef|clef]] at the start of the line decides. The treble clef (G clef) fixes G4 on the second line: it is drawn starting with a curl around that line. The bass clef (F clef) puts F3 on the fourth line, between its two dots. C clefs mark middle C: the alto clef on the third line (used for the viola), the tenor clef on the fourth (upper parts of the cello, bassoon, trombone). Middle C is written on the first ledger line below the treble staff and on the first ledger line above the bass staff: this is where the two clefs meet.</p>
${lab('clefs')}
${tip('To avoid piles of ledger lines, a high melody in the bass clef is rewritten in the treble clef (and vice versa) or written an octave lower with the sign 8va. A tenor part is traditionally written in the treble clef but sounds an octave lower than written — just like the guitar.')}
<h3>Staves and the score</h3>
<p>A part for voice, guitar or a wind instrument is written on one staff. Piano, accordion and harp use two, joined by a brace: the right hand is usually in the treble clef, the left in the bass. A song with accompaniment uses three: voice and piano. All the parts of an ensemble or orchestra written one below another make a [[score|score]]: it may have twenty staves or more.</p>
<h3>Range and register</h3>
<p>[[range|Range]] is the distance from the lowest note of a voice or instrument to the highest. Within the range there are registers — low, middle and high, each with its own timbre. Tessitura is the part of the range where a particular piece lies: a song may fit a singer’s range and still be uncomfortable if it stays near the edge for long. Singing voices: female — soprano, mezzo-soprano, alto (contralto); male — tenor, baritone, bass.</p>
${lab('ranges')}
${key('A note is two signs at once: its place on the staff is pitch, its shape is duration. The clef decides which sound stands in which place.')}
` },
{ id: 'rhythm', t: 'Note values and rests', s: 'Whole, half, quarter; dot, tie, triplet; straight and swing eighths', src: 'maksimov,fridkin', h: `
<p>Pitch says which sound, [[duration|duration]] says how long it lasts. In notation duration is not absolute: a whole note does not last “two seconds” but as long as four counted beats at the given tempo. So note values are ratios: each one is half as long as the previous.</p>
<h3>The basic division</h3>
<p>Whole (open notehead, no stem) = two halves (open, with stem) = four quarters (filled, with stem) = eight eighths (filled, one flag) = sixteen sixteenths (two flags). The more flags, the shorter the note; a filled note is always shorter than an open one. Each row of the lab plays on a tap — against steady beats.</p>
${lab('durs')}
<p>It helps to have two skills at once: splitting a long value into short ones (a half is two quarters or four eighths) and merging short ones into a long one (three eighths played as one sound make a dotted quarter). Then rhythm is read not note by note but in groups.</p>
<h3>Rests</h3>
<p>Silence also has an exact length — these are [[rest|rests]]. Each note value has its rest: the whole rest is a block hanging from the fourth line, the half rest a block sitting on the third line; quarter, eighth and sixteenth rests have their own signs. A whole rest also means a full bar of silence in any time signature. A rest is not a “hole” but punctuation: the phrase breathes on it. The most common rhythmic mistake is not counting a rest to its end.</p>
<h3>Dot, tie, fermata</h3>
<p>A [[dot|dot]] to the right of a note lengthens it by half: a dotted half is three quarters, a dotted quarter is three eighths. A [[tie|tie]] — a curve between two notes of the same pitch — joins them into one sound: this is how a duration is written that does not fit into a bar or a beat. A curve over notes of different pitch is no longer a tie but a slur, a sign of connected playing (legato). A [[fermata|fermata]] — a half circle with a dot over a note or rest — makes the sound last longer than written, as long as the performer decides.</p>
<h3>Beaming</h3>
<p>Eighths and sixteenths within one beat are joined by a common beam instead of separate flags — so the eye sees the beats of the bar at once. Old vocal scores wrote notes on different syllables separately; today vocal parts are beamed by beats too.</p>
<h3>Triplets and dotted rhythm</h3>
<p>A [[triplet|triplet]] is three equal notes in the time of two of the same kind: three eighths with a bracket and the figure 3 sound in the time of one quarter. There are also quintuplets (five in the time of four) and other irregular divisions. A common mistake is to play a triplet unevenly, lengthening the first or last note: all three are equal.</p>
<p>[[dotted|Dotted rhythm]] is a “dotted eighth and sixteenth” pair. A reliable way to play it precisely is to count four sixteenths per beat silently and play on the first and the fourth.</p>
<h3>Straight and swing eighths</h3>
<p>Here music theory meets jazz. In classical and Latin American music pairs of eighths are even. In jazz eighths are written the same way but played [[swing8|with swing]]: the first eighth of the pair is longer and heavier, the second shorter and lighter — roughly like the first and third notes of a triplet. The exact ratio depends on tempo and style: in a slow ballad the swing is deeper, at fast tempos the eighths are almost even. The rhythm grid plays both ways; its cells can be tapped to build a rhythm of one’s own.</p>
${lab('rgrid')}
${tip('Rhythm is learned most reliably with the body: tapping the beats with the foot and the rhythm with the hands or with syllables (“ta — ti-ti”). Slowly at first, with the app’s metronome, and only then faster.')}
${key('Note values are ratios: each is half the previous one, a dot adds half, a triplet divides the beat into three. A rest is counted as precisely as a note.')}
` },
{ id: 'meter', t: 'Metre, time signature, bar', s: 'Strong and weak beats, time signatures, conducting, anacrusis, syncopation', src: 'maksimov,fridkin', h: `
<p>Rhythm is a pattern of durations. Beneath it runs a steady pulse of beats, and the beats are not equal: some sound weightier (strong), others lighter (weak). The regular alternation of strong and weak beats is called [[metre|metre]].</p>
<h3>Metre in verse</h3>
<p>The strong beat is easiest to hear in verse — there the stressed syllable plays its role. “Tyger Tyger, burning bright” — stress on every other syllable: a duple metre. “This is the forest primeval” — stress on every third syllable: a triple metre. If the line is divided by bar lines before each stressed syllable, bars appear: a poetic foot and a musical bar are built the same way. And if a line begins with an unstressed syllable (“The curfew tolls the knell of parting day”), that syllable falls before the first bar line — this is an anacrusis.</p>
${lab('verse')}
<h3>Bar and time signature</h3>
<p>A [[bar|bar]] is the stretch from one strong beat to the next. The bar line is placed before the strong beat, and a double bar line at the end of the piece. The [[timesig|time signature]] is written at the start as a fraction: the top number is how many beats in a bar, the bottom one which note value is the beat. 3/4 is three quarter-note beats; 6/8 is six eighth-note beats.</p>
<h3>Simple, compound, mixed</h3>
<p>A simple metre has one strong beat: 2/4, 3/4, 3/8. A compound metre joins equal simple ones: 4/4 = 2/4 + 2/4 (the third beat is “relatively strong”; this metre is also marked with the letter C), 6/8 = 3/8 + 3/8, 9/8 and 12/8 are three and four groups of three eighths. A mixed metre combines different simple ones: 5/4 = 3 + 2 or 2 + 3, 7/8 = 2 + 2 + 3. There is also changing metre — it shifts in the course of a piece, as in long-breathed folk songs. A C with a vertical stroke is alla breve: a bar of 2/2, counted in halves, “one — two”, usually at a brisk tempo.</p>
${lab('meter')}
<h3>Conducting patterns</h3>
<p>Conductors and ensemble musicians show the beats with the hand: “one” is always down, the last beat up. In three — down, right, up; in four — down, left, right, up. The diagram above lights up as the count goes; repeating it with the hand is the best way to feel a metre.</p>
<h3>The counting unit</h3>
<p>If a melody moves in eighths, it is convenient to count in eighths: “one-and, two-and”. The shorter the values, the more careful the count: sixteenths are counted “one-e-and-a”.</p>
<h3>Anacrusis</h3>
<p>An [[anacrusis|anacrusis]] (upbeat, pickup) is an incomplete bar at the start of a piece or phrase, before the first strong beat. In 2/4 an upbeat usually starts on the second beat, in 3/4 on the second or third; eighths in an upbeat are counted “two-and”. The length of the upbeat is usually “made up” in the last bar of the piece.</p>
<h3>Syncopation</h3>
<p>[[syncopation|Syncopation]] shifts the accent from a strong beat to the preceding weak one: a note starts on a weak spot and is held through the strong one. Syncopation occurs within a bar and across the bar line (with a tie); a rest on a strong beat gives a similar effect. In jazz syncopation is the basis of phrasing; a chord played an eighth before the beat is called an anticipation (see the chapter “Comping”).</p>
${lab('syncop')}
${key('The time signature tells how many beats are in a bar and which of them are strong; rhythm is what happens on top of the beats. Metre first, then rhythm: the beats should be felt before the notes are read.')}
` },
{ id: 'pitch', t: 'Tone, semitone, accidentals', s: 'Distances between notes, sharps and flats, enharmonics, temperament', src: 'maksimov,fridkin', h: `
<p>Between adjacent piano keys — a white and a black one, or two white keys with no black key between them — lies the smallest distance of Western music: the [[semitone|semitone]]. Two semitones make a tone. On the white keys there are semitones in only two places: E — F and B — C; all other adjacent white keys are a tone apart.</p>
<h3>Accidentals</h3>
<p>To raise or lower a note, [[accidental|accidentals]] are written before it: the sharp ♯ raises by a semitone, the flat ♭ lowers by a semitone, the double sharp 𝄪 and double flat 𝄫 by a tone, the natural ♮ cancels a sign. An altered degree keeps its name: F♯ is still “F”, only higher. Key signature accidentals apply to the whole piece and in every octave; accidentals in the music apply only to the end of the bar and only to that note in that octave.</p>
${lab('semis')}
<h3>Twelve notes in an octave</h3>
<p>An octave has twelve semitones: seven natural degrees and five derived ones. Each black key has at least two names: C♯ and D♭, F♯ and G♭. Notes of the same pitch with different names are called [[enharmonic|enharmonically equivalent]]. White keys have other names too: E♯ sounds as F, C♭ as B, B𝄪 as C♯. Which name to choose depends on the key and the direction of the melody — more on this in the chapters on scales and chords.</p>
${lab('enh')}
<h3>Diatonic and chromatic semitones</h3>
<p>A semitone is spelled in two ways. A diatonic semitone lies between adjacent letters (E — F, C — D♭); a chromatic one between a letter and its own altered form (F — F♯). On the piano they sound the same, but in notation they are different things: in a scale each letter appears once, so in G major the seventh degree is F♯, not G♭. In the same way a diatonic tone (C — D) is distinguished from a chromatic one (C — C𝄪).</p>
<h3>Temperament</h3>
<p>Piano, accordion and guitar are tuned in [[temperament|equal temperament]]: the octave is divided into twelve equal semitones — which is why they can play in any key. Singers and string players, whose pitch is not fixed, intonate more flexibly: a leading note pulling to the tonic is taken slightly higher, a minor third slightly lower, and their semitones come out unequal. That is why a choir or string quartet without piano sounds “sweeter” than tempered tuning — and why the ear matters more than the key.</p>
${tip('It is useful to sing a chromatic scale from C to C — up and down by semitones — and check it with the app’s tuner: even semitones in the voice are good training for intonation.')}
${key('A semitone is adjacent keys, a tone is two keys apart. An accidental changes the pitch but not the name of the degree; one key can have several names, and the name is chosen by the key.')}
` },
{ id: 'mode', t: 'Mode and scale', s: 'Tonic, degrees, major and minor, stability and tendencies, tetrachords', src: 'maksimov,fridkin', h: `
<p>Every song has a central note to which everything returns — the [[tonicT|tonic]]. It is easy to hear: a melody often begins and almost always ends on the tonic, and after it no continuation is wanted. The system of relations between notes around the tonic — which of them are stable, which pull to their neighbours — is called a [[lad|mode]]. The two main modes of European music are major and minor: in German Dur (“hard”) and Moll (“soft”).</p>
<h3>A pitch set from a tune</h3>
<p>A mode can be “extracted” straight from a melody. Each of its notes, written out once and arranged by pitch, gives a pitch set. Once the tonic is found (by ear: the note where the melody comes to rest) and the degrees are numbered from it in Roman numerals, the melody reads as a path through the degrees of the mode. Such a melody can be sung from any note: what matters is the degrees, not the note names.</p>
${lab('tonic')}
<p>A [[scale|scale]] is the notes of a mode in order from the tonic to its repetition an octave higher: eight degrees, the eighth repeating the first. A complete scale rarely appears in melodies, but its fragments are found in almost any singable tune.</p>
<h3>Major</h3>
<p>The major scale follows the formula: tone — tone — semitone — tone — tone — tone — semitone. The semitones lie between degrees III and IV and between VII and I. From C the formula falls on white keys only. Built from G, the seventh degree turns out to be F♯ — otherwise there would be no semitone below the tonic. Hence the key signature: it is not invented but follows from the formula.</p>
${lab('majsteps')}
<h3>Stable and unstable degrees</h3>
<p>The notes of the tonic triad — degrees I, III and V — are [[stable|stable]]: a melody can rest on them. The others — II, IV, VI, VII — are unstable and pull to the nearest stable one: VII up to I (by a semitone, the strongest pull), IV down to III, VI down to V, II both down to I and up to III. The neighbours of the tonic, VII and II, are called [[leadingtone|leading notes]]. When a stable note is surrounded by its unstable neighbours (VII — II — I), the tonic is circled and sounds like a goal.</p>
${lab('pull')}
<p>Three degrees of the mode are primary: I is the tonic, IV the subdominant, V the dominant. The primary chords are built on them; functions are covered in detail in the chapter “Keys and functions”.</p>
<h3>Tetrachords</h3>
<p>A [[tetrachord|tetrachord]] is four notes by step within a perfect fourth. The major scale is two identical “tone — tone — semitone” tetrachords joined by a tone. The upper tetrachord of C major (G — A — B — C) is the lower tetrachord of G major; to complete G major, a new tetrachord with F♯ is needed on top. Repeating this step, each new key lies a fifth higher and has one more sharp — this is how the circle of fifths arises. There are four kinds of tetrachord: major, minor (tone — semitone — tone), Phrygian (semitone — tone — tone) and harmonic (semitone — augmented second — semitone).</p>
${lab('tetra')}
<h3>Minor: three forms</h3>
<p>In minor the semitones lie between degrees II and III and between V and VI. Natural minor has the degrees unaltered. Harmonic minor raises VII: a leading note and a strong pull to the tonic appear, and between VI and VII lies the characteristic augmented second. Melodic minor raises VI and VII going up; in classical music it is sung as natural minor going down (a natural cancels the raised notes). In jazz melodic minor is the same up and down — it is a scale in its own right, covered in the part “Basics of harmony”.</p>
<p>Major and minor can be told apart by the first three degrees: in major there is no semitone among them, in minor a semitone lies between II and III. There is also a mixed mode — [[harmmaj|harmonic major]]: major with a lowered degree VI. It gives major a minor colour: its subdominant is minor (in C major — F — A♭ — C).</p>
${lab('minors')}
${key('A mode is not a set of notes but a set of relations: the tonic, stable and unstable degrees, tendencies. A melody sung from another note stays itself because it keeps its degrees.')}
` },
{ id: 'keys', t: 'Keys', s: 'Key signatures, relative and parallel keys, circle of fifths, related keys, transposition', src: 'maksimov,fridkin', h: `
<p>A [[keyT|key]] is a mode at a given pitch: the tonic plus the kind of mode. C major, A minor, E♭ major are different keys. Why so many? A new idea in music often appears in a new key. The tuning of an instrument makes some keys easier than others: guitar favours G, D, E and A, wind instruments favour flat keys. A voice favours the key in which the song lies in the middle of the range — which is why different singers sing the same song in different keys.</p>
<h3>Key signatures</h3>
<p>The accidentals of a key are written at the start of every line — this is the key signature. The order of sharps is always the same: F, C, G, D, A, E, B; the order of flats is the reverse: B, E, A, D, G, C, F. Finding the major key from the signature is simple: the last sharp is degree VII (the tonic is a semitone higher), the second-to-last flat is the tonic itself (and one flat means F major). Each signature belongs to two keys — a major key and its relative minor.</p>
${lab('keysig')}
<h3>Relative and parallel keys</h3>
<p>[[relkey|Relative keys]] are a major and a minor key with the same signature: C major and A minor, G major and E minor. The tonic of the minor key is degree VI of the major, a minor third below its tonic. Relative keys often alternate even within one song. [[parkey|Parallel keys]] are a major and a minor key with a common tonic: C major and C minor; they differ in degrees III, VI and VII and in the number of accidentals (C minor has three flats).</p>
<h3>How many keys there are</h3>
<p>Seven natural tonics, five derived ones and three enharmonic names give fifteen major and fifteen minor keys with up to seven accidentals. Three pairs sound the same — these are enharmonically equivalent keys: B major = C♭ major, F♯ major = G♭ major, C♯ major = D♭ major (and their relative minors).</p>
<h3>The circle of fifths</h3>
<p>Arranging the keys so that each next one is a fifth higher gives the [[circle|circle of fifths]]: neighbouring keys differ by one accidental, and after twelve steps the circle closes. Clockwise sharps are added, anticlockwise flats. The circle explains why tetrachords “pass” from scale to scale and shows the neighbours of any key.</p>
${lab('circle')}
<h3>Related keys</h3>
<p>[[kinship|Closely related keys]] differ from a given key by no more than one accidental. C major has five: A minor (relative), G major and E minor (the dominant and its relative), F major and D minor (the subdominant and its relative). There is also kinship through harmonic modes: for a major key — the key of the minor subdominant (C major — F minor), for a minor key — that of the major dominant (C minor — G major). These are the keys music most often moves to when it modulates.</p>
${lab('related')}
<h3>One note — different degrees</h3>
<p>Any note can be any degree: C is degree I of C major, II of B♭ major, III of A♭ major, IV of G major, V of F major, VI of E♭ major, VII of D♭ major. When a note changes its role, the key changes — modulation rests on this.</p>
${lab('degreeof')}
<h3>Transposition</h3>
<p>To [[transpose|transpose]] is to move music into another key without changing anything in it. There are two ways: by degrees (find the degrees of the melody in the old key and the same degrees in the new one) and by interval (shift every note by the same distance). A singer needs a song a tone lower; a clarinettist needs a part written a tone above concert pitch. In the app songs are transposed with one button, but the ability to do it in one’s head is the basis of playing by ear.</p>
${lab('transp')}
${key('A key is a tonic and a mode. The accidentals follow from the scale formula, the circle of fifths shows the neighbours, and related keys are the nearest paths for modulation.')}
` },
{ id: 'melody', t: 'Melody and musical structure', s: 'Motif, phrase, sentence, period; cadences, sequence, repeats', src: 'maksimov,fridkin', h: `
<p>A [[melody|melody]] is a musical idea expressed in a single voice. Its material is scale fragments, chord tones, leaps by intervals; but what is expressive is not a single note or a single duration but their relation: where the melody moves, where it slows down, where it rests. A melody of the natural degrees of the mode only is called diatonic; raised and lowered degrees give it a chromatic colour — but with too many of them the key loses clarity.</p>
<h3>Motif, phrase, sentence, period</h3>
<p>A melody divides like speech. A [[motif|motif]] is the smallest complete unit, usually with one strong beat. Several motifs form a [[phrase|phrase]]; the end of a phrase is heard as a stop on a long note or a rest, the start of a new one often as a repeat of the pattern. The boundary between phrases is a caesura; it is marked with the sign ∨, like a comma. Two or three phrases make a sentence, two sentences a [[period|period]]: a complete musical idea. Usually the first sentence ends unstably (a question), the second on the tonic (an answer). A period may stay in one key or modulate — if the second sentence arrives in a new key.</p>
${lab('period')}
<h3>Melodic cadences</h3>
<p>A [[mcad|cadence]] is the ending of a phrase. It can be identified from the melody alone, without chords — by its last degrees. A perfect cadence ends on the tonic (VII — I, II — I, V — I). An imperfect one ends on the third or fifth of the tonic (II — III, IV — III, VI — V). A half cadence is a stop on an unstable note, most often degree V or VII: the phrase sounds like a question. Chord cadences are covered in the chapter “Keys and functions”.</p>
${lab('cadmel')}
<h3>Sequence</h3>
<p>A [[sequenceT|sequence]] is the repetition of a melodic (or harmonic) figure from another degree. In a diatonic (tonal) sequence the motif moves through the degrees of the mode and its intervals change slightly: a major third may become a minor one. In a modulating (real) sequence the motif moves each time by the same distance — by tones, by minor thirds — and passes from key to key. Sequences may rise or fall; they are one of the main ways to develop a melody — in classical music and in jazz improvisation alike.</p>
${lab('sequence')}
<h3>Repeats and simple forms</h3>
<p>To avoid writing music out twice, repeat signs are used. A [[reprise|repeat sign]] — two dots by a bar line — calls for a section to be repeated. [[volta|Voltas]] — brackets “1” and “2” — give different endings on the first and second time through. D.C. (da capo) means repeat from the beginning, D.S. (dal segno) from the sign 𝄋, al Coda up to the sign 𝄌 and then on to the [[coda|coda]], the ending of the piece.</p>
<p>Songs may be in one, two or three parts; the most common song form is [[verseform|strophic]]: the same music repeats with new words, often with a chorus after each verse (verse — chorus). Jazz forms — the blues, AABA and others — are covered in the chapter “Forms”.</p>
${key('A melody breathes in phrases. Playing it meaningfully means knowing where a phrase begins, where it goes and how it ends: with a question or an answer.')}
` },
{ id: 'perform', t: 'Tempo, dynamics, articulation, ornaments', s: 'Italian markings, dynamics, legato and staccato, ornaments', src: 'maksimov,fridkin', h: `
<p>Notes fix pitch and duration, while how to sound — fast or slow, loud or soft, connected or detached — is written in words and signs above the notes. By tradition in Italian: musicians all over the world understand these words the same way.</p>
<h3>Tempo</h3>
<p>[[tempo|Tempo]] is the speed of performance, the number of beats per minute. It is given at the start of a piece by a word, sometimes together with a metronome number. The numbers in the lab are rough guides: theory textbooks do not give them, and editions differ; the meaning of the word matters more than the number.</p>
${lab('tempo')}
<p>Changes of tempo: accelerando — speeding up, ritardando and rallentando — slowing down, ritenuto — holding back, a tempo — back to the previous tempo. Qualifying words: più mosso — more movement, meno mosso — less movement, molto — very, non troppo — not too much, assai — very, con moto — with movement. Tempo rubato — freely in time: some notes are stretched a little, others hurried. An exact tempo is set by the metronome — in the app it is always at hand.</p>
<h3>Dynamics</h3>
<p>[[dynamics|Dynamics]] is loudness and its changes: pp (pianissimo) — very soft, p (piano) — soft, mp — moderately soft, mf — moderately loud, f (forte) — loud, ff — very loud. A gradual increase is crescendo (an opening “hairpin”), a decrease diminuendo (a closing one); poco a poco — little by little, morendo — dying away. Sforzando (sf) is a sudden emphasis on one note, an accent (&gt;) a stress. Messa di voce is a smooth swell and fade on one long note. A thought worth remembering: in a phrase only the note that carries the meaning stands out, the rest are subordinate to it.</p>
${lab('dyn')}
<h3>Articulation</h3>
<p>[[articulation|Articulation]] is the way notes are produced and connected. Legato — connected, note into note (a slur over the notes); non legato — not connected, but not shortened either; staccato — detached (a dot above the note); tenuto — held, full value (a line); accent (&gt;) and marcato (^) — with emphasis. Strings have pizzicato (plucked) and playing with a mute (con sordino); many instruments have glissando (sliding through the notes) and tremolo (rapid repetition of a note). The same motif with different articulations sounds like several different characters.</p>
${lab('artic')}
<h3>Ornaments</h3>
<p>[[ornament|Ornaments]] are small embellishments of a note. The acciaccatura (short grace note) is a quick note before the main one, taken from its value (a small note with a crossed stem). The appoggiatura (long grace note) usually takes half the value of the main note. A [[trill|trill]] is a rapid alternation of a note with its upper neighbour. A mordent is main, neighbour, main again: uncrossed — with the upper neighbour, crossed — with the lower. A turn is four notes around the main one: upper, main, lower, main. Ornaments are written with signs or spelled out in small notes; in jazz they are rarely written — they are added according to style.</p>
${lab('orn')}
<h3>Character</h3>
<p>The character of performance is also often written above the notes: dolce — sweetly, cantabile — singing, espressivo — expressively, leggiero — lightly, maestoso — majestically, grazioso — gracefully, sostenuto — sustained, scherzando — playfully, agitato — agitated, tranquillo — calmly, sotto voce — under the breath.</p>
${key('Tempo, dynamics, articulation and ornaments are what turn notes into music. They are written in Italian, but the ear decides: the same text can be played in a dozen characters.')}
` },
];
