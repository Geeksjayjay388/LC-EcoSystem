-- Create the storage bucket
insert into storage.buckets (id, name, public)
values ('ecosystem-vault', 'ecosystem-vault', true);

-- Enable RLS on the bucket (optional if public, but good for restricting uploads)
create policy "Allow public viewing of files"
on storage.objects for select
to public
using ( bucket_id = 'ecosystem-vault' );

create policy "Allow authenticated users to upload files"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'ecosystem-vault' );

create policy "Allow users to delete their own uploaded files"
on storage.objects for delete
to authenticated
using ( bucket_id = 'ecosystem-vault' and auth.uid() = owner );

-- Create the lc_files table
create table public.lc_files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  public_url text not null,
  owner_id uuid references auth.users not null default auth.uid(),
  file_size bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for the lc_files table
alter table public.lc_files enable row level security;

-- RLS Policy: All authenticated users can view files
create policy "Authenticated users can view files"
on public.lc_files for select
to authenticated
using ( true );

-- RLS Policy: Only authenticated users can upload (insert) files
create policy "Authenticated users can upload files"
on public.lc_files for insert
to authenticated
with check ( auth.uid() = owner_id );

-- RLS Policy: Users can only delete files they personally uploaded
create policy "Users can delete their own files"
on public.lc_files for delete
to authenticated
using ( auth.uid() = owner_id );
