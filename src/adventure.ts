export const badges = ['Hardware Hero', 'Base Navigator', 'Curve Pilot', 'Yaw Master', 'Test Engineer', 'Robotics Champion'];
export const levelIcons = ['⚡', '⌂', '↶', '◎', '◆', '★'];
export const predictions = [
  'If only one wheel spins, which way might the robot turn?',
  'After driving forward and back the same distance, where will the robot face?',
  'Before you run, predict how the trail will change if you switch −40 to +40.',
  'If you slow down the turn, what should happen to the heading where it stops?',
  'Which checkpoint do you think would be hardest to repeat at a different speed?',
  'If the wheels turn at different speeds, what happens to the robot’s path?',
];
export const bonuses = [
  'Run a new test with the drive set to 25% speed and move 10 cm forward.',
  'Precision parking. Use a slower speed to stop within 0.5 cm of the 20 cm target.',
  'Draw a custom S-shaped trail with a left curve followed by a right curve.',
  'Use yaw to stop an in-place right turn just past 45°.',
  'Try the full test at a different speed. Compare the final heading with your first run.',
  'Sketch an attachment and describe how you would test it with this base.',
];
export const tutorial = [
  ['Find a block', 'Open the orange Control category.', 'toolbox'],
  ['Drag a block', 'Drag a wait block into the workspace. Drop it in an empty spot.', 'toolbox'],
  ['Connect it', 'Snap the wait block directly below When program starts.', 'workspace'],
  ['Change a number', 'Click the number on your wait block. Set it to 2 seconds and press Enter.', 'workspace'],
  ['Run your robot', 'Press Run Robot. Watch the wait block light up while it runs.', 'run'],
  ['Reset your robot', 'Press Reset Robot to bring it back to the start.', 'resetRobot'],
  ['Read your result', 'The green check means you met the practice goal. Select it to start Level 1.', 'tutorialDone'],
];

export type Clock = { startedAt: number; durationMs: number; finishedAt?: number };
export const deadline = (clock: Clock) => clock.startedAt + clock.durationMs;
export function remaining(clock: Clock, now: number) {
  return Math.max(0, deadline(clock) - (clock.finishedAt ?? now));
}
export function finishClock(clock: Clock, now: number) {
  return { ...clock, finishedAt: clock.finishedAt ?? Math.min(deadline(clock), now) };
}
export function formatTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
export const totalXP = (levels: { complete: boolean; bonus?: boolean; improved?: boolean }[]) =>
  levels.reduce((xp, level) => xp + (level.complete ? 100 : 0) + (level.bonus ? 25 : 0) + (level.improved ? 15 : 0), 0);

const traces = [
  [[30, 44], [65, 44], [100, 44], [135, 44]],
  [[36, 58], [68, 58], [100, 58], [132, 58], [110, 58], [74, 58], [36, 58]],
  Array.from({ length: 55 }, (_, i) => [90 + 34 * Math.sin(i * 0.18), 43 + 28 * Math.cos(i * 0.18)]),
  [[68, 70], [57, 59], [53, 45], [57, 33], [68, 23], [82, 19], [96, 23], [105, 33], [96, 23], [82, 19], [68, 23], [57, 33]],
  [[28, 58], [55, 58], [82, 58], [55, 58], [28, 58], [46, 44], [67, 32], [90, 23], [110, 27], [118, 40], [105, 48], [91, 44], [84, 32], [94, 20], [109, 17], [130, 22]],
  [[30, 51], [60, 51], [90, 51], [122, 51]],
];
const cues = ['Hub · Motors · Wheels · Yaw', 'Start → Target → Start', 'Follow a left curve', '0° → Past 90° → Below 0°', 'Out and back → Curve → Turns', 'Explain your robot to a judge'];

export function drawDemo(canvas: HTMLCanvasElement, level: number, progress: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 165, 96);
  ctx.fillStyle = '#edf3ff';
  ctx.fillRect(0, 0, 165, 96);
  ctx.strokeStyle = '#dbe5fa';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 8; x < 165; x += 12) { ctx.moveTo(x, 0); ctx.lineTo(x, 78); }
  for (let y = 6; y < 78; y += 12) { ctx.moveTo(0, y); ctx.lineTo(165, y); }
  ctx.stroke();
  const path = traces[level];
  const position = progress * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(position));
  const [x, y] = path[index], [nx, ny] = path[index + 1];
  const point = [x + (nx - x) * (position - index), y + (ny - y) * (position - index)];
  ctx.strokeStyle = '#677ee2';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  path.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [i, [px, py]] of path.entries()) {
    if (i !== 0 && i !== path.length - 1 && !(level === 1 && i === 3)) continue;
    ctx.fillStyle = i ? '#ffad35' : '#3aca9d';
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(level === 3 ? 80 : point[0], level === 3 ? 48 : point[1]);
  ctx.rotate(level === 3 ? Math.atan2(point[1] - 48, point[0] - 80) : Math.atan2(ny - y, nx - x));
  ctx.fillStyle = '#20355f';
  ctx.fillRect(-8, -9, 13, 4); ctx.fillRect(-8, 5, 13, 4);
  ctx.fillStyle = '#ffd24d'; ctx.fillRect(-8, -5, 13, 10);
  ctx.fillStyle = '#f765a6'; ctx.fillRect(4, -4, 4, 8);
  ctx.restore();
  ctx.fillStyle = '#263b69';
  ctx.font = 'bold 9.5px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(cues[level], 82.5, 88);
}
