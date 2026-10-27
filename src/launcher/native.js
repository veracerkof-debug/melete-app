// Главный экран: нативный мост (Android, LauncherPlugin.java). В браузере его нет — вызовы не делаются.
import { Capacitor, registerPlugin } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const Launcher = registerPlugin('Launcher');
