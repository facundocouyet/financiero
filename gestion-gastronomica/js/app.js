/* ============================================================
   Armazón: navegación por #hash, filtros (local y mes), eventos.
   ============================================================ */
(function (G) {
  var LS_ST = 'gg.estado.v1';
  var st = { suc: 'todas', mes: null };
  var $ = function (s) { return document.querySelector(s); };

  var NAV = [
    { h: 'cargar', t: 'Cargar' },
    { h: 'revision', t: 'Revisión' },
    { sep: 'Informes' },
    { h: 'tablero', t: 'Tablero' },
    { h: 'economico', t: 'Económico mensual' },
    { h: 'acumulado', t: 'Acumulado' },
    { h: 'financiero', t: 'Financiero' },
    { h: 'sueldos', t: 'Sueldos' },
    { h: 'cheques', t: 'Cheques' },
    { h: 'locales', t: 'Locales' },
    { sep: '' },
    { h: 'registros', t: 'Registros' },
    { h: 'guia', t: 'Cómo se usa' }
  ];
  var INFORMES = { tablero: 1, economico: 1, acumulado: 1, financiero: 1, sueldos: 1, cheques: 1, locales: 1 };

  function ruta() {
    var raw = location.hash.replace(/^#/, '') || 'tablero';
    var q = {}, i = raw.indexOf('?');
    if (i >= 0) { new URLSearchParams(raw.slice(i + 1)).forEach(function (v, k) { q[k] = v; }); raw = raw.slice(0, i); }
    var p = raw.split('/');
    return { vista: p[0], sub: p[1], q: q };
  }

  G.toast = function (msg, tipo) {
    var t = document.createElement('div');
    t.className = 'toast ' + (tipo || ''); t.setAttribute('role', 'status'); t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, tipo === 'error' ? 6000 : 3000);
  };

  function guardarEstado() { try { localStorage.setItem(LS_ST, JSON.stringify(st)); } catch (e) {} }

  function filtros() {
    $('#f-suc').innerHTML = '<option value="todas">Todas (consolidado)</option>' + G.cfg.sucursales.map(function (s) {
      return '<option value="' + s.key + '"' + (s.key === st.suc ? ' selected' : '') + '>' + G.esc(s.label) + '</option>';
    }).join('');
    $('#f-suc').value = st.suc;
    var meses = G.meses.slice(), hoy = G.hoy().slice(0, 7);
    if (meses.indexOf(hoy) < 0) meses.push(hoy);
    if (!st.mes || meses.indexOf(st.mes) < 0) st.mes = G.meses[G.meses.length - 1] || hoy;
    $('#f-mes').innerHTML = meses.sort().reverse().map(function (m) { return '<option value="' + m + '">' + G.mesLabel(m) + '</option>'; }).join('');
    $('#f-mes').value = st.mes;
  }

  function nav(actual) {
    var rev = G.revisar(st.suc, st.mes), n = rev.cuenta.error + rev.cuenta.falta;
    $('#nav').innerHTML = NAV.map(function (x) {
      if (x.sep !== undefined) return x.sep ? '<span class="nav-sep">' + x.sep + '</span>' : '<span class="nav-sep"></span>';
      var badge = x.h === 'revision' && n ? ' <span class="nav-badge" aria-label="' + n + ' para resolver">' + n + '</span>' : '';
      return '<a href="#' + x.h + '"' + (x.h === actual ? ' aria-current="page"' : '') + '>' + x.t + badge + '</a>';
    }).join('');
  }

  G.render = function (mantenerScroll) {
    var r = ruta(), v = G.vistas[r.vista] ? r.vista : 'tablero';
    var actual = v === 'editar' ? 'registros' : v;
    nav(actual);
    document.body.setAttribute('data-vista', v);
    var html;
    try { html = G.vistas[v](st, r.sub, r.q); }
    catch (e) { console.error(e); html = '<section class="card"><h2>Algo falló al armar esta vista</h2><p class="sub">' + G.esc(e.message) + '</p></section>'; }
    var head = INFORMES[v] ? '<div class="print-head"><b>' + G.esc(G.cfg.titulo) + '</b> · ' + (st.suc === 'todas' ? 'Todas las sucursales' : G.esc(G.sucLabel(st.suc))) + ' · ' + G.mesLabel(st.mes) +
      '<button class="btn sm ghost no-print" data-accion="imprimir">Imprimir / PDF</button></div>' : '';
    $('#vista').innerHTML = head + html;
    if (!mantenerScroll) window.scrollTo(0, 0);
    var f = document.getElementById('form-registro'); if (f) G.actualizarForm(f);
    var fv = document.getElementById('form-ventas'); if (fv) G.actualizarVentas(fv);
    var fs = document.getElementById('form-sueldos'); if (fs) { G.equipoSueldos(fs); G.actualizarSueldos(fs); }
    var first = $('#vista input:not([type=hidden]):not([disabled]), #vista select');
    if (first && /^(cargar|editar)$/.test(v) && r.sub) first.focus({ preventScroll: true });
  };

  function csv() {
    var cols = ['id', 'sucursal', 'tipo', 'fecha', 'mes', 'rubro', 'detalle', 'persona', 'comprobante', 'nro', 'monto', 'medio', 'fechaPago', 'emisionCheque', 'destino', 'nota'];
    var out = cols.join(';') + '\n' + G.regs.map(function (r) {
      return cols.map(function (c) {
        var v = r[c] == null ? '' : r[c];
        if (c === 'monto') v = String(v).replace('.', ',');
        return '"' + String(v).replace(/"/g, '""') + '"';
      }).join(';');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + out], { type: 'text/csv;charset=utf-8' }));
    a.download = 'registros-' + G.hoy() + '.csv'; a.click();
  }

  /* ---------- eventos (delegados) ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-accion]'); if (!t) return;
    var id;
    if ((id = t.getAttribute('data-ignorar'))) { G.ignorar(id); G.toast('Marcado como correcto.', 'ok'); G.render(true); }
    else if ((id = t.getAttribute('data-reactivar'))) { G.reactivar(id); G.render(true); }
    else if ((id = t.getAttribute('data-cargar'))) G.accionHallazgo(id, st);
    else if ((id = t.getAttribute('data-pagar'))) G.pagarRegistro(id);
    else if ((id = t.getAttribute('data-borrar'))) {
      if (!confirm('¿Borrar este registro? No se puede deshacer.')) return;
      G.borrar(id).then(function () { G.toast('Borrado.', 'ok'); history.length > 1 ? history.back() : (location.hash = '#registros'); }).catch(function (x) { G.toast(x.message, 'error'); });
    }
    else if (t.hasAttribute('data-setmes')) { var f = t.form; f.querySelector('[name=mes]').value = t.getAttribute('data-setmes'); f.setAttribute('data-mes-tocado', '1'); G.actualizarForm(f); }
    else if (t.hasAttribute('data-agregar-persona')) { G.agregarPersona(t.form); G.actualizarSueldos(t.form); }
    else if (t.getAttribute('data-accion') === 'csv') csv();
    else if (t.getAttribute('data-accion') === 'imprimir') window.print();
    else if (t.getAttribute('data-accion') === 'demo') {
      if (!confirm('Se borra todo lo cargado en este navegador y vuelven los datos de ejemplo. ¿Seguir?')) return;
      G.reiniciarDemo().then(function () { filtros(); G.render(); G.toast('Datos de ejemplo restaurados.', 'ok'); });
    }
    else if (t.getAttribute('data-accion') === 'pago-ok') G.confirmarPago(t.closest('dialog'));
    else if (t.getAttribute('data-accion') === 'pago-cancelar') t.closest('dialog').close();
  });

  document.addEventListener('input', function (e) {
    var f = e.target.form; if (!f) return;
    if (f.id === 'form-registro') G.actualizarForm(f, e);
    else if (f.id === 'form-ventas') G.actualizarVentas(f);
    else if (f.id === 'form-sueldos') {
      if (e.target.name === 'sucursal' || e.target.name === 'mes') G.equipoSueldos(f);
      G.actualizarSueldos(f);
    }
  });
  document.addEventListener('change', function (e) {
    var f = e.target.form;
    if (f && f.id === 'form-filtros') {
      var q = new URLSearchParams(new FormData(f)); Array.from(q.keys()).forEach(function (k) { if (!q.get(k)) q.delete(k); });
      location.hash = '#registros' + (q.toString() ? '?' + q : '');
    } else if (f && f.id === 'form-pago') {
      f.querySelector('[data-si="emision"]').hidden = f.querySelector('[name=medio]').value !== 'cheque';
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    var otra = e.submitter && e.submitter.hasAttribute('data-otra');
    if (f.id === 'form-registro') G.enviarForm(f, otra);
    else if (f.id === 'form-ventas') G.enviarVentas(f, otra);
    else if (f.id === 'form-sueldos') G.enviarSueldos(f);
    else if (f.id === 'form-filtros') f.dispatchEvent(new Event('change', { bubbles: true }));
  });

  window.addEventListener('hashchange', function () { G.render(); });

  G.init().then(function () {
    try { var s = JSON.parse(localStorage.getItem(LS_ST) || 'null'); if (s) st = Object.assign(st, s); } catch (e) {}
    if (st.suc !== 'todas' && !G.cfg.sucursales.some(function (s) { return s.key === st.suc; })) st.suc = 'todas';
    document.title = G.cfg.titulo;
    filtros();
    $('#modo').innerHTML = G.modo() === 'planilla' ? 'Datos: planilla compartida' : 'Datos: este navegador (demo) · <button class="linklike" data-accion="demo">reiniciar ejemplo</button>';
    $('#f-suc').addEventListener('change', function (e) { st.suc = e.target.value; guardarEstado(); G.render(true); });
    $('#f-mes').addEventListener('change', function (e) { st.mes = e.target.value; guardarEstado(); G.render(true); });
    G.render();
  }).catch(function (e) {
    $('#vista').innerHTML = '<section class="card"><h2>No se pudieron cargar los datos</h2><p class="sub">' + G.esc(e.message) + '</p></section>';
  });
})(window.G);
