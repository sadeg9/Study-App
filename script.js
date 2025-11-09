// ------------------------------
// Study App with Firebase Auth & Firestore
// ------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ------------------- Firebase config -------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "study-app-f3f70.firebaseapp.com",
  projectId: "study-app-f3f70",
  storageBucket: "study-app-f3f70.appspot.com",
  messagingSenderId: "338859503551",
  appId: "1:338859503551:web:f42df0af1d34a0f5a27b0a",
  measurementId: "G-L3YTVWW110"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {

  // ------------------- Auth -------------------
  const authOverlay = document.getElementById("authOverlay");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");

  let currentUser = null;

  loginBtn.addEventListener("click", async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      currentUser = userCredential.user;
      authOverlay.classList.add("hidden");
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  });

  registerBtn.addEventListener("click", async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      currentUser = userCredential.user;
      authOverlay.classList.add("hidden");
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  });

  // ------------------- Timer elements -------------------
  const timeDisplay = document.getElementById("timeDisplay");
  const progressFill = document.getElementById("progressFill");
  const modeLabel = document.getElementById("modeLabel");
  const toggleBtn = document.getElementById("toggleBtn");
  const resetBtn = document.getElementById("resetBtn");
  const fnBtn = document.getElementById("functionTime");
  const menuBtn = document.getElementById("menuTimer");

  // ------------------- Classes -------------------
  const subjectSelect = document.getElementById("subjectSelect");
  const classesBtn = document.getElementById("classesBtn");
  const classesMenu = document.getElementById("classesMenu");
  const closeClasses = document.getElementById("closeClasses");
  const addClassBtn = document.getElementById("addClassBtn");
  const newClassInput = document.getElementById("newClassInput");
  const classList = document.getElementById("classList");

  let classes = [];

  // ------------------- Stats -------------------
  const statsBtn = document.getElementById("statsBtn");
  const statsMenu = document.getElementById("statsMenu");
  const closeStatsBtn = document.getElementById("closeStats");
  const statsList = document.getElementById("statsList");

  // ------------------- Mode Menu -------------------
  const modeMenu = document.getElementById("modeMenu");
  const closeMenuBtn = document.getElementById("closeMenu");

  // ------------------- Timer state -------------------
  let isRunning = false,
      isFocus = true,
      startTime = 0,
      timeLeft = 0,
      timerInterval = null,
      currentSession = null;

  const FOCUS_TIME = 25*60*1000;
  const BREAK_TIME = 5*60*1000;

  // ------------------- Utility -------------------
  function formatTime(ms) {
    const totalSeconds = Math.ceil(ms/1000);
    const minutes = Math.floor(totalSeconds/60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  }

  function updateDisplay() {
    timeDisplay.textContent = formatTime(timeLeft);
    const total = isFocus ? FOCUS_TIME : BREAK_TIME;
    progressFill.style.width = total > 0 ? `${100 - (timeLeft/total)*100}%` : "0%";
  }

  function showOverlay(el) { el?.classList.remove("hidden"); }
  function hideOverlay(el) { el?.classList.add("hidden"); }

  function resetPomodoro() {
    clearInterval(timerInterval);
    isRunning = false;
    isFocus = true;
    timeLeft = FOCUS_TIME;
    currentSession = null;
    updateDisplay();
    modeLabel.textContent = "Focus";
    progressFill.style.backgroundColor = "#a3d977";
    if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
  }

  function startTimer() {
    if(!currentUser) return alert("Please log in first!");
    if(isRunning) return;
    isRunning = true;
    startTime = Date.now();
    const subject = subjectSelect.value || "Unknown";
    currentSession = { subject, startTime, mode: "pomodoro" };
    if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/pause_button.svg";

    timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      timeLeft -= elapsed;
      startTime = now;

      if(timeLeft <= 0){
        completeSession();
        switchMode();
      }
      updateDisplay();
    },1000);

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

  async function completeSession(){
    if(!currentSession || !currentUser) return;
    currentSession.endTime = Date.now();
    currentSession.duration = currentSession.endTime - currentSession.startTime;

    try{
      await addDoc(collection(db, "users", currentUser.uid, "studyLogs"), currentSession);
      console.log("Logged session for user:", currentUser.uid);
    }catch(err){
      console.error("Error logging session:", err);
    }

    currentSession = null;
  }

  function switchMode() {
    clearInterval(timerInterval);
    isRunning = false;
    isFocus = !isFocus;
    timeLeft = isFocus ? FOCUS_TIME : BREAK_TIME;
    modeLabel.textContent = isFocus ? "Focus" : "Break";
    progressFill.style.backgroundColor = isFocus ? "#a3d977" : "#77b3d9";
    if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
    updateDisplay();
  }

  async function updateStatsDisplay(){
    if(!currentUser) return;

    const totals = {};
    try{
      const snapshot = await getDocs(collection(db, "users", currentUser.uid, "studyLogs"));
      snapshot.forEach(doc => {
        const entry = doc.data();
        const subj = entry.subject || "Unknown";
        totals[subj] = (totals[subj] || 0) + (entry.duration || 0);
      });
    }catch(err){
      console.error("Error fetching stats:", err);
    }

    statsList.innerHTML = "";
    if(Object.keys(totals).length === 0){
      statsList.innerHTML = "<li>No study sessions logged yet.</li>";
      return;
    }

    Object.entries(totals).forEach(([subject,duration])=>{
      const hours = (duration/3600000).toFixed(2);
      const li = document.createElement("li");
      li.textContent = `${subject}: ${hours} hours`;
      statsList.appendChild(li);
    });
  }

  // ------------------- Classes -------------------
  async function fetchClasses() {
    if(!currentUser) return;
    classes = [];
    const snapshot = await getDocs(collection(db, "users", currentUser.uid, "classes"));
    snapshot.forEach(doc => classes.push(doc.data().name));
    renderClassList();
  }

  function renderClassList(){
    classList.innerHTML = "";
    classes.forEach(c => {
      const li = document.createElement("li");
      li.textContent = c;
      li.addEventListener("click", ()=>{
        subjectSelect.value = c;
        hideOverlay(classesMenu);
      });
      classList.appendChild(li);
    });

    subjectSelect.innerHTML = '<option value="">--Select Class--</option>';
    classes.forEach(c=>{
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      subjectSelect.appendChild(option);
    });
  }

  addClassBtn?.addEventListener("click", async ()=>{
    const newClass = newClassInput.value.trim();
    if(!newClass || classes.includes(newClass) || !currentUser) return;
    try{
      await addDoc(collection(db, "users", currentUser.uid, "classes"), {name: newClass});
      newClassInput.value = "";
      await fetchClasses();
    }catch(err){
      console.error("Error adding class:", err);
    }
  });

  classesBtn?.addEventListener("click", ()=>{ fetchClasses(); showOverlay(classesMenu); });
  closeClasses?.addEventListener("click", ()=>hideOverlay(classesMenu));
  classesMenu?.addEventListener("click", e=>{if(e.target===classesMenu) hideOverlay(classesMenu);});

  // ------------------- Menu Overlay -------------------
  menuBtn?.addEventListener("click", ()=>showOverlay(modeMenu));
  closeMenuBtn?.addEventListener("click", ()=>hideOverlay(modeMenu));
  modeMenu?.addEventListener("click", e=>{if(e.target===modeMenu) hideOverlay(modeMenu);});

  // ------------------- Stats Overlay -------------------
  statsBtn?.addEventListener("click", ()=>{ updateStatsDisplay(); showOverlay(statsMenu); });
  closeStatsBtn?.addEventListener("click", ()=>hideOverlay(statsMenu));
  statsMenu?.addEventListener("click", e=>{if(e.target===statsMenu) hideOverlay(statsMenu);});

  // ------------------- Timer Buttons -------------------
  toggleBtn?.addEventListener("click", toggleTimer);
  resetBtn?.addEventListener("click", resetPomodoro);
  fnBtn?.addEventListener("click", ()=>{ pauseTimer(); switchMode(); });

  // ------------------- Initialize -------------------
  hideOverlay(modeMenu);
  hideOverlay(statsMenu);
  hideOverlay(classesMenu);
  resetPomodoro();
});
