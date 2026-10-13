/* ============================================================
   Revisión: errores de registro y faltantes.
   Cada hallazgo: { id, nivel: 'error'|'revisar'|'falta', titulo, texto,
   regs: [ids], accion: {tipo:'editar', id} | {tipo:'cargar', draft} |
   {tipo:'ventas', draft} }
   El `id` es estable: si el usuario lo marca "Es correcto", no vuelve a aparecer.
   ============================================================ */
(function (G) {
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function indice() {
    if (G._cache.idx) return G._cache.idx;
    var porDetalle = {}, porDetalleGlobal = {};
    G.regs.forEach(function (r) {
      if (r.tipo !== 'gasto' || !r.detalle) return;
      var n = G.norm(r.detalle);
      (porDetalle[r.sucursal + '|' + n] = porDetalle[r.sucursal + '|' + n] || []).push(r);
      (porDetalleGlobal[n] = porDetalleGlobal[n] || []).push(r);
    });
    return (G._cache.idx = { porDetalle: porDetalle, porDetalleGlobal: porDetalleGlobal });
  }

  function mediana(arr) {
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (a, b) { return a - b; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function quien(r) { return r.detalle || r.persona || G.rubro(r.rubro).label; }
  function desc(r) { return '“' + quien(r) + '” por ' + G.money(r.monto) + ' del ' + G.fechaLabel(r.fecha); }

  /* ---------- controles sobre un registro ---------- */
  function chequearRegistro(r) {
    var out = [], hoy = G.hoy(), rb = G.rubro(r.rubro);
    function add(nivel, clave, titulo, texto) {
      out.push({ id: clave + ':' + r.id, nivel: nivel, titulo: titulo, texto: texto, regs: [r.id], accion: { tipo: 'editar', id: r.id } });
    }
    // Datos obligatorios
    var falta = [];
    if (!(Number(r.monto) > 0)) falta.push('el monto');
    if (!r.fecha) falta.push('la fecha');
    if (r.tipo !== 'transferencia' && !r.mes) falta.push('el mes al que corresponde');
    if ((r.tipo === 'venta' || r.tipo === 'gasto') && !r.rubro) falta.push('el rubro');
    if (rb.persona && !r.persona) falta.push('la persona');
    if (r.fechaPago && !r.medio) falta.push('con qué se pagó');
    if (r.tipo === 'transferencia' && (!r.destino || r.destino === G.cajaDe(r.medio))) falta.push('la caja de destino (distinta a la de origen)');
    if (falta.length) add('error', 'incompleto', 'Registro incompleto', 'A ' + desc(r) + ' le falta ' + falta.join(', ') + '.');

    if (r.fecha && r.fecha > hoy) add('error', 'futuro', 'Fecha en el futuro', desc(r) + ' tiene fecha posterior a hoy. Revisá el día, el mes o el año.');
    if (r.fechaPago && r.fechaPago > hoy && r.medio !== 'cheque')
      add('error', 'pagofuturo', 'Pago con fecha futura', desc(r) + ' figura pagado el ' + G.fechaLabel(r.fechaPago) + '. Si todavía no se pagó, dejalo como pendiente.');

    if (r.fecha && r.mes) {
      var d = G.mesDiff(r.mes, r.fecha.slice(0, 7));
      if (Math.abs(d) > 2) add('error', 'mes', 'Mes que no coincide con la fecha',
        desc(r) + ' está cargado como de ' + G.mesLabel(r.mes) + '. Con esa fecha lo esperable es ' + G.mesLabel(r.fecha.slice(0, 7)) +
        ' o el mes anterior. ¿Se equivocó el mes o el año?');
    }
    if (r.fecha && r.fechaPago && r.medio !== 'cheque' && G.diasEntre(r.fechaPago, r.fecha) > 31)
      add('revisar', 'pagoantes', 'Pagado mucho antes de la factura', desc(r) + ' figura pagado el ' + G.fechaLabel(r.fechaPago) + ', más de un mes antes de la factura. ¿Está bien la fecha de pago?');
    if (r.medio === 'cheque' && r.fechaPago) {
      if (!r.emisionCheque) add('revisar', 'chequesinfecha', 'Cheque sin fecha de emisión', desc(r) + ' se pagó con cheque pero no tiene la fecha en que se entregó.');
      else if (G.diasEntre(r.emisionCheque, r.fechaPago) > 180) add('revisar', 'chequelargo', 'Cheque a más de 180 días', 'El cheque de ' + desc(r) + ' vence el ' + G.fechaLabel(r.fechaPago) + '. ¿Es correcto el vencimiento?');
    }
    if (r.tipo === 'gasto' && r.comprobante === 'A' && !r.nro)
      add('revisar', 'sinnro', 'Factura A sin número', desc(r) + ' es factura A pero no tiene número. El contador la necesita para el IVA.');
    if (r.tipo === 'gasto' && !r.fechaPago && r.fecha && G.diasEntre(r.fecha, hoy) > 45)
      add('revisar', 'pendiente', 'Pendiente de pago hace ' + G.diasEntre(r.fecha, hoy) + ' días', desc(r) + ' sigue sin pagar. ¿Se pagó y no se registró el pago?');

    if (r.tipo === 'gasto' && r.detalle) {
      var idx = indice(), n = G.norm(r.detalle);
      // Duplicado
      (idx.porDetalle[r.sucursal + '|' + n] || []).forEach(function (o) {
        if (o.id === r.id || Number(o.monto) !== Number(r.monto)) return;
        var mismoNro = r.nro && o.nro && G.norm(r.nro) === G.norm(o.nro);
        var cerca = r.fecha && o.fecha && Math.abs(G.diasEntre(r.fecha, o.fecha)) <= 5 && !(r.nro && o.nro && !mismoNro);
        if (mismoNro || cerca) {
          var ids = [r.id, o.id].sort();
          out.push({ id: 'dup:' + ids.join(':'), nivel: 'error', titulo: 'Posible factura duplicada',
            texto: desc(r) + ' parece cargada dos veces (la otra es del ' + G.fechaLabel(o.fecha) + (mismoNro ? ', mismo número ' + G.esc(o.nro) : '') + '). Si es la misma, borrá una.',
            regs: ids, accion: { tipo: 'editar', id: r.id } });
        }
      });
      // Monto fuera de lo habitual para ese proveedor
      var hist = (idx.porDetalle[r.sucursal + '|' + n] || []).filter(function (o) { return o.id !== r.id && o.rubro === r.rubro; }).map(function (o) { return Number(o.monto) || 0; });
      if (hist.length >= 3) {
        var med = mediana(hist), v = Number(r.monto) || 0;
        if (med > 0 && (v > med * 3 || v < med / 3))
          add('revisar', 'atipico', 'Monto muy distinto al habitual',
            desc(r) + ' es ' + (v > med ? Math.round(v / med) + ' veces más' : 'mucho menos') + ' que lo habitual para este proveedor (' + G.money(med) + '). ¿Hay un cero de más o de menos?');
      }
      // Rubro distinto al habitual
      var conteo = {}, tot = 0;
      (idx.porDetalleGlobal[n] || []).forEach(function (o) { if (o.id !== r.id && o.rubro) { conteo[o.rubro] = (conteo[o.rubro] || 0) + 1; tot++; } });
      var top = Object.keys(conteo).sort(function (a, b) { return conteo[b] - conteo[a]; })[0];
      if (top && top !== r.rubro && tot >= 2 && conteo[top] / tot >= 0.7)
        add('revisar', 'rubro', 'Rubro distinto al de siempre',
          desc(r) + ' está en “' + G.rubro(r.rubro).label + '”, pero este proveedor casi siempre va en “' + G.rubro(top).label + '”.');
    }
    return out;
  }
  G.chequearRegistro = chequearRegistro;

  // Para la carga: controla un borrador contra lo ya cargado (sin guardarlo).
  G.chequearBorrador = function (draft) {
    var tmp = Object.assign({ id: draft.id || '__borrador__' }, draft);
    var prev = G.regs, enLista = prev.some(function (r) { return r.id === tmp.id; });
    G.regs = enLista ? prev.map(function (r) { return r.id === tmp.id ? tmp : r; }) : prev.concat([tmp]);
    G._cache.idx = null;
    try {
      var vistos = {};
      return chequearRegistro(tmp).filter(function (h) {
        if (h.id.indexOf('incompleto') === 0 || vistos[h.titulo]) return false;
        return (vistos[h.titulo] = true);
      });
    }
    finally { G.regs = prev; G._cache.idx = null; }
  };

  /* ---------- faltantes del mes, por sucursal ---------- */
  function faltantes(suc, mes) {
    var out = [], hoy = G.hoy(), prevs = [G.addMes(mes, -1), G.addMes(mes, -2), G.addMes(mes, -3)];
    var regsMes = G.regs.filter(function (r) { return r.sucursal === suc && r.mes === mes; });
    var nombre = G.sucLabel(suc);
    if (mes > hoy.slice(0, 7)) return out;
    if (!regsMes.length) {
      out.push({ id: 'vacio:' + suc + ':' + mes, nivel: 'falta', titulo: 'No hay nada cargado', texto: nombre + ' no tiene ningún registro de ' + G.mesLabel(mes) + '.',
        regs: [], accion: { tipo: 'cargar', draft: { sucursal: suc, mes: mes } } });
      return out;
    }
    var enMes = {}, rubrosMes = {};
    regsMes.forEach(function (r) { if (r.tipo === 'gasto') { enMes[G.norm(r.detalle)] = 1; rubrosMes[r.rubro] = 1; } });

    // 1. Gastos que se repiten todos los meses y este mes no están
    var hist = {};
    G.regs.forEach(function (r) {
      if (r.sucursal !== suc || r.tipo !== 'gasto' || prevs.indexOf(r.mes) < 0 || !r.detalle) return;
      var rb = G.rubro(r.rubro);
      if (rb.persona || r.rubro === 'f931') return; // se controlan aparte
      var k = G.norm(r.detalle);
      var h = hist[k] = hist[k] || { meses: {}, ultimo: r, recurrente: !!rb.recurrente };
      h.meses[r.mes] = 1;
      if (r.mes > h.ultimo.mes || (r.mes === h.ultimo.mes && r.fecha > h.ultimo.fecha)) h.ultimo = r;
    });
    Object.keys(hist).forEach(function (k) {
      var h = hist[k], n = Object.keys(h.meses).length, u = h.ultimo;
      if (enMes[k]) return;
      if (!(n === 3 || (h.recurrente && n >= 2 && h.meses[prevs[0]]))) return;
      if (h.recurrente && rubrosMes[u.rubro] && !G.rubro(u.rubro).persona && n < 3) return; // cambió de proveedor
      var enCurso = mes === hoy.slice(0, 7);
      // ¿Está cargada con otro mes por error? (ej. año equivocado)
      var mal = G.regs.find(function (r) {
        return r.sucursal === suc && r.tipo === 'gasto' && G.norm(r.detalle) === k && r.mes !== mes &&
          ((r.fecha || '').slice(0, 7) === mes || (r.fecha || '').slice(0, 7) === G.addMes(mes, 1)) && Math.abs(G.mesDiff(r.mes, mes)) > 2;
      });
      if (mal) {
        out.push({ id: 'recurrente:' + suc + ':' + mes + ':' + k, nivel: 'error', titulo: u.detalle + ' cargada en otro mes',
          texto: 'Falta “' + u.detalle + '” en ' + G.mesLabel(mes) + ', pero hay una del ' + G.fechaLabel(mal.fecha) + ' cargada como de <b>' + G.mesLabel(mal.mes) +
            '</b>. Seguramente es esa con el mes o el año mal.', regs: [mal.id], accion: { tipo: 'editar', id: mal.id } });
        return;
      }
      out.push({ id: 'recurrente:' + suc + ':' + mes + ':' + k, nivel: 'falta', titulo: 'Falta ' + u.detalle,
        texto: '“' + u.detalle + '” (' + G.rubro(u.rubro).label + ') aparece todos los meses en ' + nombre + ' y en ' + G.mesLabel(mes) + ' no está' +
          (enCurso ? ' todavía' : '') + '. La última fue de ' + G.money(u.monto) + '.',
        regs: [], accion: { tipo: 'cargar', draft: { tipo: 'gasto', sucursal: suc, mes: mes, rubro: u.rubro, detalle: u.detalle, comprobante: u.comprobante, monto: u.monto } } });
    });

    // 2. Personas que cobraron el mes anterior y este mes no
    var personasMes = {}, personasPrev = {};
    G.regs.forEach(function (r) {
      if (r.sucursal !== suc || r.tipo !== 'gasto' || !G.rubro(r.rubro).persona || r.rubro === 'sueldos_eventuales') return;
      if (r.mes === mes) personasMes[G.norm(r.persona)] = 1;
      if (r.mes === prevs[0]) personasPrev[G.norm(r.persona)] = r;
    });
    var haySueldos = Object.keys(personasMes).length > 0;
    Object.keys(personasPrev).forEach(function (p) {
      if (personasMes[p]) return;
      var u = personasPrev[p];
      out.push({ id: 'persona:' + suc + ':' + mes + ':' + p, nivel: 'falta', titulo: 'Falta el sueldo de ' + u.persona,
        texto: u.persona + ' cobró en ' + G.mesLabel(prevs[0]) + ' (' + G.money(u.monto) + ', ' + G.rubro(u.rubro).label + ') y en ' + G.mesLabel(mes) +
          ' no tiene sueldo cargado. ¿Dejó de trabajar o falta cargarlo?',
        regs: [], accion: { tipo: 'cargar', draft: { tipo: 'gasto', sucursal: suc, mes: mes, rubro: u.rubro, persona: u.persona, detalle: 'Sueldo ' + u.persona, comprobante: 'recibo', monto: u.monto } } });
    });

    // 3. Hay sueldos pero no cargas sociales
    if (haySueldos && !rubrosMes.f931) {
      var ult = G.regs.filter(function (r) { return r.sucursal === suc && r.rubro === 'f931'; }).sort(function (a, b) { return a.mes < b.mes ? 1 : -1; })[0];
      out.push({ id: 'f931:' + suc + ':' + mes, nivel: 'falta', titulo: 'Faltan las cargas sociales (F.931)',
        texto: nombre + ' tiene sueldos de ' + G.mesLabel(mes) + ' pero no el formulario 931. Va en el mismo mes que los sueldos, aunque se pague después.',
        regs: [], accion: { tipo: 'cargar', draft: { tipo: 'gasto', sucursal: suc, mes: mes, rubro: 'f931', detalle: ult ? ult.detalle : 'AFIP F.931', comprobante: 'recibo', monto: ult ? ult.monto : '' } } });
    }

    // 4. Días sin cierre de caja
    var cfgSuc = G.cfg.sucursales.find(function (s) { return s.key === suc; }) || {};
    var cerrados = cfgSuc.diasCerrado || [];
    var conVenta = {};
    regsMes.forEach(function (r) { if (r.tipo === 'venta' && r.rubro === 'local') conVenta[r.fecha] = 1; });
    var p = mes.split('-'), ultimo = new Date(+p[0], +p[1], 0).getDate(), sin = [];
    for (var d = 1; d <= ultimo; d++) {
      var f = mes + '-' + String(d).padStart(2, '0');
      if (f >= hoy) break;
      if (cerrados.indexOf(new Date(+p[0], +p[1] - 1, d).getDay()) >= 0) continue;
      if (!conVenta[f]) sin.push(f);
    }
    if (sin.length) {
      var lista = sin.map(function (f) { var dd = new Date(f + 'T12:00'); return DIAS[dd.getDay()] + ' ' + dd.getDate(); });
      out.push({ id: 'diasventa:' + suc + ':' + mes + ':' + sin.join(','), nivel: 'falta',
        titulo: sin.length === 1 ? 'Un día sin ventas cargadas' : sin.length + ' días sin ventas cargadas',
        texto: nombre + ' no tiene el cierre de caja del ' + lista.join(', ') + '. Si ese día estuvo cerrado, marcalo como correcto.',
        regs: [], accion: { tipo: 'ventas', draft: { sucursal: suc, fecha: sin[0] } } });
    }

    // 5. Un día con ventas fuera de lo normal (posible error de tipeo)
    var porDia = {};
    regsMes.forEach(function (r) { if (r.tipo === 'venta' && r.rubro === 'local') porDia[r.fecha] = (porDia[r.fecha] || 0) + (Number(r.monto) || 0); });
    var vals = Object.keys(porDia).map(function (k) { return porDia[k]; }), med = mediana(vals);
    Object.keys(porDia).forEach(function (f) {
      if (vals.length >= 7 && med > 0 && porDia[f] > med * 3) {
        var ids = regsMes.filter(function (r) { return r.tipo === 'venta' && r.fecha === f && r.rubro === 'local'; }).map(function (r) { return r.id; });
        out.push({ id: 'ventaatipica:' + suc + ':' + f, nivel: 'revisar', titulo: 'Venta del día muy alta',
          texto: 'El ' + G.fechaLabel(f) + ' ' + nombre + ' vendió ' + G.money(porDia[f]) + ', ' + Math.round(porDia[f] / med) + ' veces un día normal (' + G.money(med) + '). ¿Hay un cero de más?',
          regs: ids, accion: { tipo: 'editar', id: ids[0] } });
      }
    });
    return out;
  }

  /* ---------- revisión completa de un mes ---------- */
  G.revisar = function (suc, mes) {
    var key = 'rev|' + suc + '|' + mes;
    if (G._cache[key]) return G._cache[key];
    var vistos = {}, todos = [];
    function push(h) { if (!vistos[h.id]) { vistos[h.id] = 1; todos.push(h); } }
    G.regs.forEach(function (r) { if (r.mes === mes && G.deSuc(r, suc)) chequearRegistro(r).forEach(push); });
    // Transferencias no tienen mes: se revisan por fecha
    G.regs.forEach(function (r) { if (r.tipo === 'transferencia' && (r.fecha || '').slice(0, 7) === mes && G.deSuc(r, suc)) chequearRegistro(r).forEach(push); });
    // Deudas viejas de meses anteriores que siguen sin pagar
    G.regs.forEach(function (r) {
      if (r.tipo === 'gasto' && !r.fechaPago && r.mes && r.mes < mes && G.deSuc(r, suc))
        chequearRegistro(r).filter(function (h) { return h.id.indexOf('pendiente:') === 0; }).forEach(push);
    });
    var sucs = suc === 'todas' ? G.cfg.sucursales.map(function (s) { return s.key; }) : [suc];
    sucs.forEach(function (s) { faltantes(s, mes).forEach(push); });
    var orden = { error: 0, falta: 1, revisar: 2 };
    todos.sort(function (a, b) { return orden[a.nivel] - orden[b.nivel]; });
    var res = {
      todos: todos,
      activos: todos.filter(function (h) { return !G.ignorados[h.id]; }),
      ignorados: todos.filter(function (h) { return G.ignorados[h.id]; })
    };
    res.cuenta = { error: 0, falta: 0, revisar: 0 };
    res.activos.forEach(function (h) { res.cuenta[h.nivel]++; });
    res.porReg = {};
    res.activos.forEach(function (h) { h.regs.forEach(function (id) { (res.porReg[id] = res.porReg[id] || []).push(h); }); });
    G._cache[key] = res;
    return res;
  };
})(window.G);
