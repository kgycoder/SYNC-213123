package com.sync.music

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var musicService: MusicService? = null
    private var serviceBound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val localBinder = binder as? MusicService.LocalBinder ?: return
            musicService = localBinder.getService()
            musicService?.setMessageCallback { json ->
                runOnUiThread { webView.evaluateJavascript("window.__sync && window.__sync('${escapeJs(json)}')", null) }
            }
        }
        override fun onServiceDisconnected(name: ComponentName?) {
            musicService = null
            serviceBound = false
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge-to-edge immersive display
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        }

        val container = FrameLayout(this)
        container.setBackgroundColor(Color.argb(255, 8, 8, 13))
        setContentView(container)

        // Keep screen on during playback
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setupWebView(container)
        startMusicService()
    }

    private fun setupWebView(container: FrameLayout) {
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.argb(255, 8, 8, 13))
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            // Allow video autoplay
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = false
            }
        }

        // JS Bridge
        webView.addJavascriptInterface(SyncJsBridge(this), "SyncBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Hide system UI for immersive mode after page loads
                hideSystemUI()
            }
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                // Allow YouTube iframe and local assets
                return !(url.startsWith("file://") || url.contains("youtube.com") ||
                    url.contains("ytimg.com") || url.contains("lrclib.net") ||
                    url.contains("music.163.com") || url.contains("suggestqueries.google.com") ||
                    url.contains("googleapis.com"))
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                return true // Suppress console noise in production
            }
        }

        container.addView(webView)
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    private fun hideSystemUI() {
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun startMusicService() {
        val intent = Intent(this, MusicService::class.java)
        startForegroundService(intent)
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
        serviceBound = true
    }

    fun sendToWebView(json: String) {
        runOnUiThread {
            val escaped = escapeJs(json)
            webView.evaluateJavascript("window.__sync && window.__sync('$escaped')", null)
        }
    }

    fun handleBridgeMessage(json: String) {
        try {
            val obj = JSONObject(json)
            val type = obj.optString("type")

            when (type) {
                "search" -> musicService?.doSearch(json) ?: run {
                    // Fallback: do search directly if service not bound
                    SearchHelper(this).doSearch(json)
                }
                "suggest" -> SearchHelper(this).doSuggest(json)
                "fetchLyrics" -> LyricsHelper(this).fetchLyrics(json)
                "setTitle" -> {
                    val title = obj.optString("title")
                    musicService?.updateNotificationTitle(title)
                }
                "minimize" -> moveTaskToBack(true)
                "close" -> finishAndRemoveTask()
                "drag" -> { /* No-op on Android */ }
                "maximize" -> { /* No-op on Android */ }
                "overlayMode" -> { /* Not supported on Android */ }
                // Media control messages from JS
                "mediaPlay" -> musicService?.setPlaybackState(true)
                "mediaPause" -> musicService?.setPlaybackState(false)
                "mediaTrack" -> {
                    val title = obj.optString("title")
                    val channel = obj.optString("channel")
                    val thumb = obj.optString("thumb")
                    musicService?.updateMediaSession(title, channel, thumb)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun escapeJs(json: String): String {
        return json.replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        hideSystemUI()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (serviceBound) {
            unbindService(serviceConnection)
            serviceBound = false
        }
        webView.destroy()
    }

    override fun onBackPressed() {
        // Send back event to WebView first
        webView.evaluateJavascript("window.onAndroidBack && window.onAndroidBack()", null)
    }
}
