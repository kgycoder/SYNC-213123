package com.sync.music

import android.content.Context
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

class SearchHelper(private val context: Context) {

    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val activity get() = context as? MainActivity

    fun doSearch(json: String) {
        mainScope.launch {
            try {
                val req = JSONObject(json)
                val query = req.optString("query")
                val callbackId = req.optString("id", "0")

                val tracks = withContext(Dispatchers.IO) { fetchYouTubeSearch(query) }
                val result = JSONObject().apply {
                    put("type", "searchResult")
                    put("id", callbackId)
                    put("success", true)
                    put("tracks", tracks)
                }
                activity?.sendToWebView(result.toString())
            } catch (e: Exception) {
                val err = JSONObject().apply {
                    put("type", "searchResult")
                    put("id", JSONObject(json).optString("id", "0"))
                    put("success", false)
                    put("error", e.message)
                }
                activity?.sendToWebView(err.toString())
            }
        }
    }

    fun doSuggest(json: String) {
        mainScope.launch {
            try {
                val req = JSONObject(json)
                val query = req.optString("query")
                val callbackId = req.optString("id", "0")

                val suggestions = withContext(Dispatchers.IO) { fetchSuggestions(query) }
                val result = JSONObject().apply {
                    put("type", "suggestResult")
                    put("id", callbackId)
                    put("success", true)
                    put("suggestions", suggestions)
                }
                activity?.sendToWebView(result.toString())
            } catch (e: Exception) {
                val err = JSONObject().apply {
                    put("type", "suggestResult")
                    put("id", JSONObject(json).optString("id", "0"))
                    put("success", false)
                    put("suggestions", JSONArray())
                }
                activity?.sendToWebView(err.toString())
            }
        }
    }

    private fun fetchYouTubeSearch(query: String): JSONArray {
        val KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
        val URL_STR = "https://www.youtube.com/youtubei/v1/search?key=$KEY&prettyPrint=false"

        val bodyJson = JSONObject().apply {
            put("context", JSONObject().apply {
                put("client", JSONObject().apply {
                    put("clientName", "WEB")
                    put("clientVersion", "2.20240101.00.00")
                    put("hl", "ko")
                    put("gl", "KR")
                })
            })
            put("query", query)
            put("params", "EgIQAQ==")
        }

        val conn = URL(URL_STR).openConnection() as HttpsURLConnection
        conn.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("X-YouTube-Client-Name", "1")
            setRequestProperty("X-YouTube-Client-Version", "2.20240101.00.00")
            setRequestProperty("Origin", "https://www.youtube.com")
            setRequestProperty("Referer", "https://www.youtube.com/")
            setRequestProperty("User-Agent",
                "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36")
            connectTimeout = 15000
            readTimeout = 15000
            doOutput = true
        }

        conn.outputStream.use { it.write(bodyJson.toString().toByteArray(Charsets.UTF_8)) }
        val responseText = conn.inputStream.bufferedReader().readText()
        conn.disconnect()

        return parseYouTubeResults(responseText)
    }

    private fun parseYouTubeResults(json: String): JSONArray {
        val list = JSONArray()
        try {
            val doc = JSONObject(json)
            val sections = doc.getJSONObject("contents")
                .getJSONObject("twoColumnSearchResultsRenderer")
                .getJSONObject("primaryContents")
                .getJSONObject("sectionListRenderer")
                .getJSONArray("contents")

            for (i in 0 until sections.length()) {
                val sec = sections.getJSONObject(i)
                if (!sec.has("itemSectionRenderer")) continue
                val items = sec.getJSONObject("itemSectionRenderer").getJSONArray("contents")

                for (j in 0 until items.length()) {
                    val item = items.getJSONObject(j)
                    if (!item.has("videoRenderer")) continue
                    val vr = item.getJSONObject("videoRenderer")
                    if (!vr.has("videoId")) continue

                    val id = vr.getString("videoId")
                    val title = vr.optJSONObject("title")
                        ?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: ""

                    val channel = vr.optJSONObject("ownerText")
                        ?.optJSONArray("runs")?.optJSONObject(0)?.optString("text")
                        ?: vr.optJSONObject("shortBylineText")
                            ?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: ""

                    val durStr = vr.optJSONObject("lengthText")?.optString("simpleText") ?: ""
                    val dur = parseDuration(durStr)

                    if (!isMusicVideo(title, channel, dur)) continue

                    list.put(JSONObject().apply {
                        put("id", id)
                        put("title", title)
                        put("channel", channel)
                        put("dur", dur)
                        put("thumb", "https://i.ytimg.com/vi/$id/mqdefault.jpg")
                    })

                    if (list.length() >= 20) break
                }
                if (list.length() >= 20) break
            }
        } catch (e: Exception) { e.printStackTrace() }
        return list
    }

    private fun isMusicVideo(title: String, channel: String, dur: Int): Boolean {
        val tl = title.lowercase()
        val cl = channel.lowercase()
        if (cl.contains("vevo") || cl.contains("topic") || cl.contains("music") ||
            cl.contains("records") || cl.contains("entertainment") ||
            cl.contains("sound") || cl.contains("audio") || cl.contains("official")) return true
        if (tl.contains("official") || tl.contains("mv") || tl.contains("m/v") ||
            tl.contains("music video") || tl.contains("audio") || tl.contains("lyrics") ||
            tl.contains("lyric") || tl.contains("visualizer") || tl.contains("live") ||
            tl.contains("performance") || tl.contains("concert")) return true
        if (dur >= 60) return true
        return false
    }

    private fun parseDuration(s: String): Int {
        if (s.isEmpty()) return 0
        val parts = s.split(":")
        return try {
            when (parts.size) {
                3 -> parts[0].toInt() * 3600 + parts[1].toInt() * 60 + parts[2].toInt()
                2 -> parts[0].toInt() * 60 + parts[1].toInt()
                else -> 0
            }
        } catch (e: Exception) { 0 }
    }

    private fun fetchSuggestions(query: String): JSONArray {
        val url = "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${
            java.net.URLEncoder.encode(query, "UTF-8")
        }&hl=ko"

        val conn = URL(url).openConnection() as HttpsURLConnection
        conn.apply {
            setRequestProperty("User-Agent", "Mozilla/5.0 Firefox/124.0")
            connectTimeout = 8000
            readTimeout = 8000
        }

        val text = conn.inputStream.bufferedReader().readText()
        conn.disconnect()

        val result = JSONArray()
        try {
            val arr = JSONArray(text)
            if (arr.length() > 1) {
                val sugs = arr.getJSONArray(1)
                for (i in 0 until minOf(sugs.length(), 8)) {
                    result.put(sugs.getString(i))
                }
            }
        } catch (e: Exception) { e.printStackTrace() }
        return result
    }
}
