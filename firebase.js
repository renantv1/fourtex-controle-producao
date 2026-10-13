import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Configuração lida do .env (veja .env.example)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Ordem de fallback: IndexedDB -> localStorage -> memória (nunca lança "Permission denied"
// quando o navegador bloqueia storage — modo privado, política restritiva, webview, etc.)
const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
});
export const authReady = new Promise(resolve => {
    const timer = setTimeout(resolve, 6000); // fallback: máx 6s esperando auth
    const unsub = onAuthStateChanged(auth, user => {
        if (user) { clearTimeout(timer); unsub(); resolve(); }
        else signInAnonymously(auth).catch(() => { clearTimeout(timer); resolve(); });
    });
});
