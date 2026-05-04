-keep class com.sync.music.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-dontwarn okhttp3.**
