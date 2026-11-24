export const reference = [
  ['Power Up Your Robot', 'Inspect the hub, motors, wheels and yaw sensor. Configure A + E, 50%, and 27.63 cm per rotation.'],
  ['Return to Base', 'Wait 1 second. Move forward 20 cm, then backward 20 cm.'],
  ['Drift Challenge', 'Move with steering −40 for 20 rotations.'],
  ['Precision Turning', 'Reset yaw. Start steering +100, wait until yaw > 90°, then stop. Start steering −100, wait until yaw < 0°, then stop.'],
  ['The Ultimate Robot Test', 'Set ports A + E, speed 50%, and calibration 27.63 cm per rotation. Wait 1 second. Move forward 20 cm and backward 20 cm. Move with steering −40 for 20 rotations. Reset yaw. Start steering +100, wait until yaw > 90°, stop. Start steering −100, wait until yaw < 0°, stop.'],
  ['Become a Robotics Champion', 'Quiz answers in order: control the two wheels independently, different left and right wheel motion, heading from the reference, and stopping based on actual heading.'],
];
export const criteria = [
  'All four parts explored. The program applies both ports, 50% speed and 27.63 ± 0.05 cm calibration.',
  'The first motion begins at 1 ± 0.15 s. The robot reaches the target and reverses to finish within 1.5 cm of the start.',
  'Positive wheel motion with the left wheel at approximately 20% of the right wheel rate, for 20 ± 0.1 right-wheel rotations.',
  'Yaw reset before motion. In-place turns use the yaw reporter to stop in (90°, 105°] and [−15°, 0°). Both turns come to a stop.',
  'The Level 1 drive settings precede the ordered behaviors from Levels 2–4.',
  'All four quiz answers are correct. Reflection questions are for class discussion.',
];
