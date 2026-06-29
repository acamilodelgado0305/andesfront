# andesfront — Convenciones

Frontend React 18 + Vite, Ant Design 5 + Tailwind CSS.

## Modo oscuro (OBLIGATORIO en todo componente nuevo)

La app tiene modo oscuro por usuario. **Todo lo que se agregue de aquí en adelante
debe verse bien en claro y en oscuro.** Arquitectura:

- **Activación:** clase `dark` en `<html>` (Tailwind `darkMode: 'class'`). La controla
  `src/ThemeContext.jsx`; el script pre-paint de `index.html` la aplica antes de montar React.
- **Preferencia del usuario:** `light | dark | system`. Se guarda en `localStorage` (`qc-theme`)
  y en backend (`users.theme_preference`, endpoint `PATCH /api/users/me/theme`). Fuente de verdad
  cross-device = backend; caché local = pinta sin parpadeo.
- **Ant Design:** un `ConfigProvider` raíz (en `main.jsx`) aplica `theme.darkAlgorithm`.
  → Tablas, Forms, Modales, Inputs, Cards, etc. **se adaptan solos**. No los toques.

### Reglas al escribir UI nueva

1. **Prefiere componentes de Ant Design** para superficies/datos: heredan el tema sin esfuerzo.
2. **Tailwind:** acompaña SIEMPRE los colores con su variante `dark:`, usando la
   **paleta cálida estilo Claude** (NO grises azulados como `gray-800`/`slate-900`):
   - `bg-white` → `bg-white dark:bg-[#30302e]`
   - `text-gray-900` / `text-slate-800` → `… dark:text-[#faf9f5]`
   - `text-gray-600/500` → `… dark:text-[#a8a59e]`
   - `border-gray-200` → `… dark:border-[#403e3a]`
   - Variantes con opacidad (`bg-white/70`) NO las cubre el fallback global → añade `dark:` a mano.

   **Paleta de referencia (modo oscuro Claude):** página `#262624`, superficie `#30302e`,
   superficie-2/hover `#3a3a38`, borde `#403e3a`, texto `#faf9f5`, texto-muted `#a8a59e`,
   acento `#d97757`. Disponibles como variables CSS `--qc-*` (ver punto 3).
3. **Estilos inline con color** (`style={{ background:'#fff' }}`): no se adaptan solos.
   Usa `const { isDark } = useTheme()` y condiciona el color, o mejor, usa las variables CSS de
   tema: `var(--qc-bg)`, `var(--qc-surface)`, `var(--qc-surface-2)`, `var(--qc-border)`,
   `var(--qc-text)`, `var(--qc-text-muted)` (definidas en `src/index.css`).
4. **Leer el tema en código:** `import { useTheme } from '@/ThemeContext'` → `{ mode, isDark, setTheme, toggleTheme }`.

### Fallback global (red de seguridad, no excusa)

`src/index.css` adapta automáticamente las clases Tailwind más comunes (`bg-white`,
`bg-gray-50/100`, `text-gray-*`, `border-gray-200`, etc.) bajo `:where(html.dark)` con
especificidad 0. Cubre pantallas viejas, pero **el código nuevo debe usar `dark:` explícito**
(siempre gana al fallback). No dependas del fallback para casos con opacidad o estilos inline.

### Checklist antes de dar por hecho un componente

- [ ] ¿Se ve bien con la clase `dark` en `<html>`? (cambiar tema en Configuración → Apariencia)
- [ ] ¿Textos legibles (sin gris-sobre-gris ni negro-sobre-oscuro)?
- [ ] ¿Bordes y fondos de tarjetas adaptados?
- [ ] ¿Estilos inline con color condicionados por `isDark` o vía `var(--qc-*)`?
