import { guides, type Step } from './guides.ts';
import { START, type Simulator } from './simulator.ts';
import { validate } from './missions.ts';

export type Experiment = {
  title: string; steps: Step[]; edit: string; predict: string; observe: string; question: string;
  goal: string; check: (sim: Simulator) => boolean;
};
export type LessonQuestion = { question: string; options: string[]; explanation: string };
const movement = 'Movement';
const near = (a: number, b: number, tolerance = 0.6) => Math.abs(a - b) <= tolerance;
const move = (distance: number, backward = false): Step => ({
  category: movement, example: `move [${backward ? 'backward' : 'forward'}] for [${distance}] [cm]`,
  instruction: `Choose ${backward ? 'backward' : 'forward'}, enter ${distance}, and select cm.`,
  block: { type: 'lab_move', fields: { DIR: backward ? '-1' : '1', AMOUNT: distance, UNIT: 'cm' } },
});
const speed = (value: number): Step => ({
  category: movement, example: `set movement speed to [${value}] %`, instruction: `Set the speed to ${value}%.`,
  block: { type: 'lab_speed', fields: { VALUE: value } },
});
const wait = (seconds: number): Step => ({
  category: 'Control', example: `wait [${seconds}] seconds`, instruction: `Type ${seconds} in the seconds box.`,
  block: { type: 'lab_wait', fields: { VALUE: seconds } },
});
const curve = (steering: number, rotations = 2): Step => ({
  category: movement, example: `move with steering [${steering}] for [${rotations}] rotations`,
  instruction: `Set steering to ${steering} and rotations to ${rotations}.`,
  block: { type: 'lab_curve', fields: { STEER: steering, AMOUNT: rotations } },
});
const turns = (degrees: number, motorSpeed = 50, timed = false): Step[] => {
  const right = degrees > 0;
  const [zero, startRight, waitRight, stop, startLeft, waitLeft] = guides[3].steps;
  const compare = right ? '>' : '<';
  const gate: Step = {
    ...(right ? waitRight : waitLeft), comparison: { operator: compare, threshold: degrees },
    block: { type: 'lab_until', inputs: { COND: { block: { type: right ? 'lab_gt' : 'lab_lt', inputs: {
      LEFT: { block: { type: 'lab_yaw' } }, RIGHT: { shadow: { type: 'lab_number', fields: { VALUE: degrees } } },
    } } } } },
  };
  return [speed(motorSpeed), zero, right ? startRight : startLeft, timed ? wait(0.4) : gate, { ...stop, instruction: 'Stop both motors when the wait ends.' }];
};
const completed = (sim: Simulator) => sim.state === 'done';
const hasSpeed = (sim: Simulator, value: number) => sim.history.some(({ command }) => command.kind === 'speed' && command.value === value);
const moveAtSpeed = (sim: Simulator, value: number, distance: number) => {
  let motorSpeed = 50;
  return sim.history.some(({ command, before, after }) => {
    if (command.kind === 'speed') motorSpeed = command.value;
    return motorSpeed === value && near(after.travel - before.travel, distance) && before.z > after.z && near(after.x, before.x);
  });
};
const reach = (sim: Simulator, distance: number) => near(sim.pose.x, START.x) && near(START.z - sim.pose.z, distance);

const configuration: Experiment[] = [25, 50, 100].map((value, i) => ({
  title: `Drive at ${value}% speed`, steps: [guides[0].steps[0], speed(value), guides[0].steps[2], move(20)],
  edit: i ? `Change the number in set movement speed to ${value}. Leave the move at 20 cm.` : 'Explore the four parts first. Build the setup stack, then add a 20 cm move.',
  predict: `Will a 20 cm drive at ${value}% reach the orange target? How fast do you think it will get there?`,
  observe: 'Watch the wheel speeds and note the time shown in the run result. Check where the robot stops.',
  question: i ? 'Compare this run with the last one. What changed, and what stayed the same?' : 'How long did the trip take? Where did the robot stop?',
  goal: `Run a straight 20 cm drive with the speed set to ${value}%.`,
  check: sim => completed(sim) && sim.ports === 'A+E' && near(sim.circumference, 27.63, 0.05) &&
    sim.history.some(({ command }) => command.kind === 'ports' && command.value === 'A+E') &&
    sim.history.some(({ command }) => command.kind === 'calibrate' && near(command.value, 27.63, 0.05)) &&
    hasSpeed(sim, value) && moveAtSpeed(sim, value, 20) && reach(sim, 20),
}));
const distance: Experiment[] = [[20, 20], [10, 10], [30, 30], [30, 10], [20, 0]].map(([out, back], i) => {
  const parking = i === 4;
  return {
    title: parking ? 'Precision parking' : `Out ${out} cm, back ${back} cm`,
    steps: parking ? [speed(25), move(out)] : [wait(1), move(out), move(back, true)],
    edit: parking ? 'Remove the backward block. Add a Movement speed block set to 25%, then park on the orange target.' :
      `Set the forward block to ${out} cm and the backward block to ${back} cm. Keep the 1-second wait.`,
    predict: parking ? 'Where should the center of the robot stop to park accurately?' : 'Where will the robot stop? Will it be at the start, ahead of it, or behind it?',
    observe: parking ? 'Use Top to compare the center of the robot with the orange target.' : 'Watch where the robot turns back and where it ends. Check the orange target and blue start zone.',
    question: parking ? 'What settings helped you park on the orange target?' : 'How far ahead of the start did the robot finish? How do you know?',
    goal: parking ? 'Park within 0.5 cm of the orange target.' : `Drive forward ${out} cm and backward ${back} cm in the same run.`,
    check: sim => completed(sim) && reach(sim, out - back) && (parking
      ? Math.hypot(sim.pose.x - START.x, sim.pose.z - (START.z - 20)) <= 0.5
      : near(sim.travel, out + back) && sim.history.some(({ after }) => near(START.z - after.z, out))),
  };
});
const steering: Experiment[] = [0, 25, -25, 50, -50, 100, -100].map(value => ({
  title: `Steering ${value}`, steps: [curve(value)],
  edit: `Enter ${value} in the steering box. Keep the rotation count at 2 so you can compare runs.`,
  predict: 'Will the robot go straight, curve left, curve right, or spin in place? Which way?',
  observe: 'Use Top to see the green trail. The purple trail shows the last run that left a path. For a spin, watch yaw and the wheels.',
  question: 'What path did the robot make? What do you think each wheel was doing?',
  goal: `Run a steering move at ${value} for 2 rotations.`,
  check: sim => completed(sim) && sim.history.some(({ command, before, after }) =>
    command.kind === 'move' && command.steering === value && near(Math.max(Math.abs(after.left - before.left), Math.abs(after.right - before.right)), 2, 0.05)),
}));
const yawRuns: Experiment[] = [[45, 50, 0], [90, 50, 0], [135, 50, 0], [-90, 50, 0], [90, 50, 1], [90, 25, 1], [90, 25, 0]].map(([degrees, value, timing]) => ({
  title: timing ? `Timed turn at ${value}%` : `Turn ${Math.abs(degrees)}° ${degrees < 0 ? 'left' : 'right'}${value === 25 ? ' at 25%' : ''}`,
  steps: turns(degrees, value, !!timing),
  edit: timing ? `Set speed to ${value}%. Use a plain wait of 0.4 seconds between start moving and stop moving.` :
    `Set speed to ${value}%, steering to ${degrees < 0 ? '-100' : '100'}, and wait until yaw ${degrees < 0 ? '<' : '>'} ${degrees}.`,
  predict: timing ? 'Where will the robot point after 0.4 seconds at this speed?' : 'Which way will the robot turn? What yaw number should it stop near?',
  observe: 'Watch the heading arrow, the yaw number, and the motor speeds at the stop.',
  question: timing ? 'What was the final yaw? How did speed affect the result of the timed turn?' : 'What final yaw did you see? How close was it to the target?',
  goal: timing ? `Run a turn at ${value}% with a 0.4-second wait.` : `Use yaw to stop just past ${degrees}° at ${value}% speed.`,
  check: sim => completed(sim) && hasSpeed(sim, value) && Math.abs(sim.yaw) > 5 && (timing
    ? sim.history.some(({ command, before, after }) => command.kind === 'wait' && near(command.value, 0.4, 0.001) && after.yaw > before.yaw)
    : (degrees < 0 ? sim.yaw < degrees : sim.yaw > degrees) && near(sim.yaw, degrees, 8) && sim.history.some(entry => entry.sensor)),
}));
const official = guides[4].steps;
const replace = (index: number, step: Step) => official.map((original, i) => i === index ? step : original);
const finalRuns: Experiment[] = [
  { title: 'Build the official program', steps: official, edit: 'Build every block in order, or use Show me how to check your stack.',
    predict: 'List the big moves you expect to see in order.', observe: 'Watch the delay, the trip out and back, the left curve, then the two yaw-controlled turns.',
    question: 'Name three things you saw the robot do, in order.', goal: 'Run the trip out and back, the left curve, and both yaw-controlled turns.',
    check: sim => validate(4, sim, 0).ok },
  { title: 'Change the speed', steps: replace(1, speed(75)), edit: 'In the full test, change speed from 50% to 75%. Leave the other blocks alone.',
    predict: 'Will the route change, or will the same moves take a different amount of time?', observe: 'Compare the route and run time with the official test.',
    question: 'What changed at 75% speed? What stayed about the same?', goal: 'Run the full test at 75%.',
    check: sim => completed(sim) && moveAtSpeed(sim, 75, 20) && sim.travel > 350 && sim.history.filter(entry => entry.sensor).length === 2 },
  { title: 'Change the opening wait', steps: replace(3, wait(2)), edit: 'Return speed to 50%. Change only the opening wait from 1 to 2 seconds.',
    predict: 'Which part of the run will take longer?', observe: 'Watch how long the robot waits before the first move.',
    question: 'Did the opening delay change any of the driving distances?', goal: 'Run the full test with a 2-second opening pause.',
    check: sim => completed(sim) && sim.history.some(({ command, before }) => command.kind === 'wait' && near(command.value, 2, 0.01) && before.travel === 0) && sim.travel > 350 && sim.history.filter(entry => entry.sensor).length === 2 },
  { title: 'Change the curve', steps: replace(6, curve(-25, 20)), edit: 'Return the wait to 1 second. Change steering on the 20-rotation move from -40 to -25.',
    predict: 'Will the left curve get tighter or wider?', observe: 'Compare the curve with the official run.',
    question: 'What happened to the shape of the curve?', goal: 'Run the full test with the 20-rotation curve set to -25.',
    check: sim => completed(sim) && sim.history.some(({ command }) => command.kind === 'move' && command.steering === -25 && command.amount === 20) && sim.history.filter(entry => entry.sensor).length === 2 },
  { title: 'Debug 1 · Find the motor problem', steps: [{ ...guides[0].steps[0], example: 'set movement motors to [A + B]', instruction: 'Leave A + B for this diagnostic run.', block: { type: 'lab_ports', fields: { VALUE: 'A+B' } } }, move(20)],
    edit: 'Load or build this short broken program. Leave the suspicious motor setting in place for one run.',
    predict: 'What will the robot do with these two ports selected?', observe: 'Watch the robot and read the run feedback.',
    question: 'Which setting caused the drive to fail?', goal: 'Run the broken test with ports A + B so you can see the fault.',
    check: sim => sim.state === 'error' && sim.ports === 'A+B' && sim.program[sim.index]?.kind === 'move' },
  { title: 'Debug 1 · Fix the motor problem', steps: [guides[0].steps[0], move(20)], edit: 'Switch the port menu from A + B to A + E.',
    predict: 'What should happen after you fix the ports?', observe: 'Watch the robot travel to the target.',
    question: 'How did your repair change the run?', goal: 'Drive 20 cm with A + E selected.',
    check: sim => completed(sim) && sim.ports === 'A+E' && reach(sim, 20) },
  { title: 'Debug 2 · Find the comparison problem', steps: turns(90).map((step, i) => i === 3 ? {
      ...step, comparison: { operator: '<', threshold: 90 }, block: { type: 'lab_until', inputs: { COND: { block: { type: 'lab_lt', inputs: {
        LEFT: { block: { type: 'lab_yaw' } }, RIGHT: { shadow: { type: 'lab_number', fields: { VALUE: 90 } } },
      } } } } },
    } : step),
    edit: 'Load or build this short broken program. Keep the less-than sign while testing.',
    predict: 'Is yaw already less than 90 at the start?', observe: 'See how much the robot turns before it stops.',
    question: 'Why did the wait end immediately?', goal: 'Run the test that checks yaw < 90 during a right turn.',
    check: sim => completed(sim) && Math.abs(sim.yaw) < 5 && sim.history.some(({ command }) => command.kind === 'until' && command.condition.op === 'lt') },
  { title: 'Debug 2 · Fix the comparison', steps: turns(90), edit: 'Replace the < comparison with > from Operators. Put yaw on the left and 90 on the right.',
    predict: 'When will the new comparison turn true?', observe: 'Look for a right turn that stops just beyond 90°.',
    question: 'How did changing one sign fix the turn?', goal: 'Use the yaw reading to stop just past 90°.',
    check: sim => completed(sim) && sim.yaw > 90 && sim.yaw < 98 && sim.history.some(entry => entry.sensor) },
];
export const experiments = [configuration, distance, steering, yawRuns, finalRuns];

export const comprehension: LessonQuestion[][] = [
  [
    { question: 'Which part runs the program?', options: ['The hub', 'A wheel', 'The yaw sensor'], explanation: 'The hub is the robot’s computer.' },
    { question: 'Which ports drive the wheels?', options: ['A + E', 'A + B', 'C + D'], explanation: 'The two drive motors plug into A and E.' },
    { question: 'What changed when you increased speed for the same 20 cm move?', options: ['The time it took', 'The target distance', 'The motor ports'], explanation: 'Speed changes how fast the robot reaches the same target.' },
  ],
  [
    { question: 'Where do you end after 10 cm forward and 10 cm backward?', options: ['At the start', '10 cm ahead', '20 cm ahead'], explanation: 'Equal distances in opposite directions cancel.' },
    { question: 'Where do you stop after 30 cm forward and 10 cm backward?', options: ['20 cm ahead of the start', '40 cm ahead', '10 cm behind'], explanation: 'Subtract the backward distance from the forward distance.' },
    { question: 'What distance parks the robot at the orange target?', options: ['20 cm forward', '20 cm backward', '30 cm forward'], explanation: 'The orange target is 20 cm in front of the start.' },
  ],
  [
    { question: 'What happens at steering 0?', options: ['Both wheels drive forward equally', 'Both wheels stop', 'One wheel reverses'], explanation: 'Equal forward speeds make a straight path.' },
    { question: 'Which sign steers left?', options: ['Negative', 'Positive', 'Zero'], explanation: 'Negative steering slows the left wheel or reverses it.' },
    { question: 'What do the wheels do at +100?', options: ['Turn at equal speeds in opposite directions', 'Turn forward together', 'Stop together'], explanation: 'Opposite wheel directions spin the robot in place.' },
  ],
  [
    { question: 'What does resetting yaw change?', options: ['Which heading counts as zero', 'The robot’s position', 'The motor ports'], explanation: 'Resetting yaw uses the current heading as the new reference.' },
    { question: 'Which comparison is true just past 135° on a right turn?', options: ['yaw > 135', 'yaw < 135', 'yaw < 0'], explanation: 'Right turns increase yaw.' },
    { question: 'What happens to a timed turn if you lower speed?', options: ['It turns through a smaller angle', 'It always stops at the same angle', 'It automatically switches direction'], explanation: 'A slower robot turns less in the same time.' },
    { question: 'Why use wait until yaw > 90 instead of a fixed time?', options: ['The robot checks its actual heading', 'The robot skips the stop block', 'The robot always uses full speed'], explanation: 'The angle controls when the program continues, even if the speed changes.' },
  ],
];
