type TeacherAnswer = { expected: string; concept: string; mistake: string };
const answer = (expected: string, concept: string, mistake: string): TeacherAnswer => ({ expected, concept, mistake });
export const lessonFiveAnswers: TeacherAnswer[][] = [
  [25, 50, 100].map(speed => answer(
    `It reaches the 20 cm target in about ${(20 / (55.26 * speed / 100)).toFixed(2)} seconds. The final position is the same at all three speeds.`,
    'Speed controls travel time. A + E selects the drive motors, and 27.63 cm is the straight-line distance per rotation.',
    'Choosing rotations in the 20 cm move, entering the wrong wheel calibration, or choosing ports other than A + E.')),
  [[20, 20], [10, 10], [30, 30], [30, 10], [20, 0]].map(([out, back], i) => answer(
    i === 4 ? 'At 25% speed the robot drives 20 cm and parks with its center on the orange target.' :
      `After the one-second wait, the robot goes ${out} cm forward and ${back} cm backward. It ends ${out === back ? 'at the start' : (out - back) + ' cm ahead of start'}.`,
    'Forward and backward moves have opposite directions. Final displacement is the difference between their distances.',
    i === 4 ? 'Leaving the return block connected or judging the position from the front of the robot.' : 'Leaving both moves set to forward or using rotations instead of centimeters.')),
  [0, 25, -25, 50, -50, 100, -100].map(steering => answer(
    steering === 0 ? 'The robot goes straight. Both wheels move at the same rate.' :
      Math.abs(steering) === 100 ? `The robot spins in place to the ${steering > 0 ? 'right' : 'left'}. The wheels turn at equal speeds in opposite directions.` :
      `It curves ${steering > 0 ? 'right' : 'left'}. The inside wheel ${Math.abs(steering) === 50 ? 'stops' : 'moves slower'}.`,
    'The difference between the two wheel speeds controls turning direction and curve size.',
    'Switching steering signs or changing the number of rotations between runs.')),
  [45, 90, 135, -90, 0, 0, 90].map((target, i) => answer(
    target ? `The robot turns ${target < 0 ? 'left' : 'right'} and stops at ${target}°. A slower speed makes the turn take longer.` :
      `A 0.4-second turn at ${i === 4 ? '50% ends near 90.5°' : '25% ends near 45.2°'}.`,
    target ? 'The wait reads yaw as the robot turns. Resetting yaw makes the starting heading zero.' : 'A timed turn measures elapsed time. Its angle depends on motor speed.',
    target ? 'Mixing up steering signs, skipping the yaw reset, or leaving out stop moving.' : 'Expecting a fixed wait to give the same heading at both speeds.')),
  [
    answer('After a one-second pause, the robot drives out 20 cm and back, curves left, resets yaw, turns past +90° and then left past 0°.', 'The reference combines measured distances with sensor feedback.', 'Leaving the yaw reset before the curve or using the same comparison for both turns.'),
    answer('The same sequence executes faster at 75%. Distances are the same and yaw endpoints are close.', 'Distance and yaw determine when actions end. Speed controls how quickly they get there.', 'Changing a distance along with speed.'),
    answer('The first drive starts a second later. The driving distances and turns are unchanged.', 'A wait before movement delays the route.', 'Editing a yaw wait instead of the opening wait.'),
    answer('Steering −25 gives a wider left curve than −40.', 'Reducing the difference between wheel speeds makes a wider arc.', 'Changing the sign and turning right.'),
    answer('The robot stays still and reports a motor port mismatch.', 'The movement pair must match the motors physically connected to the hub.', 'Treating A + B as the same pair as A + E.'),
    answer('A + E allows the robot to drive 20 cm to the target.', 'Match port configuration to hardware before testing movement.', 'Fixing the speed while the ports still point to the wrong motors.'),
    answer('Yaw is 0° when the wait starts. Since 0 < 90, it continues immediately to stop moving.', 'Wait until continues as soon as its condition is true.', 'Assuming a less-than comparison waits until a reading rises to the number.'),
    answer('Yaw > 90 is false at zero, so the wheels keep turning until the heading passes +90°.', 'A condition should become true at the intended point in the motion.', 'Leaving yaw on the right side or steering left.'),
  ],
];
