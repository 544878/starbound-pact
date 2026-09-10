import { useEffect, useRef, useState } from "react";
import * as T from "three";
import CameraControls from "camera-controls";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  createArena,
  createAstralGuardian,
  createCelestial,
  ring,
} from "./astralModels";
import {
  PATH_COLORS,
  type AstralBattle,
  type BattleEvent,
} from "../systems/astralBattle";

CameraControls.install({ THREE: T });
export interface PerformanceCue {
  event: BattleEvent;
  started: number;
  duration: number;
  token: number;
}
export const FORMATION_POSITIONS = [
  [-2.5, 0, -0.85],
  [-4.0, 0, 1.2],
  [-1.55, 0, 2.65],
  [0.15, 0, 0.8],
  [-0.85, 0, -1.3],
];
export default function AstralStage({
  battle,
  cue,
  overview,
  reduced,
  onReady,
}: {
  battle: AstralBattle;
  cue: PerformanceCue | null;
  overview: boolean;
  reduced: boolean;
  onReady: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ battle, cue, overview, reduced, onReady });
  latest.current = { battle, cue, overview, reduced, onReady };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      latest.current.onReady();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute(
      "aria-label",
      "五人星阵与星骸守阵者的实时三维战场",
    );
    renderer.domElement.setAttribute("role", "img");
    el.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.fog = new T.FogExp2("#24364c", 0.018);
    const camera = new T.PerspectiveCamera(39, 1, 0.1, 80);
    const controls = new CameraControls(camera, renderer.domElement);
    controls.smoothTime = 0.42;
    controls.mouseButtons.left = CameraControls.ACTION.NONE;
    controls.mouseButtons.right = CameraControls.ACTION.NONE;
    controls.mouseButtons.wheel = CameraControls.ACTION.NONE;
    controls.mouseButtons.middle = CameraControls.ACTION.NONE;
    controls.touches.one = CameraControls.ACTION.NONE;
    controls.touches.two = CameraControls.ACTION.NONE;
    controls.touches.three = CameraControls.ACTION.NONE;
    const home = () => {
      const narrow = el.clientWidth < 700,
        medium = el.clientWidth < 1100;
      void controls.setLookAt(
        narrow ? 5 : 6.5,
        narrow ? 8.6 : 5.0,
        narrow ? 17 : medium ? 14 : 11.2,
        0.1,
        1.1,
        0.25,
        true,
      );
    };
    void controls.setLookAt(10, 8, 15, -0.5, 0.9, 0.35, false);
    home();
    scene.add(new T.HemisphereLight("#d4e5ff", "#77778a", 2.5));
    const moon = new T.DirectionalLight("#dceaff", 3.2);
    moon.position.set(-5, 9, 5);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -9;
    moon.shadow.camera.right = 9;
    moon.shadow.camera.top = 9;
    moon.shadow.camera.bottom = -9;
    moon.shadow.normalBias = 0.04;
    scene.add(moon);
    const edge = new T.DirectionalLight("#efc888", 2.5);
    edge.position.set(4, 5, -6);
    scene.add(edge);
    const pulseLight = new T.PointLight("#badfff", 0, 9);
    scene.add(pulseLight);
    createArena(scene);
    const actors = latest.current.battle.units.map((u, i) => {
      const actor = createCelestial(i, u.companion.accent);
      actor.root.position.fromArray(FORMATION_POSITIONS[i]);
      actor.root.rotation.y = Math.atan2(
        2.8 - actor.root.position.x,
        -3 - actor.root.position.z,
      );
      actor.root.scale.setScalar(1.18);
      scene.add(actor.root);
      return actor;
    });
    const guardian = createAstralGuardian();
    guardian.root.position.set(2.6, 2.8, -2.7);
    guardian.root.rotation.y = -0.28;
    scene.add(guardian.root);
    const formationMaterial = new T.MeshBasicMaterial({
      color: PATH_COLORS[latest.current.battle.path],
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const nodes = FORMATION_POSITIONS.map((p) => {
      const g = new T.Group();
      g.position.fromArray(p);
      g.position.y = 0.017;
      scene.add(g);
      ring(g, 0.48, 0.013, formationMaterial);
      ring(g, 0.39, 0.007, formationMaterial);
      for (let k = 0; k < 4; k++) {
        const star = new T.Mesh(
          new T.PlaneGeometry(0.085, 0.085),
          formationMaterial,
        );
        star.rotation.x = -Math.PI / 2;
        star.rotation.z = Math.PI / 4;
        star.position.set(
          Math.cos((k * Math.PI) / 2) * 0.48,
          0.01,
          Math.sin((k * Math.PI) / 2) * 0.48,
        );
        g.add(star);
      }
      return g;
    });
    const lineMat = new T.LineBasicMaterial({
      color: PATH_COLORS[latest.current.battle.path],
      transparent: true,
      opacity: 0.45,
    });
    const lines: { line: T.Line; a: number; b: number }[] = [];
    for (const [a, b] of [
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
      [4, 2],
      [4, 3],
    ]) {
      const geo = new T.BufferGeometry().setFromPoints([
        new T.Vector3().fromArray(FORMATION_POSITIONS[a]).setY(0.025),
        new T.Vector3().fromArray(FORMATION_POSITIONS[b]).setY(0.025),
      ]);
      const line = new T.Line(geo, lineMat);
      scene.add(line);
      lines.push({ line, a, b });
    }
    const activeRing = ring(
      scene,
      0.6,
      0.021,
      new T.MeshBasicMaterial({
        color: "#fff0bf",
        transparent: true,
        opacity: 0.9,
      }),
      0.025,
    );
    const impactMat = new T.MeshBasicMaterial({
      color: "#ffe7ab",
      transparent: true,
      opacity: 0,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const impact = new T.Mesh(new T.RingGeometry(0.6, 0.67, 64), impactMat);
    scene.add(impact);
    const beamMat = new T.LineBasicMaterial({
      color: "#e5f8ff",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const beam = new T.Line(
      new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
      beamMat,
    );
    scene.add(beam);
    const particlesGeo = new T.BufferGeometry(),
      particles = new Float32Array(160 * 3);
    particlesGeo.setAttribute("position", new T.BufferAttribute(particles, 3));
    const particleMat = new T.PointsMaterial({
      color: "#ffe8b1",
      size: 0.055,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const points = new T.Points(particlesGeo, particleMat);
    points.frustumCulled = false;
    scene.add(points);
    const starsGeo = new T.BufferGeometry(),
      stars = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      stars[i * 3] = Math.sin(i * 17.3) * 12;
      stars[i * 3 + 1] = (Math.sin(i * 3.1) + 1) * 4 + 0.4;
      stars[i * 3 + 2] = Math.cos(i * 11.1) * 12;
    }
    starsGeo.setAttribute("position", new T.BufferAttribute(stars, 3));
    const motes = new T.Points(
      starsGeo,
      new T.PointsMaterial({
        color: "#d9e8ff",
        size: 0.022,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    scene.add(motes);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new T.Vector2(512, 512), 0.3, 0.4, 1.15);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // Keep transparent CSS sky behind the main renderer; bloom is used only when rendering opaque sky is ready.
    const sky = new T.TextureLoader().load("/assets/astral-sky.png");
    sky.colorSpace = T.SRGBColorSpace;
    scene.background = sky;
    const resize = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      composer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      home();
    });
    resize.observe(el);
    let raf = 0,
      previous = performance.now(),
      previousCue = -1,
      cameraKey = "",
      disposed = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    const render = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const {
        battle: b,
        cue: c,
        overview: full,
        reduced: calm,
      } = latest.current;
      const p = c ? Math.min(1, (now - c.started) / c.duration) : 0,
        t = now / 1000;
      const firing = c && p < 1,
        actorId = firing ? c.event.actor : b.active;
      formationMaterial.color.set(PATH_COLORS[b.path]);
      lineMat.color.set(PATH_COLORS[b.path]);
      formationMaterial.opacity = 0.5 + (calm ? 0.1 : Math.sin(t * 1.8) * 0.16);
      lines.forEach(({ line, a, b: end }) => {
        line.visible = b.units[a]?.hp > 0 && b.units[end]?.hp > 0;
      });
      nodes.forEach((n, i) => {
        n.visible = b.units[i]?.hp > 0;
        if (!calm) n.rotation.y = t * 0.065;
      });
      const k = `${c?.token ?? 0}:${full}:${calm}:${b.outcome}`;
      if (k !== cameraKey) {
        cameraKey = k;
        if (
          !c ||
          full ||
          calm ||
          el.clientWidth < 700 ||
          b.outcome !== "playing"
        )
          home();
        else if (c.event.actor === 5)
          void controls.setLookAt(5.5, 5.1, 9.5, 0.6, 1.4, -0.6, true);
        else if (c.event.kind === "ultimate") {
          const a = FORMATION_POSITIONS[c.event.actor];
          void controls.setLookAt(
            a[0] + 3.1,
            2.6,
            a[2] + 4.5,
            a[0] + 0.6,
            1.3,
            a[2] - 0.3,
            true,
          );
        } else void controls.setLookAt(7.5, 5.1, 10, -0.2, 1, 0.1, true);
      }
      if (c?.token !== previousCue) {
        previousCue = c?.token ?? -1;
        impactMat.color.set(
          c?.event.actor === 5 ? "#f5a190" : PATH_COLORS[b.path],
        );
      }
      actors.forEach((a, i) => {
        const base = new T.Vector3().fromArray(FORMATION_POSITIONS[i]),
          acting = firing && actorId === i,
          alive = b.units[i]?.hp > 0;
        const attackPhase = acting
          ? Math.sin(Math.min(1, p / 0.7) * Math.PI)
          : 0;
        a.root.position.copy(base);
        if (acting && i !== 1 && i !== 4 && !calm)
          a.root.position.add(
            new T.Vector3(2.6 - base.x, 0, -2.7 - base.z)
              .normalize()
              .multiplyScalar(
                attackPhase * (c!.event.kind === "ultimate" ? 1.8 : 0.7),
              ),
          );
        a.body.position.y = alive && !calm ? Math.sin(t * 2 + i) * 0.018 : 0;
        a.body.rotation.z = alive ? 0 : -1.2;
        a.root.position.y = alive ? 0 : -0.13;
        a.arms.forEach((arm, side) => {
          arm.rotation.x = acting
            ? -attackPhase * (side ? 1.8 : 0.65)
            : (side ? -0.32 : -0.16) +
              (calm ? 0 : Math.sin(t * 1.7 + i) * 0.025);
          arm.rotation.z = side ? -0.18 : 0.24;
        });
        a.legs[0].rotation.x = -0.13 - attackPhase * 0.2;
        a.legs[1].rotation.x = 0.12 + attackPhase * 0.18;
        a.legs[0].rotation.z = 0.07;
        a.legs[1].rotation.z = -0.07;
        a.torso.rotation.y =
          acting && !calm ? Math.sin(p * Math.PI * 2) * 0.22 : 0;
        a.locks.rotation.x = calm
          ? 0
          : Math.sin(t * 1.7 + i) * 0.045 + attackPhase * 0.12;
        a.skirt.rotation.x = calm ? 0 : Math.sin(t * 1.2 + i) * 0.02;
      });
      activeRing.visible = actorId < 5 && b.outcome === "playing";
      if (actorId < 5) {
        activeRing.position.fromArray(FORMATION_POSITIONS[actorId]);
        activeRing.position.y = 0.04;
        activeRing.scale.setScalar(1 + (calm ? 0 : Math.sin(t * 3) * 0.045));
      }
      guardian.root.position.y = 2.8 + (calm ? 0 : Math.sin(t * 1.3) * 0.13);
      guardian.heart.rotation.z = calm ? 0 : Math.sin(t * 0.7) * 0.13;
      guardian.halo.rotation.z = calm ? 0 : t * 0.12;
      guardian.wings.forEach((w, i) => {
        w.rotation.y = (i ? -1 : 1) * (calm ? 0.03 : Math.sin(t * 1.7) * 0.08);
      });
      guardian.root.scale.setScalar(
        b.outcome === "win" ? Math.max(0, 1 - Math.max(0, p - 0.55) * 2.4) : 1,
      );
      guardian.root.visible = b.outcome !== "win" || !!firing;
      impactMat.opacity = 0;
      beamMat.opacity = 0;
      particleMat.opacity = 0;
      pulseLight.intensity = 0;
      if (firing && !calm) {
        const enemy = c.event.actor === 5,
          source = enemy
            ? guardian.root.position.clone()
            : actors[c.event.actor].root.position
                .clone()
                .add(new T.Vector3(0, 1.25, 0));
        const dest = enemy
          ? new T.Vector3(-1.5, 0.4, 0.6)
          : guardian.root.position.clone();
        const burst = Math.max(0, 1 - Math.abs(p - 0.5) * 5);
        pulseLight.position.copy(dest);
        pulseLight.intensity = burst * 18;
        pulseLight.color.set(PATH_COLORS[b.path]);
        impact.position.copy(dest);
        impact.lookAt(camera.position);
        impact.scale.setScalar(
          0.5 + Math.max(0, p - 0.35) * (c.event.kind === "ultimate" ? 9 : 4),
        );
        impactMat.opacity = burst * 0.85;
        beam.geometry.setFromPoints([
          source,
          dest.clone().lerp(source, Math.max(0, 1 - p * 2.8)),
        ]);
        beamMat.opacity = p > 0.2 && p < 0.52 ? 0.85 : 0;
        particleMat.opacity = burst;
        for (let i = 0; i < 160; i++) {
          const a = i * 2.399,
            r = Math.max(0, p - 0.32) * (2 + (i % 7)) * 0.7;
          particles[i * 3] = dest.x + Math.sin(a) * r;
          particles[i * 3 + 1] = dest.y + Math.cos(a * 1.3) * r;
          particles[i * 3 + 2] = dest.z + Math.cos(a) * r;
        }
        particlesGeo.attributes.position.needsUpdate = true;
        if (c.event.kind === "ultimate" && p > 0.6 && p < 0.64) home();
      }
      if (!calm) motes.rotation.y = t * 0.008;
      controls.update(dt);
      composer.render();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    latest.current.onReady();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      controls.dispose();
      bloom.dispose();
      composer.dispose();
      sky.dispose();
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      const materials = new Set<T.Material>(),
        geometries = new Set<T.BufferGeometry>();
      scene.traverse((o) => {
        const m = o as T.Mesh;
        if (m.geometry) geometries.add(m.geometry);
        if (m.material)
          (Array.isArray(m.material) ? m.material : [m.material]).forEach(
            (mat) => materials.add(mat),
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        const material = m as T.MeshStandardMaterial;
        material.map?.dispose();
        m.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div className="astral-stage" ref={host}>
      {failed ? (
        <div className="astral-render-error">
          三维画面暂不可用。请启用浏览器硬件加速后刷新；下方战斗操作仍可使用。
        </div>
      ) : null}
    </div>
  );
}
