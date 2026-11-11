# Платформы, сборка и выпуск

Один и тот же код (`src/`) собирается Vite в `dist/` и запускается на четырёх платформах. Всё, что на платформе
делается иначе, вынесено в узкие места — их список ниже.

## Сборки и признаки

`vite.config.js` подставляет в код постоянные:

| Постоянная | Откуда | Зачем |
|---|---|---|
| `__WEB_BUILD__` | `vite build --mode web` | веб-сборка: без тяжёлых моделей, модули `heavy` — заглушкой |
| `__CHANNEL__` | `MELETE_CHANNEL` = `dev` / `pre` | канал обновлений, порт синхронизации, функции только для DEV |
| `__PACKED__` | `MELETE_TARGET` = `android` / `windows` | какие модели вынуты в пакеты (скачиваются по кнопке) |
| `__BUILD__`, `__BUILD_TIME__`, `__APP_VERSION__` | CI, время, `package.json` | номер сборки, проверка часов, версия |

## Веб

Обычная сборка Vite, публикуется GitHub Actions (`web.yml`) из ветки `pre` в `gh-pages`. Память — в браузере;
`core/webmemory.js` просит постоянное хранилище и ставит service worker (`public/sw.js`): приложение открывается без
сети, а установленное на главный экран Safari не чистит. Нет: напоминаний, иконки на выбор, управления из шторки,
тяжёлых моделей. Отдельно собирается демонстрация (`src/showcase/`, …/show/) — выдуманный музыкант со своим хранилищем.

## Android (Capacitor)

`android/` — проект Capacitor; `npx cap sync android` копирует `dist/` внутрь. Связь JS ↔ Java — плагины:
`registerPlugin('Имя')` в JS и `ИмяPlugin.java` (`android/app/src/main/java/app/practice/beta/`).

| Плагин | Что делает | JS |
|---|---|---|
| `Folder` | папка Melete (SAF) | `core/folder.js` |
| `Share` | «Поделиться» одним и несколькими файлами | `screens/share.js` |
| `Voice` | запись и вывод с выбором устройства | `audio/voiceengine.js` |
| `KeepAlive` + `KeepAliveService` | служба фона: приложение не замораживается, пока звучит или идёт занятие | `core/background.js` |
| `Player`, `FloatService`, `MediaCtl` | кнопки в шторке, плавающая кнопка, «картинка в картинке» | `core/player.js` |
| `Guard` | защита от снимка тремя пальцами, полный экран, экран не гаснет | `core/guard.js`, `pure.js`, `screenon.js` |
| `Clock` | системный счётчик с включения (проверка часов) | `core/clock.js` |
| `Midi` | USB и Bluetooth MIDI | `core/midi.js` |
| `Pulse`, `Volume` | фонарик и вибрация в такт; громкость устройства | `core/pulse.js`, `nosound.js` |
| `Stems` (`Demucs`, `Mdx`, `RoFormer`, `Engine`) | разделение на дорожки ONNX Runtime | `audio/stems.js`, `mdx.js` |
| `Packs` | скачивание и проверка пакетов моделей | `core/packs.js` |
| `SyncHttp`, `Mesh` (`MeshServer`) | HTTPS с закреплённым отпечатком; сервер связи в DEV | `core/sync.js` |
| `Update` | установка обновления | `core/update.js` |
| `Icon` (+ activity-ярлыки `Icon*.java`) | иконка приложения на выбор | `core/appicon.js` |
| `Bridge` (`BridgeReceiver`) | мост с главным экраном Ἐλάχιστον | `core/bridge.js` |
| `Report`, `CrashLog` | отчёт и запись вылета | `core/report.js` |

Сохранять файлы на Android — только через «Поделиться» или папку: ссылка на скачивание в WebView не работает.
Две сборки — два приложения: `app.melete.dev` («Melete DEV», из `main`) и `app.melete` (из `pre`), у каждой свои данные.

## Windows и Linux (Tauri 2)

`src-tauri/` — оболочка на Rust с системным WebView (WebView2 на Windows, WebKitGTK на Linux). Отличия от браузера
в JS — `core/desktop.js` («Сохранить как», папка Melete на диске, файлы при запуске, F11). Связь JS ↔ Rust —
`invoke('команда')` ↔ `#[tauri::command]` (список — `lib.rs: generate_handler!`).

| Файл Rust | Что |
|---|---|
| `lib.rs` | сборка приложения, команды, папки, файлы при запуске, микрофон в WebKitGTK |
| `sync.rs`, `guest.rs`, `localsend.rs`, `netcli.rs` | серверы своей сети (синхронизация, гости, LocalSend), клиент |
| `demucs.rs`, `roformer.rs` | дорожки нативным ONNX Runtime (крейт `ort`) |
| `notes.rs`, `lyrics.rs`, `denoise.rs` | ноты (YourMT3+), текст (whisper.cpp), шумоподавление (DeepFilterNet3) |
| `update.rs` | обновление, ставится при закрытии |
| `ipcbody.rs` | тело запроса окна в любом виде (байты или JSON) — см. ниже |

**Канал окна.** Большие данные (куски файлов) окно отправляет в Rust сырыми байтами по каналу `ipc:`. Если политика
страницы закрывает этот канал, Tauri молча переходит на JSON — и байты приходят массивом чисел. Поэтому `index.html`
разрешает `ipc:` и `http://ipc.localhost`, а Rust принимает тело в любом виде (`ipcbody::bytes`).

Windows-установщик несёт рядом с программой библиотеки Visual C++ (`vcrt/`, шаг в `windows.yml`): без них на
чистой Windows программа не запускается (MSVCP140.dll). Модели только для Windows — в ресурсах установщика
(`src-tauri/models/`).

## Каналы и выпуск

| | dev | pre |
|---|---|---|
| Откуда | каждая отправка в `main` | ветка `pre`, только по слову автора («выпускай»: `git push origin main:pre`) |
| Кому | автору | тестерам и веб-версии |
| Приложения | Melete DEV (`app.melete.dev`), `Melete-Dev-Setup.exe`, `Melete-Dev.AppImage` | Melete (`app.melete`), `Melete-Setup.exe`, `Melete.AppImage` |
| Варианты | все, с переключателем (`core/variants.js`) | только выбранный автором |

Сборки — GitHub Actions: `android-beta.yml`, `windows.yml`, `linux.yml`, `web.yml`, `launcher.yml`, `packs.yml`.
Правки только в `*.md` и `docs/` сборок не запускают. Каждая pre-сборка помечена `pre-<N>`; откат —
`git push --force origin pre-N:pre`. Ключ подписи APK — только в секретах GitHub (репозиторий открытый).

**Обновление** (`core/update.js`): приложение спрашивает GitHub о релизе своего канала (метка сборки
`android-<N>.ver` / `windows-<N>.ver`), «автоматически» (раз в сутки) или только по кнопке. Перед обновлением —
копия данных на устройстве. Заметное для людей — запись в `core/whatsnew.js` (окно «Что нового» и описание релиза).

## Модели и пакеты

- `build/models.json` — опись моделей и банков звуков (адрес, sha256, размер, платформа, пакет); `npm run models`
  скачивает с проверкой в `public/models/` (в `.gitignore`).
- `build/packs.json` + `build/packs.mjs` — пакеты: модели с полем `pack` на Android не встраиваются, а лежат в релизе
  `packs` (`<id>.tar`); устройство скачивает по кнопке и сверяет каждый файл по sha256. После смены моделей —
  `node build/packs.mjs index`.
- MediaPipe (терменвокс): встроенный сборщик статистики вырезается при сборке (`build/mediapipe.js`); если вырезать
  не удалось — сборка падает.

## Команды

```
npm install            зависимости
npm run dev            сервер разработки (с телефона: http://<IP>:5173)
npm run build          сборка в dist/ (веб без моделей — vite build --mode web)
npm run models         скачать модели по build/models.json
npx cap sync android   собрать в Android-проект; npx cap run android -l --external — с живой перезагрузкой
npm run win            установщик Windows (нужны Rust и Windows); npm run win:dev — окно с живой перезагрузкой
npm run launcher:dev   Ἐλάχιστον
```
