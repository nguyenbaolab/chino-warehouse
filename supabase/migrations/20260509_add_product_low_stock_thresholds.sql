alter table public.products
add column if not exists low_warning_boxes integer not null default 3;

alter table public.products
add column if not exists low_critical_boxes integer not null default 1;

update public.products
set low_warning_boxes = 3
where low_warning_boxes is null;

update public.products
set low_critical_boxes = 1
where low_critical_boxes is null;
