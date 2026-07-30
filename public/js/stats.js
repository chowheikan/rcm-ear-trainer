/* ===== stats.js =====
 * Stats tracking module — Firestore (logged in) + localStorage (fallback).
 * Depends on: auth.js (for currentUser, db)
 *
 * Data structure:
 * { total: N, correct: N, breakdown: { "optionKey": { total: N, correct: N }, ... } }
 */

const STATS_STORAGE_KEY = 'rcm_ear_trainer_stats';

// ---- localStorage helpers ----

function getLocalStats() {
    try {
        return JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)) || {};
    } catch { return {}; }
}

function saveLocalStats(data) {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
}

function getModuleLocalStats(module) {
    const all = getLocalStats();
    return all[module] || { total: 0, correct: 0, breakdown: {} };
}

// ---- Core API ----

async function recordAnswer(module, optionKey, isCorrect) {
    // Always write to localStorage
    const all = getLocalStats();
    if (!all[module]) all[module] = { total: 0, correct: 0, breakdown: {} };
    all[module].total++;
    if (isCorrect) all[module].correct++;

    if (!all[module].breakdown[optionKey]) all[module].breakdown[optionKey] = { total: 0, correct: 0 };
    all[module].breakdown[optionKey].total++;
    if (isCorrect) all[module].breakdown[optionKey].correct++;
    saveLocalStats(all);

    // If logged in, also write to Firestore
    if (currentUser) {
        try {
            const ref = db.collection('users').doc(currentUser.uid)
                         .collection('stats').doc(module);

            await db.runTransaction(async (tx) => {
                const doc = await tx.get(ref);
                const data = doc.exists ? doc.data() : { total: 0, correct: 0, breakdown: {} };

                data.total = (data.total || 0) + 1;
                if (isCorrect) data.correct = (data.correct || 0) + 1;

                if (!data.breakdown) data.breakdown = {};
                if (!data.breakdown[optionKey]) data.breakdown[optionKey] = { total: 0, correct: 0 };
                data.breakdown[optionKey].total++;
                if (isCorrect) data.breakdown[optionKey].correct++;

                tx.set(ref, data);
            });
        } catch (err) {
            console.warn("Firestore write failed, localStorage still saved:", err);
        }
    }

    renderStatsBar();
}

async function getStats(module) {
    if (currentUser) {
        try {
            const doc = await db.collection('users').doc(currentUser.uid)
                                .collection('stats').doc(module).get();
            if (doc.exists) return doc.data();
        } catch (err) {
            console.warn("Firestore read failed, falling back to localStorage:", err);
        }
    }
    return getModuleLocalStats(module);
}

async function getAllStats() {
    const modules = ['interval', 'chord', 'progression'];
    let total = 0, correct = 0;

    for (const m of modules) {
        const s = currentUser ? getModuleLocalStats(m) : getModuleLocalStats(m);
        total += s.total || 0;
        correct += s.correct || 0;
    }

    // If logged in, try Firestore
    if (currentUser) {
        try {
            const snap = await db.collection('users').doc(currentUser.uid)
                                 .collection('stats').get();
            total = 0; correct = 0;
            snap.forEach(doc => {
                const d = doc.data();
                total += d.total || 0;
                correct += d.correct || 0;
            });
        } catch (err) {
            // Fall back to localStorage totals (already computed above)
        }
    }

    return { total, correct };
}

async function syncLocalToFirestore() {
    if (!currentUser) return;

    const local = getLocalStats();
    if (Object.keys(local).length === 0) return;

    const modules = ['interval', 'chord', 'progression'];
    for (const module of modules) {
        if (!local[module] || local[module].total === 0) continue;

        const ref = db.collection('users').doc(currentUser.uid)
                     .collection('stats').doc(module);

        try {
            await db.runTransaction(async (tx) => {
                const doc = await tx.get(ref);
                const remote = doc.exists ? doc.data() : { total: 0, correct: 0, breakdown: {} };
                const loc = local[module];

                // Merge: take the max of each counter
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
        } catch (err) {
            console.warn(`Failed to sync ${module} to Firestore:`, err);
        }
    }
}

async function resetStats(module) {
    // Clear localStorage
    const all = getLocalStats();
    if (module) {
        delete all[module];
    } else {
        for (const k of Object.keys(all)) delete all[k];
    }
    saveLocalStats(all);

    // Clear Firestore
    if (currentUser) {
        try {
            if (module) {
                await db.collection('users').doc(currentUser.uid)
                        .collection('stats').doc(module).delete();
            } else {
                const snap = await db.collection('users').doc(currentUser.uid)
                                     .collection('stats').get();
                const batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (err) {
            console.warn("Firestore reset failed:", err);
        }
    }

    renderStatsBar();
}

async function renderStatsBar() {
    const el = document.getElementById('statsDisplay');
    if (!el) return;

    const { total, correct } = await getAllStats();

    if (total === 0) {
        el.innerHTML = `<span class="text-slate-500 text-xs">No attempts yet</span>`;
        return;
    }

    const pct = Math.round((correct / total) * 100);
    const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';

    el.innerHTML = `
        <span class="${color} font-bold text-sm">✓ ${correct}/${total}</span>
        <span class="text-slate-500 text-xs">(${pct}%)</span>
        <button onclick="if(confirm('Reset all stats?')) resetStats()" class="text-slate-600 hover:text-slate-400 text-xs ml-1" title="Reset stats">
            <i class="fas fa-rotate-left"></i>
        </button>
    `;
}
