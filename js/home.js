/* ============================================================
   Informes 2026 · Cáscara Collective — render del home / hub
   Data-driven desde data/informes-2026.json → home.
   Sumar un mes = agregar su card a home.sections + su entrada en reports.
   ============================================================ */
(function () {
  function card(c) {
    if (c.kind === 'instructivo') {
      return '<a class="card" href="' + c.href + '" style="border-style:solid;">' +
        '<div class="card__no">' + c.no + '</div>' +
        '<div class="card__month">' + c.month + '</div>' +
        '<p class="card__head" style="margin-top:14px;">' + c.head + '</p>' +
        '<span class="arrow">→</span>' +
      '</a>';
    }
    if (c.kind === 'soon') {
      return '<div class="card soon">' +
        '<div class="card__no">' + c.no + '</div>' +
        '<div class="card__month">' + c.month + '</div>' +
        '<p class="card__head">' + c.head + '</p>' +
        '<span class="soon__tag">En curso</span>' +
      '</div>';
    }
    var variant = c.variant ? ' ' + c.variant : '';
    var noStyle = c.noStyle ? ' style="' + c.noStyle + '"' : '';
    var metrics = (c.metrics || []).map(function (m) {
      return '<div><span>' + m.label + '</span><b class="' + m.cls + '">' + m.value + '</b></div>';
    }).join('');
    return '<a class="card' + variant + '" href="' + c.href + '">' +
      '<div class="card__no"' + noStyle + '>' + c.no + '</div>' +
      '<div class="card__month">' + c.month + '</div>' +
      '<p class="card__head">' + c.head + '</p>' +
      '<div class="card__res">' + metrics + '<div class="arrow">→</div></div>' +
    '</a>';
  }

  // Link a la planilla de Gestión 2026 (solapa "Financiero", gid=238000038).
  var PLANILLA_URL = 'https://docs.google.com/spreadsheets/d/1mrjVnVZJAbKMCMvUq7a6_RkJgDqWMyZav8emkdbdoC8/edit?gid=238000038#gid=238000038';

  // ISO "2026-06-12" → "12 jun 2026" (formato de la franja).
  function fmtFecha(iso) {
    var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return iso || '';
    return Number(m[3]) + ' ' + meses[Number(m[2]) - 1] + ' ' + m[1];
  }

  // ISO UTC "2026-06-15T00:24:34Z" → "14 jun 2026, 21:24 hs" (hora Argentina, UTC−3).
  function fmtSync(iso) {
    var t = Date.parse(iso || '');
    if (isNaN(t)) return '';
    var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    var d = new Date(t - 3 * 3600 * 1000); // Argentina no tiene horario de verano
    var hh = ('0' + d.getUTCHours()).slice(-2);
    var mm = ('0' + d.getUTCMinutes()).slice(-2);
    return d.getUTCDate() + ' ' + meses[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ', ' + hh + ':' + mm + ' hs';
  }

  // Franja "Caja a hoy": dato diario y en vivo, separado de los históricos.
  // Se nutre de data/cash.json (cash, moneda, fecha) — lo que actualiza a diario
  // la automatización (apps-script-cash.gs → col G "Financiero" de Gestión 2026).
  function live(c) {
    return '<div class="live">' +
      '<div class="live__main">' +
        '<div class="live__kick"><span class="live__dot"></span>Actualización diaria · Libro Diario · Gestión 2026</div>' +
        '<div class="live__l">La caja que tenemos hoy</div>' +
        '<div class="live__v num">' + CC.money(c.cash) + '</div>' +
        '<div class="live__upd">Saldo al <b>' + fmtFecha(c.fecha) + '</b> &nbsp;·&nbsp; leído <span class="em">en vivo</span> del Libro Diario de la planilla de Gestión 2026.</div>' +
        (c.actualizado ? '<div class="live__sync">Automatización · última sincronización: <b>' + fmtSync(c.actualizado) + '</b></div>' : '') +
      '</div>' +
      '<div class="live__cta">' +
        '<a class="live__btn" href="' + PLANILLA_URL + '" target="_blank" rel="noopener">Abrir planilla de Gestión <span class="ar">→</span></a>' +
        '<div class="live__hint">El detalle completo del día a día, en la planilla.</div>' +
      '</div>' +
    '</div>';
  }

  // Caja en vivo: si no se puede leer (o no trae cash), el home se renderiza sin la franja.
  function loadCash() {
    return fetch('data/cash.json?v=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && d.cash != null ? d : null; })
      .catch(function () { return null; });
  }

  function donutBlock(d) {
    var legend = d.legend.map(function (l) {
      return '<div class="lg"><span class="dot" style="background:' + l.dot + ';"></span>' +
        '<span class="nm">' + l.nm + '<br><span class="amt">' + l.amt + '</span></span>' +
        '<span class="pc">' + l.pc + '</span></div>';
    }).join('');
    return '<div class="dblock">' +
      '<div class="chartcard__t">' + d.t + '</div>' +
      '<div class="chartcard__sub">' + d.sub + '</div>' +
      '<div class="donutwrap">' +
        '<div class="donut" style="background:' + d.donut + ';"><div class="donut__c"><b class="num">' + d.centerBig + '</b><span>' + d.centerLabel + '</span></div></div>' +
        '<div class="legend2">' + legend + '</div>' +
      '</div>' +
    '</div>';
  }

  function dash(dd) {
    var kpis = dd.kpis.map(function (k) {
      return '<div class="kpi' + (k.key ? ' key' : '') + '"><div class="kpi__l">' + k.l + '</div>' +
        '<div class="kpi__v num">' + k.v + '</div><div class="kpi__s">' + k.s + '</div></div>';
    }).join('');
    var f = dd.facturacion;
    var bars = f.bars.map(function (b) {
      return '<div class="bm">' +
        '<div class="bm__vals">' +
          '<span class="bm__val bm__val--f num">' + b.v + '</span>' +
          '<span class="bm__val bm__val--c num">' + b.vCob + '</span>' +
        '</div>' +
        '<div class="bm__pair"><div class="b-fact" style="height:' + b.factH + 'px;"></div><div class="b-cob" style="height:' + b.cobH + 'px;"></div></div></div>';
    }).join('');
    var caps = f.bars.map(function (b) { return '<div class="bm__m">' + b.m + '</div>'; }).join('');
    // Lista compacta — sólo visible en teléfono, donde las etiquetas sobre cada
    // barra no entran (ver index.html). Muestra facturado y cobrado por mes.
    var vlist = f.bars.map(function (b) {
      return '<div class="bml__row"><span class="bml__m">' + b.m + '</span>' +
        '<span class="bml__vals"><span class="bml__v bml__v--f num">' + b.v + '</span>' +
        '<span class="bml__v bml__v--c num">' + b.vCob + '</span></span></div>';
    }).join('');
    return '<div class="dash">' +
      '<div class="kpis">' + kpis + '</div>' +
      (dd.dashNote ? '<p class="dashnote">' + dd.dashNote + '</p>' : '') +
      '<div class="charts">' +
        '<div class="chartcard"><div class="twodonuts">' + dd.donuts.map(donutBlock).join('') + '</div></div>' +
        '<div class="chartcard full">' +
          '<div class="chartcard__t">' + f.t + '</div>' +
          '<div class="chartcard__sub">' + f.sub + '</div>' +
          '<div class="legend-row"><span><i class="sw-fact"></i>Facturado</span><span><i class="sw-cob"></i>Cobrado</span></div>' +
          '<div class="barsmini">' + bars + '</div>' +
          '<div class="bm__cap">' + caps + '</div>' +
          '<div class="bml"><div class="bml__h">Facturado y cobrado, por mes</div>' + vlist + '</div>' +
          '<div class="chartcard__foot">' + f.foot + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  Promise.all([CC.load(), loadCash()]).then(function (res) {
    var data = res[0], caja = res[1];
    var h = data.home;
    document.title = h.title;

    var sections = h.sections.map(function (sec) {
      return '<div class="section-label">' + sec.label + '</div>' +
        '<div class="grid">' + sec.cards.map(card).join('') + '</div>';
    }).join('');

    document.getElementById('home').innerHTML =
      '<header>' +
        '<div><div class="kicker">' + h.kicker + '</div><h1>' + h.h1 + '</h1></div>' +
        '<img src="assets/wordmark-stacked-blue.png" alt="Cáscara Collective">' +
      '</header>' +
      '<p class="lede">' + h.lede + '</p>' +
      (caja ? live(caja) : '') +
      (h.dash ? dash(h.dash) : '') + sections +
      '<footer>' + h.footer + '</footer>';
  }).catch(function (e) {
    document.getElementById('home').innerHTML = '<p style="color:#54545B;">Error cargando los datos: ' + e.message + '</p>';
  });
})();
