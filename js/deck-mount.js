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
    var ds = document.createElement('deck-stage');
    ds.setAttribute('width', '1920');
    ds.setAttribute('height', '1080');
    while (deck.firstChild) ds.appendChild(deck.firstChild);
    deck.appendChild(ds);
    var s = document.createElement('script');
    s.src = 'js/deck-stage.js';
    document.body.appendChild(s);
  }
})();
