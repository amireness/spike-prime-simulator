import { START, type Record, type Sample, type Simulator } from './simulator.ts';

export const missions = [
  {
    title: 'Robot Configuration', minutes: 8, focus: 'Hardware & setup',
    objective: 'Explore four robot parts and compare three speeds.',
    tasks: ['Click the hub, motors, wheels and yaw sensor in the arena.', 'Use the robot specs to configure the drive, then run your program.'],
    experiment: 'Look at the two drive wheels. Which parts let them move independently?',
    hints: ['Which two ports lead to the wheels?', 'Explore the Movement category for setup controls.', 'Check the units on the speed and distance calibration settings.'],
    extension: 'Explain what would happen if a drive motor were plugged into the wrong port.',
  },
  {
    title: 'Distance Challenge', minutes: 8, focus: 'Straight-line motion',
    objective: 'Try different distances and park on the orange target.',
    tasks: ['Predict where the robot will finish and which way it will face.', 'Run your test and compare the trail and starting marker.'],
    experiment: 'How does changing speed affect travel time and the final position?',
    hints: ['How much distance cancels a 20 cm trip forward?', 'Look in Control for timing and Movement for distance.', 'Check the direction and unit on each straight move.'],
    extension: 'Try reaching and returning from the target at half speed.',
  },
  {
    title: 'Steering', minutes: 10, focus: 'Steering',
    objective: 'Drive with steering −40 for 20 wheel rotations.',
    tasks: ['Use the trail to compare straight, left, and right steering.', 'Run a final test with the target steering and rotation count.'],
    experiment: 'Try the same number of rotations at +40 and −40. Compare the shapes.',
    hints: ['What might happen if one wheel moves slower than the other?', 'Explore the Movement category for steering controls.', 'Use the move with steering block and check the sign of your setting.'],
    extension: 'Find a steering setting that makes the tightest curve without spinning in place.',
  },
  {
    title: 'Yaw Sensor', minutes: 12, focus: 'Sensor feedback',
    objective: 'Use yaw to control a right turn past 90°, then a left turn below 0°.',
    tasks: ['Make the current direction your zero reference.', 'Stop at each goal. Watch the live yaw reading during both turns.'],
    experiment: 'Change the speed and see how it affects the moment the robot stops.',
    hints: ['Which direction makes the yaw reading increase?', 'Explore Sensors and Operators for measuring and comparing yaw.', 'Put a comparison inside wait until and watch the active block and yaw as the robot turns.'],
    extension: 'Make a sensor-controlled turn that stops just past 45°.',
  },
  {
    title: 'Ultimate Robot Test', minutes: 12, focus: 'Full systems check',
    objective: 'Build the full test, change three settings, and repair two bugs.',
    tasks: ['The drive uses ports A and E, 50% speed, and 27.63 cm per rotation.', 'The robot waits one second, reaches the 20 cm marker, and returns to its start.', 'The robot traces the left curve from mission 3.', 'The robot sets a new heading reference, then uses yaw to stop beyond 90° on the right and below 0° on the way left.'],
    experiment: 'Pause at a checkpoint or use Step to inspect what the robot does next.',
    hints: ['Which checkpoints can you verify by looking at the trail?', 'Revisit Movement, Control, and Sensors as you debug each checkpoint.', 'Step through your program and check distance or yaw when the active block changes.'],
    extension: 'Try your test at a different speed after completing it. Compare the final headings.',
  },
  {
    title: 'Championship Quiz', minutes: 10, focus: 'Reflect & explain',
    objective: 'Explain your design decisions and demonstrate what you learned.',
    tasks: ['Why do we configure two movement motors?', 'What happens when we change steering?', 'Why is a yaw sensor useful?', 'Why might turning by sensor readings be more reliable than turning for a fixed number of seconds?', 'How would you improve this driving base?'],
    experiment: 'Share one improvement with a partner and explain how you would test it.',
    hints: ['Think about what each wheel must do during a turn.', 'Review the Sensors category and the yaw reading in the arena.', 'Compare your yaw-controlled run at two speeds. What changed, and what stayed close?'],
    extension: 'Draw one attachment and describe how you would mount and test it.',
  },
];

export const parts = {
  hub: ['Hub', 'The hub runs your program and connects to the motors.'],
  motors: ['Drive motors', 'The motors on ports A and E power the left and right wheels.'],
  wheels: ['Drive wheels', 'One full wheel turn moves the robot about 27.63 cm on a straight path.'],
  yaw: ['Yaw sensor', 'Inside the hub, the gyro tracks heading. Right turns increase yaw.'],
};
export type Part = keyof typeof parts;

const close = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;
const at = (point: Sample, x: number, z: number) => Math.hypot(point.x - x, point.z - z) <= 1.5;
const still = (record: Record) => close(record.before.left, record.after.left, 0.001) && close(record.before.right, record.after.right, 0.001);
const forward = (r: Record) => r.after.left > r.before.left && close(r.after.left - r.before.left, r.after.right - r.before.right, 0.001);
const reverse = (r: Record) => r.after.left < r.before.left && close(r.after.left - r.before.left, r.after.right - r.before.right, 0.001);

function outAndBack(records: Record[]) {
  const firstMotion = records.findIndex(r => !still(r));
  if (firstMotion < 0) return { delay: false, target: false, back: 0 };
  const delay = close(records[firstMotion].before.time, 1, 0.15);
  let i = firstMotion;
  while (i < records.length && (forward(records[i]) || still(records[i]))) i++;
  const target = i > firstMotion && at(records[i - 1].after, START.x, START.z - 20);
  const reverseStart = i;
  while (i < records.length && (reverse(records[i]) || still(records[i]))) i++;
  return { delay, target, back: i > reverseStart && at(records[i - 1].after, START.x, START.z) ? i : 0 };
}

function curveProgress(records: Record[]) {
  let left = 0, right = 0, moved = false;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (still(r)) continue;
    const l = r.after.left - r.before.left, rr = r.after.right - r.before.right;
    if (rr <= 0 || !close(l / rr, 0.2, 0.025)) return { steering: false, end: 0 };
    moved = true;
    left += l;
    right += rr;
    if (moved && close(left, 4, 0.09) && close(right, 20, 0.1)) return { steering: true, end: i + 1 };
  }
  return { steering: moved, end: 0 };
}

function yawPass(records: Record[]) {
  const zero = records.findIndex(r => r.command.kind === 'zero');
  const result = { zero: zero >= 0 && records.slice(0, zero).every(still), right: false, left: false };
  if (!result.zero) return result;
  const turns = records.slice(zero + 1);
  const right = turns.findIndex(r => r.sensor && r.before.yaw >= -1 && r.before.yaw <= 90 && r.after.yaw > 90 && r.after.yaw <= 105 &&
    r.after.left > r.before.left && r.after.right < r.before.right && Math.hypot(r.after.x - r.before.x, r.after.z - r.before.z) < 1.5);
  if (right < 0) return result;
  const rightStop = turns.findIndex((r, i) => i > right && r.command.kind === 'stop');
  if (rightStop < 0 || turns.slice(right + 1, rightStop).some(r => !still(r) || r.command.kind === 'drive' || r.command.kind === 'zero')) return result;
  result.right = true;
  const left = turns.findIndex((r, i) => i > rightStop && r.sensor && r.before.yaw > 0 && r.after.yaw < 0 && r.after.yaw >= -15 &&
    r.after.left < r.before.left && r.after.right > r.before.right && Math.hypot(r.after.x - r.before.x, r.after.z - r.before.z) < 1.5);
  if (left < 0 || turns.slice(rightStop + 1, left).some(r => r.command.kind === 'zero')) return result;
  const finalStop = turns.findIndex((r, i) => i > left && r.command.kind === 'stop');
  result.left = finalStop > left && turns.slice(left + 1).every(r => still(r) && r.command.kind !== 'zero');
  return result;
}

function setup(records: Record[]) {
  let ports = '', speed = 0, calibration = 0;
  for (const { command } of records) {
    if (command.kind === 'ports') ports = command.value;
    if (command.kind === 'speed') speed = command.value;
    if (command.kind === 'calibrate') calibration = command.value;
  }
  return [ports === 'A+E', speed === 50, close(calibration, 27.63, 0.05)];
}


const setupLabels = ['Select both drive motors', 'Set the testing speed', 'Calibrate one wheel rotation'];
const setupFeedback = ['Check the selected motor ports.', 'Robot speed needs adjustment.', 'Distance calibration needs adjustment.'];
const tripLabels = ['Wait one second', 'Reach the 20 cm target', 'Reverse back to the start'];
const tripFeedback = ['Check how long the robot waits before moving.', 'Check the distance and units for the outward trip.', 'Check where the robot stops after reversing.'];
const curveLabels = ['Steer left at ?40', 'Travel 20 wheel rotations'];
const curveFeedback = ['Check the sign and size of the steering value.', 'Check the difference between distance and rotations.'];
const yawLabels = ['Set a new zero heading', 'Use yaw to stop just past 90? right', 'Use yaw to stop just below 0? left'];
const yawFeedback = ['Check the heading reference before you turn.', 'Watch the yaw reading when the right turn stops.', 'Watch the yaw reading when the left turn stops.'];

export const objectives = [
  ['Explore all four robot parts', ...setupLabels], tripLabels, curveLabels, yawLabels,
  [...setupLabels, ...tripLabels, ...curveLabels, ...yawLabels],
  ['Explain why the base uses two motors', 'Identify what makes the robot turn', 'Explain what yaw measures', 'Explain why sensor-based turns help'],
];

export type ObjectiveCheck = { passed: boolean; feedback: string };

export function checkObjectives(mission: number, sim: Simulator, inspected: number): ObjectiveCheck[] {
  const records = sim.history;
  const checks = (values: boolean[], messages: string[]) => values.map((passed, i) => ({ passed, feedback: messages[i] }));
  const first = records.findIndex(r => !still(r));
  if (mission === 0) return checks([inspected >= 4, ...setup(records)], ['Explore the hub, motors, wheels, and yaw sensor.', ...setupFeedback]);
  const trip = outAndBack(records);
  const tripChecks = checks([trip.delay, trip.target, !!trip.back && (mission !== 1 || at(sim.sample(), START.x, START.z))], tripFeedback);
  if (mission === 1) return tripChecks;
  const curveRecords = mission === 4 ? records.slice(trip.back || records.length) : records;
  const curve = curveProgress(curveRecords);
  const curveValid = !!curve.end && (mission !== 2 || curveRecords.slice(curve.end).every(still));
  const curveChecks = checks([curve.steering, curveValid], curveFeedback);
  if (mission === 2) return curveChecks;
  const yaw = yawPass(mission === 4 ? curveRecords.slice(curve.end || curveRecords.length) : records);
  const yawChecks = checks([yaw.zero, yaw.right, yaw.left], yawFeedback);
  if (mission === 3) return yawChecks;
  if (mission === 4) return [
    ...checks(setup(first < 0 ? records : records.slice(0, first)), setupFeedback),
    ...tripChecks, ...curveChecks, ...yawChecks,
  ];
  return [];
}

export function validate(mission: number, sim: Simulator, inspected: number): { ok: boolean; message: string } {
  if (sim.state !== 'done') return { ok: false, message: sim.message || 'Finish the run to check this level.' };
  if (mission === 5) return { ok: false, message: 'Use the quiz to complete this level.' };
  const missing = checkObjectives(mission, sim, inspected).find(check => !check.passed);
  return missing ? { ok: false, message: missing.feedback } : { ok: true, message: 'Your robot met every objective.' };
}

export const quiz = [
  { question: 'Why use two drive motors?', options: ['To control both drive wheels independently', 'To make the hub brighter', 'To increase the wheel size'], answer: 0 },
  { question: 'What makes the robot turn?', options: ['Both wheels moving together at the same speed', 'A difference in how the left and right wheels move', 'Changing the grid spacing'], answer: 1 },
  { question: 'What does yaw measure after a reset?', options: ['The total distance traveled', 'How fast the battery is charging', 'How far the robot has turned from its new reference'], answer: 2 },
  { question: 'Why stop a turn using yaw?', options: ['It checks the actual heading even if the turning speed changes', 'It makes every turn take the same time', 'It guarantees the wheels never slip'], answer: 0 },
];

