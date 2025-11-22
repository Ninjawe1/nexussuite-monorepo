create table if not exists users (
  id text primary key,
  email text unique,
  name text,
  organization_id text,
  role text
);

create table if not exists accounts (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  provider_id text not null,
  account_id text not null,
  password_hash text,
  unique (account_id, provider_id)
);

create table if not exists sessions (
  token text primary key,
  user_id text not null,
  expires_at timestamp with time zone
);

create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text unique not null,
  owner_id text not null,
  metadata jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  member_count integer
);

create table if not exists org_members (
  id text primary key,
  organization_id text not null,
  user_id text not null,
  role text not null,
  permissions jsonb,
  is_active boolean,
  joined_at timestamp with time zone,
  invited_by text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

create table if not exists billing_customers (
  id text primary key,
  organization_id text not null,
  polar_customer_id text not null,
  email text,
  name text,
  phone text,
  address jsonb,
  metadata jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

create table if not exists subscriptions (
  id text primary key,
  organization_id text not null,
  user_id text,
  plan text,
  status text,
  interval text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean,
  canceled_at timestamp with time zone,
  customer_id text,
  subscription_id text,
  price_id text,
  quantity integer,
  metadata jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);