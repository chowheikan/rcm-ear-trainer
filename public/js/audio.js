/* ===== audio.js =====
 * Two-phase audio loading:
 *   Phase 1 (auto on load):  Fetch MP3 files → show real progress bar
 *   Phase 2 (on first Play): Tone.start() + create Sampler from cache
 *
 * This satisfies the browser autoplay policy (AudioContext needs user gesture).
 */

let sampler = null;
let clickSynth = null;
let isAudioInitialized = false;  // Phase 2 complete (ready to play)
let isAudioLoading = false;      // Phase 2 in progress
let isSamplesPreloaded = false;  // Phase 1 complete (files cached)

const SAMPLE_BASE_URL = "https://tonejs.github.io/audio/salamander/";
const SAMPLE_MAP = {
    C3: "C3.mp3",   "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", A3: "A3.mp3",
    C4: "C4.mp3",   "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", A4: "A4.mp3",
    C5: "C5.mp3",   "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", A5: "A5.mp3"
};
const SAMPLE_FILES = Object.entries(SAMPLE_MAP); // [[note, file], ...]

// ─── Phase 1: Prefetch (no AudioContext needed) ────────────────────────────

function startLoadingAnimation() {
    const bar = document.getElementById('loadingBar');
    if (!bar) return;
    bar.getBoundingClientRect(); // force reflow
    bar.style.transition = 'width 12s cubic-bezier(0.1, 0.5, 0.5, 1)';
    bar.style.width = '88%';
}

function finishLoadingAnimation(cb) {
    const bar = document.getElementById('loadingBar');
    if (bar) {
        bar.style.transition = 'width 0.3s ease';
        bar.style.width = '100%';
    }
    setTimeout(cb, 350);
}

function hideLoadingScreen() {
    const el = document.getElementById('loadingScreen');
    if (el && el.style.display !== 'none') {
        el.classList.add('opacity-0');
        setTimeout(() => { el.style.display = 'none'; }, 500);
    }
}

let _fetchedCount = 0;
function onFileFetched() {
    _fetchedCount++;
    const total = SAMPLE_FILES.length;
    requestAnimationFrame(() => {
        const t = document.getElementById('loadingText');
        const s = document.getElementById('loadingSubtext');
        if (t) t.textContent = `Loading Piano... ${_fetchedCount}/${total}`;
        if (s) s.textContent = _fetchedCount < total
            ? `Fetching ${SAMPLE_FILES[_fetchedCount]?.[0] || ''}...`
            : 'Almost ready...';
    });
}

async function preloadSamples() {
    startLoadingAnimation();
    const hardTimeout = setTimeout(() => hideLoadingScreen(), 20000);

    try {
        _fetchedCount = 0;
        // Fetch all files in parallel — caches them for Tone.Sampler to reuse
        await Promise.all(SAMPLE_FILES.map(([, file]) =>
            fetch(SAMPLE_BASE_URL + file)
                .catch(() => null)
                .finally(onFileFetched)
        ));
        isSamplesPreloaded = true;
    } catch (err) {
        console.warn("Sample prefetch error:", err);
    } finally {
        clearTimeout(hardTimeout);
        finishLoadingAnimation(() => hideLoadingScreen());
    }
}

// ─── Phase 2: Resume AudioContext + build Sampler (needs user gesture) ─────

async function initAudio() {
    if (isAudioInitialized || isAudioLoading) return;
    isAudioLoading = true;

    try {
        // MUST be called from a user gesture (button click)
        await Tone.start();

        // Build sampler — files are cached from Phase 1, loads in < 1s
        sampler = new Tone.Sampler({
            urls: SAMPLE_MAP,
            release: 1,
            baseUrl: SAMPLE_BASE_URL,
            onload: () => { isAudioInitialized = true; }
        }).toDestination();

        clickSynth = new Tone.MembraneSynth({
            pitchDecay: 0.008, octaves: 2,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        clickSynth.volume.value = -10;

        await Tone.loaded();
        isAudioInitialized = true;

    } catch (err) {
        console.error("Audio init failed:", err);
    } finally {
        isAudioLoading = false;
    }
}

// ─── Playback control ──────────────────────────────────────────────────────

function stopAllPlayback() {
    if (!isAudioInitialized) return;
    Tone.Transport.cancel();
    Tone.Transport.stop();
    if (sampler) sampler.releaseAll();
    if (clickSynth) clickSynth.triggerRelease();
}

// ─── Auto-start Phase 1 on page load ──────────────────────────────────────

window.addEventListener('load', () => {
    preloadSamples();
});
