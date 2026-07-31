const APP_VERSION = "1.2.0";
const VERSION_CHECK_INTERVAL = 2 * 60 * 1000; // check every 2 minutes

function checkForUpdates() {
    fetch('/version.json?_t=' + Date.now())
        .then(res => res.json())
        .then(data => {
            if (data.version && data.version !== APP_VERSION) {
                showUpdateBanner(data.version);
            }
        })
        .catch(() => {});
}

function showUpdateBanner(newVersion) {
    if (document.getElementById('updateBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-slide-up';
    banner.style.cssText = 'background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(12px); border-color: rgba(59, 130, 246, 0.5);';

    banner.innerHTML = `
        <i class="fas fa-arrow-rotate-right text-blue-400 text-lg"></i>
        <span class="text-slate-200 text-sm font-medium">
            New version <strong class="text-blue-400">v${newVersion}</strong>
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

window.addEventListener('load', () => {
    setTimeout(checkForUpdates, 5 * 1000);          // first check after 5s
    setInterval(checkForUpdates, VERSION_CHECK_INTERVAL); // then every 2 min
});
