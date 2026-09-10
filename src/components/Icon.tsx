import type { SVGProps } from 'react'

const paths: Record<string, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6"/></>,
  team: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.4-4.2 2.2-6.3 5.5-6.3s5.1 2.1 5.5 6.3M13 15c1-.8 2.2-1.2 3.6-1.2 2.9 0 4.5 2 4.9 5.5"/></>,
  paw: <><circle cx="12" cy="15" r="4.2"/><circle cx="6.2" cy="9" r="2"/><circle cx="10.2" cy="6" r="2"/><circle cx="14.4" cy="6" r="2"/><circle cx="18" cy="9.5" r="2"/></>,
  star: <path d="m12 2.5 2.6 6 6.4.6-4.9 4.2 1.5 6.2-5.6-3.3-5.6 3.3 1.5-6.2L3 9.1l6.4-.6L12 2.5Z"/>,
  bag: <><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
  bolt: <path d="m13 2-8 12h6l-1 8 9-13h-6V2Z"/>,
  coin: <><circle cx="12" cy="12" r="9"/><path d="M9 9.5c.4-2.2 5.5-2 5.5.6 0 3-5.5 1.8-5.5 4.5 0 2.5 5.2 2.9 6 .3M12 6v12"/></>,
  play: <path d="m8 5 11 7-11 7V5Z"/>,
  shield: <path d="M12 3 5 6v5c0 4.6 2.6 8 7 10 4.4-2 7-5.4 7-10V6l-7-3Z"/>,
  sword: <><path d="m14 4 6-1-1 6-9.5 9.5-4-4L14 4Z"/><path d="m4 20 4-4"/></>,
  sparkle: <><path d="M12 2 9.8 9.8 2 12l7.8 2.2L12 22l2.2-7.8L22 12l-7.8-2.2L12 2Z"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
  reset: <><path d="M4 7v5h5"/><path d="M5.5 16a8 8 0 1 0 .5-9l-2 5"/></>,
  shop: <><path d="M3 9 4.5 4h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/><path d="M10 20v-5h4v5"/></>,
  tower: <><path d="M4 21h16M7 21V10l5-7 5 7v11M10 10h4M10 14h4M10 18h4"/></>,
  scroll: <><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h11a2 2 0 0 0 2-2v-2H5a2 2 0 0 0 0 4h3z"/><path d="M8 7h6M8 11h8"/></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></>,
  trophy: <><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M6 3h12v7a6 6 0 0 1-12 0V3zM12 16v5M8 21h8"/></>,
  check: <path d="m5 12 5 5L20 7"/>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  mail: <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  gamepad: <><rect width="20" height="12" x="2" y="6" rx="6"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/></>,
  chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/></>,
  home_dorm: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/><circle cx="12" cy="7" r="1.5"/></>,
  plant: <><path d="M12 22V10"/><path d="M12 14c-4 0-6-3-6-7 4 0 6 3 6 7z"/><path d="M12 12c4 0 6-3 6-7-4 0-6 3-6 7z"/></>,
  swords: <><path d="m14.5 17.5 5 5M4 4l10.5 10.5M18 4l-4.5 4.5M6.5 15.5l-2 2M20 20l-2 2M2 2l2 2"/></>,
}

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}

