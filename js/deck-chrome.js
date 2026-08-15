/* ============================================================
   Informes 2026 · Cáscara Collective — chrome del deck
   Dos cosas que comparten los reportes (report.js) y el
   instructivo (deck-mount.js), ambas alrededor del <deck-stage>:

   1. Banda de controles. Los botones eran position:fixed sobre el
      viewport y el slide ocupa todo el alto, así que pisaban el pie
      de página de cada slide. Acá se le reserva una banda propia:
      el deck se escala para ocupar el alto menos esa banda, y la
      barra queda integrada abajo en vez de flotando encima.
      Se hace por transform porque el _fit() de deck-stage escala
      con window.innerHeight — achicarle la caja no alcanza.

   2. Letterbox del color del slide. El slide es 16:9 fijo; lo que
      sobra se pinta del color del slide activo (en el host y en el
      body, que asoma a los costados al escalar) para que no se vea
      margen. Ver informe-2026.css.
   ============================================================ */
window.DeckChrome = (function () {
  function barHeight() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--deck-bar');
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function reserveBar(ds) {
    function fit() {
      var vh = window.innerHeight, bar = barHeight();
      var k = vh > bar ? (vh - bar) / vh : 1;
      ds.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    }
    fit();
    window.addEventListener('resize', fit);
    // En impresión cada slide es su propia página: sin banda ni escala.
    if (window.matchMedia) {
      var mq = window.matchMedia('print');
      var onPrint = function (e) { if (e.matches) ds.style.transform = ''; else fit(); };
      if (mq.addEventListener) mq.addEventListener('change', onPrint);
    }
    window.addEventListener('beforeprint', function () { ds.style.transform = ''; });
    window.addEventListener('afterprint', fit);
  }

  function bgOf(el) {
    if (!el) return '';
    var c = getComputedStyle(el).backgroundColor;
    return (!c || c === 'transparent' || /rgba\(0, 0, 0, 0\)/.test(c)) ? '' : c;
  }

  function syncLetterbox(ds) {
    function apply(slide) {
      if (!slide) return;
      // .frame lo pinta sólo en las variantes azul/tinta; el resto lo
      // hereda de la <section>.
      var bg = bgOf(slide.querySelector('.frame')) || bgOf(slide);
      if (!bg) return;
      ds.style.background = bg;
      document.body.style.background = bg;
    }
    ds.addEventListener('slidechange', function (e) { apply(e.detail.slide); });
    // El evento 'init' puede haber salido antes de enganchar el listener.
    apply(ds.querySelector('[data-deck-active]') || ds.querySelector('section'));
  }

  return {
    init: function (ds) {
      if (!ds) return;
      reserveBar(ds);
      syncLetterbox(ds);
    }
  };
})();
