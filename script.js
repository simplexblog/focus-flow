(() => {
  const DURATIONS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const COLORS = { work: '#ff9d6c', short: '#7dd3fc', long: '#a78bfa' };
  const LABELS = { work: 'Focus', short: 'Pausa breve', long: 'Pausa lunga' };
  const RING_CIRCUMFERENCE = 2 * Math.PI * 118;
  const CYCLES_PER_LONG_BREAK = 4;
  const STORAGE_KEY = 'focusFlow.v1';

  const $ = (id) => document.getElementById(id);

  const timeDisplay = $('timeDisplay');
  const stateLabel = $('stateLabel');
  const ringProgress = $('ringProgress');
  const timerCard = $('timerCard');
  const startPauseBtn = $('startPauseBtn');
  const resetBtn = $('resetBtn');
  const skipBtn = $('skipBtn');
  const sessionsTodayEl = $('sessionsToday');
  const cycleDotsEl = $('cycleDots');
  const focusMinutesEl = $('focusMinutes');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const taskForm = $('taskForm');
  const taskInput = $('taskInput');
  const taskList = $('taskList');
  const emptyHint = $('emptyHint');
  const activeTaskEcho = $('activeTaskEcho');

  ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;

  const todayKey = () => new Date().toISOString().slice(0, 10);

  function loadState() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { raw = null; }
    const base = {
      tasks: [],
      activeTaskId: null,
      cyclesCompleted: 0,
      day: todayKey(),
      sessionsToday: 0,
      focusSecondsToday: 0,
    };
    const state = Object.assign(base, raw || {});
    if (state.day !== todayKey()) {
      state.day = todayKey();
      state.sessionsToday = 0;
      state.focusSecondsToday = 0;
      state.cyclesCompleted = 0;
    }
    return state;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const state = loadState();

  let mode = 'work';
  let secondsLeft = DURATIONS.work;
  let running = false;
  let tickHandle = null;
  let lastTick = null;

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function renderTimer() {
    timeDisplay.textContent = formatTime(secondsLeft);
    const total = DURATIONS[mode];
    const frac = 1 - secondsLeft / total;
    ringProgress.style.stroke = COLORS[mode];
    ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);
    stateLabel.textContent = running ? LABELS[mode] : (secondsLeft === total ? 'Pronto' : 'In pausa');
    startPauseBtn.textContent = running ? 'Pausa' : (secondsLeft === total ? 'Avvia' : 'Riprendi');
    document.title = running ? `${formatTime(secondsLeft)} · ${LABELS[mode]} — Focus Flow` : 'Focus Flow';
    timerCard.classList.toggle('pulsing', running && mode === 'work');
  }

  function renderStats() {
    sessionsTodayEl.textContent = state.sessionsToday;
    const dotsTotal = CYCLES_PER_LONG_BREAK;
    const filled = state.cyclesCompleted % dotsTotal;
    let dots = '';
    for (let i = 0; i < dotsTotal; i++) dots += i < filled ? '●' : '○';
    cycleDotsEl.textContent = dots;
    const mins = Math.floor(state.focusSecondsToday / 60);
    focusMinutesEl.textContent = `${mins}m`;
  }

  function renderTasks() {
    taskList.innerHTML = '';
    emptyHint.style.display = state.tasks.length === 0 ? 'block' : 'none';
    state.tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' done' : '') + (task.id === state.activeTaskId ? ' active-task' : '');

      const check = document.createElement('button');
      check.className = 'task-check';
      check.textContent = '✓';
      check.title = 'Segna come completata';
      check.addEventListener('click', () => {
        task.done = !task.done;
        if (task.done && state.activeTaskId === task.id) state.activeTaskId = null;
        saveState();
        renderTasks();
        renderFooter();
      });

      const selectBtn = document.createElement('button');
      selectBtn.className = 'task-select';
      selectBtn.textContent = task.id === state.activeTaskId ? '🎯' : '⚪';
      selectBtn.title = 'Imposta come attività attiva';
      selectBtn.addEventListener('click', () => {
        state.activeTaskId = state.activeTaskId === task.id ? null : task.id;
        saveState();
        renderTasks();
        renderFooter();
      });

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;

      const pomoCount = document.createElement('span');
      pomoCount.className = 'task-pomo-count';
      pomoCount.textContent = `🍅 ${task.pomodoros || 0}`;

      const del = document.createElement('button');
      del.className = 'task-delete';
      del.textContent = '✕';
      del.title = 'Elimina';
      del.addEventListener('click', () => {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        if (state.activeTaskId === task.id) state.activeTaskId = null;
        saveState();
        renderTasks();
        renderFooter();
      });

      li.append(check, selectBtn, text, pomoCount, del);
      taskList.appendChild(li);
    });
  }

  function renderFooter() {
    const active = state.tasks.find((t) => t.id === state.activeTaskId);
    activeTaskEcho.textContent = active ? `In focus su: ${active.text}` : '';
  }

  function playDing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [880, 1108].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.45);
      });
    } catch (e) { /* audio not available, ignore */ }
  }

  function setMode(newMode, resetTime = true) {
    mode = newMode;
    modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === newMode));
    if (resetTime) secondsLeft = DURATIONS[newMode];
    renderTimer();
  }

  function tick() {
    const now = Date.now();
    const elapsed = (now - lastTick) / 1000;
    lastTick = now;
    secondsLeft -= elapsed;

    if (mode === 'work') {
      state.focusSecondsToday += elapsed;
    }

    if (secondsLeft <= 0) {
      completeSession();
      return;
    }
    renderTimer();
    renderStats();
  }

  function completeSession() {
    stopTimer();
    playDing();

    if (mode === 'work') {
      state.sessionsToday += 1;
      state.cyclesCompleted += 1;
      const active = state.tasks.find((t) => t.id === state.activeTaskId);
      if (active) active.pomodoros = (active.pomodoros || 0) + 1;
      saveState();
      renderTasks();

      const isLongBreak = state.cyclesCompleted % CYCLES_PER_LONG_BREAK === 0;
      setMode(isLongBreak ? 'long' : 'short');
    } else {
      setMode('work');
    }
    saveState();
    renderStats();
    renderTimer();
  }

  function startTimer() {
    if (running) return;
    running = true;
    lastTick = Date.now();
    tickHandle = setInterval(tick, 250);
    renderTimer();
  }

  function stopTimer() {
    running = false;
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = null;
    saveState();
    renderTimer();
  }

  function resetTimer() {
    stopTimer();
    secondsLeft = DURATIONS[mode];
    renderTimer();
  }

  startPauseBtn.addEventListener('click', () => {
    if (running) stopTimer(); else startTimer();
  });

  resetBtn.addEventListener('click', resetTimer);

  skipBtn.addEventListener('click', () => {
    stopTimer();
    setMode(mode === 'work' ? 'short' : 'work');
  });

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      stopTimer();
      setMode(btn.dataset.mode);
    });
  });

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const task = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, done: false, pomodoros: 0 };
    state.tasks.push(task);
    if (!state.activeTaskId) state.activeTaskId = task.id;
    taskInput.value = '';
    saveState();
    renderTasks();
    renderFooter();
  });

  // Init
  setMode('work');
  renderStats();
  renderTasks();
  renderFooter();

  // Keep stats fresh if the day rolls over while the tab stays open
  setInterval(() => {
    if (state.day !== todayKey()) {
      state.day = todayKey();
      state.sessionsToday = 0;
      state.focusSecondsToday = 0;
      state.cyclesCompleted = 0;
      saveState();
      renderStats();
    }
  }, 60000);
})();
