/* ===== progressions.js =====
 * Chord progression trainer logic and data.
 * Depends on: audio.js, notation.js
 */

const progressionsData = [
    { id: 'I-IV-I', name: "I - IV - I", feeling: "「阿們」結尾 (Amen Cadence) ⛪：平和、寬廣、似教會詩歌嘅結尾，冇咩攻擊性。" },
    { id: 'I-V-I', name: "I - V - I", feeling: "古典結尾 (Authentic Cadence) 🏛️：強烈、肯定、似交響樂完場。中間嗰吓 V (屬和弦) 會有一種想推返去 I 嘅張力。" }
];

// State
let currentProgressionInfo = null;
let currentProgressionNotes = [];

async function generateAndPlayProgression() {
    if (!isAudioInitialized) {
        const btn = document.getElementById('playProgressionBtn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading Piano...';
        await initAudio();
        btn.innerHTML = originalHtml;
    }

    const checkboxes = document.querySelectorAll('.progression-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one progression!");
        return;
    }

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const randomId = selectedIds[Math.floor(Math.random() * selectedIds.length)];
    currentProgressionInfo = progressionsData.find(p => p.id === randomId);

    // Keep bass clear
    const rootMidi = Math.floor(Math.random() * 5) + 48;
    currentProgressionNotes = [];

    // I Chord (Root pos, 4 notes)
    const chordI = [rootMidi, rootMidi + 12, rootMidi + 16, rootMidi + 19].map(m => Tone.Frequency(m, "midi").toNote());
    currentProgressionNotes.push(chordI);

    if (currentProgressionInfo.id === 'I-IV-I') {
        // IV Chord (Ascending bass perfect 4th)
        const ivRoot = rootMidi + 5;
        const chordIV = [ivRoot, ivRoot + 12, ivRoot + 16, ivRoot + 19].map(m => Tone.Frequency(m, "midi").toNote());
        currentProgressionNotes.push(chordIV);
    } else {
        // V Chord (Ascending bass perfect 5th)
        const vRoot = rootMidi + 7;
        const chordV = [vRoot, vRoot + 12, vRoot + 16, vRoot + 19].map(m => Tone.Frequency(m, "midi").toNote());
        currentProgressionNotes.push(chordV);
    }

    // Back to I Chord
    currentProgressionNotes.push(chordI);

    // Reset UI
    hideProgressionAnswer();
    document.getElementById('progressionDisplayArea').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('progressionDisplayArea').classList.remove('opacity-0');
    }, 50);

    document.getElementById('replayProgressionBtn').classList.remove('hidden');
    document.getElementById('playProgressionBtn').innerHTML = '<i class="fas fa-step-forward"></i> Next Progression';

    playProgressionNotes();
}

function playProgressionNotes() {
    if (!sampler || !sampler.loaded || currentProgressionNotes.length === 0) return;
    const now = Tone.now();

    sampler.triggerAttackRelease(currentProgressionNotes[0], "2n", now);
    sampler.triggerAttackRelease(currentProgressionNotes[1], "2n", now + 1.2);
    sampler.triggerAttackRelease(currentProgressionNotes[2], "1n", now + 2.4);
}

function revealProgressionAnswer() {
    if (!currentProgressionInfo) return;

    document.getElementById('revealProgressionBtn').classList.add('hidden');
    const answerArea = document.getElementById('progressionAnswerArea');
    answerArea.classList.remove('hidden');
    answerArea.classList.add('flex');

    document.getElementById('progressionNameDisplay').innerText = currentProgressionInfo.name;
    document.getElementById('progressionFeelingDisplay').innerText = currentProgressionInfo.feeling;

    // Generate Score (Grand Staff: Treble for Chords, Bass for Bass Note)
    let bass1 = toABC(currentProgressionNotes[0][0]);
    let treble1 = currentProgressionNotes[0].slice(1).map(toABC).join('');

    let bass2 = toABC(currentProgressionNotes[1][0]);
    let treble2 = currentProgressionNotes[1].slice(1).map(toABC).join('');

    let bass3 = toABC(currentProgressionNotes[2][0]);
    let treble3 = currentProgressionNotes[2].slice(1).map(toABC).join('');

    // %%staves {1 2} creates a piano brace connecting the two staves
    let abc = `X:1\nM:4/4\nL:1/4\n%%staves {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:C\n`;
    abc += `[V:1] [${treble1}]2 [${treble2}]2 | [${treble3}]4 |]\n`;
    abc += `[V:2] ${bass1}2 ${bass2}2 | ${bass3}4 |]`;

    renderScore("progressionScore", abc);
}

function hideProgressionAnswer() {
    document.getElementById('revealProgressionBtn').classList.remove('hidden');
    const answerArea = document.getElementById('progressionAnswerArea');
    answerArea.classList.add('hidden');
    answerArea.classList.remove('flex');
}
