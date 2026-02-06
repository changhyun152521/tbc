/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        title: ['Inter', 'ui-sans-serif', 'sans-serif'],
        number: ['Inter', 'ui-monospace', 'monospace', 'sans-serif'],
        emphasis: ['ONEMobile', 'Pretendard', 'sans-serif'],
        friendly: ['NanumSquareRound', 'Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
