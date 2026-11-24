import test from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { blankWorkspace, compile, compileTutorial } from '../src/blocks.ts';
import { Simulator } from '../src/simulator.ts';

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

test('training accepts a connected two-second wait anywhere and executes every action', () => {
  work([
    { type: 'lab_speed', fields: { VALUE: 50 } },
    { type: 'lab_wait', fields: { VALUE: 2 } },
    { type: 'lab_move', fields: { AMOUNT: 10 } },
  ], workspace => {
    const sim = new Simulator();
    sim.start(compileTutorial(workspace));
    for (let i = 0; i < 240 && sim.state === 'running'; i++) sim.tick(1 / 60);
    assert.equal(sim.state, 'done');
    assert.deepEqual(sim.history.map(entry => entry.command.kind), ['speed', 'wait', 'move']);
    assert.ok(Math.abs(sim.history[2].before.time - 2) < 0.0001);
    assert.ok(Math.abs(sim.travel - 10) < 0.0001);
  });
});

test('training does not count a disconnected wait or a wait with the wrong duration', () => {
  work([{ type: 'lab_wait', fields: { VALUE: 1 } }], workspace => {
    Blockly.serialization.blocks.append({ type: 'lab_wait', fields: { VALUE: 2 } }, workspace);
    assert.throws(() => compileTutorial(workspace), /Connect a wait block set to 2 seconds/);
  });
});
