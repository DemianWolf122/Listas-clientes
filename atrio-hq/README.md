# 🏛️ HQ de Atrio

El **cuartel general** digital de Atrio Studio para exactamente dos personas
(Lucila y Demian). Combina lo mejor de **Asana** (tareas/proyectos con vistas
Lista · Tablero · Calendario), **Slack + Discord** (chat en tiempo real,
threads, reacciones, presencia rica) y **Notion** (docs por bloques, side-peek,
command palette) — todo interconectado y con estética calma tipo Notion.

Es una app **web** (desktop + mobile por browser), sin apps nativas.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS v3 con design tokens propios (CSS variables + dark mode) |
| Backend | Supabase (Postgres · Realtime · Auth) — schema aislado `atrio_agenda` |
| Estado servidor | TanStack Query v5 (cache + optimistic updates) |
| Estado UI | Zustand (sidebar, side-peek, command palette, identidad, prefs) |
| Editor docs | BlockNote (bloques estilo Notion, slash commands) |
| Drag & drop | dnd-kit (Kanban + reordenar) |
| Calendario | FullCalendar (mes/semana con drag para reprogramar) |
| Command palette | cmdk (⌘K) |
| Íconos / fuente | lucide-react · Inter (next/font) |

**Patrón de datos:** TanStack Query es la fuente primaria. `RealtimeProvider`
se suscribe a `postgres_changes` de `atrio_agenda` y, ante cada cambio, invalida
las queries afectadas. Presence + Broadcast (efímeros) manejan online/idle/dnd,
"qué está viendo el otro" y el typing indicator. **Nunca** se guardan datos de
servidor en Zustand.

---

## ⚠️ Coexistencia con wepairr (leer)

Esta app vive dentro del proyecto Supabase existente **"Wepairr"**
(`wjxekfxyxrfvmsfbqvsj`), pero **100% aislada** en un schema propio:

- Todo lo nuevo está en el schema **`atrio_agenda`**. **Nunca** se tocan las
  tablas de wepairr (`public`, 50 tablas) ni el otro app-schema del proyecto
  (`jardin`, 27 tablas, un Payload CMS).
- Las migraciones (`supabase/migrations/`) sólo hacen `create` / `grant` /
  `alter publication ... add` sobre objetos de `atrio_agenda`: son aditivas y no
  modifican nada existente.
- `pgrst.db_schemas` quedó seteado como **superconjunto** del default
  (`public, graphql_public, atrio_agenda`), así que wepairr conserva todo su
  acceso.

### Exponer el schema en la API (paso único)

Para que `supabase-js` pueda consultar `atrio_agenda` por REST, el schema tiene
que estar en **Exposed schemas**. Ya se aplicó vía SQL
(`supabase/migrations/0005_expose_schema.sql`), pero si alguna vez las queries
devuelven **406** (`The schema must be one of the following…`), verificá en el
dashboard: **Project Settings → API → Exposed schemas** y agregá `atrio_agenda`.
La app además muestra un cartel de ayuda en el selector de usuario si detecta
este caso.

---

## Modelo de identidad y auth (decisión)

Es una app interna de **dos personas de confianza** donde **todo es
compartido**, así que se optó por lo simple y robusto (no un SaaS multi-tenant):

- **Identidad = UX**, no login por usuario: la pantalla "¿Quién sos?" elige
  perfil (Lucila / Demian) y se guarda en `localStorage` (Zustand). "Cambiar de
  persona" lo resetea.
- **RLS activo en todas las tablas** de `atrio_agenda` con policies permisivas
  para `anon`/`authenticated` (defensa en profundidad; el advisor las marca como
  "always true" a propósito).
- **Gate opcional por passcode** (`ATRIO_PASSCODE`): un middleware cierra la
  puerta de toda la app con una clave compartida. Si la variable queda vacía, la
  app queda abierta (cómodo en dev). En producción conviene setearla.

Se eligió esto sobre cuentas de Supabase Auth por-usuario porque para 2 personas
agrega fricción (gestión de credenciales) sin beneficio real, y el prompt lo
habilita explícitamente. Migrar a Supabase Auth más adelante es directo: el
selector de identidad seguiría siendo la UX principal.

---

## Correr en local

```bash
cd atrio-hq
cp .env.local.example .env.local   # completá las claves (ver abajo)
npm install
npm run dev                        # http://localhost:3000
```

### Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://wjxekfxyxrfvmsfbqvsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon o publishable key>   # Project Settings → API
ATRIO_PASSCODE=                                          # opcional; vacío = app abierta
```

La `service_role` key **nunca** va al cliente ni con prefijo `NEXT_PUBLIC_`.

---

## Base de datos

- **Migraciones:** `supabase/migrations/*.sql` (schema, grants, RLS, realtime,
  hardening, exposición). Ya aplicadas al proyecto vía el conector MCP.
- **Seed:** `supabase/seed.sql` (idempotente) — perfiles, tags, 2 proyectos con
  secciones/tareas, canales, mensajes, eventos y un doc de bienvenida.
- **Tipos:** `src/lib/types/database.ts` se mantiene a mano y **solo** describe
  `atrio_agenda`, para no arrastrar el esquema de wepairr al repo.

---

## Deploy en Vercel

1. Root del proyecto de Vercel = `atrio-hq/`.
2. Seteá las env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   y opcional `ATRIO_PASSCODE`) en Production/Preview/Development.
3. Deploy. Recordá que las `NEXT_PUBLIC_*` se bundlean en build → si las cambiás,
   redeploy.

> Nota de dependencias: `prosemirror-view` está fijado a `1.33.10` (override) por
> compatibilidad con BlockNote 0.22; `@supabase/supabase-js` a `2.45.4` por
> compatibilidad de tipos con `@supabase/ssr` 0.5.2.

---

## Mapa del código

```
src/
  app/
    (app)/            # shell autenticado: home, mis-tareas, proyectos, chat, docs, calendario
    gate/             # pantalla de passcode
    providers.tsx     # QueryClient + Realtime + Presence + theme + toaster
  components/
    shell/            # Sidebar, Topbar, UserChip, DocTree, NotificationsBell, AppShell
    tasks/            # Board (kanban), TaskListView, StatusBoard, TaskDetail, controls, side-peek
    chat/             # ChatView, MessageItem, formatText, NewChannelDialog
    docs/             # DocEditor (BlockNote)
    calendar/         # CalendarView (FullCalendar), EventDialog
    command/          # CommandPalette (cmdk)
    providers/        # RealtimeProvider, PresenceProvider
    ui/               # kit base (Button, Modal, SidePeek, Popover, Avatar, …)
  hooks/              # TanStack Query por dominio (tasks, chat, docs, events, …)
  lib/                # supabase clients, tipos, utils, sonido, confetti, gate
  stores/             # Zustand (identity, ui, prefs)
```
