/* ============================================================
   Carga guiada: elegir qué cargar → formulario paso a paso →
   controles en vivo ("Antes de guardar") → guardar.
   También: listado de registros y edición.
   ============================================================ */
(function (G) {
  var esc = G.esc, money = G.money;
  G.vistas = G.vistas || {};
  G.draft = null; // borrador que llega desde la revisión ("Cargar ahora")

  var OPCIONES = [
    { k: 'ventas', t: 'Ventas del día', d: 'El cierre de caja: lo que se vendió hoy en el local, por medio de cobro. También delivery y mayorista.', cuando: 'Todos los días' },
    { k: 'gasto', t: 'Factura o gasto', d: 'Cualquier compra o servicio: mercadería, luz, alquiler, impuestos, arreglos, publicidad.', cuando: 'Cada vez que llega una factura' },
    { k: 'sueldos', t: 'Sueldos del mes', d: 'Los sueldos de todo el equipo. Te traemos la lista del mes anterior para que sólo corrijas.', cuando: 'Una vez por mes' },
    { k: 'pago', t: 'Registrar un pago', d: 'Pagaste algo que habías cargado como pendiente. Buscalo y marcá cuándo y con qué se pagó.', cuando: 'Cuando pagás deudas' },
    { k: 'retiro', t: 'Retiro de socios', d: 'Plata que se llevan los socios. No es un gasto del negocio, pero sale de la caja.', cuando: 'Cuando ocurre' },
    { k: 'transferencia', t: 'Pase entre cajas', d: 'Plata que se mueve de una caja a otra, por ejemplo depositar el efectivo en el banco.', cuando: 'Cuando ocurre' }
  ];

  G.vistas.cargar = function (st, sub) {
    if (sub === 'ventas') return formVentas(st);
    if (sub === 'sueldos') return formSueldos(st);
    if (sub === 'pago') return formPago(st);
    if (sub === 'gasto' || sub === 'retiro' || sub === 'transferencia') {
      var d = G.draft && (!G.draft.tipo || G.draft.tipo === sub) ? G.draft : {};
      G.draft = null;
      return formRegistro(Object.assign({ tipo: sub, sucursal: st.suc === 'todas' ? G.cfg.sucursales[0].key : st.suc }, d), st, false);
    }
    return '<section class="card"><h2>¿Qué querés cargar?</h2><p class="sub">Elegí una opción. En cada paso te explicamos qué va y te avisamos si algo parece mal antes de guardar.</p>' +
      '<div class="opciones">' + OPCIONES.map(function (o) {
        return '<a class="opcion" href="#cargar/' + o.k + '"><b>' + o.t + '</b><span>' + o.d + '</span><small>' + o.cuando + '</small></a>';
      }).join('') + '</div></section>';
  };

  G.vistas.editar = function (st, id) {
    var r = G.byId(id);
    if (!r) return '<section class="card"><h2>No encontramos ese registro</h2><p class="sub">Puede que se haya borrado. <a href="#registros">Ver registros</a></p></section>';
    return formRegistro(Object.assign({}, r), st, true);
  };

  /* ---------- piezas de formulario ---------- */
  function paso(n, titulo, ayuda, cuerpo, extra) {
    return '<fieldset class="paso"' + (extra || '') + '><legend><span class="n">' + n + '</span>' + titulo + '</legend>' + (ayuda ? '<p class="ayuda">' + ayuda + '</p>' : '') + cuerpo + '</fieldset>';
  }
  function opts(lista, sel, vacio) {
    return (vacio ? '<option value="">' + vacio + '</option>' : '') + lista.map(function (o) {
      return '<option value="' + esc(o.key) + '"' + (o.key === sel ? ' selected' : '') + '>' + esc(o.label) + '</option>';
    }).join('');
  }
  function selSucursal(v) { return '<select name="sucursal" required>' + opts(G.cfg.sucursales, v) + '</select>'; }
  function selRubroGasto(v) {
    return '<select name="rubro" required><option value="">Elegí el rubro…</option>' + G.todosGrupos().map(function (g) {
      return '<optgroup label="' + esc(g.label) + '">' + g.rubros.map(function (rb) {
        return '<option value="' + rb.key + '"' + (rb.key === v ? ' selected' : '') + '>' + esc(rb.label) + '</option>';
      }).join('') + '</optgroup>';
    }).join('') + '</select>';
  }
  function proveedoresConocidos() {
    var m = {};
    G.regs.forEach(function (r) { if (r.tipo === 'gasto' && r.detalle && !G.rubro(r.rubro).persona) m[r.detalle] = r; });
    return Object.keys(m).sort();
  }
  function personasConocidas() {
    var m = {};
    G.regs.forEach(function (r) { if (r.persona) m[r.persona] = 1; });
    return Object.keys(m).sort();
  }
  function datalist(id, lista) { return '<datalist id="' + id + '">' + lista.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>'; }
  function mesDe(f) { return (f || G.hoy()).slice(0, 7); }

  /* ---------- formulario de un registro (gasto / retiro / pase / venta suelta) ---------- */
  function formRegistro(d, st, editando) {
    var t = d.tipo, n = 0, h = '';
    var mesFijo = !!d.mes; // vino precargado (revisión o edición): no se pisa al cambiar la fecha
    d.fecha = d.fecha || G.hoy();
    d.mes = d.mes || mesDe(d.fecha);
    var estadoPago = d.fechaPago ? (d.medio === 'cheque' ? 'cheque' : 'si') : (t === 'retiro' || t === 'transferencia' ? 'si' : (editando ? 'no' : ''));
    var titulos = { gasto: 'Factura o gasto', venta: 'Venta', retiro: 'Retiro de socios', transferencia: 'Pase entre cajas' };

    h += paso(++n, '¿De qué local?', '', selSucursal(d.sucursal));

    if (t === 'gasto') {
      h += paso(++n, '¿Quién te facturó?', 'El nombre del proveedor tal como lo vas a reconocer después. Si ya lo cargaste antes, elegilo de la lista y te completamos el rubro.',
        '<input name="detalle" list="dl-prov" value="' + esc(d.detalle) + '" placeholder="Ej. La Serenísima, Edesur, Estudio contable" autocomplete="off">' + datalist('dl-prov', proveedoresConocidos()) +
        '<div class="pista" data-pista="prov"></div>');
      h += paso(++n, '¿Qué es?', 'El rubro decide en qué renglón del informe aparece. Elegí el que mejor describa lo que compraste.',
        selRubroGasto(d.rubro) + '<div class="pista info" data-pista="rubro"></div>' +
        '<label class="sub-campo" data-si="persona"' + (G.rubro(d.rubro).persona ? '' : ' hidden') + '>¿De quién es el sueldo?<input name="persona" list="dl-pers" value="' + esc(d.persona) + '" autocomplete="off"></label>' + datalist('dl-pers', personasConocidas()));
      h += paso(++n, '¿Qué comprobante es?', 'Mirá arriba a la derecha de la factura: dice A, B o C. El número tiene la forma 0001-00001234.',
        '<div class="fila"><label>Tipo<select name="comprobante">' + opts(G.cfg.comprobantes, d.comprobante || 'A') + '</select></label>' +
        '<label>Número<input name="nro" value="' + esc(d.nro) + '" placeholder="0001-00001234"></label>' +
        '<label>Fecha del comprobante<input type="date" name="fecha" value="' + esc(d.fecha) + '" required></label></div>');
    } else if (t === 'venta') {
      h += paso(++n, '¿Qué venta es?', '', '<div class="fila"><label>Canal<select name="rubro">' + opts(G.cfg.ventas, d.rubro) + '</select></label>' +
        '<label>Cliente o detalle<input name="detalle" value="' + esc(d.detalle) + '"></label><label>Fecha<input type="date" name="fecha" value="' + esc(d.fecha) + '" required></label></div>');
    } else if (t === 'retiro') {
      h += paso(++n, '¿Quién retira?', 'El socio que se lleva la plata.', '<div class="fila"><label>Socio<input name="detalle" value="' + esc(d.detalle) + '" list="dl-socios"></label>' +
        '<label>Fecha<input type="date" name="fecha" value="' + esc(d.fecha) + '" required></label></div>' +
        datalist('dl-socios', Array.from(new Set(G.regs.filter(function (r) { return r.tipo === 'retiro'; }).map(function (r) { return r.detalle; })))));
    } else if (t === 'transferencia') {
      h += paso(++n, '¿De qué caja a qué caja?', 'Por ejemplo: del efectivo al banco cuando depositás. No cambia el resultado, sólo dónde está la plata.',
        '<div class="fila"><label>Sale de<select name="medio">' + opts(G.cfg.cajas, d.medio || 'efectivo') + '</select></label>' +
        '<label>Entra en<select name="destino">' + opts(G.cfg.cajas, d.destino || 'banco') + '</select></label>' +
        '<label>Fecha<input type="date" name="fecha" value="' + esc(d.fecha) + '" required></label></div>');
    }

    h += paso(++n, '¿Cuánto?', t === 'gasto' ? 'El total de la factura, con IVA incluido.' : '',
      '<div class="monto"><span>' + esc(G.cfg.moneda) + '</span><input name="monto" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(d.monto) + '" required placeholder="0"></div><div class="pista" data-pista="monto"></div>');

    if (t !== 'transferencia') {
      h += paso(++n, '¿A qué mes corresponde?', t === 'gasto'
        ? 'Es el mes en que <b>se usó o consumió</b>, no el mes en que lo pagás. Ejemplos: la luz de agosto que llega y se paga en septiembre → <b>agosto</b>. Los sueldos de septiembre que se pagan el 5 de octubre → <b>septiembre</b>.'
        : 'El mes en que ocurrió.',
        '<div class="fila"><input type="month" name="mes" value="' + esc(d.mes) + '" required><div class="atajos" data-atajos="mes"></div></div>');
    }

    if (t === 'gasto' || t === 'venta') {
      var pagado = t === 'venta' ? '¿Ya se cobró?' : '¿Ya se pagó?';
      h += paso(++n, pagado, 'Esto arma el informe financiero: la plata cuenta en la caja el día que efectivamente entra o sale.',
        '<div class="radios">' +
        '<label><input type="radio" name="estadoPago" value="si"' + (estadoPago === 'si' ? ' checked' : '') + '> Sí</label>' +
        (t === 'gasto' ? '<label><input type="radio" name="estadoPago" value="cheque"' + (estadoPago === 'cheque' ? ' checked' : '') + '> Con cheque</label>' : '') +
        '<label><input type="radio" name="estadoPago" value="no"' + (estadoPago === 'no' ? ' checked' : '') + '> Todavía no (queda pendiente)</label></div>' +
        '<div class="fila" data-si="pago-si"' + (estadoPago === 'si' ? '' : ' hidden') + '><label>Con qué<select name="medioSi">' + opts(G.cfg.medios.filter(function (m) { return m.key !== 'cheque'; }), d.medio !== 'cheque' ? d.medio : '', 'Elegí…') + '</select></label>' +
        '<label>Cuándo<input type="date" name="fechaPagoSi" value="' + esc(d.medio !== 'cheque' && d.fechaPago ? d.fechaPago : d.fecha) + '"></label></div>' +
        '<div class="fila" data-si="pago-cheque"' + (estadoPago === 'cheque' ? '' : ' hidden') + '><label>Se entregó el<input type="date" name="emisionCheque" value="' + esc(d.emisionCheque || d.fecha) + '"></label>' +
        '<label>Vence el<input type="date" name="fechaPagoCheque" value="' + esc(d.medio === 'cheque' ? d.fechaPago : '') + '"></label><p class="ayuda">La plata sale del banco el día que vence el cheque.</p></div>');
    } else if (t === 'retiro') {
      h += paso(++n, '¿De qué caja sale?', '', '<div class="fila"><label>Caja<select name="medioSi">' + opts(G.cfg.medios.filter(function (m) { return m.key !== 'cheque'; }), d.medio, 'Elegí…') + '</select></label></div>');
    }
    h += paso(++n, 'Nota (opcional)', '', '<input name="nota" value="' + esc(d.nota) + '" placeholder="Cualquier aclaración para quien revise">');

    return '<form class="carga" id="form-registro" data-tipo="' + t + '" data-id="' + esc(d.id || '') + '"' + (mesFijo ? ' data-mes-tocado="1"' : '') + (d.fechaPago ? ' data-fp-tocado="1"' : '') + ' novalidate>' +
      '<div class="carga-head"><a href="' + (editando ? '#registros' : '#cargar') + '" class="volver">← Volver</a><h2>' + (editando ? 'Corregir: ' : '') + titulos[t] + '</h2></div>' +
      '<div class="carga-grid"><div>' + h + '</div>' +
      '<aside class="antes"><h3>Antes de guardar</h3><div data-resumen></div><div data-avisos></div>' +
      '<div class="acciones"><button class="btn pri" type="submit">' + (editando ? 'Guardar cambios' : 'Guardar') + '</button>' +
      (editando ? '<button class="btn ghost" type="button" data-borrar="' + esc(d.id) + '">Borrar</button>' : '<button class="btn ghost" type="submit" data-otra="1">Guardar y cargar otra</button>') +
      '</div></aside></div></form>';
  }

  function leerRegistro(form) {
    var fd = new FormData(form), t = form.getAttribute('data-tipo');
    var r = { tipo: t, sucursal: fd.get('sucursal'), fecha: fd.get('fecha') || '', monto: Number(fd.get('monto')) || 0, nota: (fd.get('nota') || '').trim() };
    var id = form.getAttribute('data-id'); if (id) r.id = id;
    if (t === 'gasto' || t === 'venta' || t === 'retiro') { r.detalle = (fd.get('detalle') || '').trim(); r.mes = fd.get('mes') || ''; }
    if (t === 'gasto') {
      r.rubro = fd.get('rubro') || ''; r.comprobante = fd.get('comprobante'); r.nro = (fd.get('nro') || '').trim();
      if (G.rubro(r.rubro).persona) r.persona = (fd.get('persona') || '').trim();
    }
    if (t === 'venta') r.rubro = fd.get('rubro');
    if (t === 'gasto' || t === 'venta') {
      var e = fd.get('estadoPago');
      if (e === 'si') { r.medio = fd.get('medioSi') || ''; r.fechaPago = fd.get('fechaPagoSi') || null; }
      else if (e === 'cheque') { r.medio = 'cheque'; r.emisionCheque = fd.get('emisionCheque') || ''; r.fechaPago = fd.get('fechaPagoCheque') || null; }
      else { r.medio = null; r.fechaPago = null; }
      r._estadoPago = e;
    }
    if (t === 'retiro') { r.medio = fd.get('medioSi') || ''; r.fechaPago = r.fecha; }
    if (t === 'transferencia') { r.medio = fd.get('medio'); r.destino = fd.get('destino'); r.fechaPago = r.fecha; }
    return r;
  }

  function faltaObligatorio(r) {
    var f = [];
    if (!r.sucursal) f.push('el local');
    if ((r.tipo === 'gasto' || r.tipo === 'retiro') && !r.detalle) f.push(r.tipo === 'retiro' ? 'quién retira' : 'el proveedor');
    if (r.tipo === 'gasto' && !r.rubro) f.push('el rubro');
    if (G.rubro(r.rubro).persona && !r.persona) f.push('la persona');
    if (!r.fecha) f.push('la fecha');
    if (!(r.monto > 0)) f.push('el monto');
    if (r.tipo !== 'transferencia' && !r.mes) f.push('el mes');
    if ((r.tipo === 'gasto' || r.tipo === 'venta') && !r._estadoPago) f.push('si ya se ' + (r.tipo === 'venta' ? 'cobró' : 'pagó'));
    if (r._estadoPago === 'si' && (!r.medio || !r.fechaPago)) f.push('con qué y cuándo se ' + (r.tipo === 'venta' ? 'cobró' : 'pagó'));
    if (r._estadoPago === 'cheque' && !r.fechaPago) f.push('el vencimiento del cheque');
    if (r.tipo === 'retiro' && !r.medio) f.push('de qué caja sale');
    if (r.tipo === 'transferencia' && r.medio === r.destino) f.push('cajas distintas');
    return f;
  }

  function resumenTexto(r) {
    var rb = G.rubro(r.rubro), s;
    if (r.tipo === 'gasto') {
      s = (G.cfg.comprobantes.find(function (c) { return c.key === r.comprobante; }) || { label: 'Gasto' }).label + ' de <b>' + esc(r.detalle || '…') + '</b>' +
        (r.persona ? ' (sueldo de ' + esc(r.persona) + ')' : '') + ' por <b>' + money(r.monto) + '</b> en <b>' + esc(rb.label || '…') + '</b>' + (rb.grupoLabel ? ' (' + esc(rb.grupoLabel) + ')' : '') + '.';
    } else if (r.tipo === 'venta') s = 'Venta ' + esc(rb.label) + ' por <b>' + money(r.monto) + '</b>.';
    else if (r.tipo === 'retiro') s = 'Retiro de <b>' + esc(r.detalle || '…') + '</b> por <b>' + money(r.monto) + '</b> desde ' + esc(G.medioLabel(r.medio)) + '.';
    else s = 'Pase de <b>' + money(r.monto) + '</b> de ' + esc(G.cajaLabel(r.medio)) + ' a ' + esc(G.cajaLabel(r.destino)) + '.';
    if (r.mes && r.tipo !== 'transferencia') s += '<br>Cuenta en el <b>económico de ' + G.mesLabel(r.mes) + '</b>.';
    if (r.tipo === 'gasto' || r.tipo === 'venta') {
      if (r._estadoPago === 'si' && r.fechaPago) s += '<br>Mueve la caja <b>' + esc(G.medioLabel(r.medio)) + '</b> el ' + G.fechaLabel(r.fechaPago) + '.';
      else if (r._estadoPago === 'cheque') s += '<br>Sale del <b>banco</b> cuando vence el cheque' + (r.fechaPago ? ', el ' + G.fechaLabel(r.fechaPago) : '') + '.';
      else if (r._estadoPago === 'no') s += '<br>Queda <b>pendiente</b>: suma a la deuda hasta que registres el ' + (r.tipo === 'venta' ? 'cobro' : 'pago') + '.';
    }
    return '<p class="resumen">' + s + '</p>';
  }

  function atajosMes(form) {
    var box = form.querySelector('[data-atajos="mes"]'); if (!box) return;
    var f = form.querySelector('[name=fecha]').value; if (!f) { box.innerHTML = ''; return; }
    var m = f.slice(0, 7), a = G.addMes(m, -1);
    box.innerHTML = '<button type="button" class="btn sm ghost" data-setmes="' + m + '">' + G.mesLabel(m) + ' (el de la factura)</button>' +
      '<button type="button" class="btn sm ghost" data-setmes="' + a + '">' + G.mesLabel(a) + ' (el anterior)</button>';
  }

  // Se llama en cada cambio del formulario.
  G.actualizarForm = function (form, ev) {
    var r = leerRegistro(form), rb = G.rubro(r.rubro);
    var nombre = ev && ev.target && ev.target.name;
    // Proveedor conocido → sugerir rubro
    var pista = form.querySelector('[data-pista="prov"]');
    if (pista && r.tipo === 'gasto') {
      var hist = G.regs.filter(function (x) { return x.tipo === 'gasto' && r.detalle && G.norm(x.detalle) === G.norm(r.detalle) && x.id !== r.id; })
        .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
      if (hist.length) {
        var u = hist[0];
        pista.innerHTML = 'Ya lo cargaste ' + hist.length + (hist.length === 1 ? ' vez' : ' veces') + '. La última: ' + money(u.monto) + ' en <b>' + esc(G.rubro(u.rubro).label) + '</b> el ' + G.fechaLabel(u.fecha) + (u.medio ? ', pagado con ' + esc(G.medioLabel(u.medio)) : '') + '.';
        if (nombre === 'detalle' && !form.querySelector('[name=rubro]').value) {
          form.querySelector('[name=rubro]').value = u.rubro;
          if (u.comprobante) form.querySelector('[name=comprobante]').value = u.comprobante;
          r = leerRegistro(form); rb = G.rubro(r.rubro);
        }
      } else pista.innerHTML = r.detalle ? 'Proveedor nuevo: revisá bien el rubro.' : '';
    }
    var pr = form.querySelector('[data-pista="rubro"]');
    if (pr) pr.innerHTML = rb.ayuda ? '<b>' + esc(rb.label) + ':</b> ' + esc(rb.ayuda) : '';
    var pers = form.querySelector('[data-si="persona"]'); if (pers) pers.hidden = !rb.persona;
    var e = r._estadoPago;
    var ps = form.querySelector('[data-si="pago-si"]'); if (ps) ps.hidden = e !== 'si';
    var pc = form.querySelector('[data-si="pago-cheque"]'); if (pc) pc.hidden = e !== 'cheque';
    if (nombre === 'fecha') {
      var mesInp = form.querySelector('[name=mes]');
      if (mesInp && !form.getAttribute('data-mes-tocado')) mesInp.value = r.fecha.slice(0, 7);
      var fp = form.querySelector('[name=fechaPagoSi]'); if (fp && !form.getAttribute('data-fp-tocado')) fp.value = r.fecha;
    }
    if (nombre === 'mes') form.setAttribute('data-mes-tocado', '1');
    if (nombre === 'fechaPagoSi') form.setAttribute('data-fp-tocado', '1');
    atajosMes(form);
    r = leerRegistro(form);

    form.querySelector('[data-resumen]').innerHTML = resumenTexto(r);
    var faltan = faltaObligatorio(r), avisos = '';
    if (faltan.length) avisos += '<div class="aviso-item nivel-falta"><b>Falta completar</b>' + faltan.join(', ') + '.</div>';
    else {
      var hall = G.chequearBorrador(r);
      avisos += hall.length ? hall.map(function (x) {
        return '<div class="aviso-item nivel-' + x.nivel + '"><b>' + esc(x.titulo) + '</b>' + x.texto + '</div>';
      }).join('') : '<div class="aviso-item nivel-ok"><b>Todo en orden</b>No encontramos nada raro.</div>';
    }
    form.querySelector('[data-avisos]').innerHTML = avisos;
  };

  G.enviarForm = function (form, otra) {
    var r = leerRegistro(form), faltan = faltaObligatorio(r);
    if (faltan.length) { G.toast('Falta completar: ' + faltan.join(', ') + '.', 'error'); return; }
    var hall = G.chequearBorrador(r).filter(function (x) { return x.nivel === 'error'; });
    if (hall.length && !confirm(hall.map(function (x) { return x.titulo; }).join('\n') + '\n\n¿Guardar igual?')) return;
    delete r._estadoPago;
    var p = r.id ? G.actualizar(r) : G.agregar([r]);
    p.then(function () {
      G.toast(r.id && form.getAttribute('data-id') ? 'Cambios guardados.' : 'Guardado.', 'ok');
      if (otra) {
        G.draft = { tipo: r.tipo, sucursal: r.sucursal, fecha: r.fecha, mes: r.mes };
        G.render(true);
      } else if (form.getAttribute('data-id') && history.length > 1) history.back();
      else location.hash = '#cargar';
    }).catch(function (e) { G.toast(e.message, 'error'); });
  };

  /* ---------- ventas del día ---------- */
  var CANALES_LOCAL = ['efectivo', 'mp', 'banco', 'usd'];
  function formVentas(st) {
    var d = G.draft || {}; G.draft = null;
    var suc = d.sucursal || (st.suc === 'todas' ? G.cfg.sucursales[0].key : st.suc), fecha = d.fecha || G.hoy();
    var h = paso(1, '¿De qué local y qué día?', '', '<div class="fila"><label>Local' + selSucursal(suc) + '</label><label>Día<input type="date" name="fecha" value="' + fecha + '" required></label></div><div class="pista" data-pista="dia"></div>') +
      paso(2, 'Ventas del local por medio de cobro', 'Copiá los totales del cierre de caja (el ticket Z o el reporte del sistema de cobro). Dejá vacío lo que no se usó.',
        '<div class="grilla-medios">' + CANALES_LOCAL.map(function (m) {
          return '<label>' + esc(G.medioLabel(m)) + '<div class="monto"><span>' + esc(G.cfg.moneda) + '</span><input type="number" min="0" step="0.01" inputmode="decimal" name="local_' + m + '"></div></label>';
        }).join('') + '</div>') +
      paso(3, 'Delivery (opcional)', 'Lo que vendieron las apps ese día. La app te lo deposita después: si no sabés cuándo, dejalo como pendiente y registrás el cobro cuando llegue.',
        '<div class="fila"><label>Monto<div class="monto"><span>' + esc(G.cfg.moneda) + '</span><input type="number" min="0" step="0.01" name="delivery"></div></label>' +
        '<label>Lo deposita el (si sabés)<input type="date" name="deliveryPago"></label></div>') +
      paso(4, 'Mayorista (opcional)', 'Una factura a otro comercio. Si te paga después, queda pendiente de cobro.',
        '<div class="fila"><label>Cliente<input name="mayCliente"></label><label>Monto<div class="monto"><span>' + esc(G.cfg.moneda) + '</span><input type="number" min="0" step="0.01" name="mayMonto"></div></label>' +
        '<label>¿Cobrado?<select name="mayMedio"><option value="">No, a cobrar</option>' + opts(G.cfg.medios.filter(function (m) { return m.key !== 'cheque'; })) + '</select></label></div>');
    return '<form class="carga" id="form-ventas" novalidate><div class="carga-head"><a href="#cargar" class="volver">← Volver</a><h2>Ventas del día</h2></div>' +
      '<div class="carga-grid"><div>' + h + '</div><aside class="antes"><h3>Antes de guardar</h3><div data-resumen></div><div data-avisos></div>' +
      '<div class="acciones"><button class="btn pri" type="submit">Guardar el día</button><button class="btn ghost" type="submit" data-otra="1">Guardar y cargar el día siguiente</button></div></aside></div></form>';
  }
  function leerVentas(form) {
    var fd = new FormData(form), suc = fd.get('sucursal'), fecha = fd.get('fecha'), mes = (fecha || '').slice(0, 7), out = [];
    CANALES_LOCAL.forEach(function (m) {
      var v = Number(fd.get('local_' + m)) || 0;
      if (v > 0) out.push({ tipo: 'venta', sucursal: suc, fecha: fecha, mes: mes, rubro: 'local', detalle: 'Cierre de caja', medio: m, fechaPago: fecha, monto: v });
    });
    var del = Number(fd.get('delivery')) || 0;
    if (del > 0) out.push({ tipo: 'venta', sucursal: suc, fecha: fecha, mes: mes, rubro: 'delivery', detalle: 'Apps de delivery', medio: fd.get('deliveryPago') ? 'banco' : null, fechaPago: fd.get('deliveryPago') || null, monto: del });
    var may = Number(fd.get('mayMonto')) || 0;
    if (may > 0) out.push({ tipo: 'venta', sucursal: suc, fecha: fecha, mes: mes, rubro: 'mayorista', detalle: (fd.get('mayCliente') || '').trim() || 'Mayorista', medio: fd.get('mayMedio') || null, fechaPago: fd.get('mayMedio') ? fecha : null, monto: may });
    return { suc: suc, fecha: fecha, regs: out };
  }
  G.actualizarVentas = function (form) {
    var v = leerVentas(form), total = v.regs.reduce(function (a, r) { return a + r.monto; }, 0);
    var local = v.regs.filter(function (r) { return r.rubro === 'local'; }).reduce(function (a, r) { return a + r.monto; }, 0);
    var ya = G.regs.filter(function (r) { return r.tipo === 'venta' && r.sucursal === v.suc && r.fecha === v.fecha; });
    // Un día normal: mediana de los últimos 30 días con ventas de local
    var porDia = {};
    G.regs.forEach(function (r) { if (r.tipo === 'venta' && r.rubro === 'local' && r.sucursal === v.suc && r.fecha < v.fecha && G.diasEntre(r.fecha, v.fecha) <= 30) porDia[r.fecha] = (porDia[r.fecha] || 0) + r.monto; });
    var vals = Object.keys(porDia).map(function (k) { return porDia[k]; }).sort(function (a, b) { return a - b; }), med = vals.length ? vals[Math.floor(vals.length / 2)] : 0;
    var dia = new Date(v.fecha + 'T12:00');
    form.querySelector('[data-pista="dia"]').innerHTML = v.fecha ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dia.getDay()] + '. ' +
      (med ? 'Un día normal de este local vende alrededor de <b>' + money(med) + '</b> en el mostrador.' : '') : '';
    form.querySelector('[data-resumen]').innerHTML = '<p class="resumen">Total del día: <b>' + money(total) + '</b>' + (local ? ' (local ' + money(local) + ')' : '') + '.<br>' +
      v.regs.length + ' registros en el económico de ' + G.mesLabel((v.fecha || '').slice(0, 7)) + '.</p>';
    var av = [];
    if (ya.length) av.push(['revisar', 'Ese día ya tiene ventas cargadas', 'Hay ' + ya.length + ' registros por ' + money(ya.reduce(function (a, r) { return a + r.monto; }, 0)) + '. Si es otro turno está bien; si no, es un duplicado.']);
    if (v.fecha > G.hoy()) av.push(['error', 'Fecha en el futuro', 'Revisá el día.']);
    if (med && local > med * 3) av.push(['revisar', 'Mucho más que un día normal', 'Es ' + Math.round(local / med) + ' veces lo habitual. ¿Hay un cero de más?']);
    if (med && local && local < med / 4) av.push(['revisar', 'Mucho menos que un día normal', '¿Falta algún medio de cobro?']);
    if (!total) av.push(['falta', 'Falta completar', 'Cargá al menos un monto.']);
    form.querySelector('[data-avisos]').innerHTML = av.length ? av.map(function (a) { return '<div class="aviso-item nivel-' + a[0] + '"><b>' + a[1] + '</b>' + a[2] + '</div>'; }).join('')
      : '<div class="aviso-item nivel-ok"><b>Todo en orden</b>No encontramos nada raro.</div>';
  };
  G.enviarVentas = function (form, otra) {
    var v = leerVentas(form);
    if (!v.regs.length) { G.toast('Cargá al menos un monto.', 'error'); return; }
    G.agregar(v.regs).then(function () {
      G.toast('Ventas del ' + G.fechaLabel(v.fecha) + ' guardadas.', 'ok');
      if (otra) {
        var d = new Date(v.fecha + 'T12:00'); d.setDate(d.getDate() + 1);
        G.draft = { sucursal: v.suc, fecha: d.toISOString().slice(0, 10) };
        G.render(true);
      } else location.hash = '#cargar';
    }).catch(function (e) { G.toast(e.message, 'error'); });
  };

  /* ---------- sueldos del mes ---------- */
  function formSueldos(st) {
    var d = G.draft || {}; G.draft = null;
    var suc = d.sucursal || (st.suc === 'todas' ? G.cfg.sucursales[0].key : st.suc), mes = d.mes || st.mes;
    return '<form class="carga" id="form-sueldos" novalidate><div class="carga-head"><a href="#cargar" class="volver">← Volver</a><h2>Sueldos del mes</h2></div>' +
      '<div class="carga-grid"><div>' +
      paso(1, '¿De qué local y qué mes?', 'El mes es el <b>mes trabajado</b>, aunque se pague a principios del siguiente.',
        '<div class="fila"><label>Local' + selSucursal(suc) + '</label><label>Mes trabajado<input type="month" name="mes" value="' + mes + '"></label></div>') +
      paso(2, 'El equipo', 'Te traemos la lista del último mes con sueldos. Corregí los montos, destildá a quien ya no está y agregá a quien entró.', '<div data-equipo></div><button type="button" class="btn sm ghost" data-agregar-persona>+ Agregar persona</button>') +
      paso(3, '¿Ya se pagaron?', '', '<div class="radios"><label><input type="radio" name="estadoPago" value="si"> Sí</label><label><input type="radio" name="estadoPago" value="no" checked> Todavía no</label></div>' +
        '<div class="fila" data-si="pago-si" hidden><label>Con qué<select name="medioSi">' + opts(G.cfg.medios.filter(function (m) { return m.key !== 'cheque'; }), 'banco') + '</select></label><label>Cuándo<input type="date" name="fechaPagoSi" value="' + G.hoy() + '"></label></div>') +
      '</div><aside class="antes"><h3>Antes de guardar</h3><div data-resumen></div><div data-avisos></div><div class="acciones"><button class="btn pri" type="submit">Guardar sueldos</button></div></aside></div></form>';
  }
  function areasPersona() { var out = []; G.todosGrupos().forEach(function (g) { g.rubros.forEach(function (rb) { if (rb.persona) out.push(rb); }); }); return out; }
  G.equipoSueldos = function (form) {
    var suc = form.querySelector('[name=sucursal]').value, mes = form.querySelector('[name=mes]').value;
    var previos = G.regs.filter(function (r) { return r.sucursal === suc && r.tipo === 'gasto' && G.rubro(r.rubro).persona && r.mes < mes; });
    var ultMes = previos.reduce(function (a, r) { return r.mes > a ? r.mes : a; }, '');
    var yaCargados = {};
    G.regs.forEach(function (r) { if (r.sucursal === suc && r.mes === mes && G.rubro(r.rubro).persona) yaCargados[G.norm(r.persona)] = r; });
    var filas = previos.filter(function (r) { return r.mes === ultMes && r.rubro !== 'sueldos_eventuales'; });
    var box = form.querySelector('[data-equipo]');
    box.innerHTML = '<div class="tbl-wrap"><table class="equipo"><thead><tr><th></th><th>Persona</th><th>Área</th><th class="num">Sueldo</th></tr></thead><tbody>' +
      filas.map(function (r) { return filaPersona(r.persona, r.rubro, r.monto, !yaCargados[G.norm(r.persona)], yaCargados[G.norm(r.persona)]); }).join('') + '</tbody></table></div>' +
      (ultMes ? '<p class="ayuda">Montos de ' + G.mesLabel(ultMes) + '.</p>' : '<p class="ayuda">No hay sueldos anteriores: agregá a cada persona.</p>');
  };
  function filaPersona(nombre, rubro, monto, on, ya) {
    return '<tr><td><input type="checkbox" class="p-on"' + (on ? ' checked' : '') + (ya ? ' disabled' : '') + '></td>' +
      '<td><input class="p-nombre" value="' + esc(nombre || '') + '" placeholder="Nombre"' + (ya ? ' disabled' : '') + '>' + (ya ? '<div class="ayuda">ya cargado este mes (' + money(ya.monto) + ')</div>' : '') + '</td>' +
      '<td><select class="p-rubro"' + (ya ? ' disabled' : '') + '>' + opts(areasPersona(), rubro) + '</select></td>' +
      '<td><div class="monto"><span>' + esc(G.cfg.moneda) + '</span><input type="number" class="p-monto" min="0" value="' + esc(monto || '') + '"' + (ya ? ' disabled' : '') + '></div></td></tr>';
  }
  G.agregarPersona = function (form) {
    var tb = form.querySelector('[data-equipo] tbody');
    if (!tb) { form.querySelector('[data-equipo]').innerHTML = '<div class="tbl-wrap"><table class="equipo"><tbody></tbody></table></div>'; tb = form.querySelector('[data-equipo] tbody'); }
    tb.insertAdjacentHTML('beforeend', filaPersona('', 'sueldos_atencion', '', true));
  };
  function leerSueldos(form) {
    var fd = new FormData(form), suc = fd.get('sucursal'), mes = fd.get('mes'), e = fd.get('estadoPago');
    var regs = [];
    form.querySelectorAll('[data-equipo] tbody tr').forEach(function (tr) {
      var on = tr.querySelector('.p-on'), nom = tr.querySelector('.p-nombre').value.trim(), monto = Number(tr.querySelector('.p-monto').value) || 0;
      if (!on.checked || on.disabled || !nom || !(monto > 0)) return;
      var p = mes.split('-'), ultimo = new Date(+p[0], +p[1], 0).getDate();
      regs.push({ tipo: 'gasto', sucursal: suc, mes: mes, fecha: mes + '-' + ultimo, rubro: tr.querySelector('.p-rubro').value, persona: nom, detalle: 'Sueldo ' + nom,
        comprobante: 'recibo', monto: monto, medio: e === 'si' ? fd.get('medioSi') : null, fechaPago: e === 'si' ? fd.get('fechaPagoSi') : null });
    });
    return { suc: suc, mes: mes, regs: regs, e: e };
  }
  G.actualizarSueldos = function (form) {
    var s = leerSueldos(form), tot = s.regs.reduce(function (a, r) { return a + r.monto; }, 0);
    form.querySelector('[data-si="pago-si"]').hidden = s.e !== 'si';
    form.querySelector('[data-resumen]').innerHTML = '<p class="resumen"><b>' + s.regs.length + ' sueldos</b> por <b>' + money(tot) + '</b> en el económico de ' + G.mesLabel(s.mes) + '.</p>';
    var av = [];
    s.regs.forEach(function (r) {
      var ant = G.regs.filter(function (x) { return x.sucursal === r.sucursal && G.norm(x.persona) === G.norm(r.persona) && x.mes < r.mes; }).sort(function (a, b) { return a.mes < b.mes ? 1 : -1; })[0];
      if (ant && (r.monto > ant.monto * 1.5 || r.monto < ant.monto * 0.6)) av.push(['revisar', esc(r.persona) + ': cambio grande', 'Pasa de ' + money(ant.monto) + ' a ' + money(r.monto) + '.']);
    });
    var hayF931 = G.regs.some(function (r) { return r.sucursal === s.suc && r.mes === s.mes && r.rubro === 'f931'; });
    if (!hayF931 && s.regs.length) av.push(['falta', 'Después cargá el F.931', 'Las cargas sociales de ' + G.mesLabel(s.mes) + ' van en el mismo mes que los sueldos.']);
    form.querySelector('[data-avisos]').innerHTML = av.length ? av.map(function (a) { return '<div class="aviso-item nivel-' + a[0] + '"><b>' + a[1] + '</b>' + a[2] + '</div>'; }).join('') : '<div class="aviso-item nivel-ok"><b>Todo en orden</b>No encontramos nada raro.</div>';
  };
  G.enviarSueldos = function (form) {
    var s = leerSueldos(form);
    if (!s.regs.length) { G.toast('No hay sueldos tildados con monto.', 'error'); return; }
    G.agregar(s.regs).then(function () {
      G.toast(s.regs.length + ' sueldos guardados.', 'ok');
      var hayF931 = G.regs.some(function (r) { return r.sucursal === s.suc && r.mes === s.mes && r.rubro === 'f931'; });
      if (!hayF931) { G.draft = { tipo: 'gasto', sucursal: s.suc, mes: s.mes, rubro: 'f931', detalle: 'AFIP F.931', comprobante: 'recibo' }; location.hash = '#cargar/gasto'; }
      else location.hash = '#cargar';
    }).catch(function (e) { G.toast(e.message, 'error'); });
  };

  /* ---------- registrar un pago ---------- */
  function formPago(st) {
    var pend = G.regs.filter(function (r) { return r.tipo === 'gasto' && !r.fechaPago && G.deSuc(r, st.suc); }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    var total = pend.reduce(function (a, r) { return a + r.monto; }, 0);
    return '<section class="card"><div class="carga-head"><a href="#cargar" class="volver">← Volver</a><h2>Registrar un pago</h2></div>' +
      '<p class="sub">Gastos cargados como pendientes' + (st.suc === 'todas' ? '' : ' de ' + esc(G.sucLabel(st.suc))) + ': <b>' + pend.length + '</b> por <b>' + money(total) + '</b>. Tocá “Pagar” en el que corresponda.</p>' +
      (pend.length ? G.tablaRegistros(pend, { pagar: true }) : '<p class="sub">No hay nada pendiente.</p>') + '</section>';
  }
  G.pagarRegistro = function (id) {
    var r = G.byId(id); if (!r) return;
    var dlg = document.getElementById('dlg-pago');
    dlg.querySelector('[data-que]').innerHTML = esc(r.detalle || r.persona) + ' · ' + money(r.monto) + ' · ' + G.mesLabel(r.mes);
    dlg.querySelector('[name=medio]').innerHTML = opts(G.cfg.medios, 'banco');
    dlg.querySelector('[name=fecha]').value = G.hoy();
    dlg.querySelector('[name=emision]').value = G.hoy();
    dlg.setAttribute('data-id', id);
    dlg.showModal();
  };
  G.confirmarPago = function (dlg) {
    var r = Object.assign({}, G.byId(dlg.getAttribute('data-id')));
    r.medio = dlg.querySelector('[name=medio]').value;
    r.fechaPago = dlg.querySelector('[name=fecha]').value;
    if (r.medio === 'cheque') r.emisionCheque = dlg.querySelector('[name=emision]').value;
    if (!r.fechaPago) { G.toast('Falta la fecha.', 'error'); return; }
    G.actualizar(r).then(function () { dlg.close(); G.toast('Pago registrado.', 'ok'); G.render(true); }).catch(function (e) { G.toast(e.message, 'error'); });
  };

  /* ---------- listado de registros ---------- */
  G.tablaRegistros = function (lista, o) {
    o = o || {};
    var rev = G._revActual || { porReg: {} };
    var h = '<div class="tbl-wrap"><table class="registros"><thead><tr><th>Fecha</th><th>Local</th><th>Qué</th><th>Proveedor / detalle</th><th>Mes</th><th>Pago</th><th class="num">Monto</th><th></th></tr></thead><tbody>';
    lista.forEach(function (r) {
      var rb = G.rubro(r.rubro), obs = rev.porReg[r.id] || [];
      var que = r.tipo === 'venta' ? 'Venta · ' + rb.label : r.tipo === 'gasto' ? rb.label : r.tipo === 'retiro' ? 'Retiro' : 'Pase ' + G.cajaLabel(G.cajaDe(r.medio)) + ' → ' + G.cajaLabel(r.destino);
      var pago = r.fechaPago ? (r.medio === 'cheque' ? 'Cheque vence ' + G.fechaLabel(r.fechaPago) : G.medioLabel(r.medio) + ' · ' + G.fechaLabel(r.fechaPago)) : '<span class="tag pend">pendiente</span>';
      var signo = r.tipo === 'venta' ? 1 : r.tipo === 'transferencia' ? 0 : -1;
      h += '<tr' + (obs.length ? ' class="con-obs"' : '') + '><td>' + G.fechaLabel(r.fecha) + '</td><td>' + esc(G.sucLabel(r.sucursal)) + '</td><td>' + esc(que) + '</td><td>' + esc(r.detalle || '') +
        (r.nro ? ' <span class="muted">' + esc(r.nro) + '</span>' : '') + (r.nota ? '<div class="muted small">' + esc(r.nota) + '</div>' : '') +
        obs.map(function (x) { return '<div class="obs nivel-' + x.nivel + '">' + esc(x.titulo) + '</div>'; }).join('') + '</td><td>' + (r.mes ? G.mesLabel(r.mes, true) : '—') + '</td><td>' + pago +
        '</td><td class="num' + (signo < 0 ? ' neg' : '') + '">' + money(signo === 0 ? r.monto : signo * r.monto) + '</td><td class="acc">' +
        (o.pagar ? '<button class="btn sm pri" data-pagar="' + esc(r.id) + '">Pagar</button> ' : '') +
        '<a class="btn sm ghost" href="#editar/' + esc(r.id) + '">Editar</a></td></tr>';
    });
    return h + '</tbody></table></div>';
  };

  G.vistas.registros = function (st, sub, q) {
    q = q || {};
    var rev = G._revActual = G.revisar(st.suc, st.mes);
    var lista = G.regs.filter(function (r) {
      if (!G.deSuc(r, st.suc)) return false;
      if (q.todos !== '1' && r.mes !== st.mes && !(r.tipo === 'transferencia' && (r.fecha || '').slice(0, 7) === st.mes)) return false;
      if (q.tipo && r.tipo !== q.tipo) return false;
      if (q.grupo && G.rubro(r.rubro).grupo !== q.grupo) return false;
      if (q.obs === '1' && !rev.porReg[r.id]) return false;
      if (q.texto) { var t = G.norm(q.texto); if ((G.norm(r.detalle) + ' ' + G.norm(r.persona) + ' ' + G.norm(r.nro) + ' ' + G.norm(G.rubro(r.rubro).label)).indexOf(t) < 0) return false; }
      return true;
    }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });
    var max = 300;
    var grupos = [{ key: 'ventas', label: 'Ventas' }].concat(G.todosGrupos());
    var filtros = '<form class="filtros" id="form-filtros">' +
      '<input name="texto" placeholder="Buscar proveedor, persona, número…" value="' + esc(q.texto || '') + '">' +
      '<select name="tipo"><option value="">Todo</option>' + opts([{ key: 'venta', label: 'Ventas' }, { key: 'gasto', label: 'Gastos' }, { key: 'retiro', label: 'Retiros' }, { key: 'transferencia', label: 'Pases entre cajas' }], q.tipo) + '</select>' +
      '<select name="grupo"><option value="">Todos los grupos</option>' + opts(grupos, q.grupo) + '</select>' +
      '<label class="check"><input type="checkbox" name="obs" value="1"' + (q.obs === '1' ? ' checked' : '') + '> Sólo con observaciones</label>' +
      '<label class="check"><input type="checkbox" name="todos" value="1"' + (q.todos === '1' ? ' checked' : '') + '> Todos los meses</label></form>';
    return '<section class="card"><h2>Registros · ' + (q.todos === '1' ? 'todos los meses' : G.mesLabel(st.mes)) + '</h2><p class="sub">' + lista.length + ' registros' + (lista.length > max ? ' (mostrando los ' + max + ' más recientes)' : '') + '.</p>' +
      filtros + G.tablaRegistros(lista.slice(0, max)) +
      '<div class="tools"><button class="btn sm" data-accion="csv">Descargar todo en CSV</button></div></section>';
  };
})(window.G);
