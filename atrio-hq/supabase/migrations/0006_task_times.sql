-- Horarios en tareas: bloque de trabajo (start_time–end_time sobre start_date)
-- y hora de entrega (due_time sobre due_date). Todo aditivo y nullable.
alter table atrio_agenda.tasks add column if not exists start_time time;
alter table atrio_agenda.tasks add column if not exists end_time time;
alter table atrio_agenda.tasks add column if not exists due_time time;

create index if not exists idx_tasks_schedule on atrio_agenda.tasks(start_date, start_time);
