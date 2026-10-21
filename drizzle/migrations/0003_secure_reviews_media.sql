drop policy if exists "media review uploads" on storage.objects;
drop policy if exists "media public read" on storage.objects;
create policy "media admin read" on storage.objects for select to authenticated using (bucket_id = 'media' and public.has_role(auth.uid(), 'admin'));

drop function if exists public.submit_review(text, text, int, text, jsonb);
drop function if exists public.reviewable_products(text);

create or replace function public.reviewable_products(_phone text, _code text)
returns table(product_id text, name text, order_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare d text := right(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), 11);
  c text := lower(regexp_replace(coalesce(_code,''), '[^0-9a-fA-F]', '', 'g'));
begin
  if length(d) < 10 or length(c) < 8 then return; end if;
  return query
    select distinct on (it->>'id') (it->>'id')::text, (it->>'name')::text, o.id
    from public.orders o, jsonb_array_elements(o.items) it
    where o.status = 'entregue' and left(replace(o.id::text, '-', ''), 8) = left(c, 8)
      and right(regexp_replace(coalesce(o.customer->>'phone',''), '\D', '', 'g'), 11) = d
      and not exists (select 1 from public.reviews r where r.order_id = o.id and r.product_id = it->>'id')
    order by it->>'id', o.created_at desc;
end $$;
grant execute on function public.reviewable_products(text, text) to anon, authenticated;

create or replace function public.submit_review(_phone text, _code text, _product_id text, _rating integer, _body text, _photos jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare r record; o public.orders; rid uuid;
begin
  if coalesce((public.site_cfg()->>'reviewsEnabled')::boolean, true) = false then raise exception 'reviews disabled'; end if;
  select * into r from public.reviewable_products(_phone, _code) x where x.product_id = _product_id limit 1;
  if not found then raise exception 'not allowed'; end if;
  select * into o from public.orders where id = r.order_id;
  insert into public.reviews (product_id, order_id, name, rating, body, photos)
    values (_product_id, r.order_id, split_part(coalesce(o.customer->>'name',''), ' ', 1), greatest(1, least(5, _rating)), left(coalesce(_body,''), 1000),
      case when jsonb_typeof(_photos) = 'array' then (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select x from jsonb_array_elements(_photos) x where jsonb_typeof(x) = 'string' limit 4) s) else '[]'::jsonb end)
    returning id into rid;
  perform public.notify('review', 'Nova avaliação ' || repeat('★', greatest(1, least(5, _rating))), r.name || ': ' || left(coalesce(_body,''), 80));
  return rid;
end $$;
grant execute on function public.submit_review(text, text, text, integer, text, jsonb) to anon, authenticated;