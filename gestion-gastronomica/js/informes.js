/* ============================================================
   Informes: tablero, económico mensual, acumulado, financiero,
   sueldos, cheques y comparativa de locales.
   Cada vista recibe el estado { suc, mes } y devuelve HTML.
   ============================================================ */
(function (G) {
  var esc = G.esc, money = G.money, pct = G.pct;
  G.vistas = G.vistas || {};

  function cls(v) { return 'num' + (v < 0 ? ' neg' : ''); }
  function sobre(v, ventas) { return ventas ? v / ventas : NaN; }

  /* Semáforo: siempre ícono + texto, nunca sólo color. */
  G.semaforo = function (estado, texto) {
    var m = { ok: ['✓', 'Bien'], alerta: ['!', 'Atención'], mal: ['✕', 'Mal'] }[estado];
    if (!m) return '';
    return '<span class="sem sem-' + estado + '" title="' + esc(texto || m[1]) + '"><i aria-hidden="true">' + m[0] + '</i><span class="sr">' + m[1] + '</span></span>';
  };
  // Para gastos: se mira el peso sobre ventas (pp), no el monto suelto.
  function semGasto(ppDelta) { return ppDelta <= 0.001 ? 'ok' : ppDelta <= 0.01 ? 'alerta' : 'mal'; }
  function semSube(d) { return d >= 0.02 ? 'ok' : d >= -0.02 ? 'alerta' : 'mal'; }

  /* ---------- estado de resultados en cascada ---------- */
  // cols = [{label, r}] ; opts.deltas compara las dos últimas columnas.
  G.cascada = function (cols, opts) {
    opts = opts || {};
    var h = '<div class="tbl-wrap"><table class="cascada"><thead><tr><th></th>';
    cols.forEach(function (c) { h += '<th class="num">' + esc(c.label) + '</th><th class="num pctcol">% vtas</th>'; });
    if (opts.deltas) h += '<th class="num">Dif. $</th><th class="num">Dif. %</th><th class="num">Peso</th><th></th>';
    h += '</tr></thead><tbody>';
    var a = cols.length > 1 ? cols[cols.length - 2].r : null, b = cols[cols.length - 1].r;

    function fila(label, get, tipo, kind) {
      // tipo: 'grupo' | 'rubro' | 'total' | 'resultado' ; kind: 'venta' | 'gasto' | 'resultado'
      var vals = cols.map(function (c) { return get(c.r); });
      if (tipo === 'rubro' && vals.every(function (v) { return !v; })) return;
      h += '<tr class="' + tipo + '"><td>' + label + '</td>';
      cols.forEach(function (c, i) {
        var v = vals[i], show = kind === 'gasto' ? -v : v;
        h += '<td class="' + cls(show) + '">' + money(show) + '</td><td class="num pctcol muted">' + (c.r.ventas ? pct(v / c.r.ventas) : '—') + '</td>';
      });
      if (opts.deltas && a) {
        var va = get(a), vb = get(b), d = vb - va, dp = va ? vb / va - 1 : NaN;
        var ppa = sobre(va, a.ventas), ppb = sobre(vb, b.ventas), dpp = ppb - ppa;
        var est = '';
        if (tipo !== 'rubro' || kind === 'gasto') {
          if (kind === 'gasto' && isFinite(dpp)) est = G.semaforo(semGasto(dpp), 'Pasó de ' + pct(ppa) + ' a ' + pct(ppb) + ' de las ventas');
          else if (kind === 'venta' && isFinite(dp)) est = G.semaforo(semSube(dp));
          else if (kind === 'resultado' && isFinite(dpp)) est = G.semaforo(dpp >= 0 ? 'ok' : dpp > -0.02 ? 'alerta' : 'mal', 'Margen ' + G.pp(dpp));
        }
        var dShow = kind === 'gasto' ? d : d;
        h += '<td class="num">' + (d ? (d > 0 ? '+' : '') + money(dShow) : '—') + '</td><td class="num muted">' + (isFinite(dp) && va ? (dp > 0 ? '+' : '') + pct(dp, 0) : '—') +
          '</td><td class="num muted">' + (isFinite(dpp) && (va || vb) ? G.pp(dpp) : '—') + '</td><td>' + est + '</td>';
      }
      h += '</tr>';
    }
    function margen(label, get) {
      h += '<tr class="margen"><td>' + label + '</td>';
      cols.forEach(function (c) { var v = sobre(get(c.r), c.r.ventas); h += '<td class="' + cls(v) + '">' + pct(v) + '</td><td></td>'; });
      if (opts.deltas && a) { var dpp = sobre(get(b), b.ventas) - sobre(get(a), a.ventas); h += '<td></td><td></td><td class="num muted">' + G.pp(dpp) + '</td><td></td>'; }
      h += '</tr>';
    }
    function grupo(g) {
      fila(esc(g.label), function (r) { return r.grp[g.key] || 0; }, 'grupo', 'gasto');
      if (opts.detalle !== false) g.rubros.forEach(function (rb) { fila(esc(rb.label), function (r) { return r.rub[rb.key] || 0; }, 'rubro', 'gasto'); });
    }
    fila('Ventas', function (r) { return r.ventas; }, 'grupo venta', 'venta');
    G.cfg.ventas.forEach(function (v) { fila(esc(v.label), function (r) { return r.porCanal[v.key] || 0; }, 'rubro', 'venta'); });
    G.cfg.grupos.forEach(grupo);
    fila('Total costo de la operación', function (r) { return r.costoOperacion; }, 'total', 'gasto');
    fila('Resultado de la operación', function (r) { return r.resOperacion; }, 'resultado', 'resultado');
    margen('Margen de la operación', function (r) { return r.resOperacion; });
    G.cfg.gruposDebajo.forEach(function (g) {
      grupo(g);
      if (g.key === 'marketing') {
        fila('Resultado antes de impuestos y reinversión', function (r) { return r.resAntesImp; }, 'resultado', 'resultado');
        margen('Margen antes de impuestos', function (r) { return r.resAntesImp; });
      } else if (g.key === 'impuestos') {
        fila('Resultado luego de impuestos', function (r) { return r.resLuegoImp; }, 'resultado key', 'resultado');
        margen('Rentabilidad luego de impuestos', function (r) { return r.resLuegoImp; });
      } else if (g.key === 'reinversion') {
        fila('Resultado luego de reinversión', function (r) { return r.resLuegoReinv; }, 'resultado', 'resultado');
        margen('Margen luego de reinversión', function (r) { return r.resLuegoReinv; });
      }
    });
    fila('Retiros de socios', function (r) { return r.retiros; }, 'grupo', 'gasto');
    margen('Retiros sobre ventas', function (r) { return r.retiros; });
    return h + '</tbody></table></div>';
  };

  function kpi(l, v, s, extra) {
    return '<div class="kpi' + (extra && extra.key ? ' key' : '') + '">' + '<div class="kpi__l">' + l + '</div><div class="kpi__v">' + v + '</div>' +
      (s ? '<div class="kpi__s">' + s + '</div>' : '') + '</div>';
  }
  function titulo(st) { return st.suc === 'todas' ? 'Todas las sucursales' : G.sucLabel(st.suc); }
  function card(h2, sub, body, extra) {
    return '<section class="card' + (extra ? ' ' + extra : '') + '"><h2>' + h2 + '</h2>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + body + '</section>';
  }
  function tablaDatos(cabeceras, filas) {
    return '<details class="datos"><summary>Ver los datos</summary><div class="tbl-wrap"><table><thead><tr>' +
      cabeceras.map(function (c, i) { return '<th' + (i ? ' class="num"' : '') + '>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      filas.map(function (f) { return '<tr>' + f.map(function (c, i) { return '<td' + (i ? ' class="num"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></details>';
  }

  /* ---------- tablero ---------- */
  G.vistas.tablero = function (st) {
    var cur = G.economico(st.suc, [st.mes]), prev = G.economico(st.suc, [G.addMes(st.mes, -1)]);
    var anioAnt = G.economico(st.suc, [G.addMes(st.mes, -12)]);
    var dv = prev.ventas ? cur.ventas / prev.ventas - 1 : NaN;
    var prov = sobre(cur.grp.proveedores || 0, cur.ventas), provA = sobre(prev.grp.proveedores || 0, prev.ventas);
    var rent = sobre(cur.resLuegoImp, cur.ventas), rentA = sobre(prev.resLuegoImp, prev.ventas);
    var deuda = G.deuda(st.suc, st.mes), deudaV = sobre(deuda.comercial + deuda.impositiva, cur.ventas);
    var rev = G.revisar(st.suc, st.mes), pend = rev.cuenta.error + rev.cuenta.falta;

    var estado = '<a class="kpi kpi-link' + (pend ? ' warn' : ' ok') + '" href="#revision">' +
      '<div class="kpi__l">Estado de la carga</div><div class="kpi__v">' + (pend ? pend + ' para resolver' : 'Lista') + '</div>' +
      '<div class="kpi__s">' + rev.cuenta.error + ' errores · ' + rev.cuenta.falta + ' faltantes · ' + rev.cuenta.revisar + ' para revisar →</div></a>';

    var h = '<div class="kpis">' +
      kpi('Ventas', money(cur.ventas), G.semaforo(semSube(dv)) + ' ' + (isFinite(dv) ? (dv > 0 ? '+' : '') + pct(dv) + ' vs ' + G.mesLabel(G.addMes(st.mes, -1), true) : 'sin mes anterior') +
        (anioAnt.ventas ? ' · ' + (cur.ventas / anioAnt.ventas - 1 > 0 ? '+' : '') + pct(cur.ventas / anioAnt.ventas - 1, 0) + ' vs hace un año' : '')) +
      kpi('Proveedores sobre ventas', pct(prov), (isFinite(provA) ? G.semaforo(semGasto(prov - provA)) + ' ' + G.pp(prov - provA) + ' vs mes anterior' : '')) +
      kpi('Rentabilidad', pct(rent), 'luego de impuestos, antes de reinversión · ' + (isFinite(rentA) ? G.semaforo(rent - rentA >= 0 ? 'ok' : rent - rentA > -0.02 ? 'alerta' : 'mal') + ' ' + G.pp(rent - rentA) : '')) +
      kpi('Deuda sobre ventas', pct(deudaV), money(deuda.comercial) + ' a proveedores · ' + money(deuda.impositiva) + ' de impuestos') +
      estado + '</div>';

    h += card('Lectura del mes', '', '<div class="lectura">' + lectura(st, cur, prev) + '</div>');

    // 12 meses, sin los primeros que no tienen ventas
    var meses = G.ultimosMeses(st.mes, 12);
    while (meses.length > 1 && !G.economico(st.suc, [meses[0]]).ventas) meses.shift();
    var eco = meses.map(function (m) { return { m: m, r: G.economico(st.suc, [m]) }; });
    var ventasChart = G.chartBarras(eco.map(function (e) {
      return { label: G.mesLabel(e.m, true), valores: { v: e.r.ventas }, tip: '<b>' + G.mesLabel(e.m) + '</b><br>Ventas ' + money(e.r.ventas) + '<br>Resultado ' + money(e.r.resLuegoImp) };
    }), [{ key: 'v', label: 'Ventas', color: '--seq' }], { label: 'Ventas por mes' });
    var rentChart = G.chartLinea(eco.map(function (e) {
      var v = sobre(e.r.resLuegoImp, e.r.ventas);
      return { label: G.mesLabel(e.m, true), v: v, tip: '<b>' + G.mesLabel(e.m) + '</b><br>Rentabilidad ' + pct(v) + '<br>' + money(e.r.resLuegoImp) };
    }), { label: 'Rentabilidad por mes' });

    h += '<div class="grid2">' +
      card('Ventas por mes', 'Criterio económico (lo vendido en cada mes, cobrado o no).', ventasChart +
        tablaDatos(['Mes', 'Ventas', 'Resultado'], eco.map(function (e) { return [G.mesLabel(e.m), money(e.r.ventas), money(e.r.resLuegoImp)]; }))) +
      card('Rentabilidad sobre ventas', 'Resultado luego de impuestos, antes de reinversión.', rentChart +
        tablaDatos(['Mes', 'Rentabilidad'], eco.map(function (e) { return [G.mesLabel(e.m), pct(sobre(e.r.resLuegoImp, e.r.ventas))]; }))) +
      '</div>';

    var filas = G.todosGrupos().map(function (g) {
      var v = sobre(cur.grp[g.key] || 0, cur.ventas), ref = sobre(prev.grp[g.key] || 0, prev.ventas);
      return { label: g.label, v: v, ref: ref, tip: '<b>' + esc(g.label) + '</b><br>' + G.mesLabel(st.mes) + ': ' + pct(v) + ' (' + money(cur.grp[g.key] || 0) + ')<br>Mes anterior: ' + pct(ref) };
    });
    var deudas = meses.map(function (m) { return { m: m, d: G.deuda(st.suc, m), v: G.economico(st.suc, [m]).ventas }; });
    var seriesDeuda = [{ key: 'c', label: 'Deuda con proveedores', color: '--s1' }, { key: 'i', label: 'Deuda de impuestos', color: '--s2' }];
    h += '<div class="grid2">' +
      card('¿En qué se va la plata?', 'Peso de cada grupo de gastos sobre las ventas de ' + G.mesLabel(st.mes) + '. La rayita es el mes anterior.',
        G.chartHBarras(filas, { label: 'Peso de cada grupo de gastos' }) +
        tablaDatos(['Grupo', G.mesLabel(st.mes), 'Mes anterior'], filas.map(function (f) { return [esc(f.label), pct(f.v), pct(f.ref)]; }))) +
      card('Endeudamiento al cierre de cada mes', 'Lo que ya se consumió y todavía no se pagó (incluye cheques sin vencer).',
        G.leyenda(seriesDeuda) + G.chartBarras(deudas.map(function (e) {
          return { label: G.mesLabel(e.m, true), valores: { c: e.d.comercial, i: e.d.impositiva },
            tip: '<b>' + G.mesLabel(e.m) + '</b><br>Proveedores ' + money(e.d.comercial) + '<br>Impuestos ' + money(e.d.impositiva) + '<br>Sobre ventas ' + pct(sobre(e.d.comercial + e.d.impositiva, e.v)) };
        }), seriesDeuda, { label: 'Endeudamiento por mes' }) +
        tablaDatos(['Mes', 'Proveedores', 'Impuestos', 'Sobre ventas'], deudas.map(function (e) { return [G.mesLabel(e.m), money(e.d.comercial), money(e.d.impositiva), pct(sobre(e.d.comercial + e.d.impositiva, e.v))]; }))) +
      '</div>';
    return h;
  };

  // Texto automático: qué pasó en el mes, en criollo.
  function lectura(st, cur, prev) {
    var out = [];
    if (!cur.ventas) return '<p>No hay ventas cargadas en ' + G.mesLabel(st.mes) + '.</p>';
    var dv = prev.ventas ? cur.ventas / prev.ventas - 1 : NaN;
    if (isFinite(dv)) out.push('Las ventas ' + (Math.abs(dv) < 0.02 ? 'se mantuvieron' : dv > 0 ? 'subieron <b>' + pct(dv, 0) + '</b>' : 'bajaron <b>' + pct(-dv, 0) + '</b>') + ' respecto de ' + G.mesLabel(G.addMes(st.mes, -1)) + '.');
    var rent = sobre(cur.resLuegoImp, cur.ventas);
    out.push('De cada $100 que se vendieron quedaron <b>$' + Math.round(rent * 100) + '</b> después de pagar costos e impuestos (' + money(cur.resLuegoImp) + ').');
    if (prev.ventas) {
      var cambios = G.todosGrupos().map(function (g) {
        return { g: g, d: sobre(cur.grp[g.key] || 0, cur.ventas) - sobre(prev.grp[g.key] || 0, prev.ventas) };
      }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
      var c = cambios[0];
      if (c && Math.abs(c.d) >= 0.01) {
        var rub = c.g.rubros.map(function (rb) { return { rb: rb, d: (cur.rub[rb.key] || 0) - (prev.rub[rb.key] || 0) }; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })[0];
        out.push('Lo que más se movió fue <b>' + esc(c.g.label) + '</b>: pasó de ' + pct(sobre(prev.grp[c.g.key] || 0, prev.ventas)) + ' a ' + pct(sobre(cur.grp[c.g.key] || 0, cur.ventas)) +
          ' de las ventas' + (rub && rub.d ? ', sobre todo por ' + esc(rub.rb.label) + ' (' + (rub.d > 0 ? '+' : '') + money(rub.d) + ')' : '') + '.');
      }
    }
    var rev = G.revisar(st.suc, st.mes);
    if (rev.cuenta.error + rev.cuenta.falta) out.push('<span class="aviso">Ojo: hay ' + rev.cuenta.error + ' errores y ' + rev.cuenta.falta + ' faltantes en la carga, así que estos números pueden cambiar. <a href="#revision">Revisar ahora →</a></span>');
    return out.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  }

  /* ---------- económico mensual ---------- */
  G.vistas.economico = function (st) {
    var ant = G.addMes(st.mes, -1);
    var cols = [{ label: G.mesLabel(ant, true), r: G.economico(st.suc, [ant]) }, { label: G.mesLabel(st.mes, true), r: G.economico(st.suc, [st.mes]) }];
    return card('Económico mensual · ' + esc(titulo(st)), 'Cada gasto cuenta en el mes al que corresponde, se haya pagado o no. ' +
      'El semáforo de los gastos mira si subió o bajó su <b>peso sobre las ventas</b>; la columna “Peso” muestra esa diferencia en puntos.',
      G.cascada(cols, { deltas: true }));
  };

  /* ---------- acumulado ---------- */
  G.vistas.acumulado = function (st) {
    var tri = G.trimestres(st.mes), y = st.mes.slice(0, 4);
    var cols = tri.map(function (t) { return { label: t.label, r: G.economico(st.suc, t.meses) }; });
    var todos = []; tri.forEach(function (t) { todos = todos.concat(t.meses); });
    cols.push({ label: 'Año ' + y + ' (a ' + G.mesLabel(st.mes, true) + ')', r: G.economico(st.suc, todos) });
    return card('Económico acumulado ' + y + ' · ' + esc(titulo(st)), 'Trimestres del año hasta ' + G.mesLabel(st.mes) + '. El último trimestre puede estar incompleto.', G.cascada(cols));
  };

  /* ---------- financiero ---------- */
  G.vistas.financiero = function (st) {
    var f = G.financiero(st.suc, st.mes), cajas = G.cfg.cajas;
    var h = '<div class="tbl-wrap"><table class="cascada"><thead><tr><th></th>' + cajas.map(function (c) { return '<th class="num">' + esc(c.label) + '</th>'; }).join('') + '<th class="num">Total</th></tr></thead><tbody>';
    function fila(label, getCaja, tipo) {
      var tot = 0, cells = cajas.map(function (c) { var v = getCaja(c.key) || 0; tot += v; return '<td class="' + cls(v) + '">' + (v ? money(v) : '<span class="muted">—</span>') + '</td>'; }).join('');
      if (tipo === 'rubro' && !tot && !cajas.some(function (c) { return getCaja(c.key); })) return;
      h += '<tr class="' + tipo + '"><td>' + label + '</td>' + cells + '<td class="' + cls(tot) + '">' + money(tot) + '</td></tr>';
    }
    function linea(bucket, k) { return function (c) { return (bucket[k] || {})[c] || 0; }; }
    fila('Saldo al inicio del mes', function (c) { return f.cajas[c].inicial; }, 'total');
    fila('Entró', function (c) { return f.cajas[c].entra; }, 'grupo venta');
    G.cfg.ventas.forEach(function (v) { fila('Cobro de ventas · ' + esc(v.label), linea(f.ingresos, 'venta:' + v.key), 'rubro'); });
    fila('Pases desde otra caja', linea(f.ingresos, 'transf'), 'rubro');
    fila('Salió', function (c) { return -f.cajas[c].sale; }, 'grupo');
    G.todosGrupos().forEach(function (g) { fila(esc(g.label), function (c) { return -((f.egresos['grupo:' + g.key] || {})[c] || 0); }, 'rubro'); });
    fila('Retiros de socios', function (c) { return -((f.egresos.retiros || {})[c] || 0); }, 'rubro');
    fila('Pases a otra caja', function (c) { return -((f.egresos.transf || {})[c] || 0); }, 'rubro');
    fila('Saldo al final del mes', function (c) { return f.cajas[c].final; }, 'resultado key');
    h += '</tbody></table></div>';

    var eco = G.economico(st.suc, [st.mes]);
    // Los pases entre cajas suman cero en el total; los retiros se excluyen para comparar con el económico.
    var cajaNegocio = f.total.entra - f.total.sale + (f.egresos.retiros ? sumObj(f.egresos.retiros) : 0);
    var expl = explicar(st);
    var comp = '<div class="kpis">' +
      kpi('Económico', money(eco.resLuegoReinv), '¿El negocio dio plata en el mes?', { key: 1 }) +
      kpi('Financiero', money(cajaNegocio), '¿Cuánta plata entró menos la que salió? (sin retiros ni pases entre cajas)') +
      kpi('Diferencia', money(eco.resLuegoReinv - cajaNegocio), 'se explica abajo') + '</div>' + expl;

    return card('Financiero · ' + esc(titulo(st)) + ' · ' + G.mesLabel(st.mes), 'La plata que realmente entró y salió de cada caja, según la fecha de cobro o de pago. Los cheques salen del banco el día que vencen.', h) +
      card('Económico vs financiero', 'Mismos registros, dos criterios. Lo que los separa son las cosas cobradas o pagadas en otro mes.', comp);
  };
  function sumObj(o) { return Object.keys(o).reduce(function (a, k) { return a + o[k]; }, 0); }

  function explicar(st) {
    var fin = G.addMes(st.mes, 1) + '-01', ini = st.mes + '-01';
    var noPagado = [], deOtros = [];
    G.regs.forEach(function (r) {
      if (!G.deSuc(r, st.suc) || (r.tipo !== 'gasto' && r.tipo !== 'venta')) return;
      var enMes = r.fechaPago && r.fechaPago >= ini && r.fechaPago < fin;
      if (r.mes === st.mes && !enMes) noPagado.push(r);
      else if (r.mes !== st.mes && enMes) deOtros.push(r);
    });
    function total(arr) { return arr.reduce(function (a, r) { return a + (r.tipo === 'venta' ? 1 : -1) * r.monto; }, 0); }
    var cuenta = '<p class="cuenta">Diferencia = lo del mes sin cobrar ni pagar (<b>' + money(total(noPagado)) + '</b>) menos lo cobrado o pagado de otros meses (<b>' +
      money(total(deOtros)) + '</b>) = <b>' + money(total(noPagado) - total(deOtros)) + '</b>.</p>';
    function resumen(arr, titulo, sub) {
      var porG = {}, total = 0;
      arr.forEach(function (r) {
        var g = r.tipo === 'venta' ? 'Ventas' : G.rubro(r.rubro).grupoLabel, v = (r.tipo === 'venta' ? 1 : -1) * r.monto;
        porG[g] = (porG[g] || 0) + v; total += v;
      });
      var top = arr.slice().sort(function (a, b) { return b.monto - a.monto; });
      return '<h3>' + titulo + ' <span class="muted">(' + arr.length + ' registros, ' + money(total) + ')</span></h3><p class="sub">' + sub + '</p>' +
        '<div class="chips">' + Object.keys(porG).map(function (g) { return '<span class="chip">' + esc(g) + ' <b class="' + (porG[g] < 0 ? 'neg' : '') + '">' + money(porG[g]) + '</b></span>'; }).join('') + '</div>' +
        '<details class="datos"><summary>Ver el detalle</summary>' + G.tablaRegistros(top, { compacta: true }) + '</details>';
    }
    return cuenta + resumen(noPagado, 'Del mes, sin cobrar o pagar en el mes', 'Cuentan en el económico de ' + G.mesLabel(st.mes) + ' pero no movieron su caja (pendientes, cheques que vencen después, ventas a cobrar).') +
      resumen(deOtros, 'Cobrado o pagado en el mes, de otros meses', 'Movieron la caja de ' + G.mesLabel(st.mes) + ' pero su resultado es de otro mes (ej. sueldos del mes anterior).');
  }

  /* ---------- sueldos ---------- */
  G.vistas.sueldos = function (st) {
    var meses = G.ultimosMeses(st.mes, 3), rubros = [];
    G.todosGrupos().forEach(function (g) { g.rubros.forEach(function (rb) { if (rb.persona) rubros.push(rb); }); });
    var h = '<div class="tbl-wrap"><table class="cascada"><thead><tr><th>Área</th><th>Persona</th>' + meses.map(function (m) { return '<th class="num">' + G.mesLabel(m, true) + '</th>'; }).join('') + '<th class="num">Total</th></tr></thead><tbody>';
    var totMes = meses.map(function () { return 0; }), hay = false;
    rubros.forEach(function (rb) {
      var pers = {};
      G.regs.forEach(function (r) {
        if (r.tipo !== 'gasto' || r.rubro !== rb.key || !G.deSuc(r, st.suc) || meses.indexOf(r.mes) < 0) return;
        var p = (r.persona || '(sin nombre)') + (st.suc === 'todas' ? ' · ' + G.sucLabel(r.sucursal) : '');
        pers[p] = pers[p] || meses.map(function () { return 0; });
        pers[p][meses.indexOf(r.mes)] += Number(r.monto) || 0;
      });
      var nombres = Object.keys(pers).sort();
      if (!nombres.length) return;
      hay = true;
      var sub = meses.map(function () { return 0; });
      nombres.forEach(function (p, i) {
        var t = 0;
        h += '<tr class="rubro"><td>' + (i ? '' : esc(rb.label)) + '</td><td>' + esc(p) + '</td>' + pers[p].map(function (v, j) {
          sub[j] += v; t += v; return '<td class="num">' + (v ? money(v) : '<span class="tag pend">sin cargar</span>') + '</td>';
        }).join('') + '<td class="num">' + money(t) + '</td></tr>';
      });
      h += '<tr class="grupo"><td colspan="2">Total ' + esc(rb.label) + '</td>' + sub.map(function (v, j) { totMes[j] += v; return '<td class="num">' + money(v) + '</td>'; }).join('') + '<td class="num">' + money(sub.reduce(function (a, b) { return a + b; }, 0)) + '</td></tr>';
    });
    var cargas = meses.map(function (m) { return G.economico(st.suc, [m]).rub.f931 || 0; });
    h += '<tr class="resultado key"><td colspan="2">Total sueldos</td>' + totMes.map(function (v) { return '<td class="num">' + money(v) + '</td>'; }).join('') + '<td class="num">' + money(totMes.reduce(function (a, b) { return a + b; }, 0)) + '</td></tr>' +
      '<tr class="margen"><td colspan="2">Cargas sociales (F.931) sobre sueldos</td>' + cargas.map(function (c, j) { return '<td class="num">' + (totMes[j] ? pct(c / totMes[j]) : '—') + '</td>'; }).join('') + '<td></td></tr>';
    h += '</tbody></table></div>';
    return card('Sueldos por persona · ' + esc(titulo(st)), 'Por mes de aplicación (el mes trabajado). “Sin cargar” marca a quien cobró otro mes y en ese no tiene sueldo.', hay ? h : '<p class="sub">No hay sueldos cargados en estos meses.</p>');
  };

  /* ---------- cheques ---------- */
  G.vistas.cheques = function (st) {
    var cheques = G.regs.filter(function (r) { return r.medio === 'cheque' && G.deSuc(r, st.suc); });
    function pivot(campo, meses, titulo, sub) {
      var prov = {}, tot = meses.map(function () { return 0; });
      cheques.forEach(function (r) {
        var m = (r[campo] || '').slice(0, 7), i = meses.indexOf(m);
        if (i < 0) return;
        if (campo === 'fechaPago' && r.emisionCheque && r.emisionCheque >= G.addMes(st.mes, 1) + '-01') return;
        prov[r.detalle] = prov[r.detalle] || meses.map(function () { return 0; });
        prov[r.detalle][i] += Number(r.monto) || 0; tot[i] += Number(r.monto) || 0;
      });
      var nombres = Object.keys(prov).sort();
      var h = '<div class="tbl-wrap"><table class="cascada"><thead><tr><th>Proveedor</th>' + meses.map(function (m) { return '<th class="num">' + G.mesLabel(m, true) + '</th>'; }).join('') + '<th class="num">Total</th></tr></thead><tbody>' +
        nombres.map(function (p) { var t = 0; return '<tr class="rubro"><td>' + esc(p) + '</td>' + prov[p].map(function (v) { t += v; return '<td class="num">' + (v ? money(v) : '') + '</td>'; }).join('') + '<td class="num">' + money(t) + '</td></tr>'; }).join('') +
        '<tr class="resultado"><td>Total</td>' + tot.map(function (v) { return '<td class="num">' + money(v) + '</td>'; }).join('') + '<td class="num">' + money(tot.reduce(function (a, b) { return a + b; }, 0)) + '</td></tr></tbody></table></div>';
      return card(titulo, sub, nombres.length ? h : '<p class="sub">No hay cheques en este período.</p>');
    }
    var futuros = [st.mes, G.addMes(st.mes, 1), G.addMes(st.mes, 2), G.addMes(st.mes, 3)];
    return pivot('emisionCheque', G.ultimosMeses(st.mes, 3), 'Cheques emitidos', 'Por mes en que se entregaron.') +
      pivot('fechaPago', futuros, 'Cheques por vencer', 'Emitidos hasta fin de ' + G.mesLabel(st.mes) + ', por mes de vencimiento: es la plata que va a salir del banco.');
  };

  /* ---------- locales ---------- */
  G.vistas.locales = function (st) {
    var cols = G.cfg.sucursales.map(function (s) { return { label: s.label, r: G.economico(s.key, [st.mes]) }; });
    var cons = { label: 'Consolidado', r: G.economico('todas', [st.mes]) };
    var filas = cols.map(function (c) { var v = sobre(c.r.resLuegoImp, c.r.ventas); return { label: c.label, v: v, tip: '<b>' + esc(c.label) + '</b><br>Rentabilidad ' + pct(v) + '<br>' + money(c.r.resLuegoImp) }; })
      .sort(function (a, b) { return b.v - a.v; });
    var h = '<div class="tbl-wrap"><table class="cascada"><thead><tr><th>Sucursal</th><th class="num">Ventas</th><th class="num">Proveedores</th><th class="num">Sueldos</th><th class="num">Margen operación</th><th class="num">Rentabilidad</th><th class="num">Resultado</th></tr></thead><tbody>' +
      cols.concat([cons]).map(function (c, i) {
        var r = c.r;
        return '<tr class="' + (i === cols.length ? 'resultado key' : 'rubro') + '"><td>' + esc(c.label) + '</td><td class="num">' + money(r.ventas) + '</td><td class="num">' + pct(sobre(r.grp.proveedores || 0, r.ventas)) +
          '</td><td class="num">' + pct(sobre(r.grp.sueldos || 0, r.ventas)) + '</td><td class="' + cls(r.resOperacion) + '">' + pct(sobre(r.resOperacion, r.ventas)) + '</td><td class="' + cls(r.resLuegoImp) + '">' + pct(sobre(r.resLuegoImp, r.ventas)) +
          '</td><td class="' + cls(r.resLuegoImp) + '">' + money(r.resLuegoImp) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return card('Rentabilidad por local · ' + G.mesLabel(st.mes), 'Resultado luego de impuestos sobre las ventas de cada local.', G.chartHBarras(filas, { label: 'Rentabilidad por local' })) +
      card('Comparativa', 'Cada % es sobre las ventas del propio local.', h) +
      card('Estado de resultados por local', '', G.cascada(cols.concat([cons]), { detalle: false }));
  };
})(window.G);
