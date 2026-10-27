# Мост Melete ↔ Ἐλάχιστον (главный экран)

> **Решение автора 27.10.2026** (`DECISIONS.md` Melete): этот договор действует целиком; сторона Melete делается в
> чате Melete. Сторона главного экрана готова и ждёт: в настройках («Главный» → Melete) видно, пришло ли живое
> состояние («Melete на связи…» или «Живой связи пока нет»).

Договор между двумя отдельными приложениями (DECISIONS 2026-10-26). Сторона Ἐλάχιστον готова
(`launcher/android/.../LauncherPlugin.java`: `openMelete`, `meleteState`, `meleteControl`; `src/launcher/melete.js`,
`tracker.js`, `home.js`). Сторона Melete — ниже, что нужно сделать. Пока Melete этого не умеет, главный экран
открывает Melete как обычно, а неделю и чтение берёт из папки Melete (`Data/melete-data.json`), как раньше.

Пакеты: Melete — `app.melete`, `app.melete.dev`; главный экран — `app.elachiston`, `app.elachiston.dev`.
Подписи разные, поэтому разрешения по подписи не годятся: рассылки адресные (`setPackage`), данные — без личного.

## 1. Переход на экран: `melete://<маршрут>`

Главный экран открывает Melete намерением `ACTION_VIEW` с адресом `melete://…` и пакетом Melete.

| Адрес | Что открыть в Melete |
|---|---|
| `melete://free` | свободная практика (сессия с окнами; если занятие уже идёт — его) |
| `melete://session` | идущее занятие (нет занятия — как `free`) |
| `melete://bible` | Библия на чтении дня по плану (нет плана — экран планов) |

Melete:
- `AndroidManifest.xml`, у главной activity — фильтр:
  `<intent-filter><action VIEW/><category DEFAULT/><category BROWSABLE/><data android:scheme="melete"/></intent-filter>`
  (`launchMode="singleTask"` уже есть или нужен — тогда адрес приходит в `onNewIntent`).
- Capacitor отдаёт адрес странице событием `appUrlOpen` (`@capacitor/app`) или своим плагином; страница — `app.route(…)`.
- Запасной путь: если фильтра нет, главный экран запускает Melete обычным намерением с extra `melete.route` = маршрут.

## 2. Состояние: рассылка `app.melete.bridge.STATE`

Melete при каждом изменении (начало, пауза и конец занятия; звук пошёл или остановился; сохранили занятие; отметили
чтение) и в ответ на запрос (п. 3) шлёт **адресную** рассылку в оба пакета главного экрана:

```java
for (String p : new String[] { "app.elachiston", "app.elachiston.dev" })
  ctx.sendBroadcast(new Intent("app.melete.bridge.STATE").setPackage(p)
      .putExtra("state", json).putExtra("pkg", ctx.getPackageName()));
```

`state` — строка JSON, версия 1:

```json
{
  "v": 1,
  "at": 1792928160000,
  "session": { "start": 1792926720000, "title": "Свободная практика", "mode": "free" },
  "playing": true,
  "sounding": true,
  "what": "Метроном · 96",
  "week": { "total": 12600, "goal": 18000, "per": [3600, 2700, 0, 4500, 1800, 0, 0] },
  "reading": { "ref": "Быт 36–39", "done": 2, "total": 4, "day": 12 }
}
```

- `session` — идущее занятие или `null`; `title` — песня или «Свободная практика»; `start` — мс.
- `playing` — звук идёт (не на паузе); `sounding` — есть что играть (метроном, плеер, пэд…); `what` — коротко что
  (как подпись в уведомлении Melete, `PlayerPlugin.state.labels`).
- `week` — секунды: всего за неделю, цель, по дням с понедельника — **только подтверждённые** занятия, как в
  статистике Melete (`splitVerified` → `weekData`).
- `reading` — чтение дня (`readingFor` + `refText`), `null` — нет плана; поле не нужно, если церковный режим выключен.

Плашка на главном показывается, когда есть `session` или `sounding`; неделя и чтение из рассылки важнее файла папки.
Состояние старше 12 часов не показывается.

## 3. Запрос состояния: `app.melete.bridge.REQUEST`

Главный экран при показе шлёт адресно в `app.melete` и `app.melete.dev` рассылку `app.melete.bridge.REQUEST`
(extra `to` — пакет главного экрана). Melete отвечает рассылкой STATE (п. 2). Melete не запущен — ответа нет, и это
нормально: плашки нет, неделя и чтение — из файла папки.

## 4. Управление звуком: `app.melete.bridge.CONTROL`

Кнопка ▶/❚❚ на плашке шлёт адресно в Melete рассылку `app.melete.bridge.CONTROL`, extra `action`:
`toggle` | `play` | `pause` | `stop`. В Melete — тот же путь, что у кнопок уведомления (`KeepAliveService`, `A_TOGGLE`
→ `PlayerPlugin.emit("toggle", …)`), после чего — новая рассылка STATE.

Приёмник REQUEST и CONTROL в Melete — `exported="true"` (другое приложение), без разрешений: управление ограничено
пуском и паузой звука Melete, данных наружу не отдаёт (кроме STATE адресно).

## Проверка

- Главный экран без Melete: плашки нет, касание недели — «Melete не установлен».
- Melete без моста: плашки нет, касание — Melete открывается как обычно (маршрут в extra игнорируется).
- Melete с мостом: начали занятие — плашка «Идёт занятие», ▶/❚❚ останавливает и продолжает звук, касание плашки —
  занятие; неделя — свободная практика; чтение — Библия на чтении дня.
