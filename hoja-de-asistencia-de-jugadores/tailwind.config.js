/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'present': 'hsl(142.1 76.2% 36.3%)',
        'present-light': 'hsl(142.1 70.2% 93.3%)',
        'absent': 'hsl(0 84.2% 60.2%)',
        'absent-light': 'hsl(0 80.2% 95.2%)',
        'injured': 'hsl(47.9 95.8% 53.1%)',
        'injured-light': 'hsl(47.9 90.8% 94.1%)',
      }
    }
  },
  plugins: [],
}
