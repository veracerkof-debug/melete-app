// Кошелёк для главного экрана: общий баланс по записям кошелька (money.html, elachiston.money.draft)
import { readJSON } from './data.js';

export const MONEY_KEY = 'elachiston.money.draft';

// null — записей нет
export function walletBalance() {
  const db = readJSON(MONEY_KEY);
  if (!db || !Array.isArray(db.recs) || !db.recs.length) return null;
  return db.recs.reduce((a, r) => a + (r.k === 'i' ? r.a : -r.a), 0);
}
