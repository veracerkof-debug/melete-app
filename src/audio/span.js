// Запись отрезка звука приложения по часам контекста: src — узел (выход шины инструмента после её эффектов), start —
// время контекста, с; n — кадров. Отвод только слушает шину: звук инструмента не меняется и не переподключается.
// → { done: Promise<Float32Array>, stop() } — stop отдаёт записанное до сих пор (остальное — тишина)
const READY = new WeakMap();
export async function recordSpan(c, src, start, n) {
  if (!READY.has(c)) READY.set(c, c.audioWorklet.addModule(new URL('./wl/span.worklet.js', import.meta.url)));
  await READY.get(c);
  const node = new AudioWorkletNode(c, 'melete-span', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { start, n } });
  const mute = c.createGain();
  mute.gain.value = 0;
  src.connect(node);
  node.connect(mute).connect(c.destination); // молчит, но участвует в расчёте — иначе поток к нему не приходит
  const done = new Promise((res) => {
    node.port.onmessage = (e) => {
      try { src.disconnect(node); } catch { /* */ }
      try { node.disconnect(); mute.disconnect(); } catch { /* */ }
      res(e.data);
    };
  });
  return { done, stop: () => node.port.postMessage('stop') };
}
