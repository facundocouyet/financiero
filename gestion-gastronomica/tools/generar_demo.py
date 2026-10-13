"""Genera data/demo.json: 3 locales, ene–sep 2026, con errores sembrados en septiembre.
Uso: python3 tools/generar_demo.py
"""
import json, random, datetime as dt, os

random.seed(11)
HOY = dt.date(2026, 10, 13)
MESES = [f"2026-{m:02d}" for m in range(1, 10)]
TEMP = {1: 1.3, 2: 1.3, 3: 1.15, 4: .85, 5: .7, 6: .6, 7: .7, 8: .75, 9: .85}
SUC = {
    "palermo":  {"k": 1.0,  "cerrado": [],  "alquiler": 3_000_000, "may": True},
    "belgrano": {"k": .75,  "cerrado": [],  "alquiler": 2_400_000, "may": True},
    "centro":   {"k": .55,  "cerrado": [6], "alquiler": 1_800_000, "may": False},  # 6 = domingo (weekday())
}
EQUIPO = {
    "palermo":  [("Esteban", "sueldos_atencion", 720_000), ("Magalí", "sueldos_atencion", 770_000), ("Matías Hoyos", "sueldos_atencion", 860_000),
                 ("Solana", "sueldos_atencion", 720_000), ("Antonio", "sueldos_produccion", 620_000), ("Camila", "sueldos_produccion", 520_000),
                 ("Marcos Andreone", "sueldos_produccion", 1_880_000), ("Débora", "sueldos_limpieza", 420_000),
                 ("Agostina", "sueldos_admin", 600_000), ("Melina Vega", "sueldos_admin", 450_000)],
    "belgrano": [("Thiago", "sueldos_atencion", 970_000), ("Vanina", "sueldos_atencion", 800_000), ("Lucía", "sueldos_atencion", 690_000),
                 ("Catriel", "sueldos_produccion", 750_000), ("Tomás", "sueldos_produccion", 630_000), ("Ornella", "sueldos_limpieza", 240_000)],
    "centro":   [("Julián", "sueldos_atencion", 700_000), ("Brenda", "sueldos_atencion", 650_000), ("Ramiro", "sueldos_produccion", 780_000),
                 ("Noelia", "sueldos_limpieza", 360_000)],
}
# rubro, proveedor, % de ventas, facturas por mes, forma de pago, probabilidad
PROV = [
    ("lacteos", "La Serenísima", .08, 4, "cheque", 1), ("premezcla", "Alyser S.A.", .07, 2, "cheque", 1),
    ("almacen", "Makro", .015, 2, "banco", 1), ("cafeteria", "Segafredo Zanetti", .015, 1, "cheque", 1),
    ("congelados", "Lodiser S.A.", .012, 1, "cheque", 1), ("dietetica", "Dietética Central", .025, 1, "banco", 1),
    ("verduleria", "Verdulería Don José", .009, 4, "efectivo", 1), ("bebidas", "Distribuidora La Plata", .004, 1, "banco", 1),
    ("papeleria", "Librería Comercial", .003, 1, "efectivo", 1), ("huevos", "Granja Avícola", .002, 2, "efectivo", 1),
    ("liquidos", "Jugos del Valle", .003, 1, "banco", 1),
]
R = []
n = 0

def d(m, day):
    y, mm = map(int, m.split("-"))
    last = (dt.date(y + (mm == 12), mm % 12 + 1, 1) - dt.timedelta(days=1)).day
    return dt.date(y, mm, min(day, last))

def sig(m):
    y, mm = map(int, m.split("-"))
    return f"{y + (mm == 12)}-{mm % 12 + 1:02d}"

def add(suc, tipo, fecha, mes, rubro, monto, medio, pago, detalle="", **kw):
    global n
    n += 1
    if isinstance(fecha, dt.date) and fecha > HOY:
        fecha = HOY - dt.timedelta(days=3)
    if pago and pago > HOY and medio != "cheque":
        pago, medio = None, None
    emision = kw.pop("emision", None)
    if medio == "cheque" and emision and emision > HOY:
        pago, medio, emision = None, None, None
    r = {"id": f"D{n:05d}", "sucursal": suc, "tipo": tipo, "fecha": fecha.isoformat(), "mes": mes, "rubro": rubro,
         "detalle": detalle, "monto": round(monto, -2) if monto > 1000 else round(monto), "medio": medio,
         "fechaPago": pago.isoformat() if pago else None}
    if emision and medio == "cheque":
        r["emisionCheque"] = emision.isoformat()
    for k, v in kw.items():
        if v is not None:
            r[k] = v
    R.append(r)
    return r

def nro():
    return f"{random.randint(1, 12):04d}-{random.randint(1000, 99999999):08d}"

ventas_mes = {}
for suc, c in SUC.items():
    for m in MESES:
        t = TEMP[int(m[5:])] * c["k"]
        total = 0
        efectivo_sem = 0
        y, mm = map(int, m.split("-"))
        dia = dt.date(y, mm, 1)
        while dia.month == mm:
            if dia.weekday() in c["cerrado"] or (suc == "centro" and m == "2026-09" and dia.day in (8, 9)):
                dia += dt.timedelta(days=1); continue
            base = 1_650_000 * t * (1.4 if dia.weekday() >= 4 else 1) * random.uniform(.85, 1.15)
            for medio, p in (("efectivo", .2), ("mp", .3), ("banco", .45), ("usd", .05)):
                v = base * p * random.uniform(.8, 1.2)
                if medio == "usd" and random.random() < .6: continue
                if suc == "palermo" and m == "2026-09" and dia.day == 20 and medio == "banco":
                    v *= 10  # error sembrado: un cero de más
                add(suc, "venta", dia, m, "local", v, medio, dia, "Cierre de caja")
                total += v
                if medio == "efectivo": efectivo_sem += v
            if dia.weekday() == 6:  # domingo: delivery de la semana y depósito del efectivo
                dv = base * 7 * .15
                add(suc, "venta", dia, m, "delivery", dv, "banco", dia + dt.timedelta(days=10), "Apps de delivery")
                total += dv
            if dia.weekday() == 0 and efectivo_sem:
                add(suc, "transferencia", dia, None, None, efectivo_sem * .8, "efectivo", dia, "Depósito de efectivo", destino="banco")
                efectivo_sem = 0
            dia += dt.timedelta(days=1)
        if c["may"]:
            for dd, cli, v in ((5, "Café Martínez Norte", 6_000_000), (19, "Restó La Esquina", 4_000_000)):
                f = d(m, dd)
                add(suc, "venta", f, m, "mayorista", v * c["k"] * TEMP[int(m[5:])] * random.uniform(.9, 1.1), "banco", f + dt.timedelta(days=20), cli,
                    comprobante="A", nro=nro())
                total += v * c["k"] * TEMP[int(m[5:])]
        ventas_mes[(suc, m)] = total
        add(suc, "transferencia", d(m, 28), None, None, total * .3 * .6, "mp", d(m, 28), "Retiro de MercadoPago al banco", destino="banco")

for suc, c in SUC.items():
    k = c["k"]
    for i, m in enumerate(MESES):
        V = ventas_mes[(suc, m)]
        nm = sig(m)
        fecha_sig = lambda day: d(nm, min(day, 10) if m == "2026-09" else day)
        # proveedores
        for rubro, prov, p, cant, pago, prob in PROV:
            if random.random() > prob: continue
            for j in range(cant):
                f = d(m, 3 + j * (25 // cant) + random.randint(0, 2))
                v = V * p / cant * random.uniform(.85, 1.15)
                rb = rubro
                if suc == "belgrano" and m == "2026-09" and prov == "Segafredo Zanetti": rb = "papeleria"  # error sembrado
                if suc == "belgrano" and m == "2026-09" and prov == "Makro" and j == 0: v *= 10  # error sembrado
                comp = "ticket" if pago == "efectivo" and random.random() < .5 else "A"
                numero = nro() if comp == "A" else None
                if suc == "centro" and m == "2026-09" and prov == "Dietética Central": numero = None  # error sembrado
                if pago == "cheque":
                    em = f + dt.timedelta(days=3)
                    r = add(suc, "gasto", f, m, rb, v, "cheque", em + dt.timedelta(days=random.choice([30, 45, 60])), prov, comprobante=comp, nro=numero, emision=em)
                else:
                    r = add(suc, "gasto", f, m, rb, v, pago, f + dt.timedelta(days=0 if pago == "efectivo" else 7), prov, comprobante=comp, nro=numero)
                if suc == "palermo" and m == "2026-09" and prov == "La Serenísima" and j == 1:  # error sembrado: duplicado
                    dup = dict(r); n_ = len(R) + 1; dup["id"] = f"D{n_:05d}x"; R.append(dup)
        if (suc, i % 3) in (("palermo", 0), ("belgrano", 1), ("centro", 2)):
            f = d(m, 14); add(suc, "gasto", f, m, "prefabricados", V * .02, "cheque", f + dt.timedelta(days=33), "Pastelería Mayorista", comprobante="A", nro=nro(), emision=f + dt.timedelta(days=3))
        # sueldos
        tot_sueldos = 0
        for nombre, rubro, base in EQUIPO[suc]:
            if suc == "belgrano" and m == "2026-09" and nombre == "Lucía": continue  # faltante sembrado
            v = base * (1 + .03 * i) * random.uniform(.97, 1.03)
            add(suc, "gasto", d(m, 31), m, rubro, v, "banco" if random.random() < .8 else "efectivo", d(nm, 5), "Sueldo " + nombre, persona=nombre, comprobante="recibo")
            tot_sueldos += v
        if TEMP[int(m[5:])] >= 1.15:
            v = 450_000 * k; add(suc, "gasto", d(m, 31), m, "sueldos_eventuales", v, "efectivo", d(m, 31), "Sueldo Refuerzo verano", persona="Refuerzo verano", comprobante="recibo")
        if not (suc == "centro" and m == "2026-09"):  # faltante sembrado: F.931
            add(suc, "gasto", fecha_sig(10), m, "f931", tot_sueldos * .28, "banco", fecha_sig(10), "AFIP F.931", comprobante="recibo")
        add(suc, "gasto", fecha_sig(10), m, "sindicato", tot_sueldos * .03, "banco", fecha_sig(10), "UTHGRA", comprobante="recibo")
        add(suc, "gasto", fecha_sig(10), m, "art", tot_sueldos * .04, "banco", fecha_sig(10), "Provincia ART", comprobante="recibo")
        # edilicios y servicios
        f = d(m, 1); add(suc, "gasto", f, m, "alquiler", c["alquiler"], "banco", d(m, 5), "Alquiler local", comprobante="C", nro=nro())
        if suc == "palermo": add(suc, "gasto", d(m, 5), m, "expensas", 250_000, "efectivo", d(m, 5), "Consorcio Güemes 4400", comprobante="recibo")
        if not (suc == "palermo" and m == "2026-09"):  # faltante sembrado: la luz
            f = fecha_sig(9); add(suc, "gasto", f, m, "electricidad", 2_600_000 * k * (.6 + .4 * TEMP[int(m[5:])]) * random.uniform(.9, 1.1), "banco", f + dt.timedelta(days=4), "Edesur", comprobante="A", nro=nro())
        f = fecha_sig(8); add(suc, "gasto", f, m, "gas", 140_000 * k * random.uniform(.9, 1.3), "banco", f + dt.timedelta(days=2), "Metrogas", comprobante="A", nro=nro())
        if int(m[5:]) % 2 == 0: f = fecha_sig(6); add(suc, "gasto", f, m, "agua", 90_000 * k, "banco", f, "AySA", comprobante="A", nro=nro())
        mes_tel = "2025-09" if (suc == "palermo" and m == "2026-09") else m  # error sembrado: año equivocado
        add(suc, "gasto", d(m, 5), mes_tel, "internet", 65_000, "banco", d(m, 8), "Telecentro", comprobante="A", nro=nro())
        # operativos
        f = d(m, 12); em = f + dt.timedelta(days=2)
        add(suc, "gasto", f, m, "packaging", V * .025 * random.uniform(.9, 1.1), "cheque", em + dt.timedelta(days=30), "Textilizar Bolsas", comprobante="A", nro=nro(), emision=em)
        add(suc, "gasto", d(m, 18), m, "otros_operativos", 60_000 * (1 + .03 * i), "efectivo", d(m, 18), "Fumigaciones Sur", comprobante="B", nro=nro())
        if i in (1, 4, 7) or (suc == "palermo" and m == "2026-07"):
            f = d(m, 20)
            pend = suc == "palermo" and m == "2026-07"  # sembrado: pendiente viejo
            add(suc, "gasto", f, m, "mantenimiento", random.uniform(300_000, 1_500_000) * k, None if pend else "banco", None if pend else f + dt.timedelta(days=5), "Frío Service", comprobante="A", nro=nro())
        if i in (0, 6): add(suc, "gasto", d(m, 9), m, "otros_personal", 280_000 * k, "banco", d(m, 9), "Uniformes Gastronómicos", comprobante="A", nro=nro())
        # administrativos
        add(suc, "gasto", d(m, 2), m, "honorarios", (800_000 if suc == "palermo" else 400_000) * (1 + .03 * i), "banco", d(m, 6), "Estudio Contable Pérez", comprobante="C", nro=nro())
        add(suc, "gasto", d(m, 3), m, "seguros", 120_000 * (1 + .03 * i), "banco", d(m, 3), "La Segunda Seguros", comprobante="A", nro=nro())
        add(suc, "gasto", d(m, 31), m, "comisiones", V * .3 * .04, "mp", d(m, 31), "Comisiones MercadoPago", comprobante="A", nro=nro())
        add(suc, "gasto", d(m, 31), m, "comisiones", V * .45 * .025, "banco", d(m, 31), "Comisiones tarjetas", comprobante="A", nro=nro())
        # marketing
        add(suc, "gasto", d(m, 25), m, "publicidad", (300_000 if suc == "palermo" else 150_000) * (1 + .03 * i), "banco", d(m, 25), "Meta Ads", comprobante="A", nro=nro())
        if i in (0, 3, 8): add(suc, "gasto", d(m, 16), m, "grafica", 180_000 * k, "efectivo", d(m, 16), "Imprenta Rápida", comprobante="B", nro=nro())
        # impuestos
        add(suc, "gasto", fecha_sig(10), m, "iibb", V * .03, "banco", fecha_sig(10), "ARBA Ingresos Brutos", comprobante="recibo")
        add(suc, "gasto", fecha_sig(10), m, "iva", V * .045 * random.uniform(.8, 1.2), "banco", fecha_sig(10), "AFIP IVA", comprobante="recibo")
        add(suc, "gasto", d(m, 31), m, "ley25413", V * .006, "banco", d(m, 31), "Banco - imp. débitos y créditos", comprobante="recibo")
        add(suc, "gasto", fecha_sig(7), m, "tasas", V * .008, "banco", fecha_sig(7), "Municipalidad - Seguridad e Higiene", comprobante="recibo")
        # reinversión
        if suc == "palermo" and m == "2026-03":
            f = d(m, 10); add(suc, "gasto", f, m, "rei_produccion", 6_000_000, "cheque", f + dt.timedelta(days=60), "Máquina de helado Carpigiani", comprobante="A", nro=nro(), emision=f)
        if suc == "belgrano" and m == "2026-06":
            add(suc, "gasto", d(m, 15), m, "rei_mobiliario", 2_000_000, "banco", d(m, 15), "Mobiliario salón", comprobante="A", nro=nro())
        # retiros
        for socio in ("Socio A", "Socio B"):
            add(suc, "retiro", d(m, 28), m, None, 1_200_000 * k * TEMP[int(m[5:])], "banco", d(m, 28), socio)

R.sort(key=lambda r: (r["fecha"], r["sucursal"]))
out = os.path.join(os.path.dirname(__file__), "..", "data", "demo.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"generado": HOY.isoformat(), "nota": "Datos inventados para mostrar la app. Septiembre 2026 tiene errores sembrados a propósito.", "registros": R}, fh, ensure_ascii=False, separators=(",", ":"))
print(len(R), "registros")
