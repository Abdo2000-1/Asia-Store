// ============================================================
// ASIA STORE — Firebase Configuration (New Client: asia-2000)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCWv3cpx2BNo9E9RFSZ-oj1XUPOo0TJ6p8",
  authDomain: "asia-2000.firebaseapp.com",
  projectId: "asia-2000",
  storageBucket: "asia-2000.firebasestorage.app",
  messagingSenderId: "272045755683",
  appId: "1:272045755683:web:f381987b747e3d8b2ed096",
  measurementId: "G-WSTRQKRVV0"
};

console.log('Initializing Firebase for New Project...');

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage ? firebase.storage() : null;


const WHATSAPP_NUMBER = "201115019259";
const CURRENCY = "EGP";

console.log('Firebase Asia-2000 is ready!');