/**
 * Gestión gastronómica — backend en Google Sheets.
 * Guarda los registros en la solapa "Registros" de una planilla.
 *
 * CÓMO PUBLICARLO
 * 1. Creá una planilla de Google. La solapa "Registros" se crea sola la primera vez.
 * 2. Extensiones → Apps Script → pegá este archivo → guardá.
 * 3. Implementar → Nueva implementación → tipo "Aplicación web".
 *      Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier persona
 * 4. Copiá la URL que termina en /exec y pegala en "apiUrl" de data/config.json.
 *
 * SEGURIDAD: cualquiera que tenga esa URL puede leer y cargar registros.
 * No la publiques en el repo si el repo es público: ver README ("Datos reales").
 */

var TAB = 'Registros';
var COLS = ['id', 'sucursal', 'tipo', 'fecha', 'mes', 'rubro', 'detalle', 'persona', 'comprobante', 'nro',
            'monto', 'medio', 'fechaPago', 'emisionCheque', 'destino', 'nota', 'creado'];
var TZ = 'America/Argentina/Buenos_Aires';

function hoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // Todo como texto salvo el monto, para que Sheets no convierta fechas ni "2026-09".
    sh.getRange('A:Z').setNumberFormat('@');
    sh.getRange(1, COLS.indexOf('monto') + 1, sh.getMaxRows(), 1).setNumberFormat('0.00');
  }
  return sh;
}

function valor_(v, col) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, col === 'mes' ? 'yyyy-MM' : 'yyyy-MM-dd');
  if (col === 'monto') return Number(v) || 0;
  return v === '' ? null : String(v);
}

function fila_(r) {
  return COLS.map(function (c) {
    if (c === 'monto') return Number(r[c]) || 0;
    return r[c] == null ? '' : String(r[c]);
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  var values = hoja_().getDataRange().getValues();
  var regs = values.slice(1).filter(function (r) { return r[0]; }).map(function (r) {
    var o = {};
    COLS.forEach(function (c, i) { var v = valor_(r[i], c); if (v !== null) o[c] = v; });
    return o;
  });
  return json_({ registros: regs });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var body = JSON.parse(e.postData.contents), sh = hoja_();
    if (body.action === 'add') {
      var filas = (body.registros || []).map(fila_);
      if (filas.length) sh.getRange(sh.getLastRow() + 1, 1, filas.length, COLS.length).setValues(filas);
      return json_({ ok: true });
    }
    var id = body.action === 'delete' ? body.id : body.registro && body.registro.id;
    var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]); });
    var idx = ids.indexOf(String(id)); // 0 = encabezado
    if (idx < 1) return json_({ ok: false, error: 'No existe el registro ' + id + ' (¿lo borró otra persona?)' });
    if (body.action === 'update') sh.getRange(idx + 1, 1, 1, COLS.length).setValues([fila_(body.registro)]);
    else if (body.action === 'delete') sh.deleteRow(idx + 1);
    else return json_({ ok: false, error: 'Acción desconocida' });
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
