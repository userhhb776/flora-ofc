create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Settings
create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.site_settings for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Categories
create table public.categories (
  id text primary key,
  label text not null,
  image text not null default '',
  sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Products
create table public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null default '',
  price numeric(10,2) not null default 0,
  old_price numeric(10,2),
  image text not null default '',
  badge text,
  description text not null default '',
  stock int,
  featured boolean not null default false,
  visible boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (visible or public.has_role(auth.uid(), 'admin'));
create policy "products admin write" on public.products for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  status text not null default 'novo'
);
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders admin all" on public.orders for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Page views
create table public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null default '/'
);
grant insert on public.page_views to anon, authenticated;
grant select on public.page_views to authenticated;
grant all on public.page_views to service_role;
alter table public.page_views enable row level security;
create policy "views insert" on public.page_views for insert to anon, authenticated with check (length(path) < 200);
create policy "views admin read" on public.page_views for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Place order: saves order, computes total from DB prices, decrements stock
create or replace function public.place_order(_items jsonb, _customer jsonb)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  it jsonb; p public.products; q int; tot numeric := 0; lines jsonb := '[]'::jsonb; oid uuid;
begin
  if jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 100 then raise exception 'invalid items'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    q := greatest(1, least(999, (it->>'qty')::int));
    select * into p from public.products where id = it->>'id' and visible;
    if not found then continue; end if;
    if p.stock is not null then
      update public.products set stock = greatest(0, stock - q) where id = p.id;
    end if;
    tot := tot + p.price * q;
    lines := lines || jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price, 'qty', q);
  end loop;
  insert into public.orders (customer, items, total) values (_customer, lines, tot) returning id into oid;
  return oid;
end $$;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

-- Seed
insert into public.categories (id, label, image, sort) values
('lancamentos','Linha Frutas','asset:banana',1),
('perfumaria','Perfumaria','asset:perfume',2),
('skincare','Skincare','asset:skincare',3),
('cabelo','Cabelo','asset:capilar',4),
('oleos','Óleos essenciais','asset:oleos',5),
('vegana','Linha vegana','asset:hero',6);

insert into public.products (id,name,category,price,old_price,image,badge,description,featured,sort) values
('banana-shampoo','Shampoo Frutas Banana','lancamentos',59.9,null,'asset:banana','Lançamento','Limpeza suave com extrato de banana, que nutre e devolve o brilho dos fios.',true,1),
('banana-hidratante','Loção Hidratante Banana','lancamentos',64.9,null,'asset:banana','Lançamento','Hidratação cremosa com perfume doce de banana para o corpo todo.',true,2),
('banana-mascara','Máscara Capilar Banana','lancamentos',69.9,null,'asset:banana','Lançamento','Nutrição intensa para cabelos secos, com toque macio e cheiro gostoso.',false,3),
('banana-sabonete','Sabonete Líquido Banana','lancamentos',44.9,null,'asset:banana',null,'Banho perfumado e cremoso, que limpa sem ressecar a pele.',false,4),
('body-splash','Body Splash Flora Pura 200ml','perfumaria',89.9,119.9,'asset:hero','Oferta','Sete fragrâncias exclusivas: Velvet Bloom, Liberty Grace, Elísia, Doce Vanilla, Elegance Style, Tunísia e Aurora Essence.',true,5),
('lady-flora','Lady Flora Eau de Parfum','perfumaria',299.9,null,'asset:perfume','Lançamento','Floral elegante e marcante, feito para durar o dia inteiro.',false,6),
('selvagem','Perfume Selvagem','perfumaria',299.9,null,'asset:perfume',null,'Amadeirado intenso com notas de especiarias.',false,7),
('flor-jurema','Perfume Flor de Jurema','perfumaria',219.9,null,'asset:perfume','Destaque','Inspirado na flor brasileira, com fundo suave e acolhedor.',false,8),
('future','Perfume Future','perfumaria',115.45,230.9,'asset:perfume','50% off','Fresco e moderno, com saída cítrica.',false,9),
('serum','Sérum Facial Vitamina C','skincare',129.9,null,'asset:skincare',null,'Uniformiza o tom e ilumina a pele. Fórmula leve.',false,10),
('creme-facial','Creme Facial Nutritivo','skincare',109.9,null,'asset:skincare',null,'Manteigas vegetais e antioxidantes para hidratação profunda.',false,11),
('gloss','Gloss By Flora Face','skincare',39.9,null,'asset:skincare','Novo','Brilho com cor e cuidado para os lábios.',false,12),
('oleo-capilar','Óleo Capilar Reparador','cabelo',69.9,null,'asset:capilar',null,'Brilho, maciez e proteção contra o frizz.',false,13),
('kit-carnauba','Kit Especial Carnaúba','cabelo',149.9,null,'asset:capilar','Kit','Linha Carnaúba – viva o sertão. Cuidado completo para os fios.',false,14),
('lavanda','Óleo Essencial de Lavanda','oleos',49.9,null,'asset:oleos',null,'Calmante e relaxante. 100% puro, 10ml.',false,15),
('alecrim','Óleo Essencial de Alecrim','oleos',49.9,null,'asset:oleos',null,'Energizante e ótimo para o couro cabeludo. 10ml.',false,16),
('eucalipto','Óleo Essencial de Eucalipto','oleos',44.9,null,'asset:oleos',null,'Refrescante, ideal para aromatizar a casa. 10ml.',false,17),
('sabonete-vegano','Sabonete Vegano Ervas','vegana',29.9,null,'asset:hero',null,'Sem ingredientes de origem animal. Perfume de ervas frescas.',false,18),
('hidratante-vegano','Hidratante Vegano Corporal','vegana',79.9,null,'asset:skincare',null,'Pele macia com ativos naturais e veganos.',false,19);

-- Media bucket policies (bucket created separately)
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.has_role(auth.uid(), 'admin'));
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.has_role(auth.uid(), 'admin'));
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.has_role(auth.uid(), 'admin'));
