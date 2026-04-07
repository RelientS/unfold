import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#faf8f5',
        surface: '#ffffff',
        ink: '#2c2825',
        ink2: '#8a7f75',
        ink3: '#c4bab0',
        accent: '#e07a5f',
        accent2: '#81b29a',
        warn: '#f2cc8f',
        border: '#e8e2d9',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
        handwritten: ['ZCOOL XiaoWei', 'serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(44,40,37,.08)',
        float: '0 8px 32px rgba(44,40,37,.12)',
      },
      borderRadius: {
        card: '14px',
        sm: '8px',
      },
    },
  },
  plugins: [],
}
export default config
