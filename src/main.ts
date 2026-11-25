import * as Blockly from 'blockly';
import { blankWorkspace, compile, compileMyBlocks, createWorkspace, lessonToolbox } from './blocks';
import { createArena } from './arena';
import { missions, parts, type Part } from './missions';
import { Simulator, START } from './simulator';
import { badges, levelIcons, remaining, finishClock, formatTime, totalXP, type Clock } from './adventure';
import { exampleProgram, championQuiz } from './guides';
import { experiments, comprehension, type Experiment, type LessonQuestion } from './experiments';
import { myExperiments, myBlocksReference, myQuiz, blockLabel, type MyExperiment } from './my-blocks-lesson';
import type { Block } from './guides';
import { lessonFiveAnswers } from './teacher';
import './style.css';
import './game.css';

document.title = 'Robot Academy: SPIKE Prime Simulator';
const lessonTitles = { 5: 'Advanced Driving Base', 6: 'My Blocks' };
const myActivities = ['Movement Review', 'Create Your First My Block', 'Button Controller', 'Square Challenge', 'Robot Navigator', 'Championship Quiz'];
let lesson: 5 | 6 = 5;
const activities = () => lesson === 5 ? missions : myActivities.map(title => ({ title, objective: '' }));
const championship = () => lesson === 5 ? championQuiz : myQuiz;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead">
    <button id="home" class="brand" type="button"><span class="brandmark" aria-hidden="true">✦</span><span>Home</span></button>
    <div id="gameStats" class="game-stats" hidden>
      <span id="identity"></span><span id="xp" class="stat"></span>
      <span id="timer" class="stat" role="timer" hidden></span>
      <button id="results" type="button">Results</button><button id="fullscreen" type="button">Fullscreen</button>
    </div>
  </header>
  <main id="welcome">
    <section class="welcome-hero">
      <div class="welcome-copy">
        <p class="eyebrow">ROBOT ACADEMY</p><h1>Choose a lesson</h1>
        <nav id="lessonSelect" class="lesson-select" aria-label="Lessons"></nav>
        <form id="startForm">
          <label>Your name<input id="studentName" maxlength="30" required autocomplete="given-name" placeholder="e.g. Alex"></label>
          <label>Robot name<input id="robotName" maxlength="24" required placeholder="e.g. Bolt"></label>
          <label class="mode-choice"><input id="timedChoice" type="checkbox" checked> Student Challenge Mode</label>
          <button id="start" type="submit" class="primary">Start lesson</button>
        </form>
        <button id="teacher" type="button" class="teacher-link">Teacher mode</button> <button id="newSession" type="button" class="quiet">New student session</button>
      </div>
      <div id="showcase"><div class="hero-caption"><b>ADVANCED DRIVING BASE</b><span>SPIKE Prime</span></div></div>
    </section>
    <nav id="welcomeMap" class="level-map" aria-label="Activity progress"></nav>
  </main>
  <main id="lab" hidden>
    <nav id="missionNav" class="level-map" aria-label="Levels"></nav>
    <div id="returnNote" class="return-note" role="status" hidden></div>
    <div class="lab-grid">
      <section class="mission" aria-label="Experiment instructions">
        <div class="brief-main"><div id="missionMeta" class="eyebrow"></div><h1 id="missionTitle"></h1></div>
        <div class="feedback"><strong id="runStatus">Ready to run</strong><div id="feedback" role="status"></div><button id="next" class="primary" type="button" hidden>Next activity</button></div>
        <div id="missionText"></div>
      </section>
      <section class="lab-card editor" aria-labelledby="editorTitle">
        <div class="card-head"><h2 id="editorTitle">Programming bay</h2><button id="resetMission" class="quiet" type="button">Reset activity</button></div>
        <div id="workspace" aria-label="Blockly programming workspace"></div>
        <div class="runbar"><button id="run" class="primary" type="button">▶ Run Robot</button><button id="pause" type="button">Pause</button><button id="step" type="button">Step</button><button id="stop" type="button">Stop</button><button id="resetRobot" type="button">Reset Robot</button></div>
      </section>
      <section class="lab-card simulator" aria-labelledby="arenaTitle">
        <div class="card-head"><h2 id="arenaTitle">Testing arena</h2><span class="state" id="simState">Ready</span></div>
        <div id="arena">
          <div class="camera"><button id="iso" aria-pressed="true" type="button">3D</button><button id="top" aria-pressed="false" type="button">Top</button><button id="zoomIn" aria-label="Zoom in" type="button">+</button><button id="zoomOut" aria-label="Zoom out" type="button">−</button></div>
          <div class="arena-legend"><span><i class="legend-start"></i>Start</span><span><i class="legend-target"></i>Target</span><span><i class="legend-trail"></i>Trail</span><span id="previousTrail" hidden><i class="legend-previous"></i>Previous trail</span></div>
        </div>
        <div id="hubButtons" class="hub-buttons" hidden><button id="hubLeft" type="button" disabled>◀ Left hub button</button><button id="hubRight" type="button" disabled>Right hub button ▶</button></div><div class="telemetry"><div><span>Yaw</span><b id="yaw">0.0°</b></div><div><span>Motor speed L / R</span><b id="speed">0 / 0%</b></div><div><span>Distance</span><b id="distance">0.0 cm</b></div></div>
      </section>
    </div>
  </main>
  <dialog id="celebration"><div class="confetti" aria-hidden="true"></div><div class="modal-inner"><div id="earnedIcon" class="earned-icon" aria-hidden="true"></div><p class="eyebrow">BADGE EARNED</p><h2>ACTIVITY COMPLETE</h2><p id="earnedBadge"></p><p id="earnedDetails"></p><div class="modal-actions"><button id="keepPractice" type="button">Keep practicing</button><button id="celebrateNext" class="primary" type="button">Next activity</button></div></div></dialog>
  <dialog id="summary"><div class="modal-inner"><p class="eyebrow">ADVENTURE RESULTS</p><h2 id="summaryTitle"></h2><div id="summaryBody"></div><div class="modal-actions"><button id="summaryClose" class="primary" type="button">Continue practice</button></div></div></dialog>
  <dialog id="teacherPanel"><div class="modal-inner"><p class="eyebrow">INSTRUCTOR TOOLS</p><h2>Teacher mode</h2>
    <p>Settings apply on this browser. Previews have their own workspace.</p>
    <div class="teacher-settings"><label>Challenge duration (minutes)<input id="teacherDuration" type="number" min="1" max="180" required></label>
    <label><input id="teacherSound" type="checkbox"> Celebration sound</label><button id="saveSettings" class="primary" type="button">Save settings</button></div>
    <h3>Preview an activity</h3><div id="teacherLevels" class="teacher-levels"></div>
    <button id="teacherReference" type="button">View quiz answer key</button><div id="referenceContent" hidden></div>
    <div class="modal-actions"><button id="resetSession" class="danger" type="button">Reset student session</button><button id="teacherClose" type="button">Close</button></div>
  </div></dialog>`;

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const button = (id: string) => get<HTMLButtonElement>(id);
const input = (id: string) => get<HTMLInputElement>(id);
const dialog = (id: string) => get<HTMLDialogElement>(id);
const legacyKey = 'spike-prime-lab-v1';
const lessonKey = (number: 5 | 6) => 'robot-academy-lesson-' + number;
type MissionSave = {
  code?: object; complete: boolean; attempts: number; hints: number; inspected: Part[]; started: number;
  best?: number; elapsed?: number; bonus?: boolean; improved?: boolean; experimentIndex?: number; observations?: { prediction?: string; answer?: string; result?: string }[];
  guideStep?: number; quizStep?: number; quizPassed?: number[]; questionAnswers?: Record<number, number>; questionOrder?: number[][]; runNote?: string;
};
type Save = {
  current: number; missions: MissionSave[]; student?: string; robot?: string;
  timed?: boolean; screen?: 'welcome' | 'lab'; clock?: Clock; away?: boolean;
};
type Settings = { minutes: number; sound: boolean };
function read<T>(key: string, fallback: T): T {
  try { return (JSON.parse(localStorage.getItem(key) ?? 'null') as T | null) ?? fallback; }
  catch { return fallback; }
}
const fresh = (): MissionSave => ({ complete: false, attempts: 0, hints: 0, inspected: [], started: 0 });
const defaultSave = (): Save => ({ current: 0, missions: missions.map(fresh) });
function loadLesson(number: 5 | 6) {
  const legacy = number === 5 ? read(legacyKey, defaultSave()) : defaultSave();
  const loaded = read(lessonKey(number), legacy);
  return loaded.missions?.length === missions.length && missions[loaded.current] ? loaded : defaultSave();
}
const saves = { 5: loadLesson(5), 6: loadLesson(6) };
lesson = read<number>('robot-academy-active-lesson', 5) === 6 ? 6 : 5;
let data = saves[lesson];
const settingsKey = 'robot-academy-settings';
let settings = read<Settings>(settingsKey, { minutes: 60, sound: false });
let current = data.current;
let teaching = false, inLab = false, loading = false, saved = true;
let preview = defaultSave();
const session = () => teaching ? preview : data;
const record = () => session().missions[current];
const completeCount = () => session().missions.filter(level => level.complete).length;
const unlocked = (index: number) => teaching || index === 0 || data.missions[index - 1]?.complete || data.missions[index]?.complete;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function persist() {
  try {
    localStorage.setItem(lessonKey(lesson), JSON.stringify(data));
    localStorage.setItem('robot-academy-active-lesson', JSON.stringify(lesson));
  }
  catch { saved = false; }
}

const workspace = createWorkspace(get('workspace'));
let saveTimer: number | undefined;
function saveCode() {
  if (loading || !inLab) return;
  const code = Blockly.serialization.workspaces.save(workspace);
  record().code = code;
  if (!teaching) persist();
}
function loadCode() {
  clearTimeout(saveTimer);
  loading = true;
  workspace.clear();
  try { Blockly.serialization.workspaces.load(record().code ?? blankWorkspace(), workspace); }
  catch {
    workspace.clear();
    Blockly.serialization.workspaces.load(blankWorkspace(), workspace);
  }
  workspace.clearUndo();
  workspace.getToolbox()?.clearSelection();
  Blockly.svgResize(workspace);
  const start = workspace.getTopBlocks(false).find(block => block.type === 'lab_start');
  if (lesson === 6 && workspace.getTopBlocks(false).length > 1) workspace.zoomToFit();
  else if (start) workspace.centerOnBlock(start.id, true);
  else workspace.scrollCenter();
  loading = false;
}
workspace.addChangeListener(event => {
  if (loading || !inLab) return;
  if (event.isUiEvent) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveCode, 100);
});
new ResizeObserver(() => Blockly.svgResize(workspace)).observe(get('workspace'));
window.addEventListener('pagehide', saveCode);

const sim = new Simulator();
let controller: ReturnType<typeof compileMyBlocks> | undefined;
let eventSequence: ('start' | 'left' | 'right')[] = [];
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
    success: 'Level completed', retry: 'Check your run', observed: 'Experiment run', running: 'Robot running',
    stopped: 'Program stopped', paused: 'Robot paused',
  } as Record<string, string>)[tone] ?? 'Ready to run';
  get('runStatus').dataset.tone = tone;
}

function mapMarkup(active: boolean) {
  return activities().map((m, i) => {
    const earned = session().missions[i].complete;
    const locked = active && !unlocked(i);
    const attributes = `class="map-node ${earned ? 'earned' : ''}" data-mission="${i}"`;
    const state = earned ? '✓' : locked ? '○' : '';
    const contents = `<span class="map-icon" aria-label="${earned ? 'Complete' : locked ? 'Locked' : 'Incomplete'}">${state || '○'}</span><strong>${m.title}</strong>`;
    return active ? `<button type="button" ${attributes} ${locked ? 'disabled' : ''} ${i === current ? 'aria-current="step"' : ''}>${contents}</button>` :
      `<div ${attributes}>${contents}</div>`;
  }).join('');
}
function navigation() {
  get('xp').textContent = '★ ' + totalXP(session().missions) + ' XP';
  get('missionNav').innerHTML = mapMarkup(true);
  get('missionNav').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => switchMission(Number(b.dataset.mission)));
  button('next').hidden = !record().complete || current >= missions.length - 1 || !unlocked(current + 1);
}
function welcome() {
  if (inLab) saveCode();
  controller = undefined; sim.reset(); clearTrails();
  inLab = false;
  teaching = false;
  get('lab').hidden = true;
  get('gameStats').hidden = true;
  get('welcome').hidden = false;
  data.screen = 'welcome';
  persist();

  get('lessonSelect').innerHTML = ([5, 6] as const).map(number => `<button type="button" data-lesson="${number}" aria-pressed="${lesson === number}"><strong>Lesson ${number} — ${lessonTitles[number]}</strong><span>${saves[number].missions.filter(item => item.complete).length}/6 complete</span></button>`).join('');
  get('lessonSelect').querySelectorAll<HTMLButtonElement>('button').forEach(item => item.onclick = () => {
    const student = input('studentName').value, robot = input('robotName').value;
    lesson = item.dataset.lesson === '6' ? 6 : 5;
    data = saves[lesson];
    welcome();
    input('studentName').value ||= student;
    input('robotName').value ||= robot;
  });
  input('studentName').value = data.student ?? saves[lesson === 5 ? 6 : 5].student ?? '';
  input('robotName').value = data.robot ?? saves[lesson === 5 ? 6 : 5].robot ?? '';
  input('timedChoice').checked = data.timed ?? true;
  input('timedChoice').disabled = !!data.clock;
  button('start').textContent = data.student ? 'Resume lesson' : 'Start lesson';
  get('welcomeMap').innerHTML = mapMarkup(false);
  window.scrollTo(0, 0);
}
function openLab(index: number) {
  current = index;
  selectedPart = undefined;
  controller = undefined; sim.reset(); clearTrails();
  get('returnNote').hidden = true;
  inLab = true;
  get('welcome').hidden = true;
  get('lab').hidden = false;
  get('gameStats').hidden = false;
  get('identity').textContent = teaching ? 'Teacher preview' : `${data.student} · ${data.robot}`;
  button('home').title = 'Save and return to lesson selection';
  workspace.updateToolbox(lessonToolbox(lesson === 6));
  arena?.setCourse(lesson === 6);
  get('hubButtons').hidden = lesson !== 6;
  updateHubButtons();
  if (!teaching) {
    data.current = current;
    data.screen = 'lab';
    if (!record().started) record().started = Date.now();
    startClock();
    persist();
  } else if (!record().started) record().started = Date.now();
  loadCode();
  renderMission();
  get('missionMeta').closest('.mission')!.scrollTop = 0;
  report(record().runNote || (current === 5 ? 'Choose an answer for each question, then check your answers.' : 'Follow the steps, run your robot, then answer the question.'), record().complete ? 'success' : record().runNote ? 'observed' : '');
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
  if (!teaching && data.timed && !data.clock) {
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
    <ul class="result-list">${levels.map((level, i) => `<li><span>${level.complete ? '✓' : '○'} ${activities()[i].title}</span><span>${level.elapsed == null ? (level.complete ? 'Cleared' : 'In progress') : formatTime(level.elapsed)}${bests[i] == null ? '' : ' · Best ' + formatTime(bests[i]!)}</span></li>`).join('')}</ul>`;
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

function openTeacher() {
  input('teacherDuration').value = String(settings.minutes);
  input('teacherSound').checked = settings.sound;
  get('teacherLevels').innerHTML = activities().map((m, i) => `<button type="button" data-preview="${i}">${m.title}</button>`).join('');
  get('referenceContent').hidden = true;
  get('referenceContent').textContent = '';
  button('teacherReference').textContent = 'View quiz answer key';
  get('teacherLevels').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => {
    dialog('teacherPanel').close();
    teaching = true;
    preview = defaultSave();
    openLab(Number(b.dataset.preview));
  });
  button('teacherReference').onclick = () => {
    const panel = get('referenceContent');
    panel.hidden = !panel.hidden;
    panel.innerHTML = panel.hidden ? '' : quizKey(championship());
  };
  dialog('teacherPanel').showModal();
}
button('teacher').onclick = openTeacher;
button('teacherClose').onclick = () => dialog('teacherPanel').close();
button('saveSettings').onclick = () => {
  const field = input('teacherDuration');
  if (!field.reportValidity()) return;
  settings = { minutes: field.valueAsNumber, sound: input('teacherSound').checked };
  try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { saved = false; }

  dialog('teacherPanel').close();
};
function newSession() {
  if (!confirm('End this student session and clear the saved programs, progress, quizzes, and timers for both lessons?')) return;
  inLab = false;
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(lessonKey(5), JSON.stringify(defaultSave()));
    localStorage.setItem(lessonKey(6), JSON.stringify(defaultSave()));
    localStorage.removeItem(legacyKey);
  } catch { saved = false; }
  saves[5] = defaultSave();
  saves[6] = defaultSave();
  data = saves[lesson];
  current = 0;
  dialog('teacherPanel').close();
  welcome();
}
button('resetSession').onclick = newSession;
button('newSession').onclick = newSession;

function updateParts() {
  const panel = document.getElementById('partPanel');
  if (!panel) return;
  panel.innerHTML = `<div class="part-actions">${Object.entries(parts).map(([part, content]) => `<button type="button" data-part="${part}" aria-pressed="${selectedPart === part}">${record().inspected.includes(part as Part) ? '✓ ' : ''}${content[0]}</button>`).join('')}</div><p>${selectedPart ? parts[selectedPart][1] : 'Click a robot part or choose it here.'}</p>`;
  panel.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => partInfo(b.dataset.part as Part));
}
function partInfo(part: Part) {
  selectedPart = part;
  if (lesson === 5 && current === 0) {
    if (!record().inspected.includes(part)) record().inspected.push(part);
    if (!teaching) persist();
    updateParts();
    updateExperimentReady();
  } else report(parts[part][1]);
}

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const experimentIndex = () => record().experimentIndex ?? 0;
const legacyExperiment = () => lesson === 5 ? experiments[current]?.[experimentIndex()] : undefined;
const activityExperiments = () => lesson === 5 ? experiments[current] ?? [] : myExperiments[current] ?? [];
const activeExperiment = () => activityExperiments()[experimentIndex()];
const activityQuiz = () => current === 5 ? championship() : lesson === 5 ? comprehension[current] ?? [] : [];
function currentObservation() {
  return ((record().observations ??= [])[experimentIndex()] ??= {});
}
function quizKey(questions: LessonQuestion[]) {
  return '<ol>' + questions.map(q => `<li>${escape(q.question)} <strong>${escape(q.options[0])}</strong><p>${escape(q.explanation)}</p></li>`).join('') + '</ol>';
}
function renderMission() {
  get('missionMeta').textContent = 'Lesson ' + lesson + ' · ' + lessonTitles[lesson];
  get('missionTitle').textContent = activities()[current].title;
  const activity = activeExperiment();
  if (activity) renderExperiment(activity);
  else renderQuiz(activityQuiz());
  navigation();
}
type Instruction = { text: string; example?: string; category?: string; parts?: boolean };
function blockExample(step: Instruction) {
  if (!step.example) return '';
  return `<div class="block-example ${step.category?.toLowerCase().replace(' ', '-')}">${escape(step.example).replace(/\[([^\]]+)\]/g, '<b>$1</b>')}</div>`;
}
function comparisonSteps(comparison: { operator: string; threshold: number }): Instruction[] {
  return [
    { text: `Drag ${comparison.operator} from Operators into wait until.`, category: 'Operators', example: `[0] ${comparison.operator} [0]` },
    { text: 'Drag yaw angle from Sensors into the left side of the comparison.', category: 'Sensors', example: 'yaw angle' },
    { text: `Set the number on the right to ${comparison.threshold}.`, category: 'Operators', example: `yaw angle ${comparison.operator} [${comparison.threshold}]` },
  ];
}
function myInstructions(activity: MyExperiment) {
  const steps: Instruction[] = [];
  if (activity.title === 'Use a clearer name') steps.push({ text: 'Click the name on Define Forward and change it to ShortForward.', category: 'My Blocks', example: 'Define [ShortForward]' });
  function walk(first: Block, parent?: string) {
    for (let block: Block | undefined = first; block; block = block.next?.block) {
      const example = blockLabel(block);
      const type = block.type;
      let category = 'Movement';
      let text = '';
      if (type === 'procedures_defnoreturn') {
        category = 'My Blocks';
        text = `Choose Make a My Block and name it ${block.fields?.NAME} if it is missing.`;
      } else if (!parent) {
        category = 'Events';
        text = `Use ${example} as a separate stack.`;
      } else {
        if (type === 'procedures_callnoreturn') category = 'My Blocks';
        if (type === 'lab_until' || type === 'lab_repeat') category = 'Control';
        if (type === 'lab_zero') category = 'Sensors';
        text = `Use the pictured ${category} block ${parent.startsWith('repeat') || parent.startsWith('Define') ? 'inside' : 'below'} ${parent.replaceAll('[', '').replaceAll(']', '')}.`;
      }
      steps.push({ text, example, category });
      const test = block.inputs?.COND?.block;
      if (test) steps.push(...comparisonSteps({ operator: '=', threshold: Number(test.inputs?.RIGHT.shadow?.fields?.VALUE) }));
      const body = block.inputs?.STACK?.block ?? block.inputs?.DO?.block;
      if (body) walk(body, example);
      parent = example;
    }
  }
  activity.code.blocks.blocks.forEach(stack => walk(stack));
  return steps;
}
function renderExperiment(activity: Experiment | MyExperiment) {
  const index = experimentIndex();
  const level = record();
  const result = currentObservation();
  const legacy = 'steps' in activity;
  const build: Instruction[] = legacy ? activity.steps.flatMap((step, i) => {
    const attach = i ? 'the previous block' : 'When program starts';
    return [
      ...(i === 0 || activity.steps[i - 1].category !== step.category ?
        [{ text: `Open the ${step.category} category.`, category: step.category }] : []),
      { text: `Snap the pictured block below ${attach}.`, example: step.example, category: step.category },
      ...(step.comparison ? comparisonSteps(step.comparison) :
        step.example.includes('[') ? [{ text: step.instruction.split(/(?<=\.) (?=[A-Z])/)[0], example: step.example, category: step.category }] : []),
    ];
  }) : myInstructions(activity);
  if (legacy && index) build.unshift({ text: activity.edit });
  const steps: (Instruction & { stage: string })[] = [
    { stage: 'Predict', text: activity.predict },
    ...(legacy && current === 0 && index === 0 ? [{ stage: 'Build', text: 'Explore the four robot parts.', parts: true }] : []),
    ...build.map(step => ({ ...step, stage: 'Build' })),
    ...(!legacy && activity.debug ? activity.debug.map(text => ({ stage: 'Debug', text })) : []),
    { stage: 'Run', text: 'Press Run Robot.' },
    ...(!legacy ? activity.entry.slice(1).map(side => ({stage: 'Run', text: `When the robot is ready, press the ${side} hub button.`})) : []),
    { stage: 'Observe', text: activity.observe },
    { stage: 'Answer', text: activity.question },
  ];
  const stepNumber = Math.min(level.guideStep ?? 0, steps.length - 1);
  const step = steps[stepNumber];
  const field = step.stage === 'Predict' ? 'prediction' : step.stage === 'Answer' ? 'answer' : undefined;
  const answer = !legacy ? activity : lessonFiveAnswers[current][index];
  get('missionText').innerHTML = `
    ${teaching ? `<label for="experimentPreview">Experiment answer key</label><select id="experimentPreview">${activityExperiments().map((item, i) =>
      `<option value="${i}" ${i === index ? 'selected' : ''}>${escape(item.title)}</option>`).join('')}</select>` :
      `<p class="eyebrow">Experiment ${index + 1} of ${activityExperiments().length}</p>`}
    <h2>${escape(activity.title)}</h2>
    <div class="step-card">
      <p class="step-progress" tabindex="-1">Step ${stepNumber + 1} of ${steps.length} · ${step.stage}</p>
      <p>${escape(step.text)}</p>${blockExample(step)}
      ${step.parts ? '<div id="partPanel"></div>' : ''}
      ${field ? `<textarea id="studentResponse" aria-label="${step.stage}" rows="2" maxlength="400"></textarea>` : ''}
      ${step.stage === 'Observe' && result.result ? `<p>${escape(result.result)}</p>` : ''}
      <div class="step-actions"><button id="previousStep" type="button" ${stepNumber === 0 ? 'disabled' : ''}>Previous</button>
      <button id="nextStep" class="primary" type="button">${stepNumber < steps.length - 1 ? 'Next' : index + 1 < activityExperiments().length ? 'Next experiment' : 'Finish experiments'}</button></div>
    </div>
    <button id="showExample" type="button">${teaching ? 'Load answer program' : 'Show me how'}</button>
    <p id="experimentReady" aria-live="polite"></p>
    ${teaching ? `<details open><summary>Teacher answer</summary><dl><dt>Prediction and observation</dt><dd>${escape(answer.expected)}</dd><dt>Concept</dt><dd>${escape(answer.concept)}</dd><dt>Common mistake</dt><dd>${escape(answer.mistake)}</dd></dl></details>
      ${activityQuiz().length ? `<details><summary>Activity quiz answers</summary>${quizKey(activityQuiz())}</details>` : ''}` : ''}`;
  function go(n: number) {
    level.guideStep = n;
    if (!teaching) persist();
    renderExperiment(activity);
    get('missionText').querySelector<HTMLElement>('.step-progress')?.focus();
  }
  button('previousStep').onclick = () => go(stepNumber - 1);
  button('nextStep').onclick = () => {
    if (stepNumber < steps.length - 1) { go(stepNumber + 1); return; }
    level.experimentIndex = index + 1;
    level.guideStep = 0;
    delete level.runNote;
    if (!teaching) persist();
    if (activeExperiment() || activityQuiz().length) {
      renderMission();
      report(activeExperiment() ? 'Make your next prediction.' : 'Answer the questions about your experiments.');
    } else finishLesson();
  };
  button('showExample').onclick = () => loadExample(activity);
  if (field) {
    const response = get<HTMLTextAreaElement>('studentResponse');
    response.value = result[field] ?? '';
    response.oninput = () => { result[field] = response.value; if (!teaching) persist(); updateExperimentReady(); };
  }
  if (teaching) get<HTMLSelectElement>('experimentPreview').onchange = event => {
    level.experimentIndex = Number((event.target as HTMLSelectElement).value);
    level.guideStep = 0;
    renderMission();
  };
  updateParts();
  updateExperimentReady();
}
function loadExample(activity?: Experiment | MyExperiment) {
  const hasWork = workspace.getAllBlocks(false).some(block => block.type !== 'lab_start');
  if (hasWork && !confirm('Replace the blocks in this workspace with the example?')) return;
  if (lesson === 5 && current === 2 && sim.travel > 0.14) {
    arena?.clear(true);
    get('previousTrail').hidden = false;
  } else clearTrails();
  controller = undefined;
  sim.reset();
  updateHubButtons();
  record().code = activity && 'code' in activity ? activity.code :
    lesson === 6 ? myBlocksReference : exampleProgram(Math.min(current, 4), activity && 'steps' in activity ? activity.steps : undefined);
  loadCode();
  if (!teaching) persist();
  report('Example loaded. Press Run Robot to test it.');
  updateExperimentReady();
}
function updateExperimentReady() {
  const note = document.getElementById('experimentReady');
  if (!note || teaching) return;
  const next = button('nextStep');
  if (!next || next.textContent === 'Next') return;
  const result = currentObservation();
  const missingParts = lesson === 5 && current === 0 && experimentIndex() === 0 && record().inspected.length < 4;
  next.disabled = missingParts || !result.prediction?.trim() || !result.result || !result.answer?.trim();
  note.textContent = missingParts ? 'Explore all four robot parts in Build.' :
    !result.prediction?.trim() ? 'Write your prediction on the Predict step.' :
    !result.result ? legacyExperiment()?.goal ?? 'Run the program and try the buttons listed in Run.' :
    !result.answer?.trim() ? 'Write your answer using what you saw.' : '';
}
function finishLesson() {
  if (record().complete && current < 5) switchMission(current + 1);
  else if (record().complete) showSummary();
  else completeLevel();
}
function renderQuiz(questions: LessonQuestion[]) {
  const level = record();
  if (!questions.length) {
    get('missionText').innerHTML = '<p>All experiments are recorded.</p><button id="finishLesson" class="primary" type="button">Finish activity</button>';
    button('finishLesson').onclick = finishLesson;
    return;
  }
  if (level.questionOrder?.length !== questions.length) {
    level.questionAnswers = {};
    level.quizPassed = [];
    level.questionOrder = questions.map(({ options }) => {
      const order = options.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      return order;
    });
    if (!teaching) persist();
  }
  const i = Math.min(level.quizStep ?? 0, questions.length - 1);
  const q = questions[i];
  const answers = level.questionAnswers ??= {};
  const passed = level.quizPassed ??= level.complete ? questions.map((_, j) => j) : [];
  get('missionText').innerHTML = `
    <p class="step-progress">Question ${i + 1} of ${questions.length}</p>
    <form id="quizForm"><fieldset><legend>${escape(q.question)}</legend>
    ${level.questionOrder![i].map(j => `<label><input type="radio" name="answer" value="${j}" ${answers[i] === j ? 'checked' : ''} required> ${escape(q.options[j])}</label>`).join('')}
    </fieldset><p id="quizResult" class="quiz-note" role="status">${passed.includes(i) ? '✓ Correct' : ''}</p>
    <button type="submit" class="primary">Check answer</button></form>
    <div class="step-actions"><button id="quizBack" type="button" ${i === 0 ? 'disabled' : ''}>Previous</button>
    <button id="quizNext" type="button">${i < questions.length - 1 ? 'Next' : 'Finish quiz'}</button></div>
    ${current === 5 ? '<button id="showExample" type="button">Show reference program</button>' : ''}
    ${teaching ? `<details open><summary>Quiz answer key</summary>${quizKey(questions)}</details>` : ''}`;
  if (current === 5) button('showExample').onclick = () => loadExample();
  const form = get<HTMLFormElement>('quizForm');
  form.onchange = event => {
    answers[i] = Number((event.target as HTMLInputElement).value);
    if (passed.includes(i) && answers[i] !== 0) passed.splice(passed.indexOf(i), 1);
    get('quizResult').textContent = passed.includes(i) ? '✓ Correct' : '';
    if (!teaching) persist();
  };
  form.onsubmit = event => {
    event.preventDefault();
    level.attempts++;
    const correct = answers[i] === 0;
    if (correct && !passed.includes(i)) passed.push(i);
    get('quizResult').dataset.correct = String(correct);
    get('quizResult').textContent = correct ? '✓ Correct. ' + q.explanation : 'Try again. ' + q.explanation;
    if (!teaching) persist();
  };
  function go(n: number) { level.quizStep = n; if (!teaching) persist(); renderQuiz(questions); }
  button('quizBack').onclick = () => go(i - 1);
  button('quizNext').onclick = () => {
    if (i < questions.length - 1) go(i + 1);
    else if (passed.length === questions.length || teaching) finishLesson();
    else {
      go(questions.findIndex((_, j) => !passed.includes(j)));
      get('quizResult').textContent = 'Check an answer for each question to finish.';
    }
  };
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
  updateClock();
  report('You earned the ' + badges[current] + ' badge.', 'success');
  if (level.complete) return;
  level.complete = true;
  level.elapsed = Math.max(0, Date.now() - (level.started || Date.now()));
  level.best = Math.min(level.best ?? Infinity, level.elapsed);
  if (!teaching) persist();
  navigation();
  get('earnedIcon').textContent = levelIcons[current];
  get('earnedBadge').textContent = badges[current];
  get('earnedDetails').textContent = `+100 XP · Level time ${formatTime(level.elapsed)} · Personal best ${formatTime(level.best)}`;
  button('celebrateNext').textContent = current === 5 ? 'View results' : 'Next activity';
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
const referenceRuns = new WeakMap<MyExperiment, ReturnType<Simulator['sample']>>();
function matchesReference(activity: MyExperiment) {
  if (eventSequence.length !== activity.entry.length) return false;
  if (activity.title === 'Define Forward' && !controller?.unused.some(name => name.toLowerCase() === 'forward')) return false;
  if ((activity.title === 'Set up the base' || activity.code === myBlocksReference) &&
      !['ports', 'speed', 'calibrate'].every(kind => sim.history.some(({ command }) => command.kind === kind))) return false;
  let expected = referenceRuns.get(activity);
  if (!expected) {
    const source = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(activity.code, source);
      const program = compileMyBlocks(source);
      const reference = new Simulator();
      for (const entry of activity.entry) {
        reference.executeStream(program.run(entry));
        for (let tick = 0; tick < 15000 && reference.state === 'running'; tick++) reference.tick(1 / 60);
        if (reference.state !== 'done') return false;
      }
      expected = reference.sample();
      referenceRuns.set(activity, expected);
    } finally {
      source.dispose();
    }
  }
  const actual = sim.sample();
  return Math.hypot(actual.x - expected.x, actual.z - expected.z) < 1.5 &&
    Math.abs(actual.travel - expected.travel) < 1.5 && Math.abs(actual.angle - expected.angle) < 0.08 &&
    Math.abs(actual.left - expected.left) < 0.15 && Math.abs(actual.right - expected.right) < 0.15 &&
    sim.ports === 'A+E' && sim.speed === 50 && Math.abs(sim.circumference - 27.63) < 0.05;
}
function updateHubButtons() {
  const ready = !!controller && sim.state === 'done';
  button('hubLeft').disabled = !ready || !controller?.hasButton('left');
  button('hubRight').disabled = !ready || !controller?.hasButton('right');
}
function runButton(side: 'left' | 'right') {
  if (!controller?.hasButton(side) || sim.state !== 'done') return;
  eventSequence.push(side);
  sim.executeStream(controller.run(side));
  priorState = 'running';
  updateHubButtons();
  report('Running the ' + side + ' button stack.', 'running');
}
button('hubLeft').onclick = () => runButton('left');
button('hubRight').onclick = () => runButton('right');
function finishRun(stopped = false) {
  updateHubButtons();
  updateClock();
  const moved = Math.abs(sim.wheelLeft) + Math.abs(sim.wheelRight) > 0.0001;
  const observation = moved
    ? `The robot traveled ${sim.travel.toFixed(1)} cm and finished at yaw ${sim.yaw.toFixed(1)}°. The wheels are stopped.`
    : 'The robot stayed at the start.';
  const settingsOnly = sim.history.length > 0 && sim.history.every(entry => ['ports', 'speed', 'calibrate'].includes(entry.command.kind));
  const setupNote = settingsOnly ? ` Current settings: ${sim.ports}, ${sim.speed}%, ${sim.circumference} cm per rotation.` : '';
  const offset = START.z - sim.pose.z;
  let positionNote = '';
  if (current === 1 && moved) {
    positionNote = Math.hypot(sim.pose.x - START.x, offset) < 0.05 ? 'Final position: back at the start.' :
      `Final position: ${Math.abs(offset).toFixed(1)} cm ${offset >= 0 ? 'ahead of' : 'behind'} the start line.`;
  }
  const activity = activeExperiment();
  const unused = controller?.unused;
  const hubNote = sim.state === 'done' && controller && (controller.hasButton('left') || controller.hasButton('right')) ? 'Connected hub buttons are ready.' : '';
  const message = [stopped ? 'You stopped the program.' : sim.message, observation + setupNote, positionNote,
    unused?.length ? `Defined but never called: ${unused.join(', ')}. Add a call from a start or button stack.` : '', hubNote,
    'Simulated run time: ' + sim.time.toFixed(2) + ' s.'].filter(Boolean).join(' ');
  if (activity) {
    record().runNote = message;
    const result = currentObservation();
    const matches = 'check' in activity ? activity.check(sim) : sim.state === 'done' &&
      activity.entry.every((entry, i) => eventSequence[i] === entry) && matchesReference(activity);
    if (!stopped && matches) result.result = message;
    const guidance = result.result ? '' : 'check' in activity ? ' Try this goal: ' + activity.goal :
      ' Use the Build and Run steps to check the program.';
    if (!teaching) persist();
    updateExperimentReady();
    report(message + guidance, stopped ? 'stopped' : sim.state === 'error' && !result.result ? 'retry' : 'observed');
    return;
  }
  report(message, stopped ? 'stopped' : sim.state === 'error' ? 'retry' : 'observed');
}
function startRun(step: boolean) {
  const keepPrevious = lesson === 5 && current === 2;
  if (keepPrevious && arena && sim.travel > 0.14) get('previousTrail').hidden = false;
  sim.reset();
  controller = undefined;
  eventSequence = ['start'];
  updateHubButtons();
  arena?.clear(keepPrevious);
  record().attempts++;
  saveCode();
  try {
    if (lesson === 6) {
      controller = compileMyBlocks(workspace);
      sim.executeStream(controller.run('start'));
    } else sim.start(compile(workspace, { runUntilUnfinishedBlock: true }));
    priorState = 'running';
    if (step) sim.step();
    report('Watch the highlighted block and the arena.', 'running');
    updateExperimentReady();
  } catch (error) {
    report(error instanceof Error ? error.message : 'Check your block connections.', 'retry');
  }
}

button('run').onclick = () => startRun(false);
button('step').onclick = () => {
  if (sim.state === 'paused' || sim.state === 'running') sim.step();
  else startRun(true);
};
button('pause').onclick = () => {
  sim.pause();
  if (sim.state === 'paused') report('Resume or step through the program.', 'paused');
  if (sim.state === 'running') report('Watch the highlighted block.', 'running');
};
button('stop').onclick = () => {
  controller = undefined;
  sim.stop();
  finishRun(true);
};
button('resetRobot').onclick = () => {
  controller = undefined;
  sim.reset();
  updateHubButtons();
  clearTrails();
  report('Robot returned to the start.');
  updateExperimentReady();
};
button('resetMission').onclick = () => {
  if (!confirm('Reset this level’s program and progress? Your personal best stays saved.')) return;
  const best = record().best;
  session().missions[current] = { ...fresh(), best };
  openLab(current);
};

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
      button('stop').disabled = button('pause').disabled && !(controller && sim.state === 'done');
      button('run').disabled = sim.state === 'running' || sim.state === 'paused';
      if (sim.state !== priorState && (sim.state === 'done' || sim.state === 'error')) finishRun();
      priorState = sim.state;
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
setInterval(updateClock, 300);
if (data.screen === 'lab' && data.student && data.robot) {
  openLab(data.current);
  if (data.away) { remind(returnReminder()); data.away = false; persist(); }
} else welcome();
requestAnimationFrame(frame);

