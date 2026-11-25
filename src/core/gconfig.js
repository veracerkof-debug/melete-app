// Ключи клиента Google OAuth (Google Cloud → API и сервисы → Учётные данные). Это не секреты: идентификаторы клиентов
// публичны. Пустой ключ — вход Google на этой платформе скрыт (в dev виден с пояснением). Нужны права: Google Drive API,
// область drive.file (приложение видит только свои файлы — проверка Google не нужна), экран согласия — «В производстве»,
// иначе токен обновления умирает через 7 дней. Android: тип клиента «Android», имя пакета (app.melete / app.melete.dev) и
// SHA-1 подписи APK; схема возврата — com.googleusercontent.apps.<ключ> (android/app/build.gradle читает эти строки).
export const GOOGLE = {
  androidPre: '871917264902-9ip6bhrv7nhutvpiuecb1d7dejme1cbc.apps.googleusercontent.com',
  androidDev: '871917264902-9ip6bhrv7nhutvpiuecb1d7dejme1cbc.apps.googleusercontent.com',
  desktop: '', // Windows и Linux (тип «Компьютер»): возврат на 127.0.0.1 — этап 5
  web: '', // веб: этап 6
};
