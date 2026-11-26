-- =====================================================================
--  BOUTIQUE COD (paiement à la livraison) — Base de données Supabase
--  Jour 1 : tables, sécurité par rôle, commande publique, livreurs.
--  À coller dans Supabase > SQL Editor > New query > Run (une seule fois).
-- =====================================================================
--  Rôles :
--   * propriétaire / gérant : voit et gère tout SA boutique (multi-boutiques
--     prêt pour le SaaS : chaque ligne porte shop_id, isolée par RLS).
--   * livreur : AUCUN accès direct aux tables. Il passe uniquement par
--     driver_deliveries() et driver_report() : ses colis, ses produits
--     autorisés, sans totaux, sans prix d'achat, sans historique client.
--   * visiteur (anon) : uniquement store_get, place_order, add_upsell,
--     track_order. Les prix sont recalculés côté serveur.
-- =====================================================================

-- ---------- Types ----------
do $$ begin
  create type order_status as enum
    ('a_appeler','pas_reponse','a_rappeler','confirmee','en_route','livree','refusee','annulee');
exception when duplicate_object then null; end $$;
do $$ begin
  create type member_role as enum ('owner','manager','driver');
exception when duplicate_object then null; end $$;
do $$ begin
  create type member_status as enum ('invited','active','removed');
exception when duplicate_object then null; end $$;

-- ---------- Outils ----------
-- Numéros acceptés : 8 chiffres maliens, ou les mêmes avec +223 / 00223 / 223 devant.
-- Tout autre indicatif (étranger) ou préfixe inconnu renvoie NULL : la commande est refusée.
-- Préfixes autorisés (2 premiers chiffres) : 20, 21, 44 (fixes) ; 50 à 79 et 81 à 99 (mobiles).
-- 80 = numéros de services. Ajustez la liste si un opérateur ouvre de nouvelles séries.
create or replace function normalize_ml_phone(p text) returns text
language sql immutable set search_path = public as $$
  select case when d ~ '^(20|21|44|5[0-9]|6[0-9]|7[0-9]|8[1-9]|9[0-9])[0-9]{6}$' then d end
  from (select case
                 when raw ~ '^\+223[0-9]{8}$'  then right(raw, 8)
                 when raw ~ '^00223[0-9]{8}$'  then right(raw, 8)
                 when raw ~ '^223[0-9]{8}$'    then right(raw, 8)
                 when raw ~ '^[0-9]{8}$'       then raw
               end as d
        from (select regexp_replace(coalesce(p, ''), '[[:space:].()/-]', '', 'g') as raw) r) x
$$;

-- ---------- Tables ----------
create table if not exists shops (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete restrict,
  name             text not null check (length(trim(name)) between 2 and 60),
  slug             text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  currency         text not null default 'XOF',
  country_code     text not null default 'ML',
  whatsapp         text,
  legal_name       text,
  rccm             text,
  nif              text,
  address          text,
  email            text,
  pixel_meta       text,
  pixel_tiktok     text,
  refund_days      int  not null default 2 check (refund_days between 0 and 30),
  created_at       timestamptz not null default now()
);

create table if not exists shop_members (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references shops(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  role              member_role not null,
  display_name      text not null,
  phone             text,
  area              text,
  status            member_status not null default 'invited',
  all_products      boolean not null default true,
  invite_code_hash  text,
  invite_expires_at timestamptz,
  created_at        timestamptz not null default now(),
  check (role <> 'driver' or phone ~ '^[0-9]{8}$'),
  unique (shop_id, phone)
);

create table if not exists products (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null references shops(id) on delete cascade,
  name               text not null check (length(trim(name)) between 2 and 120),
  description        text not null default '',
  price              int  not null check (price > 0),
  cost               int  not null default 0 check (cost >= 0),
  stock              int  not null default 0 check (stock >= 0),
  option_label       text not null default 'Variante',
  options            text[] not null default '{Standard}' check (cardinality(options) between 1 and 30),
  images             text[] not null default '{}',
  upsell_product_id  uuid references products(id) on delete set null,
  upsell_discount    int  not null default 20 check (upsell_discount between 0 and 90),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  check (cost < price)
);

-- Packs quantité : 2 pièces = prix réduit, livraison offerte...
create table if not exists product_offers (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  quantity       int  not null check (quantity between 2 and 10),
  bundle_price   int  not null check (bundle_price > 0),
  free_shipping  boolean not null default true,
  highlight      boolean not null default false,
  unique (product_id, quantity)
);

-- Produits autorisés par livreur (ignoré si all_products = true)
create table if not exists driver_products (
  member_id   uuid not null references shop_members(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  primary key (member_id, product_id)
);

create table if not exists delivery_zones (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references shops(id) on delete cascade,
  city         text not null,
  label        text not null,
  fee          int  not null default 0 check (fee >= 0),
  driver_cost  int  not null default 1000 check (driver_cost >= 0),
  delay_days   int  not null default 1 check (delay_days between 1 and 10),
  active       boolean not null default true,
  unique (shop_id, city, label)
);

create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null references shops(id) on delete cascade,
  number             int  not null,
  customer_name      text not null,
  customer_phone     text not null check (customer_phone ~ '^[0-9]{8}$'),
  zone_id            uuid not null references delivery_zones(id),
  landmark           text not null check (length(landmark) >= 6),
  marketing_optin    boolean not null default false,
  optin_at           timestamptz,
  ready_confirmed    boolean not null check (ready_confirmed),
  status             order_status not null default 'a_appeler',
  call_attempts      int not null default 0,
  unreachable_count  int not null default 0,
  shipping_fee       int not null default 0 check (shipping_fee >= 0),
  customer_lat       double precision check (customer_lat between 10 and 25.5),
  customer_lng       double precision check (customer_lng between -12.5 and 4.5),
  driver_id          uuid references shop_members(id) on delete set null,
  driver_seen        boolean not null default false,
  cash_remitted      boolean not null default false,
  remitted_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (shop_id, number)
);

create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  product_name  text not null,
  option        text not null,
  quantity      int  not null check (quantity > 0),
  amount        int  not null check (amount >= 0),
  unit_cost     int  not null default 0,
  is_upsell     boolean not null default false
);

create table if not exists order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  status      order_status not null,
  actor       uuid,
  created_at  timestamptz not null default now()
);

-- Gares des compagnies de transport (envois vers les régions par car).
-- Le rayon sert à détecter l'arrivée du livreur dans l'enceinte de la gare.
create table if not exists transport_depots (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops(id) on delete cascade,
  company    text not null,
  label      text not null,
  lat        double precision not null check (lat between 10 and 25.5),
  lng        double precision not null check (lng between -12.5 and 4.5),
  radius_m   int  not null default 150 check (radius_m between 30 and 2000),
  active     boolean not null default true
);

-- Mises à jour sans risque si une version précédente du script a déjà été lancée.
alter table shops add column if not exists apdp_number text;
alter table delivery_zones add column if not exists mode text not null default 'livreur';
alter table delivery_zones add column if not exists depot_id uuid references transport_depots(id) on delete set null;
do $$ begin
  alter table delivery_zones add constraint delivery_zones_mode_chk check (mode in ('livreur','bus'));
exception when duplicate_object then null; end $$;
alter table orders add column if not exists customer_lat double precision;
alter table orders add column if not exists customer_lng double precision;
alter table orders add column if not exists depot_id    uuid references transport_depots(id) on delete set null;
alter table orders add column if not exists at_depot_at timestamptz;
alter table orders add column if not exists handed_at   timestamptz;
alter table orders add column if not exists bus_ticket  text;
-- WhatsApp du client : 'inconnu' à la commande, puis 'oui' si le message de confirmation est
-- remis, 'non' si WhatsApp répond que le numéro n'y est pas (erreurs 131026 / 133016).
alter table orders add column if not exists whatsapp text not null default 'inconnu';
do $$ begin
  alter table orders add constraint orders_whatsapp_chk check (whatsapp in ('inconnu','oui','non'));
exception when duplicate_object then null; end $$;

create or replace function distance_m(lat1 double precision, lng1 double precision,
                                      lat2 double precision, lng2 double precision) returns double precision
language sql immutable set search_path = public as $$
  select 6371000 * 2 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
       + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Positions des livreurs : enregistrées seulement pendant une livraison, effacées après 30 jours.
create table if not exists driver_locations (
  id           bigint generated always as identity primary key,
  member_id    uuid not null references shop_members(id) on delete cascade,
  lat          double precision not null check (lat between 10 and 25.5),
  lng          double precision not null check (lng between -12.5 and 4.5),
  accuracy_m   int,
  recorded_at  timestamptz not null default now()
);
create index if not exists driver_locations_idx on driver_locations (member_id, recorded_at desc);

create table if not exists ad_spend (
  shop_id     uuid not null references shops(id) on delete cascade,
  week_start  date not null,
  amount      int  not null default 0 check (amount >= 0),
  primary key (shop_id, week_start)
);

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text,
  auth_key    text,
  platform    text not null default 'web',   -- web | android
  created_at  timestamptz not null default now()
);

create index if not exists orders_shop_status_idx on orders (shop_id, status, created_at);
create index if not exists orders_driver_idx      on orders (driver_id, status);
create index if not exists orders_phone_idx       on orders (shop_id, customer_phone);
create index if not exists items_order_idx        on order_items (order_id);
create index if not exists products_shop_idx      on products (shop_id);
create index if not exists members_user_idx       on shop_members (user_id);

-- ---------- Fonctions d'aide (sécurité) ----------
create or replace function is_shop_admin(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shops s where s.id = p_shop and s.owner_id = auth.uid())
      or exists (select 1 from shop_members m
                 where m.shop_id = p_shop and m.user_id = auth.uid()
                   and m.role in ('owner','manager') and m.status = 'active')
$$;

create or replace function driver_can_carry(p_member uuid, p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select m.all_products or not exists (
      select 1 from order_items i
      where i.order_id = p_order
        and (i.product_id is null or not exists (
              select 1 from driver_products dp
              where dp.member_id = m.id and dp.product_id = i.product_id)))
    from shop_members m where m.id = p_member), false)
$$;

create or replace function order_total(p_order uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(amount) from order_items where order_id = p_order), 0)
       + coalesce((select shipping_fee from orders where id = p_order), 0)
$$;

-- ---------- Règles automatiques sur les commandes ----------
create or replace function orders_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.shop_id <> old.shop_id or new.number <> old.number then
    raise exception 'IMMUTABLE_FIELDS';
  end if;

  -- Une commande terminée ne revient pas en arrière (le stock reste juste).
  if old.status in ('livree','refusee','annulee') and new.status <> old.status then
    raise exception 'ORDER_CLOSED';
  end if;

  -- Livreur : actif, de la même boutique, autorisé pour TOUS les produits.
  if new.driver_id is distinct from old.driver_id and new.driver_id is not null then
    if not exists (select 1 from shop_members m
                   where m.id = new.driver_id and m.shop_id = new.shop_id
                     and m.role = 'driver' and m.status = 'active') then
      raise exception 'DRIVER_NOT_ACTIVE';
    end if;
    if not driver_can_carry(new.driver_id, new.id) then
      raise exception 'DRIVER_NOT_ALLOWED';
    end if;
    new.driver_seen := false;
  end if;

  if new.status = 'en_route' and new.driver_id is null then
    raise exception 'DRIVER_REQUIRED';
  end if;

  -- Refus ou annulation : les produits reviennent en stock.
  if new.status in ('refusee','annulee') and old.status not in ('refusee','annulee') then
    update products p set stock = p.stock + i.quantity
    from order_items i where i.order_id = new.id and i.product_id = p.id;
  end if;

  -- Envoi par car : le client récupère et paie à la gare d'arrivée, l'argent ne passe pas par le livreur.
  if new.depot_id is not null and new.status = 'livree' and old.status <> 'livree' then
    if new.handed_at is null then raise exception 'NOT_HANDED_TO_CARRIER'; end if;
    new.cash_remitted := true;
  end if;

  if new.cash_remitted and not old.cash_remitted then
    if new.status <> 'livree' then raise exception 'NOT_DELIVERED'; end if;
    new.remitted_at := now();
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_guard_trg on orders;
create trigger orders_guard_trg before update on orders
  for each row execute function orders_guard();

create or replace function orders_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status <> old.status then
    insert into order_events (order_id, status, actor) values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists orders_log_trg on orders;
create trigger orders_log_trg after insert or update on orders
  for each row execute function orders_log();

-- =====================================================================
--  FONCTIONS PUBLIQUES (boutique côté client, sans compte)
-- =====================================================================

-- Tout ce qu'il faut pour afficher la boutique. Jamais le prix d'achat.
create or replace function store_get(p_slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'shop', json_build_object('name', s.name, 'slug', s.slug, 'currency', s.currency,
             'whatsapp', s.whatsapp, 'legal_name', s.legal_name, 'rccm', s.rccm, 'nif', s.nif,
             'address', s.address, 'email', s.email, 'refund_days', s.refund_days, 'apdp_number', s.apdp_number,
             'pixel_meta', s.pixel_meta, 'pixel_tiktok', s.pixel_tiktok),
    'products', coalesce((select json_agg(json_build_object(
             'id', p.id, 'name', p.name, 'description', p.description, 'price', p.price,
             'stock', p.stock, 'option_label', p.option_label, 'options', p.options, 'images', p.images,
             'offers', coalesce((select json_agg(json_build_object('quantity', o.quantity,
                          'bundle_price', o.bundle_price, 'free_shipping', o.free_shipping,
                          'highlight', o.highlight) order by o.quantity)
                        from product_offers o where o.product_id = p.id), '[]'::json))
             order by p.created_at desc)
           from products p where p.shop_id = s.id and p.active), '[]'::json),
    'zones', coalesce((select json_agg(json_build_object('id', z.id, 'city', z.city,
             'label', z.label, 'fee', z.fee, 'delay_days', z.delay_days, 'mode', z.mode,
             'carrier', (select d.company from transport_depots d where d.id = z.depot_id)) order by z.city, z.label)
           from delivery_zones z where z.shop_id = s.id and z.active), '[]'::json))
  from shops s where s.slug = p_slug
$$;

-- Passer commande. Le prix est recalculé ici : le client ne peut pas le modifier.
drop function if exists place_order(text, uuid, int, text, text, text, uuid, text, boolean, boolean);
create or replace function place_order(
  p_slug text, p_product uuid, p_quantity int, p_option text,
  p_name text, p_phone text, p_zone uuid, p_landmark text,
  p_optin boolean, p_ready boolean,
  p_lat double precision default null, p_lng double precision default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  s shops; p products; z delivery_zones; o product_offers;
  v_phone text; v_amount int; v_fee int; v_num int; v_order uuid;
begin
  if not coalesce(p_ready, false) then raise exception 'READY_REQUIRED'; end if;

  select * into s from shops where slug = p_slug for update;   -- verrou : numéros uniques
  if not found then raise exception 'SHOP_NOT_FOUND'; end if;

  select * into p from products where id = p_product and shop_id = s.id and active;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if p_option is null or not (p_option = any (p.options)) then raise exception 'BAD_OPTION'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then raise exception 'BAD_QUANTITY'; end if;

  select * into z from delivery_zones where id = p_zone and shop_id = s.id and active;
  if not found then raise exception 'BAD_ZONE'; end if;

  v_phone := normalize_ml_phone(p_phone);
  if v_phone is null then raise exception 'BAD_PHONE'; end if;
  if length(trim(coalesce(p_name, ''))) < 3 then raise exception 'BAD_NAME'; end if;
  if length(trim(coalesce(p_landmark, ''))) < 6 then raise exception 'BAD_LANDMARK'; end if;

  -- Anti-abus : 3 commandes max par numéro en 10 minutes.
  if (select count(*) from orders where shop_id = s.id and customer_phone = v_phone
        and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  select * into o from product_offers where product_id = p.id and quantity = p_quantity;
  if found then
    v_amount := o.bundle_price;
    v_fee := case when o.free_shipping then 0 else z.fee end;
  else
    v_amount := p.price * p_quantity;
    v_fee := z.fee;
  end if;

  update products set stock = stock - p_quantity where id = p.id and stock >= p_quantity;
  if not found then raise exception 'OUT_OF_STOCK'; end if;

  select coalesce(max(number), 1000) + 1 into v_num from orders where shop_id = s.id;

  -- Position GPS facultative : ignorée hors du Mali, si incomplète, et TOUJOURS pour les
  -- zones livrées par car (régions) : ces clients ne sont jamais géolocalisés.
  if z.mode = 'bus' or p_lat is null or p_lng is null
     or p_lat not between 10 and 25.5 or p_lng not between -12.5 and 4.5 then
    p_lat := null; p_lng := null;
  end if;

  insert into orders (shop_id, number, customer_name, customer_phone, zone_id, landmark,
                      marketing_optin, optin_at, ready_confirmed, shipping_fee, customer_lat, customer_lng,
                      depot_id)
  values (s.id, v_num, trim(p_name), v_phone, z.id, trim(p_landmark),
          coalesce(p_optin, false), case when p_optin then now() end, true, v_fee, p_lat, p_lng,
          case when z.mode = 'bus' then z.depot_id end)
  returning id into v_order;

  insert into order_items (order_id, product_id, product_name, option, quantity, amount, unit_cost)
  values (v_order, p.id, p.name, p_option, p_quantity, v_amount, p.cost);

  return json_build_object('number', v_num, 'total', v_amount + v_fee,
    'upsell', (select json_build_object('product_id', u.id, 'name', u.name,
                 'price', round(u.price * (100 - p.upsell_discount) / 100.0 / 500) * 500,
                 'regular_price', u.price)
               from products u where u.id = p.upsell_product_id and u.active and u.stock > 0
                 and u.id <> p.id));
end $$;

-- Ajouter l'offre en un clic (30 minutes max après la commande, même numéro).
create or replace function add_upsell(p_slug text, p_number int, p_phone text) returns json
language plpgsql security definer set search_path = public as $$
declare v_order orders; v_main order_items; v_src products; u products; v_price int;
begin
  select o.* into v_order from orders o join shops s on s.id = o.shop_id
  where s.slug = p_slug and o.number = p_number and o.customer_phone = normalize_ml_phone(p_phone)
    and o.status = 'a_appeler' and o.created_at > now() - interval '30 minutes'
  for update of o;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if exists (select 1 from order_items where order_id = v_order.id and is_upsell) then
    raise exception 'UPSELL_ALREADY_ADDED';
  end if;
  select * into v_main from order_items where order_id = v_order.id and not is_upsell limit 1;
  select * into v_src from products where id = v_main.product_id;
  select * into u from products where id = v_src.upsell_product_id and active;
  if not found then raise exception 'NO_UPSELL'; end if;
  v_price := (round(u.price * (100 - v_src.upsell_discount) / 100.0 / 500) * 500)::int;
  update products set stock = stock - 1 where id = u.id and stock >= 1;
  if not found then raise exception 'OUT_OF_STOCK'; end if;
  insert into order_items (order_id, product_id, product_name, option, quantity, amount, unit_cost, is_upsell)
  values (v_order.id, u.id, u.name, u.options[1], 1, v_price, u.cost, true);
  return json_build_object('number', v_order.number, 'total', order_total(v_order.id));
end $$;

-- Suivi par le client : numéro de commande + son téléphone.
create or replace function track_order(p_slug text, p_number int, p_phone text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('number', o.number, 'status', o.status, 'total', order_total(o.id),
    'items', (select json_agg(json_build_object('name', i.product_name, 'option', i.option,
                'quantity', i.quantity)) from order_items i where i.order_id = o.id))
  from orders o join shops s on s.id = o.shop_id
  where s.slug = p_slug and o.number = p_number and o.customer_phone = normalize_ml_phone(p_phone)
$$;

-- =====================================================================
--  FONCTIONS VENDEUR (compte connecté, propriétaire ou gérant)
-- =====================================================================
create or replace function create_shop(p_name text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_shop uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into shops (owner_id, name, slug) values (auth.uid(), trim(p_name), lower(p_slug))
  returning id into v_shop;
  insert into shop_members (shop_id, user_id, role, display_name, status)
  values (v_shop, auth.uid(), 'owner', trim(p_name), 'active');
  return v_shop;
end $$;

-- Appel sans réponse : au 3e essai, la commande est annulée (stock rendu).
create or replace function record_no_answer(p_order uuid) returns order_status
language plpgsql security invoker set search_path = public as $$
declare v_status order_status;
begin
  update orders
     set call_attempts = call_attempts + 1,
         status = case when call_attempts + 1 >= 3 then 'annulee'::order_status
                       else 'pas_reponse'::order_status end
   where id = p_order and status in ('a_appeler','pas_reponse','a_rappeler')
  returning status into v_status;
  if v_status is null then raise exception 'NOT_CALLABLE'; end if;
  return v_status;
end $$;

-- Inviter un livreur. Renvoie le code à 6 chiffres à lui envoyer (valable 7 jours).
create or replace function invite_driver(p_shop uuid, p_name text, p_phone text, p_area text,
                                         p_products uuid[] default null) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_member uuid;
begin
  if not is_shop_admin(p_shop) then raise exception 'FORBIDDEN'; end if;
  if normalize_ml_phone(p_phone) is null then raise exception 'BAD_PHONE'; end if;
  v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
  insert into shop_members (shop_id, role, display_name, phone, area, status, all_products,
                            invite_code_hash, invite_expires_at)
  values (p_shop, 'driver', trim(p_name), normalize_ml_phone(p_phone), p_area, 'invited',
          p_products is null, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), now() + interval '7 days')
  returning id into v_member;
  if p_products is not null then
    insert into driver_products (member_id, product_id)
    select v_member, pr.id from products pr where pr.id = any (p_products) and pr.shop_id = p_shop;
  end if;
  return v_code;
end $$;

-- Changer les produits d'un livreur (null = tous). Refusé s'il a un colis en cours concerné.
create or replace function set_driver_products(p_member uuid, p_products uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare m shop_members;
begin
  select * into m from shop_members where id = p_member and role = 'driver';
  if not found or not is_shop_admin(m.shop_id) then raise exception 'FORBIDDEN'; end if;
  if p_products is not null and cardinality(p_products) = 0 then raise exception 'EMPTY_PRODUCTS'; end if;
  if p_products is not null and exists (
       select 1 from orders o join order_items i on i.order_id = o.id
       where o.driver_id = p_member and o.status = 'en_route'
         and (i.product_id is null or not (i.product_id = any (p_products)))) then
    raise exception 'DELIVERY_IN_PROGRESS';
  end if;
  update shop_members set all_products = (p_products is null) where id = p_member;
  delete from driver_products where member_id = p_member;
  if p_products is not null then
    insert into driver_products (member_id, product_id)
    select p_member, pr.id from products pr where pr.id = any (p_products) and pr.shop_id = m.shop_id;
  end if;
end $$;

-- Retirer l'accès d'un livreur (refusé s'il a des colis en cours).
create or replace function remove_driver(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m shop_members;
begin
  select * into m from shop_members where id = p_member and role = 'driver';
  if not found or not is_shop_admin(m.shop_id) then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from orders where driver_id = p_member and status = 'en_route') then
    raise exception 'DELIVERY_IN_PROGRESS';
  end if;
  update shop_members set status = 'removed', user_id = null, invite_code_hash = null where id = p_member;
end $$;

-- Bénéfice réel sur une période (propriétaire uniquement).
create or replace function shop_profit(p_shop uuid, p_from date, p_to date) returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not is_shop_admin(p_shop) then raise exception 'FORBIDDEN'; end if;
  with o as (
    select * from orders where shop_id = p_shop and status in ('livree','refusee')
      and updated_at >= p_from and updated_at < p_to + 1
  ), d as (select * from o where status = 'livree')
  select json_build_object(
    'delivered', (select count(*) from d),
    'refused',   (select count(*) from o where status = 'refusee'),
    'sales',     coalesce((select sum(order_total(id)) from d), 0),
    'goods',     coalesce((select sum(i.unit_cost * i.quantity) from order_items i join d on d.id = i.order_id), 0),
    'drivers',   coalesce((select sum(z.driver_cost) from o join delivery_zones z on z.id = o.zone_id), 0),
    'ads',       coalesce((select sum(amount) from ad_spend where shop_id = p_shop
                             and week_start between p_from and p_to), 0),
    'cash_with_drivers', coalesce((select sum(order_total(id)) from orders
                             where shop_id = p_shop and status = 'livree' and not cash_remitted), 0)
  ) into r;
  return json_build_object('report', r,
    'net', (r->>'sales')::int - (r->>'goods')::int - (r->>'drivers')::int - (r->>'ads')::int);
end $$;

-- =====================================================================
--  FONCTIONS LIVREUR (seul accès du livreur aux données)
-- =====================================================================
create or replace function accept_invite(p_shop_slug text, p_phone text, p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_member uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update shop_members m
     set user_id = auth.uid(), status = 'active', invite_code_hash = null, invite_expires_at = null
    from shops s
   where s.id = m.shop_id and s.slug = p_shop_slug and m.role = 'driver'
     and m.phone = normalize_ml_phone(p_phone) and m.status = 'invited'
     and m.invite_expires_at > now()
     and m.invite_code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex')
  returning m.id into v_member;
  if v_member is null then raise exception 'INVITE_INVALID'; end if;
  return v_member;
end $$;

-- Ses colis : seulement les siens, seulement ses produits, montant par colis, pas de total.
-- Envoi par car : le livreur voit la gare où déposer le colis, rien à encaisser.
drop function if exists driver_deliveries();
create or replace function driver_deliveries()
returns table (order_id uuid, shop_name text, number int, customer_name text, customer_phone text,
               city text, zone_label text, landmark text, items json, amount_due int,
               status order_status, is_new boolean, unreachable_count int, created_at timestamptz,
               by_bus boolean, depot_company text, depot_label text, depot_lat double precision,
               depot_lng double precision, at_depot boolean, handed boolean)
language sql stable security definer set search_path = public as $$
  select o.id, s.name, o.number, o.customer_name, o.customer_phone, z.city, z.label, o.landmark,
         (select json_agg(json_build_object('name', i.product_name, 'option', i.option,
                  'quantity', i.quantity)) from order_items i where i.order_id = o.id),
         case when o.depot_id is null then order_total(o.id) else 0 end,
         o.status, not o.driver_seen, o.unreachable_count, o.created_at,
         o.depot_id is not null, d.company, d.label, d.lat, d.lng,
         o.at_depot_at is not null, o.handed_at is not null
  from orders o
  join shop_members m on m.id = o.driver_id
  join shops s on s.id = o.shop_id
  join delivery_zones z on z.id = o.zone_id
  left join transport_depots d on d.id = o.depot_id
  where m.user_id = auth.uid() and m.role = 'driver' and m.status = 'active'
    and driver_can_carry(m.id, o.id)
    and ((o.status = 'en_route' and o.handed_at is null)
         or (o.updated_at > now() - interval '24 hours'
             and (o.status in ('livree','refusee') or o.handed_at is not null)))
  order by (o.status <> 'en_route' or o.handed_at is not null), o.created_at
$$;

-- Résultat d'une livraison : livree | refusee | injoignable | vu | remis (au transporteur, avec n° de ticket)
drop function if exists driver_report(uuid, text);
create or replace function driver_report(p_order uuid, p_result text, p_ticket text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select o2.* into o from orders o2 join shop_members m on m.id = o2.driver_id
   where o2.id = p_order and m.user_id = auth.uid() and m.status = 'active'
     and o2.status = 'en_route' and o2.handed_at is null and driver_can_carry(m.id, o2.id);
  if not found then raise exception 'NOT_YOUR_DELIVERY'; end if;

  if p_result = 'remis' then
    if o.depot_id is null then raise exception 'NOT_A_BUS_ORDER'; end if;
    if length(trim(coalesce(p_ticket, ''))) < 2 then raise exception 'TICKET_REQUIRED'; end if;
    update orders set handed_at = now(), bus_ticket = trim(p_ticket), driver_seen = true where id = p_order;
  elsif p_result in ('livree','refusee') then
    -- Pour un envoi par car, c'est le vendeur qui confirme le retrait à la gare d'arrivée.
    if o.depot_id is not null then raise exception 'BUS_ORDER'; end if;
    update orders set status = p_result::order_status, driver_seen = true where id = p_order;
  elsif p_result = 'injoignable' then
    update orders set unreachable_count = unreachable_count + 1, driver_seen = true where id = p_order;
  elsif p_result = 'vu' then
    update orders set driver_seen = true where id = p_order;
  else
    raise exception 'BAD_RESULT';
  end if;
end $$;

-- Position du livreur, envoyée par l'app toutes les 30 secondes environ.
-- Enregistrée UNIQUEMENT s'il a au moins un colis en route ; sinon rien n'est gardé.
-- Si le livreur entre dans l'enceinte d'une gare (rayon), l'arrivée est enregistrée et signalée.
drop function if exists driver_ping(double precision, double precision, int);
create or replace function driver_ping(p_lat double precision, p_lng double precision,
                                       p_accuracy int default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_count int; v_arrived json;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_lat not between 10 and 25.5 or p_lng not between -12.5 and 4.5 then raise exception 'BAD_POSITION'; end if;
  insert into driver_locations (member_id, lat, lng, accuracy_m)
  select m.id, p_lat, p_lng, p_accuracy
  from shop_members m
  where m.user_id = auth.uid() and m.role = 'driver' and m.status = 'active'
    and exists (select 1 from orders o where o.driver_id = m.id and o.status = 'en_route');
  get diagnostics v_count = row_count;

  with arrived as (
    update orders o set at_depot_at = now()
      from shop_members m, transport_depots d
     where o.driver_id = m.id and m.user_id = auth.uid() and m.status = 'active'
       and o.status = 'en_route' and o.handed_at is null and o.at_depot_at is null
       and o.depot_id = d.id and distance_m(p_lat, p_lng, d.lat, d.lng) <= d.radius_m
    returning o.number, d.label
  )
  select coalesce(json_agg(json_build_object('number', number, 'depot', label)), '[]'::json)
    into v_arrived from arrived;

  delete from driver_locations d using shop_members m
   where d.member_id = m.id and m.user_id = auth.uid() and d.recorded_at < now() - interval '30 days';
  return json_build_object('tracked', v_count > 0, 'arrived_at_depot', v_arrived);
end $$;

-- Carte du vendeur : dernière position de chaque livreur en tournée et sa prochaine étape
-- (un client à Bamako, ou une gare pour un envoi par car).
drop function if exists shop_driver_positions(uuid);
create or replace function shop_driver_positions(p_shop uuid)
returns table (member_id uuid, driver_name text, lat double precision, lng double precision,
               recorded_at timestamptz, next_order int, next_customer text, next_landmark text,
               next_lat double precision, next_lng double precision, next_is_depot boolean,
               next_depot text, at_depot_since timestamptz, deliveries_left int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_shop_admin(p_shop) then raise exception 'FORBIDDEN'; end if;
  return query
  select m.id, m.display_name, l.lat, l.lng, l.recorded_at,
         nx.number, nx.customer_name, nx.landmark,
         coalesce(nx.dlat, nx.customer_lat), coalesce(nx.dlng, nx.customer_lng),
         nx.dlabel is not null, nx.dlabel, nx.at_depot_at,
         (select count(*)::int from orders o2 where o2.driver_id = m.id and o2.status = 'en_route' and o2.handed_at is null)
  from shop_members m
  join lateral (select d.lat, d.lng, d.recorded_at from driver_locations d
                where d.member_id = m.id order by d.recorded_at desc limit 1) l on true
  left join lateral (select o.number, o.customer_name, o.landmark, o.customer_lat, o.customer_lng,
                            o.at_depot_at, td.lat as dlat, td.lng as dlng, td.label as dlabel
                     from orders o left join transport_depots td on td.id = o.depot_id
                     where o.driver_id = m.id and o.status = 'en_route' and o.handed_at is null
                     order by o.created_at limit 1) nx on true
  where m.shop_id = p_shop and m.role = 'driver' and m.status = 'active'
    and l.recorded_at > now() - interval '15 minutes';
end $$;

-- Ses boutiques et son rôle (pour l'écran d'accueil de l'app)
create or replace function my_memberships()
returns table (member_id uuid, shop_id uuid, shop_name text, shop_slug text, role member_role)
language sql stable security definer set search_path = public as $$
  select m.id, s.id, s.name, s.slug, m.role
  from shop_members m join shops s on s.id = m.shop_id
  where m.user_id = auth.uid() and m.status = 'active'
$$;

-- =====================================================================
--  SÉCURITÉ PAR LIGNE (RLS) : chaque boutique ne voit que ses données
-- =====================================================================
alter table shops              enable row level security;
alter table shop_members       enable row level security;
alter table products           enable row level security;
alter table product_offers     enable row level security;
alter table driver_products    enable row level security;
alter table delivery_zones     enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table order_events       enable row level security;
alter table ad_spend           enable row level security;
alter table driver_locations   enable row level security;
alter table transport_depots   enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists shops_admin on shops;
create policy shops_admin on shops for all to authenticated
  using (is_shop_admin(id)) with check (is_shop_admin(id));

drop policy if exists members_admin on shop_members;
create policy members_admin on shop_members for all to authenticated
  using (is_shop_admin(shop_id)) with check (is_shop_admin(shop_id));

drop policy if exists products_admin on products;
create policy products_admin on products for all to authenticated
  using (is_shop_admin(shop_id)) with check (is_shop_admin(shop_id));

drop policy if exists offers_admin on product_offers;
create policy offers_admin on product_offers for all to authenticated
  using (exists (select 1 from products p where p.id = product_id and is_shop_admin(p.shop_id)))
  with check (exists (select 1 from products p where p.id = product_id and is_shop_admin(p.shop_id)));

drop policy if exists driver_products_admin on driver_products;
create policy driver_products_admin on driver_products for all to authenticated
  using (exists (select 1 from shop_members m where m.id = member_id and is_shop_admin(m.shop_id)))
  with check (exists (select 1 from shop_members m where m.id = member_id and is_shop_admin(m.shop_id)));

drop policy if exists zones_admin on delivery_zones;
create policy zones_admin on delivery_zones for all to authenticated
  using (is_shop_admin(shop_id)) with check (is_shop_admin(shop_id));

drop policy if exists orders_admin on orders;
create policy orders_admin on orders for all to authenticated
  using (is_shop_admin(shop_id)) with check (is_shop_admin(shop_id));

drop policy if exists items_admin on order_items;
create policy items_admin on order_items for all to authenticated
  using (exists (select 1 from orders o where o.id = order_id and is_shop_admin(o.shop_id)))
  with check (exists (select 1 from orders o where o.id = order_id and is_shop_admin(o.shop_id)));

drop policy if exists events_admin on order_events;
create policy events_admin on order_events for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id and is_shop_admin(o.shop_id)));

drop policy if exists ads_admin on ad_spend;
create policy ads_admin on ad_spend for all to authenticated
  using (is_shop_admin(shop_id)) with check (is_shop_admin(shop_id));

drop policy if exists depots_admin on transport_depots;
create policy depots_admin on transport_depots for all to authenticated
  using (is_shop_admin(shop_id)) with check (is_shop_admin(shop_id));

drop policy if exists locations_admin on driver_locations;
create policy locations_admin on driver_locations for select to authenticated
  using (exists (select 1 from shop_members m where m.id = member_id and is_shop_admin(m.shop_id)));

drop policy if exists push_own on push_subscriptions;
create policy push_own on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Droits ----------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
grant execute on function store_get(text), track_order(text, int, text),
  place_order(text, uuid, int, text, text, text, uuid, text, boolean, boolean, double precision, double precision),
  add_upsell(text, int, text) to anon, authenticated;
grant execute on function driver_ping(double precision, double precision, int),
  shop_driver_positions(uuid) to authenticated;
grant execute on function create_shop(text, text), record_no_answer(uuid),
  invite_driver(uuid, text, text, text, uuid[]), set_driver_products(uuid, uuid[]),
  remove_driver(uuid), shop_profit(uuid, date, date), accept_invite(text, text, text),
  driver_deliveries(), driver_report(uuid, text, text), my_memberships(),
  is_shop_admin(uuid), order_total(uuid), normalize_ml_phone(text) to authenticated;

-- Temps réel : le tableau de bord reçoit les nouvelles commandes instantanément.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table orders;
  end if;
exception when duplicate_object then null; end $$;

-- Photos des produits : dossier public « produits », un sous-dossier par boutique (shop_id/...).
-- Seul le propriétaire ou le gérant peut ajouter ou supprimer des photos de sa boutique.
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $q$insert into storage.buckets (id, name, public) values ('produits', 'produits', true)
               on conflict (id) do nothing$q$;
    execute $q$drop policy if exists produits_admin_write on storage.objects$q$;
    execute $q$create policy produits_admin_write on storage.objects for insert to authenticated
               with check (bucket_id = 'produits' and public.is_shop_admin(((storage.foldername(name))[1])::uuid))$q$;
    execute $q$drop policy if exists produits_admin_delete on storage.objects$q$;
    execute $q$create policy produits_admin_delete on storage.objects for delete to authenticated
               using (bucket_id = 'produits' and public.is_shop_admin(((storage.foldername(name))[1])::uuid))$q$;
  end if;
end $$;
