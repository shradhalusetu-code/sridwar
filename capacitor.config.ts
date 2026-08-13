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
    allowMixedContent: false,  // set to true ONLY if your site loads http:// resources
    captureInput: false,       // don't let WebView capture all input globally
    webContentsDebuggingEnabled: false, // OFF for release. Set to true temporarily if you need to debug locally.
  },

  server: {
    // Tells the Android WebView to treat your app as a proper https origin.
    androidScheme: 'https',

    // ─── Live-loading from sridwar.com ─────────────────────────────────────
    // With `url` set, the Android app opens the SAME live site a browser
    // visitor would — instead of a copy of the site bundled into the AAB
    // at build time. This is the change that means most future updates
    // (UI/layout fixes like the navbar, copy changes, new pages, new
    // offerings) go live the moment you deploy the website, with NO new
    // AAB build and NO Play Store re-upload.
    //
    // What this does NOT remove the need for a new AAB/reupload for:
    //   - Adding/updating a Capacitor plugin (camera, notifications, etc.)
    //   - Changing app permissions, app icon, or splash screen
    //   - Any change to this capacitor.config.ts file itself
    //   - Anything in the native android/ project
    //
    // Trade-off to be aware of: the app now needs an internet connection
    // to load, same as visiting the website in a browser. There is
    // currently no offline fallback screen — if that matters for your
    // devotees, it can be added later without touching this file again.
    //
    // window.location.origin inside the app is now the real
    // https://sridwar.com (previously it was Capacitor's internal
    // https://localhost origin). This is a genuine bugfix as a side
    // effect: password-reset redirect links generated from inside the
    // Android app (see AuthDashboard.tsx's redirectTo) now correctly
    // point back to the live site instead of an unreachable internal URL.
    //
    // To revert to the old "bundled copy" behavior at any time, delete
    // the `url`, `cleartext`, and `allowNavigation` lines below — nothing
    // else in this file needs to change.
    url: 'https://sridwar.com',
    cleartext: false,

    // Domains the WebView is allowed to navigate to besides the main
    // `url` above. sridwar.com itself is always allowed automatically.
    // *.supabase.co covers your Supabase project's auth/data endpoints;
    // this is defensive (most Supabase calls are background API requests,
    // which are unaffected by this setting either way) rather than
    // strictly required.
    allowNavigation: ['sridwar.com', '*.sridwar.com', '*.supabase.co'],
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
