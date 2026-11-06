// Остановить плавный ход параметра в момент t и оставить то значение, которое у него будет в t (не текущее).
// Нужно, когда отпускание запланировано заранее (арпеджиатор, студия): cancelScheduledValues + setValueAtTime(value)
// ставит в будущее сегодняшнее значение — громкость прыгает, слышен щелчок. Где cancelAndHoldAtTime нет —
// прежний путь (для t ≈ сейчас он верен)
export function holdAt(p, t) {
  if (p.cancelAndHoldAtTime) { try { p.cancelAndHoldAtTime(t); return; } catch { /* старый движок */ } }
  p.cancelScheduledValues(t);
  p.setValueAtTime(Math.max(p.value, 0.0001), t);
}
