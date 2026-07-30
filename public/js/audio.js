/* ===== audio.js =====
 * Manages Tone.js Sampler (Salamander Grand Piano) and Click Synth (Metronome).
 * Must be loaded BEFORE any trainer modules.
 */

let sampler;
let isAudioInitialized = false;
let isAudioLoading = false;
let clickSynth = null;

async function initAudio() {
    if (isAudioInitialized || isAudioLoading) return;
    isAudioLoading = true;

    const btnText = document.getElementById('initAudioText');
    const loader = document.getElementById('initAudioLoader');

    if (btnText) btnText.innerText = "Loading Piano...";
    if (loader) loader.classList.remove('hidden');

    await Tone.start();

    // Load Salamander Grand Piano Samples
    sampler = new Tone.Sampler({
        urls: {
            C3: "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            A5: "A5.mp3",
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/"
    }).toDestination();

    clickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    clickSynth.volume.value = -10;

    await Tone.loaded();

    isAudioInitialized = true;
    isAudioLoading = false;

    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.style.display = 'none';
}
