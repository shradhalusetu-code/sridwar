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
    //
    // ✅ VIDEO-IN-APP FIX (added alongside Hero.tsx's app-only tap-to-play
    // video change): the Hero section's video now opens as a real YouTube
    // link (https://www.youtube.com/watch?v=...) when tapped inside the
    // Android app, instead of trying to play an unreliable embedded
    // iframe player. These two domains are what let that link actually
    // open instead of the WebView silently refusing to navigate to it.
    //
    // ✅ BROKEN-HEADER-VIDEO FIX (2026-08-26): Hero.tsx was later changed
    // (2026-08-16 update, see Hero.tsx) to play its PRIMARY video inline
    // via an <iframe> pointed at youtube-nocookie.com, instead of the old
    // "open a youtube.com link" behavior described above — but this
    // allowNavigation list was never updated to match. Android's WebView
    // treats assigning an iframe's src as a navigation event, exactly like
    // a tapped link; any domain not listed here is silently blocked. That
    // is exactly why the Hero video showed as empty/broken space on the
    // Redmi Pad app while working fine on the website (a browser tab isn't
    // restricted by this Capacitor-only setting). Adding the two
    // youtube-nocookie.com entries below fixes it. www.youtube.com /
    // youtube.com are left in place, unchanged, since other/secondary
    // videos elsewhere in the app may still link out to a real YouTube URL.
    allowNavigation: ['sridwar.com', '*.sridwar.com', '*.supabase.co', 'www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'],
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
