import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulator, START } from '../src/simulator.ts';
import { missions, validate } from '../src/missions.ts';

const command = (kind, extra = {}) => ({ id: kind, kind, ...extra });
const move = (amount, direction = 1, steering = 0, unit = 'cm') => command('move', { amount, direction, steering, unit });
const setup = [
  command('ports', { value: 'A+E' }), command('speed', { value: 50 }),
  command('calibrate', { value: 27.63 }),
];
const trip = [command('wait', { value: 1 }), move(20), move(20, -1)];
const curve = [move(20, 1, -40, 'rot')];
const until = (op, value, swapped = false) => {
  const yaw = { kind: 'yaw' }, number = { kind: 'number', value };
  return command('until', { condition: { op, left: swapped ? number : yaw, right: swapped ? yaw : number } });
};
const turns = [
  command('zero'), command('drive', { value: 100 }), until('gt', 90), command('stop'),
  command('drive', { value: -100 }), until('lt', 0), command('stop'),
];
function run(program) {
  const sim = new Simulator();
  sim.start(program);
  for (let n = 0; n < 15000 && sim.state === 'running'; n++) sim.tick(1 / 60);
  return sim;
}
const near = (value, goal) => assert.ok(Math.abs(value - goal) < 0.01, `${value} should be close to ${goal}`);

test('the full lesson reference passes the Advanced Base Test', () => {
  const sim = run([...setup, ...trip, ...curve, ...turns]);
  assert.equal(sim.state, 'done');
  assert.ok(validate(4, sim, 0).ok);
  assert.equal(missions.reduce((sum, mission) => sum + mission.minutes, 0), 60);
  near(sim.pose.x, sim.history[6].after.x);
  near(sim.pose.z, sim.history[6].after.z);
  assert.ok(sim.yaw < 0 && sim.yaw > -10);
  near(sim.travel, 40 + 12 * 27.63);
});
test('individual missions validate inspected parts, delay, distance, arc and sensors', () => {
  assert.equal(validate(0, run(setup), 3).ok, false);
  assert.ok(validate(0, run(setup), 4).ok);
  const straight = run(trip);
  near(straight.pose.z, START.z);
  near(straight.pose.x, START.x);
  near(straight.history[1].after.z, START.z - 20);
  assert.ok(validate(1, straight, 0).ok);
  assert.ok(validate(2, run(curve), 0).ok);
  assert.ok(validate(3, run(turns), 0).ok);
});
test('equivalent split movements and reversed comparison operands pass', () => {
  assert.ok(validate(1, run([command('wait', { value: 0.4 }), command('wait', { value: 0.6 }), move(7), move(13), move(6, -1), move(14, -1)]), 0).ok);
  assert.ok(validate(2, run([move(7, 1, -40, 'rot'), move(13, 1, -40, 'rot')]), 0).ok);
  const equivalent = [...turns];
  equivalent[2] = until('lt', 90, true);
  equivalent[5] = until('gt', 0, true);
  assert.ok(validate(3, run(equivalent), 0).ok);
});
test('incorrect units, direction, missing return and timed yaw turns fail validation', () => {
  assert.equal(validate(1, run([trip[0], move(20)]), 0).ok, false);
  assert.equal(validate(2, run([move(20, 1, -40)]), 0).ok, false);
  assert.equal(validate(2, run([move(20, 1, 40, 'rot')]), 0).ok, false);
  const timed = turns.map(cmd => cmd.kind === 'until' ? command('wait', { value: 0.5 }) : cmd);
  assert.equal(validate(3, run(timed), 0).ok, false);
  const extraRotation = [...turns];
  extraRotation[2] = until('gt', 450);
  assert.equal(validate(3, run(extraRotation), 0).ok, false);
});
test('calibration affects rotations, speed affects timing and steering signs mirror', () => {
  const calibrated = run([command('calibrate', { value: 10 }), move(2, 1, 0, 'rot')]);
  near(calibrated.travel, 20);
  near(calibrated.time, 2);
  const fast = run([command('speed', { value: 100 }), move(20)]);
  near(fast.time, 20 / 55.26);
  const left = run([move(15, 1, -40)]), right = run([move(15, 1, 40)]);
  near(left.pose.x, -right.pose.x);
  assert.ok(left.yaw < 0 && right.yaw > 0);
});
test('impossible waits, unconnected drive ports, zero speed and unfinished motion stop safely', () => {
  for (const program of [[until('gt', 90)], [command('drive', { value: -100 }), until('gt', 90)], [command('ports', { value: 'A+B' }), move(20)], [command('speed', { value: 0 }), move(20)], [command('drive', { value: 10 })]]) {
    const sim = run(program);
    assert.equal(sim.state, 'error');
    assert.equal(sim.left, 0);
    assert.equal(sim.right, 0);
  }
  assert.match(run([until('gt', 90)]).message, /condition never became true/i);
  const tooLong = run(Array.from({ length: 4 }, () => command('wait', { value: 100 })));
  assert.match(tooLong.message, /safety limit/);
});
test('pause, step, stop and reset preserve or clear motion as appropriate', () => {
  const sim = new Simulator();
  sim.start(trip);
  sim.step();
  for (let i = 0; i < 70; i++) sim.tick(1 / 60);
  assert.equal(sim.state, 'paused');
  assert.equal(sim.index, 1);
  near(sim.time, 1);
  sim.pause();
  sim.tick(0.1);
  assert.ok(sim.travel > 0);
  sim.pause();
  const before = sim.sample();
  sim.tick(0.1);
  assert.deepEqual(sim.sample(), before);
  sim.stop();
  assert.equal(sim.state, 'stopped');
  sim.reset();
  assert.deepEqual(sim.pose, START);
  assert.equal(sim.travel, 0);
});

test('signed yaw wraps at a half turn while heading remains continuous', () => {
  const right = run([command('drive', { value: 100 }), command('wait', { value: 1 }), command('stop')]);
  const left = run([command('drive', { value: -100 }), command('wait', { value: 1 }), command('stop')]);
  assert.ok(right.pose.angle > Math.PI && right.yaw < 0);
  assert.ok(left.pose.angle < -Math.PI && left.yaw > 0);
  near(right.yaw, -left.yaw);
  const reset = run([command('drive', { value: 100 }), command('wait', { value: 1 }), command('stop'), command('zero')]);
  near(reset.yaw, 0);
  near(reset.pose.angle, right.pose.angle);
});

test('live yaw equality finds exact angles at varying tick sizes and signs', () => {
  for (const degrees of [45, 90, 135, -45, -90, -135]) {
    const sim = new Simulator();
    sim.start([command('zero'), command('drive', { value: Math.sign(degrees) * 100 }), until('eq', degrees), command('stop')]);
    for (let i = 0; i < 100 && sim.state === 'running'; i++) sim.tick(0.09);
    assert.equal(sim.state, 'done');
    near(sim.yaw, degrees);
    assert.equal(sim.left, 0);
    assert.equal(sim.right, 0);
    assert.ok(sim.history[2].after.time > sim.history[2].before.time);
  }
});

test('a wrong-direction comparison stops before wrapping into a false success', () => {
  const sim = run([command('drive', { value: -100 }), until('gt', 90), command('stop')]);
  assert.equal(sim.state, 'error');
  assert.match(sim.message, /turning away from the target angle/);
  assert.ok(sim.time < 1);
  assert.equal(sim.left, 0);
  assert.equal(sim.right, 0);
});
