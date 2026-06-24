import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          blue: '#38bdf8',
          green: '#10b981',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        neon: '0 0 20px rgba(56,189,248,0.25)',
        'neon-green': '0 0 20px rgba(16,185,129,0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
