/* ============================================================
   Monta un deck estático (#deck con <section> hijos):
   - desktop/horizontal (>700px): los envuelve en <deck-stage> (slides).
   - mobile vertical (≤700px): los deja en flujo scrolleable (.m-report).
   Usado por el instructivo (contenido estático). Los reportes
   data-driven hacen lo mismo desde report.js.
   ============================================================ */
(function () {
  var deck = document.getElementById('deck');
  if (!deck) return;
  if (window.matchMedia('(max-width: 700px)').matches) {
    deck.className = 'm-report';
    document.body.classList.add('m-mode');
  } else {
    // Miniaturas ocultas por defecto (igual que los reportes); deck-stage
    // recuerda la preferencia, así que sólo fijamos el default la 1ª vez.
    try {
      if (localStorage.getItem('deck-stage.railVisible') === null) {
        localStorage.setItem('deck-stage.railVisible', '0');
      }
    } catch (e) {}
    var ds = document.createElement('deck-stage');
    ds.setAttribute('width', '1920');
    ds.setAttribute('height', '1080');
    while (deck.firstChild) ds.appendChild(deck.firstChild);
    deck.appendChild(ds);
    // Letterbox del color del slide activo (ver informe-2026.css / report.js):
    // el .frame lo pinta sólo en las variantes azul/tinta, si no lo hereda de
    // la <section>. Si ninguno pinta, queda el fallback del CSS.
    ds.addEventListener('slidechange', function (e) {
      var sl = e.detail.slide;
      if (!sl) return;
      var bg = '';
      [sl.querySelector('.frame'), sl].forEach(function (el) {
        if (bg || !el) return;
        var c = getComputedStyle(el).backgroundColor;
        if (c && c !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(c)) bg = c;
      });
      if (bg) ds.style.background = bg;
    });
    var s = document.createElement('script');
    s.src = 'js/deck-stage.js';
    document.body.appendChild(s);
  }
})();
