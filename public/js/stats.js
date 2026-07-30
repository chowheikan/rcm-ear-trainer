/* ===== stats.js =====
 * Stats tracking module — Firestore (logged in) + localStorage (fallback).
 * Tracks per-option accuracy AND per-question answer history.
 * Depends on: auth.js (for currentUser, db)
 */

const STATS_STORAGE_KEY = 'rcm_ear_trainer_stats';
const HISTORY_STORAGE_KEY = 'rcm_ear_trainer_history';
const MAX_HISTORY = 80; // max entries per module

// ---- Display names for overlay ----
const OPTION_LABELS = {
    // Intervals
    'm3': 'Minor 3rd', 'M3': 'Major 3rd', 'P4': 'Perfect 4th',
    'P5': 'Perfect 5th', 'm6': 'Minor 6th', 'M6': 'Major 6th', 'P8': 'Perfect Octave',
    // Chords
    'major': 'Major Triad', 'minor': 'Minor Triad', 'dom7': 'Dominant 7th',
    // Progressions
    'I-IV-I': 'I - IV - I', 'I-V-I': 'I - V - I'
};

// ---- localStorage helpers ----

function getLocalStats() {
    try { return JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)) || {}; }
    catch { return {}; }
}
function saveLocalStats(data) {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
}
function getLocalHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || {}; }
    catch { return {}; }
}
function saveLocalHistory(data) {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(data));
}
function getModuleLocalStats(module) {
    return getLocalStats()[module] || { total: 0, correct: 0, breakdown: {} };
}

// ---- Core API ----

async function recordAnswer(module, correctKey, selectedKey, isCorrect) {
    // --- Aggregate stats ---
    const all = getLocalStats();
    if (!all[module]) all[module] = { total: 0, correct: 0, breakdown: {} };
    all[module].total++;
    if (isCorrect) all[module].correct++;
    if (!all[module].breakdown[correctKey]) all[module].breakdown[correctKey] = { total: 0, correct: 0 };
    all[module].breakdown[correctKey].total++;
    if (isCorrect) all[module].breakdown[correctKey].correct++;
    saveLocalStats(all);

    // --- History ---
    const hist = getLocalHistory();
    if (!hist[module]) hist[module] = [];
    hist[module].unshift({
        correctKey,
        selectedKey,
        isCorrect,
        ts: Date.now()
    });
    if (hist[module].length > MAX_HISTORY) hist[module] = hist[module].slice(0, MAX_HISTORY);
    saveLocalHistory(hist);

    // --- Firestore (aggregate only) ---
    if (currentUser) {
        try {
            const ref = db.collection('users').doc(currentUser.uid).collection('stats').doc(module);
            await db.runTransaction(async (tx) => {
                const doc = await tx.get(ref);
                const data = doc.exists ? doc.data() : { total: 0, correct: 0, breakdown: {} };
                data.total = (data.total || 0) + 1;
                if (isCorrect) data.correct = (data.correct || 0) + 1;
                if (!data.breakdown) data.breakdown = {};
                if (!data.breakdown[correctKey]) data.breakdown[correctKey] = { total: 0, correct: 0 };
                data.breakdown[correctKey].total++;
                if (isCorrect) data.breakdown[correctKey].correct++;
                tx.set(ref, data);
            });
        } catch (err) {
            console.warn('Firestore write failed, localStorage still saved:', err);
        }
    }

    renderStatsBar();
}

async function getAllStats() {
    let total = 0, correct = 0;
    const modules = ['interval', 'chord', 'progression'];

    if (currentUser) {
        try {
            const snap = await db.collection('users').doc(currentUser.uid).collection('stats').get();
            snap.forEach(doc => {
                const d = doc.data();
                total += d.total || 0;
                correct += d.correct || 0;
            });
            return { total, correct };
        } catch (err) { /* fall through to localStorage */ }
    }

    for (const m of modules) {
        const s = getModuleLocalStats(m);
        total += s.total || 0;
        correct += s.correct || 0;
    }
    return { total, correct };
}

async function getStatsForOverlay() {
    // Returns { interval: {...}, chord: {...}, progression: {...} }
    const modules = ['interval', 'chord', 'progression'];
    const result = {};

    if (currentUser) {
        try {
            for (const m of modules) {
                const doc = await db.collection('users').doc(currentUser.uid).collection('stats').doc(m).get();
                result[m] = doc.exists ? doc.data() : { total: 0, correct: 0, breakdown: {} };
            }
            return result;
        } catch (err) { /* fall through */ }
    }

    for (const m of modules) result[m] = getModuleLocalStats(m);
    return result;
}

async function syncLocalToFirestore() {
    if (!currentUser) return;
    const local = getLocalStats();
    if (Object.keys(local).length === 0) return;
    const modules = ['interval', 'chord', 'progression'];
    for (const module of modules) {
        if (!local[module] || local[module].total === 0) continue;
        const ref = db.collection('users').doc(currentUser.uid).collection('stats').doc(module);
        try {
            await db.runTransaction(async (tx) => {
                const doc = await tx.get(ref);
                const remote = doc.exists ? doc.data() : { total: 0, correct: 0, breakdown: {} };
                const loc = local[module];
                remote.total = Math.max(remote.total || 0, loc.total || 0);
                remote.correct = Math.max(remote.correct || 0, loc.correct || 0);
                if (!remote.breakdown) remote.breakdown = {};
                for (const key of Object.keys(loc.breakdown || {})) {
                    if (!remote.breakdown[key]) remote.breakdown[key] = { total: 0, correct: 0 };
                    remote.breakdown[key].total = Math.max(remote.breakdown[key].total, loc.breakdown[key].total || 0);
                    remote.breakdown[key].correct = Math.max(remote.breakdown[key].correct, loc.breakdown[key].correct || 0);
                }
                tx.set(ref, remote);
            });
        } catch (err) { console.warn(`Failed to sync ${module} to Firestore:`, err); }
    }
}

async function resetStats(module) {
    const all = getLocalStats();
    const hist = getLocalHistory();
    if (module) { delete all[module]; delete hist[module]; }
    else { for (const k of Object.keys(all)) delete all[k]; for (const k of Object.keys(hist)) delete hist[k]; }
    saveLocalStats(all);
    saveLocalHistory(hist);

    if (currentUser) {
        try {
            if (module) {
                await db.collection('users').doc(currentUser.uid).collection('stats').doc(module).delete();
            } else {
                const snap = await db.collection('users').doc(currentUser.uid).collection('stats').get();
                const batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (err) { console.warn('Firestore reset failed:', err); }
    }

    renderStatsBar();
    if (!document.getElementById('statsOverlay').classList.contains('hidden')) {
        openStatsOverlay();
    }
}

// ---- Header Stats Bar ----

async function renderStatsBar() {
    const el = document.getElementById('statsDisplay');
    if (!el) return;
    const { total, correct } = await getAllStats();

    if (total === 0) {
        el.innerHTML = `<button onclick="openStatsOverlay()" class="text-slate-500 text-xs hover:text-slate-300 transition-colors flex items-center gap-1"><i class="fas fa-chart-bar"></i> Stats</button>`;
        return;
    }

    const pct = Math.round((correct / total) * 100);
    const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';
    el.innerHTML = `
        <button onclick="openStatsOverlay()" class="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <span class="${color} font-bold text-sm">✓ ${correct}/${total}</span>
            <span class="text-slate-500 text-xs">(${pct}%)</span>
            <i class="fas fa-chart-bar text-slate-500 text-xs ml-0.5"></i>
        </button>
    `;
}

// ---- Stats Overlay ----

let _overlayTab = 'interval';

async function openStatsOverlay() {
    const overlay = document.getElementById('statsOverlay');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    await renderOverlayContent(_overlayTab);
}

function closeStatsOverlay() {
    document.getElementById('statsOverlay').classList.add('hidden');
    document.body.style.overflow = '';
}

async function switchOverlayTab(tab) {
    _overlayTab = tab;
    ['interval', 'chord', 'progression'].forEach(t => {
        const btn = document.getElementById('otab-' + t);
        if (btn) btn.className = t === tab
            ? 'px-4 py-1.5 text-sm bg-blue-600 text-white rounded-full font-semibold transition-all'
            : 'px-4 py-1.5 text-sm bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-full font-semibold transition-all';
    });
    await renderOverlayContent(tab);
}

async function renderOverlayContent(module) {
    const allStats = await getStatsForOverlay();
    const moduleStats = allStats[module] || { total: 0, correct: 0, breakdown: {} };
    const history = getLocalHistory()[module] || [];

    // Module option order
    const ORDER = {
        interval: ['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'],
        chord: ['major', 'minor', 'dom7'],
        progression: ['I-IV-I', 'I-V-I']
    };
    const keys = ORDER[module] || Object.keys(moduleStats.breakdown || {});

    // ---- Breakdown rows ----
    let breakdownHtml = '';
    for (const key of keys) {
        const b = (moduleStats.breakdown || {})[key] || { total: 0, correct: 0 };
        const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : null;
        const barColor = pct === null ? 'bg-slate-600' : pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
        const barWidth = pct !== null ? pct : 0;
        const pctText = pct !== null ? `${pct}%` : '—';
        const scoreColor = pct === null ? 'text-slate-500' : pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

        breakdownHtml += `
            <div class="flex items-center gap-3 py-2 border-b border-slate-700/50">
                <div class="w-32 shrink-0 text-sm text-slate-300">${OPTION_LABELS[key] || key}</div>
                <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div class="${barColor} h-full rounded-full transition-all" style="width:${barWidth}%"></div>
                </div>
                <div class="${scoreColor} text-sm font-bold w-10 text-right">${pctText}</div>
                <div class="text-slate-500 text-xs w-12 text-right">${b.correct}/${b.total}</div>
            </div>`;
    }

    // ---- History rows ----
    let histHtml = '';
    if (history.length === 0) {
        histHtml = `<div class="text-slate-500 text-sm text-center py-6">No history yet</div>`;
    } else {
        for (const h of history) {
            const correctLabel = OPTION_LABELS[h.correctKey] || h.correctKey;
            const selectedLabel = OPTION_LABELS[h.selectedKey] || h.selectedKey;
            const time = new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (h.isCorrect) {
                histHtml += `
                    <div class="flex items-center gap-2 py-2 border-b border-slate-700/40">
                        <i class="fas fa-check-circle text-emerald-400 w-4 shrink-0"></i>
                        <span class="text-slate-200 text-sm flex-1">${correctLabel}</span>
                        <span class="text-slate-500 text-xs">${time}</span>
                    </div>`;
            } else {
                histHtml += `
                    <div class="flex items-center gap-2 py-2 border-b border-slate-700/40">
                        <i class="fas fa-times-circle text-red-400 w-4 shrink-0"></i>
                        <span class="flex-1 text-sm">
                            <span class="text-slate-400 line-through">${selectedLabel}</span>
                            <i class="fas fa-arrow-right text-slate-600 mx-1.5 text-xs"></i>
                            <span class="text-emerald-400 font-medium">${correctLabel}</span>
                        </span>
                        <span class="text-slate-500 text-xs">${time}</span>
                    </div>`;
            }
        }
    }

    const overallPct = moduleStats.total > 0 ? Math.round((moduleStats.correct / moduleStats.total) * 100) : 0;
    const overallColor = moduleStats.total === 0 ? 'text-slate-500' : overallPct >= 80 ? 'text-emerald-400' : overallPct >= 60 ? 'text-amber-400' : 'text-red-400';
    const moduleName = { interval: 'Intervals', chord: 'Chords', progression: 'Progressions' }[module];

    document.getElementById('overlayContent').innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <div>
                <div class="text-slate-400 text-xs uppercase tracking-wider mb-0.5">${moduleName}</div>
                <div class="${overallColor} text-2xl font-bold">${moduleStats.correct}/${moduleStats.total}
                    <span class="text-base font-normal text-slate-500">${moduleStats.total > 0 ? `(${overallPct}%)` : ''}</span>
                </div>
            </div>
            <button onclick="if(confirm('Reset ${moduleName} stats?')) resetStats('${module}')"
                class="text-slate-600 hover:text-red-400 transition-colors text-sm flex items-center gap-1.5">
                <i class="fas fa-rotate-left"></i> Reset
            </button>
        </div>

        <div class="mb-5">
            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Accuracy by Type</h3>
            ${breakdownHtml || '<div class="text-slate-500 text-sm text-center py-4">No data yet</div>'}
        </div>

        <div>
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Answer History</h3>
                <span class="text-slate-600 text-xs">${history.length} attempts</span>
            </div>
            <div class="max-h-48 overflow-y-auto">${histHtml}</div>
        </div>
    `;
}
