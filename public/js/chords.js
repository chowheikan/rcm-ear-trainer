/* ===== chords.js =====
 * Chord trainer logic and data.
 * Depends on: audio.js, notation.js
 */

const chordsData = [
    { id: 'major', name: "Major Triad", offsets: [0, 4, 7], feeling: "開心、陽光、穩定、光明。好似英雄出場或者圓滿結局 ☀️" },
    { id: 'minor', name: "Minor Triad", offsets: [0, 3, 7], feeling: "傷心、灰暗、憂鬱、神秘。好似悲劇發生、落雨天 🌧️" },
    { id: 'dom7', name: "Dominant 7th", offsets: [0, 4, 7, 10], feeling: "厚實、不穩定、有強烈張力 (Tension) 想解決。好似魔術師「Ta-da!」/ 少少爵士味 🎩" }
];

// State
let currentChordInfo = null;
let currentChordNotes = [];

async function generateAndPlayChord() {
    if (!isAudioInitialized) {
        const btn = document.getElementById('playChordBtn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading Piano...';
        await initAudio();
        btn.innerHTML = originalHtml;
    }

    const checkboxes = document.querySelectorAll('.chord-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one chord type!");
        return;
    }

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const randomId = selectedIds[Math.floor(Math.random() * selectedIds.length)];
    currentChordInfo = chordsData.find(c => c.id === randomId);

    // C3 to E4 root
    const rootMidi = Math.floor(Math.random() * 16) + 48;

    currentChordNotes = currentChordInfo.offsets.map(offset => {
        return Tone.Frequency(rootMidi + offset, "midi").toNote();
    });

    // Reset UI
    hideChordAnswer();
    document.getElementById('chordDisplayArea').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('chordDisplayArea').classList.remove('opacity-0');
    }, 50);

    document.getElementById('replayChordBtn').classList.remove('hidden');
    document.getElementById('playChordBtn').innerHTML = '<i class="fas fa-step-forward"></i> Next Chord';

    playChordNotes();
}

function playChordNotes() {
    if (!sampler || !sampler.loaded || currentChordNotes.length === 0) return;
    sampler.triggerAttackRelease(currentChordNotes, "1n", Tone.now());
}

function revealChordAnswer() {
    if (!currentChordInfo) return;

    document.getElementById('revealChordBtn').classList.add('hidden');
    const answerArea = document.getElementById('chordAnswerArea');
    answerArea.classList.remove('hidden');
    answerArea.classList.add('flex');

    document.getElementById('chordNameDisplay').innerText = currentChordInfo.name;
    document.getElementById('chordNotesDisplay').innerHTML = currentChordNotes.map(n => formatNote(n)).join(' - ');
    document.getElementById('chordFeelingDisplay').innerText = currentChordInfo.feeling;

    // Generate Score
    let abcNotes = currentChordNotes.map(toABC).join('');
    let abc = `X:1\nM:4/4\nL:1/4\nK:C\n[${abcNotes}]4 |]`;
    renderScore("chordScore", abc);
}

function hideChordAnswer() {
    document.getElementById('revealChordBtn').classList.remove('hidden');
    const answerArea = document.getElementById('chordAnswerArea');
    answerArea.classList.add('hidden');
    answerArea.classList.remove('flex');
}
