// src/components/tareas/repeticion.js
//
// COPIA de BACKEND/src/utils/repeticion.js (el backend decide cuándo nace la
// siguiente tarjeta; aquí solo se usa para pintar en el calendario las próximas
// repeticiones y describir la regla). Si cambia allá, cambia aquí.
//
// Regla: { frecuencia: 'diaria'|'semanal'|'mensual'|'anual', cada: N,
//          dias: [0-6] (solo semanal, 0 = domingo), dia_mes (solo mensual),
//          ancla: 'YYYY-MM-DD' (inicio de la serie, para "cada 2 semanas"),
//          hasta: 'YYYY-MM-DD' | null, lista_id: lista donde nace la siguiente }
//
// Todo se calcula en la hora de pared de Colombia (UTC-5 fijo, sin horario
// de verano), así "martes 6:00 p. m." sigue siendo martes 6:00 p. m.

export const FRECUENCIAS = ['diaria', 'semanal', 'mensual', 'anual'];

const OFFSET = 5 * 3600 * 1000;
const DIA = 86400000;
const aLocal = (d) => new Date(new Date(d).getTime() - OFFSET);
const deLocal = (d) => new Date(d.getTime() + OFFSET);
const diaStr = (local) => local.toISOString().slice(0, 10);
const inicioSemana = (local) => {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
    return d.getTime() - d.getUTCDay() * DIA;
};

/** Limpia lo que manda el cliente. null = no se repite. */
export const normalizarRepeticion = (r, venceAt = null) => {
    if (!r || typeof r !== 'object') return null;
    const frecuencia = FRECUENCIAS.includes(r.frecuencia) ? r.frecuencia : null;
    if (!frecuencia) return null;
    const local = venceAt ? aLocal(venceAt) : null;
    const out = { frecuencia, cada: Math.min(Math.max(parseInt(r.cada, 10) || 1, 1), 99) };
    if (frecuencia === 'semanal') {
        const dias = [...new Set((Array.isArray(r.dias) ? r.dias : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
        out.dias = dias.length ? dias : (local ? [local.getUTCDay()] : [1]);
    }
    if (frecuencia === 'mensual') {
        const dm = parseInt(r.dia_mes, 10);
        out.dia_mes = dm >= 1 && dm <= 31 ? dm : (local ? local.getUTCDate() : 1);
    }
    out.ancla = /^\d{4}-\d{2}-\d{2}$/.test(r.ancla || '') ? r.ancla : (local ? diaStr(local) : null);
    out.hasta = /^\d{4}-\d{2}-\d{2}$/.test(r.hasta || '') ? r.hasta : null;
    out.lista_id = Number(r.lista_id) || null;
    return out;
};

const sumarMeses = (local, n, diaMes) => {
    const y = local.getUTCFullYear();
    const m = local.getUTCMonth() + n;
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(diaMes, ultimo), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()));
};

// Una ocurrencia después de `local` (hora de pared de Colombia).
const paso = (regla, local) => {
    switch (regla.frecuencia) {
        case 'diaria':
            return new Date(local.getTime() + regla.cada * DIA);
        case 'semanal': {
            const dias = regla.dias?.length ? regla.dias : [local.getUTCDay()];
            const ancla = regla.ancla ? inicioSemana(new Date(`${regla.ancla}T12:00:00Z`)) : inicioSemana(local);
            for (let i = 1; i <= 7 * regla.cada + 7; i += 1) {
                const cand = new Date(local.getTime() + i * DIA);
                if (!dias.includes(cand.getUTCDay())) continue;
                const semanas = Math.round((inicioSemana(cand) - ancla) / (7 * DIA));
                if (semanas % regla.cada === 0) return cand;
            }
            return null;
        }
        case 'mensual':
            return sumarMeses(local, regla.cada, regla.dia_mes || local.getUTCDate());
        case 'anual':
            return sumarMeses(local, 12 * regla.cada, local.getUTCDate());
        default:
            return null;
    }
};

/**
 * Fecha de la siguiente ocurrencia a partir del vencimiento actual. Nunca
 * devuelve una fecha ya pasada: si la serie quedó atrás (semanas sin abrir la
 * app), salta a la próxima que todavía no ha ocurrido.
 * @returns {Date|null} null = la serie terminó (`hasta`).
 */
export const siguienteFecha = (regla, venceAt, conHora = true, ahora = new Date()) => {
    if (!regla || !venceAt) return null;
    const hoy = diaStr(aLocal(ahora));
    let cand = paso(regla, aLocal(venceAt));
    for (let vueltas = 0; cand && vueltas < 1000; vueltas += 1) {
        const yaPaso = conHora ? deLocal(cand) <= ahora : diaStr(cand) < hoy;
        if (!yaPaso) break;
        cand = paso(regla, cand);
    }
    if (!cand) return null;
    if (regla.hasta && diaStr(cand) > regla.hasta) return null;
    return deLocal(cand);
};

const NOMBRES_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "Cada semana: mar y jue" / "Días hábiles" / "Cada mes, el 15" */
export const describirRepeticion = (r) => {
    if (!r?.frecuencia) return '';
    const cada = r.cada > 1 ? r.cada : null;
    const lista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0] || '');
    let txt;
    switch (r.frecuencia) {
        case 'diaria': txt = cada ? `Cada ${cada} días` : 'Cada día'; break;
        case 'semanal': {
            const dias = [...(r.dias || [])].sort();
            if (!cada && dias.join() === '1,2,3,4,5') { txt = 'Días hábiles (lun a vie)'; break; }
            txt = `${cada ? `Cada ${cada} semanas` : 'Cada semana'}${dias.length ? `: ${lista(dias.map((d) => NOMBRES_DIA[d]))}` : ''}`;
            break;
        }
        case 'mensual': txt = `${cada ? `Cada ${cada} meses` : 'Cada mes'}${r.dia_mes ? `, el ${r.dia_mes}` : ''}`; break;
        case 'anual': txt = cada ? `Cada ${cada} años` : 'Cada año'; break;
        default: txt = '';
    }
    if (r.hasta) {
        const [y, m, d] = r.hasta.split('-').map(Number);
        txt += ` · hasta el ${new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
    }
    return txt;
};

/** Próximas fechas de una serie (para el calendario), sin pasar de `hasta`. */
export const proximasOcurrencias = (tarjeta, limite, maximo = 60) => {
    if (!tarjeta?.repeticion || !tarjeta.vence_at || tarjeta.repetida_at) return [];
    const fechas = [];
    let actual = new Date(tarjeta.vence_at);
    const fin = new Date(limite).getTime();
    // `ahora` = la fecha actual de la serie: proyecta desde ella, no desde hoy.
    while (fechas.length < maximo) {
        const sig = siguienteFecha(tarjeta.repeticion, actual, tarjeta.vence_con_hora, actual);
        if (!sig || sig.getTime() > fin) break;
        fechas.push(sig);
        actual = sig;
    }
    return fechas;
};
