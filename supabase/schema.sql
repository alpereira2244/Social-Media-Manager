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

create table if not exists feedback_memory (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  source_type text not null,
  platform text,
  posting_account_id text,
  posting_account_name text,
  original_content text,
  revised_content text,
  feedback_text text,
  inferred_preference text,
  metadata_json jsonb default '{}'::jsonb,
  important boolean default false,
  ignored boolean default false,
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
  campaign_id text,
  campaign_name text not null,
  generated_post_id text not null,
  platform text not null,
  content_angle text,
  intent text,
  content text not null,
  -- supporting_json stores postCopy/supporting fields plus manual publishing
  -- metadata and metrics: livePostUrl, postedAt, publishNotes, hiddenFromQueue, metrics.
  supporting_json jsonb default '{}'::jsonb,
  media_used boolean default false,
  status text default 'Ready',
  planned_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists post_queue_generated_post_id_idx
on post_queue(generated_post_id);

create table if not exists social_connections (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  provider text not null,
  account_label text,
  integration_path text default 'Instagram Login path',
  account_id text,
  page_id text,
  instagram_user_id text,
  instagram_username text,
  account_type text,
  token_status text default 'Not configured',
  connected_at timestamptz,
  access_token_encrypted_or_placeholder text,
  status text default 'Sandbox setup available',
  is_sandbox boolean default true,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inspiration_patterns (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  title text not null,
  source_url text,
  platform text,
  source_type text,
  notes text,
  screenshot_metadata_json jsonb default '{}'::jsonb,
  pasted_text text,
  fetched_content text,
  tags text[] default '{}',
  pattern_only boolean default true,
  analysis_json jsonb default '{}'::jsonb,
  status text default 'saved',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists opportunities (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  title text not null,
  opportunity_type text,
  source_url text,
  platform text,
  pasted_text text,
  screenshot_metadata_json jsonb default '{}'::jsonb,
  urgency text default 'Medium',
  status text default 'New',
  tags text[] default '{}',
  analysis_json jsonb default '{}'::jsonb,
  reply_drafts_json jsonb default '[]'::jsonb,
  related_campaign_id text references campaigns(id) on delete set null,
  related_post_ids_json jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists source_captures (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  title text,
  url text,
  selected_text text,
  source_domain text,
  detected_platform text,
  status text default 'New',
  triage_json jsonb default '{}'::jsonb,
  destination text,
  routed_record_id text,
  captured_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists activity_log (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  action_type text not null,
  object_type text not null,
  object_id text,
  title text,
  summary text,
  destination text,
  metadata_json jsonb default '{}'::jsonb,
  undo_json jsonb default '{}'::jsonb,
  status text default 'success',
  created_at timestamptz default now()
);

create table if not exists claim_library (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  claim_text text not null,
  claim_type text not null default 'Needs review',
  supporting_source_id text,
  source_type text default 'manual entry',
  notes text,
  risk_level text default 'Medium',
  reviewed_by text,
  reviewed_at timestamptz,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists review_links (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  token text not null unique,
  scope_type text not null default 'This week',
  scope_json jsonb default '{}'::jsonb,
  permission_level text not null default 'Comment only',
  expires_at timestamptz,
  created_by text,
  created_at timestamptz default now(),
  disabled_at timestamptz
);

create table if not exists review_feedback (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  review_link_id text references review_links(id) on delete set null,
  content_type text not null default 'Post',
  content_id text not null,
  reviewer_name text,
  comment text,
  suggested_edit text,
  status text not null default 'comment',
  created_at timestamptz default now()
);

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
alter table post_queue drop constraint if exists post_queue_campaign_id_fkey;
alter table post_queue drop constraint if exists post_queue_generated_post_id_fkey;
alter table post_queue alter column campaign_id drop not null;

alter table social_connections add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table social_connections add column if not exists provider text;
alter table social_connections add column if not exists account_label text;
alter table social_connections add column if not exists integration_path text default 'Instagram Login path';
alter table social_connections add column if not exists account_id text;
alter table social_connections add column if not exists page_id text;
alter table social_connections add column if not exists instagram_user_id text;
alter table social_connections add column if not exists instagram_username text;
alter table social_connections add column if not exists account_type text;
alter table social_connections add column if not exists token_status text default 'Not configured';
alter table social_connections add column if not exists connected_at timestamptz;
alter table social_connections add column if not exists access_token_encrypted_or_placeholder text;
alter table social_connections add column if not exists status text default 'Sandbox setup available';
alter table social_connections add column if not exists is_sandbox boolean default true;
alter table social_connections add column if not exists metadata_json jsonb default '{}'::jsonb;
alter table social_connections add column if not exists created_at timestamptz default now();
alter table social_connections add column if not exists updated_at timestamptz default now();

alter table inspiration_patterns add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table inspiration_patterns add column if not exists title text;
alter table inspiration_patterns add column if not exists source_url text;
alter table inspiration_patterns add column if not exists platform text;
alter table inspiration_patterns add column if not exists source_type text;
alter table inspiration_patterns add column if not exists notes text;
alter table inspiration_patterns add column if not exists screenshot_metadata_json jsonb default '{}'::jsonb;
alter table inspiration_patterns add column if not exists pasted_text text;
alter table inspiration_patterns add column if not exists fetched_content text;
alter table inspiration_patterns add column if not exists tags text[] default '{}';
alter table inspiration_patterns add column if not exists pattern_only boolean default true;
alter table inspiration_patterns add column if not exists analysis_json jsonb default '{}'::jsonb;
alter table inspiration_patterns add column if not exists status text default 'saved';
alter table inspiration_patterns add column if not exists created_at timestamptz default now();
alter table inspiration_patterns add column if not exists updated_at timestamptz default now();

alter table opportunities add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table opportunities add column if not exists opportunity_type text;
alter table opportunities add column if not exists source_url text;
alter table opportunities add column if not exists platform text;
alter table opportunities add column if not exists pasted_text text;
alter table opportunities add column if not exists screenshot_metadata_json jsonb default '{}'::jsonb;
alter table opportunities add column if not exists urgency text default 'Medium';
alter table opportunities add column if not exists status text default 'New';
alter table opportunities add column if not exists tags text[] default '{}';
alter table opportunities add column if not exists analysis_json jsonb default '{}'::jsonb;
alter table opportunities add column if not exists reply_drafts_json jsonb default '[]'::jsonb;
alter table opportunities add column if not exists related_campaign_id text references campaigns(id) on delete set null;
alter table opportunities add column if not exists related_post_ids_json jsonb default '[]'::jsonb;
alter table opportunities add column if not exists notes text;
alter table opportunities add column if not exists created_at timestamptz default now();
alter table opportunities add column if not exists updated_at timestamptz default now();

alter table source_captures add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table source_captures add column if not exists title text;
alter table source_captures add column if not exists url text;
alter table source_captures add column if not exists selected_text text;
alter table source_captures add column if not exists source_domain text;
alter table source_captures add column if not exists detected_platform text;
alter table source_captures add column if not exists status text default 'New';
alter table source_captures add column if not exists triage_json jsonb default '{}'::jsonb;
alter table source_captures add column if not exists destination text;
alter table source_captures add column if not exists routed_record_id text;
alter table source_captures add column if not exists captured_at timestamptz default now();
alter table source_captures add column if not exists created_at timestamptz default now();
alter table source_captures add column if not exists updated_at timestamptz default now();

alter table activity_log add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table activity_log add column if not exists action_type text;
alter table activity_log add column if not exists object_type text;
alter table activity_log add column if not exists object_id text;
alter table activity_log add column if not exists title text;
alter table activity_log add column if not exists summary text;
alter table activity_log add column if not exists destination text;
alter table activity_log add column if not exists metadata_json jsonb default '{}'::jsonb;
alter table activity_log add column if not exists undo_json jsonb default '{}'::jsonb;
alter table activity_log add column if not exists status text default 'success';
alter table activity_log add column if not exists created_at timestamptz default now();

alter table claim_library add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table claim_library add column if not exists claim_text text;
alter table claim_library add column if not exists claim_type text default 'Needs review';
alter table claim_library add column if not exists supporting_source_id text;
alter table claim_library add column if not exists source_type text default 'manual entry';
alter table claim_library add column if not exists notes text;
alter table claim_library add column if not exists risk_level text default 'Medium';
alter table claim_library add column if not exists reviewed_by text;
alter table claim_library add column if not exists reviewed_at timestamptz;
alter table claim_library add column if not exists metadata_json jsonb default '{}'::jsonb;
alter table claim_library add column if not exists created_at timestamptz default now();
alter table claim_library add column if not exists updated_at timestamptz default now();

alter table review_links add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table review_links add column if not exists token text;
alter table review_links add column if not exists scope_type text default 'This week';
alter table review_links add column if not exists scope_json jsonb default '{}'::jsonb;
alter table review_links add column if not exists permission_level text default 'Comment only';
alter table review_links add column if not exists expires_at timestamptz;
alter table review_links add column if not exists created_by text;
alter table review_links add column if not exists created_at timestamptz default now();
alter table review_links add column if not exists disabled_at timestamptz;

alter table review_feedback add column if not exists workspace_id text references workspaces(id) on delete cascade;
alter table review_feedback add column if not exists review_link_id text references review_links(id) on delete set null;
alter table review_feedback add column if not exists content_type text default 'Post';
alter table review_feedback add column if not exists content_id text;
alter table review_feedback add column if not exists reviewer_name text;
alter table review_feedback add column if not exists comment text;
alter table review_feedback add column if not exists suggested_edit text;
alter table review_feedback add column if not exists status text default 'comment';
alter table review_feedback add column if not exists created_at timestamptz default now();

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
alter table feedback_memory enable row level security;
alter table media_files enable row level security;
alter table media_library enable row level security;
alter table approved_posts enable row level security;
alter table rejected_posts enable row level security;
alter table post_queue enable row level security;
alter table social_connections enable row level security;
alter table inspiration_patterns enable row level security;
alter table opportunities enable row level security;
alter table source_captures enable row level security;
alter table activity_log enable row level security;
alter table claim_library enable row level security;
alter table review_links enable row level security;
alter table review_feedback enable row level security;

revoke select, insert, update, delete on table
  workspaces,
  workspace_members,
  profiles,
  knowledge_base_items,
  brand_rules,
  campaigns,
  generated_posts,
  post_feedback,
  feedback_memory,
  media_files,
  media_library,
  approved_posts,
  rejected_posts,
  post_queue,
  social_connections,
  inspiration_patterns,
  opportunities,
  source_captures,
  activity_log,
  claim_library,
  review_links,
  review_feedback
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
  feedback_memory,
  media_files,
  media_library,
  approved_posts,
  rejected_posts,
  post_queue,
  social_connections,
  inspiration_patterns,
  opportunities,
  source_captures,
  activity_log,
  claim_library,
  review_links,
  review_feedback
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
drop policy if exists "scc anon select" on feedback_memory;
drop policy if exists "scc anon insert" on feedback_memory;
drop policy if exists "scc anon update" on feedback_memory;
drop policy if exists "scc anon delete" on feedback_memory;
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
drop policy if exists "scc anon select" on social_connections;
drop policy if exists "scc anon insert" on social_connections;
drop policy if exists "scc anon update" on social_connections;
drop policy if exists "scc anon delete" on social_connections;
drop policy if exists "scc anon select" on inspiration_patterns;
drop policy if exists "scc anon insert" on inspiration_patterns;
drop policy if exists "scc anon update" on inspiration_patterns;
drop policy if exists "scc anon delete" on inspiration_patterns;
drop policy if exists "scc anon select" on opportunities;
drop policy if exists "scc anon insert" on opportunities;
drop policy if exists "scc anon update" on opportunities;
drop policy if exists "scc anon delete" on opportunities;
drop policy if exists "scc anon select" on source_captures;
drop policy if exists "scc anon insert" on source_captures;
drop policy if exists "scc anon update" on source_captures;
drop policy if exists "scc anon delete" on source_captures;
drop policy if exists "scc anon select" on activity_log;
drop policy if exists "scc anon insert" on activity_log;
drop policy if exists "scc anon update" on activity_log;
drop policy if exists "scc anon delete" on activity_log;
drop policy if exists "scc anon select" on claim_library;
drop policy if exists "scc anon insert" on claim_library;
drop policy if exists "scc anon update" on claim_library;
drop policy if exists "scc anon delete" on claim_library;
drop policy if exists "scc anon select" on review_links;
drop policy if exists "scc anon insert" on review_links;
drop policy if exists "scc anon update" on review_links;
drop policy if exists "scc anon delete" on review_links;
drop policy if exists "scc anon select" on review_feedback;
drop policy if exists "scc anon insert" on review_feedback;
drop policy if exists "scc anon update" on review_feedback;
drop policy if exists "scc anon delete" on review_feedback;

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

drop policy if exists "scc workspace select" on feedback_memory;
drop policy if exists "scc workspace insert" on feedback_memory;
drop policy if exists "scc workspace update" on feedback_memory;
drop policy if exists "scc workspace delete" on feedback_memory;
create policy "scc workspace select" on feedback_memory for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on feedback_memory for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on feedback_memory for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on feedback_memory for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

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

drop policy if exists "scc workspace select" on social_connections;
drop policy if exists "scc workspace insert" on social_connections;
drop policy if exists "scc workspace update" on social_connections;
drop policy if exists "scc workspace delete" on social_connections;
create policy "scc workspace select" on social_connections for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on social_connections for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on social_connections for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on social_connections for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on inspiration_patterns;
drop policy if exists "scc workspace insert" on inspiration_patterns;
drop policy if exists "scc workspace update" on inspiration_patterns;
drop policy if exists "scc workspace delete" on inspiration_patterns;
create policy "scc workspace select" on inspiration_patterns for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on inspiration_patterns for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on inspiration_patterns for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on inspiration_patterns for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on opportunities;
drop policy if exists "scc workspace insert" on opportunities;
drop policy if exists "scc workspace update" on opportunities;
drop policy if exists "scc workspace delete" on opportunities;
create policy "scc workspace select" on opportunities for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on opportunities for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on opportunities for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on opportunities for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on source_captures;
drop policy if exists "scc workspace insert" on source_captures;
drop policy if exists "scc workspace update" on source_captures;
drop policy if exists "scc workspace delete" on source_captures;
create policy "scc workspace select" on source_captures for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on source_captures for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on source_captures for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on source_captures for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on activity_log;
drop policy if exists "scc workspace insert" on activity_log;
drop policy if exists "scc workspace update" on activity_log;
drop policy if exists "scc workspace delete" on activity_log;
create policy "scc workspace select" on activity_log for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on activity_log for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on activity_log for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on activity_log for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on claim_library;
drop policy if exists "scc workspace insert" on claim_library;
drop policy if exists "scc workspace update" on claim_library;
drop policy if exists "scc workspace delete" on claim_library;
create policy "scc workspace select" on claim_library for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on claim_library for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on claim_library for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on claim_library for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on review_links;
drop policy if exists "scc workspace insert" on review_links;
drop policy if exists "scc workspace update" on review_links;
drop policy if exists "scc workspace delete" on review_links;
create policy "scc workspace select" on review_links for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on review_links for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on review_links for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on review_links for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

drop policy if exists "scc workspace select" on review_feedback;
drop policy if exists "scc workspace insert" on review_feedback;
drop policy if exists "scc workspace update" on review_feedback;
drop policy if exists "scc workspace delete" on review_feedback;
create policy "scc workspace select" on review_feedback for select to authenticated using (workspace_id is null or public.scc_is_workspace_member(workspace_id));
create policy "scc workspace insert" on review_feedback for insert to authenticated with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace update" on review_feedback for update to authenticated using (public.scc_can_write_workspace(workspace_id) or workspace_id is null) with check (public.scc_can_write_workspace(workspace_id));
create policy "scc workspace delete" on review_feedback for delete to authenticated using (public.scc_can_write_workspace(workspace_id));

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
