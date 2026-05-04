/* ═══════════════════════════════════════════════════
   SYNC Android Bridge Patch
   - Replaces chrome.webview with SyncBridge
   - Adds MediaSession hooks for notification controls
   - Handles Android back button
   - Fixes mobile viewport/touch issues
═══════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ── Android Back Button ──────────────────────────
    window.onAndroidBack = function() {
        const np = document.getElementById('np');
        if (np && np.classList.contains('on')) {
            np.classList.remove('on');
            return;
        }
        const views = ['search-view','favs-view','queue-view','playlist-view'];
        for (const id of views) {
            const el = document.getElementById(id);
            if (el && (el.style.display !== 'none' && el.style.display !== '')) {
                el.style.display = 'none';
                return;
            }
        }
        // nothing to close — minimize app
        if (window.SyncBridge) window.SyncBridge.postMessage(JSON.stringify({ type: 'minimize' }));
    };

    // ── Media command receiver from Android notification ──
    // Called by MusicService via sendToWebView
    const _origSync = window.__sync;
    window.__sync = function(json) {
        try {
            const m = typeof json === 'string' ? JSON.parse(json) : json;
            if (m.type === 'mediaCommand') {
                switch (m.command) {
                    case 'play':
                        if (window.S && window.S.ytPlayer && window.S.ytReady) {
                            window.S.ytPlayer.playVideo();
                        }
                        return;
                    case 'pause':
                        if (window.S && window.S.ytPlayer && window.S.ytReady) {
                            window.S.ytPlayer.pauseVideo();
                        }
                        return;
                    case 'next':
                        if (typeof window.nextT === 'function') window.nextT();
                        return;
                    case 'prev':
                        if (typeof window.prevT === 'function') window.prevT();
                        return;
                    case 'stop':
                        if (window.S && window.S.ytPlayer) window.S.ytPlayer.stopVideo();
                        return;
                }
            }
        } catch(e) {}
        // fallthrough to original handler
        if (typeof _origSync === 'function') _origSync(json);
        else {
            // If original __sync hasn't been defined yet, queue it
            window._pendingSync = window._pendingSync || [];
            window._pendingSync.push(json);
        }
    };

    // ── Notify Android when track changes / playback state changes ──
    // Patch will hook into app.js after DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        // Observe S.track / S.playing changes via periodic check
        let _lastTrackId = null;
        let _lastPlaying = null;

        setInterval(function() {
            if (!window.S) return;
            // Track changed
            if (window.S.track && window.S.track.id !== _lastTrackId) {
                _lastTrackId = window.S.track.id;
                if (window.SyncBridge) {
                    window.SyncBridge.postMessage(JSON.stringify({
                        type: 'mediaTrack',
                        title: window.S.track.title || '',
                        channel: window.S.track.channel || '',
                        thumb: window.S.track.thumb || ''
                    }));
                }
            }
            // Playing state changed
            if (window.S.playing !== _lastPlaying) {
                _lastPlaying = window.S.playing;
                if (window.SyncBridge) {
                    window.SyncBridge.postMessage(JSON.stringify({
                        type: window.S.playing ? 'mediaPlay' : 'mediaPause'
                    }));
                }
            }
        }, 500);

        // ── Mobile: fix 100vh on Android Chrome ──────
        function fixVh() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        fixVh();
        window.addEventListener('resize', fixVh);

        // ── Touch: prevent double-tap zoom ───────────
        let lastTouch = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouch < 300) e.preventDefault();
            lastTouch = now;
        }, { passive: false });

        // ── Remove overlay-mode button if present ────
        // (overlay is Windows-only feature)
        const ovBtn = document.getElementById('overlay-toggle') ||
                      document.querySelector('[onclick*="overlay"]') ||
                      document.querySelector('[data-action="overlay"]');
        if (ovBtn) ovBtn.style.display = 'none';

        // ── Replay pending __sync messages ───────────
        if (window._pendingSync && window._pendingSync.length) {
            window._pendingSync.forEach(function(json) {
                try {
                    const m = JSON.parse(json);
                    // dispatch to app.js handler
                    const j = window._syncDispatch || window.__sync;
                    if (j && j !== window.__sync) j(json);
                } catch(e) {}
            });
            window._pendingSync = [];
        }
    });

    // ── Polyfill: hide statusbar-area elements on Android ──
    const style = document.createElement('style');
    style.textContent = `
        /* Android safe area & viewport fix */
        :root {
            --vh: 1vh;
            --safe-top: env(safe-area-inset-top, 0px);
            --safe-bottom: env(safe-area-inset-bottom, 0px);
        }
        /* Hide Windows-only overlay toggle */
        #overlay-toggle, [data-overlay-btn] { display: none !important; }
        /* Bottom bar respects navigation bar height */
        #bar { padding-bottom: max(12px, env(safe-area-inset-bottom, 12px)) !important; }
        /* Ensure touch targets are at least 44px */
        button, .btn, [role="button"] { min-height: 44px; min-width: 44px; }
        /* Prevent text selection on long press */
        * { -webkit-user-select: none; user-select: none; }
        input, textarea { -webkit-user-select: text; user-select: text; }
        /* Fix overscroll on Android WebView */
        body { overscroll-behavior: none; }
        /* Hide drag handle (window drag is Windows-only) */
        #drag-handle, .drag-handle, [data-drag] { display: none !important; }
        /* Scrollbar hidden on Android */
        ::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(style);

})();
