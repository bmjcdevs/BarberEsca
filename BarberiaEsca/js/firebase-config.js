// ============================================================
//  FOCUS BARBER STUDIO — Firebase Configuration
//  Proyecto: focusbarber-08
//  SDK: Firebase CDN (compat) — no requiere bundler
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDAn671E3Cm2Lto_lmjWKXL3c3gSbK-ZYg",
    authDomain: "focusbarber-08.firebaseapp.com",
    projectId: "focusbarber-08",
    storageBucket: "focusbarber-08.firebasestorage.app",
    messagingSenderId: "175699187710",
    appId: "1:175699187710:web:18b5907e4991fee3fcd2af",
    measurementId: "G-DRVZE9HRZS"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar referencias globales
const db = firebase.firestore();
