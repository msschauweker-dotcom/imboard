import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0A0A0A', 900: '#0A0A0A', 800: '#121212', 700: '#1A1A1A', 600: '#242424', 500: '#333333' },
        paper: { DEFAULT: '#F2F0E9', dim: '#B9B6AC', mute: '#7D7A72' },
        lime: { DEFAULT: '#C8FF00', dim: '#9BC400', glow: '#E4FF7A' },
        signal: { red: '#FF3D3D', amber: '#FFB800', blue: '#3DA9FF', violet: '#A66BFF' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        pixel: ['var(--font-pixel)', 'monospace'],
      },
      keyframes: {
        flip: { '0%': { transform: 'rotateX(0)' }, '50%': { transform: 'rotateX(90deg)' }, '100%': { transform: 'rotateX(0)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
        pop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } },
        glitch: {
          '0%,100%': { transform: 'translate(0)', textShadow: '2px 0 #FF3D3D, -2px 0 #3DA9FF' },
          '25%': { transform: 'translate(-3px,1px)', textShadow: '-3px 0 #FF3D3D, 3px 0 #3DA9FF' },
          '50%': { transform: 'translate(2px,-2px)', textShadow: '3px 0 #FF3D3D, -1px 0 #3DA9FF' },
          '75%': { transform: 'translate(-1px,2px)', textShadow: '-2px 0 #FF3D3D, 2px 0 #3DA9FF' },
        },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        flip: 'flip 0.5s ease-in-out',
        shake: 'shake 0.4s ease-in-out',
        pop: 'pop 0.15s ease-out',
        glitch: 'glitch 0.35s steps(2) infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
