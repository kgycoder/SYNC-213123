package com.sync.music

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.*
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import kotlinx.coroutines.*
import java.net.URL

class MusicService : Service() {

    companion object {
        const val CHANNEL_ID = "sync_music_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_PLAY = "com.sync.music.PLAY"
        const val ACTION_PAUSE = "com.sync.music.PAUSE"
        const val ACTION_NEXT = "com.sync.music.NEXT"
        const val ACTION_PREV = "com.sync.music.PREV"
        const val ACTION_STOP = "com.sync.music.STOP"
    }

    inner class LocalBinder : Binder() {
        fun getService(): MusicService = this@MusicService
    }

    private val binder = LocalBinder()
    private lateinit var mediaSession: MediaSessionCompat
    private lateinit var audioManager: AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null
    private var messageCallback: ((String) -> Unit)? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var currentTitle = "SYNC"
    private var currentArtist = ""
    private var currentThumbUrl = ""
    private var isPlaying = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        setupMediaSession()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> sendMediaCommand("play")
            ACTION_PAUSE -> sendMediaCommand("pause")
            ACTION_NEXT -> sendMediaCommand("next")
            ACTION_PREV -> sendMediaCommand("prev")
            ACTION_STOP -> {
                sendMediaCommand("stop")
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun sendMediaCommand(cmd: String) {
        messageCallback?.invoke("""{"type":"mediaCommand","command":"$cmd"}""")
    }

    fun setMessageCallback(cb: (String) -> Unit) {
        messageCallback = cb
    }

    fun updateMediaSession(title: String, artist: String, thumbUrl: String) {
        currentTitle = title.ifEmpty { "SYNC" }
        currentArtist = artist
        currentThumbUrl = thumbUrl

        mediaSession.setMetadata(
            MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "SYNC")
                .build()
        )

        updateNotification()

        // Load thumbnail async
        if (thumbUrl.isNotEmpty()) {
            serviceScope.launch {
                try {
                    val bmp = loadBitmap(thumbUrl)
                    withContext(Dispatchers.Main) {
                        mediaSession.setMetadata(
                            MediaMetadataCompat.Builder()
                                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "SYNC")
                                .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bmp)
                                .build()
                        )
                        updateNotificationWithBitmap(bmp)
                    }
                } catch (e: Exception) { /* ignore */ }
            }
        }
    }

    fun updateNotificationTitle(title: String) {
        currentTitle = title.ifEmpty { "SYNC" }
        updateNotification()
    }

    fun setPlaybackState(playing: Boolean) {
        isPlaying = playing
        val state = if (playing) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        mediaSession.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE
                )
                .build()
        )
        updateNotification()
    }

    fun doSearch(json: String) {
        serviceScope.launch {
            SearchHelper(applicationContext).doSearch(json)
        }
    }

    private fun setupMediaSession() {
        mediaSession = MediaSessionCompat(this, "SyncMusicSession").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { sendMediaCommand("play") }
                override fun onPause() { sendMediaCommand("pause") }
                override fun onSkipToNext() { sendMediaCommand("next") }
                override fun onSkipToPrevious() { sendMediaCommand("prev") }
                override fun onStop() { sendMediaCommand("stop") }
            })
            isActive = true
        }

        mediaSession.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setState(PlaybackStateCompat.STATE_PAUSED, 0, 1f)
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                )
                .build()
        )
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SYNC 음악 재생",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "음악 재생 컨트롤"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(albumArt: Bitmap? = null): Notification {
        val mainIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val prevIntent = PendingIntent.getService(this, 1,
            Intent(this, MusicService::class.java).setAction(ACTION_PREV),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val playIntent = PendingIntent.getService(this, 2,
            Intent(this, MusicService::class.java).setAction(if (isPlaying) ACTION_PAUSE else ACTION_PLAY),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val nextIntent = PendingIntent.getService(this, 3,
            Intent(this, MusicService::class.java).setAction(ACTION_NEXT),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val defaultArt = BitmapFactory.decodeResource(resources, R.drawable.ic_music_note)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist.ifEmpty { "SYNC Music" })
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(albumArt ?: defaultArt)
            .setContentIntent(mainIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setOngoing(isPlaying)
            .addAction(R.drawable.ic_skip_prev, "이전", prevIntent)
            .addAction(
                if (isPlaying) R.drawable.ic_pause else R.drawable.ic_play,
                if (isPlaying) "일시정지" else "재생",
                playIntent
            )
            .addAction(R.drawable.ic_skip_next, "다음", nextIntent)
            .setStyle(
                MediaStyle()
                    .setMediaSession(mediaSession.sessionToken)
                    .setShowActionsInCompactView(0, 1, 2)
            )
            .build()
    }

    private fun updateNotification(albumArt: Bitmap? = null) {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, buildNotification(albumArt))
    }

    private fun updateNotificationWithBitmap(bmp: Bitmap) {
        updateNotification(bmp)
    }

    private suspend fun loadBitmap(url: String): Bitmap = withContext(Dispatchers.IO) {
        val connection = URL(url).openConnection().apply {
            connectTimeout = 5000
            readTimeout = 5000
        }
        BitmapFactory.decodeStream(connection.getInputStream())
    }

    override fun onDestroy() {
        serviceScope.cancel()
        mediaSession.release()
        super.onDestroy()
    }
}
