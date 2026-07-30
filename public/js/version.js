/* ===== version.js =====
 * App version management and update detection.
 * Must be loaded FIRST before all other modules.
 *
 * HOW TO RELEASE A NEW VERSION:
 * 1. Update APP_VERSION below
 * 2. Update version.json with the same version string
 * 3. Update all ?v= query strings in index.html (find & replace old version)
 * 4. Run: firebase deploy --only hosting
 */

const APP_VERSION = "1.0.0";

// Check for updates every 10 minutes
const VERSION_CHECK_INTERVAL = 10 * 60 * 1000;

function checkForUpdates() {
    fetch('/version.json?_t=' + Date.now())
        .then(res => res.json())
        .then(data => {
            if (data.version && data.version !== APP_VERSION) {
                showUpdateBanner(data.version);
            }
        })
        .catch(() => {
            // Silently fail — user might be offline
        });
}

function showUpdateBanner(newVersion) {
    // Don't show if already showing
    if (document.getElementById('updateBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-slide-up';
    banner.style.cssText = 'background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(12px); border-color: rgba(59, 130, 246, 0.5);';

    banner.innerHTML = `
        <i class="fas fa-arrow-rotate-right text-blue-400 text-lg"></i>
        <span class="text-slate-200 text-sm font-medium">
            New version <strong class="text-blue-400">v${newVersion}</strong> available!
        </span>
        <button onclick="location.reload(true)"
            class="ml-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-full transition-colors">
            Refresh
        </button>
        <button onclick="document.getElementById('updateBanner').remove()"
            class="ml-1 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none">
            &times;
        </button>
    `;

    document.body.appendChild(banner);
}

// Start periodic checks after page load
window.addEventListener('load', () => {
    // First check after 30 seconds (don't slow down initial load)
    setTimeout(checkForUpdates, 30 * 1000);
    // Then check periodically
    setInterval(checkForUpdates, VERSION_CHECK_INTERVAL);
});
