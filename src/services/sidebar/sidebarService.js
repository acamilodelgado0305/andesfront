// src/services/sidebar/sidebarService.js
// Menú lateral personalizable: cada usuario ordena (y oculta) los ítems del
// sidebar a su gusto, POR NEGOCIO.
//
// Por qué por negocio: un negocio usa Facturas y CRM todos los días y otro solo
// Estudiantes y Programas. El mismo usuario, al cambiar de negocio, quiere otro
// orden. Por eso la clave de las preferencias es el business_id.
//
// Persistencia (mismo patrón que el tema):
//   1. localStorage `qc-sidebar-prefs` → pinta al instante, sin esperar red.
//   2. Backend `users.sidebar_prefs`   → fuente de verdad cross-device.
//
// IMPORTANTE: esto es solo presentación. NO concede ni quita permisos: el menú
// ya viene recortado por plan, `modulos_ocultos` y rol antes de pasar por aquí.
import axios from 'axios';

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;

export const SIDEBAR_STORAGE_KEY = 'qc-sidebar-prefs';

// Preferencia vacía = menú por defecto.
export const EMPTY_PREFS = { order: [], hidden: [] };

// Ítems que cambiaron de ruta: el orden/ocultado que el usuario ya guardó con
// la ruta vieja se aplica al ítem nuevo en vez de mandarlo al final del menú.
const LEGACY_KEYS = {
  '/inicio/cuentas-por-pagar': '/inicio/cuentas', // Sep 2026: Por Pagar + Por Cobrar en una vista
};

const normalizeKeys = (list) => {
  if (!Array.isArray(list)) return [];
  const keys = list
    .filter(k => typeof k === 'string')
    .map(k => LEGACY_KEYS[k] || k);
  return [...new Set(keys)];
};

const normalizePrefs = (raw) => ({
  order: normalizeKeys(raw?.order),
  hidden: normalizeKeys(raw?.hidden),
});

export const isCustomized = (prefs) =>
  Boolean(prefs && (prefs.order?.length || prefs.hidden?.length));

// ── Caché local ────────────────────────────────────────────────────────
// Estructura: { "<userId>": { "<businessId>": { order, hidden } } }.
// Va por usuario para que dos cuentas en el mismo navegador no se pisen.
const readCache = () => {
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* localStorage lleno o bloqueado: el backend sigue siendo la fuente de verdad */
  }
};

export const getCachedPrefs = (userId, businessId) => {
  if (userId == null || businessId == null) return null;
  const entry = readCache()?.[String(userId)]?.[String(businessId)];
  return entry ? normalizePrefs(entry) : null;
};

export const storePrefs = (userId, businessId, prefs) => {
  if (userId == null || businessId == null) return;
  const cache = readCache();
  const byUser = { ...(cache[String(userId)] || {}) };
  byUser[String(businessId)] = normalizePrefs(prefs);
  writeCache({ ...cache, [String(userId)]: byUser });
};

export const clearStoredPrefs = (userId, businessId) => {
  if (userId == null || businessId == null) return;
  const cache = readCache();
  const byUser = { ...(cache[String(userId)] || {}) };
  delete byUser[String(businessId)];
  writeCache({ ...cache, [String(userId)]: byUser });
};

/**
 * Preferencias vigentes para el negocio activo.
 * El backend manda (viaja en la sesión); la caché local solo cubre el hueco
 * cuando la sesión aún no las trae (entorno sin migrar, backend viejo).
 */
export const resolvePrefs = (user) => {
  const businessId = user?.bid ?? user?.business_id ?? null;
  if (!user || businessId == null) return EMPTY_PREFS;

  const fromSession = user.sidebar_prefs?.[String(businessId)];
  if (fromSession) return normalizePrefs(fromSession);

  return getCachedPrefs(user.id, businessId) || EMPTY_PREFS;
};

// ── Transformación del menú ────────────────────────────────────────────

/** Aplana las secciones a una lista de ítems que recuerdan su sección. */
export const flattenNavSections = (sections = []) =>
  sections.flatMap(section =>
    (section.items || []).map(item => ({
      ...item,
      sectionLabel: section.sectionLabel || null,
      sectionColor: section.sectionColor || null,
    }))
  );

/** Ítems en el orden elegido por el usuario (incluye los ocultos, marcados). */
export const orderedItems = (sections, prefs) => {
  const flat = flattenNavSections(sections);
  const order = normalizePrefs(prefs).order;
  const hidden = normalizePrefs(prefs).hidden;

  if (!order.length) return flat.map(i => ({ ...i, hidden: hidden.includes(i.key) }));

  const rank = new Map(order.map((key, i) => [key, i]));
  const posicion = (item) => (rank.has(item.key) ? rank.get(item.key) : Number.MAX_SAFE_INTEGER);

  // Array.prototype.sort es estable: los ítems nuevos (que el usuario nunca
  // ordenó, p. ej. un módulo recién activado) caen al final conservando su
  // orden por defecto en vez de perderse.
  return [...flat]
    .sort((a, b) => posicion(a) - posicion(b))
    .map(i => ({ ...i, hidden: hidden.includes(i.key) }));
};

/**
 * Devuelve las secciones listas para pintar, aplicando orden y visibilidad.
 * Mantiene la misma forma que `getNavSections()` para no tocar el render.
 */
export const applySidebarPrefs = (sections, prefs) => {
  if (!Array.isArray(sections) || sections.length === 0) return sections;

  const items = orderedItems(sections, prefs);
  const visibles = items.filter(i => !i.hidden);
  // Red de seguridad: nunca dejar al usuario sin menú.
  const finales = visibles.length ? visibles : items;

  const out = [];
  const etiquetasVistas = new Set();

  finales.forEach((item) => {
    const anterior = out[out.length - 1];
    if (anterior && anterior.__section === (item.sectionLabel || null)) {
      anterior.items.push(item);
      return;
    }
    // La etiqueta de sección se pinta solo en su primera aparición: si el
    // usuario intercala ítems de dos grupos, no se repite el mismo título.
    const label = item.sectionLabel && !etiquetasVistas.has(item.sectionLabel) ? item.sectionLabel : null;
    if (item.sectionLabel) etiquetasVistas.add(item.sectionLabel);
    out.push({
      __section: item.sectionLabel || null,
      sectionLabel: label,
      sectionColor: item.sectionColor || null,
      items: [item],
    });
  });

  return out;
};

// ── Persistencia en backend ────────────────────────────────────────────

/** Guarda el orden/visibilidad del negocio. Devuelve el mapa completo guardado. */
export const persistPrefsToBackend = async (businessId, prefs) => {
  const token = localStorage.getItem('authToken');
  if (!token || !API_AUTH_URL) return null;
  const { data } = await axios.patch(
    `${API_AUTH_URL}/api/users/me/sidebar`,
    { business_id: businessId, ...normalizePrefs(prefs) },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data?.sidebar_prefs || null;
};

/** Restaura el menú por defecto del negocio en el backend. */
export const resetPrefsInBackend = async (businessId) => {
  const token = localStorage.getItem('authToken');
  if (!token || !API_AUTH_URL) return null;
  const { data } = await axios.delete(`${API_AUTH_URL}/api/users/me/sidebar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { business_id: businessId },
  });
  return data?.sidebar_prefs || null;
};
