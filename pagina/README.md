# Atrio · Panel de Leads Electrónica

Mini-página de gestión de la campaña de prospección (técnicos de celulares / tiendas de electrónica, CABA + Mar del Plata). Lee **en vivo** la tabla `atrio_leads_electro` de Supabase (proyecto Wepairr).

## Qué hace
- Buscador por texto + filtros (zona, sub-rubro, estado web, veredicto, producto, contactado).
- Tarjeta por lead: descripción, quién lo maneja (si es público), scores, veredicto + motivo, mensaje de WhatsApp sugerido.
- Un botón por canal: WhatsApp (con mensaje pre-cargado), Llamar, Mail, Instagram, Facebook, Web, Google Maps.
- Checkbox **Contactado** y campo **Notas** que persisten en Supabase en vivo (RLS: solo esas columnas son editables desde la web).
- Mobile-first.

## Deploy a Vercel
Sitio estático (un `index.html`). Opciones:
1. **Import en Vercel** (recomendado): New Project → importar `demianwolf122/Listas-clientes` → Root Directory = `pagina` → Deploy. Los `git push` siguientes redeployan solos.
2. **CLI**: `cd pagina && vercel --prod` (requiere `vercel login` o `VERCEL_TOKEN`).

La `SUPABASE_KEY` embebida es la *publishable* (anon) — segura de exponer: la protege el RLS.

## Archivos
- `index.html` — la página.
- `schema.sql` — DDL de las tablas + RLS.
- `LOG-AVANCE.md` — bitácora de los ciclos del autoloop.
