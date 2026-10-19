/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#07090E',
          900: '#0B0F16',
          800: '#10151E',
          700: '#171E2A',
          600: '#1F2937',
        },
        emerald: {
          glow: '#10B981',
        },
        cyan: {
          tactical: '#06B6D4',
        },
        amber: {
          signal: '#F59E0B',
        },
        danger: '#EF4444',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(420%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        orbSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        laserSweep: {
          '0%': { left: '-12%', opacity: '0' },
          '8%': { opacity: '1' },
          '92%': { opacity: '1' },
          '100%': { left: '104%', opacity: '0' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '94%': { opacity: '0.4' },
          '96%': { opacity: '1' },
          '98%': { opacity: '0.7' },
        },
      },
      animation: {
        scanline: 'scanline 1.6s linear infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'orb-spin': 'orbSpin 14s linear infinite',
        'rise-in': 'riseIn 0.45s ease-out both',
        'laser-sweep': 'laserSweep 1.8s ease-in-out infinite',
        flicker: 'flicker 4s linear infinite',
      },
    },
  },
  plugins: [],
};
