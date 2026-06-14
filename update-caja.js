#!/usr/bin/env node
/**
 * update-caja.js — actualiza data/caja.json (la "caja a hoy" del home de Informes 2026).
 *
 * El home (reference/index.html) lee data/caja.json al cargar y completa solo el número,
 * la fecha y el link del botón azul. Este script es lo ÚNICO que escribe ese archivo.
 *
 * Dos modos de uso:
 *
 * 1) MANUAL — le pasás el valor y la fecha a mano:
 *      node update-caja.js "US$58.200" "15 jun 2026"
 *      node update-caja.js "US$58.200"            (usa la fecha de hoy)
 *
 * 2) DESDE LA PLANILLA (Google Sheets) — lee la celda de la caja sola:
 *      node update-caja.js --sheet
 *    Requiere configurar SHEET abajo. La planilla tiene que estar compartida
 *    como "cualquiera con el enlace puede ver" (no necesita login ni API key).
 *
 * Node 18+ (usa fetch nativo). Sin dependencias.
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'data', 'caja.json');

// ── Configurá esto una sola vez ─────────────────────────────────────────────
const SHEET = {
  id:    'PEGAR_ID_DE_LA_PLANILLA',   // el de la URL: docs.google.com/spreadsheets/d/<ESTO>/edit
  hoja:  'Libro Diario',              // nombre de la pestaña donde está el saldo
  celda: 'B2',                        // celda con el saldo de caja del día
  link:  'https://docs.google.com/spreadsheets/d/PEGAR_ID_DE_LA_PLANILLA/edit',
};
// ────────────────────────────────────────────────────────────────────────────

function fechaHoy() {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d = new Date();
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

// Lee una celda de Google Sheets vía el endpoint gviz (devuelve CSV, sin auth).
async function leerCelda({ id, hoja, celda }) {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq`
    + `?tqx=out:csv&sheet=${encodeURIComponent(hoja)}&range=${encodeURIComponent(celda)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No pude leer la planilla (HTTP ${res.status})`);
  const txt = await res.text();
  return txt.trim().replace(/^"|"$/g, '');   // saca comillas que mete el CSV
}

function guardar({ caja, fecha, link }) {
  const data = {
    caja,
    fecha,
    link,
    _nota: "Caja a hoy mostrada en el home. Actualizada con update-caja.js.",
  };
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ data/caja.json actualizado → caja: ${caja} · fecha: ${fecha}`);
}

(async () => {
  const args = process.argv.slice(2);

  if (args[0] === '--sheet') {
    let caja = await leerCelda(SHEET);
    if (!/^US\$/.test(caja)) caja = 'US$' + caja;   // por si la celda viene sin "US$"
    guardar({ caja, fecha: fechaHoy(), link: SHEET.link });
    return;
  }

  if (args[0]) {
    guardar({ caja: args[0], fecha: args[1] || fechaHoy(), link: SHEET.link });
    return;
  }

  console.log('Uso:\n  node update-caja.js "US$58.200" "15 jun 2026"\n  node update-caja.js --sheet');
})();
