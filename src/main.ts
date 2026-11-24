import * as Blockly from 'blockly';
import { blankWorkspace, compile, compileTutorial, createWorkspace } from './blocks';
import { createArena } from './arena';
import { missions, parts, quiz, validate, checkObjectives, objectives, type ObjectiveCheck, type Part } from './missions';
import { Simulator, START } from './simulator';
import { badges, levelIcons, predictions, bonuses, tutorial, drawDemo, remaining, finishClock, formatTime, totalXP, type Clock } from './adventure';
import './style.css';
import './game.css';

document.title = 'Robot Academy: Advanced Base Challenge';
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead">
    <button id="home" class="brand" type="button"><span class="brandmark" aria-hidden="true">✦</span><span>Robot Academy</span></button>
    <div id="gameStats" class="game-stats" hidden>
      <span id="identity"></span><span id="xp" class="stat"></span>
      <span id="timer" class="stat" role="timer" hidden></span>
      <button id="results" type="button">Results</button><button id="fullscreen" type="button">Fullscreen</button>
    </div>
  </header>
  <main id="welcome">
    <section class="welcome-hero">
      <div class="welcome-copy">
        <p class="eyebrow">ROBOT ACADEMY</p><h1>Advanced Base<br>Challenge</h1>
        <p>Build a program, put your robot to the test, and earn six badges.</p>
        <p id="durationBanner" class="duration"></p>
        <form id="startForm">
          <label>Your name<input id="studentName" maxlength="30" required autocomplete="given-name" placeholder="e.g. Alex"></label>
          <label>Robot name<input id="robotName" maxlength="24" required placeholder="e.g. Bolt"></label>
          <label class="mode-choice"><input id="timedChoice" type="checkbox" checked> Student Challenge Mode</label>
          <button id="start" type="submit" class="primary">Start Adventure</button>
        </form>
        <button id="teacher" type="button" class="teacher-link">Teacher mode</button>
      </div>
      <div id="showcase"><div class="hero-caption"><b>ADVANCED DRIVING BASE</b><span>SPIKE Prime · Lesson 5</span></div></div>
    </section>
    <h2 class="map-title">Adventure map</h2><nav id="welcomeMap" class="level-map" aria-label="Adventure map"></nav>
  </main>
  <main id="lab" hidden>
    <nav id="missionNav" class="level-map" aria-label="Levels"></nav>
    <div id="returnNote" class="return-note" role="status" hidden></div>
    <div class="lab-grid">
      <section class="mission" aria-label="Level objectives">
        <div class="brief-main"><div id="missionMeta" class="eyebrow"></div><h1 id="missionTitle"></h1><p id="objective"></p></div>
        <div id="briefDetails"><div id="missionText"></div><div id="missionTools"></div></div>
        <div class="feedback"><strong id="runStatus">Ready to run</strong><div id="feedback" role="status"></div><button id="next" class="primary" type="button" hidden>Next Level</button></div>
      </section>
      <section class="lab-card editor" aria-labelledby="editorTitle">
        <div class="card-head"><h2 id="editorTitle">Programming bay</h2><button id="resetMission" class="quiet" type="button">Reset level</button></div>
        <div id="workspace" aria-label="Blockly programming workspace"></div>
        <div class="runbar"><button id="run" class="primary" type="button">▶ Run Robot</button><button id="pause" type="button">Pause</button><button id="step" type="button">Step</button><button id="stop" type="button">Stop</button><button id="resetRobot" type="button">Reset Robot</button></div>
      </section>
      <section class="lab-card simulator" aria-labelledby="arenaTitle">
        <div class="card-head"><h2 id="arenaTitle">Testing arena</h2><span class="state" id="simState">Ready</span></div>
        <div id="arena">
          <div class="camera"><button id="iso" aria-pressed="true" type="button">3D</button><button id="top" aria-pressed="false" type="button">Top</button><button id="zoomIn" aria-label="Zoom in" type="button">+</button><button id="zoomOut" aria-label="Zoom out" type="button">−</button></div>
          <div class="arena-legend"><span><i class="legend-start"></i>Start</span><span><i class="legend-target"></i>Target</span><span><i class="legend-trail"></i>Trail</span><span id="previousTrail" hidden><i class="legend-previous"></i>Previous trail</span></div>
        </div>
        <div class="telemetry"><div><span>Yaw</span><b id="yaw">0.0°</b></div><div><span>Motor speed L / R</span><b id="speed">0 / 0%</b></div><div><span>Distance</span><b id="distance">0.0 cm</b></div></div>
      </section>
    </div>
  </main>
  <dialog id="celebration"><div class="confetti" aria-hidden="true"></div><div class="modal-inner"><div id="earnedIcon" class="earned-icon" aria-hidden="true"></div><p class="eyebrow">BADGE EARNED</p><h2>LEVEL COMPLETE</h2><p id="earnedBadge"></p><p id="earnedDetails"></p><div class="modal-actions"><button id="keepPractice" type="button">Keep practicing</button><button id="celebrateNext" class="primary" type="button">Next Level</button></div></div></dialog>
  <dialog id="summary"><div class="modal-inner"><p class="eyebrow">ADVENTURE RESULTS</p><h2 id="summaryTitle"></h2><div id="summaryBody"></div><div class="modal-actions"><button id="summaryClose" class="primary" type="button">Continue practice</button></div></div></dialog>
  <dialog id="teacherPanel"><div class="modal-inner"><p class="eyebrow">INSTRUCTOR TOOLS</p><h2>Teacher mode</h2>
    <p>Settings apply on this browser. Previews have their own workspace.</p>
    <div class="teacher-settings"><label>Challenge duration (minutes)<input id="teacherDuration" type="number" min="1" max="180" required></label>
    <label><input id="teacherSound" type="checkbox"> Celebration sound</label><button id="saveSettings" class="primary" type="button">Save settings</button></div>
    <h3>Preview a level</h3><div id="teacherLevels" class="teacher-levels"></div>
    <details><summary>Validation criteria</summary><div id="teacherCriteria"></div></details>
    <button id="teacherReference" type="button">View teacher reference</button><div id="referenceContent" hidden></div>
    <div class="modal-actions"><button id="resetSession" class="danger" type="button">Reset student session</button><button id="teacherClose" type="button">Close</button></div>
  </div></dialog>`;

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const button = (id: string) => get<HTMLButtonElement>(id);
const input = (id: string) => get<HTMLInputElement>(id);
const dialog = (id: string) => get<HTMLDialogElement>(id);
const key = 'spike-prime-lab-v1';
type MissionSave = {
  code?: object; complete: boolean; attempts: number; hints: number; inspected: Part[]; started: number;
  checks?: ObjectiveCheck[]; best?: number; elapsed?: number; bonus?: boolean; improved?: boolean; bestChecks?: number; prediction?: string;
};
type Save = {
  current: number; missions: MissionSave[]; answers: Record<number, number>; student?: string; robot?: string;
  tutorialDone?: boolean; tutorialStep?: number; tutorialCode?: object; timed?: boolean; screen?: 'welcome' | 'lab'; clock?: Clock; away?: boolean;
};
type Settings = { minutes: number; sound: boolean };
function read<T>(key: string, fallback: T): T {
  try { return (JSON.parse(localStorage.getItem(key) ?? 'null') as T | null) ?? fallback; }
  catch { return fallback; }
}
const fresh = (): MissionSave => ({ complete: false, attempts: 0, hints: 0, inspected: [], started: 0 });
const defaultSave = (): Save => ({ current: 0, missions: missions.map(fresh), answers: {} });
const loaded = read<Save>(key, defaultSave());
let data = loaded.missions?.length === missions.length && missions[loaded.current] ? loaded : defaultSave();
if (data.missions.some(level => level.complete || level.attempts || level.code?.constructor === Object && level.started)) data.tutorialDone ??= true;
const settingsKey = 'robot-academy-settings';
let settings = read<Settings>(settingsKey, { minutes: 60, sound: false });
let current = data.current;
let teaching = false, inLab = false, loading = false, saved = true;
let preview = defaultSave();
let tutorialStep = Math.max(0, Math.min(6, data.tutorialStep ?? 0));
const inTutorial = () => !teaching && !data.tutorialDone;
const session = () => teaching ? preview : data;
const record = () => session().missions[current];
const completeCount = () => session().missions.filter(level => level.complete).length;
const unlocked = (index: number) => teaching || index === 0 || data.missions[index - 1]?.complete || data.missions[index]?.complete;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function persist() {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { saved = false; }
}

const workspace = createWorkspace(get('workspace'));
let saveTimer: number | undefined;
function saveCode() {
  if (loading || !inLab) return;
  const code = Blockly.serialization.workspaces.save(workspace);
  if (inTutorial()) data.tutorialCode = code;
  else record().code = code;
  if (!teaching) persist();
}
function loadCode() {
  clearTimeout(saveTimer);
  loading = true;
  workspace.clear();
  try { Blockly.serialization.workspaces.load((inTutorial() ? data.tutorialCode : record().code) ?? blankWorkspace(), workspace); }
  catch {
    workspace.clear();
    Blockly.serialization.workspaces.load(blankWorkspace(), workspace);
  }
  workspace.clearUndo();
  workspace.getToolbox()?.clearSelection();
  Blockly.svgResize(workspace);
  workspace.scrollCenter();
  loading = false;
}
workspace.addChangeListener(event => {
  if (loading || !inLab) return;
  if (inTutorial()) {
    if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT && 'newItem' in event && event.newItem === 'Control' && tutorialStep === 0) advanceTutorial(1);
    if (!event.isUiEvent) checkTutorial();
  }
  if (event.isUiEvent) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveCode, 100);
});
new ResizeObserver(() => Blockly.svgResize(workspace)).observe(get('workspace'));
window.addEventListener('pagehide', saveCode);

const sim = new Simulator();
const heroPose = new Simulator();
let selectedPart: Part | undefined;
let arena: ReturnType<typeof createArena> | undefined;
let showcase: ReturnType<typeof createArena> | undefined;
try { arena = createArena(get('arena'), partInfo); }
catch {
  get('arena').querySelector('.camera')?.remove();
  get('arena').insertAdjacentHTML('afterbegin', '<p class="arena-error">The 3D view needs WebGL. You can still use the live readings and program your robot.</p>');
}
try { showcase = createArena(get('showcase'), () => {}, true); }
catch { get('showcase').classList.add('no-webgl'); }
if (arena) {
  function camera(top: boolean) {
    if (top) arena!.top(); else arena!.iso();
    button('top').setAttribute('aria-pressed', String(top));
    button('iso').setAttribute('aria-pressed', String(!top));
  }
  button('top').onclick = () => camera(true);
  button('iso').onclick = () => camera(false);
  button('zoomIn').onclick = () => arena!.zoom(0.83);
  button('zoomOut').onclick = () => arena!.zoom(1.2);
}
function clearTrails() { arena?.clear(); get('previousTrail').hidden = true; }
function report(message: string, tone = '') {
  get('feedback').textContent = message + (saved ? '' : ' Progress can only be kept in this tab.');
  get('feedback').dataset.tone = tone;
  get('runStatus').textContent = ({
    success: inTutorial() ? 'Practice goal met' : 'Mission completed',
    retry: inTutorial() ? 'Try again' : 'Mission incomplete', running: 'Robot running',
    stopped: 'Program stopped', paused: 'Robot paused',
  } as Record<string, string>)[tone] ?? 'Ready to run';
  get('runStatus').dataset.tone = tone;
}

function mapMarkup(active: boolean) {
  return missions.map((m, i) => {
    const earned = session().missions[i].complete;
    const locked = active && !unlocked(i);
    const attributes = `class="map-node ${earned ? 'earned' : ''}" data-mission="${i}"`;
    const contents = `<span class="map-icon" aria-hidden="true">${earned ? '✓' : levelIcons[i]}</span><span><small>LEVEL ${i + 1} · ${m.minutes} MIN</small><strong>${m.title}</strong></span>`;
    return active ? `<button type="button" ${attributes} ${locked ? 'disabled' : ''} ${i === current ? 'aria-current="step"' : ''}>${contents}</button>` :
      `<div ${attributes}>${contents}</div>`;
  }).join('');
}
function navigation() {
  get('xp').textContent = '★ ' + totalXP(session().missions) + ' XP';
  get('missionNav').innerHTML = inTutorial() ? '<div class="tutorial-map">TRAINING BAY <span>Learn the controls, then start Level 1</span></div>' : mapMarkup(true);
  get('missionNav').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => switchMission(Number(b.dataset.mission)));
  button('next').hidden = inTutorial() || !record().complete || current >= missions.length - 1 || !unlocked(current + 1);
}
function welcome() {
  if (inLab) saveCode();
  sim.reset(); clearTrails();
  inLab = false;
  teaching = false;
  get('lab').hidden = true;
  get('gameStats').hidden = true;
  get('welcome').hidden = false;
  data.screen = 'welcome';
  persist();
  get('durationBanner').textContent = `${settings.minutes}-minute challenge · 6 levels`;
  input('studentName').value = data.student ?? '';
  input('robotName').value = data.robot ?? '';
  input('timedChoice').checked = data.timed ?? true;
  input('timedChoice').disabled = !!data.clock;
  button('start').textContent = data.student ? 'Resume Adventure' : 'Start Adventure';
  get('welcomeMap').innerHTML = mapMarkup(false);
  window.scrollTo(0, 0);
}
function openLab(index: number) {
  current = index;
  selectedPart = undefined;
  sim.reset(); clearTrails();
  get('returnNote').hidden = true;
  inLab = true;
  get('welcome').hidden = true;
  get('lab').hidden = false;
  get('gameStats').hidden = false;
  get('identity').textContent = teaching ? 'Teacher preview' : `${data.student} · ${data.robot}`;
  button('home').title = 'Return to welcome';
  if (!teaching) {
    data.current = current;
    data.screen = 'lab';
    if (!inTutorial() && !record().started) record().started = Date.now();
    startClock();
    persist();
  } else if (!record().started) record().started = Date.now();
  loadCode();
  renderMission();
  report(!inTutorial() && record().complete ? 'Badge earned. You can keep experimenting.' : current === 5 ? 'Try the judge quiz to earn your final badge.' : 'Build a program and try it in the arena.', !inTutorial() && record().complete ? 'success' : '');
  updateClock();
  window.scrollTo(0, 0);
}
function switchMission(index: number) {
  if (index === current || !unlocked(index)) return;
  saveCode();
  openLab(index);
}
button('home').onclick = welcome;
get<HTMLFormElement>('startForm').onsubmit = event => {
  event.preventDefault();
  const student = input('studentName').value.trim(), robot = input('robotName').value.trim();
  if (!student || !robot) {
    const field = input(student ? 'robotName' : 'studentName');
    field.setCustomValidity('Enter a name to start.');
    field.reportValidity();
    return;
  }
  data.student = student;
  data.robot = robot;
  data.timed = data.clock ? true : input('timedChoice').checked;
  teaching = false;
  openLab(data.current);
};
for (const id of ['studentName', 'robotName']) input(id).oninput = () => input(id).setCustomValidity('');
button('next').onclick = () => switchMission(current + 1);

function startClock() {
  if (!teaching && data.timed && data.tutorialDone && !data.clock) {
    data.clock = { startedAt: Date.now(), durationMs: settings.minutes * 60_000 };
  }
}
function updateClock() {
  const clock = teaching ? undefined : data.clock;
  const timer = get('timer');
  timer.hidden = !clock || !inLab;
  button('fullscreen').hidden = !document.fullscreenEnabled;
  button('results').hidden = teaching;
  if (!clock) return;
  const left = remaining(clock, Date.now());
  timer.textContent = clock.finishedAt ? 'Practice' : '◷ ' + formatTime(left);
  timer.dataset.urgent = String(!clock.finishedAt && left < 5 * 60_000);
  if (!clock.finishedAt && left === 0) {
    data.clock = finishClock(clock, Date.now());
    captureTimedResults();
    persist();
    if (inLab) showSummary('Time is up! Your progress is saved.');
  }
}
type LevelResult = Pick<MissionSave, 'complete' | 'elapsed' | 'best' | 'attempts' | 'bonus' | 'improved'>;
function captureTimedResults() {
  const snapshot = data as Save & { results?: LevelResult[] };
  snapshot.results ??= data.missions.map(({complete, elapsed, best, attempts, bonus, improved}) => ({complete, elapsed, best, attempts, bonus, improved}));
}
function showSummary(title?: string) {
  const snapshot = (data as Save & { results?: LevelResult[] }).results;
  const levels = snapshot ?? data.missions;
  const count = levels.filter(level => level.complete).length;
  const bests = data.missions.map(level => level.best);
  const percentage = Math.round(count / missions.length * 100);
  get('summaryTitle').textContent = title ?? (snapshot ? 'Timed challenge results' : count === 6 ? 'Robotics Champion' : 'Your progress');
  get('summaryBody').innerHTML = `<p class="summary-score"><strong>${percentage}%</strong> complete · ${count}/6 badges · ${totalXP(levels)} XP</p>
    ${snapshot ? '<p>These results are saved for your timed session. Practice can still earn badges on your adventure map.</p>' : ''}
    <ul class="result-list">${levels.map((level, i) => `<li><span>${level.complete ? '✓' : '○'} ${missions[i].title}</span><span>${level.elapsed == null ? (level.complete ? 'Cleared' : 'In progress') : formatTime(level.elapsed)}${bests[i] == null ? '' : ' · Best ' + formatTime(bests[i]!)}</span></li>`).join('')}</ul>`;
  button('summaryClose').textContent = data.clock && !data.clock.finishedAt ? 'Back to challenge' : 'Continue practice';
  if (!dialog('summary').open) dialog('summary').showModal();
}
button('results').onclick = () => showSummary();
button('summaryClose').onclick = () => dialog('summary').close();
let wasFullscreen = !!document.fullscreenElement;
button('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { remind('Fullscreen is unavailable in this browser window. You can keep playing here.'); }
};
function remind(message: string) {
  get('returnNote').textContent = message;
  get('returnNote').hidden = false;
}
function returnReminder() {
  return data.clock?.finishedAt ? 'Welcome back! Your challenge results are saved. You can keep practicing.' :
    'Welcome back! Your work is saved and the countdown keeps going.';
}
document.addEventListener('fullscreenchange', () => {
  const entered = !!document.fullscreenElement;
  button('fullscreen').textContent = entered ? 'Exit fullscreen' : 'Fullscreen';
  if (wasFullscreen && !entered && inLab && !teaching) {
    saveCode();
    remind(data.clock ? 'You left fullscreen. ' + returnReminder() : 'You left fullscreen. Your work is saved.');
  }
  wasFullscreen = entered;
});
document.addEventListener('visibilitychange', () => {
  if (!inLab || teaching || !data.clock) return;
  if (document.hidden) { data.away = true; saveCode(); }
  else if (data.away) {
    data.away = false;
    updateClock();
    remind(returnReminder());
    persist();
  }
});

async function openTeacher() {
  const info = await import('./teacher');
  input('teacherDuration').value = String(settings.minutes);
  input('teacherSound').checked = settings.sound;
  get('teacherLevels').innerHTML = missions.map((m, i) => `<button type="button" data-preview="${i}">${i + 1}. ${m.title}</button>`).join('');
  get('teacherCriteria').innerHTML = `<ol>${info.criteria.map(item => '<li>' + item + '</li>').join('')}</ol>`;
  get('referenceContent').hidden = true;
  get('referenceContent').textContent = '';
  button('teacherReference').textContent = 'View teacher reference';
  get('teacherLevels').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => {
    dialog('teacherPanel').close();
    teaching = true;
    preview = defaultSave();
    openLab(Number(b.dataset.preview));
  });
  button('teacherReference').onclick = () => {
    const panel = get('referenceContent');
    panel.hidden = !panel.hidden;
    panel.innerHTML = panel.hidden ? '' : info.reference.map(([title, body]) => `<h3>${title}</h3><p>${body}</p>`).join('');
    button('teacherReference').textContent = panel.hidden ? 'View teacher reference' : 'Hide teacher reference';
  };
  dialog('teacherPanel').showModal();
}
button('teacher').onclick = () => { void openTeacher(); };
button('teacherClose').onclick = () => dialog('teacherPanel').close();
button('saveSettings').onclick = () => {
  const field = input('teacherDuration');
  if (!field.reportValidity()) return;
  settings = { minutes: field.valueAsNumber, sound: input('teacherSound').checked };
  try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { saved = false; }
  get('durationBanner').textContent = `${settings.minutes}-minute challenge · 6 levels`;
  dialog('teacherPanel').close();
};
button('resetSession').onclick = () => {
  if (!confirm('Clear this browser’s student names, programs, timer, and badges?')) return;
  data = defaultSave();
  current = tutorialStep = 0;
  dialog('teacherPanel').close();
  welcome();
};

function updateParts() {
  const panel = document.getElementById('partPanel');
  if (!panel) return;
  panel.innerHTML = `<div class="part-actions">${Object.entries(parts).map(([part, content]) => `<button type="button" data-part="${part}" aria-pressed="${selectedPart === part}">${record().inspected.includes(part as Part) ? '✓ ' : ''}${content[0]}</button>`).join('')}</div><p>${selectedPart ? parts[selectedPart][1] : 'Click a robot part or choose it here.'}</p>`;
  panel.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => partInfo(b.dataset.part as Part));
}
function partInfo(part: Part) {
  selectedPart = part;
  if (!inTutorial() && current === 0) {
    if (!record().inspected.includes(part)) record().inspected.push(part);
    updateParts();
    renderChecks();
    if (sim.state === 'done') finishRun();
    if (!teaching) persist();
  } else report(parts[part][1]);
}
function renderChecks() {
  const list = document.getElementById('objectiveList');
  if (!list) return;
  const entry = record();
  list.innerHTML = objectives[current].map((goal, i) => {
    const check = entry.checks?.[i];
    const inspected = current === 0 && i === 0 && entry.inspected.length === 4;
    const state = inspected || check?.passed || (entry.complete && !entry.checks) ? 'pass' : check ? 'fail' : 'pending';
    return `<li data-result="${state}"><span aria-label="${state === 'pass' ? 'Met' : state === 'fail' ? 'Needs work' : 'Pending'}">${state === 'pass' ? '✓' : state === 'fail' ? '×' : '○'}</span><div>${goal}${state === 'fail' ? `<small>${check!.feedback}</small>` : ''}</div></li>`;
  }).join('');
}
function refreshHints() {
  const b = document.getElementById('hint') as HTMLButtonElement | null;
  if (!b) return;
  const level = record();
  const available = Math.min(3, 1 + Math.max(level.attempts, Math.floor((Date.now() - level.started) / 45000)));
  b.disabled = level.hints >= available;
  b.textContent = level.hints === 3 ? 'All hints shown' : b.disabled ? 'Next hint unlocks shortly' : 'Reveal hint ' + (level.hints + 1);
  get('hintList').innerHTML = missions[current].hints.slice(0, level.hints).map(hint => '<li>' + hint + '</li>').join('');
}
let demoStart = 0;
function renderMission() {
  demoStart = 0;
  navigation();
  button('resetMission').hidden = inTutorial();
  if (inTutorial()) { renderTutorial(); return; }
  clearTutorialHighlight();
  const m = missions[current];
  get('missionMeta').textContent = `LEVEL ${current + 1} · ${m.minutes} MIN · ${m.focus}`;
  get('missionTitle').textContent = m.title;
  get('objective').textContent = m.objective;
  get('missionText').innerHTML = `<ul id="objectiveList" class="objective-list" aria-label="Objective checklist"></ul>
    <details class="demo"><summary>See the goal</summary><canvas id="demo" width="330" height="192" role="img" aria-label="${m.objective}"></canvas><button id="replayDemo" type="button">Replay demo</button></details>
    ${current === 0 ? '<div class="spec"><strong>Robot specs</strong><dl><dt>Drive ports</dt><dd>A + E</dd><dt>Testing speed</dt><dd>50%</dd><dt>Wheel circumference</dt><dd>≈ 27.63 cm</dd></dl></div><div id="partPanel"></div>' : ''}
    ${current === 5 ? '<div id="quiz"></div>' : ''}
    <details><summary>${current === 5 ? 'Judge reflection questions' : 'Level briefing'}</summary><ul class="tasks">${m.tasks.map(task => '<li>' + task + '</li>').join('')}</ul><p>${m.experiment}</p></details>`;
  get('missionTools').innerHTML = `<details class="prediction"><summary>Make a prediction</summary><label for="prediction">${predictions[current]}</label><textarea id="prediction" rows="2" maxlength="250" placeholder="I think…"></textarea></details>
    <details><summary>Hints</summary><button id="hint" type="button"></button><ol id="hintList"></ol></details>
    <details><summary>Bonus challenge ${record().bonus ? '✓' : ''}</summary><p>${bonuses[current]}</p><p>${m.extension}</p><button id="bonus" type="button" ${record().bonus ? 'disabled' : ''}>${record().bonus ? 'Bonus recorded' : 'Record my bonus practice'}</button></details>`;
  const prediction = get<HTMLTextAreaElement>('prediction');
  prediction.value = record().prediction ?? '';
  prediction.oninput = () => { record().prediction = prediction.value; if (!teaching) persist(); };
  button('hint').onclick = () => { record().hints++; if (!teaching) persist(); refreshHints(); };
  button('bonus').onclick = () => {
    record().bonus = true;
    if (!teaching) persist();
    button('bonus').disabled = true;
    button('bonus').textContent = 'Bonus recorded';
    navigation();
  };
  const demoPanel = get('demo').parentElement as HTMLDetailsElement;
  demoPanel.addEventListener('toggle', () => {
    if (demoPanel.isConnected && demoPanel.open) demoStart = performance.now();
  });
  button('replayDemo').onclick = () => { demoStart = performance.now(); };
  drawDemo(get<HTMLCanvasElement>('demo'), current, 1);
  updateParts();
  renderChecks();
  renderQuiz();
  refreshHints();
}
function renderQuiz() {
  const panel = document.getElementById('quiz');
  if (!panel) return;
  panel.innerHTML = `<details ${record().complete ? '' : 'open'}><summary>Judge quiz</summary><form id="quizForm">${quiz.map((q, i) => `<fieldset><legend>${q.question}</legend>${q.options.map((option, j) => `<label><input type="radio" name="q${i}" value="${j}" ${session().answers[i] === j ? 'checked' : ''} required> ${option}</label>`).join('')}</fieldset>`).join('')}<button type="submit" class="primary">Check answers</button></form></details>`;
  const form = get<HTMLFormElement>('quizForm');
  form.onchange = () => {
    new FormData(form).forEach((value, name) => { session().answers[Number(name.slice(1))] = Number(value); });
    if (!teaching) persist();
  };
  form.onsubmit = event => {
    event.preventDefault();
    record().attempts++;
    const checks = quiz.map((q, i) => ({ passed: session().answers[i] === q.answer, feedback: 'Think back to what you observed in the arena.' }));
    evaluateChecks(checks);
    if (checks.every(check => check.passed)) completeLevel();
    else report('Review the goals marked with an ×, then try the quiz again.', 'retry');
    refreshHints();
  };
}
function evaluateChecks(checks: ObjectiveCheck[]) {
  updateClock();
  const entry = record();
  const passed = checks.filter(check => check.passed).length;
  if (entry.bestChecks != null && passed > entry.bestChecks) entry.improved = true;
  entry.bestChecks = Math.max(entry.bestChecks ?? 0, passed);
  entry.checks = checks;
  if (!teaching) persist();
  renderChecks();
  navigation();
}
function playCelebration() {
  if (!settings.sound) return;
  try {
    const audio = new AudioContext();
    void audio.resume().then(() => {
      [523.25, 659.25, 783.99].forEach((hz, i) => {
        const note = audio.createOscillator(), volume = audio.createGain(), start = audio.currentTime + i * 0.1;
        note.frequency.value = hz;
        volume.gain.setValueAtTime(0.08, start);
        volume.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        note.connect(volume).connect(audio.destination);
        note.start(start);
        note.stop(start + 0.25);
      });
      setTimeout(() => { void audio.close(); }, 650);
    }).catch(() => { void audio.close(); });
  } catch { /* Sound is optional. */ }
}
function completeLevel() {
  const level = record();
  report('You met every objective and earned the ' + badges[current] + ' badge.', 'success');
  if (level.complete) return;
  level.complete = true;
  level.elapsed = Math.max(0, Date.now() - (level.started || Date.now()));
  level.best = Math.min(level.best ?? Infinity, level.elapsed);
  if (!teaching) persist();
  navigation();
  get('earnedIcon').textContent = levelIcons[current];
  get('earnedBadge').textContent = badges[current];
  get('earnedDetails').textContent = `+100 XP · Level time ${formatTime(level.elapsed)} · Personal best ${formatTime(level.best)}`;
  button('celebrateNext').textContent = current === 5 ? 'View results' : 'Next Level';
  dialog('celebration').querySelector('.confetti')!.innerHTML = Array.from({ length: 24 }, (_, i) =>
    `<i style="--x:${(i * 43) % 100}%;--d:${(i % 7) * 70}ms;--c:${['#ffb740','#42cbba','#a485ff','#ff68a2'][i % 4]}"></i>`).join('');
  dialog('celebration').showModal();
  playCelebration();
}
button('keepPractice').onclick = () => dialog('celebration').close();
button('celebrateNext').onclick = () => {
  dialog('celebration').close();
  if (current < 5) switchMission(current + 1);
  else showSummary();
};
function finishRun() {
  if (inTutorial()) {
    if (tutorialStep === 4 && sim.state === 'done') advanceTutorial(5);
    report(sim.state === 'done' ? 'Practice run finished. Reset the robot to finish training.' : sim.message, sim.state === 'done' ? 'success' : 'retry');
    return;
  }
  if (current === 5) {
    report(sim.state === 'done' ? 'Run finished. Use the judge quiz to complete this level.' : sim.message, sim.state === 'done' ? '' : 'retry');
    return;
  }
  evaluateChecks(checkObjectives(current, sim, record().inspected.length));
  const result = validate(current, sim, record().inspected.length);
  if (result.ok) completeLevel();
  else report(result.message, 'retry');
}
function startRun(step: boolean) {
  if (inTutorial() && tutorialStep !== 4) return;
  if (current === 2 && arena && sim.travel > 0.14) get('previousTrail').hidden = false;
  sim.reset();
  arena?.clear(!inTutorial() && current === 2);
  if (!inTutorial()) record().attempts++;
  saveCode();
  refreshHints();
  try {
    sim.start(inTutorial() ? compileTutorial(workspace) : compile(workspace));
    if (step) sim.step();
    report('Watch the highlighted block and the arena.', 'running');
  } catch (error) {
    if (!inTutorial() && current < 5) evaluateChecks(checkObjectives(current, sim, record().inspected.length));
    report(error instanceof Error ? error.message : 'Check your block connections.', 'retry');
  }
}
button('run').onclick = () => startRun(false);
button('step').onclick = () => {
  if (inTutorial()) return;
  if (sim.state === 'paused' || sim.state === 'running') sim.step();
  else startRun(true);
};
button('pause').onclick = () => {
  sim.pause();
  if (sim.state === 'paused') report('Resume or step through the program.', 'paused');
  if (sim.state === 'running') report('Watch the highlighted block.', 'running');
};
button('stop').onclick = () => {
  sim.stop();
  if (!inTutorial() && current < 5) evaluateChecks(checkObjectives(current, sim, record().inspected.length));
  report('Edit your blocks and try again when you’re ready.', 'stopped');
};
button('resetRobot').onclick = () => {
  sim.reset();
  clearTrails();
  if (inTutorial() && tutorialStep === 5) {
    advanceTutorial(6);
    report('✓ Practice goal met. You ran your program and reset the robot.', 'success');
  } else report('Robot returned to the start.');
};
button('resetMission').onclick = () => {
  if (!confirm('Reset this level’s program and progress? Your personal best stays saved.')) return;
  const best = record().best;
  session().missions[current] = { ...fresh(), best };
  if (current === 5) session().answers = {};
  openLab(current);
};

function clearTutorialHighlight() {
  document.querySelectorAll('.training-highlight').forEach(element => element.classList.remove('training-highlight'));
}
function renderTutorial() {
  const [title, description, target] = tutorial[tutorialStep];
  get('missionMeta').textContent = `TRAINING · STEP ${tutorialStep + 1} OF ${tutorial.length}`;
  get('missionTitle').textContent = title;
  get('objective').textContent = description;
  get('missionText').innerHTML = `<div class="training-steps" aria-hidden="true">${tutorial.map((_, i) => `<i class="${i <= tutorialStep ? 'lit' : ''}"></i>`).join('')}</div>
    ${tutorialStep === 6 ? '<button id="tutorialDone" class="primary" type="button">✓ Practice goal met · Start Level 1</button>' : '<p class="training-cue">→ Follow the highlighted area.</p>'}`;
  get('missionTools').innerHTML = '<button id="skipTutorial" type="button">Skip Tutorial</button>';
  button('skipTutorial').onclick = leaveTutorial;
  document.getElementById('tutorialDone')?.addEventListener('click', leaveTutorial);
  clearTutorialHighlight();
  (target === 'toolbox' ? get('workspace').querySelector('.blocklyToolboxDiv') : document.getElementById(target))?.classList.add('training-highlight');
}
function leaveTutorial() {
  data.tutorialDone = true;
  delete data.tutorialStep;
  delete data.tutorialCode;
  openLab(0);
}
function advanceTutorial(step: number) {
  tutorialStep = data.tutorialStep = step;
  persist();
  renderTutorial();
}
function checkTutorial() {
  const waits = workspace.getBlocksByType('lab_wait', false);
  if (tutorialStep === 1 && waits.length) advanceTutorial(2);
  const start = workspace.getTopBlocks(false).find(block => block.type === 'lab_start');
  const connectedWaits = waits.filter(wait => wait.getRootBlock() === start);
  if (tutorialStep === 2 && connectedWaits.length) advanceTutorial(3);
  if (tutorialStep === 3 && connectedWaits.some(wait => Number(wait.getFieldValue('VALUE')) === 2)) advanceTutorial(4);
}

let previous = performance.now(), accumulator = 0, active: string | undefined;
let lastDisplay = 0, priorState = sim.state, lastHero = 0;
const status = { idle: 'Ready', running: 'Running', paused: 'Paused', stopped: 'Stopped', done: 'Finished', error: 'Check run' };
function frame(now: number) {
  const step = 1 / 60;
  if (inLab && sim.state === 'running') {
    accumulator += Math.min((now - previous) / 1000, 0.15);
    while (accumulator >= step && sim.state === 'running') { sim.tick(step); accumulator -= step; }
  } else accumulator = 0;
  previous = now;
  if (inLab) {
    if (active !== sim.active?.id) {
      active = sim.active?.id;
      workspace.highlightBlock(active && workspace.getBlockById(active) ? active : null);
    }
    if (now - lastDisplay > 80 || sim.state !== priorState) {
      lastDisplay = now;
      get('yaw').textContent = sim.yaw.toFixed(1) + '°';
      get('distance').textContent = sim.travel.toFixed(1) + ' cm';
      const percent = (rate: number) => Math.round(rate / (2 * sim.circumference) * 100);
      get('speed').textContent = percent(sim.left) + ' / ' + percent(sim.right) + '%';
      get('simState').textContent = status[sim.state];
      get('simState').dataset.state = sim.state;
      button('pause').disabled = sim.state !== 'paused' && sim.state !== 'running';
      button('pause').textContent = sim.state === 'paused' ? 'Resume' : 'Pause';
      button('stop').disabled = button('pause').disabled;
      button('step').disabled = inTutorial();
      button('run').disabled = sim.state === 'running' || sim.state === 'paused' || (inTutorial() && tutorialStep !== 4);
      if (sim.state !== priorState && (sim.state === 'done' || sim.state === 'error')) finishRun();
      priorState = sim.state;
    }
    const demo = document.querySelector<HTMLCanvasElement>('.demo[open] #demo');
    if (demo && demoStart) {
      const progress = reducedMotion.matches ? 1 : Math.min(1, (now - demoStart) / 3000);
      drawDemo(demo, current, Math.max(0, progress));
      if (progress === 1) demoStart = 0;
    }
    arena?.draw(sim);
  } else if (showcase && now - lastHero > 32) {
    lastHero = now;
    heroPose.pose.angle = reducedMotion.matches ? 0 : Math.sin(now / 1800) * 0.48;
    heroPose.pose.z = START.z;
    showcase.draw(heroPose, false);
  }
  requestAnimationFrame(frame);
}
setInterval(() => { updateClock(); if (inLab) refreshHints(); }, 300);
if (data.screen === 'lab' && data.student && data.robot) {
  openLab(data.current);
  if (data.away) { remind(returnReminder()); data.away = false; persist(); }
} else welcome();
requestAnimationFrame(frame);

