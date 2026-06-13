/* ============================================================
   Informes 2026 · Cáscara Collective
   Shared helpers + data loader. Classic script → window.CC.
   The whole site is data-driven from data/informes-2026.json.
   ============================================================ */
window.CC = (function () {
  var _data = null;

  // Load the single source of truth once; cached promise thereafter.
  function load() {
    if (!_data) {
      _data = fetch('data/informes-2026.json').then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar el JSON de datos (' + r.status + ')');
        return r.json();
      });
    }
    return _data;
  }

  // US$ con separador de miles es-AR, sin decimales. Negativos con − (signo menos).
  function money(v) {
    if (v === '' || v === null || v === undefined) return '';
    var n = Number(v);
    if (isNaN(n)) return v;
    var neg = n < 0;
    var s = Math.round(Math.abs(n)).toLocaleString('es-AR');
    return (neg ? '−' : '') + 'US$' + s;
  }

  // Igual que money() pero siempre con signo (+/−) — para resultados.
  function moneySigned(v) {
    var n = Number(v);
    var s = Math.round(Math.abs(n)).toLocaleString('es-AR');
    return (n < 0 ? '−' : '+') + 'US$' + s;
  }

  // Celda del anexo: vacío → guion largo; respeta el patrón de la referencia.
  function cell(v) {
    if (v === null || v === undefined || v === '') return '<span class="dash">—</span>';
    var n = Number(v);
    if (isNaN(n)) return v;
    var neg = n < 0;
    n = Math.abs(n);
    var s = n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return (neg ? '−' : '') + 'US$' + s;
  }

  function query(name) {
    return new URLSearchParams(location.search).get(name);
  }

  return { load: load, money: money, moneySigned: moneySigned, cell: cell, query: query };
})();
