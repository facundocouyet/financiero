/* ============================================================
   Informes 2026 · Cáscara Collective — render de reportes (slides)
   Construye un <deck-stage> con sus <section> a partir de los
   descriptores declarativos en data/informes-2026.json → reports[key].slides.
   Un render por tipo de slide; reproduce el markup de las referencias.
   ============================================================ */
(function () {
  var WM_INLINE = '<img class="wm" src="assets/wordmark-inline-blue.png" alt="">';
  // En pantallas angostas (típicamente teléfonos en vertical) no usamos
  // deck-stage: renderizamos los slides como una vista vertical scrolleable.
  var IS_MOBILE = window.matchMedia('(max-width: 700px)').matches;

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
      var hf = IS_MOBILE ? 0.5 : 1;
      var cols = s.cols.map(function (c) {
        var ih = Math.max(2, Math.round(c.inH * hf)), eh = Math.max(2, Math.round(c.egH * hf));
        return '<div class="col"><div class="col__net' + (c.netNeg ? ' neg' : '') + '">' + c.net + '</div>' +
          '<div class="bars"><div class="bar in" style="height:' + ih + 'px"></div><div class="bar eg" style="height:' + eh + 'px"></div></div>' +
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

  // ---- unidades de negocio y acuerdos (se calculan desde months[]) ----
  // data.unidades define cada unidad y qué líneas de la planilla le
  // corresponden: `ingresos` por nombre exacto, `costos` por prefijo. La
  // unidad con `resto: true` se queda con los ingresos que no matchean.
  var DATA = null;
  function norm(x) { return String(x || '').trim().toLowerCase(); }
  function val(x) { var n = Number(x); return x === '' || x === null || isNaN(n) ? 0 : n; }
  function monthOf(key) {
    return (DATA.months || []).filter(function (m) { return m.key === key; })[0];
  }
  function unidadesDe(m) {
    var defs = DATA.unidades || [];
    var out = defs.map(function (u) { return { u: u, fact: 0, cob: 0, costo: 0, hayCosto: false }; });
    var resto = out.filter(function (o) { return o.u.resto; })[0];
    (m.ingresos || []).forEach(function (it) {
      var hit = out.filter(function (o) {
        return (o.u.ingresos || []).some(function (n) { return norm(n) === norm(it.n); });
      })[0] || resto;
      if (!hit) return;
      hit.fact += val(it.eco);
      hit.cob += val(it.fin);
    });
    (m.egresos || []).forEach(function (it) {
      out.forEach(function (o) {
        if ((o.u.costos || []).some(function (p) { return norm(it.n).indexOf(norm(p)) === 0; })) {
          o.costo += val(it.eco);
          o.hayCosto = true;
        }
      });
    });
    return out;
  }
  function pct(v, tot, dec) {
    if (!tot) return '—';
    return (v / tot * 100).toFixed(dec === undefined ? 1 : dec).replace('.', ',') + '%';
  }
  function kfmt(v) { return v ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : '—'; }
  function head2(s, totL, totV) {
    return '<div class="head2"><div>' +
        '<div class="kicker">' + s.kicker + '</div>' +
        '<h2 class="title">' + s.title + '</h2>' +
        (s.sub ? '<p class="lead">' + s.sub + '</p>' : '') +
      '</div>' +
      (totV ? '<div class="head2__tot"><span>' + totL + '</span><b>' + totV + '</b></div>' : '') +
    '</div>';
  }
  function side(s) { return s.foot ? '<div class="side">' + s.foot + '</div>' : ''; }

  R.unidades = function (s) {
    var m = monthOf(s.month);
    var rows = unidadesDe(m).filter(function (o) { return o.fact || o.cob; });
    var totF = rows.reduce(function (a, o) { return a + o.fact; }, 0);
    rows.sort(function (a, b) { return b.fact - a.fact; });
    var acs = DATA.acuerdos || [];
    var body = rows.map(function (o) {
      var ac = acs.filter(function (a) { return a.unidad === o.u.id; })[0];
      var w = totF ? (o.fact / totF * 100).toFixed(1) : 0;
      var costo = o.hayCosto ? '<span class="g-s">' + CC.money(o.costo) + '</span>' : '<span class="g-pend">a asignar</span>';
      var margen = o.hayCosto
        ? '<span class="g-s">' + CC.money(o.fact - o.costo) + ' · ' + pct(o.fact - o.costo, o.fact, 0) + '</span>'
        : '<span class="g-pend">a asignar</span>';
      return '<div class="gtable__r">' +
        '<div class="g-name"><b>' + o.u.n + '</b><small>' + (o.u.d || '') + '</small></div>' +
        '<div class="g-v r">' + CC.money(o.fact) + '</div>' +
        '<div class="g-pct"><div class="track"><div class="fill" style="width:' + w + '%"></div></div><i>' + pct(o.fact, totF) + '</i></div>' +
        '<div class="g-s r">' + CC.money(o.cob) + '</div>' +
        '<div class="r">' + costo + '</div>' +
        '<div class="r">' + margen + '</div>' +
        '<div class="g-an r">' + (ac ? ac.anexo : '—') + '</div>' +
      '</div>';
    }).join('');
    return '<div class="frame unidades">' + head2(s, 'Facturado del mes', CC.money(m.facturado)) +
      '<div class="gtable">' +
        '<div class="gtable__h"><span>Unidad</span><span class="r">Facturado</span><span>% del mes</span><span class="r">Cobrado</span><span class="r">Costo directo</span><span class="r">Margen</span><span class="r">Anexo</span></div>' +
        body +
      '</div>' + side(s) +
    '</div>';
  };

  R.acuerdos = function (s) {
    var m = monthOf(s.month);
    var us = unidadesDe(m);
    var byId = {};
    us.forEach(function (o) { byId[o.u.id] = o; });
    var body = (DATA.acuerdos || []).map(function (a) {
      var unidad = byId[a.unidad];
      var base = a.base === 'mes' ? m.facturado : (unidad ? unidad.fact : 0);
      var baseL = a.base === 'mes' ? 'Facturado del mes' : 'Facturado ' + (unidad ? unidad.u.corto || unidad.u.n : '');
      var hay = (a.conceptos || []).length > 0;
      var monto = 0;
      (m.egresos || []).forEach(function (it) {
        if ((a.conceptos || []).some(function (n) { return norm(n) === norm(it.n); })) monto += val(it.eco);
      });
      var doc = a.doc
        ? '<a class="g-doc" href="' + a.doc + '" target="_blank" rel="noopener">Ver PDF</a>'
        : '<span class="g-doc">Falta anexar</span>';
      return '<div class="gtable__r">' +
        '<div class="g-an">' + a.anexo + '</div>' +
        '<div class="g-name"><b>' + a.n + '</b>' + (unidad && unidad.u.n !== a.n ? '<small>' + unidad.u.n + '</small>' : '') + '</div>' +
        '<div class="' + (a.esquema ? 'g-s' : 'g-pend') + '">' + (a.esquema || 'a cargar') + '</div>' +
        '<div class="g-s">' + baseL + ' · ' + CC.money(base) + '</div>' +
        '<div class="r">' + (hay ? '<span class="g-v">' + CC.money(monto) + '</span>' : '<span class="g-pend">a cargar</span>') + '</div>' +
        '<div class="g-an r">' + (hay ? pct(monto, base) : '—') + '</div>' +
        '<div class="r">' + doc + '</div>' +
      '</div>';
    }).join('');
    return '<div class="frame acuerdos">' + head2(s) +
      '<div class="gtable">' +
        '<div class="gtable__h"><span>Anexo</span><span>Acuerdo</span><span>Esquema pactado</span><span>Base</span><span class="r">Monto del mes</span><span class="r">% efectivo</span><span class="r">Documento</span></div>' +
        body +
      '</div>' + side(s) +
    '</div>';
  };

  R.matriz = function (s) {
    var ms = s.months.map(monthOf).filter(Boolean);
    var per = ms.map(unidadesDe);
    var defs = DATA.unidades || [];
    var grand = 0;
    var tots = defs.map(function (u, i) {
      var t = per.reduce(function (a, us) { return a + us[i].fact; }, 0);
      grand += t;
      return t;
    });
    var cols = 'grid-template-columns:2fr repeat(' + ms.length + ',minmax(0,1fr)) 1.1fr 1.6fr';
    var hi = s.highlight || 15000;
    var body = defs.map(function (u, i) {
      if (!tots[i]) return '';
      var cells = per.map(function (us) {
        var v = us[i].fact;
        return '<div class="g-c' + (v >= hi ? ' hi' : v ? '' : ' zero') + '">' + kfmt(v) + '</div>';
      }).join('');
      var w = grand ? (tots[i] / grand * 100).toFixed(1) : 0;
      return '<div class="gtable__r" style="' + cols + '">' +
        '<div class="g-name"><b>' + u.n + '</b></div>' + cells +
        '<div class="g-v r">' + kfmt(tots[i]) + '</div>' +
        '<div class="g-pct"><div class="track"><div class="fill" style="width:' + w + '%"></div></div><i>' + pct(tots[i], grand) + '</i></div>' +
      '</div>';
    }).join('');
    var mesTot = ms.map(function (m) { return '<div class="g-c" style="font-weight:700;color:#0A0A0C">' + kfmt(m.facturado) + '</div>'; }).join('');
    return '<div class="frame matriz">' + head2(s, 'Facturado del período', CC.money(grand)) +
      '<div class="gtable">' +
        '<div class="gtable__h" style="' + cols + '"><span>Unidad</span>' +
          ms.map(function (m) { return '<span class="r">' + m.label.slice(0, 3) + '</span>'; }).join('') +
          '<span class="r">Total</span><span>% del período</span></div>' +
        body +
        '<div class="gtable__r tot" style="' + cols + '"><div class="g-name"><b>Total del mes</b></div>' + mesTot + '<div></div><div></div></div>' +
      '</div>' + side(s) +
    '</div>';
  };

  // Tabla genérica: una fila por concepto y las columnas que defina el JSON.
  // La usan las vistas de septiembre (unidades, reparto, reglas, growth,
  // contenido y caja). Reusa la grilla .gtable del resto del informe; el ancho
  // de cada columna viene del dato porque cambia de tabla en tabla.
  R.tabla = function (s) {
    var tpl = 'grid-template-columns:' + s.cols.map(function (c) { return c.w || '1fr'; }).join(' ');
    var head = s.cols.map(function (c, i) {
      return '<span' + (i ? ' class="r"' : '') + '>' + c.l +
        (c.s ? '<small>' + c.s + '</small>' : '') + '</span>';
    }).join('');
    var body = s.rows.map(function (r) {
      var cells = r.cells.map(function (c) {
        var o = (typeof c === 'string') ? { v: c } : c;
        return '<div class="' + (o.dim ? 'g-pend' : (o.em ? 'g-v' : 'g-s')) + ' r">' + o.v + '</div>';
      }).join('');
      return '<div class="gtable__r' + (r.tot ? ' tot' : '') + '" style="' + tpl + '">' +
        '<div class="g-name"><b>' + r.nm + '</b>' + (r.s ? '<small>' + r.s + '</small>' : '') + '</div>' +
        cells +
      '</div>';
    }).join('');
    return '<div class="frame tabla' + (s.dense ? ' tabla--dense' : '') + '">' + head2(s) +
      '<div class="gtable">' +
        '<div class="gtable__h" style="' + tpl + '">' + head + '</div>' + body +
      '</div>' + side(s) +
    '</div>';
  };

  var KLEIN = { cover: 1, cierre: 1, hero: 1 };
  function section(s, rep, i, n) {
    var frame = (R[s.type] || function () { return '<div class="frame"></div>'; })(s);
    var who = String(rep.title || '').split(' · ')[0];
    var lbl = String(s.label || '').split(' · ')[0];
    var chrome = s.type === 'cover' ? ''
      : '<div class="chrome' + (KLEIN[s.type] ? ' chrome--inv' : '') + '"><span><b>' + who + '</b> · ' + lbl + '</span>' +
        '<span>' + ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + n).slice(-2) + '</span></div>';
    var kfoot = (s.type === 'cover' || s.type === 'cierre')
      ? '<div class="kfoot"><span>Cáscara Collective</span><span>Uso interno entre socios</span></div>' : '';
    return '<section data-label="' + (s.label || '') + '" data-screen-label="' + rep.screenLabel + '">' + frame + chrome + kfoot + '</section>';
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

  function summaryModal(data, note, resumen) {
    var c = resumen;
    var rows = data.months.map(function (m) {
      return '<tr><td>' + m.label + '</td><td>' + CC.money(m.facturado) + '</td><td>' + CC.moneySigned(m.resTrabajo) + '</td><td>' + CC.money(m.cobrado) + '</td><td>' + CC.money(m.pagado) + '</td><td>' + CC.moneySigned(m.resCaja) + '</td><td>' + CC.money(m.saldoFinal) + '</td></tr>';
    }).join('');
    var total = '<tr class="total"><td>' + data.months.length + ' meses</td><td>' + CC.money(c.facturado) + '</td><td>' + CC.moneySigned(c.resTrabajo) + '</td><td>' + CC.money(c.cobrado) + '</td><td>' + CC.money(c.pagado) + '</td><td>' + CC.moneySigned(c.resCaja) + '</td><td>' + CC.money(c.saldoFinal) + '</td></tr>';
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
  var ICON_RAIL = svg('<rect x="3" y="4" width="6" height="16" rx="1.5"></rect><path d="M13 4h8"></path><path d="M13 10h8"></path><path d="M13 14h8"></path><path d="M13 20h8"></path>');

  /* Miniaturas (rail de deck-stage): ocultas por defecto para leer el informe
     a pantalla completa. El botón las muestra/oculta y deck-stage recuerda la
     preferencia (localStorage 'deck-stage.railVisible'), así que sólo fijamos
     el default la primera vez. */
  var RAIL_KEY = 'deck-stage.railVisible';
  function railPref() {
    try { return localStorage.getItem(RAIL_KEY) !== '0'; } catch (e) { return false; }
  }
  function railDefaultHidden() {
    try { if (localStorage.getItem(RAIL_KEY) === null) localStorage.setItem(RAIL_KEY, '0'); } catch (e) {}
  }
  function railSet(on) {
    window.postMessage({ type: '__deck_rail_visible', on: !!on }, '*');
  }

  function mountControls(rep) {
    var home = '<a class="ctl ctl--ghost" href="index.html" aria-label="Volver al inicio">← Inicio</a>';
    var ghost = '';
    if (rep.detail === 'month') {
      ghost = '<button class="ctl ctl--ghost" id="btn-detalle" aria-label="Ver detalle completo">' + ICON_LIST + 'Ver detalle</button>';
    } else if (rep.detail === 'summary') {
      ghost = '<button class="ctl ctl--ghost" id="btn-detalle" aria-label="Ver tabla por mes">' + ICON_LIST + 'Ver por mes</button>';
    }
    var on = railPref();
    var rail = '<button class="ctl ctl--ghost ctl--icon" id="btn-rail" aria-pressed="' + on + '"' +
      ' aria-label="Mostrar u ocultar las miniaturas" title="Miniaturas (T)">' + ICON_RAIL + '</button>';
    var primary = '<button class="ctl ctl--primary" id="btn-print" aria-label="Descargar en PDF">' + ICON_DOWN + 'Descargar</button>';
    var c = document.createElement('div');
    c.className = 'controls';
    c.innerHTML = home + rail + ghost + primary;
    document.body.appendChild(c);
    c.querySelector('#btn-print').addEventListener('click', function () { window.print(); });
    var bd = c.querySelector('#btn-detalle');
    if (bd) bd.addEventListener('click', function () { if (window.openDetalle) window.openDetalle(); });

    var br = c.querySelector('#btn-rail');
    function toggleRail() {
      var next = br.getAttribute('aria-pressed') !== 'true';
      br.setAttribute('aria-pressed', String(next));
      railSet(next);
    }
    br.addEventListener('click', toggleRail);
    // Atajo: T. Los de deck-stage (←/→, R, 1-9) siguen intactos.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 't' && e.key !== 'T') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      toggleRail();
    });
  }

  // ---- arranque ----
  function fail(msg) {
    document.body.innerHTML = '<p style="font-family:Helvetica,Arial,sans-serif;padding:60px;color:#54545B;">' + msg + ' · <a href="index.html" style="color:#10069F;">Volver al inicio</a></p>';
  }

  // En teléfono (vertical) los reportes usan la versión scroll oficial del
  // diseñador (scroll-report.css + *-scroll.html). En desktop/horizontal,
  // slides con deck-stage.
  var _m = CC.query('m'), _r = CC.query('r');
  if (IS_MOBILE && (_m || _r)) {
    location.replace(_m ? (_m + '-scroll.html') : ('resumen-' + _r + '-scroll.html'));
    return;
  }

  CC.load().then(function (data) {
    var key = CC.query('m') || CC.query('r');
    var rep = key && data.reports ? data.reports[key] : null;
    if (!rep) { fail('Reporte no encontrado.'); return; }
    document.title = rep.title;
    DATA = data;
    var html = rep.slides.map(function (s, i) { return section(s, rep, i, rep.slides.length); }).join('');
    // Antes de montar: deck-stage lee la preferencia del rail al inicializarse.
    railDefaultHidden();
    document.getElementById('deck').innerHTML = '<deck-stage width="1920" height="1080">' + html + '</deck-stage>';
    DeckChrome.init(document.querySelector('deck-stage'));
    if (rep.detail === 'month' && rep.detalle) {
      mountModal(monthModal(rep.screenLabel, rep.detalle));
    } else if (rep.detail === 'summary') {
      mountModal(summaryModal(data, rep.summaryNote, data.resumenes[key]));
    }
    mountControls(rep);
  }).catch(function (e) {
    fail('Error cargando los datos: ' + e.message);
  });
})();
