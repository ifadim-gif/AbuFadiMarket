-- شاشة عمليات المورد الشاملة: ملاحظة نصّية حرّة + صور المورد (نفس نمط
-- invoice_images/check_images — جدول فرعي مستقل بدلوه الخاص، لا يمسّ أي عمود
-- مالي حسّاس بجدول suppliers، ولا يحتاج تعديل محفّز guard_engine_only_update()
-- (الذي يبقى يحمي balance/red_flag/red_flag_note كما هو).

alter table suppliers add column notes text;

create table supplier_images (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table supplier_images enable row level security;

create policy "read_supplier_images" on supplier_images for select
  using (auth.role() = 'authenticated');

create policy "write_supplier_images_capture" on supplier_images for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'cashier')
  )
);

create policy "delete_supplier_images_admin" on supplier_images for delete using (is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supplier-photos', 'supplier-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "read_supplier_photos" on storage.objects for select
  using (bucket_id = 'supplier-photos' and auth.role() = 'authenticated');

create policy "upload_supplier_photos" on storage.objects for insert
  with check (
    bucket_id = 'supplier-photos'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'cashier')
    )
  );

create policy "delete_supplier_photos_admin" on storage.objects for delete
  using (bucket_id = 'supplier-photos' and is_admin());
