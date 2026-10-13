/**
 * Gestión de sucursales — backend en Google Sheets para gestion.html
 * Una solapa "Facturas" con encabezados en la fila 1:
 *   id | sucursal | fecha | proveedor | tipo | rubro | monto | mesEconomico | fechaPago | nota
 *
 * CÓMO PUBLICARLO:
 * 1. Creá una planilla nueva con la solapa "Facturas" y esos encabezados.
 * 2. Extensiones → Apps Script → pegá este código y poné el ID de la planilla abajo.
 * 3. Implementar → Nueva implementación → "Aplicación web".
 *    - Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier persona
 * 4. Copiá la URL (.../exec) en "apiUrl" de data/gestion-config.json.
 *
 * OJO: "Cualquier persona" con la URL puede leer y cargar facturas.
 * No la publiques; para algo más cerrado hace falta login (siguiente etapa).
 */

var SHEET_ID = 'PEGAR_ID_DE_LA_PLANILLA';
var TAB = 'Facturas';
var COLS = ['id', 'sucursal', 'fecha', 'proveedor', 'tipo', 'rubro', 'monto', 'mesEconomico', 'fechaPago', 'nota'];
var TZ = 'America/Argentina/Buenos_Aires';

function sheet_() { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB); }

function cell_(v, col) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, col === 'mesEconomico' ? 'yyyy-MM' : 'yyyy-MM-dd');
  if (col === 'monto') return Number(v) || 0;
  return v === '' ? null : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  var values = sheet_().getDataRange().getValues();
  var facturas = values.slice(1).filter(function (r) { return r[0]; }).map(function (r) {
    var f = {};
    COLS.forEach(function (c, i) { f[c] = cell_(r[i], c); });
    return f;
  });
  return json_({ facturas: facturas });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents);
    var f = body.factura, sh = sheet_();
    // Texto plano para que Sheets no convierta fechas ni el mes "2026-09".
    var row = COLS.map(function (c) { return c === 'monto' ? Number(f[c]) || 0 : (f[c] == null ? '' : "'" + f[c]); });
    var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]).replace(/^'/, ''); });
    var idx = ids.indexOf(String(f.id)); // índice 0 = encabezado
    if (body.action === 'add') {
      sh.appendRow(row);
    } else if (idx < 1) {
      return json_({ ok: false, error: 'No existe la factura ' + f.id });
    } else if (body.action === 'update') {
      sh.getRange(idx + 1, 1, 1, COLS.length).setValues([row]);
    } else if (body.action === 'delete') {
      sh.deleteRow(idx + 1);
    } else {
      return json_({ ok: false, error: 'Acción desconocida' });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
