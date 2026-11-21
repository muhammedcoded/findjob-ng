-- Findjob.ng v2.5: employer accounts, Paystack billing, flexible ads, and navigation.
-- Run after upgrade-v2.4-admin-repair.sql. Safe to run more than once.

-- Flexible ad inventory and targeting.
alter table public.ads add column if not exists format text not null default 'responsive';
alter table public.ads add column if not exists page_target text not null default 'all';
alter table public.ads add column if not exists sort_order integer not null default 0;
alter table public.ads add column if not exists placement_group text not null default 'sidebar';
update public.ads set placement_group=case when slot like 'left-%' then 'left' when slot like 'right-%' then 'right' when slot='center-banner' then 'banner' else 'inline' end;
update public.ads set sort_order=substring(slot from '[0-9]+$')::integer where slot ~ '^(left|right)-[0-9]+$';
create index if not exists ads_group_order_idx on public.ads(placement_group,sort_order);

-- Extend site settings with navigation and configurable longer-term discounts.
insert into public.site_settings(key,value) values
 ('header_links','[{"label":"Home","url":"/"},{"label":"Latest Jobs","url":"/"},{"label":"Browse Jobs","url":"/"},{"label":"Career Blog","url":"/blog"},{"label":"For Employers","url":"/employers"},{"label":"Advertise","url":"/advertise"},{"label":"Contact","url":"/contact"}]'),
 ('footer_links','[{"label":"About us","url":"/about"},{"label":"Career blog","url":"/blog"},{"label":"For Employers","url":"/employers"},{"label":"Advertise","url":"/advertise"},{"label":"Contact","url":"/contact"},{"label":"Privacy policy","url":"/privacy"},{"label":"Terms of use","url":"/terms"},{"label":"Job safety","url":"/disclaimer"}]'),
 ('unlimited_discount_3m_percent','5'),
 ('unlimited_discount_6m_percent','10'),
 ('unlimited_discount_12m_percent','15')
on conflict(key) do nothing;

-- Preserve existing custom menus while adding the new employer and advertiser destinations.
do $$
declare r record; arr jsonb;
begin
 for r in select key,value from public.site_settings where key in ('header_links','footer_links') loop
  begin arr:=case when btrim(coalesce(r.value,''))='' then '[]'::jsonb else r.value::jsonb end;
  exception when others then continue;
  end;
  if jsonb_typeof(arr)<>'array' then continue; end if;
  if jsonb_array_length(arr)=0 then
   if r.key='header_links' then
    arr:='[{"label":"Home","url":"/"},{"label":"Latest Jobs","url":"/"},{"label":"Career Blog","url":"/blog"},{"label":"For Employers","url":"/employers"},{"label":"Advertise","url":"/advertise"},{"label":"Contact","url":"/contact"}]'::jsonb;
   else
    arr:='[{"label":"About us","url":"/about"},{"label":"Career blog","url":"/blog"},{"label":"Contact","url":"/contact"},{"label":"Privacy policy","url":"/privacy"},{"label":"Terms of use","url":"/terms"},{"label":"Job safety","url":"/disclaimer"},{"label":"For Employers","url":"/employers"},{"label":"Advertise","url":"/advertise"}]'::jsonb;
   end if;
  else
   if not exists(select 1 from jsonb_array_elements(arr) as x(value) where value->>'url'='/employers') then arr:=arr||jsonb_build_array(jsonb_build_object('label','For Employers','url','/employers')); end if;
   if not exists(select 1 from jsonb_array_elements(arr) as x(value) where value->>'url'='/advertise') then arr:=arr||jsonb_build_array(jsonb_build_object('label','Advertise','url','/advertise')); end if;
  end if;
  update public.site_settings set value=arr::text where key=r.key;
 end loop;
end $$;

-- Employer identity and billing.
create table if not exists public.employers (
 id uuid primary key references auth.users(id) on delete cascade,
 company_name text not null,
 contact_name text not null default '',
 email text not null unique,
 phone text not null default '',
 website text not null default '',
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.employer_wallets (
 employer_id uuid primary key references public.employers(id) on delete cascade,
 balance_kobo bigint not null default 0 check(balance_kobo>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.employer_payments (
 id uuid primary key default gen_random_uuid(),
 employer_id uuid not null references public.employers(id) on delete cascade,
 reference text not null unique,
 amount_kobo bigint not null check(amount_kobo>0),
 currency text not null default 'NGN',
 payment_kind text not null check(payment_kind in ('wallet','unlimited')),
 quantity integer not null default 1,
 months integer not null default 0,
 status text not null default 'pending' check(status in ('pending','success','failed')),
 authorization_url text,
 metadata jsonb not null default '{}'::jsonb,
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists employer_payments_owner_idx on public.employer_payments(employer_id,created_at desc);
create table if not exists public.employer_subscriptions (
 id uuid primary key default gen_random_uuid(),
 employer_id uuid not null references public.employers(id) on delete cascade,
 plan text not null default 'unlimited',
 months integer not null default 1,
 amount_kobo bigint not null,
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 candidate_search_credits integer not null default 10,
 created_at timestamptz not null default now()
);
create index if not exists employer_subscriptions_owner_idx on public.employer_subscriptions(employer_id,ends_at desc);

-- Associate paid employer listings with their owner and featured period.
alter table public.jobs add column if not exists employer_id uuid references public.employers(id) on delete set null;
alter table public.jobs add column if not exists featured_until timestamptz;
create index if not exists jobs_employer_idx on public.jobs(employer_id,created_at desc);

-- Candidate directory table is opt-in. It remains empty until candidates submit profiles.
create table if not exists public.candidate_profiles (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 email text not null,
 location text not null default '',
 skills text not null default '',
 experience_years numeric(4,1),
 cv_url text,
 visibility text not null default 'private' check(visibility in ('private','searchable')),
 created_at timestamptz not null default now()
);
create index if not exists candidate_profiles_search_idx on public.candidate_profiles(visibility,created_at desc);

-- Atomic wallet credit and debit helpers.
create or replace function public.employer_wallet_credit(p_employer_id uuid,p_amount_kobo bigint)
returns bigint language plpgsql security definer set search_path=public as $$
declare new_balance bigint;
begin
 if p_amount_kobo<=0 then raise exception 'Invalid wallet credit'; end if;
 insert into public.employer_wallets as wallet(employer_id,balance_kobo) values(p_employer_id,p_amount_kobo)
 on conflict(employer_id) do update set balance_kobo=wallet.balance_kobo+excluded.balance_kobo,updated_at=now()
 returning balance_kobo into new_balance;
 return new_balance;
end; $$;

create or replace function public.employer_wallet_debit(p_employer_id uuid,p_amount_kobo bigint)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if p_amount_kobo<=0 then raise exception 'Invalid wallet debit'; end if;
 update public.employer_wallets set balance_kobo=balance_kobo-p_amount_kobo,updated_at=now()
 where employer_id=p_employer_id and balance_kobo>=p_amount_kobo;
 return found;
end; $$;

-- Idempotently settle a verified Paystack transaction and credit wallet or activate a subscription.
create or replace function public.employer_settle_payment(
 p_reference text,p_employer_id uuid,p_amount_kobo bigint,p_payment_kind text,p_quantity integer,p_months integer,p_metadata jsonb default '{}'::jsonb
) returns boolean language plpgsql security definer set search_path=public as $$
declare inserted_id uuid; start_time timestamptz; end_time timestamptz;
begin
 if p_payment_kind not in ('wallet','unlimited') or p_amount_kobo<=0 then raise exception 'Invalid payment details'; end if;
 update public.employer_payments set status='success',paid_at=now(),metadata=coalesce(p_metadata,metadata)
 where reference=p_reference and employer_id=p_employer_id and status='pending'
 returning id into inserted_id;
 if inserted_id is null then
   insert into public.employer_payments(employer_id,reference,amount_kobo,payment_kind,quantity,months,status,metadata,paid_at)
   values(p_employer_id,p_reference,p_amount_kobo,p_payment_kind,greatest(1,p_quantity),greatest(0,p_months),'success',coalesce(p_metadata,'{}'::jsonb),now())
   on conflict(reference) do nothing returning id into inserted_id;
 end if;
 if inserted_id is null then return false; end if;
 if p_payment_kind='wallet' then
   perform public.employer_wallet_credit(p_employer_id,p_amount_kobo);
 else
   select greatest(now(),coalesce(max(ends_at),now())) into start_time from public.employer_subscriptions where employer_id=p_employer_id;
   end_time:=start_time + make_interval(months=>greatest(1,p_months));
   insert into public.employer_subscriptions(employer_id,plan,months,amount_kobo,starts_at,ends_at,candidate_search_credits)
   values(p_employer_id,'unlimited',greatest(1,p_months),p_amount_kobo,start_time,end_time,10);
 end if;
 return true;
end; $$;

revoke all on function public.employer_wallet_credit(uuid,bigint) from public,anon,authenticated;
revoke all on function public.employer_wallet_debit(uuid,bigint) from public,anon,authenticated;
revoke all on function public.employer_settle_payment(text,uuid,bigint,text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.employer_wallet_credit(uuid,bigint) to service_role;
grant execute on function public.employer_wallet_debit(uuid,bigint) to service_role;
grant execute on function public.employer_settle_payment(text,uuid,bigint,text,integer,integer,jsonb) to service_role;

-- Keep all employer and candidate data server-side. The Node server uses service_role.
alter table public.employers enable row level security;
alter table public.employer_wallets enable row level security;
alter table public.employer_payments enable row level security;
alter table public.employer_subscriptions enable row level security;
alter table public.candidate_profiles enable row level security;
revoke all on public.employers,public.employer_wallets,public.employer_payments,public.employer_subscriptions,public.candidate_profiles from anon,authenticated;
grant all on public.employers,public.employer_wallets,public.employer_payments,public.employer_subscriptions,public.candidate_profiles to service_role;

create or replace function public.employer_use_candidate_credit(p_subscription_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare remaining integer;
begin
 update public.employer_subscriptions set candidate_search_credits=candidate_search_credits-1
 where id=p_subscription_id and ends_at>now() and candidate_search_credits>0
 returning candidate_search_credits into remaining;
 if remaining is null then raise exception 'No candidate search credits remain'; end if;
 return remaining;
end; $$;
revoke all on function public.employer_use_candidate_credit(uuid) from public,anon,authenticated;
grant execute on function public.employer_use_candidate_credit(uuid) to service_role;
