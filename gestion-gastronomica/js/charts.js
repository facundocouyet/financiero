/* ============================================================
   Gráficos SVG mínimos: barras verticales, apiladas, línea y barras
   horizontales. Un solo eje por gráfico, marcas finas, tooltip al pasar.
   Colores por rol (CSS): --s1, --s2 (serie), --seq (magnitud).
   ============================================================ */
(function (G) {
  var W = 640, H = 240, PAD = { t: 16, r: 12, b: 28, l: 64 };
  var tip;
  function tooltip() {
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'status'); document.body.appendChild(tip); }
    return tip;
  }
  function showTip(e, html) {
    var t = tooltip(); t.innerHTML = html; t.style.display = 'block';
    var x = e.clientX + 14, y = e.clientY + 14, w = t.offsetWidth, h = t.offsetHeight;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.style.display = 'none'; }

  function niceMax(v) {
    if (v <= 0) return 1;
    var e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  function grid(min, max, fmt) {
    var s = '', n = 4;
    for (var i = 0; i <= n; i++) {
      var v = min + (max - min) * i / n, y = PAD.t + (H - PAD.t - PAD.b) * (1 - i / n);
      s += '<line class="grid" x1="' + PAD.l + '" x2="' + (W - PAD.r) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text class="axis" x="' + (PAD.l - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    return s;
  }
  function svg(inner, label) {
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + G.esc(label) + '">' + inner + '</svg>';
  }
  // Barra con extremo de datos redondeado (4px) y base recta.
  function barPath(x, y, w, h, up) {
    var r = Math.min(4, w / 2, Math.abs(h));
    if (h <= 0) return '';
    if (up) return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
    return 'M' + x + ',' + y + 'V' + (y + h - r) + 'Q' + x + ',' + (y + h) + ' ' + (x + r) + ',' + (y + h) + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w) + ',' + (y + h - r) + 'V' + y + 'Z';
  }

  /* Barras verticales; series = [{key,label,color}] apiladas (1 serie = simple).
     datos = [{label, valores:{key:v}, tip}] */
  G.chartBarras = function (datos, series, opts) {
    opts = opts || {};
    var max = 0;
    datos.forEach(function (d) { var t = 0; series.forEach(function (s) { t += Math.max(0, d.valores[s.key] || 0); }); max = Math.max(max, t); });
    max = niceMax(max);
    var iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b, band = iw / datos.length, bw = Math.min(36, band * 0.62);
    var s = grid(0, max, opts.fmt || G.moneyShort);
    datos.forEach(function (d, i) {
      var x = PAD.l + band * i + (band - bw) / 2, base = PAD.t + ih;
      series.forEach(function (se, j) {
        var v = Math.max(0, d.valores[se.key] || 0), h = v / max * ih;
        if (h <= 0) return;
        var top = j === series.length - 1 || series.slice(j + 1).every(function (n) { return !(d.valores[n.key] > 0); });
        // 2px de superficie entre segmentos apilados
        var gap = j > 0 ? 2 : 0;
        s += top ? '<path class="mark" fill="var(' + se.color + ')" d="' + barPath(x, base - h, bw, h - gap, true) + '"/>'
          : '<rect class="mark" fill="var(' + se.color + ')" x="' + x + '" y="' + (base - h) + '" width="' + bw + '" height="' + Math.max(0, h - gap) + '"/>';
        base -= h;
      });
      s += '<text class="axis" x="' + (PAD.l + band * i + band / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + G.esc(d.label) + '</text>' +
        '<rect class="hit" x="' + (PAD.l + band * i) + '" y="' + PAD.t + '" width="' + band + '" height="' + ih + '" data-tip="' + G.esc(d.tip || '') + '"/>';
    });
    s += '<line class="base" x1="' + PAD.l + '" x2="' + (W - PAD.r) + '" y1="' + (PAD.t + ih) + '" y2="' + (PAD.t + ih) + '"/>';
    return svg(s, opts.label || '');
  };

  /* Línea de una serie (porcentajes). datos = [{label, v, tip}] */
  G.chartLinea = function (datos, opts) {
    opts = opts || {};
    var vals = datos.map(function (d) { return d.v; }).filter(isFinite);
    var lo = Math.min(0, Math.min.apply(null, vals.concat([0]))), hi = Math.max.apply(null, vals.concat([0.01]));
    var step = niceMax((hi - lo) / 4); hi = Math.ceil(hi / step) * step; lo = Math.floor(lo / step) * step;
    var iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b, band = iw / datos.length;
    function y(v) { return PAD.t + ih * (1 - (v - lo) / (hi - lo)); }
    var s = grid(lo, hi, function (v) { return G.pct(v, 0); }), pts = [];
    if (lo < 0) s += '<line class="zero" x1="' + PAD.l + '" x2="' + (W - PAD.r) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    datos.forEach(function (d, i) { if (isFinite(d.v)) pts.push([PAD.l + band * i + band / 2, y(d.v)]); });
    s += '<polyline class="line" stroke="var(' + (opts.color || '--s1') + ')" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>';
    pts.forEach(function (p) { s += '<circle class="dot" cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="var(' + (opts.color || '--s1') + ')"/>'; });
    datos.forEach(function (d, i) {
      s += '<text class="axis" x="' + (PAD.l + band * i + band / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + G.esc(d.label) + '</text>' +
        '<rect class="hit" x="' + (PAD.l + band * i) + '" y="' + PAD.t + '" width="' + band + '" height="' + ih + '" data-tip="' + G.esc(d.tip || '') + '"/>';
    });
    // Etiqueta directa sólo en el último punto
    var last = pts[pts.length - 1], dl = datos.filter(function (d) { return isFinite(d.v); }).pop();
    if (last) s += '<text class="dlabel" x="' + (last[0] - 6) + '" y="' + (last[1] - 10) + '" text-anchor="end">' + G.pct(dl.v) + '</text>';
    return svg(s, opts.label || '');
  };

  /* Barras horizontales (peso de cada rubro). filas = [{label, v, ref, tip}]
     `ref` = valor de comparación, dibujado como una marca fina. */
  G.chartHBarras = function (filas, opts) {
    opts = opts || {};
    var max = niceMax(Math.max.apply(null, filas.map(function (f) { return Math.max(f.v || 0, f.ref || 0); }).concat([0.01])));
    var rowH = 30, lw = 170, w = W, h = filas.length * rowH + 24, iw = w - lw - 70, s = '';
    filas.forEach(function (f, i) {
      var y = 8 + i * rowH, bw = Math.max(0, (f.v || 0) / max * iw);
      s += '<text class="axis lbl" x="' + (lw - 10) + '" y="' + (y + 16) + '" text-anchor="end">' + G.esc(f.label) + '</text>' +
        '<rect class="track" x="' + lw + '" y="' + (y + 6) + '" width="' + iw + '" height="14" rx="4"/>' +
        (bw > 0 ? '<path class="mark" fill="var(--seq)" d="M' + lw + ',' + (y + 6) + 'H' + (lw + bw - Math.min(4, bw)) + 'Q' + (lw + bw) + ',' + (y + 6) + ' ' + (lw + bw) + ',' + (y + 10) + 'V' + (y + 16) + 'Q' + (lw + bw) + ',' + (y + 20) + ' ' + (lw + bw - Math.min(4, bw)) + ',' + (y + 20) + 'H' + lw + 'Z"/>' : '') +
        (isFinite(f.ref) ? '<line class="refmark" x1="' + (lw + f.ref / max * iw) + '" x2="' + (lw + f.ref / max * iw) + '" y1="' + (y + 2) + '" y2="' + (y + 24) + '"/>' : '') +
        '<text class="dlabel" x="' + (lw + iw + 8) + '" y="' + (y + 18) + '">' + (opts.fmt || G.pct)(f.v) + '</text>' +
        '<rect class="hit" x="0" y="' + y + '" width="' + w + '" height="' + rowH + '" data-tip="' + G.esc(f.tip || '') + '"/>';
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + G.esc(opts.label || '') + '">' + s + '</svg>';
  };

  G.leyenda = function (series) {
    return '<div class="legend">' + series.map(function (s) {
      return '<span><i style="background:var(' + s.color + ')"></i>' + G.esc(s.label) + '</span>';
    }).join('') + '</div>';
  };

  // Tooltips por delegación (una vez)
  document.addEventListener('mousemove', function (e) {
    var t = e.target.closest && e.target.closest('.hit');
    if (t && t.getAttribute('data-tip')) showTip(e, t.getAttribute('data-tip')); else hideTip();
  });
  document.addEventListener('scroll', hideTip, true);
})(window.G);
