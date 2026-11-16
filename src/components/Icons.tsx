import type { ReactNode, SVGProps } from 'react'

const Svg = ({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
)

export const IToday = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </Svg>
)
export const IWeek = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15" rx="3.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
)
export const IProgress = () => (
  <Svg>
    <path d="M4 19V5M4 19h16" />
    <path d="m7.5 14.5 3.5-4 3 2.5 5-6" />
  </Svg>
)
export const ISettings = () => (
  <Svg>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
)
export const ICheck = () => (
  <Svg>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)
export const IClose = () => (
  <Svg>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)
export const IPlus = () => (
  <Svg>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IChevL = () => (
  <Svg>
    <path d="m15 6-6 6 6 6" />
  </Svg>
)
export const IChevR = () => (
  <Svg>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)
export const IShuffle = () => (
  <Svg>
    <path d="M4 7h3.5c4 0 5 10 9 10H20M17 14l3 3-3 3M4 17h3.5c1.4 0 2.4-1.2 3.3-2.8M17 4l3 3-3 3M13.2 9.8C14 8.2 15 7 16.5 7H20" />
  </Svg>
)
