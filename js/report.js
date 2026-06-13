/* ============================================================
   Informes 2026 · Cáscara Collective — render de reportes (slides)
   Construye un <deck-stage> con sus <section> a partir de los
   descriptores declarativos en data/informes-2026.json → reports[key].slides.
   Un render por tipo de slide; reproduce el markup de las referencias.
   ============================================================ */
(function () {
  var WM_INLINE = '<img class="wm" src="assets/wordmark-inline-blue.png" alt="">';

  // ---- libros (usado por "lecturas") ----
  function book(b, isFin) {
    var io = b.io
      ? '<div class="book__io">' + b.io.map(function (x) {
          return '<div><div class="io__l">' + x.l + '</div><div class="io__v num">' + x.v + '</div></div>';
        }).join('') + '</div>'
      : '';
    var figCls = 'res__fig' + (b.resFigNum === false ? '' : ' num') + (b.resNeg ? ' neg' : '');
    var figStyle = b.resSize ? ' style="font-size:' + b.resSize + 'px;"' : '';
    var chip = b.chip ? '<div class="book__chip num">' + b.chip + '</div>' : '';
    return '<div class="book' + (isFin ? ' fin' : '') + '">' +
      '<div class="book__tag">' + b.tag + '</div>' +
      '<div class="book__sub"' + (b.subTight ? ' style="min-height:0;"' : '') + '>' + b.sub + '</div>' +
      io +
      '<div class="book__res"' + (b.resMarginTop ? ' style="margin-top:' + b.resMarginTop + ';"' : '') + '>' +
        '<div class="res__l">' + b.resL + '</div>' +
        '<div class="' + figCls + '"' + figStyle + '>' + b.resFig + '</div>' +
        chip +
      '</div>' +
    '</div>';
  }

  var R = {
    cover: function (s) {
      var monthStyle = s.monthSize ? ' style="font-size:' + s.monthSize + ';"' : '';
      var meta = s.meta
        ? '<div class="mcover__meta">' + s.meta.map(function (m) {
            return '<div><b>' + m.label + '</b>' + m.value + '</div>';
          }).join('') + '</div>'
        : '';
      return '<div class="frame mcover">' +
        '<div class="mcover__top"><div class="kicker">' + s.kicker + '</div>' +
        '<img class="mcover__wm" src="assets/wordmark-stacked-blue.png" alt="Cáscara Collective"></div>' +
        '<img class="mcover__archer" src="assets/logo-mark-black.png" alt="">' +
        '<div class="anim">' +
          '<div class="mcover__no">' + s.no + '</div>' +
          '<div class="mcover__month"' + monthStyle + '>' + s.month + '</div>' +
          '<p class="mcover__sub">' + s.sub + '</p>' + meta +
        '</div>' +
      '</div>';
    },

    lecturas: function (s) {
      var flow = s.flow
        ? '<div class="flow anim3">' + s.flow.map(function (f) {
            var bs = f.blue ? ' style="color:var(--blue)"' : '';
            return '<div class="flow__step' + (f.accent ? ' accent' : '') + '">' +
              '<div class="flow__l"' + bs + '>' + f.l + '</div>' +
              '<div class="flow__v num"' + bs + '>' + f.v + '</div></div>';
          }).join('') + '</div>'
        : '';
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        '<div class="ledger anim2">' + book(s.trabajo, false) + book(s.caja, true) + '</div>' +
        flow +
        '<div class="foot anim3"><div>' + s.foot + '</div></div>' +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    barras: function (s) {
      var totals = s.totals
        ? '<div class="io-totals anim2">' +
            '<div class="io-total fact"><span>' + (s.totals.factLabel || 'Facturado') + '</span><b class="num">' + s.totals.fact + '</b><small>' + s.totals.factSmall + '</small></div>' +
            '<div class="io-totals__div"></div>' +
            '<div class="io-total cob"><span>' + (s.totals.cobLabel || 'Entró en caja') + '</span><b class="num">' + s.totals.cob + '</b><small>' + s.totals.cobSmall + '</small></div>' +
          '</div>'
        : '';
      var rowsStyle = s.rowsMarginTop ? ' style="margin-top:' + s.rowsMarginTop + ';"' : '';
      var rows = s.bars.map(function (bar) {
        return '<div class="row">' +
          '<div class="row__label">' + bar.label +
            (bar.small ? '<small>' + bar.small + '</small>' : '') +
            (bar.b2c ? '<span class="b2c">B2C</span>' : '') + '</div>' +
          '<div class="track"><div class="fill" style="width:' + bar.width + '"></div></div>' +
          '<div class="row__amt"><b class="num">' + bar.amount + '</b>' + (bar.amountSpan ? '<span>' + bar.amountSpan + '</span>' : '') + '</div>' +
        '</div>';
      }).join('');
      var footStyle = s.footMarginTop ? ' style="margin-top:' + s.footMarginTop + ';"' : '';
      var foot = '<div class="' + (s.footClass || 'foot') + '"' + footStyle + '><div>' + s.foot + '</div>' +
        (s.footRight ? '<div>' + s.footRight + '</div>' : '') + '</div>';
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        totals +
        '<div class="rows anim2"' + rowsStyle + '>' + rows + '</div>' +
        foot +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    egresos: function (s) {
      var groups = s.groups.map(function (g) {
        return '<div class="drow">' +
          '<div class="drow__label">' + g.label + (g.pct ? ' <span class="pct">' + g.pct + '</span>' : '') + '<small>' + g.small + '</small></div>' +
          '<div class="drow__bars">' +
            '<div class="dbar eco"><div class="dbar__track"><div class="dbar__fill" style="width:' + g.ecoW + '"></div></div><div class="dbar__v num">' + g.eco + '</div></div>' +
            '<div class="dbar fin"><div class="dbar__track"><div class="dbar__fill" style="width:' + g.finW + '"></div></div><div class="dbar__v num">' + g.fin + '</div></div>' +
          '</div>' +
        '</div>';
      }).join('');
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        '<div class="legend anim2">' +
          '<span><span class="swatch sw-eco"></span>Costo del mes</span>' +
          '<span><span class="swatch sw-fin"></span>Pagado en el mes</span>' +
        '</div>' +
        '<div class="rows anim2" style="gap:' + s.rowsGap + ';">' + groups + '</div>' +
        '<div class="foot" style="margin-top:' + s.footMarginTop + ';"><div>' + s.foot + '</div><div>' + s.footRight + '</div></div>' +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    b2c: function (s) {
      var costs = s.costs.map(function (c) {
        return '<div class="b2c-cost"><div class="b2c-cost__l">' + c.l + '</div><div class="b2c-cost__v num">' + c.v + '</div><p class="b2c-cost__b">' + c.b + '</p></div>';
      }).join('');
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        '<div class="b2c-grid anim2">' +
          '<div class="b2c-hero"><div class="b2c-hero__tag">' + s.heroTag + '</div><div class="b2c-hero__fig num">' + s.heroFig + '</div><p class="b2c-hero__sub">' + s.heroSub + '</p></div>' +
          '<div class="b2c-side">' + costs + '</div>' +
        '</div>' +
        '<div class="foot" style="margin-top:28px;"><div>' + s.foot + '</div></div>' +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    socios: function (s) {
      var plist = function (items, eq) {
        return items.map(function (p) {
          return '<div class="pitem' + (eq ? ' eq' : '') + '"><span class="nm">' + p.nm + '</span><span class="amt num">' + p.amt + '</span></div>';
        }).join('');
      };
      var bigCls = 'ccbox__big' + (s.box.bigNum === false ? '' : ' num');
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        '<div class="socrow anim2">' +
          '<div class="retiros">' +
            '<div class="retiros__sub">' + (s.sociosLabel || 'Socios · económico del mes') + '</div>' +
            '<div class="plist">' + plist(s.socios, false) +
              '<div class="psub"><span class="nm">' + s.sociosSub.nm + '</span><span class="amt num">' + s.sociosSub.amt + '</span></div>' +
            '</div>' +
            '<div class="retiros__sub eq">' + (s.equipoLabel || 'Equipo · económico del mes') + '</div>' +
            '<div class="plist">' + plist(s.equipo, true) +
              '<div class="psub"><span class="nm">' + s.equipoSub.nm + '</span><span class="amt num">' + s.equipoSub.amt + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="ccbox">' +
            '<div class="ccbox__tag">' + s.box.tag + '</div>' +
            '<div class="' + bigCls + '">' + s.box.big + '</div>' +
            '<p class="ccbox__txt">' + s.box.txt + '</p>' +
            '<div class="ccbox__chips">' + s.box.chips.map(function (c) { return '<div class="ccchip">' + c + '</div>'; }).join('') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="foot" style="margin-top:28px;"><div>' + s.foot + '</div></div>' +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    stats: function (s) {
      var items = s.items.map(function (it) {
        return '<div class="stat' + (it.key ? ' stat--key' : '') + '"><div class="stat__label">' + it.label + '</div><div class="stat__fig num">' + it.fig + '</div><div class="stat__note">' + it.note + '</div></div>';
      }).join('');
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        '<div class="stats anim2">' + items + '</div>' +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    chart: function (s) {
      var legend = s.legend.map(function (l) {
        return l.raw ? l.raw : '<span><span class="swatch ' + l.cls + '"></span>' + l.label + '</span>';
      }).join('');
      var cols = s.cols.map(function (c) {
        return '<div class="col"><div class="col__net' + (c.netNeg ? ' neg' : '') + '">' + c.net + '</div>' +
          '<div class="bars"><div class="bar in" style="height:' + c.inH + 'px"></div><div class="bar eg" style="height:' + c.egH + 'px"></div></div>' +
          '<div class="col__m">' + c.m + '</div>' +
          '<div class="col__saldo num"><small>' + c.saldoLabel + '</small>' + c.saldo + '</div></div>';
      }).join('');
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        '<div class="chart-wrap anim2">' +
          '<div class="legend">' + legend + '</div>' +
          '<div class="chart">' + cols + '</div>' +
          '<div class="chart-foot"><div>' + s.foot + '</div><div>' + s.footRight + '</div></div>' +
        '</div>' +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    hero: function (s) {
      var strip = s.strip.map(function (x) {
        return '<div><b class="num">' + x.b + '</b><span>' + x.span + '</span></div>';
      }).join('');
      var foot = s.foot
        ? '<div class="foot" style="margin-top:' + (s.footMarginTop || '40px') + '; color:rgba(255,255,255,.72);"><div>' + s.foot + '</div></div>'
        : '';
      return '<div class="frame frame--blue hero">' +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<div class="hero__fig anim2 num">' + s.fig + '</div>' +
        '<p class="hero__line anim3">' + s.line + '</p>' +
        '<div class="hero__strip anim3">' + strip + '</div>' +
        foot +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    proporciones: function (s) {
      var cols = s.cols.map(function (col) {
        var legend = col.legend.map(function (l) {
          return '<div class="pl"><span class="pl__pc num">' + l.pc + '</span>' +
            '<span class="pl__dot" style="background:' + l.dot + '"></span>' +
            '<span class="pl__nm">' + l.nm + (l.nmSmall ? '<small>' + l.nmSmall + '</small>' : '') + '</span>' +
            '<span class="pl__sp"></span><span class="pl__amt num">' + l.amt + '</span></div>';
        }).join('');
        return '<div class="propcol">' +
          '<div class="propcol__t">' + col.t + '</div>' +
          '<div class="propcol__s">' + col.s + '</div>' +
          '<div class="propcol__body">' +
            '<div class="bigdonut" style="background:' + col.donut + ';"><div class="bigdonut__c"><b class="num">' + col.centerBig + '</b><span>' + col.centerLabel + '</span></div></div>' +
            '<div class="proplegend">' + legend + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      var foot = s.foot ? '<div class="foot anim3"' + (s.footMarginTop ? ' style="margin-top:' + s.footMarginTop + ';"' : '') + '><div>' + s.foot + '</div></div>' : '';
      return '<div class="frame">' + WM_INLINE +
        '<div class="kicker anim">' + s.kicker + '</div>' +
        '<h2 class="title anim">' + s.title + '</h2>' +
        '<div class="props anim2">' + cols + '</div>' +
        foot +
        '<div class="pagenum">' + s.pageNum + '</div>' +
      '</div>';
    },

    cierre: function (s) {
      var wm = s.wordmarkWhite
        ? '<img class="cover__wm" style="height:62px;align-self:flex-start;width:auto;" src="assets/wordmark-stacked-white.png" alt="Cáscara Collective">'
        : '';
      var kicker = s.kicker ? '<div class="kicker anim">' + s.kicker + '</div>' : '';
      var bigStyle = s.bigTiza ? ' style="color:var(--tiza);"' : '';
      return '<div class="frame close frame--' + s.variant + '">' + wm + kicker +
        '<div class="close__big anim"' + bigStyle + '>' + s.big + '</div>' +
        '<div class="close__row">' +
          '<p class="close__note" style="color:rgba(255,255,255,' + (s.noteOpacity || '.82') + ');">' + s.note + '</p>' +
          '<div class="pagenum" style="position:static; color:rgba(255,255,255,.6);">' + s.pageLabel + '</div>' +
        '</div>' +
      '</div>';
    }
  };

  function section(s, screenLabel) {
    var frame = (R[s.type] || function () { return '<div class="frame"></div>'; })(s);
    return '<section data-label="' + (s.label || '') + '" data-screen-label="' + screenLabel + '">' + frame + '</section>';
  }

  // ---- Anexo (modal) ----
  function detTable(caption, items, totEco, totFin) {
    var rows = items.map(function (it) {
      var cls = [];
      if (it.tag === 'b2c') cls.push('b2c');
      if (it.tag === 'dev') cls.push('dev');
      return '<tr class="' + cls.join(' ') + '"><td>' + it.n + '</td><td>' + CC.cell(it.eco) + '</td><td>' + CC.cell(it.fin) + '</td></tr>';
    }).join('');
    return '<table class="tbl"><caption>' + caption + '</caption>' +
      '<thead><tr><th>Concepto</th><th>Facturado / del mes</th><th>Caja</th></tr></thead>' +
      '<tbody>' + rows +
      '<tr class="total"><td>Total</td><td>' + CC.cell(totEco) + '</td><td>' + CC.cell(totFin) + '</td></tr>' +
      '</tbody></table>';
  }

  function monthModal(mesLabel, det) {
    var sub = 'Detalle completo de ingresos y egresos, tal como figuran en la planilla. “Facturado / del mes” = el trabajo y los costos que corresponden a este mes; “Caja” = lo que realmente entró o salió de la cuenta.';
    var nota = det.nota ? '<p class="modal__note">' + det.nota + '</p>' : '';
    return '<div class="modal__panel">' +
      '<div class="modal__head"><div><div class="modal__title">Anexo · <span class="em">' + mesLabel + ' 2026</span></div>' +
      '<div class="modal__sub">' + sub + '</div></div>' +
      '<button class="modal__x" aria-label="Cerrar">×</button></div>' +
      '<div class="modal__body"><div class="modal__grid">' +
        '<div>' + detTable('Ingresos', det.ingresos, det.totIngEco, det.totIngFin) + '</div>' +
        '<div>' + detTable('Egresos', det.egresos, det.totEgrEco, det.totEgrFin) + '</div>' +
      '</div>' + nota + '</div>';
  }

  function summaryModal(data, note) {
    var c = data.resumenes.cincoMeses;
    var rows = data.months.map(function (m) {
      return '<tr><td>' + m.label + '</td><td>' + CC.money(m.facturado) + '</td><td>' + CC.moneySigned(m.resTrabajo) + '</td><td>' + CC.money(m.cobrado) + '</td><td>' + CC.money(m.pagado) + '</td><td>' + CC.moneySigned(m.resCaja) + '</td><td>' + CC.money(m.saldoFinal) + '</td></tr>';
    }).join('');
    var total = '<tr class="total"><td>5 meses</td><td>' + CC.money(c.facturado) + '</td><td>' + CC.moneySigned(c.resTrabajo) + '</td><td>' + CC.money(c.cobrado) + '</td><td>' + CC.money(c.pagado) + '</td><td>' + CC.moneySigned(c.resCaja) + '</td><td>' + CC.money(c.saldoFinal) + '</td></tr>';
    return '<div class="modal__panel">' +
      '<div class="modal__head"><div><div class="modal__title">Resumen <span class="em">mes a mes</span></div>' +
      '<div class="modal__sub">Las cifras clave de cada mes. El detalle línea por línea está en el informe de cada mes.</div></div>' +
      '<button class="modal__x" aria-label="Cerrar">×</button></div>' +
      '<div class="modal__body"><table class="tbl">' +
        '<thead><tr><th>Mes</th><th>Facturado</th><th>Res. trabajo</th><th>Entró</th><th>Salió</th><th>Res. caja</th><th>Saldo final</th></tr></thead>' +
        '<tbody>' + rows + total + '</tbody></table>' +
        (note ? '<p class="modal__note">' + note + '</p>' : '') +
      '</div>';
  }

  function mountModal(innerHTML) {
    var m = document.createElement('div');
    m.className = 'modal';
    m.id = 'detalle-modal';
    m.innerHTML = innerHTML;
    document.body.appendChild(m);
    function close() { m.classList.remove('open'); }
    m.querySelector('.modal__x').addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.openDetalle = function () { m.classList.add('open'); };
  }

  function svg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  var ICON_LIST = svg('<path d="M3 5h18"></path><path d="M3 12h18"></path><path d="M3 19h18"></path>');
  var ICON_DOWN = svg('<path d="M12 3v12"></path><path d="m7 11 5 5 5-5"></path><path d="M5 21h14"></path>');

  function mountControls(rep) {
    var home = '<a class="ctl ctl--ghost" href="index.html" aria-label="Volver al inicio">← Inicio</a>';
    var ghost = '';
    if (rep.detail === 'month') {
      ghost = '<button class="ctl ctl--ghost" id="btn-detalle" aria-label="Ver detalle completo">' + ICON_LIST + 'Ver detalle</button>';
    } else if (rep.detail === 'summary') {
      ghost = '<button class="ctl ctl--ghost" id="btn-detalle" aria-label="Ver tabla por mes">' + ICON_LIST + 'Ver por mes</button>';
    }
    var primary = '<button class="ctl ctl--primary" id="btn-print" aria-label="Descargar en PDF">' + ICON_DOWN + 'Descargar</button>';
    var c = document.createElement('div');
    c.className = 'controls';
    c.innerHTML = home + ghost + primary;
    document.body.appendChild(c);
    c.querySelector('#btn-print').addEventListener('click', function () { window.print(); });
    var bd = c.querySelector('#btn-detalle');
    if (bd) bd.addEventListener('click', function () { if (window.openDetalle) window.openDetalle(); });
  }

  // ---- arranque ----
  function fail(msg) {
    document.body.innerHTML = '<p style="font-family:Helvetica,Arial,sans-serif;padding:60px;color:#54545B;">' + msg + ' · <a href="index.html" style="color:#10069F;">Volver al inicio</a></p>';
  }

  CC.load().then(function (data) {
    var key = CC.query('m') || CC.query('r');
    var rep = key && data.reports ? data.reports[key] : null;
    if (!rep) { fail('Reporte no encontrado.'); return; }
    document.title = rep.title;
    var html = rep.slides.map(function (s) { return section(s, rep.screenLabel); }).join('');
    document.getElementById('deck').innerHTML = '<deck-stage width="1920" height="1080">' + html + '</deck-stage>';
    if (rep.detail === 'month' && rep.detalle) {
      mountModal(monthModal(rep.screenLabel, rep.detalle));
    } else if (rep.detail === 'summary') {
      mountModal(summaryModal(data, rep.summaryNote));
    }
    mountControls(rep);
  }).catch(function (e) {
    fail('Error cargando los datos: ' + e.message);
  });
})();
