// Отрезок звука по часам контекста (лупер: звук инструмента приложения — слоем, точно в круг петли). Пишет моно
// (среднее каналов) с кадра start на n кадров; кончилось или «stop» — отдаёт буфер одним сообщением и засыпает.
class SpanProcessor extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const p = (o && o.processorOptions) || {};
    this.a = Math.round((p.start || 0) * sampleRate); this.n = Math.max(1, p.n | 0); this.buf = new Float32Array(this.n); this.done = false;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.finish(); };
  }
  finish() { if (this.done) return; this.done = true; this.port.postMessage(this.buf, [this.buf.buffer]); }
  process(inputs) {
    if (this.done) return false;
    const inp = inputs[0] || [], nc = inp.length, len = nc ? inp[0].length : 128, f0 = currentFrame;
    for (let i = 0; i < len; i++) {
      const p = f0 + i - this.a;
      if (p < 0) continue;
      if (p >= this.n) { this.finish(); return false; }
      if (!nc) continue;
      let s = 0;
      for (let c = 0; c < nc; c++) s += inp[c][i];
      this.buf[p] = s / nc;
    }
    return true;
  }
}
registerProcessor('melete-span', SpanProcessor);
