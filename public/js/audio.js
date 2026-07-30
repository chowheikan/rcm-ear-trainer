/* ===== audio.js =====
 * Manages Tone.js Sampler (Salamander Grand Piano) and Click Synth (Metronome).
 * Auto-loads on page entry with a full-page loading screen.
 */

let sampler;
let isAudioInitialized = false;
let isAudioLoading = false;
let clickSynth = null;

async function initAudio() {
    if (isAudioInitialized || isAudioLoading) return;
    isAudioLoading = true;

    // Hard timeout — hide loading screen after 15s no matter what
    const loadingTimeout = setTimeout(() => hideLoadingScreen(), 15000);

    try {
        await Tone.start();

        sampler = new Tone.Sampler({
            urls: {
                C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", A3: "A3.mp3",
                C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", A4: "A4.mp3",
                C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", A5: "A5.mp3",
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/"
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
        isAudioLoading = false; // allow retry
    } finally {
        clearTimeout(loadingTimeout);
        hideLoadingScreen();
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && loadingScreen.style.display !== 'none') {
        loadingScreen.classList.add('opacity-0');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
    }
}

/**
 * Stops ALL currently playing / scheduled audio immediately.
 * Call this before every play action to enforce single-playback.
 */
function stopAllPlayback() {
    if (!isAudioInitialized) return;
    // Cancel all future Tone.js Transport-scheduled events
    Tone.Transport.cancel();
    Tone.Transport.stop();
    // Release all sampler notes immediately
    if (sampler) sampler.releaseAll();
    if (clickSynth) clickSynth.triggerRelease();
}

// Auto-load audio on page entry
window.addEventListener('load', () => {
    initAudio();
});
