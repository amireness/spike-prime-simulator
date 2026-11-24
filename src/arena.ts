import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { START, TRACK, type Simulator } from './simulator';
import type { Part } from './missions';

const material = (color: number, metalness = 0.08) => new T.MeshStandardMaterial({ color, metalness, roughness: 0.48 });
const cyan = material(0x19c6e2), pink = material(0xea2787), yellow = material(0xffce27);
const cream = material(0xf5f6f5), tire = material(0x18202d), dark = material(0x273649);
const gray = material(0x8796a2, 0.28), blue = material(0x224aa4), pin = material(0x08668a);
type P = T.Vector3Tuple;
function mesh(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, position: P) {
  const object = new T.Mesh(geometry, mat);
  object.position.set(...position);
  parent.add(object);
  return object;
}
const box = (parent: T.Object3D, size: P, position: P, mat: T.Material) =>
  mesh(parent, new T.BoxGeometry(...size), mat, position);
function cylinder(parent: T.Object3D, radius: number, length: number, position: P, mat: T.Material, axis = 'y', sides = 24) {
  const object = mesh(parent, new T.CylinderGeometry(radius, radius, length, sides), mat, position);
  if (axis === 'x') object.rotation.z = Math.PI / 2;
  if (axis === 'z') object.rotation.x = Math.PI / 2;
  return object;
}
function ring(parent: T.Object3D, radius: number, tube: number, position: P, mat: T.Material, axis = 'z') {
  const object = mesh(parent, new T.TorusGeometry(radius, tube, 8, 28), mat, position);
  if (axis === 'x') object.rotation.y = Math.PI / 2;
  if (axis === 'y') object.rotation.x = -Math.PI / 2;
  return object;
}
function beam(parent: T.Object3D, count: number, position: P, mat: T.Material, rotation: number, flat = false) {
  const beam = new T.Group();
  beam.position.set(...position);
  beam.rotation.y = rotation;
  if (flat) beam.rotateX(-Math.PI / 2);
  parent.add(beam);
  const pitch = 1.12, r = 0.55, length = (count - 1) * pitch;
  const shape = new T.Shape();
  shape.moveTo(-length / 2, -r);
  shape.lineTo(length / 2, -r);
  shape.absarc(length / 2, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-length / 2, r);
  shape.absarc(-length / 2, 0, r, Math.PI / 2, 3 * Math.PI / 2, false);
  for (let i = 0; i < count; i++) {
    const hole = new T.Path();
    hole.absarc(i * pitch - length / 2, 0, 0.29, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  mesh(beam, new T.ExtrudeGeometry(shape, { depth: 0.67, bevelEnabled: false, curveSegments: 8 }), mat, [0, 0, -0.335]);
  return beam;
}
function cable(parent: T.Object3D, points: P[]) {
  mesh(parent, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 18, 0.13, 7), tire, [0, 0, 0]);
}
function label(parent: T.Object3D, value: string, position: P, color: string, width: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color; ctx.font = 'bold 48px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(value, 128, 40);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const plane = mesh(parent, new T.PlaneGeometry(width, width * 0.3125), new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), position);
  plane.rotation.x = -Math.PI / 2;
}
function buildRobot() {
  const robot = new T.Group();
  const wheels: T.Group[] = [];
  for (const side of [-1, 1]) {
    const wheel = new T.Group();
    wheel.position.set(side * TRACK / 2, 4.4, 0);
    wheel.userData.part = 'wheels';
    robot.add(wheel); wheels.push(wheel);
    cylinder(wheel, 4.4, 2.6, [0, 0, 0], tire, 'x', 40);
    for (let i = 0; i < 28; i++) {
      const angle = i * Math.PI / 14;
      const tread = box(wheel, [2.27, 0.21, 0.42], [0, 4.35 * Math.cos(angle), 4.35 * Math.sin(angle)], dark);
      tread.rotation.x = angle;
    }
    for (const face of [-1, 1]) {
      cylinder(wheel, 3.18, 0.26, [face * 1.27, 0, 0], cyan, 'x', 36);
      ring(wheel, 2.77, 0.14, [face * 1.43, 0, 0], pin, 'x');
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        cylinder(wheel, 0.32, 0.06, [face * 1.43, 1.95 * Math.sin(a), 1.95 * Math.cos(a)], dark, 'x', 10);
      }
    }
    cylinder(wheel, 0.68, 3.05, [0, 0, 0], gray, 'x');
    box(wheel, [0.18, 0.78, 0.23], [side * 1.62, 0, 0], dark);
    box(wheel, [0.18, 0.23, 0.78], [side * 1.62, 0, 0], dark);

    const motor = new T.Group();
    motor.userData.part = 'motors'; robot.add(motor);
    box(motor, [2.5, 3.3, 5.3], [side * 4.63, 4.35, 0.28], gray);
    box(motor, [2.6, 2.8, 3.8], [side * 4.63, 4.8, 1.05], cream);
    box(motor, [2.32, 0.24, 1.12], [side * 4.63, 6.31, 1.5], blue);
    label(motor, side < 0 ? 'A' : 'E', [side * 4.63, 6.45, 1.48], '#ffffff', 2.25);
    cylinder(motor, 0.49, 2.1, [side * 5.66, 4.4, 0], gray, 'x');
    cable(robot, [[side * 4.6, 5.0, 2.97], [side * 4.6, 6.0, 4.03], [side * 3.12, 7.8, 3.98], [side * 2.75, 7.8, 2.7]]);

    beam(robot, 13, [side * 3.3, 2.7, 0.4], cyan, Math.PI / 2);
    beam(robot, 11, [side * 4.65, 2.55, -0.35], pink, Math.PI / 2, true);
    beam(robot, 7, [side * 3.36, 6.15, -2.9], pink, Math.PI / 2, true);
    for (const z of [-5.95, -4.85, 3.8, 5.95]) {
      cylinder(robot, 0.26, 0.27, [side * 3.68, 2.7, z], pin, 'x', 10);
    }
  }
  for (const z of [-6.2, -4.8, 5.5, 6.65]) beam(robot, 9, [0, 2.6, z], z < 0 ? pink : cyan, 0, true);
  for (const x of [-2.8, 2.8]) {
    cylinder(robot, 0.67, 0.75, [x, 1.8, 5.9], gray);
    mesh(robot, new T.SphereGeometry(0.76, 14, 10), dark, [x, 0.78, 5.9]);
  }
  box(robot, [6.1, 0.8, 5.6], [0, 5.42, -0.56], dark);
  const hub = new T.Group();
  hub.userData.part = 'hub'; robot.add(hub);
  box(hub, [6.1, 2.1, 5.8], [0, 6.7, -0.45], yellow);
  box(hub, [5.9, 0.44, 5.56], [0, 7.91, -0.45], cream);
  box(hub, [3.45, 0.12, 2.75], [0, 8.16, -1.02], dark);
  for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
    const lit = row === 2 || col === 2 || (row === col && row < 2);
    cylinder(hub, 0.11, 0.045, [(col - 2) * 0.39, 8.25, -1.02 + (row - 2) * 0.39], lit ? yellow : gray, 'y', 8);
  }
  for (const x of [-2.34, 0, 2.34]) for (const z of [-3.39, 2.49]) {
    box(hub, [1.09, 0.58, 0.19], [x, 7.05, z], dark);
    box(hub, [0.72, 0.15, 0.2], [x, 7.05, z * 1.006], gray);
  }
  cylinder(hub, 0.31, 0.08, [0, 8.17, 1.4], dark);
  for (const x of [-2.4, 2.4]) {
    for (const z of [-2.5, -1.9, -1.3]) cylinder(hub, 0.09, 0.035, [x, 8.151, z], gray, 'y', 8);
  }
  const gyro = cylinder(robot, 0.62, 0.16, [2.05, 8.19, 1.43], cyan);
  gyro.userData.part = 'yaw';
  ring(gyro, 0.37, 0.052, [0, 0.095, 0], dark, 'y');
  const heading = mesh(robot, new T.ConeGeometry(0.79, 2.55, 3), new T.MeshBasicMaterial({ color: 0xfbbf24 }), [0, 0.22, -10.2]);
  heading.rotation.x = -Math.PI / 2;
  return { robot, wheels };
}

export function createArena(container: HTMLElement, onPart: (part: Part) => void, showcase = false) {
  const scene = new T.Scene();
  scene.background = new T.Color(0xdceaff);
  scene.fog = new T.Fog(0xdceaff, 145, 420);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  container.prepend(renderer.domElement);
  const camera = new T.PerspectiveCamera(43, 1, 0.2, 650);
  const controls = new OrbitControls(camera, renderer.domElement);
  let dirty = true;
  controls.addEventListener('change', () => { dirty = true; });
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.12;
  controls.minDistance = 13;
  controls.maxDistance = 220;
  controls.zoomSpeed = 0.85;
  controls.target.set(0, 1.4, 15);
  const iso = () => {
    if (showcase) { camera.position.set(20, 23, 49); controls.target.set(0, 4, 25); }
    else { camera.position.set(25, 29, 49); controls.target.set(0, 2, 19); }
    controls.update();
  };
  const top = () => { camera.position.set(0, 85, 15.002); controls.target.set(0, 0, 15); controls.update(); };
  iso();
  scene.add(new T.HemisphereLight(0xe5f5ff, 0x8893a9, 2.4));
  const light = new T.DirectionalLight(0xffefdb, 2.35);
  light.position.set(-25, 50, 22);
  scene.add(light);
  box(scene, [400, 0.2, 400], [0, -0.15, 0], material(0xe5edfa));
  box(scene, [22, 0.03, 16], [0, -0.037, START.z], material(0xb4c9f4));
  box(scene, [13, 0.03, 10], [0, -0.037, START.z - 20], material(0xffdaa1));
  for (const x of [-15, 15]) {
    box(scene, [0.6, 0.02, 64], [x, -0.032, 10], material(0x809ae1));
  }
  const minor = new T.GridHelper(160, 160, 0xc4d2e8, 0xc4d2e8);
  minor.position.y = -0.025; scene.add(minor);
  const major = new T.GridHelper(160, 16, 0x6682bb, 0xa5bada);
  major.position.y = 0; scene.add(major);
  for (let distance = -60; distance <= 70; distance += 10) {
    label(scene, distance + ' cm', [-20, 0.025, START.z - distance], '#476297', 8);
  }
  const startColor = new T.MeshBasicMaterial({ color: 0x3558d4 });
  const targetColor = new T.MeshBasicMaterial({ color: 0xffa117 });
  ring(scene, 3.7, 0.19, [START.x, 0.07, START.z], startColor, 'y');
  label(scene, 'START', [-7, 0.08, START.z], '#2649ba', 8);
  ring(scene, 2.2, 0.19, [START.x, 0.07, START.z - 20], targetColor, 'y');
  ring(scene, 0.58, 0.19, [START.x, 0.07, START.z - 20], targetColor, 'y');
  label(scene, '20 cm', [-5.5, 0.08, START.z - 20], '#90520d', 7);

  const { robot, wheels } = buildRobot();
  scene.add(robot);
  const shadow = mesh(scene, new T.CircleGeometry(1, 32), new T.MeshBasicMaterial({ color: 0x405989, transparent: true, opacity: 0.24, depthWrite: false }), [START.x, 0.036, START.z]);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(8.4, 7.2, 1);
  const capacity = 16000;
  const positions = new Float32Array(capacity * 3);
  const geometry = new T.BufferGeometry();
  const attribute = new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  const trail = new T.Line(geometry, new T.LineBasicMaterial({ color: 0x098d75 }));
  trail.frustumCulled = false; scene.add(trail);
  const previousGeometry = new T.BufferGeometry();
  const previousTrail = new T.Line(previousGeometry, new T.LineBasicMaterial({ color: 0x9072d4, transparent: true, opacity: 0.8 }));
  previousTrail.frustumCulled = false;
  scene.add(previousTrail);
  let count = 0, lastX = START.x, lastZ = START.z;
  const addPoint = (x: number, z: number) => {
    if (count >= capacity) return;
    attribute.setXYZ(count++, x, 0.16, z);
    attribute.addUpdateRange((count - 1) * 3, 3);
    attribute.needsUpdate = true;
    geometry.setDrawRange(0, count);
    lastX = x; lastZ = z;
  };
  function clear(keepPrevious = false) {
    if (keepPrevious && count > 1) {
      previousGeometry.dispose();
      previousGeometry.setAttribute('position', new T.BufferAttribute(positions.slice(0, count * 3), 3));
      previousTrail.visible = true;
    } else if (!keepPrevious) previousTrail.visible = false;
    count = 0;
    addPoint(START.x, START.z);
    dirty = true;
  }
  previousTrail.visible = false;
  clear();
  const ray = new T.Raycaster(), mouse = new T.Vector2();
  let downX = 0, downY = 0;
  renderer.domElement.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
  renderer.domElement.addEventListener('click', e => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    mouse.set((e.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (e.clientY - bounds.top) / bounds.height * 2);
    ray.setFromCamera(mouse, camera);
    for (const hit of ray.intersectObject(robot, true)) {
      for (let object: T.Object3D | null = hit.object; object && object !== robot; object = object.parent) {
        if (object.userData.part) { onPart(object.userData.part as Part); return; }
      }
    }
  });
  const resize = () => {
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    dirty = true;
  };
  new ResizeObserver(resize).observe(container);
  resize();
  return {
    iso, top, clear,
    zoom(factor: number) {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(T.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    draw(sim: Simulator, trailEnabled = true) {
      const left = -sim.wheelLeft * Math.PI * 2, right = -sim.wheelRight * Math.PI * 2;
      if (robot.position.x !== sim.pose.x || robot.position.z !== sim.pose.z || robot.rotation.y !== -sim.pose.angle ||
        wheels[0].rotation.x !== left || wheels[1].rotation.x !== right) dirty = true;
      robot.position.set(sim.pose.x, 0, sim.pose.z);
      robot.rotation.y = -sim.pose.angle;
      shadow.position.set(sim.pose.x, 0.036, sim.pose.z);
      shadow.rotation.z = sim.pose.angle;
      wheels[0].rotation.x = left;
      wheels[1].rotation.x = right;
      if (trailEnabled && Math.hypot(sim.pose.x - lastX, sim.pose.z - lastZ) > 0.14) addPoint(sim.pose.x, sim.pose.z);
      controls.update();
      if (dirty) {
        renderer.render(scene, camera);
        dirty = false;
      }
    },
  };
}
