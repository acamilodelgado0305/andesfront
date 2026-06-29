/** @type {import('tailwindcss').Config} */
module.exports = {
  // Modo oscuro por clase: el tema se controla añadiendo/quitando la clase
  // `dark` en <html> (lo hace ThemeContext). Esto habilita variantes `dark:`
  // en cualquier componente (p.ej. `bg-white dark:bg-gray-800`).
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
