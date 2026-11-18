// Проверка связи: математика замера. Чистый модуль (экран — screens/linkcheck.js, серия — linkcheck.js).
// rtts — задержки туда-обратно в мс для ответивших; sent — сколько запросов отправлено (разница — потери).
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))] : 0);
const round1 = (x) => Math.round(x * 10) / 10;

export function summarize(rtts, sent = rtts.length) {
  const ok = rtts.filter((x) => Number.isFinite(x) && x >= 0), s = [...ok].sort((a, b) => a - b), n = s.length;
  const lost = Math.max(0, sent - n);
  // дрожание — как в RFC 3550: среднее изменение задержки между соседними ответами
  let j = 0;
  for (let i = 1; i < ok.length; i++) j += Math.abs(ok[i] - ok[i - 1]);
  const out = {
    sent, n, lost, lossPct: sent ? round1((lost / sent) * 100) : 0,
    min: n ? round1(s[0]) : 0, median: n ? round1(n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0,
    p95: round1(pct(s, 0.95)), max: n ? round1(s[n - 1]) : 0,
    jitter: ok.length > 1 ? round1(j / (ok.length - 1)) : 0,
  };
  out.verdict = verdict(out);
  return out;
}

// Вывод словами (ключ строки i18n 'lc.v.<verdict>'): по одной стороне круга — задержка туда примерно половина круга
//   great — хватает для быстрой игры на пианино (p95 до 30 мс и нет потерь)
//   ok    — пэды и аккорды хватает, быстрая игра на пределе (p95 до 70 мс, потери до 2 %)
//   poor  — только медленное: пэды, смена созвучий (p95 до 150 мс, потери до 5 %)
//   bad   — связь нестабильна для игры (иначе)
//   none  — ни один ответ не пришёл
export function verdict(s) {
  if (!s.n) return 'none';
  if (s.p95 <= 30 && s.lossPct === 0) return 'great';
  if (s.p95 <= 70 && s.lossPct <= 2) return 'ok';
  if (s.p95 <= 150 && s.lossPct <= 5) return 'poor';
  return 'bad';
}
