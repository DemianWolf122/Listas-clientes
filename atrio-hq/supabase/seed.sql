-- Seed idempotente (solo corre si no hay perfiles). Lucila + Demian, tags,
-- 2 proyectos con secciones y tareas, canales, mensajes, eventos y docs.
do $$
declare
  luci uuid; demi uuid;
  p_atrio uuid; p_cliente uuid;
  s_todo uuid; s_doing uuid; s_done uuid;
  ch_general uuid; ch_dm uuid; ch_proj uuid;
  t_tag1 uuid; t_tag3 uuid; tk uuid;
begin
  if exists (select 1 from atrio_agenda.profiles) then return; end if;

  insert into atrio_agenda.profiles (name, role, accent_color, emoji)
    values ('Lucila','Diseño Gráfico','#E5624F','🎨') returning id into luci;
  insert into atrio_agenda.profiles (name, role, accent_color, emoji)
    values ('Demian','Dirección / Dev','#2383E2','⚡') returning id into demi;

  insert into atrio_agenda.tags (name,color) values ('Diseño','#F3D9E0') returning id into t_tag1;
  insert into atrio_agenda.tags (name,color) values ('Dev','#D7E5F5');
  insert into atrio_agenda.tags (name,color) values ('Urgente','#F6D6CE') returning id into t_tag3;
  insert into atrio_agenda.tags (name,color) values ('Cliente','#DEEEDD'), ('Idea','#EFE7D2');

  insert into atrio_agenda.projects (name,emoji,color,client_name,description,sort_order,created_by)
    values ('Atrio Studio','🏛️','#2383E2','Interno','El HQ del estudio.',0,demi) returning id into p_atrio;
  insert into atrio_agenda.projects (name,emoji,color,client_name,description,sort_order,created_by)
    values ('Estudio Botánico','🌿','#4FA373','Estudio Botánico','Identidad + sitio web.',1,luci) returning id into p_cliente;

  insert into atrio_agenda.sections (project_id,name,sort_order) values (p_cliente,'Por hacer',0) returning id into s_todo;
  insert into atrio_agenda.sections (project_id,name,sort_order) values (p_cliente,'En progreso',1) returning id into s_doing;
  insert into atrio_agenda.sections (project_id,name,sort_order) values (p_cliente,'Listo',2) returning id into s_done;

  insert into atrio_agenda.tasks (project_id,section_id,title,status,priority,assignee_id,due_date,sort_order,created_by)
    values (p_cliente,s_doing,'Explorar 3 rutas de logo','in_progress','high',luci,current_date,0,luci) returning id into tk;
  insert into atrio_agenda.task_tags(task_id,tag_id) values (tk,t_tag1),(tk,t_tag3);
  insert into atrio_agenda.tasks (project_id,section_id,title,status,priority,assignee_id,due_date,sort_order,created_by)
    values (p_cliente,s_todo,'Maquetar home en Next.js','todo','high',demi,current_date,0,demi);
  insert into atrio_agenda.tasks (project_id,section_id,title,status,priority,assignee_id,due_date,sort_order,created_by)
    values (p_cliente,s_doing,'Escribir textos de la home','in_progress','medium',demi,current_date - 1,1,demi);

  insert into atrio_agenda.channels (name,emoji,kind,sort_order) values ('general','💬','channel',0) returning id into ch_general;
  insert into atrio_agenda.channels (name,emoji,kind,project_id,sort_order) values ('estudio-botanico','🌿','project',p_cliente,1) returning id into ch_proj;
  insert into atrio_agenda.channels (name,emoji,kind,sort_order) values ('Lucila & Demian','💛','dm',2) returning id into ch_dm;

  insert into atrio_agenda.messages (channel_id,author_id,body)
    values (ch_general,demi,'¡Bienvenidos al HQ de Atrio! 🎉'), (ch_dm,demi,'te amo socia 💛');

  insert into atrio_agenda.events (title,starts_at,ends_at,project_id,color,created_by)
    values ('Reunión Estudio Botánico', current_date + 1 + time '15:00', current_date + 1 + time '16:00', p_cliente, '#4FA373', luci);

  insert into atrio_agenda.docs (title,icon,project_id,created_by) values ('Bienvenida al HQ','👋',p_atrio,demi);
end $$;
