# Melete

**Μελέτη** (Greek: "practice, diligent study", 1 Tim 4:15) is a practice desk for musicians: a practice log plus a set
of tools that open right inside a practice session. No ads, subscriptions, accounts or data collection — everything
stays on the device. The rhythm is weekly, with no pressure from daily streaks. Success is measured by time spent
with the instrument, not with the phone. Open source, GPL‑3.0.

*Русская версия — [README.md](README.md). The developer documentation is written in Russian (the project's working
language); code identifiers are in English.*

## What it does

**Practice**
- Sessions: free, per song, or inside a tool. Tools open as windows within the session (full screen, halves,
  quarters, strips); time is counted from signs of actual playing and keeps running with the screen off.
- The week: a calendar-like practice schedule (several blocks a day, breaks, one-day edits), a weekly goal, reminders,
  honest statistics by day, song, genre and tag. Pomodoro and a "how long have I been playing" stopwatch.
- A stone that rounds off with practice hours, like a river pebble; a mascot (or none).
- Study: a music theory textbook (classical and jazz sections, a beginner path), ear and rhythm trainers with lessons.

**Songs, calendar, team**
- Song library: categories, genres, tags, progress, tempo, lyrics with chords, tabs, scores and recordings per song.
- Calendar and stage mode: rehearsals, lessons, gigs; set lists with tempo, click, pad, backing track and autoscroll.
- Team sharing: songs, tabs and set lists in a single `.melete` file via the system share sheet — no servers.
- Church mode (off by default): Bible, reading plans, MyBible modules, song import from ProPresenter, EasyWorship,
  OpenLyrics, PowerPoint and Holyrics.

**Tools**
- Metronome (polyrhythms, tempo trainer, flash and vibration), tuner, piano (sampled grand and synth), pads with an
  arpeggiator, theory (circle of fifths, scales, chords, transposition).
- Glider — a fretless keyboard; theremin — play with your hands in front of the camera (processed on the device only).
- Media library: slow down without pitch change, transpose, A–B loops, markers, video; recordings are split into stems
  (vocals, drums, bass…) automatically, with key, tempo, beats and chords detected; notes from audio; format converter.
- Tabs and scores (Guitar Pro, MusicXML, PDF), lyrics with chords, transcription of your own playing.
- Voice recorder with live and offline processing; looper; a basic sketch studio; spectrum and sound level meter.
- Record in any tool: audio, video or MIDI; USB and Bluetooth MIDI keyboards.

**Data and devices**
- The Melete folder: data, recordings, tabs, PDFs and lyrics on the device, mirrored with the media library; signed
  backups, plus automatic on-device copies every day and before each update.
- Phone and computer sync over your own Wi‑Fi (encrypted, paired with a code); the computer can take over heavy
  audio analysis.
- Languages: Russian, Uzbek (Latin), English. Classic and "Minimal" looks, themes, palettes, custom colors.

## Try it

| | Web | Android | Windows | Linux |
|---|---|---|---|---|
| Where | **[veracerkof-debug.github.io/melete-app](https://veracerkof-debug.github.io/melete-app/)** | [Releases → pre → `Melete-PreRelease.apk`](https://github.com/veracerkof-debug/melete-app/releases/tag/pre) | [Releases → pre → `Melete-Setup.exe`](https://github.com/veracerkof-debug/melete-app/releases/tag/pre) | [Releases → pre → `Melete.AppImage`, `melete.deb`](https://github.com/veracerkof-debug/melete-app/releases/tag/pre) |
| For | a first look | everyday use | practice at the computer, studio, tabs, audio analysis | same |

The web version has no reminders, no Melete folder and no heavy models (stems, notes, chords).
**Demo** with a fictional musician: [veracerkof-debug.github.io/melete-app/show](https://veracerkof-debug.github.io/melete-app/show/).

## How it is built

One vanilla JavaScript app (ES modules, no framework) with the Web Audio API, built by Vite and wrapped for each
platform: Capacitor for Android (Java plugins), Tauri 2 for Windows and Linux (Rust commands), plain web for the
browser. Local-first: localStorage for state, IndexedDB for files; no backend.

```
npm install        # dependencies
npm run dev        # dev server (reachable from a phone on the same Wi-Fi)
npm test           # unit tests (Vitest)
npm run e2e        # browser tests (Playwright)
npm run build      # build into dist/
```

Start with `ARCHITECTURE.md` (vision, rules, layers), then `docs/tech/` (data, core, modules, audio, music and audio
analysis, connectivity, platforms, reliability, testing, conventions). Tool modules follow `MODULE_SPEC.md`.

## License

GPL‑3.0 (`LICENSE`). Third-party components and their licenses — `LICENSES.md` and the in-app "Licenses" screen.
The name and logo are the author's marks.

## Author

Kim Alexander. Built with Claude by Anthropic.
