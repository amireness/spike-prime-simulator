type Block = { type: string; fields?: Record<string, string | number>; inputs?: Record<string, { block?: Block; shadow?: Block }>; next?: { block: Block } };
type Step = { category: string; example: string; instruction: string; block: Block };
const setup: Step[] = [
  { category: 'Movement', example: 'set movement motors to [A + E]', instruction: 'Choose A + E in the menu. Those ports control the left and right wheels.', block: { type: 'lab_ports', fields: { VALUE: 'A+E' } } },
  { category: 'Movement', example: 'set movement speed to [50] %', instruction: 'Click the number and type 50. This sets how fast the wheels turn.', block: { type: 'lab_speed', fields: { VALUE: 50 } } },
  { category: 'Movement', example: 'set 1 motor rotation to [27.63] cm moved', instruction: 'Type 27.63. This tells the program how far the robot goes in one straight wheel turn.', block: { type: 'lab_calibrate', fields: { VALUE: 27.63 } } },
];
const trip: Step[] = [
  { category: 'Control', example: 'wait [1] seconds', instruction: 'Set the time to 1 second.', block: { type: 'lab_wait', fields: { VALUE: 1 } } },
  ...([['forward', '1'], ['backward', '-1']] as const).map(([direction, value]) => ({
    category: 'Movement', example: 'move [' + direction + '] for [20] [cm]',
    instruction: 'Choose ' + direction + ', enter 20, and choose cm.',
    block: { type: 'lab_move', fields: { DIR: value, AMOUNT: 20, UNIT: 'cm' } },
  })),
];
const curve: Step[] = [
  { category: 'Movement', example: 'move with steering [−40] for [20] rotations', instruction: 'Type -40 for steering and 20 for rotations. A negative steering value turns the robot left.', block: { type: 'lab_curve', fields: { STEER: -40, AMOUNT: 20 } } },
];
function yawTurn(right: boolean): Step[] {
  const steering = right ? 100 : -100, threshold = right ? 90 : 0, operator = right ? '>' : '<';
  return [
    { category: 'Movement', example: 'start moving with steering [' + steering + ']', instruction: 'Type ' + steering + ' for an in-place turn to the ' + (right ? 'right.' : 'left.'), block: { type: 'lab_drive', fields: { STEER: steering } } },
    {
      category: 'Control', example: 'wait until', instruction: 'Fill the empty slot as shown below. The wheels keep turning while the program checks yaw.',
      block: { type: 'lab_until', inputs: { COND: { block: { type: right ? 'lab_gt' : 'lab_lt', inputs: {
        LEFT: { block: { type: 'lab_yaw' } }, RIGHT: { shadow: { type: 'lab_number', fields: { VALUE: threshold } } },
      } } } } },
    },
    { category: 'Movement', example: 'stop moving', instruction: 'This stops both wheels once yaw ' + (operator === '>' ? 'passes 90°.' : 'drops below 0°.'), block: { type: 'lab_stop' } },
  ];
}
const turns: Step[] = [
  { category: 'Sensors', example: 'set yaw angle to 0', instruction: 'The direction the robot faces now becomes 0°.', block: { type: 'lab_zero' } },
  ...yawTurn(true), ...yawTurn(false),
];

export const guides = [
  { steps: setup, observe: 'Watch the three blocks light up. The robot stays still because these blocks set it up to drive.', experiment: 'Click a wheel or motor in the arena. Find the A and E port labels on the drive motors.', question: 'Why did the robot stay still during this run?' },
  { steps: trip, observe: 'Watch it wait, reach the orange 20 cm target, and reverse into the blue start zone.', experiment: 'Set both distances to 10 cm and run again. Then set both to 30 cm and run. Compare the farthest points on the mat.', question: 'Where did the robot finish when the forward and backward distances matched?' },
  { steps: curve, observe: 'Watch the trail and the yaw reading. Use Top to compare the curves.', experiment: 'Try steering 0, 40, -40, 100, and -100. Keep 20 rotations each time. Compare which runs make a trail and which spin in place.', question: 'How did steering +40 and -40 change the direction of your trail?' },
  { steps: turns, observe: 'Watch yaw rise past 90°, pause at the first stop, then fall below 0° as the robot turns back and stops.', experiment: 'Predict what will happen if the first comparison uses 45 instead of 90. Change it and try again.', question: 'How did the wait-until block decide when to let the robot stop?' },
  { steps: [...setup, ...trip, ...curve, ...turns], observe: 'Watch for the wait, the trip to the target and back, the left curve, and the two sensor-controlled turns.', experiment: 'Predict what will change at 25% speed. Change the speed from 50 to 25 and run again. Compare the path and the time it took.', question: 'What changed when you lowered the speed? What stayed about the same?' },
];

export function exampleProgram(level: number) {
  const actions = guides[level].steps.map(step => structuredClone(step.block));
  let chain: Block | undefined;
  for (const block of [{ type: 'lab_start' }, ...actions].reverse() as Block[]) {
    chain = chain ? { ...block, next: { block: chain } } : block;
  }
  return { blocks: { languageVersion: 0, blocks: [{ ...chain!, x: 35, y: 35 }] } };
}

export const championQuiz = [
  { question: 'Which ports control the drive wheels on this robot?', options: ['A + E', 'B + C', 'D + F'], explanation: 'The drive motors are plugged into A and E. The movement blocks use both wheels.' },
  { question: 'Why does the base use two drive motors?', options: ['Each wheel can move at its own speed and direction', 'The hub needs one motor to read yaw', 'The second motor measures time'], explanation: 'The robot turns by driving the two wheels differently.' },
  { question: 'Predict what changes when you switch from 50% to 25% speed for a 20 cm move.', options: ['The robot takes longer to travel 20 cm', 'The robot only travels 10 cm', 'The robot moves backward'], explanation: 'Speed changes how long the trip takes. The move block still tells it to travel 20 cm.' },
  { question: 'What does the 27.63 cm setting mean?', options: ['One full wheel turn moves the robot about 27.63 cm in a straight line', 'Every move lasts 27.63 seconds', 'Yaw starts at 27.63°'], explanation: 'The setting links wheel rotations to centimeters.' },
  { question: 'Predict the final position after driving forward 30 cm and backward 30 cm.', options: ['Back at the start', '60 cm ahead of the start', '30 cm behind the start'], explanation: 'The backward trip cancels the forward trip. The distance traveled still adds up to 60 cm.' },
  { question: 'What is the robot doing during the opening one-second wait?', options: ['Staying still before the first move', 'Moving one centimeter', 'Turning right'], explanation: 'No movement has started yet. The wait delays the next block.' },
  { question: 'What kind of path does steering 0 make?', options: ['A straight path', 'A left curve', 'A spin in place'], explanation: 'At steering 0, both wheels move forward at the same speed.' },
  { question: 'Predict how the path changes when you switch steering from −40 to +40.', options: ['It curves right instead of left', 'It still curves left', 'It reverses along the same straight line'], explanation: 'Negative steering turns left. Positive steering turns right.' },
  { question: 'What happens at +100 or −100 steering?', options: ['The robot spins in place, in opposite directions for the two signs', 'Both wheels stop', 'The robot drives straight at full speed'], explanation: 'The wheels turn at equal speeds in opposite directions, so the base spins in place.' },
  { question: 'What does resetting yaw to 0 do?', options: ['Makes the current heading the new zero', 'Drives the robot to the start', 'Sets both wheel speeds to zero'], explanation: 'Yaw is an angle relative to a reference. Resetting it changes the reference, not the position.' },
  { question: 'Which comparison waits until the robot has turned right past 90°?', options: ['yaw angle > 90', 'yaw angle < 90', 'yaw angle = 0'], explanation: 'Right turns increase yaw. The greater-than comparison becomes true after 90°.' },
  { question: 'Predict what happens after wait until yaw < 0 becomes true during a left turn.', options: ['The next stop moving block stops both motors', 'The wait block stops both motors by itself', 'Yaw jumps to exactly 0°'], explanation: 'Wait until lets the program continue when the comparison is true. The next stop moving block stops the wheels.' },
];
