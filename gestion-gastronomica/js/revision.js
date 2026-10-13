/* ============================================================
   Revisión del mes y guía de uso.
   ============================================================ */
(function (G) {
  var esc = G.esc;
  G.vistas = G.vistas || {};
  var NIVEL = {
    error:   { icono: '✕', label: 'Error',   txt: 'Algo está mal cargado y cambia los números. Hay que corregirlo.' },
    falta:   { icono: '○', label: 'Falta',   txt: 'Algo que todos los meses está y este mes no. Cargalo o, si no corresponde, marcalo como correcto.' },
    revisar: { icono: '!', label: 'Revisar', txt: 'Puede estar bien, pero es raro. Miralo y confirmá.' }
  };

  function boton(h) {
    var a = h.accion || {};
    if (a.tipo === 'editar') return '<a class="btn sm pri" href="#editar/' + esc(a.id) + '">Corregir</a>';
    if (a.tipo === 'cargar') return '<button class="btn sm pri" data-cargar="' + esc(h.id) + '">Cargar ahora</button>';
    if (a.tipo === 'ventas') return '<button class="btn sm pri" data-cargar="' + esc(h.id) + '">Cargar ventas</button>';
    return '';
  }
  function item(h, ignorado) {
    var n = NIVEL[h.nivel];
    return '<li class="hallazgo nivel-' + h.nivel + '"><span class="badge"><i aria-hidden="true">' + n.icono + '</i>' + n.label + '</span>' +
      '<div><b>' + esc(h.titulo) + '</b><p>' + h.texto + '</p></div><div class="acc">' +
      (ignorado ? '<button class="btn sm ghost" data-reactivar="' + esc(h.id) + '">Volver a mostrar</button>'
        : boton(h) + ' <button class="btn sm ghost" data-ignorar="' + esc(h.id) + '" title="No vuelve a aparecer">Es correcto</button>') + '</div></li>';
  }

  G.vistas.revision = function (st) {
    var rev = G._revActual = G.revisar(st.suc, st.mes);
    var c = rev.cuenta, pend = c.error + c.falta;
    var h = '<section class="card estado-mes ' + (pend ? 'pend' : 'ok') + '"><div><h2>' + (pend ? 'Faltan ' + pend + ' cosas para cerrar ' + G.mesLabel(st.mes) : G.mesLabel(st.mes) + ' está listo para cerrar') + '</h2>' +
      '<p class="sub">' + (st.suc === 'todas' ? 'Todas las sucursales' : esc(G.sucLabel(st.suc))) + '. Revisamos cada registro y lo comparamos con los meses anteriores para encontrar errores y cosas que faltan.</p></div>' +
      '<div class="contadores">' + ['error', 'falta', 'revisar'].map(function (k) {
        return '<div class="contador nivel-' + k + '"><span class="badge"><i aria-hidden="true">' + NIVEL[k].icono + '</i>' + NIVEL[k].label + '</span><b>' + c[k] + '</b></div>';
      }).join('') + '</div></section>';

    ['error', 'falta', 'revisar'].forEach(function (k) {
      var lista = rev.activos.filter(function (x) { return x.nivel === k; });
      if (!lista.length) return;
      var titulo = { error: 'Errores', falta: 'Faltantes', revisar: 'Para revisar' }[k];
      h += '<section class="card"><h2>' + titulo + ' <span class="muted">(' + lista.length + ')</span></h2><p class="sub">' + NIVEL[k].txt + '</p><ul class="hallazgos">' +
        lista.map(function (x) { return item(x); }).join('') + '</ul></section>';
    });
    if (!rev.activos.length) h += '<section class="card"><p class="sub">No encontramos errores ni faltantes. Igual conviene mirar el <a href="#economico">económico</a> y comparar con el resumen del banco.</p></section>';
    if (rev.ignorados.length) h += '<details class="card"><summary>' + rev.ignorados.length + ' marcados como correctos</summary><ul class="hallazgos">' + rev.ignorados.map(function (x) { return item(x, true); }).join('') + '</ul></details>';
    return h;
  };

  G.accionHallazgo = function (id, st) {
    var rev = G.revisar(st.suc, st.mes), h = rev.todos.find(function (x) { return x.id === id; });
    if (!h) return;
    G.draft = Object.assign({}, h.accion.draft);
    location.hash = h.accion.tipo === 'ventas' ? '#cargar/ventas' : '#cargar/' + (G.draft.tipo || 'gasto');
  };

  /* ---------- guía ---------- */
  G.vistas.guia = function () {
    var rubros = G.todosGrupos().map(function (g) {
      return '<tr class="grupo"><td colspan="2">' + esc(g.label) + '</td></tr>' + g.rubros.map(function (rb) {
        return '<tr class="rubro"><td>' + esc(rb.label) + (rb.recurrente ? ' <span class="tag">todos los meses</span>' : '') + '</td><td>' + esc(rb.ayuda || '') + '</td></tr>';
      }).join('');
    }).join('');
    return '<section class="card guia"><h2>Cómo funciona</h2>' +
      '<div class="grid2"><div><h3>Económico</h3><p>Responde <b>¿el negocio da plata?</b> Cada gasto y cada venta cuenta en el <b>mes al que corresponde</b>, se haya pagado o no. ' +
      'Los sueldos de septiembre son de septiembre aunque se paguen el 5 de octubre.</p></div>' +
      '<div><h3>Financiero</h3><p>Responde <b>¿tenemos plata?</b> Cuenta la plata el día que <b>entra o sale</b> de cada caja (efectivo, MercadoPago, banco, dólares). Un cheque sale del banco el día que vence.</p></div></div>' +
      '<p>Por eso cada registro tiene dos fechas: el <b>mes al que corresponde</b> (económico) y la <b>fecha de pago</b> (financiero). Si todavía no se pagó, queda <b>pendiente</b> y suma a la deuda.</p></section>' +
      '<section class="card guia"><h2>La rutina</h2><div class="grid3">' +
      '<div><h3>Todos los días</h3><ul><li>Cargar las <a href="#cargar/ventas">ventas del día</a> con el cierre de caja.</li><li>Si depositaste efectivo, cargar el <a href="#cargar/transferencia">pase entre cajas</a>.</li></ul></div>' +
      '<div><h3>Cada semana</h3><ul><li>Cargar las <a href="#cargar/gasto">facturas</a> que llegaron.</li><li>Registrar los <a href="#cargar/pago">pagos</a> que hiciste.</li></ul></div>' +
      '<div><h3>A fin de mes</h3><ul><li>Cargar <a href="#cargar/sueldos">sueldos</a> y F.931.</li><li>Servicios, alquiler e impuestos.</li><li>Abrir la <a href="#revision">revisión</a> hasta que diga “listo para cerrar”.</li><li>Mirar el <a href="#tablero">tablero</a> y el <a href="#economico">económico</a>.</li></ul></div>' +
      '</div></section>' +
      '<section class="card guia"><h2>Qué controla la revisión</h2><ul class="lista-check">' +
      '<li><b>Duplicados:</b> mismo proveedor y monto con el mismo número de factura, o con pocos días de diferencia.</li>' +
      '<li><b>Montos raros:</b> mucho más alto o más bajo que lo habitual para ese proveedor (un cero de más).</li>' +
      '<li><b>Rubro distinto al de siempre</b> para ese proveedor.</li>' +
      '<li><b>Mes que no coincide</b> con la fecha de la factura (ej. año equivocado).</li>' +
      '<li><b>Fechas en el futuro</b> y pagos con fecha anterior a la factura.</li>' +
      '<li><b>Gastos fijos que faltan:</b> lo que aparece todos los meses (alquiler, luz, contador) y este mes no.</li>' +
      '<li><b>Sueldos que faltan:</b> quien cobró el mes pasado y este no, y sueldos sin F.931.</li>' +
      '<li><b>Días sin cierre de caja</b> y días con ventas fuera de lo normal.</li>' +
      '<li><b>Pendientes viejos:</b> facturas sin pagar hace más de 45 días (¿se pagó y no se registró?).</li></ul></section>' +
      '<section class="card guia"><h2>Rubros: qué va en cada uno</h2><div class="tbl-wrap"><table class="cascada">' + rubros + '</table></div></section>';
  };
})(window.G);
