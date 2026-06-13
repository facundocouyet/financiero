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
      return '<div class="bm"><div class="bm__v num">' + b.v + '</div>' +
        '<div class="bm__pair"><div class="b-fact" style="height:' + b.factH + 'px;"></div><div class="b-cob" style="height:' + b.cobH + 'px;"></div></div></div>';
    }).join('');
    var caps = f.bars.map(function (b) { return '<div class="bm__m">' + b.m + '</div>'; }).join('');
    // Lista compacta de montos facturados — sólo visible en teléfono,
    // donde las etiquetas sobre cada barra no entran (ver index.html).
    var vlist = f.bars.map(function (b) {
      return '<div class="bml__row"><span class="bml__m">' + b.m + '</span><span class="bml__v num">' + b.v + '</span></div>';
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
          '<div class="bml"><div class="bml__h">Facturado por mes</div>' + vlist + '</div>' +
          '<div class="chartcard__foot">' + f.foot + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  CC.load().then(function (data) {
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
      (h.dash ? dash(h.dash) : '') + sections +
      '<footer>' + h.footer + '</footer>';
  }).catch(function (e) {
    document.getElementById('home').innerHTML = '<p style="color:#54545B;">Error cargando los datos: ' + e.message + '</p>';
  });
})();
