/* ===== notation.js =====
 * Music notation helpers: ABC conversion, score rendering, note formatting.
 * Depends on: ABCJS (loaded via CDN)
 */

// Convert Tone.js Note (e.g. C#4) to ABC Notation (e.g. ^C)
function toABC(noteStr) {
    const match = noteStr.match(/^([A-G])([#b]?)(\d)$/);
    if (!match) return "";
    let name = match[1];
    let acc = match[2];
    let oct = parseInt(match[3]);

    let abcAcc = acc === '#' ? '^' : (acc === 'b' ? '_' : '');
    let abcNote = "";

    if (oct === 3) abcNote = name + ",";
    else if (oct === 4) abcNote = name;
    else if (oct === 5) abcNote = name.toLowerCase();
    else if (oct === 6) abcNote = name.toLowerCase() + "'";
    else abcNote = name;

    return abcAcc + abcNote;
}

function renderScore(elementId, abcString) {
    ABCJS.renderAbc(elementId, abcString, {
        responsive: "resize",
        scale: 1.2,
        staffwidth: 300,
        paddingbottom: 0,
        paddingtop: 10,
        paddingright: 20,
        paddingleft: 20,
        foregroundColor: "#0f172a"
    });
}

// Formatting HTML for Notes (e.g. C4 -> C<sub>4</sub>)
function formatNote(noteStr) {
    return noteStr.replace(/(\d)/, '<sub class="text-xs text-slate-400 ml-0.5">$1</sub>');
}
