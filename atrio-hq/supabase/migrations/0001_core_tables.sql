-- HQ de Atrio :: tablas núcleo (todas en atrio_agenda)

create or replace function atrio_agenda.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists atrio_agenda.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  name text not null,
  role text,
  avatar_url text,
  accent_color text default '#2383E2',
  emoji text,
  created_at timestamptz default now()
);

create table if not exists atrio_agenda.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '📁',
  color text,
  client_name text,
  description text,
  archived boolean default false,
  sort_order double precision default 0,
  created_by uuid references atrio_agenda.profiles(id),
  created_at timestamptz default now()
);

create table if not exists atrio_agenda.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references atrio_agenda.projects(id) on delete cascade,
  name text not null,
  sort_order double precision default 0
);

create table if not exists atrio_agenda.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references atrio_agenda.projects(id) on delete cascade,
  section_id uuid references atrio_agenda.sections(id) on delete set null,
  parent_task_id uuid references atrio_agenda.tasks(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'none',
  assignee_id uuid references atrio_agenda.profiles(id),
  due_date date,
  start_date date,
  completed_at timestamptz,
  sort_order double precision default 0,
  created_by uuid references atrio_agenda.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists atrio_agenda.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#EFEFEF'
);
create table if not exists atrio_agenda.task_tags (
  task_id uuid references atrio_agenda.tasks(id) on delete cascade,
  tag_id uuid references atrio_agenda.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create table if not exists atrio_agenda.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '💬',
  kind text default 'channel',
  project_id uuid references atrio_agenda.projects(id) on delete set null,
  sort_order double precision default 0,
  created_at timestamptz default now()
);

create table if not exists atrio_agenda.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references atrio_agenda.channels(id) on delete cascade,
  parent_message_id uuid references atrio_agenda.messages(id) on delete cascade,
  author_id uuid references atrio_agenda.profiles(id),
  body text,
  content jsonb,
  pinned boolean default false,
  created_at timestamptz default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists atrio_agenda.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references atrio_agenda.messages(id) on delete cascade,
  profile_id uuid references atrio_agenda.profiles(id),
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, profile_id, emoji)
);

create table if not exists atrio_agenda.channel_reads (
  channel_id uuid references atrio_agenda.channels(id) on delete cascade,
  profile_id uuid references atrio_agenda.profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (channel_id, profile_id)
);

create table if not exists atrio_agenda.docs (
  id uuid primary key default gen_random_uuid(),
  parent_doc_id uuid references atrio_agenda.docs(id) on delete cascade,
  project_id uuid references atrio_agenda.projects(id) on delete set null,
  title text default 'Sin título',
  icon text default '📄',
  cover_url text,
  content jsonb,
  sort_order double precision default 0,
  created_by uuid references atrio_agenda.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists atrio_agenda.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  block_id text,
  author_id uuid references atrio_agenda.profiles(id),
  body text not null,
  created_at timestamptz default now()
);

create table if not exists atrio_agenda.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean default false,
  project_id uuid references atrio_agenda.projects(id) on delete set null,
  color text,
  created_by uuid references atrio_agenda.profiles(id)
);

create table if not exists atrio_agenda.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references atrio_agenda.profiles(id) on delete cascade,
  actor_id uuid references atrio_agenda.profiles(id),
  type text not null,
  title text,
  body text,
  target_type text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists atrio_agenda.activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references atrio_agenda.profiles(id),
  verb text not null,
  target_type text,
  target_id uuid,
  project_id uuid references atrio_agenda.projects(id) on delete set null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- índices
create index if not exists idx_tasks_project on atrio_agenda.tasks(project_id);
create index if not exists idx_tasks_assignee on atrio_agenda.tasks(assignee_id);
create index if not exists idx_tasks_due on atrio_agenda.tasks(due_date);
create index if not exists idx_tasks_parent on atrio_agenda.tasks(parent_task_id);
create index if not exists idx_tasks_section on atrio_agenda.tasks(section_id);
create index if not exists idx_sections_project on atrio_agenda.sections(project_id);
create index if not exists idx_messages_channel on atrio_agenda.messages(channel_id, created_at);
create index if not exists idx_messages_parent on atrio_agenda.messages(parent_message_id);
create index if not exists idx_reactions_message on atrio_agenda.reactions(message_id);
create index if not exists idx_docs_parent on atrio_agenda.docs(parent_doc_id);
create index if not exists idx_docs_project on atrio_agenda.docs(project_id);
create index if not exists idx_comments_target on atrio_agenda.comments(target_type, target_id);
create index if not exists idx_notifications_recipient on atrio_agenda.notifications(recipient_id, read_at);
create index if not exists idx_activity_project on atrio_agenda.activity(project_id, created_at);
create index if not exists idx_events_starts on atrio_agenda.events(starts_at);

-- triggers updated_at
drop trigger if exists trg_tasks_updated on atrio_agenda.tasks;
create trigger trg_tasks_updated before update on atrio_agenda.tasks
  for each row execute function atrio_agenda.set_updated_at();

drop trigger if exists trg_docs_updated on atrio_agenda.docs;
create trigger trg_docs_updated before update on atrio_agenda.docs
  for each row execute function atrio_agenda.set_updated_at();

grant all on all tables in schema atrio_agenda to anon, authenticated, service_role;
grant all on all sequences in schema atrio_agenda to anon, authenticated, service_role;
