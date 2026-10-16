import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

window.MisInversionesMobile = {
  isAndroid: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
  openRelease: (url) => Browser.open({ url }),
};
