package com.shradhalu.sridwar;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ─── Bottom navigation-bar inset fix ───────────────────────────────
        // This app targets SDK 36 (Android 15+), where edge-to-edge layout is
        // mandatory and can no longer be opted out of: the WebView is always
        // laid out full-screen, including the area behind the bottom system
        // navigation bar / gesture pill.
        //
        // The Capacitor StatusBar plugin (overlaysWebView: false) already
        // reserves space at the TOP for the status bar, but nothing reserves
        // space at the BOTTOM. That's why screens and modals scroll all the
        // way to their last element, yet the final button still renders
        // partly (or fully) behind the navigation bar and looks "cut off" —
        // the page isn't broken, the WebView's own visible area is just
        // drawn under opaque system UI.
        //
        // CSS's env(safe-area-inset-bottom) is meant to solve exactly this,
        // but Android WebView does not reliably populate it out of the box.
        // So instead we read the real inset natively and pad the WebView
        // itself by that amount. This shrinks the WebView's visible viewport
        // to correctly exclude the navigation bar again, which fixes bottom
        // clipping across the entire app (every screen and modal) with no
        // web/CSS changes required.
        final View webView = bridge.getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bars.bottom);
            return insets;
        });
    }
}
