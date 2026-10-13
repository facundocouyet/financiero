/* ============================================================
   Núcleo: datos, formato y cálculo.
   Un REGISTRO es cualquier cosa que se carga:
     tipo 'venta'         ventas (rubro = local | mayorista | delivery)
     tipo 'gasto'         facturas y gastos (rubro = un rubro de config)
     tipo 'retiro'        retiros de socios (no es gasto del negocio)
     tipo 'transferencia' plata que pasa de una caja a otra
   Campos: id, sucursal, tipo, fecha, mes (mes de aplicación = económico),
   rubro, detalle (proveedor/concepto), persona, comprobante, nro, monto,
   medio, fechaPago (vacío = pendiente; en cheques = vencimiento),
   emisionCheque, destino (transferencias), nota.
     · ECONÓMICO de un mes  = registros cuyo `mes` es ese mes.
     · FINANCIERO de un mes = registros cuya `fechaPago` cae en ese mes.
   ============================================================ */
window.G = (function () {
  var G = { cfg: null, regs: [], ignorados: {} };
  var LS_REGS = 'gg.registros.v1', LS_IGN = 'gg.ignorados.v1';

  /* ---------- formato ---------- */
  G.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  G.money = function (v) {
    var n = Math.round(Number(v) || 0);
    return (n < 0 ? '−' : '') + G.cfg.moneda + Math.abs(n).toLocaleString('es-AR');
  };
  G.moneyShort = function (v) {
    var n = Number(v) || 0, a = Math.abs(n), s;
    if (a >= 1e6) s = (a / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
    else if (a >= 1e3) s = Math.round(a / 1e3).toLocaleString('es-AR') + ' mil';
    else s = Math.round(a).toLocaleString('es-AR');
    return (n < 0 ? '−' : '') + G.cfg.moneda + s;
  };
  G.pct = function (v, dec) {
    if (!isFinite(v)) return '—';
    return (v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(dec == null ? 1 : dec).replace('.', ',') + '%';
  };
  G.pp = function (v) {
    if (!isFinite(v)) return '—';
    return (v < 0 ? '−' : '+') + Math.abs(v * 100).toFixed(1).replace('.', ',') + ' pp';
  };
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  G.mesLabel = function (m, corto) {
    if (!m) return '—';
    var p = m.split('-'), n = MESES[+p[1] - 1];
    if (corto) return n.slice(0, 3) + '-' + p[0].slice(2);
    return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + p[0];
  };
  G.fechaLabel = function (f) { if (!f) return '—'; var p = f.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  G.addMes = function (m, n) {
    var p = m.split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  G.mesDiff = function (a, b) { // meses de a hasta b
    var pa = a.split('-'), pb = b.split('-');
    return (+pb[0] - +pa[0]) * 12 + (+pb[1] - +pa[1]);
  };
  G.hoy = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  G.diasEntre = function (a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); };
  G.norm = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  };

  /* ---------- catálogo ---------- */
  G.todosGrupos = function () { return G.cfg.grupos.concat(G.cfg.gruposDebajo); };
  var _rubros = null;
  G.rubro = function (key) {
    if (!_rubros) {
      _rubros = {};
      G.todosGrupos().forEach(function (g) { g.rubros.forEach(function (r) { _rubros[r.key] = Object.assign({ grupo: g.key, grupoLabel: g.label }, r); }); });
      G.cfg.ventas.forEach(function (v) { _rubros[v.key] = Object.assign({ grupo: 'ventas', grupoLabel: 'Ventas' }, v); });
    }
    return _rubros[key] || { key: key, label: key || '(sin rubro)', grupo: '' };
  };
  G.sucLabel = function (k) { var s = G.cfg.sucursales.find(function (x) { return x.key === k; }); return s ? s.label : k; };
  G.medioLabel = function (k) { var s = G.cfg.medios.find(function (x) { return x.key === k; }); return s ? s.label : (k || '—'); };
  G.cajaLabel = function (k) { var s = G.cfg.cajas.find(function (x) { return x.key === k; }); return s ? s.label : k; };
  // El cheque sale del banco el día que vence.
  G.cajaDe = function (medio) { return medio === 'cheque' ? 'banco' : medio; };

  /* ---------- persistencia ---------- */
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo leer ' + url + ' (' + r.status + ')');
      return r.json();
    });
  }
  G.init = function () {
    return getJSON('data/config.json').then(function (c) {
      G.cfg = c;
      try { G.ignorados = JSON.parse(localStorage.getItem(LS_IGN) || '{}'); } catch (e) { G.ignorados = {}; }
      if (c.apiUrl) return getJSON(c.apiUrl).then(function (d) { return d.registros; });
      try {
        var saved = localStorage.getItem(LS_REGS);
        if (saved) return JSON.parse(saved);
      } catch (e) { /* sin storage: seguimos con el demo */ }
      return getJSON('data/demo.json').then(function (d) { return d.registros; });
    }).then(function (regs) { G.setRegs(regs || []); });
  };
  G.modo = function () { return G.cfg.apiUrl ? 'planilla' : 'navegador'; };

  function api(body) {
    // text/plain evita el preflight CORS de Apps Script
    return fetch(G.cfg.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!d.ok) throw new Error(d.error || 'No se pudo guardar'); });
  }
  function guardarLocal() {
    try { localStorage.setItem(LS_REGS, JSON.stringify(G.regs)); }
    catch (e) { throw new Error('No se pudo guardar en este navegador (¿espacio lleno o modo privado?).'); }
  }
  G.nuevoId = function () { return 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  G.agregar = function (lista) {
    lista.forEach(function (r) { r.id = r.id || G.nuevoId(); r.creado = new Date().toISOString(); });
    var prev = G.regs;
    G.setRegs(G.regs.concat(lista));
    var p = G.cfg.apiUrl ? api({ action: 'add', registros: lista }) : Promise.resolve().then(guardarLocal);
    return p.catch(function (e) { G.setRegs(prev); throw e; });
  };
  G.actualizar = function (reg) {
    var prev = G.regs;
    G.setRegs(G.regs.map(function (r) { return r.id === reg.id ? reg : r; }));
    var p = G.cfg.apiUrl ? api({ action: 'update', registro: reg }) : Promise.resolve().then(guardarLocal);
    return p.catch(function (e) { G.setRegs(prev); throw e; });
  };
  G.borrar = function (id) {
    var prev = G.regs;
    G.setRegs(G.regs.filter(function (r) { return r.id !== id; }));
    var p = G.cfg.apiUrl ? api({ action: 'delete', id: id }) : Promise.resolve().then(guardarLocal);
    return p.catch(function (e) { G.setRegs(prev); throw e; });
  };
  G.reiniciarDemo = function () {
    try { localStorage.removeItem(LS_REGS); localStorage.removeItem(LS_IGN); } catch (e) {}
    G.ignorados = {};
    return getJSON('data/demo.json').then(function (d) { G.setRegs(d.registros); });
  };
  G.ignorar = function (checkId) {
    G.ignorados[checkId] = new Date().toISOString();
    G._cache = {};
    try { localStorage.setItem(LS_IGN, JSON.stringify(G.ignorados)); } catch (e) {}
  };

  G.reactivar = function (checkId) {
    delete G.ignorados[checkId];
    G._cache = {};
    try { localStorage.setItem(LS_IGN, JSON.stringify(G.ignorados)); } catch (e) {}
  };

  G.setRegs = function (regs) {
    G.regs = regs;
    G._cache = {};
    var meses = {};
    regs.forEach(function (r) { if (r.mes) meses[r.mes] = 1; });
    G.meses = Object.keys(meses).sort();
  };
  G.byId = function (id) { return G.regs.find(function (r) { return r.id === id; }); };

  /* ---------- cálculo ---------- */
  function deSuc(r, suc) { return suc === 'todas' || r.sucursal === suc; }
  G.deSuc = deSuc;

  // Económico de un período: meses = lista de 'YYYY-MM'.
  G.economico = function (suc, meses) {
    var key = 'eco|' + suc + '|' + meses.join(',');
    if (G._cache[key]) return G._cache[key];
    var set = {}; meses.forEach(function (m) { set[m] = 1; });
    var rub = {}, grp = {}, ventas = 0, retiros = 0, porCanal = {};
    G.regs.forEach(function (r) {
      if (!set[r.mes] || !deSuc(r, suc)) return;
      var v = Number(r.monto) || 0;
      if (r.tipo === 'venta') { ventas += v; porCanal[r.rubro] = (porCanal[r.rubro] || 0) + v; }
      else if (r.tipo === 'gasto') {
        var g = G.rubro(r.rubro).grupo;
        rub[r.rubro] = (rub[r.rubro] || 0) + v;
        grp[g] = (grp[g] || 0) + v;
      } else if (r.tipo === 'retiro') retiros += v;
    });
    function sum(keys) { return keys.reduce(function (a, k) { return a + (grp[k] || 0); }, 0); }
    var res = { ventas: ventas, porCanal: porCanal, rub: rub, grp: grp, retiros: retiros };
    res.costoOperacion = sum(G.cfg.grupos.map(function (g) { return g.key; }));
    res.resOperacion = ventas - res.costoOperacion;
    res.resAntesImp = res.resOperacion - sum(['administrativos', 'marketing']);
    res.resLuegoImp = res.resAntesImp - sum(['impuestos']);
    res.resLuegoReinv = res.resLuegoImp - sum(['reinversion']);
    res.totalGastos = ventas - res.resLuegoReinv;
    G._cache[key] = res;
    return res;
  };

  // Financiero de un mes por caja: saldo inicial, ingresos, egresos, saldo final.
  G.financiero = function (suc, mes) {
    var ini = G.cfg.saldosIniciales, cajas = G.cfg.cajas.map(function (c) { return c.key; });
    var desde = mes + '-01', hasta = G.addMes(mes, 1) + '-01';
    var out = { cajas: {}, ingresos: {}, egresos: {}, transf: {} };
    cajas.forEach(function (c) {
      var s = 0;
      Object.keys(ini.porSucursal).forEach(function (k) { if (suc === 'todas' || suc === k) s += ini.porSucursal[k][c] || 0; });
      out.cajas[c] = { inicial: s, entra: 0, sale: 0, final: 0 };
    });
    function mov(caja, monto, fecha, linea, lado) {
      var c = out.cajas[caja]; if (!c) return;
      if (fecha < desde) { c.inicial += lado === 'entra' ? monto : -monto; return; }
      if (fecha >= hasta) return;
      c[lado] += monto;
      var bucket = lado === 'entra' ? out.ingresos : out.egresos;
      bucket[linea] = bucket[linea] || {};
      bucket[linea][caja] = (bucket[linea][caja] || 0) + monto;
    }
    G.regs.forEach(function (r) {
      if (!deSuc(r, suc) || !r.fechaPago || r.fechaPago < ini.fecha) return;
      var v = Number(r.monto) || 0, caja = G.cajaDe(r.medio);
      if (r.tipo === 'venta') mov(caja, v, r.fechaPago, 'venta:' + r.rubro, 'entra');
      else if (r.tipo === 'gasto') mov(caja, v, r.fechaPago, 'grupo:' + G.rubro(r.rubro).grupo, 'sale');
      else if (r.tipo === 'retiro') mov(caja, v, r.fechaPago, 'retiros', 'sale');
      else if (r.tipo === 'transferencia') {
        mov(caja, v, r.fechaPago, 'transf', 'sale');
        mov(r.destino, v, r.fechaPago, 'transf', 'entra');
      }
    });
    var tot = { inicial: 0, entra: 0, sale: 0, final: 0 };
    cajas.forEach(function (c) {
      var x = out.cajas[c]; x.final = x.inicial + x.entra - x.sale;
      ['inicial', 'entra', 'sale', 'final'].forEach(function (k) { tot[k] += x[k]; });
    });
    out.total = tot;
    // Resultado de caja del negocio (sin transferencias entre cajas, que suman cero)
    out.resultado = tot.entra - tot.sale;
    return out;
  };

  // Deuda al cierre del mes: lo devengado hasta ese mes y no pagado hasta su último día.
  G.deuda = function (suc, mes) {
    var fin = G.addMes(mes, 1) + '-01', d = { comercial: 0, impositiva: 0, cheques: 0, porCobrar: 0 };
    G.regs.forEach(function (r) {
      if (!deSuc(r, suc) || !r.mes || r.mes > mes) return;
      var pend = !r.fechaPago || r.fechaPago >= fin;
      if (!pend) return;
      var v = Number(r.monto) || 0;
      if (r.tipo === 'venta') d.porCobrar += v;
      else if (r.tipo === 'gasto') {
        if (G.rubro(r.rubro).grupo === 'impuestos') d.impositiva += v; else d.comercial += v;
        if (r.medio === 'cheque' && r.emisionCheque && r.emisionCheque < fin) d.cheques += v;
      }
    });
    return d;
  };

  // Registros de un mes (económico) filtrados por sucursal.
  G.delMes = function (suc, mes) { return G.regs.filter(function (r) { return r.mes === mes && deSuc(r, suc); }); };

  // Meses del año hasta `mes` inclusive.
  G.trimestres = function (mes) {
    var y = mes.slice(0, 4), out = [];
    for (var t = 0; t < 4; t++) {
      var ms = [1, 2, 3].map(function (i) { return y + '-' + String(t * 3 + i).padStart(2, '0'); }).filter(function (m) { return m <= mes; });
      if (ms.length) out.push({ label: (t + 1) + 'º trimestre', meses: ms });
    }
    return out;
  };
  G.ultimosMeses = function (mes, n) {
    var out = []; for (var i = n - 1; i >= 0; i--) out.push(G.addMes(mes, -i)); return out;
  };

  return G;
})();
