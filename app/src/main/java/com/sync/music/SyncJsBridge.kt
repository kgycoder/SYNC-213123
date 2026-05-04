package com.sync.music

import android.webkit.JavascriptInterface

class SyncJsBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun postMessage(json: String) {
        activity.handleBridgeMessage(json)
    }
}
