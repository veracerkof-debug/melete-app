// Запись → другая скорость и/или высота без смены второго (Signalsmith Stretch — тот же движок, что в плеере медиатеки),
// офлайн, быстрее реального времени. Для студии: клип-запись «растянуть / замедлить / сменить тональность» — новый файл
// рядом, исходник не трогается (третий принцип: запись не теряется). → AudioBuffer (стерео)
let loading = null;
const lib = () => loading || (loading = import('./vendor/signalsmith-stretch.mjs').then((m) => m.default));

// buf — AudioBuffer; rate — скорость (2 — вдвое быстрее и короче), semi — полутоны
export async function stretchRender(buf, { rate = 1, semi = 0 } = {}) {
  rate = Math.max(0.25, Math.min(4, +rate || 1)); semi = Math.max(-24, Math.min(24, +semi || 0));
  const sr = buf.sampleRate, outLen = Math.ceil((buf.duration / rate) * sr);
  const make = await lib();
  // запас на задержку узла: сначала узнаём её на маленьком контексте, затем — рабочий
  const tail = Math.ceil(sr * 0.6), oc = new OfflineAudioContext(2, outLen + tail, sr);
  const node = await make(oc, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  node.connect(oc.destination);
  const L = new Float32Array(buf.getChannelData(0)), R = new Float32Array(buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0));
  await node.addBuffers([L, R]);
  let lat = 0;
  try { const l = await node.latency(); if (typeof l === 'number' && l > 0 && l < 2) lat = l; } catch { /* */ }
  await node.schedule({ active: true, input: 0, output: 0, outputTime: 0, rate, semitones: semi });
  const out = await oc.startRendering();
  // задержка узла — срезать спереди; длина — ровно под новую скорость
  const skip = Math.min(out.length - outLen, Math.round(lat * sr)), res = new AudioBuffer({ numberOfChannels: 2, length: outLen, sampleRate: sr });
  for (let ch = 0; ch < 2; ch++) res.copyToChannel(out.getChannelData(ch).subarray(Math.max(0, skip), Math.max(0, skip) + outLen), ch);
  return res;
}
