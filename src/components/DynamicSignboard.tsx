import { useEffect, useRef, useState, useCallback } from 'react'
import type { Companion } from '../domain/types'
import { hasScenicArt, scenicSource } from './ScenicArt'
import { EquippedSkinArt } from './SkinMedia';
import { useGame } from '../state/GameContext';
import { equippedSkin } from '../systems/commerce';

export type SignboardStance = 'wide' | 'seated' | 'portrait' | 'chibi'

interface DynamicSignboardProps {
  companion: Companion
  onInteract?: () => void
  currentQuote?: string
  stance?: SignboardStance
  onStanceChange?: (stance: SignboardStance) => void
}

import { audioEngine } from '../audio/audioEngine'

// Synthesize crystal underwater chime using Web Audio API
function playAquaticChime() {
  if (!audioEngine.getSettings().sfxEnabled) return
  audioEngine.playSfx('heal')
}

export function DynamicSignboard({
  companion,
  onInteract,
  currentQuote,
  stance = 'wide',
  onStanceChange,
}: DynamicSignboardProps) {
  const { state } = useGame();
  const skin = equippedSkin(state, companion.id);
  const isSelene = companion.id === 'selene' && !skin;
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // 3D Parallax coordinates with smooth lerp
  const mouseRef = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0 })
  const [interactiveRipple, setInteractiveRipple] = useState<{
    x: number
    y: number
    key: number
  } | null>(null)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const hideTimerRef = useRef<number | null>(null)

  const resetQuoteTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = window.setTimeout(() => {
      setQuoteVisible(false)
    }, 8000)
  }, [])

  useEffect(() => {
    resetQuoteTimer()
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [resetQuoteTimer, currentQuote])

  // Handle pointer move for 3D parallax
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseRef.current.targetX = x * 2 // -1 to 1
    mouseRef.current.targetY = y * 2
  }, [])

  const handlePointerLeave = useCallback(() => {
    mouseRef.current.targetX = 0
    mouseRef.current.targetY = 0
  }, [])

  // Canvas particle system (bubbles, stardust, click shockwaves)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth)
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth || window.innerWidth
      height = canvas.height = canvas.offsetHeight || window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Particle types
    interface Particle {
      x: number
      y: number
      radius: number
      speedY: number
      speedX: number
      alpha: number
      maxAlpha: number
      wobbleSpeed: number
      wobbleDist: number
      type: 'bubble' | 'sparkle'
    }

    const particles: Particle[] = []
    const count = 48
    for (let i = 0; i < count; i++) {
      const isBubble = Math.random() > 0.4
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: isBubble ? Math.random() * 4 + 1.5 : Math.random() * 2 + 0.8,
        speedY: isBubble ? -(Math.random() * 0.8 + 0.3) : -(Math.random() * 0.3 + 0.1),
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.6 + 0.2,
        maxAlpha: Math.random() * 0.5 + 0.3,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        wobbleDist: Math.random() * 1.5 + 0.5,
        type: isBubble ? 'bubble' : 'sparkle',
      })
    }

    interface Shockwave {
      x: number
      y: number
      radius: number
      maxRadius: number
      alpha: number
    }
    const shockwaves: Shockwave[] = []

    let time = 0
    const render = () => {
      time += 0.02
      ctx.clearRect(0, 0, width, height)

      // Lerp mouse
      const m = mouseRef.current
      m.currentX += (m.targetX - m.currentX) * 0.06
      m.currentY += (m.targetY - m.currentY) * 0.06

      // Parallax offset for canvas particles
      const pxOffset = m.currentX * 15

      // Draw shockwaves
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s]
        sw.radius += 3.5
        sw.alpha *= 0.94
        if (sw.alpha < 0.01 || sw.radius > sw.maxRadius) {
          shockwaves.splice(s, 1)
          continue
        }
        ctx.save()
        ctx.beginPath()
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(130, 215, 255, ${sw.alpha})`
        ctx.lineWidth = 2
        ctx.shadowBlur = 10
        ctx.shadowColor = '#65d5ff'
        ctx.stroke()
        ctx.restore()
      }

      // Draw particles
      particles.forEach((p) => {
        p.y += p.speedY
        p.x += Math.sin(time * p.wobbleSpeed * 100) * p.wobbleDist * 0.2 + p.speedX

        if (p.y < -10) {
          p.y = height + 10
          p.x = Math.random() * width
        }
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10

        const drawX = p.x + pxOffset * (p.type === 'bubble' ? 0.8 : 1.2)
        ctx.save()
        ctx.beginPath()
        ctx.arc(drawX, p.y, p.radius, 0, Math.PI * 2)

        if (p.type === 'bubble') {
          // Luminous aquatic bubble
          ctx.strokeStyle = `rgba(175, 235, 255, ${p.alpha})`
          ctx.lineWidth = 1.2
          ctx.stroke()

          // Bubble highlight
          ctx.beginPath()
          ctx.arc(
            drawX - p.radius * 0.35,
            p.y - p.radius * 0.35,
            p.radius * 0.3,
            0,
            Math.PI * 2,
          )
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.9})`
          ctx.fill()
        } else {
          // Golden/Cyan stardust ember
          const isGold = p.radius > 1.5
          ctx.fillStyle = isGold
            ? `rgba(255, 226, 140, ${p.alpha})`
            : `rgba(150, 230, 255, ${p.alpha})`
          ctx.shadowBlur = 8
          ctx.shadowColor = isGold ? '#ffeaa7' : '#74b9ff'
          ctx.fill()
        }
        ctx.restore()
      })

      animId = requestAnimationFrame(render)
    }
    render()

    // Add shockwave on global click inside container
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      shockwaves.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        radius: 5,
        maxRadius: 120,
        alpha: 0.8,
      })
    }
    canvas.addEventListener('click', handleCanvasClick)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('click', handleCanvasClick)
      cancelAnimationFrame(animId)
    }
  }, [])

  // Interaction feedback
  const handleInteraction = (e: React.MouseEvent) => {
    e.stopPropagation()
    playAquaticChime()

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setInteractiveRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        key: Date.now(),
      })
    }

    setQuoteVisible(true)
    resetQuoteTimer()

    if (onInteract) {
      onInteract()
    }
  }

  const handleCloseQuote = (e: React.MouseEvent) => {
    e.stopPropagation()
    setQuoteVisible(false)
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }
  }

  // Calculate live 3D transform for character layer
  const m = mouseRef.current
  const rotX = (-m.currentY * 5).toFixed(2)
  const rotY = (m.currentX * 7).toFixed(2)
  const transX = (m.currentX * 16).toFixed(2)
  const transY = (m.currentY * 10).toFixed(2)

  return (
    <div
      ref={containerRef}
      className="dynamic-signboard-container"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Background Ambience Layer: Widescreen Seamless Canvas */}
      <div
        className="signboard-bg-layer"
        style={{
          transform: `scale(1.06) translate3d(${(-m.currentX * 10).toFixed(2)}px, ${(-m.currentY * 6).toFixed(2)}px, 0)`,
        }}
      >
        {isSelene ? (
          <div className="selene-widescreen-backdrop" />
        ) : (
          <div
            className="generic-companion-backdrop"
            style={{
              backgroundImage: skin ? `url(${skin.assets.illustration.src})` : hasScenicArt(companion.id)
                ? `url(${scenicSource(companion.id)})`
                : undefined,
            }}
          />
        )}
      </div>

      {/* God Rays & Caustic Light Shafts */}
      <div className="signboard-light-rays" />

      {/* Deep Ocean Whale Swimming Silhouette */}
      {isSelene && <div className="ambient-whale-shadow" />}

      {/* Dynamic Canvas Particles (Rising Bubbles, Twinkling Embers, Shockwaves) */}
      <canvas ref={canvasRef} className="signboard-particle-canvas" />

      {/* Character Live Stance Layer */}
      <div
        className={`signboard-character-stage stance-${stance}`}
        style={{
          transform: `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translate3d(${transX}px, ${transY}px, 0)`,
        }}
        onClick={handleInteraction}
      >
        <EquippedSkinArt characterId={companion.id} view={stance === 'portrait' ? 4 : stance === 'chibi' ? 3 : 0}>{isSelene ? (
          <div className="selene-character-wrapper">
            {stance === 'wide' && (
              <div className="selene-wide-focus-glow" />
            )}
            {stance === 'seated' && (
              <img
                src="/assets/characters/selene-seated.png"
                alt="瑟琳 · 溯海观测者"
                className="selene-seamless-art seated-art"
                loading="eager"
              />
            )}
            {stance === 'portrait' && (
              <img
                src="/assets/characters/selene-portrait.png"
                alt="瑟琳 · 凝眸"
                className="selene-seamless-art portrait-art"
                loading="eager"
              />
            )}
            {stance === 'chibi' && (
              <div className="chibi-hover-wrapper">
                <img
                  src="/assets/characters/selene-chibi.png"
                  alt="瑟琳 · Q版幻灵"
                  className="selene-seamless-art chibi-art"
                  loading="eager"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="other-companion-stage">
            {hasScenicArt(companion.id) ? (
              <svg
                className="scenic-art-seamless"
                viewBox="0 0 512 1024"
                preserveAspectRatio="xMidYMin slice"
              >
                <image
                  href={scenicSource(companion.id)}
                  width="1536"
                  height="1024"
                  preserveAspectRatio="none"
                />
              </svg>
            ) : (
              <img
                src={`/assets/characters/${companion.id}-sheet.png`}
                alt={companion.name}
                className="generic-sheet-art"
              />
            )}
          </div>
        )}

        </EquippedSkinArt>
        {/* Ambient Pulsing Aura at Character Base */}
        <div className="character-ambient-glow" />
      </div>

      {/* Interactive Ripple on Click */}
      {interactiveRipple && (
        <div
          key={interactiveRipple.key}
          className="interactive-click-ripple"
          style={{
            left: interactiveRipple.x,
            top: interactiveRipple.y,
          }}
        />
      )}

      {/* Interactive Floating Quote Bubble */}
      {currentQuote && quoteVisible && (
        <div
          className="signboard-quote-bubble visible"
          onClick={handleInteraction}
          title="点击倾听更多心声"
        >
          <div className="quote-tag">
            <span className="quote-sparkle">✦</span>
            <b>{companion.name}</b>
            <small>{companion.title}</small>
            <button
              type="button"
              className="quote-close-btn"
              onClick={handleCloseQuote}
              title="关闭气泡"
              aria-label="关闭气泡"
            >
              ✕
            </button>
          </div>
          <p className="quote-text">{currentQuote}</p>
          <span className="quote-hint">点击切语 · 伴你同行</span>
        </div>
      )}

      {/* Stance Selector Pill Controls */}
      {isSelene && onStanceChange && (
        <div className="stance-pill-selector" role="group" aria-label="立绘形态">
          <button
            className={stance === 'wide' ? 'active' : ''}
            onClick={() => onStanceChange('wide')}
            title="全景浸润模式"
          >
            🌌 全景
          </button>
          <button
            className={stance === 'seated' ? 'active' : ''}
            onClick={() => onStanceChange('seated')}
            title="典雅阅卷全身"
          >
            📖 阅卷
          </button>
          <button
            className={stance === 'portrait' ? 'active' : ''}
            onClick={() => onStanceChange('portrait')}
            title="温眸特写近景"
          >
            💙 凝眸
          </button>
          <button
            className={stance === 'chibi' ? 'active' : ''}
            onClick={() => onStanceChange('chibi')}
            title="萌趣幻灵形态"
          >
            ✨ 萌宠
          </button>
        </div>
      )}
    </div>
  )
}
