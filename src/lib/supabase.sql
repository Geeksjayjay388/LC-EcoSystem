create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('ecosystem-vault', 'ecosystem-vault', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public viewing of files'
  ) then
    create policy "Allow public viewing of files"
    on storage.objects for select
    to public
    using (bucket_id = 'ecosystem-vault');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow authenticated users to upload files'
  ) then
    create policy "Allow authenticated users to upload files"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'ecosystem-vault');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow users to delete their own uploaded files'
  ) then
    create policy "Allow users to delete their own uploaded files"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'ecosystem-vault' and auth.uid() = owner);
  end if;
end $$;

create table if not exists public.lc_files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  public_url text not null,
  owner_id uuid references auth.users not null default auth.uid(),
  file_size bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.lc_files enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lc_files'
      and policyname = 'Authenticated users can view files'
  ) then
    create policy "Authenticated users can view files"
    on public.lc_files for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lc_files'
      and policyname = 'Authenticated users can upload files'
  ) then
    create policy "Authenticated users can upload files"
    on public.lc_files for insert
    to authenticated
    with check (auth.uid() = owner_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lc_files'
      and policyname = 'Users can delete their own files'
  ) then
    create policy "Users can delete their own files"
    on public.lc_files for delete
    to authenticated
    using (auth.uid() = owner_id);
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
