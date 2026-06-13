# Informes Financieros 2026 · Cáscara Collective

Set de **reportes financieros internos** para los socios de Cáscara Collective (Enero–Mayo 2026).
Sitio estático, **data-driven**, sin build step — pensado para GitHub Pages.

> Uso interno entre socios. Español rioplatense. Moneda: dólares (`US$12.669`).
> Cada informe se lee con **dos números**: *el trabajo del mes* (lo facturado y sus costos) y
> *la caja* (lo que realmente entró y salió).

---

## Cómo verlo

Es un sitio estático. No tiene dependencias ni build. Como las páginas leen el JSON con `fetch()`,
necesitás servirlo por HTTP (no abrir el `.html` con `file://`):

```bash
cd financiero
python3 -m http.server 8080
# abrir http://localhost:8080
```

En producción se publica con **GitHub Pages** (rama `main`, carpeta raíz).

### Responsive
- **Desktop / tablet / teléfono en horizontal** (>700px): los reportes son **slides 16:9** (shell `deck-stage`).
- **Teléfono en vertical** (≤700px): los reportes se renderizan como una **vista vertical scrolleable** con tipografía adaptada (sin `deck-stage`; estilos en `css/mobile.css`). El home es responsive por sí mismo.

---

## Rutas

```
index.html                     → Home / hub (todas las vistas)
mes.html?m=enero … ?m=mayo     → Reporte mensual (slides)
resumen.html?r=q1              → Primer trimestre
resumen.html?r=cinco-meses     → Cinco meses (Ene–May)
instructivo.html               → Cómo leer las planillas
```

---

## Arquitectura (data-driven)

Todo el contenido vive en **`data/informes-2026.json`** — es la fuente única de verdad.
La UI son funciones de render *vanilla* (sin framework) que consumen ese JSON.

| Pieza | Qué hace |
|---|---|
| `data/informes-2026.json` | Números crudos (`months[]`, `resumenes`, `pulsoMensual`, `cursoB2CMensual`), el modelo declarativo de slides (`reports`) y el contenido del home (`home`). |
| `js/app.js` | Helpers compartidos (formato `US$`, carga del JSON). |
| `js/home.js` | Renderiza el home desde `home`. |
| `js/report.js` | Renderiza cada reporte (mensual / resumen) desde `reports[key].slides`, más el modal "Ver detalle". Un render por **tipo** de slide. |
| `js/deck-stage.js` | Shell de presentación 16:9: escalado fit-to-viewport, navegación (←/→, tap), rail de miniaturas, e impresión una-página-por-slide (PDF). |
| `informe-2026.css` | Estilos de composición del informe (medidas exactas). |
| `ds/tokens/*.css` | Design tokens de marca (colores, fuentes, tipografía, espaciados). |
| `ds/assets/fonts/*.otf` | Helvetica Neue LT Std + Redaction 10 Italic. |
| `assets/*.png` | Wordmarks y la marca del arquero. |
| `instructivo.html` | Didáctico, sin datos por mes → contenido estático fiel. |

### Tipos de slide (`reports[key].slides[].type`)

`cover` · `lecturas` · `barras` · `b2c` · `egresos` · `socios` · `proporciones` (donas) · `stats` · `chart` · `hero` · `cierre`

Cada uno mapea al markup exacto del diseño (clases en `informe-2026.css`).

---

## Sumar un mes (sin tocar código)

1. **Números**: agregá una entrada a `months[]` en `data/informes-2026.json` (con `ingresos[]`,
   `egresos[]` y totales) — alimenta el modal "Ver detalle" y la tabla del resumen.
2. **Slides**: agregá `reports["junio"]` con su array `slides` (los mismos tipos de arriba).
3. **Home**: agregá la card del mes en `home.sections` (y, si corresponde, sumá el trimestre/acumulado).

La card del home aparece sola, `mes.html?m=junio` funciona, y el reporte se renderiza — sin cambios de JS.

---

## Convenciones de copy (importante)

Glosario que reemplaza la jerga contable (ver `glosario` en el JSON):

| Usar | Significa |
|---|---|
| **El trabajo del mes** | Facturado por el trabajo del mes + sus costos (se haya cobrado o no). *¿El negocio da plata?* |
| **La caja** | La plata que realmente entró y salió. *¿Tenemos plata?* |
| **Resultado del trabajo** | facturado − costos |
| **Resultado de caja** | entró − salió |
| **Económico de cada socio** | Lo que generó su trabajo en los clientes del mes (no un retiro fijo). |
| **Cuenta personal (salvedad)** | Ajustes de 2025 ya saldados en cero — no son parte del negocio. |

Énfasis tipográfico: 1–3 palabras clave en *serif itálica* (Redaction). Sin emoji; la marca usa la ★.

---

Diseño y datos: Cáscara Collective · Planillas **Informes 2026** y **Gestión 2026**.
