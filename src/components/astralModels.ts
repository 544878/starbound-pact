import * as T from "three";

const gold = new T.MeshStandardMaterial({
  color: "#d9b877",
  metalness: 0.76,
  roughness: 0.28,
});
const ivory = new T.MeshStandardMaterial({
  color: "#eee8d7",
  metalness: 0.24,
  roughness: 0.42,
});
const dark = new T.MeshStandardMaterial({
  color: "#192638",
  metalness: 0.45,
  roughness: 0.38,
});
const skin = new T.MeshStandardMaterial({ color: "#f3d4c4", roughness: 0.6 });
export function mesh(
  geometry: T.BufferGeometry,
  material: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function ring(
  parent: T.Object3D,
  radius: number,
  tube: number,
  material: T.Material,
  y = 0,
) {
  const m = mesh(
    new T.TorusGeometry(radius, tube, 6, 80),
    material,
    parent,
    0,
    y,
  );
  m.rotation.x = Math.PI / 2;
  return m;
}
function orb(
  parent: T.Object3D,
  material: T.Material,
  p: number[],
  scale: number[],
) {
  const m = mesh(
    new T.SphereGeometry(1, 16, 12),
    material,
    parent,
    ...(p as [number, number, number]),
  );
  m.scale.set(...(scale as [number, number, number]));
  return m;
}
function taper(
  parent: T.Object3D,
  points: T.Vector3[],
  radius: number,
  material: T.Material,
) {
  const geo = new T.TubeGeometry(
    new T.CatmullRomCurve3(points),
    14,
    radius,
    6,
    false,
  );
  const positions = geo.attributes.position;
  const curve = new T.CatmullRomCurve3(points);
  for (let i = 0; i <= 14; i++) {
    const center = curve.getPointAt(i / 14),
      factor = Math.max(0.045, 1 - Math.pow(i / 14, 2.5));
    for (let j = 0; j <= 6; j++) {
      const at = i * 7 + j;
      const v = new T.Vector3()
        .fromBufferAttribute(positions, at)
        .sub(center)
        .multiplyScalar(factor)
        .add(center);
      positions.setXYZ(at, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return mesh(geo, material, parent);
}
const V = (x: number, y: number, z: number) => new T.Vector3(x, y, z);

/** Original articulated mesh sculptures: each silhouette has its own hair, clothing and weapon.
 * Local joint pivots are animated, not flat portraits or camera-facing sprites. */
export function createCelestial(index: number, accent: string) {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const cloth = new T.MeshStandardMaterial({
    color: accent,
    roughness: 0.52,
    metalness: 0.18,
    side: T.DoubleSide,
  });
  const hair = new T.MeshStandardMaterial({
    color: ["#e7d4a5", "#e5c3cd", "#302938", "#b5cbdc", "#d2d5dc"][index],
    roughness: 0.46,
    metalness: 0.15,
  });
  const glow = new T.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.1,
    metalness: 0.3,
    roughness: 0.25,
  });
  const torso = new T.Group();
  torso.position.y = 1.15;
  body.add(torso);
  mesh(
    new T.LatheGeometry(
      [
        new T.Vector2(0.14, 0),
        new T.Vector2(0.115, 0.12),
        new T.Vector2(0.165, 0.3),
        new T.Vector2(0.19, 0.36),
        new T.Vector2(0.09, 0.4),
      ],
      24,
    ),
    index % 2 ? ivory : dark,
    torso,
  );
  // Tailored breastplate, gold piping and collar.
  orb(torso, cloth, [0, 0.22, 0.08], [0.15, 0.19, 0.075]);
  ring(torso, 0.133, 0.018, gold, 0.075);
  mesh(new T.CylinderGeometry(0.085, 0.105, 0.07, 16), gold, torso, 0, 0.4);
  mesh(new T.OctahedronGeometry(0.06), glow, torso, 0, 0.28, 0.155);
  const head = new T.Group();
  head.position.y = 0.54;
  torso.add(head);
  mesh(new T.CylinderGeometry(0.046, 0.055, 0.14, 12), skin, head, 0, -0.1);
  orb(head, skin, [0, 0.08, 0], [0.135, 0.173, 0.119]);
  orb(head, hair, [0, 0.115, -0.035], [0.148, 0.175, 0.107]);
  // Small eyes and lashes visible in attack closeups.
  for (const side of [-1, 1]) {
    orb(head, ivory, [side * 0.051, 0.085, 0.108], [0.034, 0.017, 0.008]);
    orb(head, dark, [side * 0.052, 0.085, 0.117], [0.013, 0.016, 0.005]);
    const lash = mesh(
      new T.BoxGeometry(0.063, 0.007, 0.008),
      dark,
      head,
      side * 0.052,
      0.104,
      0.111,
    );
    lash.rotation.z = -side * 0.08;
  }
  orb(head, skin, [0, 0.055, 0.12], [0.013, 0.028, 0.015]);
  const lip = new T.MeshStandardMaterial({ color: "#b87b83", roughness: 0.65 });
  orb(head, lip, [0, 0.002, 0.105], [0.025, 0.005, 0.005]);
  for (let strand = 0; strand < 9; strand++) {
    const a = (strand / 8 - 0.5) * 2.7;
    taper(
      head,
      [
        V(Math.sin(a) * 0.115, 0.22, 0.04),
        V(Math.sin(a) * 0.14, 0.16, 0.085),
        V(Math.sin(a) * 0.13, 0.04 + Math.abs(a) * 0.025, 0.115),
      ],
      0.033,
      hair,
    );
  }
  const locks = new T.Group();
  head.add(locks);
  for (let strand = 0; strand < 9; strand++) {
    const a = (strand / 8 - 0.5) * 2.6,
      x = Math.sin(a) * 0.125,
      z = -0.055 - Math.cos(a) * 0.08;
    const length = index === 2 ? 0.78 : index === 1 ? 0.46 : 0.88;
    taper(
      locks,
      [
        V(x, 0.19, z),
        V(x * 1.3, -0.1, z - 0.015),
        V(x * 1.7, -length * 0.65, z - 0.04),
        V(x * 1.9 + 0.035, -length, z - 0.14),
      ],
      0.049,
      hair,
    );
  }
  // Radial circlet and asymmetric ear ornament.
  const crown = ring(head, 0.158, 0.009, gold, 0.21);
  crown.rotation.x = Math.PI / 2 - 0.12;
  for (let i = 0; i < 5; i++) {
    const jewel = mesh(
      new T.OctahedronGeometry(0.029),
      gold,
      head,
      (i - 2) * 0.044,
      0.258 - Math.abs(i - 2) * 0.014,
      0.09,
    );
    jewel.scale.y = 1.8;
  }
  mesh(new T.OctahedronGeometry(0.026), glow, head, -0.15, 0.035, 0).scale.y =
    2;
  // Split skirt panels modeled with curved cloth surfaces, with a separate gold edge.
  const skirt = new T.Group();
  skirt.position.y = 1.16;
  body.add(skirt);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const shape = new T.Shape();
    shape.moveTo(-0.066, 0);
    shape.quadraticCurveTo(-0.13, -0.35, -0.15, -0.57);
    shape.lineTo(0.04, -0.72);
    shape.quadraticCurveTo(0.15, -0.33, 0.07, 0);
    shape.closePath();
    const panel = mesh(
      new T.ExtrudeGeometry(shape, {
        depth: 0.012,
        bevelEnabled: true,
        bevelSize: 0.007,
        bevelThickness: 0.004,
        bevelSegments: 1,
        steps: 1,
      }),
      i % 3 === 0 ? ivory : cloth,
      skirt,
    );
    panel.position.set(Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15);
    panel.rotation.y = a;
    panel.rotation.x = -0.22;
    taper(
      panel,
      [
        V(-0.066, 0, 0.017),
        V(-0.112, -0.34, 0.017),
        V(-0.15, -0.57, 0.017),
        V(0.04, -0.72, 0.017),
      ],
      0.009,
      gold,
    );
  }
  const legs: T.Group[] = [],
    arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.092, 1.12, 0);
    body.add(leg);
    legs.push(leg);
    orb(leg, skin, [0, -0.25, 0], [0.066, 0.27, 0.069]);
    orb(leg, dark, [0, -0.74, -0.005], [0.055, 0.25, 0.059]);
    orb(leg, gold, [0, -0.5, 0.043], [0.062, 0.065, 0.02]);
    orb(leg, dark, [0, -1.025, 0.044], [0.057, 0.052, 0.115]);
    taper(
      leg,
      [V(0, -0.55, 0.055), V(0.016, -0.8, 0.053), V(0, -1, 0.067)],
      0.01,
      gold,
    );
    const arm = new T.Group();
    arm.position.set(side * 0.205, 0.32, 0);
    torso.add(arm);
    arms.push(arm);
    arm.rotation.z = side * 0.12;
    orb(arm, ivory, [0, -0.025, 0], [0.082, 0.084, 0.089]);
    orb(arm, skin, [0, -0.2, 0], [0.045, 0.18, 0.044]);
    orb(arm, cloth, [0, -0.42, 0.025], [0.052, 0.13, 0.056]);
    ring(arm, 0.052, 0.011, gold, -0.51);
    orb(arm, skin, [0, -0.59, 0.025], [0.036, 0.065, 0.032]);
  }
  const weapon = new T.Group();
  weapon.position.set(0, -0.57, 0.03);
  arms[1].add(weapon);
  if (index === 0) {
    const shield = mesh(
      new T.CylinderGeometry(0.28, 0.28, 0.05, 6),
      gold,
      weapon,
      0,
      -0.04,
      0.07,
    );
    shield.rotation.x = Math.PI / 2;
    const face = mesh(
      new T.CylinderGeometry(0.245, 0.245, 0.055, 6),
      ivory,
      weapon,
      0,
      -0.04,
      0.075,
    );
    face.rotation.x = Math.PI / 2;
    mesh(new T.OctahedronGeometry(0.1), glow, weapon, 0, -0.04, 0.12);
  } else if (index === 2 || index === 3) {
    mesh(new T.CylinderGeometry(0.025, 0.025, 0.24, 8), dark, weapon);
    mesh(new T.BoxGeometry(0.29, 0.035, 0.055), gold, weapon, 0, -0.11);
    const blade = mesh(
      new T.ConeGeometry(0.08, 0.92, 4),
      ivory,
      weapon,
      0,
      -0.6,
    );
    blade.rotation.z = Math.PI;
    blade.scale.z = 0.28;
    taper(
      weapon,
      [V(0, -0.18, 0.017), V(0, -0.62, 0.017), V(0, -1.06, 0.017)],
      0.009,
      glow,
    );
  } else {
    mesh(new T.CylinderGeometry(0.018, 0.023, 1.45, 12), gold, weapon, 0, 0.13);
    const hoop = mesh(
      new T.TorusGeometry(0.17, 0.015, 6, 32),
      gold,
      weapon,
      0,
      0.94,
    );
    mesh(new T.OctahedronGeometry(0.095), glow, hoop).scale.y = 1.6;
    for (let k = 0; k < 6; k++)
      mesh(
        new T.OctahedronGeometry(0.036),
        gold,
        hoop,
        Math.cos((k * Math.PI) / 3) * 0.21,
        Math.sin((k * Math.PI) / 3) * 0.21,
      );
  }
  return { root, body, torso, arms, legs, locks, skirt, weapon, head };
}

export function createAstralGuardian() {
  const root = new T.Group(),
    heart = new T.Group();
  root.add(heart);
  const luminous = new T.MeshStandardMaterial({
    color: "#d4efff",
    emissive: "#84c7ff",
    emissiveIntensity: 2,
    metalness: 0.5,
    roughness: 0.2,
  });
  const core = mesh(new T.IcosahedronGeometry(0.56, 2), luminous, heart);
  for (let i = 0; i < 3; i++) {
    const orbit = mesh(new T.TorusGeometry(0.69, 0.045, 8, 80), gold, heart);
    orbit.rotation.set(i * 1.05, i * 0.7, 0.3);
  }
  mesh(new T.OctahedronGeometry(0.27), luminous, heart, 0, 0, 0.48);
  const wings: T.Group[] = [];
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    root.add(wing);
    wings.push(wing);
    for (let j = 0; j < 3; j++) {
      const plate = new T.Group();
      plate.position.set(side * (0.78 + j * 0.42), 0.35 - j * 0.23, j * 0.1);
      plate.rotation.z = side * (-0.3 - j * 0.13);
      wing.add(plate);
      const outline = mesh(
        new T.ConeGeometry(0.25 - j * 0.02, 2 - j * 0.17, 4),
        gold,
        plate,
      );
      outline.scale.z = 0.36;
      outline.rotation.z = Math.PI;
      const surface = mesh(
        new T.ConeGeometry(0.205 - j * 0.02, 1.82 - j * 0.17, 4),
        ivory,
        plate,
        0,
        0.03,
        0.035,
      );
      surface.scale.z = 0.25;
      surface.rotation.z = Math.PI;
      mesh(new T.OctahedronGeometry(0.1), luminous, plate, 0, 0.35, 0.12);
      taper(
        plate,
        [V(0, 0.2, 0.1), V(0, -0.32, 0.08), V(0, -0.84, 0.01)],
        0.016,
        gold,
      );
    }
  }
  const tip = mesh(new T.ConeGeometry(0.35, 1.3, 4), ivory, root, 0, -1.0);
  tip.rotation.z = Math.PI;
  tip.scale.z = 0.35;
  const crest = mesh(new T.ConeGeometry(0.29, 0.95, 4), gold, root, 0, 0.98);
  crest.scale.z = 0.45;
  mesh(new T.OctahedronGeometry(0.15), luminous, root, 0, 0.91, 0.1);
  const halo = ring(root, 1.15, 0.025, gold, 1.47);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    mesh(
      new T.OctahedronGeometry(0.075),
      gold,
      root,
      Math.cos(a) * 1.15,
      1.47,
      Math.sin(a) * 1.15,
    );
  }
  return { root, heart, core, halo, wings };
}

export function createArena(scene: T.Scene) {
  const root = new T.Group();
  scene.add(root);
  const marble = new T.TextureLoader().load("/assets/astral-marble.png");
  marble.colorSpace = T.SRGBColorSpace;
  marble.wrapS = marble.wrapT = T.RepeatWrapping;
  marble.repeat.set(6, 6);
  const stone = new T.MeshStandardMaterial({
    color: "#939eae",
    map: marble,
    roughness: 0.43,
    metalness: 0.3,
  });
  const floor = mesh(
    new T.CylinderGeometry(9, 9.2, 0.32, 96),
    stone,
    root,
    0,
    -0.2,
  );
  floor.receiveShadow = true;
  const etch = new T.MeshStandardMaterial({
    color: "#bcaa83",
    emissive: "#675a36",
    emissiveIntensity: 0.25,
    metalness: 0.7,
    roughness: 0.3,
  });
  for (const r of [2.7, 2.75, 5.3, 5.35, 7.7, 7.78, 8.7])
    ring(root, r, 0.012, etch, -0.027);
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24;
    const tick = mesh(
      new T.BoxGeometry(0.024, 0.012, i % 4 === 0 ? 0.38 : 0.15),
      etch,
      root,
      Math.sin(a) * 8.2,
      -0.02,
      Math.cos(a) * 8.2,
    );
    tick.rotation.y = a;
    if (i % 4 === 0) {
      const tile = mesh(
        new T.BoxGeometry(0.014, 0.009, 2.15),
        etch,
        root,
        Math.sin(a) * 6.45,
        -0.027,
        Math.cos(a) * 6.45,
      );
      tile.rotation.y = a;
    }
  }
  // Outer architectural columns are real meshes and reveal parallax as the camera moves.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const column = new T.Group();
    column.position.set(Math.sin(a) * 13, -1, Math.cos(a) * 13);
    root.add(column);
    mesh(new T.CylinderGeometry(0.28, 0.43, 5.8, 8), ivory, column, 0, 2);
    for (const y of [-0.8, -0.5, 3.9, 4.7, 4.9])
      mesh(new T.CylinderGeometry(0.53, 0.53, 0.1, 8), gold, column, 0, y);
    mesh(new T.ConeGeometry(0.4, 1.1, 8), ivory, column, 0, 5.4);
  }
  return root;
}
