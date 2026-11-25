import { guides, type Block } from './guides.ts';
import type { LessonQuestion } from './experiments';

const action = (type: string, fields?: Block['fields']): Block => ({ type: 'lab_' + type, fields });
const move = (amount: number, unit = 'cm', back = false) => action('move', { AMOUNT: amount, UNIT: unit, DIR: back ? '-1' : '1' });
const call = (name: string): Block => ({ type: 'procedures_callnoreturn', extraState: { name }, fields: { NAME: name } });
const chain = (blocks: Block[]): Block | undefined => blocks.reduceRight<Block | undefined>((next, block) => next ? { ...block, next: { block: next } } : block, undefined);
const define = (name: string, ...body: Block[]): Block => ({ type: 'procedures_defnoreturn', fields: { NAME: name }, inputs: { STACK: { block: chain(body) } } });
const event = (side: 'left' | 'right', ...body: Block[]) => chain([action(side), ...body])!;
const repeat = (times: number, ...body: Block[]): Block => ({ ...action('repeat', { VALUE: times }), inputs: { DO: { block: chain(body) } } });
const setup = guides[0].steps.map(step => step.block);
const build = (init: Block[], ...stacks: Block[]) => ({
  blocks: { languageVersion: 0, blocks: [chain([action('start'), ...setup, ...init])!, ...stacks].map((block, i) => ({
    ...block, x: 24 + (i % 2) * 330, y: 24 + Math.floor(i / 2) * 230,
  })) },
});
const forward = (amount = 2, unit = 'rot') => define('Forward', move(amount, unit));
const backward = (amount = 2, unit = 'rot') => define('Backward', move(amount, unit, true));
const turn = () => define('TurnRight', action('zero'), action('drive', { STEER: 100 }), {
  type: 'lab_until', inputs: { COND: { block: { type: 'lab_eq', inputs: {
    LEFT: { block: action('yaw') }, RIGHT: { shadow: action('number', { VALUE: 90 }) },
  } } } },
}, action('stop'));
const side = [call('Forward'), call('TurnRight')];
const square = () => define('Square', repeat(4, ...side));
const rectangle = () => define('Rectangle', repeat(2, call('LongSide'), call('TurnRight'), call('ShortSide'), call('TurnRight')));
const rect = (short = 25) => build([call('Rectangle')], define('LongSide', move(50)), define('ShortSide', move(short)), turn(), rectangle());
export const myBlocksReference = build([], forward(), event('right', call('Forward')));

type Entry = 'start' | 'left' | 'right';
export type MyExperiment = {
  title: string; code: ReturnType<typeof build>; entry: Entry[]; predict: string; expected: string;
  concept: string; mistake: string; observe: string; question: string; debug?: string[];
};
function experiment(title: string, code: MyExperiment['code'], predict: string, expected: string, concept: string, mistake: string,
  observe: string, question: string, entry: Entry[] = ['start'], debug?: string[]): MyExperiment {
  return { title, code, predict, expected, concept, mistake, observe, question, entry, debug };
}
const calls = (count: number) => Array.from({ length: count }, () => call('Forward'));
export const myExperiments: MyExperiment[][] = [
  [
    experiment('Set up the base', build([]), 'Will setup move the robot?', 'The robot stays still at 50% speed setting.', 'Setup configures the robot for later actions.', 'Adding a move during setup.', 'Check the wheels during setup.', 'Why did the wheels stay still?'),
    experiment('Measure in centimeters', build([move(50)]), 'Where will a 50 cm move end?', 'The robot advances 50 cm to the far marker line.', 'Centimeters specify distance directly.', 'Leaving the units set to rotations.', 'Watch the distance at the finish.', 'Which unit takes you directly to the 50 cm line?'),
    experiment('Measure in rotations', build([move(2, 'rot')]), 'How far is 2 × 27.63 cm?', 'Two rotations move 55.26 cm, 5.26 cm past the line.', 'Multiply rotations by the calibrated distance per rotation.', 'Assuming two rotations equal exactly 50 cm.', 'Compare the finish with the 50 cm line.', 'How much farther is this than 50 cm?'),
  ],
  [
    experiment('Define Forward', build([], forward()), 'Will the definition alone move the robot?', 'The robot stays still. Forward has no caller.', 'A definition stores instructions for later.', 'Expecting the definition stack to run immediately.', 'Read the message about Forward.', 'Why did the robot stay still?'),
    ...[1, 2, 3].map(n => experiment(['', 'Call Forward once', 'Call Forward twice', 'Call Forward three times'][n],
      build(calls(n), forward()), 'How far will the robot go with ' + n + ' Forward call(s)?',
      'The robot advances ' + (55.26 * n).toFixed(2) + ' cm.', 'Each call runs the same definition from its first instruction.',
      'Dragging another definition instead of a call.', 'Watch each call execute its move.', 'How many two-rotation moves ran?')),
    experiment('Edit the definition', build(calls(3), forward(1)), 'What changes when Forward moves one rotation?', 'All three calls now move 27.63 cm each, totaling 82.89 cm.', 'Changing one definition changes every call.', 'Editing or adding blocks at all three call sites.', 'Compare this run with three calls at two rotations.', 'How many places did you change?'),
    experiment('Use a clearer name', build([call('ShortForward')], define('ShortForward', move(1, 'rot'))),
      'What happens to a call when you rename Forward?', 'The call updates to ShortForward and advances 27.63 cm.', 'The definition and calls refer to the same named action.',
      'Creating a second definition instead of renaming the first.', 'Edit the name on the definition and inspect its call.', 'What name does the call show after the rename?'),
  ],
  [
    experiment('Official three-stack program', myBlocksReference, 'When will Forward actually run?', 'Run Robot initializes the base. Right then moves it 55.26 cm.', 'An event runs its stack when the button is pressed.', 'Putting Forward under When program starts.', 'Watch the robot before and after pressing Right.', 'Which stack calls Forward?', ['start', 'right']),
    experiment('Add a reverse button', build([], forward(), backward(), event('right', call('Forward')), event('left', call('Backward'))),
      'What happens when you press Left from the start?', 'Left backs up 55.26 cm.', 'Each button can run a different action.', 'Leaving Backward set to forward.', 'Watch which direction the wheels turn.', 'Which stack calls Backward?', ['start', 'left']),
    experiment('Out and back', build([], forward(), backward(), event('right', call('Forward')), event('left', call('Backward'))),
      'Where will Right then Left finish?', 'The robot returns to start after traveling 110.52 cm.', 'Equal moves in opposite directions cancel their displacement.', 'Pressing Run Robot again between buttons.', 'Compare the start and finish positions.', 'Why is total distance greater than zero?', ['start', 'right', 'left']),
    experiment('Change the reverse distance', build([], forward(), backward(1), event('right', call('Forward')), event('left', call('Backward'))),
      'Where will it finish if Left moves only one rotation?', 'It ends 27.63 cm ahead of start.', 'A new definition setting changes the behavior of its event.', 'Changing Forward instead of Backward.', 'Watch how much of the outward trail is retraced.', 'How far from start did it finish?', ['start', 'right', 'left']),
    experiment('Two short presses', build([], forward(25, 'cm'), event('right', call('Forward'))),
      'How many 25 cm presses take you to 50 cm?', 'Two completed Right presses advance 50 cm.', 'An event can run again after it finishes.', 'Pressing the second time while the first stack is still busy.', 'Check the 25 cm and 50 cm positions.', 'What starts each move?', ['start', 'right', 'right']),
  ],
  [
    experiment('Make a right-angle turn', build([call('TurnRight')], turn()), 'Will the robot roll forward during the turn?', 'The base pivots in place to +90°.', 'A live yaw comparison releases the wait at the target angle.', 'Using a negative steering value for this target.', 'Watch yaw and the robot’s center.', 'Why do we reset yaw first?'),
    experiment('Drive then turn', build(side, forward(50, 'cm'), turn()), 'Which way will the robot face at the end?', 'It drives to the 50 cm line and faces right.', 'Calls execute in the order they are connected.', 'Putting TurnRight before Forward.', 'Watch where the turn starts.', 'Which call runs first?'),
    experiment('Drive two sides', build([...side, ...side], forward(50, 'cm'), turn()), 'What shape will two sides draw?', 'Two perpendicular 50 cm sides form an L.', 'Two calls can be used as a sequence and reused.', 'Leaving out the second Forward call.', 'Look for the corner in Top view.', 'What creates the corner?'),
    experiment('Drive four sides', build([...side, ...side, ...side, ...side], forward(50, 'cm'), turn()), 'Where will four sides end?', 'The robot returns to start facing its original direction.', 'Four right-angle turns add up to one full turn.', 'Turning only three times.', 'Compare the start and finish headings.', 'Why is the fourth turn useful?'),
    experiment('Repeat the pair', build([repeat(4, ...side)], forward(50, 'cm'), turn()), 'Will repeat change the route?', 'The same 50 cm square uses two call blocks inside Repeat.', 'Repeat runs every block in its body each time.', 'Putting TurnRight outside Repeat.', 'Compare your new trail with the four explicitly written sides.', 'Which two calls belong inside Repeat?'),
    experiment('Define Square', build([call('Square')], forward(50, 'cm'), turn(), square()), 'What will a single Square call do?', 'Square calls Forward and TurnRight four times and returns to start.', 'My Blocks can call other My Blocks.', 'Defining Square and leaving it uncalled.', 'Watch which definition is entered from Square.', 'Which action does Square reuse to make corners?'),
    experiment('Shrink the square', build([call('Square')], forward(25, 'cm'), turn(), square()),
      'Which single edit makes every side 25 cm?', 'The robot travels 100 cm around a smaller square.', 'One definition can control every side of a route.', 'Changing the repeat count instead of Forward.', 'Compare the new side lengths to the square guide.', 'Why did all four sides shrink?'),
  ],
  [
    experiment('Reach the far marker', build([call('ToFarMarker')], define('ToFarMarker', move(50))), 'Which move goes from A to B?',
      'The robot advances 50 cm along the marker line.', 'A block name can describe a navigation goal.', 'Using two rotations for an exact 50 cm move.', 'Compare the robot’s center to marker B.', 'Why did you choose centimeters?'),
    experiment('Return to marker A', build([call('ToFarMarker'), call('ToNearMarker')], define('ToFarMarker', move(50)), define('ToNearMarker', move(50, 'cm', true))),
      'Where will the return action finish?', 'The robot finishes at A with 100 cm traveled.', 'A route can be built from named navigation actions.', 'Making both moves forward.', 'Check whether the return follows the same line.', 'Which definition reverses the motion?'),
    experiment('Drive a rectangle', rect(), 'What side lengths will repeat?', 'The robot drives 50, 25, 50, 25 cm and returns to start.', 'A rectangle repeats a long side, turn, short side, and turn.', 'Repeating the long side four times.', 'Use Top view and compare opposite sides.', 'Why does Repeat run twice here?'),
    experiment('Make the rectangle wider', rect(35), 'Which sides change if ShortSide becomes 35 cm?', 'Both short sides widen to 35 cm, for 170 cm total.', 'One definition can update two separated parts of a route.', 'Changing LongSide or Repeat instead.', 'Compare the two paths using the floor grid.', 'Why did two sides change together?'),
    experiment('Debug the missing call', build([call('Forward')], forward(50, 'cm')), 'What happens if you remove the Forward call from the start stack?',
      'Without the call it stays still. Reconnecting Forward sends it 50 cm.', 'Start by identifying the entry point and tracing its calls.',
      'Adding another definition to fix an uncalled block.', 'Compare the wheels before and after reconnecting Forward.', 'Which block fixed the motion?',
      ['start'], ['Disconnect the Forward call from the start stack.', 'Press Run Robot and read the message about Forward.', 'Reconnect the Forward call.']),
    experiment('Debug the turn direction', build([call('TurnRight')], turn()), 'What happens if TurnRight uses steering −100 with yaw = 90?',
      'The wrong setting reaches +90° by turning 270° left. Steering +100 reaches +90° by turning 90° right.',
      'Signed yaw wraps, so the same reading can represent different paths.', 'Assuming equal final yaw guarantees equal motion.',
      'Compare the directions and sizes of the two turns.', 'Which steering direction makes the shorter turn?',
      ['start'], ['Change TurnRight’s steering to −100.', 'Press Run Robot and watch for the long turn.', 'Set the steering back to +100.']),
  ],
];

export function blockLabel(block: Block): string {
  const f = block.fields ?? {};
  switch (block.type) {
    case 'lab_start': return 'When program starts';
    case 'lab_right': return 'When right hub button pressed';
    case 'lab_left': return 'When left hub button pressed';
    case 'procedures_defnoreturn': return 'Define ' + f.NAME;
    case 'procedures_callnoreturn': return String(f.NAME);
    case 'lab_ports': return 'set movement motors to [A + E]';
    case 'lab_speed': return 'set movement speed to [50] %';
    case 'lab_calibrate': return 'set 1 motor rotation to [27.63] cm moved';
    case 'lab_move': return 'move [' + (f.DIR === '-1' ? 'backward' : 'forward') + '] for [' + f.AMOUNT + '] [' + (f.UNIT === 'rot' ? 'rotations' : 'cm') + ']';
    case 'lab_repeat': return 'repeat [' + f.VALUE + '] times';
    case 'lab_zero': return 'set yaw angle to 0';
    case 'lab_drive': return 'start moving with steering [' + f.STEER + ']';
    case 'lab_until': return 'wait until';
    case 'lab_stop': return 'stop moving';
    default: return block.type;
  }
}
const quiz = (question: string, correct: string, a: string, b: string, explanation: string): LessonQuestion => ({question, options: [correct, a, b], explanation});
export const myQuiz = [
  quiz('What does Define Forward do?', 'Stores a set of instructions', 'Moves the robot immediately', 'Starts the timer', 'The definition stores the actions. A call starts them.'),
  quiz('Where can you find a call for Forward?', 'My Blocks', 'Sensors', 'Operators', 'My Blocks holds calls for the custom blocks you create.'),
  quiz('Forward moves 10 cm. What do three calls do?', 'Move 30 cm', 'Move 10 cm', 'Move 3 cm', 'Each of the three calls runs the 10 cm action.'),
  quiz('What happens when you edit the distance in Forward?', 'All calls use the new distance', 'Only the first call changes', 'Every call needs to be replaced', 'The calls all look up the same definition.'),
  quiz('What does the right button event do when you press Run Robot?', 'Waits for a press after setup', 'Runs as soon as setup starts', 'Deletes the Forward block', 'Run Robot starts initialization. Press Right to run the event stack.'),
  quiz('Where does Forward belong in the official program?', 'Beneath the right button event', 'Inside its own definition', 'Beneath the motor setup', 'The right button event calls the definition.'),
  quiz('At 27.63 cm per rotation, how far are two rotations?', '55.26 cm', '50 cm', '29.63 cm', '2 × 27.63 = 55.26 cm.'),
  quiz('What unit directly targets the 50 cm line?', 'Centimeters', 'Rotations', 'Degrees of yaw', 'A 50 cm move uses the centimeter setting directly.'),
  quiz('Repeat 4 contains Forward and TurnRight. How many turns run?', '4', '1', '8', 'Both blocks run once during each of the four repetitions.'),
  quiz('What should each corner of a square turn through?', '90°', '45°', '135°', 'Four 90° turns make one complete turn.'),
  quiz('What does resetting yaw do before each corner?', 'Sets the current heading to zero', 'Moves back to the start', 'Changes the motor ports', 'Yaw becomes relative to the heading at the start of that corner.'),
  quiz('How can Square reuse a turning definition?', 'Put a TurnRight call inside Square', 'Put a second TurnRight definition inside Square', 'Rename Square to TurnRight', 'A custom block can call another custom block.'),
  quiz('Which sequence can repeat twice to drive a rectangle?', 'Long side, turn, short side, turn', 'Long side, short side, turn', 'Turn, long side, long side', 'Each pair contains a long side and a short side with a corner after each.'),
  quiz('Forward is defined and Run Robot finishes without moving. What should you check?', 'Whether a start or button stack calls Forward', 'Whether Forward has a capital letter', 'Whether there are two copies of Define Forward', 'A definition needs a reachable call to execute.'),
  quiz('Why does calling Square inside its own definition cause a problem?', 'The calls keep nesting without an end', 'The robot can only draw triangles', 'Repeat automatically becomes zero', 'A circular call keeps entering the same definition. Break the cycle to finish the route.'),
];

