# Atrio Lead Hunter — cazador local GRATIS 🪤

Script en Python que caza leads de electrónica / servicio técnico (CABA + Mar del Plata) **sin gastar créditos de Claude**. Usa fuentes gratis (OpenStreetMap/Overpass + DuckDuckGo), aplica el método determinista del spec (`../PROMPT-EJECUTABLE-v3.md`) y sube todo a Supabase. Los leads aparecen en vivo en https://atrio-leads-electro.vercel.app

## Cómo funciona el reparto de trabajo (la clave del ahorro)
- **El script (gratis, 90% del laburo):** busca, detecta estado web, scorea, decide TAKE/WAIT/SKIP, arma mensaje por plantilla y sube a Supabase.
- **Claude (barato, 10%):** cuando quieras, en una sesión corta, afina SOLO los mejores (TAKE) — ganchos y mensajes a medida, corregir mal clasificados. Como lee pocas filas ya listas (no busca), gasta poquísimo.

## Instalación (una sola vez)
```
cd leadhunter
copy config.example.py config.py     REM y pegá el INSERT_SECRET en config.py
python -m pip install -r requirements.txt
```
> `config.py` tiene el secreto de escritura y **no se sube al repo** (está en `.gitignore`). La web pública NO puede escribir en la base; solo este script con el secreto.

## Uso
```
python hunter.py                    # todas las zonas con bbox (Once, CABA, MDP)
python hunter.py --zona caba-once   # una zona
python hunter.py --no-ddg           # sin DuckDuckGo (más rápido, sin rate-limit)
python hunter.py --limit 120        # tope de candidatos por zona
```
Los duplicados los maneja la base (dedup por nombre+ciudad), así que podés correrlo cuantas veces quieras.

## Que corra solo (Programador de tareas de Windows)
1. Abrí **Programador de tareas** → *Crear tarea básica*.
2. Nombre: `Atrio Lead Hunter`. Desencadenador: **Diariamente** (ej. 02:00) o cada X horas.
3. Acción: **Iniciar un programa** → Programa: `run.bat` (ruta completa a este archivo).
4. Listo. Corre solo, gratis, y va llenando la base.

## Fuentes y reglas
- **Overpass/OSM** (gratis, sin key): base de locales reales con nombre y dirección.
- **DuckDuckGo** (gratis, sin key): enriquece IG/FB/web/teléfono que falten.
- **R1 vacío > inventado:** ningún dato se inventa; sin fuente observada → vacío.
- Excluye cadenas y oficiales (Frávega, Musimundo, Personal, Claro, MacStation, etc.).

## Limitaciones honestas
- No navega Instagram/Maps directo (dan 403), así que el WhatsApp a veces queda vacío → esos van MANUAL_REVIEW hasta confirmarlos a mano.
- Los mensajes son por plantilla (buenos pero genéricos) hasta que Claude los afine.
- El scoring es el "piso" del método; la capa creativa (§0.5) la aporta Claude en el repaso.
