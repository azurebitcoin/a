begin;

create table if not exists public.site_content (
  section text primary key,
  published jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_content_section_check
    check (section in ('homepage', 'organization', 'contacts', 'programs'))
);

create table if not exists public.site_content_drafts (
  section text primary key references public.site_content(section) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_content_drafts_section_check
    check (section in ('homepage', 'organization', 'contacts', 'programs'))
);

do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_content'
      and column_name = 'draft'
  ) then
    execute $sql$
      insert into public.site_content_drafts (section, draft, updated_at)
      select section, draft, updated_at
      from public.site_content
      on conflict (section) do update
      set draft = excluded.draft,
          updated_at = excluded.updated_at
    $sql$;
    alter table public.site_content drop column draft;
  end if;
end;
$migration$;

create table if not exists public.site_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 180),
  published_at date not null default current_date,
  excerpt text not null default '',
  body text not null default '',
  link text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now()
);

alter table public.site_content drop column if exists updated_by;
alter table public.site_posts drop column if exists updated_by;

create index if not exists site_posts_published_at_idx
  on public.site_posts (published_at desc)
  where status = 'published';

alter table public.site_content enable row level security;
alter table public.site_content_drafts enable row level security;
alter table public.site_posts enable row level security;

revoke all on table public.site_content from anon, authenticated;
revoke all on table public.site_content_drafts from anon, authenticated;
revoke all on table public.site_posts from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant insert, update, delete on table public.site_content to authenticated;
grant select, insert, update, delete on table public.site_content_drafts to authenticated;
grant select on table public.site_posts to anon, authenticated;
grant insert, update, delete on table public.site_posts to authenticated;

drop policy if exists site_content_select_public on public.site_content;
drop policy if exists site_content_insert_admin on public.site_content;
drop policy if exists site_content_update_admin on public.site_content;
drop policy if exists site_content_delete_admin on public.site_content;
drop policy if exists "Public can read published site content" on public.site_content;
drop policy if exists "Only foundation administrator can edit site content" on public.site_content;

create policy site_content_select_public
on public.site_content for select
to anon, authenticated
using (true);

create policy site_content_insert_admin
on public.site_content for insert
to authenticated
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_content_update_admin
on public.site_content for update
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
)
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_content_delete_admin
on public.site_content for delete
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

drop policy if exists site_content_drafts_select_admin on public.site_content_drafts;
drop policy if exists site_content_drafts_insert_admin on public.site_content_drafts;
drop policy if exists site_content_drafts_update_admin on public.site_content_drafts;
drop policy if exists site_content_drafts_delete_admin on public.site_content_drafts;

create policy site_content_drafts_select_admin
on public.site_content_drafts for select
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_content_drafts_insert_admin
on public.site_content_drafts for insert
to authenticated
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_content_drafts_update_admin
on public.site_content_drafts for update
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
)
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_content_drafts_delete_admin
on public.site_content_drafts for delete
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

drop policy if exists site_posts_select_public on public.site_posts;
drop policy if exists site_posts_select_admin on public.site_posts;
drop policy if exists site_posts_insert_admin on public.site_posts;
drop policy if exists site_posts_update_admin on public.site_posts;
drop policy if exists site_posts_delete_admin on public.site_posts;
drop policy if exists "Public can read published posts" on public.site_posts;
drop policy if exists "Only foundation administrator can edit posts" on public.site_posts;

create policy site_posts_select_public
on public.site_posts for select
to anon, authenticated
using (status = 'published');

create policy site_posts_select_admin
on public.site_posts for select
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_posts_insert_admin
on public.site_posts for insert
to authenticated
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_posts_update_admin
on public.site_posts for update
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
)
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

create policy site_posts_delete_admin
on public.site_posts for delete
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'info@andriukfoundation.com'
);

insert into public.site_content (section, published)
values
  (
    'homepage',
    '{"heroEyebrow":"Разом до перемоги","heroTitle":"МБФ Олександра Андріюка","heroText":"Благодійний фонд створений за ініціативи Олександра Андріюка для всебічної допомоги військовим, дітям та переселенцям. Працюємо з 2016 року задля нашого майбутнього.","statFunds":"8,3 млн грн","statFundsLabel":"Зібрано коштів для цільових програм","statAid":"124 тонни","statAidLabel":"Передано гуманітарної допомоги"}'::jsonb
  ),
  (
    'organization',
    '{"about":"Благодійна організація «Міжнародний благодійний фонд Олександра Андріюка» — неприбуткова недержавна благодійна організація. Фонд допомагає нужденним людям і покинутим дітям з 2016 року та офіційно зареєстрований в Україні у 2017 році (ЄДРПОУ 41481057).","mission":"Системно й прозоро підтримувати людей, які не з власної волі опинилися у складних життєвих обставинах, — військових, дітей, переселенців і пацієнтів лікарень — та об’єднувати волонтерів, благодійників і партнерів, щоб допомога була адресною, вчасною і підзвітною."}'::jsonb
  ),
  (
    'contacts',
    '{"legalName":"Благодійна організація «Міжнародний благодійний фонд Олександра Андріюка»","edrpou":"41481057","registrationYear":"2017","director":"Андріюк Олександр Миколайович","email":"info@andriukfoundation.com","phone":"+38 (098) 656-79-35","address":"33013, Україна, Рівненська обл., м. Рівне, просп. Миру, буд. 17","facebook":"https://www.facebook.com/blagofond.andriyuk/","instagram":"https://www.instagram.com/peremoga_fond__maybutnye/","donationUrl":"https://secure.wayforpay.com/donate/for_ukraine"}'::jsonb
  ),
  (
    'programs',
    '[{"title":"Допомога військовим","summary":"Спорядження, медикаменти та речі першої необхідності.","url":"/dopomoga-viyskovim.html"},{"title":"Стоматологія для військових","summary":"Безкоштовна стоматологічна допомога військовослужбовцям.","url":"/stomatologiya-dlya-viyskovih.html"},{"title":"Допомога дітям","summary":"Підтримка дітей, які опинилися у складних життєвих обставинах.","url":"/dopomoga-dityam.html"},{"title":"Допомога лікарням","summary":"Обладнання, матеріали та ресурси для медичних закладів.","url":"/dopomoga-likarnyam.html"},{"title":"Допомога переселенцям","summary":"Гуманітарна й консультаційна підтримка внутрішньо переміщених осіб.","url":"/dopomoga-pereselentsyam.html"},{"title":"Допомога тваринам","summary":"Порятунок, лікування та догляд за безпритульними тваринами.","url":"/dopomoga-tvarinam.html"}]'::jsonb
  )
on conflict (section) do nothing;

insert into public.site_content_drafts (section, draft)
select section, published
from public.site_content
on conflict (section) do nothing;

commit;
