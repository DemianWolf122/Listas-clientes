#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Atrio Lead Hunter — cazador local, GRATIS (sin gastar creditos de Claude).

Ejecuta el "piso" determinista del metodo PROMPT-EJECUTABLE-v3.md:
  fuentes GRATIS  -> Overpass/OpenStreetMap (base) + DuckDuckGo (enriquecimiento)
  clasifica estado web, normaliza contacto, scorea (fit/momentum/final),
  decide TAKE/WAIT/SKIP/MANUAL, arma mensaje por plantilla (solo TAKE),
  y sube a Supabase via RPC con secreto (la web publica NO puede escribir).

Regla R1: VACIO > INVENTADO. Si no hay dato observado -> None. Nunca se inventa.

Uso:
  python hunter.py                 # todas las zonas con bbox
  python hunter.py --zona caba-once
  python hunter.py --no-ddg        # sin DuckDuckGo (mas rapido / sin rate-limit)
  python hunter.py --limit 40      # tope de candidatos por zona
"""
import sys, re, json, time, argparse, urllib.parse
import requests

try:  # consola Windows en UTF-8 para que se vean bien los acentos
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    from config import SUPABASE_URL, ANON_KEY, INSERT_SECRET
except Exception:
    print("FALTA config.py — copiá config.example.py a config.py y completá el secreto.")
    sys.exit(1)

# DuckDuckGo es opcional: si no esta instalado, seguimos solo con Overpass.
try:
    from ddgs import DDGS
except Exception:
    try:
        from duckduckgo_search import DDGS
    except Exception:
        DDGS = None

UA = {"User-Agent": "AtrioLeadHunter/1.0 (contacto: atriostudio.com.ar)"}

# ---------------------------------------------------------------- ZONAS (§3 del spec)
# bbox = (south, west, north, east)
ZONES = {
    "caba-once":   {"label": "Once/Balvanera", "city": "Ciudad Autónoma de Buenos Aires",
                    "province": "CABA", "bbox": (-34.615, -58.415, -34.598, -58.395)},
    "caba-full":   {"label": "CABA (resto)", "city": "Ciudad Autónoma de Buenos Aires",
                    "province": "CABA", "bbox": (-34.705, -58.531, -34.527, -58.335)},
    "mdp-full":    {"label": "Mar del Plata", "city": "Mar del Plata",
                    "province": "Buenos Aires", "bbox": (-38.075, -57.605, -37.915, -57.510)},
}
FAMILIES = ["celulares", "informatica", "electronica", "gamer_consolas", "electro_audio_seg"]

# ---------------------------------------------------------------- EXCLUSIONES (§2)
EXCLUDE = [
    "fravega", "frávega", "musimundo", "cetrogar", "naldo", "megatone", "garbarino",
    "on city", "authogar", "personal", "claro", "movistar", "tuenti", "macstation",
    "oneclick", "one click", "ipoint", "the movistar", "samsung store", "apple",
]
REPAIR_KW = re.compile(r"(reparaci|servicio\s*t[eé]cnic|service|arreglo|reparo|t[eé]cnic|"
                       r"fix|gsm|unlock|liberaci|clinica de cel|microelectr)", re.I)
VENTA_KW = re.compile(r"(venta|accesor|casa de|store|tienda|celular|telefon|import|tecno|insumo)", re.I)

# ---------------------------------------------------------------- OVERPASS (§4)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def overpass(bbox):
    s, w, n, e = bbox
    q = f"""
    [out:json][timeout:90];
    ( node["shop"~"mobile_phone|electronics|computer|hifi|appliance"]({s},{w},{n},{e});
      way ["shop"~"mobile_phone|electronics|computer|hifi|appliance"]({s},{w},{n},{e});
      node["craft"="electronics_repair"]({s},{w},{n},{e});
      way ["craft"="electronics_repair"]({s},{w},{n},{e});
      node["name"~"celular|servicio tecnico|electronica|informatica|notebook",i]({s},{w},{n},{e});
      way ["name"~"celular|servicio tecnico|electronica|informatica|notebook",i]({s},{w},{n},{e}); );
    out center tags;
    """
    for attempt in range(4):
        try:
            r = requests.post(OVERPASS_URL, data={"data": q}, headers=UA, timeout=120)
            if r.status_code == 200:
                return r.json().get("elements", [])
            if r.status_code in (429, 504):
                time.sleep(8 * (attempt + 1)); continue
            print(f"  overpass HTTP {r.status_code}")
            return []
        except Exception as ex:
            print(f"  overpass error: {ex}")
            time.sleep(5 * (attempt + 1))
    return []

# ---------------------------------------------------------------- DUCKDUCKGO (enriquecimiento)
def ddg(query, max_results=5):
    if DDGS is None:
        return []
    for attempt in range(3):
        try:
            with DDGS() as d:
                return list(d.text(query, region="ar-es", max_results=max_results))
        except Exception:
            time.sleep(4 * (attempt + 1))
    return []

def enrich(lead):
    """Busca IG/FB/web/telefono que falten, via DuckDuckGo. R1: solo lo que aparece."""
    if DDGS is None:
        return
    q = f'{lead["name"]} {lead["city"]} celulares OR electronica OR "servicio tecnico"'
    for res in ddg(q, 5):
        url = (res.get("href") or "").lower()
        body = (res.get("body") or "") + " " + (res.get("title") or "")
        if not lead.get("instagram") and "instagram.com/" in url:
            lead["instagram"] = res["href"].split("?")[0]; add_src(lead, "instagram")
        elif not lead.get("facebook") and "facebook.com/" in url:
            lead["facebook"] = res["href"].split("?")[0]; add_src(lead, "facebook")
        elif not lead.get("website") and not any(s in url for s in
             ("instagram.", "facebook.", "paginasamarillas", "argentino.com", "evisos",
              "mercadolibre", "guiapurpura", "cylex", "redargentina")):
            if url.startswith("http"):
                lead["website"] = res["href"].split("?")[0]; add_src(lead, "web")
        # telefono suelto en el snippet
        if not lead.get("phone"):
            m = re.search(r"(?:\+?54\s*)?(?:0?11|0?223|\(?\d{3,4}\)?)[\s\-]?\d{3,4}[\s\-]?\d{3,4}", body)
            if m and len(re.sub(r"\D", "", m.group())) >= 8:
                lead["phone"] = m.group().strip(); add_src(lead, "google")

# ---------------------------------------------------------------- ESTADO WEB (§6.1)
WIX_HOSTS = ("wixsite.com", "business.site", "wordpress.com", "blogspot.",
             "mercadoshops.com", "weebly.com", "sites.google.com", "godaddysites.com")
PARK_MARKERS = ("dominio en venta", "domain for sale", "coming soon", "próximamente",
                "en construcción", "under construction", "default web page",
                "apache2 default", "it works!", "parked", "plesk")

def classify_website(lead):
    site = lead.get("website")
    if not site:
        return "social_only" if (lead.get("instagram") or lead.get("facebook")) else "none"
    host = urllib.parse.urlparse(site if "://" in site else "http://" + site).netloc.lower()
    if any(h in host for h in WIX_HOSTS):
        return "wix_template"
    try:
        r = requests.get(site if "://" in site else "http://" + site,
                         headers=UA, timeout=8, allow_redirects=True)
        code, body = r.status_code, (r.text or "")
        low = body.lower()
        if code in (403, 429, 503):
            return "blocked_for_audit"
        if code >= 400:
            return "broken"
        if any(m in low for m in PARK_MARKERS):
            return "parking_or_suspended"
        text = re.sub(r"<[^>]+>", " ", body)
        if len(text.strip()) < 200:
            return "error_page_200"
        name_words = [w for w in re.findall(r"\w+", lead["name"].lower()) if len(w) > 3]
        lead["is_own_site"] = any(w in low for w in name_words)
        lead["has_agency"] = bool(re.search(r"(hecho por|dise[ñn]ado por|desarrollado por|"
                                            r"powered by|web by)", low))
        no_viewport = "viewport" not in low
        old_copy = bool(re.search(r"©?\s*(19\d\d|20(0\d|1\d|20|21))", low)) and \
                   not re.search(r"20(2[2-9]|3\d)", low)
        return "active_outdated" if (no_viewport or old_copy) else "active"
    except requests.exceptions.SSLError:
        return "blocked_for_audit"
    except Exception:
        return "broken"

# ---------------------------------------------------------------- CONTACTO (§6.3)
def norm_ar(raw):
    if not raw:
        return None
    d = re.sub(r"\D", "", raw)
    d = re.sub(r"^00", "", d)
    d = re.sub(r"^0", "", d)
    if not d.startswith("54"):
        d = "54" + d
    if len(d) >= 12 and not (d.startswith("549") or d.startswith("5411") or d.startswith("5408")):
        d = "549" + d[2:]
    if d.startswith("54") and 11 <= len(d) <= 13:
        return d
    return None

def add_src(lead, src):
    lead.setdefault("fuentes", [])
    if src not in lead["fuentes"]:
        lead["fuentes"].append(src)

# ---------------------------------------------------------------- CLASIFICACION RUBRO (§2)
def classify_rubro(name, tags):
    shop = tags.get("shop", "")
    craft = tags.get("craft", "")
    nm = name.lower()
    is_repair = bool(REPAIR_KW.search(nm)) or craft == "electronics_repair"
    is_venta = bool(VENTA_KW.search(nm))
    cel = ("celular" in nm or "phone" in nm or shop == "mobile_phone" or "telefon" in nm)

    if cel:
        if is_repair and is_venta:
            return "mixto_venta_reparacion", 1, "mixto_venta_y_reparacion"
        if is_repair:
            return "servicio_tecnico_celulares", 1, "taller_reparacion"
        return "venta_celulares_usados_liberados", 1, "tienda_venta"
    if shop == "computer" or "notebook" in nm or "computac" in nm or "informatic" in nm:
        return ("servicio_tecnico_pc_notebooks" if is_repair else
                "componentes_insumos_informatica"), 2, ("taller_reparacion" if is_repair else "tienda_venta")
    if shop == "hifi" or "audio" in nm:
        return "audio_hifi_caraudio", 3, "tienda_venta"
    if shop == "appliance" or "electrodomest" in nm or "lavarrop" in nm:
        return "reparacion_electrodomesticos_tv", 3, "taller_reparacion"
    if "gamer" in nm or "consola" in nm or "playstation" in nm or "xbox" in nm:
        return "tienda_gamer", 2, "tienda_venta"
    # electronics generico
    return ("casa_electronica_componentes", 2, "tienda_venta")

TIER_MULT = {1: 1.2, 2: 1.1, 3: 1.0}
PRODUCTO = {"taller_reparacion": "wepairr", "tienda_venta": "electrostock",
            "mixto_venta_y_reparacion": "suite"}

# ---------------------------------------------------------------- SCORING (§7)
BASE_BY_STATUS = {"none": 70, "social_only": 58, "broken": 50, "wix_template": 44,
                  "active_outdated": 40, "blocked_for_audit": 30, "error_page_200": 22,
                  "parking_or_suspended": 18, "active": 5}
TAKE_STATUS = {"none", "social_only", "broken", "wix_template", "active_outdated"}

def score(lead):
    st = lead["website_status"]
    b = BASE_BY_STATUS.get(st, 40)
    mult = TIER_MULT.get(lead["tier"], 1.0)
    s = b if b <= 40 else 40 + (b - 40) * mult
    s += (2 if lead.get("phone") else 0) + (2 if lead.get("address") else 0)
    s = min(s, 92)
    if st == "none" and not lead.get("phone") and not lead.get("email") and not lead.get("instagram"):
        s = 38 if lead.get("address") else 30
    fit = round(s)
    momentum = 50
    final = round((fit ** 0.6) * (momentum ** 0.4)) if fit and momentum else 0
    lead["fit_score"], lead["momentum_score"], lead["final_score"] = fit, momentum, final

# ---------------------------------------------------------------- VEREDICTO (§8)
def decide(lead):
    nm = lead["name"].lower()
    if any(x in nm for x in EXCLUDE):
        lead.update(verdict="SKIP", verdict_confidence=0.95,
                    verdict_reason="Cadena/oficial fuera del ICP (EXCLUDE_HARD).",
                    confianza_global="alta")
        return
    st = lead["website_status"]
    contactable = any(lead.get(k) for k in ("whatsapp", "phone", "instagram", "facebook"))
    if st == "active":
        lead.update(verdict="WAIT", verdict_confidence=0.72,
                    verdict_reason="Web propia moderna funcional; sin dolor web observable. "
                                   "Reevaluar solo ante señal de descontento.",
                    confianza_global="media")
        return
    if not contactable:
        lead.update(verdict="MANUAL_REVIEW", verdict_confidence=0.6,
                    verdict_reason="Rubro del ICP pero sin canal de contacto verificado (R1: no se inventa).",
                    confianza_global="baja")
        return
    if st in TAKE_STATUS:
        lead.update(verdict="TAKE", verdict_confidence=0.8,
                    verdict_reason=f"PyME del ICP ({lead['sub_rubro']}, T{lead['tier']}) con "
                                   f"presencia '{st}' y canal de contacto; encaja con {lead['producto_sugerido']}.",
                    confianza_global="media")
        return
    lead.update(verdict="MANUAL_REVIEW", verdict_confidence=0.62,
                verdict_reason=f"Caso a revisar: estado web '{st}'.", confianza_global="baja")

# ---------------------------------------------------------------- MENSAJE (§8.4) — solo TAKE
def gancho(lead):
    if lead.get("address"):
        return f"vi que tienen el local en {lead['address']}"
    if lead.get("instagram"):
        return "los encontré por Instagram"
    if lead.get("facebook"):
        return "vi su página de Facebook"
    return f"los encontré buscando {lead['sub_rubro'].replace('_', ' ')} en {lead['city']}"

def message(lead):
    if lead["verdict"] != "TAKE":
        return None
    g = gancho(lead); lead["gancho"] = g
    seg = lead["segmento"]
    if seg == "taller_reparacion":
        return (f"Hola! Soy Demian, de Atrio Studio. {g[0].upper()+g[1:]}. Tenemos un sistema donde "
                f"tus clientes ven online cómo va su reparación sin llamarte — ¿te muestro la demo? atriostudio.com.ar")
    if seg == "tienda_venta":
        return (f"Hola! Soy Demian, de Atrio Studio. {g[0].upper()+g[1:]}. Armamos catálogos con stock "
                f"en vivo donde el pedido te llega armado por WhatsApp — mirá el ejemplo: atriostock.vercel.app")
    if seg == "mixto_venta_y_reparacion":
        return (f"Hola! Soy Demian, de Atrio Studio. {g[0].upper()+g[1:]}. Tenemos catálogo con stock en vivo "
                f"y un sistema donde tus clientes siguen su reparación online — ¿te muestro las demos? atriostudio.com.ar")
    return (f"Hola! Soy Demian, de Atrio Studio. {g[0].upper()+g[1:]}. Trabajamos con {lead['sub_rubro'].replace('_',' ')} "
            f"— ¿te muestro un ejemplo del rubro? atriostudio.com.ar")

# ---------------------------------------------------------------- SUPABASE RPC
def rpc(action, payload):
    url = f"{SUPABASE_URL}/rest/v1/rpc/atrio_rpc"
    hdr = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}", "Content-Type": "application/json"}
    body = {"action": action, "p": payload, "p_secret": INSERT_SECRET}
    r = requests.post(url, headers=hdr, data=json.dumps(body), timeout=20)
    return r.status_code, r.text

def upsert(lead):
    payload = {k: lead.get(k) for k in (
        "name", "sub_rubro", "tier", "segmento", "address", "city", "province", "zona_barrio",
        "phone", "whatsapp", "wa_link", "email", "instagram", "facebook", "website", "website_status",
        "is_own_site", "has_agency", "descripcion", "manejado_por", "lifecycle",
        "fit_score", "momentum_score", "final_score", "verdict", "verdict_confidence",
        "verdict_reason", "producto_sugerido", "gancho", "mensaje_whatsapp", "confianza_global")}
    payload["senales"] = lead.get("senales", [])
    payload["fuentes"] = lead.get("fuentes", [])
    code, txt = rpc("insert_lead", payload)
    return code == 200

# ---------------------------------------------------------------- PIPELINE POR ZONA
def build_lead(el, zone, zinfo):
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("brand") or tags.get("operator")
    if not name:
        return None
    # franquicia pura: name==brand==operator
    if tags.get("name") and tags.get("brand") == tags.get("name") == tags.get("operator"):
        return None
    lead = {"name": name.strip(), "city": zinfo["city"], "province": zinfo["province"],
            "zona_barrio": zinfo["label"], "fuentes": ["openstreetmap"], "senales": [],
            "lifecycle": "active"}
    st = tags.get("addr:street"); hn = tags.get("addr:housenumber")
    if st:
        lead["address"] = (st + " " + hn).strip() if hn else st
    ph = tags.get("phone") or tags.get("contact:phone") or tags.get("contact:mobile")
    if ph:
        lead["phone"] = ph; add_src(lead, "openstreetmap")
    web = tags.get("website") or tags.get("contact:website")
    if web:
        lead["website"] = web
    ig = tags.get("contact:instagram")
    if ig:
        lead["instagram"] = ig if ig.startswith("http") else "https://instagram.com/" + ig.lstrip("@")
    fb = tags.get("contact:facebook")
    if fb:
        lead["facebook"] = fb if fb.startswith("http") else "https://facebook.com/" + fb
    em = tags.get("email") or tags.get("contact:email")
    if em:
        lead["email"] = em
    sub, tier, seg = classify_rubro(name, tags)
    lead.update(sub_rubro=sub, tier=tier, segmento=seg, producto_sugerido=PRODUCTO.get(seg, "electrostock"))
    lead["descripcion"] = f"{sub.replace('_', ' ').capitalize()} en {zinfo['label']} (fuente OpenStreetMap)."
    return lead

def hunt_zone(zona, use_ddg, limit):
    zinfo = ZONES[zona]
    print(f"\n== ZONA {zona} ({zinfo['label']}) ==")
    els = overpass(zinfo["bbox"])
    print(f"  Overpass: {len(els)} elementos crudos")
    seen, leads = set(), []
    for el in els:
        lead = build_lead(el, zona, zinfo)
        if not lead:
            continue
        key = re.sub(r"\s+", " ", lead["name"].lower()) + "|" + lead["city"].lower()
        if key in seen:
            continue
        seen.add(key)
        leads.append(lead)
        if len(leads) >= limit:
            break
    print(f"  candidatos unicos: {len(leads)}")

    counts = {"TAKE": 0, "WAIT": 0, "SKIP": 0, "MANUAL_REVIEW": 0, "inserted": 0}
    for i, lead in enumerate(leads, 1):
        if use_ddg and not (lead.get("instagram") or lead.get("website") or lead.get("phone")):
            enrich(lead)
        lead["website_status"] = classify_website(lead)
        if lead.get("phone"):
            wa = norm_ar(lead["phone"])
            if wa:
                lead["whatsapp"] = wa
                lead["wa_link"] = "https://wa.me/" + wa
        score(lead)
        decide(lead)
        lead["mensaje_whatsapp"] = message(lead)
        if upsert(lead):
            counts["inserted"] += 1
        counts[lead["verdict"]] = counts.get(lead["verdict"], 0) + 1
        print(f"  [{i}/{len(leads)}] {lead['name'][:38]:38} {lead['website_status']:16} "
              f"{lead['verdict']:13} final={lead['final_score']}")
        time.sleep(0.4)

    note = (f"OSM {len(els)} raw / {len(leads)} unicos. "
            f"TAKE {counts['TAKE']} WAIT {counts['WAIT']} SKIP {counts['SKIP']} "
            f"MANUAL {counts['MANUAL_REVIEW']}.")
    for fam in FAMILIES:
        rpc("set_coverage", {"zona": zona, "query_family": fam,
                             "status": "done", "leads_found": counts["inserted"], "notas": note})
    print(f"  -> insertados {counts['inserted']} | {note}")
    return counts

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zona", choices=list(ZONES.keys()))
    ap.add_argument("--no-ddg", action="store_true")
    ap.add_argument("--limit", type=int, default=80)
    a = ap.parse_args()
    zonas = [a.zona] if a.zona else list(ZONES.keys())
    total = {"TAKE": 0, "WAIT": 0, "SKIP": 0, "MANUAL_REVIEW": 0, "inserted": 0}
    for z in zonas:
        c = hunt_zone(z, use_ddg=not a.no_ddg, limit=a.limit)
        for k in total:
            total[k] += c.get(k, 0)
    print(f"\n=== TOTAL: insertados {total['inserted']} | TAKE {total['TAKE']} "
          f"WAIT {total['WAIT']} SKIP {total['SKIP']} MANUAL {total['MANUAL_REVIEW']} ===")

if __name__ == "__main__":
    main()
