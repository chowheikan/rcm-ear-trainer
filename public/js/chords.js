/* ===== chords.js =====
 * Chord trainer with multiple choice answering + compare panel.
 * Depends on: audio.js, notation.js, stats.js, main.js (play lock)
 */

const chordsData = [
    { id: 'major', name: "Major Triad", offsets: [0, 4, 7], feeling: "開心、陽光、穩定、光明。好似英雄出場或者圓滿結局 ☀️" },
    { id: 'minor', name: "Minor Triad", offsets: [0, 3, 7], feeling: "傷心、灰暗、憂鬱、神秘。好似悲劇發生、落雨天 🌧️" },
    { id: 'dom7', name: "Dominant 7th", offsets: [0, 4, 7, 10], feeling: "厚實、不穩定、有強烈張力 (Tension) 想解決。好似魔術師「Ta-da!」/ 少少爵士味 🎩" }
];

// State
let currentChordInfo = null;
let currentChordNotes = [];
let currentChordRootMidi = 0; // for compare panel

async function generateAndPlayChord() {
    if (!acquirePlayLock()) return;

    if (!isAudioInitialized) {
        await initAudio(); // called from button click = user gesture
    }

    const checkboxes = document.querySelectorAll('.chord-checkbox:checked');
    if (checkboxes.length === 0) {
        releasePlayLock(0);
        alert("Please select at least one chord type!");
        return;
    }

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const randomId = selectedIds[Math.floor(Math.random() * selectedIds.length)];
    currentChordInfo = chordsData.find(c => c.id === randomId);

    currentChordRootMidi = Math.floor(Math.random() * 16) + 48;
    currentChordNotes = currentChordInfo.offsets.map(offset =>
        Tone.Frequency(currentChordRootMidi + offset, "midi").toNote()
    );

    // Reset UI
    hideChordAnswer();
    document.getElementById('replayChordBtn').classList.remove('hidden');
    document.getElementById('playChordBtn').innerHTML = '<i class="fas fa-step-forward"></i> Next';

    showChordChoices(selectedIds);
    playChordNotes();
    releasePlayLock();
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

    // Show compare panel
    showChordCompare();
}

function showChordCompare() {
    const selectedIds = Array.from(
        document.querySelectorAll('.chord-checkbox:checked')
    ).map(cb => cb.value);

    const area = document.getElementById('chordCompareArea');
    const btnContainer = document.getElementById('chordCompareButtons');
    if (!area || !btnContainer || selectedIds.length < 2) return;

    area.classList.remove('hidden');
    btnContainer.innerHTML = '';

    selectedIds.forEach(id => {
        const info = chordsData.find(c => c.id === id);
        const isAnswer = id === currentChordInfo.id;
        const btn = document.createElement('button');
        btn.className = `px-3 py-1.5 text-xs rounded-lg border transition-all ${
            isAnswer
                ? 'border-emerald-500 text-emerald-300 bg-emerald-900/30 font-semibold'
                : 'border-slate-600 text-slate-300 bg-slate-800 hover:border-purple-400'
        }`;
        btn.innerHTML = `<i class="fas fa-play text-[10px] mr-1"></i>${info.name}`;
        btn.onclick = () => playCompareChord(id);
        btnContainer.appendChild(btn);
    });
}

function playCompareChord(id) {
    if (!sampler || !sampler.loaded) return;
    stopAllPlayback();
    const info = chordsData.find(c => c.id === id);
    const notes = info.offsets.map(offset =>
        Tone.Frequency(currentChordRootMidi + offset, "midi").toNote()
    );
    sampler.triggerAttackRelease(notes, "1n", Tone.now());
}

function hideChordAnswer() {
    const answerArea = document.getElementById('chordAnswerArea');
    if (answerArea) { answerArea.classList.add('hidden'); answerArea.classList.remove('flex'); }
    const choicesArea = document.getElementById('chordChoicesArea');
    if (choicesArea) { choicesArea.innerHTML = ''; choicesArea.classList.add('hidden'); }
    const compareArea = document.getElementById('chordCompareArea');
    if (compareArea) compareArea.classList.add('hidden');
}
