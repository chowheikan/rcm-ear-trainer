/* ===== main.js =====
 * Tab switching + Settings toggle.
 * Loaded last — all other modules must be loaded before this.
 */

// Tab Switching
function switchTab(tabId) {
    // Cut off any playing audio when switching tabs
    if (typeof stopAllPlayback === 'function') stopAllPlayback();

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

// Settings Toggle
function toggleSettings(tabId) {
    const content = document.getElementById('settings-content-' + tabId);
    const arrow = document.getElementById('settings-arrow-' + tabId);
    if (!content) return;

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('expanded');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}

// Initialize stats display on load
window.addEventListener('load', () => {
    if (typeof renderStatsBar === 'function') {
        setTimeout(renderStatsBar, 500);
    }
});
