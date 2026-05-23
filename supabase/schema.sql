create extension if not exists pgcrypto;

create table if not exists workspaces (
  id text primary key,
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workspace_members (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

create table if not exists profiles (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  name text not null,
  type text not null,
  role_title text,
  bio text,
  linkedin_url text,
  x_url text,
  instagram_url text,
  tiktok_url text,
  website_url text,
  other_urls text,
  pasted_content text,
  notes text,
  sync_status text default 'Manual Only',
  last_checked text default 'Never',
  personality_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists knowledge_base_items (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  name text not null,
  category text,
  material_type text,
  urls text,
  url_type text,
  pasted_content text,
  notes text,
  sync_status text default 'Manual Only',
  last_checked text default 'Never',
  analysis_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists brand_rules (
  id text primary key default 'default',
  workspace_id text references workspaces(id) on delete cascade,
  tone text,
  style text,
  audience text,
  avoid text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists campaigns (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  title text not null,
  raw_idea text,
  selected_profile_id text references profiles(id) on delete set null,
  selected_knowledge_base_ids text[] default '{}',
  selected_platforms text[] default '{}',
  media_metadata_json jsonb default '{}'::jsonb,
  media_analysis_json jsonb default '{}'::jsonb,
  generation_source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists generated_posts (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  campaign_id text not null references campaigns(id) on delete cascade,
  platform text not null,
  option_label text,
  variant_number integer,
  content_json jsonb default '{}'::jsonb,
  status text default 'draft',
  previous_versions_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists post_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id text references workspaces(id) on delete cascade,
  generated_post_id text references generated_posts(id) on delete cascade,
  action text not null,
  notes text,
  before_content text,
  after_content text,
  created_at timestamptz default now()
);

create table if not exists media_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id text references workspaces(id) on delete cascade,
  campaign_id text references campaigns(id) on delete cascade,
  filename text not null,
  file_type text,
  storage_path text,
  public_url text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists media_library (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  filename text not null,
  file_type text,
  media_type text,
  storage_path text,
  public_url text,
  uploaded_at timestamptz default now(),
  description text,
  suggested_angles text[] default '{}',
  overlay_text text,
  sensitivity_warnings text[] default '{}',
  alt_text text,
  tags text[] default '{}',
  notes text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists approved_posts (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  profile_id text not null references profiles(id) on delete cascade,
  campaign_id text not null references campaigns(id) on delete cascade,
  generated_post_id text not null references generated_posts(id) on delete cascade,
  platform text not null,
  final_content text not null,
  supporting_json jsonb default '{}'::jsonb,
  content_angle text,
  intent text,
  media_used boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists approved_posts_generated_post_id_idx
on approved_posts(generated_post_id);

create table if not exists rejected_posts (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  profile_id text references profiles(id) on delete set null,
  campaign_id text not null references campaigns(id) on delete cascade,
  generated_post_id text not null references generated_posts(id) on delete cascade,
  platform text not null,
  rejected_content text not null,
  content_angle text,
  intent text,
  reason text,
  created_at timestamptz default now()
);

create unique index if not exists rejected_posts_generated_post_id_idx
on rejected_posts(generated_post_id);

create table if not exists post_queue (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  profile_id text references profiles(id) on delete set null,
  profile_name text,
  campaign_id text not null references campaigns(id) on delete cascade,
  campaign_name text not null,
  generated_post_id text not null references generated_posts(id) on delete cascade,
  platform text not null,
  content_angle text,
  intent text,
  content text not null,
  -- supporting_json stores postCopy/supporting fields plus manual publishing
  -- metadata and metrics: livePostUrl, postedAt, publishNotes, metrics.
  supporting_json jsonb default '{}'::jsonb,
  media_used boolean default false,
  status text default 'Ready',
  planned_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists post_queue_generated_post_id_idx
on post_queue(generated_post_id);

-- Keep existing projects compatible with the current app shape.
alter table profiles add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table profiles add column if not exists role_title text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists linkedin_url text;
alter table profiles add column if not exists x_url text;
alter table profiles add column if not exists instagram_url text;
alter table profiles add column if not exists tiktok_url text;
alter table profiles add column if not exists website_url text;
alter table profiles add column if not exists other_urls text;
alter table profiles add column if not exists pasted_content text;
alter table profiles add column if not exists notes text;
alter table profiles add column if not exists sync_status text default 'Manual Only';
alter table profiles add column if not exists last_checked text default 'Never';
alter table profiles add column if not exists personality_json jsonb default '{}'::jsonb;
alter table profiles add column if not exists created_at timestamptz default now();
alter table profiles add column if not exists updated_at timestamptz default now();

alter table knowledge_base_items add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table knowledge_base_items add column if not exists category text;
alter table knowledge_base_items add column if not exists material_type text;
alter table knowledge_base_items add column if not exists urls text;
alter table knowledge_base_items add column if not exists url_type text;
alter table knowledge_base_items add column if not exists pasted_content text;
alter table knowledge_base_items add column if not exists notes text;
alter table knowledge_base_items add column if not exists sync_status text default 'Manual Only';
alter table knowledge_base_items add column if not exists last_checked text default 'Never';
alter table knowledge_base_items add column if not exists analysis_json jsonb default '{}'::jsonb;
alter table knowledge_base_items add column if not exists created_at timestamptz default now();
alter table knowledge_base_items add column if not exists updated_at timestamptz default now();

alter table brand_rules add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table brand_rules add column if not exists tone text;
alter table brand_rules add column if not exists style text;
alter table brand_rules add column if not exists audience text;
alter table brand_rules add column if not exists avoid text;
alter table brand_rules add column if not exists created_at timestamptz default now();
alter table brand_rules add column if not exists updated_at timestamptz default now();

alter table campaigns add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table campaigns add column if not exists raw_idea text;
alter table campaigns add column if not exists selected_profile_id text references profiles(id) on delete set null;
alter table campaigns add column if not exists selected_knowledge_base_ids text[] default '{}';
alter table campaigns add column if not exists selected_platforms text[] default '{}';
alter table campaigns add column if not exists media_metadata_json jsonb default '{}'::jsonb;
alter table campaigns add column if not exists media_analysis_json jsonb default '{}'::jsonb;
alter table campaigns add column if not exists generation_source text;
alter table campaigns add column if not exists created_at timestamptz default now();
alter table campaigns add column if not exists updated_at timestamptz default now();

alter table generated_posts add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table generated_posts add column if not exists option_label text;
alter table generated_posts add column if not exists variant_number integer;
alter table generated_posts add column if not exists content_json jsonb default '{}'::jsonb;
alter table generated_posts add column if not exists status text default 'draft';
alter table generated_posts add column if not exists previous_versions_json jsonb default '[]'::jsonb;
alter table generated_posts add column if not exists created_at timestamptz default now();
alter table generated_posts add column if not exists updated_at timestamptz default now();

alter table post_feedback add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table post_feedback add column if not exists notes text;
alter table post_feedback add column if not exists before_content text;
alter table post_feedback add column if not exists after_content text;
alter table post_feedback add column if not exists created_at timestamptz default now();

alter table media_files add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table media_files add column if not exists file_type text;
alter table media_files add column if not exists storage_path text;
alter table media_files add column if not exists public_url text;
alter table media_files add column if not exists metadata_json jsonb default '{}'::jsonb;
alter table media_files add column if not exists created_at timestamptz default now();

alter table media_library add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table media_library add column if not exists file_type text;
alter table media_library add column if not exists media_type text;
alter table media_library add column if not exists storage_path text;
alter table media_library add column if not exists public_url text;
alter table media_library add column if not exists uploaded_at timestamptz default now();
alter table media_library add column if not exists description text;
alter table media_library add column if not exists suggested_angles text[] default '{}';
alter table media_library add column if not exists overlay_text text;
alter table media_library add column if not exists sensitivity_warnings text[] default '{}';
alter table media_library add column if not exists alt_text text;
alter table media_library add column if not exists tags text[] default '{}';
alter table media_library add column if not exists notes text;
alter table media_library add column if not exists metadata_json jsonb default '{}'::jsonb;
alter table media_library add column if not exists created_at timestamptz default now();
alter table media_library add column if not exists updated_at timestamptz default now();

alter table approved_posts add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table approved_posts add column if not exists supporting_json jsonb default '{}'::jsonb;
alter table approved_posts add column if not exists content_angle text;
alter table approved_posts add column if not exists intent text;
alter table approved_posts add column if not exists media_used boolean default false;
alter table approved_posts add column if not exists created_at timestamptz default now();

alter table rejected_posts add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table rejected_posts add column if not exists profile_id text references profiles(id) on delete set null;
alter table rejected_posts add column if not exists content_angle text;
alter table rejected_posts add column if not exists intent text;
alter table rejected_posts add column if not exists reason text;
alter table rejected_posts add column if not exists created_at timestamptz default now();

alter table post_queue add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table post_queue add column if not exists profile_id text references profiles(id) on delete set null;
alter table post_queue add column if not exists profile_name text;
alter table post_queue add column if not exists content_angle text;
alter table post_queue add column if not exists intent text;
alter table post_queue add column if not exists supporting_json jsonb default '{}'::jsonb;
alter table post_queue add column if not exists media_used boolean default false;
alter table post_queue add column if not exists status text default 'Ready';
alter table post_queue add column if not exists planned_at timestamptz;
alter table post_queue add column if not exists created_at timestamptz default now();
alter table post_queue add column if not exists updated_at timestamptz default now();

-- Authenticated workspace-scoped MVP RLS strategy:
-- Anonymous access is disabled for app data. Signed-in users can read rows for
-- workspaces they belong to. owner/admin/editor can write; viewer is read-only.
create or replace function public.scc_is_workspace_member(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.scc_can_write_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'editor')
  );
$$;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table profiles enable row level security;
alter table knowledge_base_items enable row level security;
alter table brand_rules enable row level security;
alter table campaigns enable row level security;
alter table generated_posts enable row level security;
alter table post_feedback enable row level security;
alter table media_files enable row level security;
alter table media_library enable row level security;
alter table approved_posts enable row level security;
alter table rejected_posts enable row level security;
alter table post_queue enable row level security;

revoke select, insert, update, delete on table
  workspaces,
  workspace_members,
  profiles,
  knowledge_base_items,
  brand_rules,
  campaigns,
  generated_posts,
  post_feedback,
  media_files,
  media_library,
  approved_posts,
  rejected_posts,
  post_queue
from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  workspaces,
  workspace_members,
  profiles,
  knowledge_base_items,
  brand_rules,
  campaigns,
  generated_posts,
  post_feedback,
  media_files,
  media_library,
  approved_posts,
  rejected_posts,
  post_queue
to authenticated;

-- Remove earlier internal-MVP anon policies if they exist.
drop policy if exists "scc anon select" on profiles;
drop policy if exists "scc anon insert" on profiles;
drop policy if exists "scc anon update" on profiles;
drop policy if exists "scc anon delete" on profiles;
drop policy if exists "scc anon select" on knowledge_base_items;
drop policy if exists "scc anon insert" on knowledge_base_items;
drop policy if exists "scc anon update" on knowledge_base_items;
drop policy if exists "scc anon delete" on knowledge_base_items;
drop policy if exists "scc anon select" on brand_rules;
drop policy if exists "scc anon insert" on brand_rules;
drop policy if exists "scc anon update" on brand_rules;
drop policy if exists "scc anon delete" on brand_rules;
drop policy if exists "scc anon select" on campaigns;
drop policy if exists "scc anon insert" on campaigns;
drop policy if exists "scc anon update" on campaigns;
drop policy if exists "scc anon delete" on campaigns;
drop policy if exists "scc anon select" on generated_posts;
drop policy if exists "scc anon insert" on generated_posts;
drop policy if exists "scc anon update" on generated_posts;
drop policy if exists "scc anon delete" on generated_posts;
drop policy if exists "scc anon select" on post_feedback;
drop policy if exists "scc anon insert" on post_feedback;
drop policy if exists "scc anon update" on post_feedback;
drop policy if exists "scc anon delete" on post_feedback;
drop policy if exists "scc anon select" on media_files;
drop policy if exists "scc anon insert" on media_files;
drop policy if exists "scc anon update" on media_files;
drop policy if exists "scc anon delete" on media_files;
drop policy if exists "scc anon select" on media_library;
drop policy if exists "scc anon insert" on media_library;
drop policy if exists "scc anon update" on media_library;
drop policy if exists "scc anon delete" on media_library;
drop policy if exists "scc anon select" on approved_posts;
drop policy if exists "scc anon insert" on approved_posts;
drop policy if exists "scc anon update" on approved_posts;
drop policy if exists "scc anon delete" on approved_posts;
drop policy if exists "scc anon select" on rejected_posts;
drop policy if exists "scc anon insert" on rejected_posts;
drop policy if exists "scc anon update" on rejected_posts;
drop policy if exists "scc anon delete" on rejected_posts;
drop policy if exists "scc anon select" on post_queue;
drop policy if exists "scc anon insert" on post_queue;
drop policy if exists "scc anon update" on post_queue;
drop policy if exists "scc anon delete" on post_queue;

drop policy if exists "workspace select" on workspaces;
drop policy if exists "workspace insert" on workspaces;
drop policy if exists "workspace update" on workspaces;
drop policy if exists "workspace delete" on workspaces;
create policy "workspace select" on workspaces for select to authenticated using (public.scc_is_workspace_member(id) or owner_user_id = auth.uid());
create policy "workspace insert" on workspaces for insert to authenticated with check (owner_user_id = auth.uid());
create policy "workspace update" on workspaces for update to authenticated using (public.scc_can_write_workspace(id) or owner_user_id = auth.uid()) with check (public.scc_can_write_workspace(id) or owner_user_id = auth.uid());
create policy "workspace delete" on workspaces for delete to authenticated using (owner_user_id = auth.uid());

drop policy if exists "workspace member select" on workspace_members;
drop policy if exists "workspace member insert self" on workspace_members;
drop policy if exists "workspace member manage" on workspace_members;
create policy "workspace member select" on workspace_members for select to authenticated using (user_id = auth.uid() or public.scc_is_workspace_member(workspace_id));
create policy "workspace member insert self" on workspace_members for insert to authenticated with check (user_id = auth.uid());
create policy "workspace member manage" on workspace_members for update to authenticated using (public.scc_can_write_workspace(workspace_id)) with check (public.scc_can_write_workspace(workspace_id));

-- Transitional null workspace rows are readable by signed-in users so old demo data
-- can be seen and manually saved into the active workspace. New writes include workspace_id.
drop policy if exists "scc workspace select" on profiles;
drop policy if exists "scc workspace insert" on profiles;
drop policy if exists "scc workspace update" on profiles;
drop policy if exists "scc workspace delete" on profiles;
create policy "scc workspace select" on profiles for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on profiles for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on profiles for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on profiles for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on knowledge_base_items;
drop policy if exists "scc workspace insert" on knowledge_base_items;
drop policy if exists "scc workspace update" on knowledge_base_items;
drop policy if exists "scc workspace delete" on knowledge_base_items;
create policy "scc workspace select" on knowledge_base_items for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on knowledge_base_items for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on knowledge_base_items for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on knowledge_base_items for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on brand_rules;
drop policy if exists "scc workspace insert" on brand_rules;
drop policy if exists "scc workspace update" on brand_rules;
drop policy if exists "scc workspace delete" on brand_rules;
create policy "scc workspace select" on brand_rules for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on brand_rules for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on brand_rules for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on brand_rules for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on campaigns;
drop policy if exists "scc workspace insert" on campaigns;
drop policy if exists "scc workspace update" on campaigns;
drop policy if exists "scc workspace delete" on campaigns;
create policy "scc workspace select" on campaigns for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on campaigns for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on campaigns for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on campaigns for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on generated_posts;
drop policy if exists "scc workspace insert" on generated_posts;
drop policy if exists "scc workspace update" on generated_posts;
drop policy if exists "scc workspace delete" on generated_posts;
create policy "scc workspace select" on generated_posts for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on generated_posts for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on generated_posts for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on generated_posts for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on post_feedback;
drop policy if exists "scc workspace insert" on post_feedback;
drop policy if exists "scc workspace update" on post_feedback;
drop policy if exists "scc workspace delete" on post_feedback;
create policy "scc workspace select" on post_feedback for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on post_feedback for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on post_feedback for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on post_feedback for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on media_files;
drop policy if exists "scc workspace insert" on media_files;
drop policy if exists "scc workspace update" on media_files;
drop policy if exists "scc workspace delete" on media_files;
create policy "scc workspace select" on media_files for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on media_files for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on media_files for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on media_files for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on media_library;
drop policy if exists "scc workspace insert" on media_library;
drop policy if exists "scc workspace update" on media_library;
drop policy if exists "scc workspace delete" on media_library;
create policy "scc workspace select" on media_library for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on media_library for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on media_library for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on media_library for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on approved_posts;
drop policy if exists "scc workspace insert" on approved_posts;
drop policy if exists "scc workspace update" on approved_posts;
drop policy if exists "scc workspace delete" on approved_posts;
create policy "scc workspace select" on approved_posts for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on approved_posts for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on approved_posts for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on approved_posts for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on rejected_posts;
drop policy if exists "scc workspace insert" on rejected_posts;
drop policy if exists "scc workspace update" on rejected_posts;
drop policy if exists "scc workspace delete" on rejected_posts;
create policy "scc workspace select" on rejected_posts for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on rejected_posts for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on rejected_posts for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on rejected_posts for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on post_queue;
drop policy if exists "scc workspace insert" on post_queue;
drop policy if exists "scc workspace update" on post_queue;
drop policy if exists "scc workspace delete" on post_queue;
create policy "scc workspace select" on post_queue for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on post_queue for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on post_queue for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on post_queue for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

insert into storage.buckets (id, name, public)
values ('campaign-media', 'campaign-media', true)
on conflict (id) do nothing;

drop policy if exists "campaign media read" on storage.objects;
drop policy if exists "campaign media upload" on storage.objects;
drop policy if exists "campaign media update" on storage.objects;
drop policy if exists "campaign media delete" on storage.objects;

create policy "campaign media read"
on storage.objects for select
to authenticated
using (bucket_id = 'campaign-media');

create policy "campaign media upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'campaign-media');

create policy "campaign media update"
on storage.objects for update
to authenticated
using (bucket_id = 'campaign-media')
with check (bucket_id = 'campaign-media');

create policy "campaign media delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'campaign-media');
