import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en';
import type { Command, Reading, Condition } from './simulator';

Blockly.setLocale(En as unknown as { [key: string]: string });
const number = (name: string, value: number, min: number, max: number) => ({ type: 'field_number', name, value, min, max });
const options = (name: string, choices: string[][]) => ({ type: 'field_dropdown', name, options: choices });
const input = (name: string, check: string) => ({ type: 'input_value', name, check });
const colors = { Events: '#c69208', Movement: '#c33479', Control: '#bd5919', Sensors: '#067b98', Operators: '#25815a' };
const statement = (type: string, message0: string, category: keyof typeof colors, args0: object[] = []) =>
  ({ type, message0, args0, colour: colors[category], previousStatement: null, nextStatement: null, inputsInline: true });
const steering = () => number('STEER', 0, -100, 100);
Blockly.defineBlocksWithJsonArray([
  { type: 'lab_start', message0: 'When program starts', nextStatement: null, colour: colors.Events },
  statement('lab_ports', 'set movement motors to %1', 'Movement', [options('VALUE', ['A+E', 'A+B', 'B+C', 'C+D', 'D+E', 'E+F', 'A+F'].map(v => [v.replace('+', ' + '), v]))]),
  statement('lab_speed', 'set movement speed to %1 %%', 'Movement', [number('VALUE', 40, 0, 100)]),
  statement('lab_calibrate', 'set 1 motor rotation to %1 cm moved', 'Movement', [number('VALUE', 20, 1, 100)]),
  statement('lab_move', 'move %1 for %2 %3', 'Movement', [options('DIR', [['forward', '1'], ['backward', '-1']]), number('AMOUNT', 10, 0, 500), options('UNIT', [['cm', 'cm'], ['rotations', 'rot']])]),
  statement('lab_curve', 'move with steering %1 for %2 rotations', 'Movement', [steering(), number('AMOUNT', 1, 0, 100)]),
  statement('lab_drive', 'start moving with steering %1', 'Movement', [steering()]),
  statement('lab_stop', 'stop moving', 'Movement'),
  statement('lab_wait', 'wait %1 seconds', 'Control', [number('VALUE', 1, 0, 120)]),
  statement('lab_until', 'wait until %1', 'Control', [input('COND', 'Boolean')]),
  statement('lab_zero', 'set yaw angle to 0', 'Sensors'),
  { type: 'lab_yaw', message0: 'yaw angle', colour: colors.Sensors, output: 'Number' },
  { type: 'lab_number', message0: '%1', args0: [number('VALUE', 0, -100000, 100000)], colour: colors.Operators, output: 'Number' },
  ...[['gt', '>'], ['lt', '<'], ['eq', '=']].map(([op, symbol]) =>
    ({ type: 'lab_' + op, message0: '%1 ' + symbol + ' %2', args0: [input('LEFT', 'Number'), input('RIGHT', 'Number')], colour: colors.Operators, output: 'Boolean', inputsInline: true })),
]);

const groups = {
  Events: ['start'], Movement: ['ports', 'speed', 'calibrate', 'move', 'curve', 'drive', 'stop'],
  Control: ['wait', 'until'], Sensors: ['zero', 'yaw'], Operators: ['gt', 'lt', 'eq', 'number'],
};
const toolbox = {
  kind: 'categoryToolbox',
  contents: Object.entries(groups).map(([name, types]) => ({
    kind: 'category', name, colour: colors[name as keyof typeof colors],
    contents: types.map(type => ({
      kind: 'block', type: 'lab_' + type,
      ...(['gt', 'lt', 'eq'].includes(type) ? { inputs: {
        LEFT: { shadow: { type: 'lab_number' } }, RIGHT: { shadow: { type: 'lab_number' } },
      } } : {}),
    })),
  })),
};

export function createWorkspace(container: HTMLElement) {
  return Blockly.inject(container, {
    toolbox, media: import.meta.env.BASE_URL + "blockly-media/", trashcan: true, renderer: 'zelos', sounds: false,
    theme: Blockly.Theme.defineTheme('robotLab', {
      name: 'robotLab', base: Blockly.Themes.Classic,
      componentStyles: {
        workspaceBackgroundColour: '#f8fafd', toolboxBackgroundColour: '#fff',
        toolboxForegroundColour: '#213656', flyoutBackgroundColour: '#eaf0f8', flyoutOpacity: 1,
        scrollbarColour: '#9baec7', insertionMarkerColour: '#22476c', insertionMarkerOpacity: 0.45,
      },
      fontStyle: { family: 'system-ui, sans-serif', weight: '600', size: 11 },
    }),
    grid: { spacing: 20, length: 2, colour: '#cbd7e5' },
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: { controls: true, wheel: false, startScale: 0.88, minScale: 0.45, maxScale: 1.6 },
  });
}

export function blankWorkspace() {
  return { blocks: { languageVersion: 0, blocks: [{ type: 'lab_start', x: 35, y: 35 }] } };
}

const readNumber = (block: Blockly.Block, field = 'VALUE') => Number(block.getFieldValue(field));
function reading(block: Blockly.Block | null): Reading {
  if (block?.type === 'lab_yaw') return { kind: 'yaw' };
  if (block?.type === 'lab_number') return { kind: 'number', value: readNumber(block) };
  throw new Error('Fill both sides of the comparison with numbers or sensor readings.');
}
export function compile(workspace: Blockly.Workspace, { runUntilUnfinishedBlock = false } = {}): Command[] {
  const starts = workspace.getTopBlocks(false).filter(block => block.type === 'lab_start');
  if (starts.length !== 1) throw new Error('Use exactly one When program starts block.');
  if (workspace.getAllBlocks(false).length > 300) throw new Error('This program is too large. Try a smaller test.');
  const commands: Command[] = [];
  for (let block = starts[0].getNextBlock(); block; block = block.getNextBlock()) {
    const id = block.id;
    const kind = block.type.slice(4);
    switch (kind) {
      case 'ports': commands.push({ id, kind, value: block.getFieldValue('VALUE') }); break;
      case 'wait': case 'speed': case 'calibrate': commands.push({ id, kind, value: readNumber(block) }); break;
      case 'drive': commands.push({ id, kind, value: readNumber(block, 'STEER') }); break;
      case 'zero': case 'stop': commands.push({ id, kind }); break;
      case 'move': case 'curve':
        commands.push({ id, kind: 'move', amount: readNumber(block, 'AMOUNT'),
          direction: kind === 'curve' ? 1 : readNumber(block, 'DIR'),
          steering: kind === 'curve' ? readNumber(block, 'STEER') : 0,
          unit: kind === 'curve' ? 'rot' : block.getFieldValue('UNIT') });
        break;
      case 'until': {
        const comparison = block.getInputTargetBlock('COND');
        try {
          if (!comparison || !['lab_gt', 'lab_lt', 'lab_eq'].includes(comparison.type)) throw new Error('Add a comparison inside wait until.');
          const condition: Condition = { op: comparison.type.slice(4) as Condition['op'],
            left: reading(comparison.getInputTargetBlock('LEFT')), right: reading(comparison.getInputTargetBlock('RIGHT')) };
          commands.push({ id, kind, condition });
        } catch (error) {
          if (!runUntilUnfinishedBlock || !(error instanceof Error)) throw error;
          commands.push({ id, kind: 'unfinished', message: error.message });
        }
        break;
      }
      default: throw new Error('An action in the program could not be read.');
    }
  }
  if (!commands.length) throw new Error('Connect at least one action below the start block.');
  return commands;
}
