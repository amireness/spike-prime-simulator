import test from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { compileMyBlocks } from '../src/blocks.ts';
import { myBlocksReference, myExperiments } from '../src/my-blocks-lesson.ts';
import { Simulator, START } from '../src/simulator.ts';

function withProgram(code, callback) {
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(code, workspace);
    callback(compileMyBlocks(workspace), workspace);
  } finally { workspace.dispose(); }
}
function execute(sim, program, entry) {
  sim.executeStream(program.run(entry));
  for (let tick = 0; tick < 15000 && sim.state === 'running'; tick++) sim.tick(1 / 60);
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} vs ${expected}`);

test('the official My Blocks workspace initializes and waits for the right hub button', () => {
  withProgram(myBlocksReference, (program, workspace) => {
    assert.equal(workspace.getTopBlocks(false).length, 3);
    assert.equal(program.hasButton('right'), true);
    assert.equal(program.hasButton('left'), false);
    assert.deepEqual(program.unused, []);
    const sim = new Simulator();
    execute(sim, program, 'start');
    assert.deepEqual(sim.pose, START);
    assert.deepEqual(sim.history.map(item => item.command.kind), ['ports', 'speed', 'calibrate']);
    execute(sim, program, 'right');
    near(sim.pose.z, START.z - 55.26);
    execute(sim, program, 'right');
    near(sim.pose.z, START.z - 110.52);
  });
});

test('all Lesson 6 Blockly examples execute with their expected motion', () => {
  const distances = [[0, 50, 55.26], [0, 55.26, 110.52, 165.78, 82.89, 27.63],
    [55.26, 55.26, 110.52, 82.89, 50], [0, 50, 100, 200, 200, 200, 100],
    [50, 100, 150, 170, 50, 0]];
  myExperiments.forEach((group, activity) => group.forEach((example, index) => {
    withProgram(example.code, program => {
      const sim = new Simulator();
      for (const entry of example.entry) {
        execute(sim, program, entry);
        assert.equal(sim.state, 'done', example.title + ': ' + sim.message);
      }
      near(sim.travel, distances[activity][index]);
      if (activity === 3 && index >= 3 || activity === 4 && [2, 3].includes(index)) {
        near(sim.pose.x, START.x);
        near(sim.pose.z, START.z);
        near(sim.pose.angle, 2 * Math.PI);
      }
      if (example.title === 'Define Forward') assert.deepEqual(program.unused, ['Forward']);
    });
  }));
});

test('My Blocks detects recursive calls, including through another definition', () => {
  const code = structuredClone(myExperiments[3][5].code);
  const forwarding = code.blocks.blocks.find(block => block.fields?.NAME === 'Forward');
  const square = code.blocks.blocks[0].next.block.next.block.next.block.next.block;
  forwarding.inputs.STACK.block = structuredClone(square);
  withProgram(code, program => {
    const sim = new Simulator();
    execute(sim, program, 'start');
    assert.equal(sim.state, 'error');
    assert.match(sim.message, /circular call/);
  });
});


test('a missing definition reports the name and stops the motors', () => {
  withProgram(myBlocksReference, (_program, workspace) => {
    const definition = workspace.getTopBlocks(false).find(block => block.type === 'procedures_defnoreturn');
    Blockly.Events.disable();
    try { definition.dispose(); } finally { Blockly.Events.enable(); }
    const program = compileMyBlocks(workspace);
    const sim = new Simulator();
    execute(sim, program, 'start');
    execute(sim, program, 'right');
    assert.equal(sim.state, 'error');
    assert.match(sim.message, /definition for Forward/);
    near(sim.travel, 0);
  });
});

test('renaming a definition updates its callers through Blockly', () => {
  withProgram(myBlocksReference, (_program, workspace) => {
    const definition = workspace.getTopBlocks(false).find(block => block.type === 'procedures_defnoreturn');
    definition.setFieldValue('DriveAhead', 'NAME');
    const call = workspace.getAllBlocks(false).find(block => block.type === 'procedures_callnoreturn');
    assert.equal(call.getFieldValue('NAME'), 'DriveAhead');
    const program = compileMyBlocks(workspace);
    const sim = new Simulator();
    execute(sim, program, 'start');
    execute(sim, program, 'right');
    near(sim.travel, 55.26);
  });
});
