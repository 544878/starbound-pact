import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import * as THREE from "three";

// Reproducible original models, exported from the exact geometry used by the game.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const source = await fs.readFile("src/components/astralModels.ts", "utf8");
const threeUrl = pathToFileURL(
  path.resolve("node_modules/three/build/three.module.js"),
).href;
const js = stripTypeScriptTypes(source, { mode: "strip" }).replace(
  /from ['"]three['"]/,
  `from '${threeUrl}'`,
);
const { createCelestial, createAstralGuardian } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
await fs.mkdir("public/assets/models", { recursive: true });
const names = ["guardian", "healer", "striker", "mage", "specialist"];
const colors = ["#d4aa57", "#e990a4", "#776693", "#67a9df", "#72b893"];
for (let i = 0; i < 6; i++) {
  const model = i < 5 ? createCelestial(i, colors[i]) : createAstralGuardian();
  let id = 0;
  model.root.traverse((node) => {
    node.name = `node_${id++}`;
  });
  const target = i < 5 ? model.body : model.heart;
  const idle = new THREE.AnimationClip("Idle", 2, [
    new THREE.VectorKeyframeTrack(
      `${target.name}.position`,
      [0, 1, 2],
      [0, 0, 0, 0, 0.025, 0, 0, 0, 0],
    ),
  ]);
  const clips = [idle];
  if (i < 5) {
    const pivot = model.arms[1],
      q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.7, 0, -0.12));
    clips.push(
      new THREE.AnimationClip("Attack", 1, [
        new THREE.QuaternionKeyframeTrack(
          `${pivot.name}.quaternion`,
          [0, 0.4, 1],
          [0, 0, 0, 1, q.x, q.y, q.z, q.w, 0, 0, 0, 1],
        ),
      ]),
    );
  }
  model.root.updateMatrixWorld(true);
  const data = await new GLTFExporter().parseAsync(model.root, {
    binary: true,
    animations: clips,
  });
  const filename = `public/assets/models/${i < 5 ? names[i] : "astral-guardian"}.glb`;
  await fs.writeFile(filename, Buffer.from(data));
  console.log(`${filename}: ${(data.byteLength / 1024).toFixed(0)} KB`);
}
