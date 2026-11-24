import test from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { blankWorkspace, compile } from '../src/blocks.ts';
import { Simulator } from '../src/simulator.ts';
import { exampleProgram, guides } from '../src/guides.ts';
import { validate } from '../src/missions.ts';

function work(actions, callback) {
  const workspace = new Blockly.Workspace();
  const state = blankWorkspace();
  let tail = state.blocks.blocks[0];
  for (const action of actions) {
    tail.next = { block: action };
    tail = action;
  }
  Blockly.serialization.workspaces.load(state, workspace);
  try { callback(workspace); }
  finally { workspace.dispose(); }
}
test('Blockly compiles values, motion units, and nested yaw comparisons', () => {
  work([
    { type: 'lab_speed', fields: { VALUE: 50 } },
    { type: 'lab_move', fields: { DIR: '-1', AMOUNT: 2, UNIT: 'rot' } },
    { type: 'lab_until', inputs: { COND: { block: { type: 'lab_gt', inputs: {
      LEFT: { block: { type: 'lab_yaw' } },
      RIGHT: { shadow: { type: 'lab_number', fields: { VALUE: 90 } } },
    } } } } },
  ], workspace => {
    const commands = compile(workspace).map(({ id, ...command }) => {
      assert.ok(workspace.getBlockById(id));
      return command;
    });
    assert.deepEqual(commands, [
      { kind: 'speed', value: 50 },
      { kind: 'move', direction: -1, amount: 2, unit: 'rot', steering: 0 },
      { kind: 'until', condition: { op: 'gt', left: { kind: 'yaw' }, right: { kind: 'number', value: 90 } } },
    ]);
  });
});
test('Blockly gives feedback for empty programs and incomplete comparisons', () => {
  work([], workspace => assert.throws(() => compile(workspace), /Connect at least one action/));
  work([{ type: 'lab_until' }], workspace => assert.throws(() => compile(workspace), /Add a comparison/));
  work([{ type: 'lab_until', inputs: { COND: { block: { type: 'lab_lt' } } } }], workspace =>
    assert.throws(() => compile(workspace), /Fill both sides/));
});

function run(commands) {
  const sim = new Simulator();
  sim.start(commands);
  for (let i = 0; i < 15000 && sim.state === 'running'; i++) sim.tick(1 / 60);
  return sim;
}

test('all five guided examples load in Blockly and produce the lesson behaviors', () => {
  guides.forEach((guide, level) => {
    const workspace = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(exampleProgram(level), workspace);
      const commands = compile(workspace);
      assert.equal(commands.length, guide.steps.length);
      const sim = run(commands);
      assert.equal(sim.state, 'done');
      assert.ok(validate(level, sim, 4).ok, 'Example for level ' + (level + 1));
      assert.equal(sim.left, 0);
      assert.equal(sim.right, 0);
    } finally { workspace.dispose(); }
  });
});

test('guided runs execute earlier actions and explain an unfinished comparison', () => {
  work([
    { type: 'lab_move', fields: { AMOUNT: 10 } },
    { type: 'lab_until' },
    { type: 'lab_move', fields: { AMOUNT: 20 } },
  ], workspace => {
    const sim = run(compile(workspace, { runUntilUnfinishedBlock: true }));
    assert.equal(sim.state, 'error');
    assert.match(sim.message, /Add a comparison/);
    assert.ok(Math.abs(sim.travel - 10) < 0.001);
    assert.equal(sim.left, 0);
    assert.equal(sim.right, 0);
  });
});
