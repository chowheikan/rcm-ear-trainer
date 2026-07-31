/* ===== chords.js =====
 * Chord trainer with multiple choice answering.
 * Depends on: audio.js, notation.js, stats.js
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
        await initAudio(); // called from button click = user gesture
    }

    const checkboxes = document.querySelectorAll('.chord-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one chord type!");
        return;
    }

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const randomId = selectedIds[Math.floor(Math.random() * selectedIds.length)];
    currentChordInfo = chordsData.find(c => c.id === randomId);

    const rootMidi = Math.floor(Math.random() * 16) + 48;

    currentChordNotes = currentChordInfo.offsets.map(offset => {
        return Tone.Frequency(rootMidi + offset, "midi").toNote();
    });

    // Cut off any previous playback
    stopAllPlayback();

    // Reset UI
    hideChordAnswer();
    document.getElementById('replayChordBtn').classList.remove('hidden');
    document.getElementById('playChordBtn').innerHTML = '<i class="fas fa-step-forward"></i> Next';

    // Show choices
    showChordChoices(selectedIds);

    playChordNotes();
}

function playChordNotes() {
    if (!sampler || !sampler.loaded || currentChordNotes.length === 0) return;
    stopAllPlayback();
    sampler.triggerAttackRelease(currentChordNotes, "1n", Tone.now());
}

function showChordChoices(selectedIds) {
    const container = document.getElementById('chordChoicesArea');
    if (!container) return;

    container.innerHTML = '';
    container.classList.remove('hidden');

    selectedIds.forEach(id => {
        const info = chordsData.find(c => c.id === id);
        const btn = document.createElement('button');
        btn.className = 'choice-btn px-4 py-2.5 bg-slate-800 border border-slate-600 hover:border-purple-400 rounded-xl font-medium text-sm text-slate-200 transition-all';
        btn.textContent = info.name;
        btn.onclick = () => submitChordAnswer(id);
        container.appendChild(btn);
    });
}

async function submitChordAnswer(selectedId) {
    if (!currentChordInfo) return;

    const isCorrect = selectedId === currentChordInfo.id;
    const container = document.getElementById('chordChoicesArea');
    const buttons = container.querySelectorAll('.choice-btn');

    buttons.forEach(btn => {
        btn.classList.add('choice-disabled');
        if (btn.textContent === currentChordInfo.name) {
            btn.classList.add(isCorrect ? 'choice-correct' : 'choice-highlight');
        }
        if (!isCorrect && btn.textContent === chordsData.find(c => c.id === selectedId).name) {
            btn.classList.add('choice-wrong');
        }
    });

    await recordAnswer('chord', currentChordInfo.id, selectedId, isCorrect);

    showChordDetails();
}

function showChordDetails() {
    const answerArea = document.getElementById('chordAnswerArea');
    answerArea.classList.remove('hidden');
    answerArea.classList.add('flex');

    document.getElementById('chordNameDisplay').innerText = currentChordInfo.name;
    document.getElementById('chordNotesDisplay').innerHTML = currentChordNotes.map(n => formatNote(n)).join(' - ');
    document.getElementById('chordFeelingDisplay').innerText = currentChordInfo.feeling;

    let abcNotes = currentChordNotes.map(toABC).join('');
    let abc = `X:1\nM:4/4\nL:1/4\nK:C\n[${abcNotes}]4 |]`;
    renderScore("chordScore", abc);
}

function hideChordAnswer() {
    const answerArea = document.getElementById('chordAnswerArea');
    if (answerArea) {
        answerArea.classList.add('hidden');
        answerArea.classList.remove('flex');
    }
    const choicesArea = document.getElementById('chordChoicesArea');
    if (choicesArea) {
        choicesArea.innerHTML = '';
        choicesArea.classList.add('hidden');
    }
}
