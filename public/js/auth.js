/* ===== auth.js =====
 * Firebase Auth (Google sign-in) module.
 * Depends on: Firebase SDK (loaded via CDN before this script)
 */

const firebaseConfig = {
    apiKey: "AIzaSyDY1KdiAQWw--dSa5ht6VtKEetX3PVLafU",
    authDomain: "rcm-ear-trainer.firebaseapp.com",
    projectId: "rcm-ear-trainer",
    storageBucket: "rcm-ear-trainer.firebasestorage.app",
    messagingSenderId: "1058137063853",
    appId: "1:1058137063853:web:bc80996ba5d0679a042124"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        console.error("Sign-in error:", err);
    });
}

function signOutUser() {
    auth.signOut().catch(err => {
        console.error("Sign-out error:", err);
    });
}

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    updateAuthUI(user);

    if (user) {
        // Save user profile to Firestore
        await db.collection('users').doc(user.uid).set({
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Sync localStorage stats to Firestore on first sign-in
        if (typeof syncLocalToFirestore === 'function') {
            await syncLocalToFirestore();
        }
        // Refresh stats display
        if (typeof renderStatsBar === 'function') {
            renderStatsBar();
        }
    } else {
        if (typeof renderStatsBar === 'function') {
            renderStatsBar();
        }
    }
});

function updateAuthUI(user) {
    const authArea = document.getElementById('authArea');
    if (!authArea) return;

    if (user) {
        const photo = user.photoURL
            ? `<img src="${user.photoURL}" alt="" class="w-7 h-7 rounded-full border border-slate-600">`
            : `<div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">${(user.displayName || 'U')[0]}</div>`;

        authArea.innerHTML = `
            <button onclick="signOutUser()" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors text-sm">
                ${photo}
                <span class="hidden sm:inline text-slate-300 max-w-[100px] truncate">${user.displayName || 'User'}</span>
                <i class="fas fa-sign-out-alt text-slate-500 text-xs"></i>
            </button>
        `;
    } else {
        authArea.innerHTML = `
            <button onclick="signInWithGoogle()" class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors text-sm">
                <i class="fab fa-google text-slate-400"></i>
                <span class="text-slate-300">Sign in</span>
            </button>
        `;
    }
}
