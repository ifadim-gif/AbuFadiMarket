-- تصوير الشيك (صورة مقصوصة على الشيك فقط، تُقصّ في المتصفّح قبل الرفع).
--
-- لا يُستخدَم عمود checks.image_url المباشر لأن سياسة update_checks_admin تقصر
-- التعديل على الإدارة، بينما مَن يصوّر الشيك عادة هو الكاشير عند التسجيل، والجدول
-- لا يملك عمود created_by لتخصيص سياسة تحديث آمنة له. الحل: جدول فرعي مستقل
-- بنفس نمط invoice_images — يتفادى أي تعارض RLS ولا يمسّ جدول checks الحسّاس.

create table check_images (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references checks(id) on delete cascade,
  image_url text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table check_images enable row level security;

create policy "read_check_images" on check_images for select
  using (auth.role() = 'authenticated');

create policy "write_check_images_capture" on check_images for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'cashier')
  )
);

create policy "delete_check_images_admin" on check_images for delete using (is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('check-photos', 'check-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "read_check_photos" on storage.objects for select
  using (bucket_id = 'check-photos' and auth.role() = 'authenticated');

create policy "upload_check_photos" on storage.objects for insert
  with check (
    bucket_id = 'check-photos'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'cashier')
    )
  );

create policy "delete_check_photos_admin" on storage.objects for delete
  using (bucket_id = 'check-photos' and is_admin());
