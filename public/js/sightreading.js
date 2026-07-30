/* ===== sightreading.js =====
 * Sightreading trainer logic and data.
 * Depends on: audio.js, notation.js
 * NOTE: This module is currently hidden from the UI (in progress).
 */

// The Vivaldi melody transposed to 3/4
const sightreadingABC = `X:1
M:3/4
L:1/8
K:Gm
g d B G d B | G D G>A B G | TA4 G2 |
G/A/B/c/ d d d e | c c c/d/e/f/ g g | g a ^f ^f g2 |]`;

const sightreadingNotes = [
    // Bar 1 (from original bar 29)
    { note: "G5", duration: 0.5 }, { note: "D5", duration: 0.5 }, { note: "Bb4", duration: 0.5 },
    { note: "G4", duration: 0.5 }, { note: "D5", duration: 0.5 }, { note: "Bb4", duration: 0.5 },
    // Bar 2 (from original bar 29 & 30)
    { note: "G4", duration: 0.5 }, { note: "D4", duration: 0.5 },
    { note: "G4", duration: 0.75 }, { note: "A4", duration: 0.25 }, { note: "Bb4", duration: 0.5 }, { note: "G4", duration: 0.5 },
    // Bar 3 (from original bar 30)
    { note: "A4", duration: 2.0 }, { note: "G4", duration: 1.0 },
    // Bar 4 (from original bar 33)
    { note: "G4", duration: 0.25 }, { note: "A4", duration: 0.25 }, { note: "Bb4", duration: 0.25 }, { note: "C5", duration: 0.25 },
    { note: "D5", duration: 0.5 }, { note: "D5", duration: 0.5 }, { note: "D5", duration: 0.5 }, { note: "Eb5", duration: 0.5 },
    // Bar 5 (from original bar 33 & 34)
    { note: "C5", duration: 0.5 }, { note: "C5", duration: 0.5 },
    { note: "C5", duration: 0.25 }, { note: "D5", duration: 0.25 }, { note: "Eb5", duration: 0.25 }, { note: "F5", duration: 0.25 },
    { note: "G5", duration: 0.5 }, { note: "G5", duration: 0.5 },
    // Bar 6 (from original bar 34)
    { note: "G5", duration: 0.5 }, { note: "A5", duration: 0.5 }, { note: "F#5", duration: 0.5 }, { note: "F#5", duration: 0.5 },
    { note: "G5", duration: 1.0 }
];

function renderSightreadingScore() {
    renderScore("sightreadingScoreArea", sightreadingABC);
}

async function playSightreading() {
    const btn = document.getElementById('playSightreadingBtn');
    const originalHtml = btn.innerHTML;

    if (!isAudioInitialized) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading Piano...';
        await initAudio();
    }

    btn.innerHTML = '<i class="fas fa-volume-up mr-2"></i> Playing...';
    btn.classList.add('opacity-75', 'pointer-events-none');

    const now = Tone.now();
    const bpm = 75; // Sightreading tempo
    const beatDuration = 60 / bpm;

    let countInStart = now + 0.5;

    // Count in 3 beats for 3/4 time
    for (let i = 0; i < 3; i++) {
        clickSynth.triggerAttackRelease("C4", "32n", countInStart + (i * beatDuration));
    }

    let melodyStart = countInStart + (3 * beatDuration);
    let currentOffset = 0;

    sightreadingNotes.forEach(item => {
        let noteDurationInSeconds = item.duration * beatDuration;
        sampler.triggerAttackRelease(item.note, noteDurationInSeconds * 0.9, melodyStart + currentOffset);
        currentOffset += noteDurationInSeconds;
    });

    // Reset button after playback
    setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.classList.remove('opacity-75', 'pointer-events-none');
    }, (melodyStart + currentOffset - now) * 1000 + 500);
}
