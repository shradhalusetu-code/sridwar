import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shradhalu.sridwar',
  appName: 'Sri Dwar',
  webDir: 'dist',

  // ─── Android WebView scroll fix ───────────────────────────────────────────
  // These settings tell the Android WebView to stop intercepting touch/scroll
  // events from sections like "Featured Temple Experience" and "Virtual Live
  // Darshan". They have ZERO effect on your GitHub Pages website — this block
  // is only read by Capacitor when it builds the Android APK.
  android: {
    allowMixedContent: true,   // allows http resources inside https webview
    captureInput: false,       // don't let WebView capture all input globally
    webContentsDebuggingEnabled: true, // keep this so USB debugging still works
  },

  server: {
    // Tells the Android WebView to treat your app as a proper https origin.
    // This also prevents some WebView quirks that cause scroll freeze.
    androidScheme: 'https',
  },

  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#021816',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#aff8ec',
      showSpinner: false,
    },
  },
};

export default config;
