import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ---------- Firebase setup ----------
const firebaseConfig = {
  apiKey: "AIzaSyC-lMVbg6q9XyPyQZ9xEmqY6j8EputUs5s",
  authDomain: "study-app-f3f70.firebaseapp.com",
  projectId: "study-app-f3f70",
  storageBucket: "study-app-f3f70.firebasestorage.app",
  messagingSenderId: "338859503551",
  appId: "1:338859503551:web:f42df0af1d34a0f5a27b0a",
  measurementId: "G-L3YTVWW110"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- DOM Elements ----------
document.addEventListener("DOMContentLoaded", async () => {
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

  let classes = JSON.parse(localStorage.getItem("classes")) || [];
  let studyLog = JSON.parse(localStorage.getItem("studyLog")) || [];
  let isRunning = false, isFocus = true, startTime = 0, timeLeft = 0, timerInterval = null;
  let currentSession = null;

  const FOCUS_TIME = 25 * 60 * 1000;
  const BREAK_TIME = 5 * 60 * 1000;

  // ---------- Helper Functions ----------
  function formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateDisplay() {
    timeDisplay.textContent = formatTime(timeLeft);
    const total = isFocus ? FOCUS_TIME : BREAK_TIME;
    progressFill.style.width = total > 0 ? `${100 - (timeLeft / total) * 100}%` : "0%";
  }

  function resetPomodoro() {
    clearInterval(timerInterval);
    isRunning = false;
    isFocus = true;
    timeLeft = FOCUS_TIME;
    currentSession = null;
    updateDisplay();
    modeLabel.textContent = "Focus";
    progressFill.style.backgroundColor = "#a3d977";
    if (toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
  }

  async function logSessionToFirebase(session) {
    try {
      await addDoc(collection(db, "studyLog"), session);
      console.log("Session logged to Firestore:", session);
    } catch (error) {
      console.error("Error saving session to Firestore:", error);
    }
  }

  function completeSession() {
    if (!currentSession) return;
    currentSession.endTime = Date.now();
    currentSession.duration = currentSession.endTime - currentSession.startTime;
    studyLog.push(currentSession);
    localStorage.setItem("studyLog", JSON.stringify(studyLog));
    logSessionToFirebase(currentSession);
    currentSession = null;
  }

  function switchMode() {
    clearInterval(timerInterval);
    isRunning = false;
    isFocus = !isFocus;
    timeLeft = isFocus ? FOCUS_TIME : BREAK_TIME;
    modeLabel.textContent = isFocus ? "Focus" : "Break";
    progressFill.style.backgroundColor = isFocus ? "#a3d977" : "#77b3d9";
    if (toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
    updateDisplay();
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startTime = Date.now();
    const subject = subjectSelect.value || "Unknown";
    currentSession = { subject, startTime, mode: "pomodoro" };
    if (toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/pause_button.svg";

    timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      timeLeft -= elapsed;
      startTime = now;

      if (timeLeft <= 0) {
        completeSession();
        switchMode();
      }
      updateDisplay();
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    completeSession();
    if (toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
  }

  function updateStatsDisplay() {
    const totals = {};
    studyLog.forEach(entry => {
      const subj = entry.subject || "Unknown";
      totals[subj] = (totals[subj] || 0) + (entry.duration || 0);
    });

    statsList.innerHTML = "";
    if (Object.keys(totals).length === 0) {
      statsList.innerHTML = "<li>No study sessions logged yet.</li>";
      return;
    }

    Object.entries(totals).forEach(([subject, duration]) => {
      const hours = (duration / 3600000).toFixed(2);
      const li = document.createElement("li");
      li.textContent = `${subject}: ${hours} hours`;
      statsList.appendChild(li);
    });
  }

  function showOverlay(el) { el?.classList.remove("hidden"); }
  function hideOverlay(el) { el?.classList.add("hidden"); }

  // ---------- Classes ----------
  function renderClassList() {
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

    subjectSelect.innerHTML = '<option value="">--Select Class--</option>';
    classes.forEach(c => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      subjectSelect.appendChild(option);
    });
  }

  addClassBtn?.addEventListener("click", async () => {
    const newClass = newClassInput.value.trim();
    if (newClass && !classes.includes(newClass)) {
      classes.push(newClass);
      localStorage.setItem("classes", JSON.stringify(classes));
      renderClassList();
      newClassInput.value = "";

      try {
        await setDoc(doc(db, "classes", newClass), { name: newClass });
      } catch (err) {
        console.error("Error saving class:", err);
      }
    }
  });

  // ---------- Firebase: Load existing classes ----------
  try {
    const querySnapshot = await getDocs(collection(db, "classes"));
    querySnapshot.forEach(docSnap => {
      const className = docSnap.data().name;
      if (!classes.includes(className)) classes.push(className);
    });
    localStorage.setItem("classes", JSON.stringify(classes));
  } catch (err) {
    console.warn("Couldn't fetch classes from Firestore:", err);
  }

  // ---------- Event Listeners ----------
  toggleBtn?.addEventListener("click", () => (isRunning ? pauseTimer() : startTimer()));
  resetBtn?.addEventListener("click", resetPomodoro);
  fnBtn?.addEventListener("click", () => { pauseTimer(); switchMode(); });

  classesBtn?.addEventListener("click", () => { renderClassList(); showOverlay(classesMenu); });
  closeClasses?.addEventListener("click", () => hideOverlay(classesMenu));
  classesMenu?.addEventListener("click", e => { if (e.target === classesMenu) hideOverlay(classesMenu); });

  statsBtn?.addEventListener("click", () => { updateStatsDisplay(); showOverlay(statsMenu); });
  closeStatsBtn?.addEventListener("click", () => hideOverlay(statsMenu));
  statsMenu?.addEventListener("click", e => { if (e.target === statsMenu) hideOverlay(statsMenu); });

  menuBtn?.addEventListener("click", () => showOverlay(modeMenu));
  closeMenuBtn?.addEventListener("click", () => hideOverlay(modeMenu));
  modeMenu?.addEventListener("click", e => { if (e.target === modeMenu) hideOverlay(modeMenu); });

  // ---------- Init ----------
  hideOverlay(modeMenu);
  hideOverlay(statsMenu);
  hideOverlay(classesMenu);
  renderClassList();
  resetPomodoro();
});
