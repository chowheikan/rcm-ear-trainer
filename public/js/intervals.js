/* ===== intervals.js =====
 * Interval trainer with multiple choice answering.
 * Depends on: audio.js, notation.js, stats.js
 */

const intervalsData = {
    'm3': { name: 'Minor 3rd', semitones: 3, hint: 'Greensleeves (開頭) / 搖籃曲' },
    'M3': { name: 'Major 3rd', semitones: 4, hint: 'Vivaldi Spring (春) / 門鈴聲' },
    'P4': { name: 'Perfect 4th', semitones: 5, hint: '中國國歌 / Here Comes the Bride' },
    'P5': { name: 'Perfect 5th', semitones: 7, hint: 'Twinkle Twinkle Little Star / Star Wars' },
    'm6': { name: 'Minor 6th', semitones: 8, hint: 'Love Story (Where Do I Begin) / Romeo & Juliet (Love Theme)' },
    'M6': { name: 'Major 6th', semitones: 9, hint: 'My Bonnie Lies Over the Ocean' },
    'P8': { name: 'Perfect Octave', semitones: 12, hint: 'Somewhere Over the Rainbow' }
};

// State
let currentIntervalInfo = null;
let currentIntervalKey = '';
let currentNotes = [];
let currentExamDirection = '';

async function generateAndPlayInterval() {
    if (!isAudioInitialized) {
        await initAudio(); // called from button click = user gesture
    }

    const checkboxes = document.querySelectorAll('.interval-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one interval to test!");
        return;
    }

    const selectedIntervals = Array.from(checkboxes).map(cb => cb.value);
    const randomType = selectedIntervals[Math.floor(Math.random() * selectedIntervals.length)];
    currentIntervalKey = randomType;
    currentIntervalInfo = intervalsData[randomType];

    // RCM Level 5 range roughly G3 to G5
    const rootMidi = Math.floor(Math.random() * 15) + 55;
    const topMidi = rootMidi + currentIntervalInfo.semitones;

    const rootNote = Tone.Frequency(rootMidi, "midi").toNote();
    const topNote = Tone.Frequency(topMidi, "midi").toNote();

    currentNotes = [rootNote, topNote];
    currentExamDirection = Math.random() > 0.5 ? 'ascending' : 'descending';

    // Cut off any previous playback
    stopAllPlayback();

    // Reset UI
    hideIntervalAnswer();
    document.getElementById('replayBtn').classList.remove('hidden');
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-step-forward"></i> Next';

    // Show choices
    showIntervalChoices(selectedIntervals);

    playIntervalNotes();
}

function playIntervalNotes() {
    if (!sampler || !sampler.loaded || currentNotes.length === 0) return;
    stopAllPlayback();
    const now = Tone.now();
    const mode = document.getElementById('playbackMode').value;

    const n1 = currentNotes[0];
    const n2 = currentNotes[1];

    if (mode === 'ascending') {
        sampler.triggerAttackRelease(n1, "2n", now);
        sampler.triggerAttackRelease(n2, "2n", now + 1);
    } else if (mode === 'descending') {
        sampler.triggerAttackRelease(n2, "2n", now);
        sampler.triggerAttackRelease(n1, "2n", now + 1);
    } else if (mode === 'harmonic') {
        sampler.triggerAttackRelease([n1, n2], "1n", now);
    } else if (mode === 'exam') {
        if (currentExamDirection === 'ascending') {
            sampler.triggerAttackRelease(n1, "2n", now);
            sampler.triggerAttackRelease(n2, "2n", now + 1);
        } else {
            sampler.triggerAttackRelease(n2, "2n", now);
            sampler.triggerAttackRelease(n1, "2n", now + 1);
        }
        sampler.triggerAttackRelease([n1, n2], "1n", now + 3);
    }
}

function showIntervalChoices(selectedKeys) {
    const container = document.getElementById('intervalChoicesArea');
    if (!container) return;

    container.innerHTML = '';
    container.classList.remove('hidden');

    selectedKeys.forEach(key => {
        const info = intervalsData[key];
        const btn = document.createElement('button');
        btn.className = 'choice-btn px-4 py-2.5 bg-slate-800 border border-slate-600 hover:border-blue-400 rounded-xl font-medium text-sm text-slate-200 transition-all';
        btn.textContent = info.name;
        btn.onclick = () => submitIntervalAnswer(key);
        container.appendChild(btn);
    });
}

async function submitIntervalAnswer(selectedKey) {
    if (!currentIntervalInfo) return;

    const isCorrect = selectedKey === currentIntervalKey;
    const container = document.getElementById('intervalChoicesArea');
    const buttons = container.querySelectorAll('.choice-btn');

    // Disable all buttons
    buttons.forEach(btn => {
        btn.classList.add('choice-disabled');
        if (btn.textContent === intervalsData[currentIntervalKey].name) {
            btn.classList.add(isCorrect ? 'choice-correct' : 'choice-highlight');
        }
        if (!isCorrect && btn.textContent === intervalsData[selectedKey].name) {
            btn.classList.add('choice-wrong');
        }
    });

    // Record stats
    await recordAnswer('interval', currentIntervalKey, selectedKey, isCorrect);

    // Show answer details
    showIntervalDetails();
}

function showIntervalDetails() {
    const answerArea = document.getElementById('answerArea');
    answerArea.classList.remove('hidden');
    answerArea.classList.add('flex');

    const mode = document.getElementById('playbackMode').value;
    let displayNotes = [currentNotes[0], currentNotes[1]];
    let arrowHtml = '<i class="fas fa-arrow-right"></i>';

    if (mode === 'descending' || (mode === 'exam' && currentExamDirection === 'descending')) {
        displayNotes = [currentNotes[1], currentNotes[0]];
        arrowHtml = '<i class="fas fa-arrow-right text-blue-500"></i>';
    } else if (mode === 'harmonic') {
        arrowHtml = '<i class="fas fa-plus text-slate-500"></i>';
    }

    document.getElementById('note1Display').innerHTML = formatNote(displayNotes[0]);
    document.getElementById('directionIcon').innerHTML = arrowHtml;
    document.getElementById('note2Display').innerHTML = formatNote(displayNotes[1]);

    document.getElementById('intervalNameDisplay').innerText = currentIntervalInfo.name;
    document.getElementById('intervalHintDisplay').innerText = currentIntervalInfo.hint;

    // Generate Score
    let abc1 = toABC(currentNotes[0]);
    let abc2 = toABC(currentNotes[1]);
    let abc = "X:1\nM:4/4\nL:1/4\nK:C\n";

    if (mode === 'ascending') {
        abc += `${abc1}2 ${abc2}2 |]`;
    } else if (mode === 'descending') {
        abc += `${abc2}2 ${abc1}2 |]`;
    } else if (mode === 'harmonic') {
        abc = "X:1\nM:4/4\nL:1/4\nK:C\n";
        abc += `[${abc1}${abc2}]4 |]`;
    } else if (mode === 'exam') {
        if (currentExamDirection === 'ascending') {
            abc += `${abc1}2 ${abc2}2 | [${abc1}${abc2}]4 |]`;
        } else {
            abc += `${abc2}2 ${abc1}2 | [${abc1}${abc2}]4 |]`;
        }
    }
    renderScore("intervalScore", abc);
}

function hideIntervalAnswer() {
    const answerArea = document.getElementById('answerArea');
    if (answerArea) {
        answerArea.classList.add('hidden');
        answerArea.classList.remove('flex');
    }
    const choicesArea = document.getElementById('intervalChoicesArea');
    if (choicesArea) {
        choicesArea.innerHTML = '';
        choicesArea.classList.add('hidden');
    }
}
