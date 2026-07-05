-- تصوير الفاتورة بعدة صور/صفحات: جدول صور منفصل بدل عمود image_url المفرد،
-- ودلو تخزين مخصّص. هذا لا يمسّ أي منطق مالي — الفاتورة والدَين المرتبط بها
-- يُرحَّلان بمحفّز book_invoice_debt بغض النظر عن وجود صور من عدمه.

create table invoice_images (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table invoice_images enable row level security;

create policy "read_invoice_images" on invoice_images for select
  using (auth.role() = 'authenticated');

create policy "write_invoice_images_capture" on invoice_images for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'cashier')
  )
);

create policy "delete_invoice_images_admin" on invoice_images for delete using (is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoice-photos', 'invoice-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "read_invoice_photos" on storage.objects for select
  using (bucket_id = 'invoice-photos' and auth.role() = 'authenticated');

create policy "upload_invoice_photos" on storage.objects for insert
  with check (
    bucket_id = 'invoice-photos'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'cashier')
    )
  );

create policy "delete_invoice_photos_admin" on storage.objects for delete
  using (bucket_id = 'invoice-photos' and is_admin());
