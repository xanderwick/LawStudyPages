// firebase-shared.js — shared Firebase Web SDK initialization for all quiz pages.
//
// ─────────────────────────────────────────────────────────────────────────────
//   ⚠️  ONLY PASTE THE WEB SDK CONFIG HERE. NEVER PASTE A SERVICE-ACCOUNT KEY.
// ─────────────────────────────────────────────────────────────────────────────
//
// HOW TO GET THE RIGHT CONFIG:
//   1. https://console.firebase.google.com/project/studyaids-4f6d3/settings/general
//   2. "Your apps" → click the </> (Web) icon to register a Web app
//      (or click an existing Web app if you already have one).
//   3. Nickname: "LawStudyPages". Skip Firebase Hosting (we use GitHub Pages).
//   4. Copy the firebaseConfig OBJECT (a JS object with apiKey/authDomain/etc).
//      DO NOT copy a JSON file with "private_key" in it — that's an admin
//      service account, NEVER goes here.
//   5. Paste apiKey, messagingSenderId, and appId below in place of the TODO
//      strings. The rest are correct for project studyaids-4f6d3.
//   6. Add `xanderwick.github.io` to Firebase Console → Authentication →
//      Settings → Authorized domains.
//
// This config is PUBLIC by design. Real security is enforced by Firestore Rules.
// Safe to commit to GitHub once filled in.

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, collection, getDocs,
  query, orderBy, limit, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

export const firebaseConfig = {
  apiKey:            "PASTE_WEB_API_KEY_HERE",                  // TODO
  authDomain:        "studyaids-4f6d3.firebaseapp.com",
  projectId:         "studyaids-4f6d3",
  storageBucket:     "studyaids-4f6d3.appspot.com",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID_HERE",          // TODO
  appId:             "PASTE_APP_ID_HERE",                       // TODO
};

export const isConfigured =
  !firebaseConfig.apiKey.startsWith("PASTE_") &&
  !firebaseConfig.appId.startsWith("PASTE_");

let _app, _auth, _db;
if (isConfigured) {
  _app = initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  // Persist auth across reloads / new tabs.
  setPersistence(_auth, browserLocalPersistence).catch((e) =>
    console.warn("[firebase] auth persistence:", e)
  );
}

export const app = _app;
export const auth = _auth;
export const db = _db;

const provider = isConfigured ? new GoogleAuthProvider() : null;

export async function signInWithGoogle() {
  if (!isConfigured) {
    alert("Firebase config not set yet. Edit firebase-shared.js and paste your Web SDK config.");
    return null;
  }
  return signInWithPopup(_auth, provider);
}

export async function signOutCurrent() {
  if (!isConfigured) return;
  return signOut(_auth);
}

/** Save a quiz session to Firestore. Caller must be authenticated.
 *  Schema (mirrors iOS QuizSession where applicable + adds web-specific fields). */
export async function saveSession(uid, session) {
  if (!isConfigured || !uid) return;
  const id = session.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  const ref = doc(_db, "users", uid, "sessions", id);
  await setDoc(ref, {
    ...session,
    id,
    completedAt: serverTimestamp(),
  });
  return id;
}

/** Fetch the most recent N sessions for the current user, newest first. */
export async function fetchRecentSessions(uid, max = 25) {
  if (!isConfigured || !uid) return [];
  const ref = collection(_db, "users", uid, "sessions");
  const q = query(ref, orderBy("completedAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export function onAuth(callback) {
  if (!isConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(_auth, callback);
}

// Re-export low-level handles for callers that want them.
export {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit,
  serverTimestamp, Timestamp,
};
