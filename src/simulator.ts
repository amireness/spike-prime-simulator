export type Reading = { kind: 'yaw' } | { kind: 'number'; value: number };
export type Condition = { op: 'gt' | 'lt' | 'eq'; left: Reading; right: Reading };
export type Command = { id: string } & (
  | { kind: 'ports'; value: string }
  | { kind: 'speed' | 'calibrate' | 'drive' | 'wait'; value: number }
  | { kind: 'move'; steering: number; amount: number; unit: 'cm' | 'rot'; direction: number }
  | { kind: 'until'; condition: Condition }
  | { kind: 'unfinished'; message: string }
  | { kind: 'stop' | 'zero' }
);
export type Pose = { x: number; z: number; angle: number };
export type Sample = Pose & { yaw: number; travel: number; time: number; left: number; right: number };
export type Record = { command: Command; before: Sample; after: Sample; sensor: boolean };
export const START: Pose = { x: 0, z: 25, angle: 0 };
export const TRACK = 14;
const RAD = 180 / Math.PI;
const EPS = 1e-7;

export class Simulator {
  pose = { ...START };
  origin = 0;
  speed = 50;
  ports = 'A+E';
  circumference = 27.63;
  travel = 0;
  left = 0;
  right = 0;
  wheelLeft = 0;
  wheelRight = 0;
  time = 0;
  state: 'idle' | 'running' | 'paused' | 'done' | 'error' | 'stopped' = 'idle';
  message = '';
  history: Record[] = [];
  program: Command[] = [];
  index = 0;
  private continuous: number | null = null;
  private entry: Sample | null = null;
  private remaining = 0;
  private stepping = false;
  private sensor = false;

  get yaw() { return (this.pose.angle - this.origin) * RAD; }
  get active() { return this.state === 'running' || this.state === 'paused' ? this.program[this.index] : undefined; }
  sample(): Sample { return { ...this.pose, yaw: this.yaw, travel: this.travel, time: this.time, left: this.wheelLeft, right: this.wheelRight }; }
  reset() { Object.assign(this, new Simulator()); }
  start(program: Command[]) {
    this.reset();
    this.program = program;
    this.state = 'running';
    if (!program.length) this.fail('Connect at least one action below the start block.');
  }
  pause() {
    if (this.state === 'running') { this.state = 'paused'; this.left = this.right = 0; }
    else if (this.state === 'paused') { this.stepping = false; this.state = 'running'; }
  }
  step() {
    if (this.state === 'running' || this.state === 'paused') {
      this.stepping = true;
      this.state = 'running';
    }
  }
  stop() { this.state = 'stopped'; this.continuous = null; this.left = this.right = 0; }
  private fail(message: string) { this.stop(); this.state = 'error'; this.message = message; }
  private velocities(steering: number, direction = 1) {
    const speed = 2 * this.circumference * this.speed / 100 * direction;
    return [speed * (1 - 2 * Math.max(0, -steering) / 100), speed * (1 - 2 * Math.max(0, steering) / 100)];
  }
  private integrate(dt: number, steering: number | null, direction = 1) {
    [this.left, this.right] = steering === null ? [0, 0] : this.velocities(steering, direction);
    const distance = (this.left + this.right) * dt / 2;
    const turn = (this.left - this.right) * dt / TRACK;
    const next = this.pose.angle + turn;
    if (Math.abs(turn) > EPS) {
      this.pose.x += distance / turn * (Math.cos(this.pose.angle) - Math.cos(next));
      this.pose.z -= distance / turn * (Math.sin(next) - Math.sin(this.pose.angle));
    } else {
      this.pose.x += Math.sin(this.pose.angle) * distance;
      this.pose.z -= Math.cos(this.pose.angle) * distance;
    }
    this.pose.angle = next;
    this.travel += Math.abs(distance);
    this.wheelLeft += this.left * dt / this.circumference;
    this.wheelRight += this.right * dt / this.circumference;
    this.time += dt;
  }
  private check(condition: Condition) {
    const read = (reading: Reading) => reading.kind === 'yaw' ? this.yaw : reading.value;
    const a = read(condition.left), b = read(condition.right);
    return condition.op === 'gt' ? a > b : condition.op === 'lt' ? a < b : Math.abs(a - b) <= 0.5;
  }
  private finish(command: Command) {
    this.history.push({ command, before: this.entry!, after: this.sample(), sensor: this.sensor });
    this.entry = null;
    this.index++;
    if (this.index === this.program.length) {
      if (this.continuous !== null && this.speed > 0) {
        this.fail(this.continuous ? 'Your robot is still turning. How could you tell it when to stop?' : 'Your robot is still moving. How could you tell it when to stop?');
      } else {
        this.state = 'done';
        this.left = this.right = 0;
      }
    } else if (this.stepping) {
      this.stepping = false;
      this.pause();
    }
  }
  tick(dt: number) {
    if (this.state !== 'running' || !(dt > 0)) return;
    const command = this.program[this.index];
    if (!command) return;
    if (!this.entry) {
      this.entry = this.sample();
      this.sensor = false;
      switch (command.kind) {
        case 'unfinished': this.fail(command.message); return;
        case 'ports': this.ports = command.value; break;
        case 'speed': this.speed = command.value; break;
        case 'calibrate': this.circumference = command.value; break;
        case 'zero': this.origin = this.pose.angle; break;
        case 'drive': this.continuous = command.value; break;
        case 'stop': this.continuous = null; this.left = this.right = 0; break;
        case 'wait': this.remaining = command.value; break;
        case 'until': this.sensor = command.condition.left.kind === 'yaw' || command.condition.right.kind === 'yaw'; break;
        case 'move': {
          this.continuous = null;
          this.remaining = command.amount * (command.unit === 'rot' ? this.circumference : 1);
          if (this.remaining > 0 && this.speed === 0) { this.fail('The movement speed is 0%. Try a speed above zero.'); return; }
          break;
        }
      }
    }
    const driveRequested = command.kind === 'move' || this.continuous !== null;
    if (driveRequested && this.ports !== 'A+E') { this.fail('The selected ports do not match the connected drive motors. Inspect the robot.'); return; }
    if (this.time > 240) { this.fail('The run reached the four-minute safety limit. Check the distances and waits.'); return; }
    if (command.kind === 'move') {
      const rate = Math.max(...this.velocities(command.steering).map(Math.abs));
      if (this.remaining > EPS) {
        const used = Math.min(dt, this.remaining / rate);
        this.integrate(used, command.steering, command.direction);
        this.remaining -= used * rate;
      }
      if (this.remaining > EPS) return;
      this.left = this.right = 0;
    } else if (command.kind === 'wait') {
      const used = Math.min(dt, this.remaining);
      this.integrate(used, this.continuous);
      this.remaining -= used;
      if (this.remaining > EPS) return;
    } else if (command.kind === 'until') {
      if (!this.check(command.condition)) {
        if (this.time - this.entry.time >= 15) {
          this.fail(this.continuous ? 'The robot kept moving but the condition never became true. Check the heading, turn direction, and comparison.' : 'The condition never became true. What could change the sensor reading while the program waits?');
          return;
        }
        this.integrate(dt, this.continuous);
        if (!this.check(command.condition)) return;
      }
    }
    this.finish(command);
  }
}
