// Главный экран: база значков — линейная графика 24×24. Название — строка icon.<id> (i18n.js), греческое слово — el.
// Обычные значки — для всех; библейские символы (church: true) — только в церковном режиме.

const f = (n) => +n.toFixed(2);

function starPath(points, R, r, cx = 12, cy = 12, rot = -90) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const rad = ((rot + (i * 180) / points) * Math.PI) / 180;
    const rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f(cx + rr * Math.cos(rad))} ${f(cy + rr * Math.sin(rad))}`;
  }
  return `<path d="${d}z"/>`;
}

function rays(n, r1, r2, cx = 12, cy = 12, rot = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    d += `M${f(cx + r1 * Math.cos(a))} ${f(cy + r1 * Math.sin(a))}L${f(cx + r2 * Math.cos(a))} ${f(cy + r2 * Math.sin(a))}`;
  }
  return `<path d="${d}"/>`;
}

const letter = (ch, size = 17) =>
  `<text x="12" y="12" dy=".35em" text-anchor="middle" font-size="${size}" font-family="'Melete Greek', serif" fill="currentColor" stroke="none">${ch}</text>`;

const leaf = (x, y, ang, len = 4.2, w = 1.7) => {
  const a = (ang * Math.PI) / 180;
  const ex = x + len * Math.cos(a), ey = y + len * Math.sin(a);
  const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
  const mx = (x + ex) / 2, my = (y + ey) / 2;
  return `M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}z`;
};

export const ICONS = [

  // — Обычные значки —
  { id: 'phone', el: 'φωνή',
    svg: `<path d="M6.5 3.5h3l1.5 4-2 1.2a11 11 0 0 0 6.3 6.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>` },
  { id: 'message', el: 'ἐπιστολή', svg: `<path d="M4 5h16v11H9l-5 4z"/>` },
  { id: 'camera', el: 'εἰκών', svg: `<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>` },
  { id: 'music', el: 'ᾠδή', svg: `<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>` },
  { id: 'note', el: 'μέλος', svg: `<circle cx="9" cy="17" r="3"/><path d="M12 17V4c2 2 5 2.5 6 5"/>` },
  { id: 'search', el: 'ζήτει', svg: `<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>` },
  { id: 'sliders', el: 'τάξις', svg: `<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>` },
  { id: 'mail', el: 'γράμμα', svg: `<path d="M3.5 6h17v12h-17zM3.5 6.5l8.5 7 8.5-7"/>` },
  { id: 'pin', el: 'τόπος', svg: `<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>` },
  { id: 'calendar', el: 'ἡμέρα', svg: `<path d="M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4"/>` },
  { id: 'alarm', el: 'ὥρα', svg: `<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 2M5 4.5l-2 2M19 4.5l2 2"/>` },
  { id: 'globe', el: 'κόσμος', svg: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>` },
  { id: 'image', el: 'εἰκών', svg: `<path d="M4 5h16v14H4zM4 16l5-5 4 4 2.5-2.5L20 17"/><circle cx="15.5" cy="9" r="1.5"/>` },
  { id: 'grid', el: 'πάντα', svg: `<path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z"/>` },

  // — Нейтральные: техника, работа и учёба, творчество, жизнь (DECISIONS 2026-10-29); g — группа в выборе, k — слова поиска —
  { id: 'tools', g: 'tech', k: 'инструменты ключ гаечный tools wrench', svg: `<path d="M15 4.5a4.5 4.5 0 0 0-4.2 6.1L4.5 16.9a1.8 1.8 0 0 0 2.6 2.6l6.3-6.3A4.5 4.5 0 0 0 19.5 9l-2.8 2.8-2.6-.7-.7-2.6 2.8-2.8A4.5 4.5 0 0 0 15 4.5z"/>` },
  { id: 'gear', g: 'tech', k: 'шестерёнка настройки система gear settings', svg: `<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/>` + rays(8, 6.5, 9.2, 12, 12, 22.5) },
  { id: 'ai', g: 'tech', k: 'ии ai нейросеть искусственный интеллект чат gpt claude', svg: starPath(4, 8, 2, 10.5, 13.5) + starPath(4, 3.6, 0.9, 18.5, 5.5) },
  { id: 'chip', g: 'tech', k: 'чип процессор техника chip cpu', svg: `<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>` },
  { id: 'code', g: 'tech', k: 'код программирование разработка code dev', svg: `<path d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13.5 5l-3 14"/>` },
  { id: 'terminal', g: 'tech', k: 'терминал консоль terminal shell', svg: `<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15h4.5"/>` },
  { id: 'laptop', g: 'tech', k: 'ноутбук компьютер laptop computer', svg: `<rect x="4.5" y="5" width="15" height="10.5" rx="1.5"/><path d="M2.5 19h19"/>` },
  { id: 'cloud', g: 'tech', k: 'облако диск хранилище cloud drive', svg: `<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6 3.8 3.8 0 0 1-.4 7.4z"/>` },
  { id: 'download', g: 'tech', k: 'загрузки скачать файлы download', svg: `<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>` },
  { id: 'folder', g: 'tech', k: 'папка файлы folder files', svg: `<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>` },
  { id: 'shield', g: 'tech', k: 'защита безопасность vpn shield security', svg: `<path d="M12 3 5 6v5.5c0 4.3 3 7.7 7 9.5 4-1.8 7-5.2 7-9.5V6z"/>` },
  { id: 'lock', g: 'tech', k: 'замок пароли lock password', svg: `<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>` },
  { id: 'link', g: 'tech', k: 'ссылка link', svg: `<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>` },
  { id: 'chart', g: 'tech', k: 'график статистика финансы chart stats', svg: `<path d="M4 4v16h16M8 16v-4M12 16V8M16 16v-6"/>` },
  { id: 'calc', g: 'tech', k: 'калькулятор calculator', svg: `<rect x="5.5" y="3" width="13" height="18" rx="2"/><path d="M8.5 6.5h7v3h-7z"/><circle cx="9" cy="13" r=".7" fill="currentColor"/><circle cx="12" cy="13" r=".7" fill="currentColor"/><circle cx="15" cy="13" r=".7" fill="currentColor"/><circle cx="9" cy="16.5" r=".7" fill="currentColor"/><circle cx="12" cy="16.5" r=".7" fill="currentColor"/><circle cx="15" cy="16.5" r=".7" fill="currentColor"/>` },
  { id: 'bulb', g: 'tech', k: 'идеи лампочка ideas bulb', svg: `<path d="M9.5 17.5h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>` },
  { id: 'flask', g: 'tech', k: 'наука химия колба science lab', svg: `<path d="M9.5 3.5h5M10.5 3.5V9L5 18.5a1.5 1.5 0 0 0 1.3 2.2h11.4a1.5 1.5 0 0 0 1.3-2.2L13.5 9V3.5M7.5 14.5h9"/>` },
  { id: 'briefcase', g: 'work', k: 'работа портфель work job business', svg: `<rect x="3.5" y="7.5" width="17" height="12" rx="1.5"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 13h17"/>` },
  { id: 'study', g: 'work', k: 'университет учёба студент шапка university study school', svg: `<path d="M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v5c3 2.2 8 2.2 11 0v-5M21.5 9v5"/>` },
  { id: 'books', g: 'work', k: 'книги библиотека чтение books library reading', svg: `<path d="M5 4.5h3v15H5zM9.5 4.5h3v15h-3zM14 5.5l2.9-.8 3.9 14.5-2.9.8z"/>` },
  { id: 'notebook', g: 'work', k: 'заметки блокнот notes notebook', svg: `<rect x="5.5" y="3.5" width="13" height="17" rx="1.5"/><path d="M9 3.5v17M11.5 8h4.5M11.5 11.5h4.5"/>` },
  { id: 'pencil', g: 'work', k: 'карандаш писать редактор pencil write edit', svg: `<path d="M15.5 4.5l4 4-11 11h-4v-4zM13.5 6.5l4 4"/>` },
  { id: 'checklist', g: 'work', k: 'дела задачи список todo tasks', svg: `<path d="M4 6.5 5.5 8l3-3M4 12.5 5.5 14l3-3M4 18.5 5.5 20l3-3M11.5 7H20M11.5 13H20M11.5 19H20"/>` },
  { id: 'doc', g: 'work', k: 'документ файл doc document pdf', svg: `<path d="M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12h6M9 15.5h6"/>` },
  { id: 'translate', g: 'work', k: 'перевод языки translate language', svg: `<path d="M4 5.5h9M8.5 4v1.5M11 5.5c-1 4-3.5 7-6.5 8.5M6.5 9c1.5 2.5 3.5 4 5.5 5M13 20l3.5-9 3.5 9M14.2 17h4.6"/>` },
  { id: 'people', g: 'work', k: 'люди команда контакты people team contacts', svg: `<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M15 14.2a4.5 4.5 0 0 1 5.5 4.3"/>` },
  { id: 'chat', g: 'work', k: 'чаты общение мессенджеры chat messengers', svg: `<path d="M3.5 5h11v8h-6L5 16v-3H3.5zM17.5 9h3v8H19v2.5L16 17h-5v-2"/>` },
  { id: 'news', g: 'work', k: 'новости газета news', svg: `<path d="M4.5 5h12v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19zM16.5 9h3v10a1.5 1.5 0 0 1-3 0M7.5 8.5h6M7.5 12h6M7.5 15.5h4"/>` },
  { id: 'palette', g: 'media', k: 'творчество рисование палитра art creative palette', svg: `<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-1 1.5-2.2-.5-1.3.3-2.3 1.6-2.3h1.9a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>` },
  { id: 'brush', g: 'media', k: 'кисть дизайн brush design', svg: `<path d="M19.5 4.5c-3 1.5-7 5.5-8.5 8l1.5 1.5c2.5-1.5 6.5-5.5 8-8.5zM10 14c-2.5 0-4 1.5-4 4 0 1-.8 1.8-1.8 2 3.5 1 7.3-.5 7.3-4.5z"/>` },
  { id: 'guitar', g: 'media', k: 'гитара музыка guitar music', svg: `<path d="M14 10l6-6M18.5 3.5l2 2M13.5 10.5a3.6 3.6 0 0 0-5 0c-.8.8-.7 1.7-1.8 2.2-2.2.9-3.4 2.8-2 5.1 1 1.7 3 2.7 5 1.6.9-.5 1.2-1.8 2.2-2.6.8-.6 1.7-.4 2.4-1.2a3.6 3.6 0 0 0-.8-5.1z"/><circle cx="10" cy="14" r="1.3"/>` },
  { id: 'piano', g: 'media', k: 'клавиши пианино piano keys', svg: `<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M7.7 19v-5M12 19v-5M16.3 19v-5M6.5 5v9h2.4V5M10.8 5v9h2.4V5M15.1 5v9h2.4V5"/>` },
  { id: 'mic', g: 'media', k: 'микрофон запись вокал mic record', svg: `<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>` },
  { id: 'headphones', g: 'media', k: 'наушники слушать подкасты headphones podcast', svg: `<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.5"/><rect x="16.5" y="14" width="4" height="6" rx="1.5"/>` },
  { id: 'video', g: 'media', k: 'видео камера кино video film', svg: `<rect x="3.5" y="5.5" width="13" height="13" rx="2"/><path d="M16.5 10l4-2.5v9l-4-2.5"/>` },
  { id: 'tv', g: 'media', k: 'телевизор фильмы сериалы tv movies', svg: `<rect x="3" y="5" width="18" height="12.5" rx="1.5"/><path d="M8 21h8M12 17.5V21"/>` },
  { id: 'gamepad', g: 'media', k: 'игры геймпад games', svg: `<path d="M7 8h10a4 4 0 0 1 4 4.5l-.7 4a2.5 2.5 0 0 1-4.3 1.2L14.5 16h-5L8 17.7a2.5 2.5 0 0 1-4.3-1.2l-.7-4A4 4 0 0 1 7 8zM8 10.5v3M6.5 12h3"/><circle cx="15.5" cy="11" r=".9"/><circle cx="17.3" cy="13" r=".9"/>` },
  { id: 'trophy', g: 'media', k: 'кубок достижения спорт trophy', svg: `<path d="M8 4.5h8v5a4 4 0 0 1-8 0zM8 6.5H5V8a3 3 0 0 0 3 3M16 6.5h3V8a3 3 0 0 1-3 3M12 13.5V17M9.5 17h5v3.5h-5z"/>` },
  { id: 'cart', g: 'life', k: 'покупки магазин корзина shop cart', svg: `<path d="M3 4h2.2l2.3 11h10.3L20 7.5H6"/><circle cx="9" cy="19.3" r="1.3"/><circle cx="16.5" cy="19.3" r="1.3"/>` },
  { id: 'wallet', g: 'life', k: 'кошелёк деньги банк wallet money bank', svg: `<path d="M4 7.5h15A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18V6.5a2 2 0 0 1 2-2h10.5v3"/><circle cx="16.5" cy="13.5" r="1"/>` },
  { id: 'card', g: 'life', k: 'карта банк оплата card bank pay', svg: `<rect x="3" y="6" width="18" height="12.5" rx="1.5"/><path d="M3 10h18M6.5 15h4"/>` },
  { id: 'car', g: 'life', k: 'машина такси транспорт car taxi', svg: `<path d="M4 16.5V12l2-5h12l2 5v4.5zM4 12h16M6.5 16.5V19M17.5 16.5V19"/><circle cx="7.7" cy="14.2" r=".6"/><circle cx="16.3" cy="14.2" r=".6"/>` },
  { id: 'bus', g: 'life', k: 'автобус транспорт bus transit', svg: `<path d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5V17H4V6.5A2.5 2.5 0 0 1 6.5 4zM4 11.5h16M7 17v2.5M17 17v2.5"/><circle cx="8" cy="14.3" r=".6"/><circle cx="16" cy="14.3" r=".6"/>` },
  { id: 'plane', g: 'life', k: 'самолёт путешествия билеты travel plane', svg: `<path d="M21 4 3 11l7 2.5L12.5 21z"/><path d="M10 13.5 21 4"/>` },
  { id: 'health', g: 'life', k: 'здоровье аптека таблетки health pill', svg: `<path d="M10.2 4.8a4.2 4.2 0 0 1 6 6l-5.4 5.4a4.2 4.2 0 0 1-6-6zM7.5 8l6 6"/>` },
  { id: 'fitness', g: 'life', k: 'спорт фитнес гантели sport fitness gym', svg: `<path d="M6.5 7.5v9M3.5 10v4M17.5 7.5v9M20.5 10v4M6.5 12h11"/>` },
  { id: 'food', g: 'life', k: 'еда доставка рестораны food delivery', svg: `<path d="M7 3v18M4.5 3v4.5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2 1.4-3 4-3 7v3h3"/>` },
  { id: 'coffee', g: 'life', k: 'кофе кафе coffee cafe', svg: `<path d="M5 9.5h11V14a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M9 3.5c-.8 1 .8 2 0 3M12.5 3.5c-.8 1 .8 2 0 3"/>` },
  { id: 'weather', g: 'life', k: 'погода weather', svg: `<path d="M9 2.5v1.5M3.5 9H2M4.5 4.5l1 1M13.5 4.5l-1 1M6 11.2A3.5 3.5 0 1 1 12.4 7.5"/><path d="M8 19.5h9a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.3 1.3 2.9 2.9 0 0 0 0 5.7z"/>` },
  { id: 'clock', g: 'life', k: 'часы время clock time', svg: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>` },
  { id: 'timer', g: 'life', k: 'таймер секундомер timer stopwatch', svg: `<circle cx="12" cy="13.5" r="7"/><path d="M10 2.5h4M12 2.5v4M12 13.5l3-3"/>` },
  { id: 'compass', g: 'life', k: 'компас навигация compass navigation', svg: `<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>` },
  { id: 'bookmark', g: 'life', k: 'закладки избранное bookmark saved', svg: `<path d="M7 3.5h10v17l-5-4-5 4z"/>` },
  { id: 'flag', g: 'life', k: 'флаг цели flag goals', svg: `<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>` },
  { id: 'user', g: 'life', k: 'профиль аккаунт я user profile', svg: `<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>` },
  // — Церковь (церковный режим) —
  { id: 'church', g: 'faith', church: true, k: 'церковь храм church', svg: `<path d="M12 2.5v4M10.3 4.2h3.4M12 6.5l5 4V21H7V10.5zM4 21h16M10.5 21v-3.5a1.5 1.5 0 0 1 3 0V21"/>` },
  { id: 'worship', g: 'faith', church: true, k: 'прославление поклонение хвала руки worship praise', svg: `<path d="M8 21v-5.5L5 9.8a1.2 1.2 0 0 1 2.1-1.1L9.5 13V4.8a1.2 1.2 0 0 1 2.4 0V14M16 21v-5.5l3-5.7a1.2 1.2 0 0 0-2.1-1.1L14.5 13V4.8a1.2 1.2 0 0 0-2.4 0"/>` },
  { id: 'bible', g: 'faith', church: true, k: 'библия писание bible scripture', svg: `<path d="M5.5 4.5A1.5 1.5 0 0 1 7 3h11.5v15H7a1.5 1.5 0 0 0-1.5 1.5zM5.5 19.5A1.5 1.5 0 0 0 7 21h11.5v-3M12 6.5v7.5M9.5 9h5"/>` },
  // — Знаки Христа —
  { id: 'chirho', el: 'Χριστός', church: true,
    svg: `<path d="M12 3v18M12 3h3a3 3 0 0 1 0 6h-3M7.5 8.5l9 9M16.5 8.5l-9 9"/>` },
  { id: 'alphaomega', el: 'Ἄλφα καὶ Ὦ', church: true,
    svg: `<path d="M2.5 18L6.5 6l4 12M4 14h5M13 18h2.6v-1.3a4.6 4.6 0 1 1 3.8 0V18h2.1"/>` },
  { id: 'ichthys', el: 'ἰχθύς', church: true,
    svg: `<path d="M2.5 12Q11 3 20.5 16.5M2.5 12Q11 21 20.5 7.5"/>` },
  { id: 'cross', el: 'σταυρός', church: true,
    svg: `<path d="M12 3v18M7 8h10"/>` },
  { id: 'cross8', el: 'σταυρός', church: true,
    svg: `<path d="M12 2.5v19M9.5 5h5M7 8.5h10M9 17.5l6-2.6"/>` },
  { id: 'crossgreek', el: 'σταυρός', church: true,
    svg: `<path d="M12 3.5v5.3M12 15.2v5.3M3.5 12h5.3M15.2 12h5.3"/><circle cx="12" cy="12" r="3.2"/>` },
  { id: 'wheel', el: 'ΙΧΘΥΣ', church: true,
    svg: `<circle cx="12" cy="12" r="9"/>${rays(8, 0, 9, 12, 12, 0)}` },
  { id: 'ihs', el: 'ΙΗΣ', church: true,
    svg: letter('ΙΗΣ', 9) },

  // — Свет —
  { id: 'lamp', el: 'λύχνος',
    svg: `<path d="M3 13h13c2.5 0 4-1.5 4.5-3.5M3 13c1 3 4 4.5 7 4.5s5-1.5 6-4.5M8 17.5V20h4v-2.5"/><path d="M20.5 8c-1-.9-1.1-2.3 0-4 1.1 1.7 1 3.1 0 4z"/>` },
  { id: 'candle', el: 'κηρίον',
    svg: `<path d="M10 11h4v10h-4zM12 11V9M12 7.5c-1.3-1-1.4-2.6 0-4.5 1.4 1.9 1.3 3.5 0 4.5z"/>` },
  { id: 'fire', el: 'πῦρ',
    svg: `<path d="M12 21c-3.5 0-6-2.4-6-5.6 0-3.6 3-5 3.6-9.4 2 1.4 3 3.2 3 4.8 1-.6 1.6-1.8 1.8-3.2 2 1.8 3.6 4.4 3.6 7.6 0 3.3-2.5 5.8-6 5.8z"/>` },
  { id: 'menorah', el: 'λυχνία', church: true,
    svg: `<path d="M12 5v15M8 20.5h8M9 6v4a3 3 0 0 0 6 0V6M6.5 6v4a5.5 5.5 0 0 0 11 0V6M4 6v4a8 8 0 0 0 16 0V6"/>` },
  { id: 'star', el: 'ἀστήρ',
    svg: starPath(8, 9.5, 3.8) },
  { id: 'sun', el: 'ἥλιος',
    svg: `<circle cx="12" cy="12" r="4"/>${rays(8, 6.5, 9.5)}` },
  { id: 'moon', el: 'σελήνη',
    svg: `<path d="M15 3.8a8.5 8.5 0 1 0 5.6 13.4A7 7 0 0 1 15 3.8z"/>` },
  { id: 'eye', el: 'ὀφθαλμός',
    svg: `<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>` },

  // — Слово и Писание —
  { id: 'book', el: 'βίβλος',
    svg: `<path d="M12 6.5c-2-1.5-5-2-8.5-1.5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5zM12 6.5v13"/>` },
  { id: 'scroll', el: 'κύλινδρος',
    svg: `<path d="M6 5h12M6 19h12M6 5a1.5 1.5 0 0 0 0 3h12a1.5 1.5 0 0 0 0-3M6 16a1.5 1.5 0 0 0 0 3h12a1.5 1.5 0 0 0 0-3M7 8v8M17 8v8M10 11h4M10 13.5h4"/>` },
  { id: 'tablets', el: 'πλάκες', church: true,
    svg: `<path d="M3.5 20V9a3.5 3.5 0 0 1 7 0v11zM13.5 20V9a3.5 3.5 0 0 1 7 0v11zM5.5 11h3M5.5 14h3M5.5 17h3M15.5 11h3M15.5 14h3M15.5 17h3"/>` },
  { id: 'pen', el: 'κάλαμος',
    svg: `<path d="M4 20l3.5-1L19 7.5a2.1 2.1 0 0 0-3-3L4.5 16zM14.5 6l3 3"/>` },
  { id: 'seal', el: 'σφραγίς',
    svg: `<circle cx="12" cy="10" r="6"/><path d="M12 7v6M9 10h6M8.5 15l-1.5 6 5-2.5 5 2.5-1.5-6"/>` },
  { id: 'logos', el: 'λόγος', church: true,
    svg: letter('λ', 20) },

  // — Звук и голос —
  { id: 'trumpet', el: 'σάλπιγξ',
    svg: `<path d="M3 10v4h3l11 5V5L6 10zM17 9c1.5 0 2.5 1.3 2.5 3s-1 3-2.5 3"/>` },
  { id: 'lyre', el: 'κιθάρα',
    svg: `<path d="M6 4c-1 6 0 11 3 14.5h6c3-3.5 4-8.5 3-14.5M4.5 6c1.8-1 3.2 0 3.5 1.5M19.5 6c-1.8-1-3.2 0-3.5 1.5M7.2 8h9.6M10 8v10.5M12 8v10.5M14 8v10.5"/>` },
  { id: 'bell', el: 'κώδων',
    svg: `<path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4zM12 6.5V4.5M10.5 19.5a1.6 1.6 0 0 0 3 0"/>` },
  { id: 'dove', el: 'περιστερά',
    svg: `<path d="M4 10.5l2.2-.6c1-1.8 3.2-2 4.4-.4l1.6 2.2 4.6-6.2c1 3.9-.2 7-2.6 8.7l5.8 1.5c-2.4 1.8-6 2.4-8.6 1.6L8.6 20l.6-3.6C6.7 15 5.9 12.8 6.2 10"/><circle cx="8.2" cy="10" r=".25" fill="currentColor"/>` },

  // — Хлеб и вино —
  { id: 'bread', el: 'ἄρτος',
    svg: `<path d="M4 14.5c0-3 3.5-5.5 8-5.5s8 2.5 8 5.5c0 1.8-1 3-2.5 3h-11C5 17.5 4 16.3 4 14.5zM8.8 11.4l-1 3M12 10.8v3.6M15.2 11.4l1 3"/>` },
  { id: 'cup', el: 'ποτήριον',
    svg: `<path d="M6.5 4h11c0 5.2-2.3 8.5-5.5 8.5S6.5 9.2 6.5 4zM12 12.5v6.5M8 20h8"/>` },
  { id: 'grapes', el: 'σταφυλή',
    svg: `<circle cx="7.6" cy="9" r="2.2"/><circle cx="12" cy="9" r="2.2"/><circle cx="16.4" cy="9" r="2.2"/><circle cx="9.8" cy="13.2" r="2.2"/><circle cx="14.2" cy="13.2" r="2.2"/><circle cx="12" cy="17.4" r="2.2"/><path d="M12 6.8V3M12 4.5c1.5-1.5 3.5-1.8 5-1"/>` },
  { id: 'wheat', el: 'σῖτος',
    svg: `<path d="M12 21V5.5"/><path d="${leaf(12, 8, -130)}${leaf(12, 8, -50)}${leaf(12, 11.5, -130)}${leaf(12, 11.5, -50)}${leaf(12, 15, -130)}${leaf(12, 15, -50)}${leaf(12, 5.5, -90, 3.2)}"/>` },
  { id: 'olive', el: 'ἐλαία',
    svg: `<path d="M4 20C9 15.5 13 10.5 19.5 4"/><path d="${leaf(7.2, 17, -150)}${leaf(7.2, 17, 60)}${leaf(10.5, 13.6, -145)}${leaf(10.5, 13.6, 55)}${leaf(14, 9.8, -140)}${leaf(14, 9.8, 50)}${leaf(17.3, 6.2, -135)}"/>` },
  { id: 'pomegranate', el: 'ῥοά',
    svg: `<circle cx="12" cy="13.5" r="7"/><path d="M9.5 6.8l.8-2.8 1.7 2 1.7-2 .8 2.8"/>` },
  { id: 'tree', el: 'ξύλον ζωῆς',
    svg: `<circle cx="12" cy="9" r="6"/><path d="M12 21v-9M12 15l-3-2.5M12 13.5l3-2.5M8 21h8"/>` },

  // — Путь и странствие —
  { id: 'anchor', el: 'ἄγκυρα',
    svg: `<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8.5 10.5h7M5 14c0 4 3.5 7 7 7s7-3 7-7M3.5 15.5L5 14l1.5 1.5M17.5 15.5L19 14l1.5 1.5"/>` },
  { id: 'ark', el: 'κιβωτός', church: true,
    svg: `<path d="M2.5 14h19l-3 5h-13zM6.5 14v-4h11v4M6 10.2l6-4 6 4M10.5 14v-2h3v2"/>` },
  { id: 'boat', el: 'πλοῖον',
    svg: `<path d="M4 16h16l-2.5 4h-11zM12 3v13M12 4l6 10h-6"/>` },
  { id: 'net', el: 'δίκτυον',
    svg: `<path d="M4 4h16v16H4zM4 9.3L14.7 20M4 14.7L9.3 20M9.3 4L20 14.7M14.7 4L20 9.3M4 4l16 16M20 4L4 20M9.3 20L20 9.3M4 14.7L14.7 4M14.7 20L20 14.7M4 9.3L9.3 4"/>` },
  { id: 'staff', el: 'ῥάβδος',
    svg: `<path d="M9.5 21V8a4 4 0 0 1 8 0v1.5"/>` },
  { id: 'door', el: 'θύρα',
    svg: `<path d="M6 21V10a6 6 0 0 1 12 0v11M3 21h18M14.5 15v1"/>` },
  { id: 'ladder', el: 'κλῖμαξ', church: true,
    svg: `<path d="M8 3v18M16 3v18M8 7h8M8 11h8M8 15h8M8 19h8"/>` },
  { id: 'mountain', el: 'ὄρος',
    svg: `<path d="M2 19L9 7l4 6 2.5-3L22 19z"/>` },
  { id: 'water', el: 'ὕδωρ',
    svg: `<path d="M3 8.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 12.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 16.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>` },
  { id: 'rainbow', el: 'τόξον',
    svg: `<path d="M3 18a9 9 0 0 1 18 0M6 18a6 6 0 0 1 12 0M9 18a3 3 0 0 1 6 0"/>` },
  { id: 'tent', el: 'σκηνή', church: true,
    svg: `<path d="M3 20L12 4l9 16zM12 4v16M9 20l3-6 3 6"/>` },
  { id: 'house', el: 'οἶκος',
    svg: `<path d="M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5"/>` },

  // — Царство —
  { id: 'crown', el: 'στέφανος',
    svg: `<path d="M4.5 18h15M4.5 18L3.5 8l5 4 3.5-7 3.5 7 5-4-1 10"/>` },
  { id: 'thorns', el: 'ἄκανθαι', church: true,
    svg: `<circle cx="12" cy="12" r="6"/>${rays(12, 6, 9, 12, 12, 15)}` },
  { id: 'key', el: 'κλείς',
    svg: `<circle cx="7" cy="12" r="3.5"/><path d="M10.5 12H21M17 12v3M20 12v2.5"/>` },
  { id: 'coin', el: 'λεπτόν',
    svg: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9.5v5M9.5 12h5"/>` },
  { id: 'heart', el: 'καρδία',
    svg: `<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>` },
  { id: 'hourglass', el: 'ὥρα',
    svg: `<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>` },

  // — Буквы —
  { id: 'alpha', el: 'Ἄλφα', church: true, svg: letter('Α') },
  { id: 'omega', el: 'Ὦ μέγα', church: true, svg: letter('Ω') },
  { id: 'phi', el: 'φῶς', church: true, svg: letter('Φ') },
  { id: 'zeta', el: 'ζωή', church: true, svg: letter('Ζ') },
  { id: 'theta', el: 'Θεός', church: true, svg: letter('Θ') },
  { id: 'sigma', el: 'σιωπή', church: true, svg: letter('Σ') },
];

export const iconById = (id) => ICONS.find((i) => i.id === id) || ICONS[0];

export function iconSVG(id, cls = '') {
  const ic = iconById(id);
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic.svg}</svg>`;
}

// группы в выборе значка: прежние значки — по смыслу; библейские символы — «Знаки», церковные — «Церковь»
const OLD_G = { phone: 'tech', message: 'work', mail: 'work', search: 'tech', sliders: 'tech', globe: 'tech', grid: 'tech',
  camera: 'media', image: 'media', music: 'media', note: 'media', pin: 'life', calendar: 'life', alarm: 'life', house: 'life', key: 'life' };
ICONS.forEach((i) => { i.g = i.g || OLD_G[i.id] || (i.church ? 'faith' : 'symbols'); });
export const ICON_GROUPS = ['tech', 'work', 'media', 'life', 'symbols', 'faith'];
export const iconsFor = (church) => ICONS.filter((i) => church || !i.church);
