/* ===== playback.js =====
 * Playback / Melody trainer logic and data.
 * Depends on: audio.js, notation.js
 */

const playbackKeys = {
    'A-maj': { name: 'A Major', abcKey: 'A', scale: [69, 71, 73, 74, 76, 81] }, // A4 to A5
    'E-maj': { name: 'E Major', abcKey: 'E', scale: [64, 66, 68, 69, 71, 76] }, // E4 to E5
    'A-min': { name: 'A Minor', abcKey: 'Am', scale: [69, 71, 72, 74, 76, 81] },
    'E-min': { name: 'E Minor', abcKey: 'Em', scale: [64, 66, 67, 69, 71, 76] }
};

const playbackTimes = {
    '2/4': {
        name: '2/4',
        bpm: 80,
        rhythms: [
            [1, 0.5, 0.5, 1, 1, 2], // 6 notes
            [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 2], // 8 notes
            [1.5, 0.5, 0.5, 0.5, 1, 2], // 6 notes (dotted)
            [0.5, 0.5, 1, 1, 1, 2] // 6 notes
        ]
    },
    '3/4': {
        name: '3/4',
        bpm: 90,
        rhythms: [
            [1, 0.5, 0.5, 1, 1.5, 0.5, 1, 3], // 8 notes
            [0.5, 0.5, 1, 1, 1, 1, 1, 3], // 8 notes
            [2, 1, 0.5, 0.5, 1, 1, 3], // 7 notes
            [1.5, 0.5, 1, 1, 2], // 5 notes (dotted)
            [1, 1, 1, 0.5, 0.5, 2] // 6 notes
        ]
    },
    '4/4': {
        name: '4/4',
        bpm: 100,
        rhythms: [
            [1, 0.5, 0.5, 1, 1, 4], // 6 notes
            [1.5, 0.5, 1, 1, 1, 1, 2], // 7 notes
            [0.5, 0.5, 1, 0.5, 0.5, 1, 4], // 7 notes
            [1, 1, 0.5, 0.5, 1, 1.5, 0.5, 2] // 8 notes
        ]
    },
    '6/8': {
        name: '6/8',
        bpm: 90,
        rhythms: [
            [1.5, 0.5, 0.5, 0.5, 3], // 5 notes
            [0.5, 0.5, 0.5, 1.5, 1.0, 0.5, 1.5, 3], // 8 notes
            [1.0, 0.5, 0.5, 0.5, 0.5, 3], // 6 notes
            [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 3], // 7 notes
            [1.5, 1.0, 0.5, 1.5, 1.5] // 5 notes
        ]
    }
};

// State
let currentPlaybackInfo = { key: null, time: null, melody: [] };

async function generateAndPlayPlayback() {
    if (!isAudioInitialized) {
        const btn = document.getElementById('playPlaybackBtn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading Piano...';
        await initAudio();
        btn.innerHTML = originalHtml;
    }

    const keyCheckboxes = document.querySelectorAll('.playback-key-checkbox:checked');
    const timeCheckboxes = document.querySelectorAll('.playback-time-checkbox:checked');

    if (keyCheckboxes.length === 0 || timeCheckboxes.length === 0) {
        alert("Please select at least one Key and one Time Signature!");
        return;
    }

    const randomKeyId = keyCheckboxes[Math.floor(Math.random() * keyCheckboxes.length)].value;
    const randomTimeId = timeCheckboxes[Math.floor(Math.random() * timeCheckboxes.length)].value;

    const keyData = playbackKeys[randomKeyId];
    const timeData = playbackTimes[randomTimeId];

    // Generate Rhythm
    const randomRhythmTemplate = timeData.rhythms[Math.floor(Math.random() * timeData.rhythms.length)];

    // Generate Melody Pitches
    // Start on 1st, 3rd, 5th, or 8ve
    const startIndices = [0, 2, 4, 5];
    let currentIndex = startIndices[Math.floor(Math.random() * startIndices.length)];

    let melody = [];

    for (let i = 0; i < randomRhythmTemplate.length; i++) {
        let duration = randomRhythmTemplate[i];

        // Force the last note to ALWAYS be the tonic (index 0) for resolution
        if (i === randomRhythmTemplate.length - 1) {
            currentIndex = 0;
        }

        let noteMidi = keyData.scale[currentIndex];
        melody.push({ note: Tone.Frequency(noteMidi, "midi").toNote(), duration: duration });

        // Determine next pitch (step or small skip) for the next iteration
        let move = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        if (move === 0) move = Math.random() > 0.5 ? 1 : -1; // force movement
        currentIndex += move;

        // Clamp to scale boundaries
        if (currentIndex < 0) currentIndex = 0;
        if (currentIndex > 5) currentIndex = 5;
    }

    currentPlaybackInfo = {
        key: keyData,
        time: timeData,
        melody: melody
    };

    // Cut off any previous playback
    stopAllPlayback();

    // 考試模擬：播放前即時顯示調性
    document.getElementById('preInfoKey').innerText = keyData.name;
    document.getElementById('playbackPreInfo').classList.remove('opacity-0');

    // Reset UI
    hidePlaybackAnswer();
    document.getElementById('playbackDisplayArea').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('playbackDisplayArea').classList.remove('opacity-0');
    }, 50);

    document.getElementById('replayPlaybackBtn').classList.remove('hidden');
    document.getElementById('playPlaybackBtn').innerHTML = '<i class="fas fa-step-forward"></i> Next Melody';

    playPlaybackNotes();
}

function playPlaybackNotes() {
    if (!sampler || !sampler.loaded || currentPlaybackInfo.melody.length === 0) return;
    stopAllPlayback();
    const now = Tone.now();

    // 1. Play Tonic Chord
    const keyData = currentPlaybackInfo.key;
    const tChord = [keyData.scale[0], keyData.scale[2], keyData.scale[4]].map(m => Tone.Frequency(m, "midi").toNote());
    sampler.triggerAttackRelease(tChord, "2n", now);

    // 2. Play Count-in (1 measure)
    const timeData = currentPlaybackInfo.time;
    const beatDuration = 60 / timeData.bpm;
    let countInStart = now + 1.5; // Start count-in after chord rings out

    let clicks = timeData.name === '6/8' ? 2 : parseInt(timeData.name.split('/')[0]);
    let clickInterval = timeData.name === '6/8' ? beatDuration * 1.5 : beatDuration;

    for (let i = 0; i < clicks; i++) {
        clickSynth.triggerAttackRelease("C4", "32n", countInStart + (i * clickInterval));
    }

    // 3. Play Melody
    let melodyStart = countInStart + (clicks * clickInterval);
    let currentOffset = 0;

    currentPlaybackInfo.melody.forEach(item => {
        let noteDurationInSeconds = item.duration * beatDuration;
        // Play slightly shorter than full duration for articulation
        sampler.triggerAttackRelease(item.note, noteDurationInSeconds * 0.9, melodyStart + currentOffset);
        currentOffset += noteDurationInSeconds;
    });
}

function revealPlaybackAnswer() {
    if (currentPlaybackInfo.melody.length === 0) return;

    document.getElementById('revealPlaybackBtn').classList.add('hidden');
    const answerArea = document.getElementById('playbackAnswerArea');
    answerArea.classList.remove('hidden');
    answerArea.classList.add('flex');

    document.getElementById('playbackKeyDisplay').innerText = currentPlaybackInfo.key.name;
    document.getElementById('playbackTimeDisplay').innerText = currentPlaybackInfo.time.name;

    // Generate Score
    let abc = `X:1\nM:${currentPlaybackInfo.time.name}\nL:1/8\nK:${currentPlaybackInfo.key.abcKey}\n`;

    let measureEighths = 0;
    let capacityEighths = currentPlaybackInfo.time.name === '6/8' ? 6 : parseInt(currentPlaybackInfo.time.name.split('/')[0]) * 2;

    for (let i = 0; i < currentPlaybackInfo.melody.length; i++) {
        let item = currentPlaybackInfo.melody[i];
        let noteStr = toABC(item.note);
        let durationEighths = item.duration * 2;

        let durStr = durationEighths === 1 ? "" : durationEighths.toString();
        abc += noteStr + durStr;

        measureEighths += durationEighths;

        // Add barline if measure is full and it's not the very last note
        if (Math.abs(measureEighths - capacityEighths) < 0.1 && i !== currentPlaybackInfo.melody.length - 1) {
            abc += " | ";
            measureEighths = 0;
        } else {
            abc += " ";
        }
    }
    abc += "|]";

    renderScore("playbackScore", abc);
}

function hidePlaybackAnswer() {
    document.getElementById('revealPlaybackBtn').classList.remove('hidden');
    const answerArea = document.getElementById('playbackAnswerArea');
    answerArea.classList.add('hidden');
    answerArea.classList.remove('flex');
}
