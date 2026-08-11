/**
 * Centrado vertical del contenido de los drawers de movimientos.
 *
 * El drawer conserva su ancho y su contenido conserva el suyo; lo único que
 * cambia es que, cuando el formulario es más corto que el alto del drawer,
 * queda centrado a media altura en vez de pegado arriba.
 *
 * Se usa `margin: auto 0` sobre el hijo y NO `justifyContent: 'center'` en el
 * contenedor: con justify-content, un contenido más alto que el drawer se
 * recorta por arriba y esa parte se vuelve inalcanzable al hacer scroll.
 * Con `margin: auto` el sobrante desaparece solo y el scroll funciona normal.
 */
export const CUERPO_FLEX = { display: 'flex', flexDirection: 'column' };

export const CONTENIDO_CENTRADO_VERTICAL = { margin: 'auto 0', width: '100%' };
