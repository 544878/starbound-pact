import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Companion } from '../domain/types'
import { isGround, enemyPosition, type Defense } from '../systems/defense'
interface Props {
  game: Defense
  companions: Companion[]
  selected: [number, number] | null
  onSelect: (x: number, y: number) => void
  angle: number
}
export function Battlefield3D({
  game,
  companions,
  selected,
  onSelect,
  angle,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ game, companions, selected, onSelect, angle })
  latest.current = { game, companions, selected, onSelect, angle }
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-6, 6, 4, -4, 0.1, 100)
    const light = new THREE.DirectionalLight(0xfff1cc, 1.8)
    light.position.set(-4, 12, 6)
    light.castShadow = true
    light.shadow.mapSize.set(1024, 1024)
    light.shadow.camera.left = -8
    light.shadow.camera.right = 8
    light.shadow.camera.top = 8
    light.shadow.camera.bottom = -8
    scene.add(light, new THREE.AmbientLight(0xc5e2d7, 1.5))
    const terrain = new THREE.TextureLoader().load(
      '/assets/terrain-atlas.png',
      () =>
        terrainMaps.forEach((t) => {
          t.needsUpdate = true
        }),
    )
    terrain.colorSpace = THREE.SRGBColorSpace
    const terrainMaps = Array.from({ length: 6 }, (_, i) => {
      const t = terrain.clone()
      t.needsUpdate = true
      t.repeat.set(1 / 3, 1 / 2)
      t.offset.set((i % 3) / 3, i < 3 ? 0.5 : 0)
      return t
    })
    const terrainMats = terrainMaps.map(
      (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.9 }),
    )
    const tiles: THREE.Mesh[] = []
    const geometry = new THREE.BoxGeometry(0.96, 0.35, 0.96)
    const materials = new Map<string, THREE.MeshStandardMaterial>()
    const mat = (color: string) => {
      if (!materials.has(color))
        materials.set(
          color,
          new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
        )
      return materials.get(color)!
    }
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 9; x++) {
        const start = x === 0 && y === 2,
          end = x === 8 && y === 3
        const top = terrainMats[start ? 4 : end ? 5 : isGround(x, y) ? 0 : 1]
        const side = terrainMats[3]
        const tile = new THREE.Mesh(geometry, [
          side,
          side,
          top,
          side,
          side,
          side,
        ])
        tile.position.set(x - 4, isGround(x, y) ? -0.2 : 0.04, y - 2)
        tile.receiveShadow = true
        tile.castShadow = true
        tile.userData = { x, y }
        scene.add(tile)
        tiles.push(tile)
      }
    const outline = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.04, 1.02),
      new THREE.MeshBasicMaterial({ color: 0xf4d688 }),
    )
    scene.add(outline)
    const loader = new THREE.TextureLoader()
    const atlas = loader.load('/assets/character-sprites-v3.png', () =>
      sprites.forEach((e, key) => {
        if (key.startsWith('o')) e.texture.needsUpdate = true
      }),
    )
    atlas.colorSpace = THREE.SRGBColorSpace
    const enemies = loader.load('/assets/enemy-atlas.png', () =>
      sprites.forEach((e, key) => {
        if (key.startsWith('e')) e.texture.needsUpdate = true
      }),
    )
    enemies.colorSpace = THREE.SRGBColorSpace
    const sprites = new Map<
      string,
      {
        sprite: THREE.Sprite
        bar: THREE.Mesh
        texture: THREE.Texture
        material: THREE.SpriteMaterial
        barMaterial: THREE.MeshBasicMaterial
      }
    >()
    const barGeo = new THREE.PlaneGeometry(0.75, 0.055)
    function getSprite(key: string, c?: Companion) {
      let entry = sprites.get(key)
      if (entry) return entry
      const texture = (c ? atlas : enemies).clone()
      texture.needsUpdate = true
      const pos = c ? c.artPosition.split(' ').map(parseFloat) : [0, 0]
      texture.repeat.set(1 / 3, 1 / 2)
      texture.offset.set(((pos[0] / 100) * 2) / 3, pos[1] === 100 ? 0 : 0.5)
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.08,
      })
      if (c)
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            '#include <map_fragment>\nif(distance(diffuseColor.rgb,vec3(0.8796,0.8632,0.7991)) < 0.045) discard;',
          )
        }
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(c ? 0.85 : 0.65, c ? 1.4 : 0.65, 1)
      const barMaterial = new THREE.MeshBasicMaterial({
        color: c ? 0x498d6a : 0xbf5d58,
        depthTest: false,
      })
      const bar = new THREE.Mesh(barGeo, barMaterial)
      bar.renderOrder = 10
      scene.add(sprite, bar)
      entry = { sprite, bar, texture, material, barMaterial }
      sprites.set(key, entry)
      return entry
    }
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2()
    function select(event: PointerEvent) {
      const box = renderer.domElement.getBoundingClientRect()
      pointer.set(
        ((event.clientX - box.left) / box.width) * 2 - 1,
        (-(event.clientY - box.top) / box.height) * 2 + 1,
      )
      ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObjects(tiles)[0]
      if (hit) {
        const { x, y } = hit.object.userData
        latest.current.onSelect(x, y)
      }
    }
    renderer.domElement.addEventListener('pointerup', select)
    const resize = new ResizeObserver(() => {
      const width = el.clientWidth,
        height = el.clientHeight
      renderer.setSize(width, height)
      const aspect = width / Math.max(1, height)
      const halfWidth = Math.max(5.6, aspect * 3.7)
      camera.left = -halfWidth
      camera.right = halfWidth
      camera.top = halfWidth / aspect
      camera.bottom = -halfWidth / aspect
      camera.updateProjectionMatrix()
    })
    resize.observe(el)
    let frame = 0
    function render() {
      const {
        game: g,
        companions: chars,
        selected: tile,
        angle: a,
      } = latest.current
      camera.position.set(Math.sin(a) * 9, 10, Math.cos(a) * 9)
      camera.lookAt(0, 0, 0)
      outline.visible = !!tile
      if (tile)
        outline.position.set(
          tile[0] - 4,
          isGround(...tile) ? 0 : 0.24,
          tile[1] - 2,
        )
      const active = new Set<string>()
      for (const o of g.operators) {
        const key = 'o' + o.id
        active.add(key)
        const e = getSprite(
          key,
          chars.find((c) => c.id === o.id),
        )
        e.sprite.position.set(o.x - 4, isGround(o.x, o.y) ? 0.65 : 0.9, o.y - 2)
        e.bar.position
          .copy(e.sprite.position)
          .add(new THREE.Vector3(0, 0.85, 0))
        e.bar.scale.x = Math.max(0.01, o.hp / o.stats.hp)
      }
      for (const enemy of g.enemies) {
        const key = 'e' + enemy.id
        active.add(key)
        const e = getSprite(key)
        const p = enemyPosition(enemy)
        e.sprite.position.set(p.x - 4, 0.3, p.y - 2)
        e.bar.position.copy(e.sprite.position).add(new THREE.Vector3(0, 0.5, 0))
        e.bar.scale.x = Math.max(0.01, enemy.hp / enemy.maxHp)
      }
      for (const [key, e] of sprites) {
        if (!active.has(key)) {
          scene.remove(e.sprite, e.bar)
          e.texture.dispose()
          e.material.dispose()
          e.barMaterial.dispose()
          sprites.delete(key)
        } else e.bar.quaternion.copy(camera.quaternion)
      }
      if (terrain.image && atlas.image && enemies.image) renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    render()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      renderer.domElement.removeEventListener('pointerup', select)
      for (const e of sprites.values()) {
        e.texture.dispose()
        e.material.dispose()
        e.barMaterial.dispose()
      }
      atlas.dispose()
      enemies.dispose()
      geometry.dispose()
      barGeo.dispose()
      outline.geometry.dispose()
      ;(outline.material as THREE.Material).dispose()
      materials.forEach((m) => m.dispose())
      terrain.dispose()
      terrainMaps.forEach((t) => t.dispose())
      terrainMats.forEach((m) => m.dispose())
      renderer.dispose()
      el.replaceChildren()
    }
  }, [])
  return (
    <div className="battlefield-3d" ref={host} aria-label="可点击地块的3D战场">
      {failed && <p>此设备无法启用 WebGL，请使用下方战术网格部署。</p>}
    </div>
  )
}

