// Ἐλάχιστον (Elachiston) — отдельное приложение главного экрана (docs/launcher.md). Своя сборка в launcher/dist:
// код — src/launcher (и общие чистые функции ядра Melete), канал и номер сборки — LAUNCHER_CHANNEL, BUILD_NUMBER.
// npm run launcher:dev — сервер разработки (порт 5174), npm run launcher:build — сборка для Android.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  define: {
    __CHANNEL__: JSON.stringify(process.env.LAUNCHER_CHANNEL === 'pre' ? 'pre' : 'dev'),
    __BUILD__: JSON.stringify(+process.env.BUILD_NUMBER || 0),
  },
  server: { host: true, port: 5174, fs: { allow: ['..'] } },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
});
