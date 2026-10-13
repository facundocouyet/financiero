/* ============================================================
   Gestión de sucursales
   Cada factura tiene: sucursal, fecha, proveedor, tipo (ingreso/egreso),
   rubro, monto, mesEconomico (a qué mes pertenece) y fechaPago (cuándo
   se cobró/pagó; vacío = pendiente).
     · ECONÓMICO de un mes  = facturas cuyo mesEconomico es ese mes.
     · FINANCIERO de un mes = facturas cuya fechaPago cae en ese mes.
   Persistencia: si config.apiUrl está vacío, las facturas viven en este
   navegador (localStorage), arrancando del demo. Si tiene la URL del
   Apps Script (apps-script-gestion.gs), se leen y guardan en la planilla.
   ============================================================ */
(function () {
  var LS_KEY = 'gestion.facturas.v1';
  var cfg, facturas = [], state = { tab: 'economico', suc: 'todas', mes: null };
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(v) {
    var n = Math.round(Number(v) || 0);
    return (n < 0 ? '−' : '') + cfg.moneda + Math.abs(n).toLocaleString('es-AR');
  }
  function pct(v) { return isFinite(v) ? (v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(1).replace('.', ',') + '%' : '—'; }
  function mesLabel(m) {
    var n = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var p = m.split('-'); return n[+p[1] - 1] + ' ' + p[0];
  }
  function rubro(k) { return cfg.rubros.find(function (r) { return r.key === k; }) || { label: k, grupo: 'operativos', tipo: 'egreso' }; }
  function sucLabel(k) { var s = cfg.sucursales.find(function (x) { return x.key === k; }); return s ? s.label : k; }

  /* ---------- datos ---------- */
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' (' + r.status + ')');
      return r.json();
    });
  }
  function loadFacturas() {
    if (cfg.apiUrl) return getJSON(cfg.apiUrl).then(function (d) { return d.facturas; });
    try {
      var saved = localStorage.getItem(LS_KEY);
      if (saved) return Promise.resolve(JSON.parse(saved));
    } catch (e) { /* sin storage: seguimos con el demo */ }
    return getJSON('data/gestion-demo.json').then(function (d) { return d.facturas; });
  }
  function persist(action, payload) {
    if (cfg.apiUrl) {
      // text/plain evita el preflight CORS de Apps Script
      return fetch(cfg.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, factura: payload }) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d.ok) throw new Error(d.error || 'Error guardando'); });
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(facturas)); } catch (e) { alert('No se pudo guardar en este navegador.'); }
    return Promise.resolve();
  }

  /* ---------- cálculo ---------- */
  function deSuc(f, suc) { return suc === 'todas' || f.sucursal === suc; }
  function signo(f) { return f.tipo === 'ingreso' ? 1 : -1; }

  // Estado de resultados: totales por rubro y por grupo para un criterio.
  function resultado(suc, mes, criterio) {
    var porRubro = {}, porGrupo = {};
    cfg.grupos.forEach(function (g) { porGrupo[g.key] = 0; });
    facturas.forEach(function (f) {
      if (!deSuc(f, suc)) return;
      var m = criterio === 'eco' ? f.mesEconomico : (f.fechaPago || '').slice(0, 7);
      if (m !== mes) return;
      var r = rubro(f.rubro), v = Number(f.monto) || 0;
      porRubro[f.rubro] = (porRubro[f.rubro] || 0) + v;
      porGrupo[r.grupo] = (porGrupo[r.grupo] || 0) + v;
    });
    var ventas = porGrupo.ventas || 0, cmv = porGrupo.cmv || 0, personal = porGrupo.personal || 0, oper = porGrupo.operativos || 0;
    var margenBruto = ventas - cmv, resultadoOp = margenBruto - personal - oper;
    return {
      porRubro: porRubro, porGrupo: porGrupo, ventas: ventas, cmv: cmv, personal: personal, oper: oper,
      margenBruto: margenBruto, resultado: resultadoOp,
      foodCost: cmv / ventas, laboral: personal / ventas, margen: resultadoOp / ventas
    };
  }

  /* ---------- vistas ---------- */
  function kpi(l, v, s, key) {
    return '<div class="kpi' + (key ? ' key' : '') + '"><div class="kpi__l">' + l + '</div><div class="kpi__v">' + v + '</div>' +
      (s ? '<div class="kpi__s">' + s + '</div>' : '') + '</div>';
  }
  function cls(v) { return 'num' + (v < 0 ? ' neg' : ''); }

  function tablaResultados(cols) {
    // cols: [{label, r}] — una columna por criterio o por sucursal
    var h = '<div class="tbl-wrap"><table><thead><tr><th>Rubro</th>';
    cols.forEach(function (c) { h += '<th class="num">' + esc(c.label) + '</th><th class="num">%</th>'; });
    h += '</tr></thead><tbody>';
    function row(label, get, klass, sign) {
      h += '<tr class="' + (klass || '') + '"><td' + (klass ? '' : ' class="ind"') + '>' + label + '</td>';
      cols.forEach(function (c) {
        var v = get(c.r) * (sign || 1);
        h += '<td class="' + cls(v) + '">' + money(v) + '</td><td class="num muted">' + (c.r.ventas ? pct(get(c.r) / c.r.ventas) : '—') + '</td>';
      });
      h += '</tr>';
    }
    cfg.grupos.forEach(function (g, gi) {
      row(g.label, function (r) { return r.porGrupo[g.key] || 0; }, 'grp', g.signo);
      cfg.rubros.filter(function (r) { return r.grupo === g.key; }).forEach(function (rb) {
        row(esc(rb.label), function (r) { return r.porRubro[rb.key] || 0; }, '', g.signo);
      });
      if (g.key === 'cmv') row('Margen bruto', function (r) { return r.margenBruto; }, 'tot');
    });
    row('Resultado operativo', function (r) { return r.resultado; }, 'tot key');
    return h + '</tbody></table></div>';
  }

  function vistaEconomico() {
    var r = resultado(state.suc, state.mes, 'eco');
    var titulo = state.suc === 'todas' ? 'Todas las sucursales' : sucLabel(state.suc);
    return '<div class="kpis">' +
      kpi('Resultado del mes', money(r.resultado), 'margen ' + pct(r.margen) + ' sobre ventas', true) +
      kpi('Ventas', money(r.ventas)) +
      kpi('Food cost', pct(r.foodCost), 'CMV ' + money(r.cmv)) +
      kpi('Costo laboral', pct(r.laboral), 'Personal ' + money(r.personal)) +
      '</div><div class="card"><h2>Estado de resultados · ' + esc(titulo) + ' · ' + mesLabel(state.mes) + '</h2>' +
      '<p class="sub">Criterio <b>económico</b>: cada factura cuenta en el mes al que pertenece, se haya pagado o no.</p>' +
      tablaResultados([{ label: 'Económico', r: r }]) + '</div>';
  }

  function vistaComparacion() {
    var eco = resultado(state.suc, state.mes, 'eco'), fin = resultado(state.suc, state.mes, 'fin');
    var pendientes = [], deOtrosMeses = [];
    facturas.forEach(function (f) {
      if (!deSuc(f, state.suc)) return;
      var mp = (f.fechaPago || '').slice(0, 7);
      if (f.mesEconomico === state.mes && mp !== state.mes) pendientes.push(f);
      else if (mp === state.mes && f.mesEconomico !== state.mes) deOtrosMeses.push(f);
    });
    function lista(arr, vacio) {
      if (!arr.length) return '<p class="sub">' + vacio + '</p>';
      var h = '<div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Sucursal</th><th>Proveedor / concepto</th><th>Rubro</th><th>Mes económico</th><th>Pago</th><th class="num">Monto</th></tr></thead><tbody>';
      arr.forEach(function (f) {
        h += '<tr><td>' + esc(f.fecha) + '</td><td>' + esc(sucLabel(f.sucursal)) + '</td><td>' + esc(f.proveedor) + '</td><td>' + esc(rubro(f.rubro).label) +
          '</td><td>' + mesLabel(f.mesEconomico) + '</td><td>' + (f.fechaPago ? esc(f.fechaPago) : '<span class="tag pend">pendiente</span>') +
          '</td><td class="' + cls(signo(f) * f.monto) + '">' + money(signo(f) * f.monto) + '</td></tr>';
      });
      return h + '</tbody></table></div>';
    }
    var dif = eco.resultado - fin.resultado;
    return '<div class="kpis">' +
      kpi('Económico', money(eco.resultado), '¿El local da plata?', true) +
      kpi('Financiero', money(fin.resultado), '¿Tenemos plata? (entró − salió)') +
      kpi('Diferencia', money(dif), dif > 0 ? 'ganado pero todavía no cobrado / no pagado' : 'caja por encima del resultado') +
      '</div><div class="card"><h2>Lado a lado · ' + mesLabel(state.mes) + '</h2>' +
      '<p class="sub">Mismas facturas, dos criterios: <b>económico</b> por mes al que pertenecen, <b>financiero</b> por fecha de pago.</p>' +
      tablaResultados([{ label: 'Económico', r: eco }, { label: 'Financiero', r: fin }]) + '</div>' +
      '<div class="card"><h2>Del mes, sin cobrar o pagar en el mes</h2><p class="sub">Cuentan en el económico de ' + mesLabel(state.mes) + ' pero no en su caja.</p>' +
      lista(pendientes, 'Todo lo del mes se cobró y pagó dentro del mes.') + '</div>' +
      '<div class="card"><h2>Cobrado o pagado este mes, de otros meses</h2><p class="sub">Movieron la caja de ' + mesLabel(state.mes) + ' pero su resultado es de otro mes.</p>' +
      lista(deOtrosMeses, 'No hubo pagos de otros meses.') + '</div>';
  }

  function vistaLocales() {
    var cols = cfg.sucursales.map(function (s) { return { label: s.label, r: resultado(s.key, state.mes, 'eco') }; });
    var cons = resultado('todas', state.mes, 'eco');
    var max = Math.max.apply(null, cols.map(function (c) { return Math.abs(c.r.margen) || 0; }).concat([0.01]));
    var bars = cols.slice().sort(function (a, b) { return b.r.margen - a.r.margen; }).map(function (c) {
      var w = Math.min(100, Math.abs(c.r.margen || 0) / max * 100);
      return '<div class="bar"><span>' + esc(c.label) + '</span><div class="bar__track"><div class="bar__fill' + (c.r.margen < 0 ? ' neg' : '') +
        '" style="width:' + w + '%"></div></div><span class="num">' + pct(c.r.margen) + '</span></div>';
    }).join('');
    var h = '<div class="tbl-wrap"><table><thead><tr><th>Sucursal</th><th class="num">Ventas</th><th class="num">Food cost</th><th class="num">Costo laboral</th><th class="num">Gastos operativos</th><th class="num">Resultado</th><th class="num">Margen</th></tr></thead><tbody>';
    cols.concat([{ label: 'Consolidado', r: cons, tot: true }]).forEach(function (c) {
      var r = c.r;
      h += '<tr' + (c.tot ? ' class="tot key"' : '') + '><td>' + esc(c.label) + '</td><td class="num">' + money(r.ventas) + '</td><td class="num">' + pct(r.foodCost) +
        '</td><td class="num">' + pct(r.laboral) + '</td><td class="num">' + pct(r.oper / r.ventas) + '</td><td class="' + cls(r.resultado) + '">' + money(r.resultado) +
        '</td><td class="' + cls(r.margen) + '">' + pct(r.margen) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    return '<div class="kpis">' + kpi('Resultado consolidado', money(cons.resultado), 'margen ' + pct(cons.margen), true) +
      kpi('Ventas totales', money(cons.ventas)) + kpi('Food cost promedio', pct(cons.foodCost)) + kpi('Costo laboral promedio', pct(cons.laboral)) + '</div>' +
      '<div class="card"><h2>Margen operativo por local · ' + mesLabel(state.mes) + '</h2><p class="sub">Resultado operativo sobre ventas, criterio económico.</p><div class="bars">' + bars + '</div></div>' +
      '<div class="card"><h2>Comparativa entre locales</h2><p class="sub">Cada % es sobre las ventas del propio local.</p>' + h + '</div>' +
      '<div class="card"><h2>Estado de resultados por local</h2>' + tablaResultados(cols.concat([{ label: 'Consolidado', r: cons }])) + '</div>';
  }

  function vistaFacturas() {
    var sucOpts = cfg.sucursales.map(function (s) {
      return '<option value="' + s.key + '"' + (s.key === state.suc ? ' selected' : '') + '>' + esc(s.label) + '</option>';
    }).join('');
    var rubOpts = cfg.grupos.map(function (g) {
      return '<optgroup label="' + esc(g.label) + '">' + cfg.rubros.filter(function (r) { return r.grupo === g.key; }).map(function (r) {
        return '<option value="' + r.key + '">' + esc(r.label) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    var hoy = new Date().toISOString().slice(0, 10);
    var lista = facturas.filter(function (f) { return deSuc(f, state.suc) && f.mesEconomico === state.mes; })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    var rows = lista.map(function (f) {
      return '<tr><td>' + esc(f.fecha) + '</td><td>' + esc(sucLabel(f.sucursal)) + '</td><td>' + esc(f.proveedor) + (f.nota ? '<div class="muted" style="font-size:12px">' + esc(f.nota) + '</div>' : '') +
        '</td><td>' + esc(rubro(f.rubro).label) + '</td><td>' + (f.fechaPago ? esc(f.fechaPago) : '<span class="tag pend">pendiente</span>') +
        '</td><td class="' + cls(signo(f) * f.monto) + '">' + money(signo(f) * f.monto) + '</td><td>' +
        (f.fechaPago ? '' : '<button class="btn sm" data-pagar="' + esc(f.id) + '">Marcar pagada</button> ') +
        '<button class="btn sm ghost" data-borrar="' + esc(f.id) + '">Borrar</button></td></tr>';
    }).join('');
    return '<div class="card"><h2>Nueva factura</h2><p class="sub">El <b>mes económico</b> es el mes al que corresponde el gasto o la venta (ej. los sueldos de septiembre, aunque se paguen el 5 de octubre). Dejá la <b>fecha de pago</b> vacía si todavía no se pagó.</p>' +
      '<form class="form" id="f-nueva">' +
      '<label>Sucursal<select name="sucursal" required>' + sucOpts + '</select></label>' +
      '<label>Fecha factura<input type="date" name="fecha" value="' + hoy + '" required></label>' +
      '<label class="wide">Proveedor / concepto<input name="proveedor" required placeholder="Ej. Frigorífico Del Sur"></label>' +
      '<label>Rubro<select name="rubro" required>' + rubOpts + '</select></label>' +
      '<label>Monto<input type="number" name="monto" min="0" step="0.01" required inputmode="decimal"></label>' +
      '<label>Mes económico<input type="month" name="mesEconomico" value="' + state.mes + '" required></label>' +
      '<label>Fecha de pago<input type="date" name="fechaPago"></label>' +
      '<label class="wide">Nota<input name="nota" placeholder="Opcional"></label>' +
      '<div class="actions"><button class="btn pri" type="submit">Guardar factura</button></div></form>' +
      '<p class="hint">Si el rubro es de ventas, se registra como ingreso; el resto como egreso.</p></div>' +
      '<div class="card"><h2>Facturas de ' + mesLabel(state.mes) + ' · ' + esc(state.suc === 'todas' ? 'todas las sucursales' : sucLabel(state.suc)) + '</h2>' +
      '<p class="sub">' + lista.length + ' facturas con mes económico ' + mesLabel(state.mes) + '.</p>' +
      '<div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Sucursal</th><th>Proveedor / concepto</th><th>Rubro</th><th>Pago</th><th class="num">Monto</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" class="muted">Sin facturas.</td></tr>') + '</tbody></table></div>' +
      '<div class="tools"><button class="btn sm" id="b-csv">Descargar CSV (todas)</button>' +
      (cfg.apiUrl ? '' : '<button class="btn sm ghost" id="b-reset">Volver a los datos de ejemplo</button>') + '</div></div>';
  }

  /* ---------- acciones ---------- */
  function nuevoId() { return 'F' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function onSubmit(ev) {
    ev.preventDefault();
    var fd = new FormData(ev.target);
    var f = {
      id: nuevoId(), sucursal: fd.get('sucursal'), fecha: fd.get('fecha'), proveedor: String(fd.get('proveedor')).trim(),
      rubro: fd.get('rubro'), tipo: rubro(fd.get('rubro')).tipo, monto: Number(fd.get('monto')),
      mesEconomico: fd.get('mesEconomico'), fechaPago: fd.get('fechaPago') || null, nota: String(fd.get('nota') || '').trim()
    };
    facturas.push(f);
    persist('add', f).then(function () {
      if (f.mesEconomico !== state.mes) { state.mes = f.mesEconomico; fillMeses(); }
      render();
    }).catch(function (e) { facturas.pop(); alert(e.message); });
  }

  function onClick(ev) {
    var t = ev.target, id;
    if ((id = t.getAttribute('data-borrar'))) {
      if (!confirm('¿Borrar esta factura?')) return;
      var idx = facturas.findIndex(function (f) { return f.id === id; });
      var removed = facturas.splice(idx, 1)[0];
      persist('delete', removed).then(render).catch(function (e) { facturas.splice(idx, 0, removed); alert(e.message); });
    } else if ((id = t.getAttribute('data-pagar'))) {
      var fecha = prompt('Fecha de pago (AAAA-MM-DD)', new Date().toISOString().slice(0, 10));
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
      var f = facturas.find(function (x) { return x.id === id; });
      f.fechaPago = fecha;
      persist('update', f).then(render).catch(function (e) { f.fechaPago = null; alert(e.message); });
    } else if (t.id === 'b-csv') {
      var cols = ['id', 'sucursal', 'fecha', 'proveedor', 'tipo', 'rubro', 'monto', 'mesEconomico', 'fechaPago', 'nota'];
      var csv = cols.join(',') + '\n' + facturas.map(function (f) {
        return cols.map(function (c) { return '"' + String(f[c] == null ? '' : f[c]).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
      a.download = 'facturas.csv'; a.click();
    } else if (t.id === 'b-reset') {
      if (!confirm('Se borran las facturas cargadas en este navegador. ¿Seguir?')) return;
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      loadFacturas().then(function (d) { facturas = d; fillMeses(); render(); });
    } else if (t.hasAttribute('data-tab')) {
      state.tab = t.getAttribute('data-tab'); render();
    }
  }

  /* ---------- shell ---------- */
  function fillMeses() {
    var set = {};
    facturas.forEach(function (f) { set[f.mesEconomico] = 1; });
    var meses = Object.keys(set).sort();
    if (!state.mes || !set[state.mes]) state.mes = meses[meses.length - 1] || new Date().toISOString().slice(0, 7);
    $('f-mes').innerHTML = meses.map(function (m) {
      return '<option value="' + m + '"' + (m === state.mes ? ' selected' : '') + '>' + mesLabel(m) + '</option>';
    }).join('');
  }

  function render() {
    document.querySelectorAll('.g-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === state.tab); });
    var v = { economico: vistaEconomico, comparacion: vistaComparacion, locales: vistaLocales, facturas: vistaFacturas }[state.tab];
    $('g-view').innerHTML = v();
    var form = $('f-nueva'); if (form) form.addEventListener('submit', onSubmit);
  }

  getJSON('data/gestion-config.json').then(function (c) {
    cfg = c;
    $('f-suc').innerHTML = '<option value="todas">Todas (consolidado)</option>' + cfg.sucursales.map(function (s) {
      return '<option value="' + s.key + '">' + esc(s.label) + '</option>';
    }).join('');
    $('g-mode').textContent = cfg.apiUrl ? 'Datos: planilla compartida' : 'Datos: este navegador (modo demo)';
    return loadFacturas();
  }).then(function (d) {
    facturas = d || [];
    fillMeses();
    $('f-suc').addEventListener('change', function (e) { state.suc = e.target.value; render(); });
    $('f-mes').addEventListener('change', function (e) { state.mes = e.target.value; render(); });
    document.addEventListener('click', onClick);
    render();
  }).catch(function (e) {
    $('g-view').innerHTML = '<div class="card"><h2>No se pudieron cargar los datos</h2><p class="sub">' + esc(e.message) + '</p></div>';
  });
})();
