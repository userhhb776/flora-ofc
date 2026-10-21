alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists video text not null default '';
alter table public.orders add column if not exists stock_applied boolean not null default false;

create or replace function public.place_order(_items jsonb, _customer jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare it jsonb; p public.products; q int; tot numeric := 0; lines jsonb := '[]'::jsonb; oid uuid;
begin
  if jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 100 then raise exception 'invalid items'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    q := greatest(1, least(999, (it->>'qty')::int));
    select * into p from public.products where id = it->>'id' and visible;
    if not found then continue; end if;
    tot := tot + p.price * q;
    lines := lines || jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price, 'qty', q);
  end loop;
  insert into public.orders (customer, items, total) values (_customer, lines, tot) returning id into oid;
  return oid;
end $$;

create or replace function public.set_order_status(_id uuid, _status text)
 returns void language plpgsql security definer set search_path to 'public'
as $$
declare o public.orders; it jsonb; sell boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select * into o from public.orders where id = _id for update;
  if not found then return; end if;
  sell := _status in ('confirmado','em preparo','entregue');
  if sell and not o.stock_applied then
    for it in select * from jsonb_array_elements(o.items) loop
      update public.products set stock = greatest(0, stock - (it->>'qty')::int) where id = it->>'id' and stock is not null;
    end loop;
  elsif not sell and o.stock_applied then
    for it in select * from jsonb_array_elements(o.items) loop
      update public.products set stock = stock + (it->>'qty')::int where id = it->>'id' and stock is not null;
    end loop;
  end if;
  update public.orders set status = _status, stock_applied = sell where id = _id;
end $$;
revoke all on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;