create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('ecosystem-vault', 'ecosystem-vault', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "Allow public viewing of files" on storage.objects;
drop policy if exists "Allow authenticated users to upload files" on storage.objects;
drop policy if exists "Allow users to delete their own uploaded files" on storage.objects;

create policy "Allow public viewing of files"
on storage.objects for select
to public
using (bucket_id = 'ecosystem-vault');

create policy "Allow authenticated users to upload files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'ecosystem-vault');

create policy "Allow users to delete their own uploaded files"
on storage.objects for delete
to authenticated
using (bucket_id = 'ecosystem-vault' and auth.uid() = owner);

create table if not exists public.lc_files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  public_url text not null,
  owner_id uuid references auth.users not null default auth.uid(),
  file_size bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.lc_files enable row level security;

drop policy if exists "Authenticated users can view files" on public.lc_files;
drop policy if exists "Authenticated users can upload files" on public.lc_files;
drop policy if exists "Users can delete their own files" on public.lc_files;

create policy "Authenticated users can view files"
on public.lc_files for select
to authenticated
using (true);

create policy "Authenticated users can upload files"
on public.lc_files for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can delete their own files"
on public.lc_files for delete
to authenticated
using (auth.uid() = owner_id);

create table if not exists public.lc_texts (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  owner_id uuid references auth.users not null default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.lc_texts enable row level security;

drop policy if exists "Authenticated users can view texts" on public.lc_texts;
drop policy if exists "Authenticated users can insert texts" on public.lc_texts;
drop policy if exists "Users can delete their own texts" on public.lc_texts;

create policy "Authenticated users can view texts"
on public.lc_texts for select
to authenticated
using (true);

create policy "Authenticated users can insert texts"
on public.lc_texts for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can delete their own texts"
on public.lc_texts for delete
to authenticated
using (auth.uid() = owner_id);

create table if not exists public.lc_records (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users not null default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  category text not null,
  reference_number text not null,
  details text not null default ''
);

alter table public.lc_records enable row level security;

drop policy if exists "Authenticated users can view records" on public.lc_records;
drop policy if exists "Users can insert their own records" on public.lc_records;
drop policy if exists "Users can delete their own records" on public.lc_records;

create policy "Authenticated users can view records"
on public.lc_records for select
to authenticated
using (true);

create policy "Users can insert their own records"
on public.lc_records for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can delete their own records"
on public.lc_records for delete
to authenticated
using (auth.uid() = owner_id);

create table if not exists public.lc_students (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users not null default auth.uid(),
  name text not null,
  course text not null default '',
  fee_paid numeric(10, 2) not null default 0,
  fee_total numeric(10, 2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.lc_students enable row level security;

drop policy if exists "Authenticated users can view students" on public.lc_students;
drop policy if exists "Users can insert their own students" on public.lc_students;
drop policy if exists "Users can update their own students" on public.lc_students;
drop policy if exists "Users can delete their own students" on public.lc_students;

create policy "Authenticated users can view students"
on public.lc_students for select
to authenticated
using (true);

create policy "Users can insert their own students"
on public.lc_students for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update their own students"
on public.lc_students for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete their own students"
on public.lc_students for delete
to authenticated
using (auth.uid() = owner_id);

select pg_notify('pgrst', 'reload schema');
