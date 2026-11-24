import { championQuiz } from './guides';
export const reference = [
  ['Configure your robot', 'Set the drive ports to A + E, movement speed to 50%, and calibration to 27.63 cm per rotation.'],
  ['Forward and backward', 'Wait 1 second. Move forward 20 cm, then backward 20 cm.'],
  ['Steering', 'Move with steering −40 for 20 rotations.'],
  ['Yaw sensor', 'Reset yaw. Start steering +100, wait until yaw > 90°, then stop. Start steering −100, wait until yaw < 0°, then stop.'],
  ['Complete robot test', 'Set ports A + E, speed 50%, and calibration 27.63 cm per rotation. Wait 1 second. Move forward 20 cm and backward 20 cm. Move with steering −40 for 20 rotations. Reset yaw. Start steering +100, wait until yaw > 90°, stop. Start steering −100, wait until yaw < 0°, stop.'],
  ['Robotics Champion Quiz', championQuiz.map((question, i) => (i + 1) + '. ' + question.options[0]).join(' · ')],
];
export const criteria = [
  'Explore four parts. Predict, run, and compare 20 cm drives at 25%, 50%, and 100%, then answer three questions.',
  'Run the 20/20, 10/10, 30/30, and 30/10 cm trips, park within 0.5 cm of the target, then answer three questions.',
  'Predict and run steering 0, ?25, ?50, and ?100. Compare the trails, then answer three questions.',
  'Compare 45?, 90?, and 135? right turns, a left turn, and timed versus sensor-based turns at different speeds. Answer four questions.',
  'Run the official test, then compare three parameter changes. Reproduce and fix a port bug and a comparison bug.',
  'Answer all 15 championship questions. Explanations appear after checking answers, and students may retry.',
];
