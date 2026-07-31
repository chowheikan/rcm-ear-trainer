/* ===== main.js =====
 * Tab switching + Settings toggle + play lock.
 * Loaded last — all other modules must be loaded before this.
 */

// Track active tab for the nav settings cog
let _activeTab = 'interval';

// ---- Play lock (prevents double-click spam) ----
let _playLocked = false;

function acquirePlayLock() {
    if (_playLocked) return false;
    _playLocked = true;
    return true;
}

function releasePlayLock(delayMs = 700) {
    setTimeout(() => { _playLocked = false; }, delayMs);
}

// ---- Tab Switching ----
function switchTab(tabId) {
    if (typeof stopAllPlayback === 'function') stopAllPlayback();
    _activeTab = tabId;

    const tabs = ['interval', 'chord', 'progression', 'playback'];
    tabs.forEach(t => {
        document.getElementById('tab-content-' + t).classList.add('hidden');
        const btn = document.getElementById('tab-' + t);
        btn.className = 'px-3 py-1.5 text-sm bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-full font-semibold transition-all whitespace-nowrap';
    });

    document.getElementById('tab-content-' + tabId).classList.remove('hidden');
    const activeBtn = document.getElementById('tab-' + tabId);
    activeBtn.className = 'px-3 py-1.5 text-sm bg-blue-600 text-white rounded-full font-semibold shadow-lg shadow-blue-500/30 transition-all whitespace-nowrap';
}

// ---- Settings Toggle (per-tab via nav cog) ----
function toggleActiveTabSettings() {
    toggleSettings(_activeTab);
}

function toggleSettings(tabId) {
    const content = document.getElementById('settings-content-' + tabId);
    if (!content) return;
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
    } else {
        content.classList.add('expanded');
    }
}

// ---- Init stats on load ----
window.addEventListener('load', () => {
    if (typeof renderStatsBar === 'function') {
        setTimeout(renderStatsBar, 500);
    }
});
