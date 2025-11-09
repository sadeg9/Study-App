document.addEventListener("DOMContentLoaded", () => {
    // ---------- Timer elements ----------
    const timeDisplay = document.getElementById("timeDisplay");
    const progressFill = document.getElementById("progressFill");
    const modeLabel = document.getElementById("modeLabel");
    const toggleBtn = document.getElementById("toggleBtn");
    const resetBtn = document.getElementById("resetBtn");
    const fnBtn = document.getElementById("functionTime");
    const menuBtn = document.getElementById("menuTimer");
  
    // ---------- Subject dropdown and Classes ----------
    const subjectSelect = document.getElementById("subjectSelect");
    const classesBtn = document.getElementById("classesBtn");
    const classesMenu = document.getElementById("classesMenu");
    const closeClasses = document.getElementById("closeClasses");
    const addClassBtn = document.getElementById("addClassBtn");
    const newClassInput = document.getElementById("newClassInput");
    const classList = document.getElementById("classList");
  
    let classes = JSON.parse(localStorage.getItem("classes")) || [];
  
    // ---------- Stats elements ----------
    const statsBtn = document.getElementById("statsBtn");
    const statsMenu = document.getElementById("statsMenu");
    const closeStatsBtn = document.getElementById("closeStats");
    const statsList = document.getElementById("statsList");
  
    // ---------- Mode menu ----------
    const modeMenu = document.getElementById("modeMenu");
    const closeMenuBtn = document.getElementById("closeMenu");
  
    // ---------- Timer state ----------
    let isRunning = false, isFocus = true, startTime = 0, timeLeft = 0, timerInterval = null;
    let studyLog = JSON.parse(localStorage.getItem("studyLog")) || [];
    let currentSession = null;
  
    const FOCUS_TIME = 25 * 60 * 1000;
    const BREAK_TIME = 5 * 60 * 1000;
  
    // ---------- Utility functions ----------
    function formatTime(ms) {
      const totalSeconds = Math.ceil(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
    }
  
    function updateDisplay() {
      timeDisplay.textContent = formatTime(timeLeft);
      const total = isFocus ? FOCUS_TIME : BREAK_TIME;
      progressFill.style.width = total > 0 ? `${100 - (timeLeft/total)*100}%` : "0%";
    }
  
    function saveStudyLog() {
      localStorage.setItem("studyLog", JSON.stringify(studyLog));
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
      if(toggleBtn.querySelector("img")) toggleBtn.querySelector("img").src = "images/play_button.svg";
    }
  
    function startTimer() {
      if(isRunning) return;
      isRunning = true;
      startTime = Date.now();
      const subject = subjectSelect.value || "Unknown"; // dropdown value
      currentSession = { subject, startTime, mode:"pomodoro" };
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
      saveStudyLog();
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
  
    function updateStatsDisplay() {
      const totals = {};
      studyLog.forEach(entry => {
        const subj = entry.subject || "Unknown";
        totals[subj] = (totals[subj] || 0) + (entry.duration || 0);
      });
  
      statsList.innerHTML = "";
      if(Object.keys(totals).length === 0) {
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
  
    // ---------- Classes Menu ----------
    function renderClassList() {
      // Render in Classes menu
      classList.innerHTML = "";
      classes.forEach(c => {
        const li = document.createElement("li");
        li.textContent = c;
        li.addEventListener("click", () => {
          subjectSelect.value = c; // select class in dropdown
          hideOverlay(classesMenu);
        });
        classList.appendChild(li);
      });
  
      // Render in Subject dropdown
      subjectSelect.innerHTML = '<option value="">--Select Class--</option>';
      classes.forEach(c => {
        const option = document.createElement("option");
        option.value = c;
        option.textContent = c;
        subjectSelect.appendChild(option);
      });
    }
  
    addClassBtn?.addEventListener("click", () => {
      const newClass = newClassInput.value.trim();
      if(newClass && !classes.includes(newClass)) {
        classes.push(newClass);
        localStorage.setItem("classes", JSON.stringify(classes));
        newClassInput.value = "";
        renderClassList();
      }
    });
  
    classesBtn?.addEventListener("click", () => { renderClassList(); showOverlay(classesMenu); });
    closeClasses?.addEventListener("click", () => hideOverlay(classesMenu));
    classesMenu?.addEventListener("click", e => { if(e.target === classesMenu) hideOverlay(classesMenu); });
  
    // ---------- Menu Overlay ----------
    menuBtn?.addEventListener("click", () => showOverlay(modeMenu));
    closeMenuBtn?.addEventListener("click", () => hideOverlay(modeMenu));
    modeMenu?.addEventListener("click", e => { if(e.target === modeMenu) hideOverlay(modeMenu); });
  
    // ---------- Stats Overlay ----------
    statsBtn?.addEventListener("click", () => { updateStatsDisplay(); showOverlay(statsMenu); });
    closeStatsBtn?.addEventListener("click", () => hideOverlay(statsMenu));
    statsMenu?.addEventListener("click", e => { if(e.target === statsMenu) hideOverlay(statsMenu); });
  
    // ---------- Timer buttons ----------
    toggleBtn?.addEventListener("click", toggleTimer);
    resetBtn?.addEventListener("click", resetPomodoro);
    fnBtn?.addEventListener("click", () => { pauseTimer(); switchMode(); });
  
    // ---------- Initialize ----------
    hideOverlay(modeMenu);
    hideOverlay(statsMenu);
    hideOverlay(classesMenu);
    renderClassList();
    resetPomodoro();
  });
  