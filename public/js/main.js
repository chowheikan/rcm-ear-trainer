/* ===== main.js =====
 * Entry point: Tab switching logic.
 * Loaded last — all other modules must be loaded before this.
 */

// Tab Switching
function switchTab(tabId) {
    const tabs = ['interval', 'chord', 'progression', 'playback'];

    tabs.forEach(t => {
        document.getElementById('tab-content-' + t).classList.add('hidden');
        document.getElementById('tab-' + t).className = 'px-6 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-full font-bold transition-all flex items-center';
    });

    document.getElementById('tab-content-' + tabId).classList.remove('hidden');
    document.getElementById('tab-' + tabId).className = 'px-6 py-2 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center';
}
