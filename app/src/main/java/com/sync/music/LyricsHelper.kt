package com.sync.music

import android.content.Context
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

class LyricsHelper(private val context: Context) {

    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val activity get() = context as? MainActivity

    private val creditRegex = Regex(
        """^\s*(?:作词|作曲|编曲|混音|制作人|出品|录音|母带|OP|SP|厂牌|发行|MV监制|监制|制作|ISRC|专辑|歌手|作詞|作曲者|編曲|混音師)\s*[：:].{0,80}$"""
    )

    fun fetchLyrics(json: String) {
        mainScope.launch {
            try {
                val req = JSONObject(json)
                val rawTitle = req.optString("title")
                val channel = req.optString("channel")
                val duration = req.optDouble("duration", 0.0)
                val callbackId = req.optString("id", "0")

                val lines = withContext(Dispatchers.IO) {
                    tryLrclib(rawTitle, channel, duration)
                        ?: tryNetEase(rawTitle, channel, duration)
                }

                val result = JSONObject().apply {
                    put("type", "lyricsResult")
                    put("id", callbackId)
                    if (lines != null) {
                        put("success", true)
                        put("lines", lines)
                    } else {
                        put("success", false)
                        put("lines", JSONArray())
                    }
                }
                activity?.sendToWebView(result.toString())
            } catch (e: Exception) {
                val req = try { JSONObject(json) } catch (_: Exception) { JSONObject() }
                val result = JSONObject().apply {
                    put("type", "lyricsResult")
                    put("id", req.optString("id", "0"))
                    put("success", false)
                    put("lines", JSONArray())
                }
                activity?.sendToWebView(result.toString())
            }
        }
    }

    private fun tryLrclib(rawTitle: String, channel: String, ytDuration: Double): JSONArray? {
        return try {
            val cleanTitle = cleanTitle(rawTitle)
            val cleanArtist = cleanArtist(channel)

            var results = searchLrclib("$cleanTitle $cleanArtist")
            if (!hasSyncedResults(results)) results = searchLrclib(cleanTitle)
            if (!hasSyncedResults(results)) {
                val stripped = stripBrackets(cleanTitle)
                if (stripped != cleanTitle) results = searchLrclib(stripped)
            }
            if (!hasSyncedResults(results) && cleanArtist.isNotBlank())
                results = searchLrclib("$cleanArtist $cleanTitle")

            if (results == null || results.length() == 0) return null

            val candidates = mutableListOf<Pair<String, Double>>()
            for (i in 0 until results.length()) {
                val item = results.getJSONObject(i)
                val lrcText = item.optString("syncedLyrics")
                if (lrcText.isBlank()) continue

                var lrcDur = getLrcLastTimestamp(lrcText)
                if (lrcDur <= 0) lrcDur = item.optDouble("duration", 0.0)

                var score = 0.0
                if (ytDuration > 0 && lrcDur > 0) {
                    val diff = Math.abs(lrcDur - ytDuration)
                    score += when {
                        diff <= 3 -> 50.0
                        diff <= 10 -> 35.0
                        diff <= 30 -> 15.0
                        diff <= 60 -> 5.0
                        else -> -25.0
                    }
                }
                score += titleSimilarity(cleanTitle, item.optString("trackName")) * 30
                score += titleSimilarity(cleanArtist, item.optString("artistName")) * 20
                candidates.add(Pair(lrcText, score))
            }

            if (candidates.isEmpty()) return null
            candidates.sortByDescending { it.second }
            val parsed = parseLrc(candidates[0].first)
            if (parsed.length() > 0) parsed else null
        } catch (e: Exception) { null }
    }

    private fun tryNetEase(rawTitle: String, channel: String, ytDuration: Double): JSONArray? {
        return try {
            val cleanTitle = cleanTitle(rawTitle)
            val cleanArtist = cleanArtist(channel)

            val queries = listOf("$cleanTitle $cleanArtist", cleanTitle, stripBrackets(cleanTitle)).distinct()

            var candidates: List<Pair<Long, Double>>? = null
            for (q in queries) {
                candidates = searchNetEase(q, cleanTitle, cleanArtist, ytDuration)
                if (!candidates.isNullOrEmpty()) break
            }
            if (candidates.isNullOrEmpty()) return null

            for (i in 0 until minOf(3, candidates.size)) {
                if (candidates[i].second < 40) break
                val lines = fetchNetEaseLrc(candidates[i].first)
                if (lines != null && lines.length() > 0) return lines
            }
            null
        } catch (e: Exception) { null }
    }

    private fun searchNetEase(query: String, cleanTitle: String, cleanArtist: String, ytDuration: Double): List<Pair<Long, Double>> {
        val url = "https://music.163.com/api/search/get?s=${java.net.URLEncoder.encode(query, "UTF-8")}&type=1&limit=10"
        val conn = URL(url).openConnection()
        conn.setRequestProperty("Referer", "https://music.163.com")
        conn.setRequestProperty("Cookie", "appver=8.0.0")
        conn.connectTimeout = 10000
        conn.readTimeout = 10000

        val json = conn.getInputStream().bufferedReader().readText()
        val doc = JSONObject(json)
        val songs = doc.optJSONObject("result")?.optJSONArray("songs") ?: return emptyList()

        val candidates = mutableListOf<Pair<Long, Double>>()
        for (i in 0 until songs.length()) {
            val song = songs.getJSONObject(i)
            val songId = song.getLong("id")
            val songTitle = song.optString("name")
            val artists = buildString {
                song.optJSONArray("artists")?.let { arr ->
                    for (j in 0 until arr.length()) append(arr.getJSONObject(j).optString("name")).append(" ")
                }
            }.trim()
            val duration = song.optLong("duration", 0L) / 1000.0

            var score = titleSimilarity(cleanTitle, songTitle) * 40
            score += titleSimilarity(cleanArtist, artists) * 25
            if (ytDuration > 0 && duration > 0) {
                val diff = Math.abs(duration - ytDuration)
                score += when {
                    diff <= 3 -> 30.0
                    diff <= 10 -> 18.0
                    diff <= 30 -> 8.0
                    else -> -15.0
                }
            }
            candidates.add(Pair(songId, score))
        }
        candidates.sortByDescending { it.second }
        return candidates
    }

    private fun fetchNetEaseLrc(songId: Long): JSONArray? {
        val url = "https://music.163.com/api/song/lyric?id=$songId&lv=1&kv=1&tv=-1"
        val conn = URL(url).openConnection()
        conn.setRequestProperty("Referer", "https://music.163.com")
        conn.setRequestProperty("Cookie", "appver=8.0.0")
        conn.connectTimeout = 10000
        conn.readTimeout = 10000

        val json = conn.getInputStream().bufferedReader().readText()
        val doc = JSONObject(json)

        var lrcText = doc.optJSONObject("klyric")?.optString("lyric")
        if (lrcText.isNullOrBlank())
            lrcText = doc.optJSONObject("lrc")?.optString("lyric")
        if (lrcText.isNullOrBlank()) return null

        val parsed = parseLrc(lrcText)
        return if (parsed.length() > 0) parsed else null
    }

    private fun searchLrclib(query: String): JSONArray? {
        return try {
            val url = "https://lrclib.net/api/search?q=${java.net.URLEncoder.encode(query, "UTF-8")}"
            val conn = URL(url).openConnection()
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            val json = conn.getInputStream().bufferedReader().readText()
            JSONArray(json)
        } catch (e: Exception) { null }
    }

    private fun hasSyncedResults(results: JSONArray?): Boolean {
        if (results == null) return false
        for (i in 0 until results.length()) {
            val lrc = results.optJSONObject(i)?.optString("syncedLyrics") ?: continue
            if (lrc.isNotBlank()) return true
        }
        return false
    }

    private fun getLrcLastTimestamp(lrc: String): Double {
        val regex = Regex("""^\[(\d+):(\d+)\.(\d+)\]""")
        var last = 0.0
        lrc.lines().forEach { line ->
            regex.find(line.trim())?.let { m ->
                val ms = m.groupValues[3].padEnd(3, '0').substring(0, 3)
                val t = m.groupValues[1].toInt() * 60.0 + m.groupValues[2].toInt() + ms.toInt() / 1000.0
                if (t > last) last = t
            }
        }
        return last
    }

    private fun parseLrc(lrc: String): JSONArray {
        val list = mutableListOf<Pair<Double, String>>()
        val regex = Regex("""^\[(\d+):(\d+)\.(\d+)\](.*)""")
        lrc.lines().forEach { line ->
            val m = regex.find(line.trim()) ?: return@forEach
            val min = m.groupValues[1].toInt()
            val sec = m.groupValues[2].toInt()
            val ms = m.groupValues[3].padEnd(3, '0').substring(0, 3)
            val t = min * 60.0 + sec + ms.toInt() / 1000.0
            val text = m.groupValues[4].trim()
            if (text.isEmpty() || creditRegex.matches(text)) return@forEach
            list.add(Pair(t, text))
        }
        list.sortBy { it.first }

        val result = JSONArray()
        for (i in list.indices) {
            val start = list[i].first
            val end = if (i + 1 < list.size) list[i + 1].first else start + 5.0
            result.put(JSONObject().apply {
                put("start", start)
                put("end", end)
                put("text", list[i].second)
            })
        }
        return result
    }

    private fun titleSimilarity(a: String, b: String): Double {
        if (a.isBlank() || b.isBlank()) return 0.0
        val al = a.lowercase(); val bl = b.lowercase()
        if (al == bl) return 1.0
        if (bl.contains(al) || al.contains(bl)) return 0.85
        val wa = al.split(Regex("""\W+""")).filter { it.length > 1 }.toSet()
        val wb = bl.split(Regex("""\W+""")).filter { it.length > 1 }.toSet()
        if (wa.isEmpty() || wb.isEmpty()) return 0.0
        return wa.intersect(wb).size.toDouble() / maxOf(wa.size, wb.size)
    }

    private fun stripBrackets(t: String): String {
        var r = t.replace(Regex("""\([^)]*\)"""), "").trim()
        r = r.replace(Regex("""\[[^\]]*\]"""), "").trim()
        return r.replace(Regex("""\s{2,}"""), " ").trim()
    }

    private fun cleanTitle(t: String): String {
        val opts = setOf(RegexOption.IGNORE_CASE)
        var r = t
        val tagRx = """official\s*(?:music\s*)?(?:video|audio|mv|lyric\s*video|visualizer)?|m/?v|music\s*video|audio(?:\s*only)?|lyrics?\s*(?:video|ver(?:sion)?)?|lyric\s*video|visualizer|live(?:\s+(?:performance|version|session|at\s+.+?))?|performance(?:\s+video)?|concert(?:\s+version)?|hd|4k|1080p|720p|full\s+(?:song|version|album)|remaster(?:ed)?(?:\s+version)?|re-?upload|fan\s+(?:made|video|edit|cam)|color\s*coded|eng(?:lish)?\s*(?:ver\.?|version|sub(?:title)?s?)?|kor(?:ean)?\s*(?:ver\.?|version)?|jp(?:n)?\s*(?:ver\.?|version)?|공식|공식\s*(?:뮤직\s*비디오|음원|영상)?|뮤직\s*비디오|음원|영상|티저|예고편|메이킹필름|안무|prod(?:uced)?\s*(?:by\s*)?.+?|feat\.?\s*.+?|ft\.?\s*.+?|with\s+.+?"""
        r = r.replace(Regex("""\(\s*(?:$tagRx)[^)]*\)""", opts), "").trim()
        r = r.replace(Regex("""\[\s*(?:$tagRx)[^\]]*\]""", opts), "").trim()
        r = r.replace(Regex("""\s*[-|]\s*(?:$tagRx)\s*$""", opts), "").trim()
        r = r.replace(Regex("""\s+(?:feat\.?|ft\.?|with)\s+.+$""", opts), "").trim()
        r = r.replace(Regex("""\s+prod(?:uced)?\s*(?:by\s*).+$""", opts), "").trim()
        r = r.replace(Regex("""[\u2013\u2014]+"""), "-").trim()
        return r.replace(Regex("""\s{2,}"""), " ").trim()
    }

    private fun cleanArtist(c: String): String {
        val opts = setOf(RegexOption.IGNORE_CASE)
        var r = c.replace(Regex("""\s*[-–]\s*Topic\s*$""", opts), "").trim()
        r = r.replace(Regex("""VEVO$""", opts), "").trim()
        r = r.replace(Regex("""\s*(?:Records|Entertainment|Music|Official|Label|Studios?)\s*$""", opts), "").trim()
        return r.replace(Regex("""\s{2,}"""), " ").trim()
    }
}
