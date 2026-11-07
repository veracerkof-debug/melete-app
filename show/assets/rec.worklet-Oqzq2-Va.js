// Захват входа для диктофона (браузер, Windows, Linux): отсчёты кусками по ~85 мс уходят в главный поток — без
// ScriptProcessor (тот работает в главном потоке и теряет звук, когда экран занят). Пауза и стоп — сообщениями.
class RecProcessor extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    const nc = (opts && opts.processorOptions && opts.processorOptions.nc) || 1;
    this.nc = nc; this.size = 4096; this.buf = Array.from({ length: nc }, () => new Float32Array(this.size)); this.p = 0; this.on = true;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.end = true; };
  }
  process(inputs) {
    if (!this.on) return false;
    if (this.end) { // стоп: отдать недописанный кусок и закончить
      if (this.p) this.port.postMessage(this.buf.map((b) => b.slice(0, this.p)));
      this.port.postMessage('done');
      this.on = false;
      return false;
    }
    const inp = inputs[0];
    const n = inp && inp.length ? inp[0].length : 128;
    let i = 0;
    while (i < n) {
      const m = Math.min(n - i, this.size - this.p);
      for (let c = 0; c < this.nc; c++) {
        const src = inp && inp.length ? inp[Math.min(c, inp.length - 1)] : null;
        if (src) this.buf[c].set(src.subarray(i, i + m), this.p); else this.buf[c].fill(0, this.p, this.p + m);
      }
      this.p += m; i += m;
      if (this.p === this.size) {
        this.port.postMessage(this.buf, this.buf.map((b) => b.buffer));
        this.buf = Array.from({ length: this.nc }, () => new Float32Array(this.size)); this.p = 0;
      }
    }
    return true;
  }
}
registerProcessor('melete-rec', RecProcessor);
