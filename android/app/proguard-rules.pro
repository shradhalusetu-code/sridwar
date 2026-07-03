# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ─── Capacitor / Cordova bridge keep rules ─────────────────────────────────
# These classes are invoked via reflection and JS<->native bridging, so R8
# must not rename, remove, or inline them even though nothing in Java code
# appears to call them directly.
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# Keep your own app package fully (small, low-risk to leave unobfuscated,
# and avoids any surprises with the WebView bridge activity).
-keep class com.shradhalu.sridwar.** { *; }
