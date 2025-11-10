import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { collection, doc, addDoc, getDocs, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ---------- Firebase references ----------
const auth = window.firebaseAuth;
const db = window.firebaseDB;

// ---------- DOM elements ----------
const timeDisplay = document.getElementById("timeDisplay");
const progressFill = document.getElementById("progressFill");
const modeLabel = document.getElementById("modeLabel");
const toggleBtn = document.getElementById("toggleBtn");
const resetBtn = document.getElementById("resetBtn");
const fnBtn = document.getElementById("functionTime");
const menuBtn = document.getElementById("menuTimer");

const subjectSelect = document.getElementById("subjectSelect");
const classesBtn = document.getElementById("classesBtn");
const classesMenu = document.getElementById("classesMenu");
const closeClasses = document.getElementById("closeClasses");
const addClassBtn = document.getElementById("addClassBtn");
const newClassInput = document.getElementById("newClassInput");
const classList = document.getElementById("classList");

const statsBtn = document.getElementById("statsBtn");
const statsMenu = document.getElementById("statsMenu");
const closeStatsBtn = document.getElementById("closeStats");
const statsList = document.getElementById("statsList");

const modeMenu = document.getElementById("modeMenu");
const closeMenuBtn = document.getElementById("closeMenu");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const authOverlay = document.getElementById("authOverlay");

// ---------- Timer state ----------
let isRunning = false;
let isFocus = true;
let startTime = 0;
let timeLeft = 25*60*1000;
let timerInterval = null;
let currentSession = null;

// ---------- Constants ----------
const FOCUS_TIME = 25*60*1000;
const BREAK_TIME = 5*60*1000;

// ---------- User data ----------
let currentUser = null;
let classes = [];
let studyLog = [];

// ---------- Utility ----------
function formatTime(ms) {
    const totalSeconds = Math.ceil(ms/1000);
    const minutes = Math.floor(totalSeconds/60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

function updateDisplay() {
    timeDisplay.textContent = formatTime(timeLeft);
    const total = isFocus ? FOCUS_TIME : BREAK_TIME;
    progressFill.style.width = total>0 ? `${100 - (timeLeft/total)*100}%` : "0%";
}

function showOverlay(el) { el?.classList.remove("hidden"); }
function hideOverlay(el) { el?.classList.add("hidden"); }

// ---------- Timer functions ----------
function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isFocus = true;
    timeLeft = FOCUS_TIME;
    currentSession = null;
    updateDisplay();
    modeLabel.textContent = "Focus";
    progressFill.style.backgroundColor = "#3b82f6";
    if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
}

function startTimer() {
    if(!currentUser) { alert("Please login first."); return; }
    if(isRunning) return;
    isRunning = true;
    startTime = Date.now();
    const subject = subjectSelect.value || "Unknown";
    currentSession = { subject, startTime: Date.now(), mode:"pomodoro" };
    if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/pause_button.svg";

    timerInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        timeLeft -= elapsed;
        startTime = now;

        if(timeLeft <= 0) {
            completeSession();
            switchMode();
        }
        updateDisplay();
    }, 1000);
    updateDisplay();
}

function pauseTimer() {
    if(!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    completeSession();
    if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
}

function toggleTimer() { if(isRunning) pauseTimer(); else startTimer(); }

function completeSession() {
    if(!currentSession) return;
    currentSession.endTime = Date.now();
    currentSession.duration = currentSession.endTime - currentSession.startTime;
    studyLog.push(currentSession);
    saveSessionToFirestore(currentSession);
    currentSession = null;
}

function switchMode() {
    clearInterval(timerInterval);
    isRunning = false;
    isFocus = !isFocus;
    timeLeft = isFocus ? FOCUS_TIME : BREAK_TIME;
    modeLabel.textContent = isFocus ? "Focus" : "Break";
    progressFill.style.backgroundColor = isFocus ? "#3b82f6" : "#10b981";
    if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
    updateDisplay();
}

// ---------- Firestore functions ----------
async function saveSessionToFirestore(session) {
    if(!currentUser) return;
    try {
        const userDoc = doc(db, "users", currentUser.uid);
        const logCol = collection(userDoc, "studyLogs");
        await addDoc(logCol, session);
    } catch(err) {
        console.error("Error saving session:", err);
    }
}

async function loadUserData() {
    if(!currentUser) return;
    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if(!docSnap.exists()) {
            await setDoc(userDocRef, { classes: [], studyLogs: [] });
        }
        // Load classes
        const classesCol = collection(userDocRef, "classes");
        const classDocs = await getDocs(classesCol);
        classes = classDocs.docs.map(d => d.data().name);
        renderClassList();

        // Load study logs
        const logCol = collection(userDocRef, "studyLogs");
        const logDocs = await getDocs(logCol);
        studyLog = logDocs.docs.map(d => d.data());
    } catch(err) {
        console.error(err);
    }
}

async function addClassToFirestore(name) {
    if(!currentUser) return;
    try {
        const userDoc = doc(db, "users", currentUser.uid);
        const classesCol = collection(userDoc, "classes");
        await addDoc(classesCol, { name });
    } catch(err) { console.error(err); }
}

// ---------- Classes functions ----------
function renderClassList() {
    // Classes menu
    classList.innerHTML = "";
    classes.forEach(c => {
        const li = document.createElement("li");
        li.textContent = c;
        li.addEventListener("click", () => {
            subjectSelect.value = c;
            hideOverlay(classesMenu);
        });
        classList.appendChild(li);
    });

    // Dropdown
    subjectSelect.innerHTML = '<option value="">--Select Class--</option>';
    classes.forEach(c => {
        const option = document.createElement("option");
        option.value = c;
        option.textContent = c;
        subjectSelect.appendChild(option);
    });
}

// ---------- Stats functions ----------
function updateStatsDisplay() {
    statsList.innerHTML = "";
    if(studyLog.length===0) {
        statsList.innerHTML = "<li>No study sessions logged yet.</li>";
        return;
    }
    const totals = {};
    studyLog.forEach(s => {
        const subj = s.subject || "Unknown";
        totals[subj] = (totals[subj] || 0) + (s.duration || 0);
    });
    Object.entries(totals).forEach(([subject, duration]) => {
        const hours = (duration/3600000).toFixed(2);
        const li = document.createElement("li");
        li.textContent = `${subject}: ${hours} hours`;
        statsList.appendChild(li);
    });
}

// ---------- Event Listeners ----------

// Timer
toggleBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);
fnBtn.addEventListener("click", () => { pauseTimer(); switchMode(); });
menuBtn.addEventListener("click", () => showOverlay(modeMenu));
closeMenuBtn.addEventListener("click", () => hideOverlay(modeMenu));
modeMenu.addEventListener("click", e => { if(e.target===modeMenu) hideOverlay(modeMenu); });

// Classes
classesBtn.addEventListener("click", () => { renderClassList(); showOverlay(classesMenu); });
closeClasses.addEventListener("click", () => hideOverlay(classesMenu));
classesMenu.addEventListener("click", e => { if(e.target===classesMenu) hideOverlay(classesMenu); });
addClassBtn.addEventListener("click", async () => {
    const name = newClassInput.value.trim();
    if(!name || classes.includes(name)) return;
    classes.push(name);
    newClassInput.value = "";
    renderClassList();
    await addClassToFirestore(name);
});

// Stats
statsBtn.addEventListener("click", () => { updateStatsDisplay(); showOverlay(statsMenu); });
closeStatsBtn.addEventListener("click", () => hideOverlay(statsMenu));
statsMenu.addEventListener("click", e => { if(e.target===statsMenu) hideOverlay(statsMenu); });

// ---------- Authentication ----------
registerBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCred.user;
        hideOverlay(authOverlay);
        await loadUserData();
        resetTimer();
    } catch(err) { alert(err.message); }
});

loginBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCred.user;
        hideOverlay(authOverlay);
        await loadUserData();
        resetTimer();
    } catch(err) { alert(err.message); }
});

onAuthStateChanged(auth, user => {
    if(user) {
        currentUser = user;
        hideOverlay(authOverlay);
        loadUserData();
    } else {
        currentUser = null;
        showOverlay(authOverlay);
    }
});

// ---------- Initialization ----------
resetTimer();
hideOverlay(modeMenu);
hideOverlay(statsMenu);
hideOverlay(classesMenu);
