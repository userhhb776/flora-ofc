create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  order_id uuid not null,
  name text not null default '',
  rating int not null default 5,
  body text not null default '',
  photos jsonb not null default '[]'::jsonb,
  reply text not null default '',
  replied_at timestamptz,
  visible boolean not null default true,
  unique (order_id, product_id)
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select to anon, authenticated using (visible or public.has_role(auth.uid(), 'admin'));
create policy "reviews admin all" on public.reviews for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'info',
  title text not null default '',
  body text not null default '',
  read boolean not null default false
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications admin all" on public.notifications for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.site_cfg() returns jsonb language sql stable security definer set search_path = public
as $$ select coalesce((select value from public.site_settings where key = 'content'), '{}'::jsonb) $$;

create or replace function public.notify(_kind text, _title text, _body text) returns void language plpgsql security definer set search_path = public
as $$
begin
  if coalesce((public.site_cfg()->'notify'->>'enabled')::boolean, true) then
    insert into public.notifications (kind, title, body) values (_kind, _title, _body);
  end if;
end $$;
revoke all on function public.notify(text, text, text) from public, anon, authenticated;

-- coupons: customer->>'coupon' validated against promo settings
create or replace function public.place_order(_items jsonb, _customer jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare it jsonb; p public.products; q int; tot numeric := 0; lines jsonb := '[]'::jsonb; oid uuid;
  cfg jsonb := public.site_cfg(); cp jsonb; pct numeric := 0; code text := upper(trim(coalesce(_customer->>'coupon','')));
begin
  if jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 100 then raise exception 'invalid items'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    q := greatest(1, least(999, (it->>'qty')::int));
    select * into p from public.products where id = it->>'id' and visible;
    if not found then continue; end if;
    tot := tot + p.price * q;
    lines := lines || jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price, 'qty', q);
  end loop;
  if code <> '' and coalesce((cfg->'promo'->>'enabled')::boolean, false) then
    for cp in select * from jsonb_array_elements(coalesce(cfg->'promo'->'coupons', '[]'::jsonb)) loop
      if upper(trim(cp->>'code')) = code then pct := least(90, greatest(0, coalesce((cp->>'percent')::numeric, 0))); end if;
    end loop;
  end if;
  tot := round(tot * (1 - pct / 100), 2);
  insert into public.orders (customer, items, total)
    values (_customer || jsonb_build_object('coupon', case when pct > 0 then code else '' end, 'discount', pct), lines, tot) returning id into oid;
  return oid;
end $$;

create or replace function public.trg_order_notify() returns trigger language plpgsql security definer set search_path = public
as $$
declare n int; goal int := coalesce((public.site_cfg()->'notify'->>'salesGoal')::int, 5);
  msg text := coalesce(nullif(public.site_cfg()->'notify'->>'congrats', ''), 'Parabéns! A loja bateu {n} pedidos hoje!');
begin
  perform public.notify('order', 'Novo pedido', coalesce(new.customer->>'name', 'Cliente') || ' • R$ ' || to_char(new.total, 'FM999990.00'));
  select count(*) into n from public.orders where created_at >= date_trunc('day', now());
  if goal > 0 and n > 0 and n % goal = 0 then
    perform public.notify('congrats', 'Parabéns! 🎉', replace(msg, '{n}', n::text));
  end if;
  return new;
end $$;
create trigger order_notify after insert on public.orders for each row execute function public.trg_order_notify();

create or replace function public.trg_stock_notify() returns trigger language plpgsql security definer set search_path = public
as $$
declare lim int := coalesce((public.site_cfg()->'notify'->>'lowStock')::int, 3);
begin
  if new.stock is not null and new.stock <= lim and (old.stock is null or old.stock > lim) then
    perform public.notify('stock', case when new.stock = 0 then 'Produto esgotado' else 'Estoque acabando' end,
      new.name || case when new.stock = 0 then ' esgotou.' else ': restam ' || new.stock || ' unidades.' end);
  end if;
  return new;
end $$;
create trigger stock_notify after update of stock on public.products for each row execute function public.trg_stock_notify();

create or replace function public.reviewable_products(_phone text)
 returns table(product_id text, name text, order_id uuid) language plpgsql stable security definer set search_path = public
as $$
declare d text := right(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), 11);
begin
  if length(d) < 10 then return; end if;
  return query
    select distinct on (it->>'id') (it->>'id')::text, (it->>'name')::text, o.id
    from public.orders o, jsonb_array_elements(o.items) it
    where o.status = 'entregue' and right(regexp_replace(coalesce(o.customer->>'phone',''), '\D', '', 'g'), 11) = d
      and not exists (select 1 from public.reviews r where r.order_id = o.id and r.product_id = it->>'id')
    order by it->>'id', o.created_at desc;
end $$;
grant execute on function public.reviewable_products(text) to anon, authenticated;

create or replace function public.submit_review(_phone text, _product_id text, _rating int, _body text, _photos jsonb)
 returns uuid language plpgsql security definer set search_path = public
as $$
declare r record; o public.orders; rid uuid;
begin
  if coalesce((public.site_cfg()->>'reviewsEnabled')::boolean, true) = false then raise exception 'reviews disabled'; end if;
  select * into r from public.reviewable_products(_phone) x where x.product_id = _product_id limit 1;
  if not found then raise exception 'not allowed'; end if;
  select * into o from public.orders where id = r.order_id;
  insert into public.reviews (product_id, order_id, name, rating, body, photos)
    values (_product_id, r.order_id, split_part(coalesce(o.customer->>'name',''), ' ', 1), greatest(1, least(5, _rating)), left(coalesce(_body,''), 1000),
      case when jsonb_typeof(_photos) = 'array' then (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select x from jsonb_array_elements(_photos) x limit 4) s) else '[]'::jsonb end)
    returning id into rid;
  perform public.notify('review', 'Nova avaliação ' || repeat('★', greatest(1, least(5, _rating))), r.name || ': ' || left(coalesce(_body,''), 80));
  return rid;
end $$;
grant execute on function public.submit_review(text, text, int, text, jsonb) to anon, authenticated;

create policy "media review uploads" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'reviews');