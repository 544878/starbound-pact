import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { MaterialArt } from './MaterialArt'

/** A real faceted star mesh; geometries and the rendering context are released on unmount. */
export default function StarCrystal() {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) } catch { setFailed(true); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); el.appendChild(renderer.domElement)
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 50)
    camera.position.set(0, .3, 6)
    scene.add(new THREE.HemisphereLight(0xdffff4, 0x324438, 3))
    const light = new THREE.DirectionalLight(0xffdf9d, 5); light.position.set(3, 4, 5); scene.add(light)
    const group = new THREE.Group(); scene.add(group)
    const vertices: number[] = []
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 4, next = angle + Math.PI / 4
      const radius = i % 2 ? .35 : i % 4 === 0 ? 1.3 : .95
      const nextRadius = (i + 1) % 2 ? .35 : (i + 1) % 4 === 0 ? 1.3 : .95
      const a = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0], b = [Math.cos(next) * nextRadius, Math.sin(next) * nextRadius, 0]
      vertices.push(...a, ...b, 0, 0, .4, ...b, ...a, 0, 0, -.4)
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals()
    const material = new THREE.MeshPhysicalMaterial({ color: 0x35cbb2, metalness: .55, roughness: .13, clearcoat: 1, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometry, material); group.add(mesh)
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xe7c675, metalness: .85, roughness: .22 })
    const inlay = new THREE.Mesh(geometry, goldMaterial); inlay.scale.set(.36, .36, .32); inlay.position.z = .38; group.add(inlay)
    const rearInlay = inlay.clone(); rearInlay.position.z = -.38; group.add(rearInlay)
    const edgeGeo = new THREE.EdgesGeometry(geometry), edgeMat = new THREE.LineBasicMaterial({ color: 0xe9c678 })
    group.add(new THREE.LineSegments(edgeGeo, edgeMat))
    const ringGeo = new THREE.TorusGeometry(1.3, .013, 8, 100), ringMat = new THREE.MeshStandardMaterial({ color: 0xd4b16c, metalness: .8, roughness: .25 })
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = 1.2; ring.rotation.y = .3; group.add(ring)
    const outerRing = ring.clone(); outerRing.scale.setScalar(1.08); outerRing.rotation.x = 1.45; outerRing.rotation.y = -.3; group.add(outerRing)
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix() }
    const observer = new ResizeObserver(resize); observer.observe(el); resize()
    let frame = 0, dragging = false, x = 0
    const down = (e: PointerEvent) => { dragging = true; x = e.clientX; el.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (dragging) { group.rotation.y += (e.clientX - x) * .015; x = e.clientX } }
    const up = () => { dragging = false }
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = (time: number) => { if (!reduced && !dragging) { group.rotation.y += .003; group.position.y = Math.sin(time / 1000) * .06 } renderer.render(scene, camera); frame = requestAnimationFrame(animate) }; frame = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); geometry.dispose(); material.dispose(); goldMaterial.dispose(); edgeGeo.dispose(); edgeMat.dispose(); ringGeo.dispose(); ringMat.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove() }
  }, [])
  return <div className="star-crystal-model" ref={host} role="img" aria-label="青金星晶立体模型，可拖动旋转">{failed && <MaterialArt name="星晶" size={140} />}<small>星晶 · 拖动旋转</small></div>
}
