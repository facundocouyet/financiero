# Gestión gastronómica

App web para que las sucursales de gastronomía **carguen sus facturas, ventas y sueldos** y obtengan
el **informe económico** (¿el local da plata?) y el **financiero** (¿tenemos plata?), con
**revisión automática de errores y faltantes**.

La estructura de los informes sigue el formato de balance mensual que se usaba con la consultora:
tablero, económico mensual en cascada, acumulado por trimestre, financiero por caja, sueldos por
persona y cheques.

Sitio estático (HTML + JS sin dependencias, sin build). Se publica con GitHub Pages.

## Qué hace

| Sección | Para qué |
|---|---|
| **Cargar** | Carga guiada paso a paso: ventas del día (cierre de caja), facturas y gastos, sueldos del mes, pagos de pendientes, retiros y pases entre cajas. Cada paso explica qué va y por qué. Antes de guardar muestra un resumen en palabras y avisa si algo parece mal. |
| **Revisión** | Revisa el mes y lista **errores** (duplicados, mes o año equivocado, fechas futuras, datos incompletos), **faltantes** (gastos que aparecen todos los meses y este no, sueldos de alguien que cobró el mes pasado, F.931, días sin cierre de caja) y cosas **para revisar** (montos fuera de lo habitual, rubro distinto al de siempre, pendientes viejos). Cada hallazgo tiene un botón para corregir o cargar lo que falta, o para marcarlo como correcto. |
| **Tablero** | Ventas, peso de proveedores, rentabilidad, deuda y estado de la carga. Una lectura del mes escrita en criollo y gráficos de 12 meses. |
| **Económico mensual** | Estado de resultados en cascada (Ventas → … → Resultado de la operación → antes de impuestos → luego de impuestos → luego de reinversión → retiros) contra el mes anterior, con % sobre ventas y semáforo. |
| **Acumulado** | Lo mismo por trimestre y acumulado del año. |
| **Financiero** | Saldo inicial, entradas, salidas y saldo final de cada caja (efectivo, dólares, MercadoPago, banco), y la conciliación económico vs financiero. |
| **Sueldos / Cheques / Locales** | Sueldos por persona y área, cheques emitidos y por vencer, y rentabilidad comparada entre sucursales. |
| **Registros** | Todo lo cargado, con buscador, filtros y marcas en lo que tiene observaciones. Exporta a CSV. |

Todos los informes se pueden imprimir o guardar como PDF (botón **Imprimir / PDF**).

## Cómo verlo en tu compu

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

(Hace falta un servidor porque la app lee los JSON con `fetch`; abriendo el `index.html` directo no anda.)

## Datos de ejemplo

`data/demo.json` trae datos **inventados** de 3 locales (enero–septiembre 2026). Septiembre tiene
errores sembrados a propósito para ver la revisión en acción: una factura duplicada, un monto con un
cero de más, una factura con el año mal, la luz que falta, un sueldo que falta, el F.931 que falta,
dos días sin cierre de caja, un proveedor en el rubro equivocado, etc.

Para regenerarlos: `python3 tools/generar_demo.py`.

Mientras `apiUrl` esté vacío, lo que cargues se guarda **sólo en ese navegador** (botón *reiniciar
ejemplo* al pie para volver al demo).

## Datos reales: planilla compartida

Para que todas las sucursales carguen en el mismo lugar:

1. Publicá `apps-script/Code.gs` como aplicación web (instrucciones adentro del archivo).
2. Pegá la URL `/exec` en `apiUrl` de `data/config.json`.

> **Ojo:** la URL del Apps Script no tiene usuario ni contraseña: quien la tenga puede ver y cargar
> datos. Si el repo es público, **no subas la URL al repo**: o hacés el repo privado y usás otro
> hosting, o pasamos a una base con login (Supabase u otra) — es el siguiente paso recomendado
> antes de usarlo con números reales.

## Configuración (`data/config.json`)

- `sucursales`: locales y días que cierran (`diasCerrado`: 0 = domingo … 6 = sábado).
- `cajas` y `saldosIniciales`: con cuánto arranca cada caja.
- `ventas`, `grupos`, `gruposDebajo`: los rubros del estado de resultados. Cada rubro tiene una
  `ayuda` (lo que ve quien carga), `recurrente` (se espera todos los meses) y `persona` (sueldos).
- `moneda`, `medios`, `comprobantes`.

Cambiar rubros no requiere tocar código.

## Estructura

```
index.html            armazón
css/app.css           estilos (claro/oscuro, impresión)
js/core.js            datos, formato y cálculo (económico, financiero, deuda)
js/checks.js          revisión: errores y faltantes
js/charts.js          gráficos SVG
js/informes.js        tablero e informes
js/carga.js           carga guiada, registros, pagos
js/revision.js        revisión y guía de uso
js/app.js             navegación y eventos
apps-script/Code.gs   backend opcional en Google Sheets
tools/generar_demo.py genera los datos de ejemplo
```
