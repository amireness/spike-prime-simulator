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
  'Run a program and answer the observation question. The example sets up both ports, speed, and calibration.',
  'Run a program and answer the observation question. Try equal forward and backward distances of 20, 10, and 30 cm.',
  'Run a program and answer the observation question. Compare the trails and yaw for the five steering values.',
  'Run a program and answer the observation question. The example uses two comparisons to stop each turn.',
  'Run a program and answer the observation question. Compare the official example with the same run at a different speed.',
  'Answer all 12 questions. Explanations appear after checking answers, and students may retry.',
];
