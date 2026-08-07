/**
 * Cáscara Collective — endpoint "Cash a la fecha"
 * Lee el saldo de caja = último número de la columna G ("Saldo")
 * en la solapa "Financiero" de la planilla Gestion 2026.
 * Devuelve JSON con el mismo formato que data/cash.json.
 *
 * CÓMO PUBLICARLO:
 * 1. Abrí la planilla → Extensiones → Apps Script.
 * 2. Pegá este código, guardá.
 * 3. Implementar → Nueva implementación → tipo "Aplicación web".
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier persona
 * 4. Copiá la URL (.../exec) y pegala en el fetch de tu card.
 */

function doGet() {
  var SHEET_ID = '1mrjVnVZJAbKMCMvUq7a6_RkJgDqWMyZav8emkdbdoC8';
  var TAB = 'Financiero';
  var COL_SALDO = 7; // G
  var COL_FECHA = 1; // A

  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  var lastRow = sh.getLastRow();
  var saldoCol = sh.getRange(1, COL_SALDO, lastRow, 1).getValues();
  var fechaCol = sh.getRange(1, COL_FECHA, lastRow, 1).getValues();

  // Buscar de abajo hacia arriba el último número válido de la columna G
  var saldo = null, rowIdx = -1;
  for (var i = saldoCol.length - 1; i >= 0; i--) {
    var v = saldoCol[i][0];
    if (v !== '' && v !== null && !isNaN(Number(v))) {
      saldo = Number(v);
      rowIdx = i;
      break;
    }
  }

  // Fecha del último movimiento (columna A de esa fila); si está vacía, hoy.
  var tz = 'America/Argentina/Buenos_Aires';
  var fecha;
  var fv = rowIdx >= 0 ? fechaCol[rowIdx][0] : '';
  if (fv instanceof Date) {
    fecha = Utilities.formatDate(fv, tz, 'yyyy-MM-dd');
  } else {
    fecha = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  }

  var out = {
    cash: saldo,
    moneda: 'US$',
    fecha: fecha,
    actualizado: new Date().toISOString(),
    fuente: 'Libro Diario — Financiero, columna G (última fila)'
  };

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
