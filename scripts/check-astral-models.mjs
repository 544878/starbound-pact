import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
for (const name of await fs.readdir('public/assets/models')) {
  if (!name.endsWith('.glb')) continue;
  const bytes = await fs.readFile(`public/assets/models/${name}`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  let meshes = 0;
  model.scene.traverse(o => { if (o.isMesh) { meshes++; assert.ok(o.geometry.attributes.position.count > 0) } });
  assert.ok(meshes > 20); assert.ok(model.animations.some(a => a.name === 'Idle'));
  if (name !== 'astral-guardian.glb') assert.ok(model.animations.some(a => a.name === 'Attack'));
  console.log(`${name}: ${meshes} meshes, ${model.animations.length} animations, valid`);
}
