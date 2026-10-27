// Учебник (en), часть 5: Тема. Главы — { id, t, s, src, h }; TERMS и S — дополнения к base.js.
// Текст — собственный пересказ: Левайн — «The Jazz Theory Book» (гл. 18–21), «Джазология» (лид-лист).
const lab = (id) => '{{lab:' + id + '}}';
const tip = (t) => '<aside class="btip"><b>At the instrument</b>' + t + '</aside>';
const key = (t) => '<aside class="bkey"><b>Key point</b>' + t + '</aside>';

export const S = {
  'dt.hint': 'A practice line: the chord as on the sheet and the melody note above it. For each symbol — correct, wrong or optional.',
  'dt.mel': 'melody {n}', 'dt.nomel': 'no melody', 'dt.v.ok': 'Correct', 'dt.v.err': 'Wrong', 'dt.v.opt': 'Optional', 'dt.asis': 'As on the sheet', 'dt.score': '{n} checked, {ok} correct', 'dt.reset': 'Start over',
  'dt.w0': 'The symbol has ♯11, but the melody has a natural 4 — the ♯11 clashes with it.', 'dt.w1': 'The m7 is not followed by a dominant a fourth higher, and the melody has no ♭7: this is a tonic minor. The seventh is optional; m6 or m(maj7) sounds better.',
  'dt.w2': 'The melody is the third of the chord, and the alteration does not disturb it: ♭9 is optional. On a V resolving down a fifth, ♭9 works well.', 'dt.w3': 'The melody is the third of the maj7: the symbol is correct.',
  'dt.w4': 'The melody has a natural 13, which alt does not contain. The dominant is not part of a ii–V and does not resolve down a fifth: 7♯11 is better.', 'dt.w5': 'The melody has a natural 5, which alt does not contain. The bar can also be split: two beats of C7, two of C7alt.',
  'dt.w6': 'The melody has a natural 6, found neither in Locrian nor in the sixth mode of melodic minor. m7 (Dorian) is better.', 'dt.w7': 'Not wrong, but a weak choice: a V in a ii–V resolving down a fifth sounds better with ♭9.',
  'dt.w8': 'The melody has a natural 9 — the ♭9 clashes with it.', 'dt.w9': 'The melody has ♭6, which clashes with the natural 6 of the m6 chord. Extending the previous dominant by two beats is better.',
  'dt.w10': 'There is no melody (second ending): all alterations are optional; a minor ii–V (ø and 7♭9) leads well into minor.', 'dt.w11': 'The D is held over from the previous bar: against F7alt it is a 13 against ♭13. F7♭9 is better — the half-whole scale contains the 13.',
  'dt.w12': 'The melody is the third: the symbol is correct.',
  'sq2.full': 'As on the sheet', 'sq2.short': 'Fold repeats', 'sq2.count': '{b} bars, {c} chords.', 'sq2.count2': '{b} bars and {c} chords instead of {b0} and {c0}.',
  'sq2.order': 'Order: A with ending 1 — A with ending 2 — B — A with ending 3.',
};

export const TERMS = {
  head: ['Head', 'the melody of a tune; also a new tune written on the harmony of another (a contrafact). There are composite heads and “heads on heads”.', 'tune'],
  realbook: ['Fake book', 'a collection of lead sheets (the Real Book and others); handy, but full of mistakes in melodies and chords.', 'tune'],
  sheetcheck: ['Correct, wrong, optional', 'checking a chord symbol on the sheet against the melody: roots and chord quality are reliable; tensions, alterations and the seventh of a minor chord are suspect.', 'tune'],
};

export const CH = [
{ id: 'tune', t: 'Tune from the lead sheet', s: 'What to look at first, sheet detective, learning a tune, heads, repertoire', src: 'levine,jazzology', h: `
<p>The tune is a musician’s main material: harmony, form, sound and improvisation all meet in it. Levine devotes several chapters to it: how to read a sheet, how to check it and how to memorize the tune.</p>
<h3>What to look at first</h3>
<p>(1) <b>The key signature applies only to the melody</b>, not to the chords: an F♯ over Gmaj7 is possible even with one flat in the signature. The first chord can be misleading about the key. (2) <b>Tempo</b> — usually in words: ballad, fast, medium. (3) <b>Straight or swing eighths</b>: markings such as “bossa”, “samba”, “Latin”, “jazz rock” mean straight; no marking means swing. (4) <b>Register</b>: the melody is written in the middle of the treble clef for easy reading, but it can be played in any register. An octave shift in mid-phrase sounds “conversational”, but should not be overdone.</p>
<p>How to comp from a [[leadsheet|lead sheet]] — see the chapter “Comping”.</p>
<h3>Where the mistakes come from</h3>
<p>The life of a standard has eight steps: the composer writes the song; hands it to a publisher; a hired pianist makes simplified sheet music for sale; the song is recorded; the recording is popular and the sheet music sells; jazz musicians change the chords; a famous jazz musician records the tune with new chords, an intro and an ending; that recording becomes the “new standard version”. So the “original chords” of a standard hardly exist, and sometimes several versions have to be known. Tunes by jazz musicians themselves are closer to the original — they were transcribed straight from the composer’s recording. There is only one reliable way: to take the tune off the record; [[realbook|fake books]] are handy, but full of mistakes.</p>
<h3>Sheet detective</h3>
<p>The main skill of the chapter is [[sheetcheck|checking a symbol against the melody]]. Roots and chord quality (major, minor, dominant) are taken as correct. Tensions, alterations and the seventh of a minor chord are suspect: each of them can be <b>correct, wrong or optional</b> — relative to the melody. A solo allows more freedom.</p>
${lab('detect')}
<p>The rules behind the answers: m7 without a dominant a fourth higher and without ♭7 in the melody is a tonic minor (m6, m(maj7)); an alteration over a melody note that is a chord tone is optional; ♯11 with a natural 4 in the melody is wrong; alt with a natural 5, 9 or 13 in the melody is wrong; ♭9 with a natural 9 is wrong; ø with a natural 6 is wrong; m6 with ♭6 is a clash; a note held through a chord change is checked against the new chord too. Without a melody, everything is optional.</p>
<h3>How to memorize a tune</h3>
<p>The order is <b>form → melody → chords</b>. Form: find the identical eight-bar sections and write them as repeats with endings — the sheet becomes half as long.</p>
${lab('squeeze')}
<p>Melody: played several times, then sung; learned phrase by phrase, noting where a phrase outlines the chord and where it approaches a note chromatically. The lyrics hold the melody together and explain what it is about; singing along with the recording helps. Chords: looking for the logic rather than cramming — ii–V pairs and their centres, tonic alternating with ii–V bar by bar, the pattern repeated a fourth higher in the bridge (an old commonplace of many standards).</p>
<h3>Heads</h3>
<p>A [[head|head]] is the melody of a tune, and in the narrow sense a new tune on the harmony of another, a [[contrafact|contrafact]]. Heads can be close to the original tune or far from it, composite (the A section from one tune, the bridge from another) and “heads on heads”, when a new tune is written on the harmony of a contrafact. Most heads are on rhythm changes and the blues: the repertoire is smaller than it seems.</p>
<h3>Repertoire</h3>
<p>One tune a week or every two weeks builds a core repertoire in a few months; this matches the weekly rhythm of practice. Some tunes are played in two or more keys — all of them are worth learning. One tune sounds different in different versions, and a “boring” tune can open up in someone else’s performance. Before playing, the form and the version are agreed on.</p>
${key('The sheet is a hint, the recording is the source. The melody is checked by ear, the symbol against the melody.')}
${tip('In the app: the song goes into “Songs” with its key and transposition, the recording into the media library; the player slows a recording down without changing pitch and loops a difficult passage with A–B.')}
` },
];
