# Walmal Sport Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the storefront as WALMAL SPORT — dark theme, red accent, rebuilt homepage — with the Spring backend catalog reseeded in place as a sports catalog.

**Architecture:** Two phases with a hard ordering constraint. Phase A (walmal repo): Flyway `V17` renames the seeded catalog in place (same UUIDs/prices) and adds ~10 sports products; new PIL-generated product images seeded to MinIO. Phase B (walmal-store repo): shadcn tokens retargeted to the dark sport palette (all pages inherit), new fonts, rebuilt header/footer/homepage, mobile chrome (drawer + bottom tabs), local-only wishlist + `/saved` page, and `?category=<slug>` support on the listing page.

**Tech Stack:** Next.js App Router, Tailwind v4 + shadcn tokens, `next/font/google` (Anton, Archivo, Public Sans), Zustand persist, sonner (new), Spring Boot + Flyway + PostgreSQL, MinIO, Python/PIL, Playwright.

**Reference documents (read before starting):**
- Spec: `docs/superpowers/specs/2026-07-17-walmal-sport-reskin-design.md`
- Desktop wireframe: `docs/superpowers/specs/assets/walmal-sport-desktop-wireframe.html`
- Mobile wireframe: `docs/superpowers/specs/assets/walmal-sport-mobile-wireframe.html`

**Repo paths:** store = `C:/YHA/006_Claude_Workspace/walmal-store`, backend = `C:/YHA/006_Claude_Workspace/walmal`.

**Non-negotiable invariants (from spec):**
- Variant UUIDs `20000000-…-0001`/`-0002` keep their UUIDs and prices ($1,199.99 / $1,419.99).
- The `?q=` search param contract on `/products` is unchanged.
- Auth UI texts ("Sign in", "Register", "Hi, {username}", "Sign out") and `data-testid="product-card"` / `product-card-link` are preserved.
- `V9`'s `order_items` snapshot row ("Galaxy S24 Ultra 256GB Black") is a historical snapshot — do NOT touch it.
- KB/README files change in the same commit as the code they describe.

---

## Catalog mapping (single source of truth for Phase A)

Categories (UPDATE in place):

| UUID | Was | Becomes | slug | parent_id |
|---|---|---|---|---|
| `c0…-0011` | Smartphones | Boots | `boots` | NULL |
| `c0…-0012` | Laptops | Equipment | `equipment` | NULL |
| `c0…-0021` | T-Shirts | Jerseys | `jerseys` | NULL |
| `c0…-0022` | Jeans | Teamwear | `teamwear` | NULL |
| `c0…-0001` | Electronics | (deactivate, `is_active=FALSE`) | keep | keep |
| `c0…-0002` | Apparel | (deactivate, `is_active=FALSE`) | keep | keep |

Existing products (UPDATE in place — UUIDs/prices/barcodes unchanged):

| Product UUID | Was | Becomes | Brand | Category |
|---|---|---|---|---|
| `10…-0001` | Galaxy S24 Ultra | Velocity Elite FG Boot | Walmal Pro | Boots |
| `10…-0002` | iPhone 16 Pro | Phantom Strike FG Boot | Walmal Pro | Boots |
| `10…-0003` | MacBook Pro 14" | Pro Match Goal — Full Size | Walmal Sport | Equipment |
| `10…-0004` | Classic Crew Tee | Harbour City FC Fan Tee | Harbour City FC | Jerseys |
| `10…-0005` | Slim Fit Jeans | DNA Training Pants | Walmal Pro | Teamwear |

Test-critical variants: `20…-0001` → `WP-VELO-LE-UK9` "Velocity Elite LE UK 9 Chaos Red" ($1,199.99); `20…-0002` → `WP-VELO-LE-UK9G` "Velocity Elite LE UK 9 Gold Limited" ($1,419.99). Limited-edition colorway pricing keeps the price plausible.

New products `10…-0006` … `10…-0015` (variants `20…-0010`+, prices `30…-0010`+ aligned to variant numbers, stock `40…-0021`+, movements `50…-0010`+): full SQL in Task A1.

---

# PHASE A — Backend reseed (walmal repo)

### Task A1: V17 migration

**Files:**
- Create: `walmal/walmal-app/src/main/resources/db/migration/V17__reseed_sports_catalog.sql`

- [ ] **Step A1.1: Write the migration file** with exactly this content:

```sql
-- =============================================================================
-- Migration : V17__reseed_sports_catalog.sql
-- Date      : 2026-07-17
-- Description:
--   Rebrands the seeded dev catalog as WALMAL SPORT (sports store). Existing
--   category/product/variant UUIDs and all prices are preserved (E2E + k6
--   depend on them); names, slugs, descriptions, brands, SKUs and attributes
--   are rewritten. Adds 10 new sports products with variants/prices/stock.
--   The order_items snapshot from V9 is intentionally untouched (historical).
-- =============================================================================

-- ── Categories: flatten to a 4-node sports taxonomy ──────────────────────────
UPDATE product_categories SET name='Boots',     slug='boots',     parent_id=NULL, updated_at=NOW() WHERE id='c0000000-0000-0000-0000-000000000011';
UPDATE product_categories SET name='Equipment', slug='equipment', parent_id=NULL, updated_at=NOW() WHERE id='c0000000-0000-0000-0000-000000000012';
UPDATE product_categories SET name='Jerseys',   slug='jerseys',   parent_id=NULL, updated_at=NOW() WHERE id='c0000000-0000-0000-0000-000000000021';
UPDATE product_categories SET name='Teamwear',  slug='teamwear',  parent_id=NULL, updated_at=NOW() WHERE id='c0000000-0000-0000-0000-000000000022';
UPDATE product_categories SET is_active=FALSE, updated_at=NOW() WHERE id IN
    ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002');

-- ── Existing products → sports products (same UUIDs) ─────────────────────────
UPDATE product_products SET
    category_id='c0000000-0000-0000-0000-000000000011',
    name='Velocity Elite FG Boot', slug='velocity-elite-fg-boot',
    description='Limited-edition featherweight speed boot. Carbon soleplate, hand-finished knit upper.',
    brand='Walmal Pro',
    updated_at=NOW()
WHERE id='10000000-0000-0000-0000-000000000001';

UPDATE product_products SET
    category_id='c0000000-0000-0000-0000-000000000011',
    name='Phantom Strike FG Boot', slug='phantom-strike-fg-boot',
    description='Elite firm-ground boot with asymmetric lacing and grippy strike zone.',
    brand='Walmal Pro',
    updated_at=NOW()
WHERE id='10000000-0000-0000-0000-000000000002';

UPDATE product_products SET
    category_id='c0000000-0000-0000-0000-000000000012',
    name='Pro Match Goal — Full Size', slug='pro-match-goal',
    description='Full-size aluminium match goal, weatherproof net included. FIFA-spec dimensions.',
    brand='Walmal Sport',
    updated_at=NOW()
WHERE id='10000000-0000-0000-0000-000000000003';

UPDATE product_products SET
    category_id='c0000000-0000-0000-0000-000000000021',
    name='Harbour City FC Fan Tee', slug='harbour-city-fan-tee',
    description='100% cotton supporter tee in club colours. Unisex fit.',
    brand='Harbour City FC',
    updated_at=NOW()
WHERE id='10000000-0000-0000-0000-000000000004';

UPDATE product_products SET
    category_id='c0000000-0000-0000-0000-000000000022',
    name='DNA Training Pants', slug='dna-training-pants',
    description='Slim training pants with stretch panels and zipped ankles.',
    brand='Walmal Pro',
    updated_at=NOW()
WHERE id='10000000-0000-0000-0000-000000000005';

-- ── Existing variants → sports variants (same UUIDs, prices untouched) ───────
UPDATE product_variants SET sku='WP-VELO-LE-UK9',  name='Velocity Elite LE UK 9 Chaos Red',    attributes='{"size":"UK 9","color":"Chaos Red"}'   , updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000001';
UPDATE product_variants SET sku='WP-VELO-LE-UK9G', name='Velocity Elite LE UK 9 Gold Limited', attributes='{"size":"UK 9","color":"Gold Limited"}', updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000002';
UPDATE product_variants SET sku='WP-PHTM-UK8-BLK', name='Phantom Strike UK 8 Black',           attributes='{"size":"UK 8","color":"Black"}'       , updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000003';
UPDATE product_variants SET sku='WP-PHTM-UK9-BLK', name='Phantom Strike UK 9 Black',           attributes='{"size":"UK 9","color":"Black"}'       , updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000004';
UPDATE product_variants SET sku='WS-GOAL-FS-ALU',  name='Pro Match Goal Full Size Aluminium',  attributes='{"size":"Full Size","color":"Aluminium"}', updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000005';
UPDATE product_variants SET sku='HC-FTEE-M-WHT',   name='Fan Tee M White',                     attributes='{"size":"M","color":"White"}'          , updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000006';
UPDATE product_variants SET sku='HC-FTEE-L-BLK',   name='Fan Tee L Black',                     attributes='{"size":"L","color":"Black"}'          , updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000007';
UPDATE product_variants SET sku='WP-DNAP-32-NVY',  name='DNA Training Pants 32 Navy',          attributes='{"size":"32","color":"Navy"}'          , updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000008';
UPDATE product_variants SET sku='WP-DNAP-34-BLK',  name='DNA Training Pants 34 Black',         attributes='{"size":"34","color":"Black"}'         , updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000009';

-- ── Drop seed-era product images (script re-seeds sports art afterwards) ─────
-- MinIO objects become orphans; acceptable for dev data.
DELETE FROM product_images WHERE product_id IN (
    '10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005');

-- ── New products ─────────────────────────────────────────────────────────────
INSERT INTO product_products (id, category_id, name, slug, description, brand, status) VALUES
    ('10000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000021',
     'Harbour City FC 26/27 Home Jersey','hc-home-jersey-26-27',
     'Official 26/27 home jersey. Sweat-wicking match fabric, embroidered crest.','Harbour City FC','ACTIVE'),
    ('10000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000021',
     'Harbour City FC 26/27 Away Jersey','hc-away-jersey-26-27',
     'Official 26/27 away jersey in storm white with harbour-teal trim.','Harbour City FC','ACTIVE'),
    ('10000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000021',
     'Riverside United 26/27 Home Jersey','ru-home-jersey-26-27',
     'Official 26/27 home jersey. Classic riverside green with gold piping.','Riverside United','ACTIVE'),
    ('10000000-0000-0000-0000-000000000009','c0000000-0000-0000-0000-000000000021',
     'National Team Authentic Home Jersey','national-authentic-home-jersey',
     'Player-issue authentic jersey. Laser-cut ventilation, athletic cut.','National Team','ACTIVE'),
    ('10000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000011',
     'Aero Knit Speed Boot','aero-knit-speed-boot',
     'Ultra-light knit speed boot for explosive acceleration.','Walmal Pro','ACTIVE'),
    ('10000000-0000-0000-0000-000000000011','c0000000-0000-0000-0000-000000000011',
     'Velocity Pro AG Boot','velocity-pro-ag-boot',
     'Artificial-grass version of the Velocity line. Hollow studs, stable chassis.','Walmal Pro','ACTIVE'),
    ('10000000-0000-0000-0000-000000000012','c0000000-0000-0000-0000-000000000012',
     '26/27 Official Match Ball','official-match-ball-26-27',
     'FIFA Quality Pro certified thermally-bonded match ball.','Walmal Sport','ACTIVE'),
    ('10000000-0000-0000-0000-000000000013','c0000000-0000-0000-0000-000000000012',
     'Grip Training Socks','grip-training-socks',
     'Anti-slip grip socks with cushioned sole and arch support.','Walmal Sport','ACTIVE'),
    ('10000000-0000-0000-0000-000000000014','c0000000-0000-0000-0000-000000000012',
     'Lite Carbon Shinguards','lite-carbon-shinguards',
     'Featherweight carbon-shell shinguards with EVA backing.','Walmal Pro','ACTIVE'),
    ('10000000-0000-0000-0000-000000000015','c0000000-0000-0000-0000-000000000022',
     'DNA Training Polo','dna-training-polo',
     'Club training polo in breathable pique with contrast collar.','Harbour City FC','ACTIVE')
ON CONFLICT DO NOTHING;

-- ── New variants ─────────────────────────────────────────────────────────────
INSERT INTO product_variants (id, product_id, sku, name, barcode, attributes, status) VALUES
    ('20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000006','HC-HOME-S', 'HC Home Jersey S', NULL,'{"size":"S"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000006','HC-HOME-M', 'HC Home Jersey M', NULL,'{"size":"M"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000006','HC-HOME-L', 'HC Home Jersey L', NULL,'{"size":"L"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000007','HC-AWAY-M', 'HC Away Jersey M', NULL,'{"size":"M"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000007','HC-AWAY-L', 'HC Away Jersey L', NULL,'{"size":"L"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000008','RU-HOME-M', 'RU Home Jersey M', NULL,'{"size":"M"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-000000000008','RU-HOME-L', 'RU Home Jersey L', NULL,'{"size":"L"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000009','NT-AUTH-M', 'National Authentic M', NULL,'{"size":"M"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000018','10000000-0000-0000-0000-000000000009','NT-AUTH-L', 'National Authentic L', NULL,'{"size":"L"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000019','10000000-0000-0000-0000-000000000010','WP-AERO-UK8', 'Aero Knit UK 8', NULL,'{"size":"UK 8","color":"White"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000020','10000000-0000-0000-0000-000000000010','WP-AERO-UK9', 'Aero Knit UK 9', NULL,'{"size":"UK 9","color":"White"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000010','WP-AERO-UK10','Aero Knit UK 10', NULL,'{"size":"UK 10","color":"White"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000011','WP-VPAG-UK9', 'Velocity Pro AG UK 9', NULL,'{"size":"UK 9","color":"Chaos Red"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000023','10000000-0000-0000-0000-000000000011','WP-VPAG-UK10','Velocity Pro AG UK 10', NULL,'{"size":"UK 10","color":"Chaos Red"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000024','10000000-0000-0000-0000-000000000012','WS-BALL-S5', 'Match Ball Size 5', NULL,'{"size":"Size 5"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000025','10000000-0000-0000-0000-000000000013','WS-SOCK-M', 'Grip Socks M', NULL,'{"size":"M","color":"Black"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000026','10000000-0000-0000-0000-000000000013','WS-SOCK-L', 'Grip Socks L', NULL,'{"size":"L","color":"Black"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000027','10000000-0000-0000-0000-000000000014','WP-SHIN-S', 'Carbon Shinguards S', NULL,'{"size":"S"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000028','10000000-0000-0000-0000-000000000014','WP-SHIN-M', 'Carbon Shinguards M', NULL,'{"size":"M"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000029','10000000-0000-0000-0000-000000000015','HC-POLO-M', 'DNA Polo M', NULL,'{"size":"M","color":"Navy"}','ACTIVE'),
    ('20000000-0000-0000-0000-000000000030','10000000-0000-0000-0000-000000000015','HC-POLO-L', 'DNA Polo L', NULL,'{"size":"L","color":"Navy"}','ACTIVE')
ON CONFLICT DO NOTHING;

-- ── New prices (price id suffix aligned to variant id suffix) ────────────────
INSERT INTO product_prices (id, variant_id, amount, currency) VALUES
    ('30000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000010',115.00,'USD'),
    ('30000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011',115.00,'USD'),
    ('30000000-0000-0000-0000-000000000012','20000000-0000-0000-0000-000000000012',115.00,'USD'),
    ('30000000-0000-0000-0000-000000000013','20000000-0000-0000-0000-000000000013',115.00,'USD'),
    ('30000000-0000-0000-0000-000000000014','20000000-0000-0000-0000-000000000014',115.00,'USD'),
    ('30000000-0000-0000-0000-000000000015','20000000-0000-0000-0000-000000000015',115.00,'USD'),
    ('30000000-0000-0000-0000-000000000016','20000000-0000-0000-0000-000000000016',115.00,'USD'),
    ('30000000-0000-0000-0000-000000000017','20000000-0000-0000-0000-000000000017',189.00,'USD'),
    ('30000000-0000-0000-0000-000000000018','20000000-0000-0000-0000-000000000018',189.00,'USD'),
    ('30000000-0000-0000-0000-000000000019','20000000-0000-0000-0000-000000000019',349.00,'USD'),
    ('30000000-0000-0000-0000-000000000020','20000000-0000-0000-0000-000000000020',349.00,'USD'),
    ('30000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021',349.00,'USD'),
    ('30000000-0000-0000-0000-000000000022','20000000-0000-0000-0000-000000000022',319.00,'USD'),
    ('30000000-0000-0000-0000-000000000023','20000000-0000-0000-0000-000000000023',319.00,'USD'),
    ('30000000-0000-0000-0000-000000000024','20000000-0000-0000-0000-000000000024', 79.00,'USD'),
    ('30000000-0000-0000-0000-000000000025','20000000-0000-0000-0000-000000000025', 22.00,'USD'),
    ('30000000-0000-0000-0000-000000000026','20000000-0000-0000-0000-000000000026', 22.00,'USD'),
    ('30000000-0000-0000-0000-000000000027','20000000-0000-0000-0000-000000000027', 45.00,'USD'),
    ('30000000-0000-0000-0000-000000000028','20000000-0000-0000-0000-000000000028', 45.00,'USD'),
    ('30000000-0000-0000-0000-000000000029','20000000-0000-0000-0000-000000000029', 50.00,'USD'),
    ('30000000-0000-0000-0000-000000000030','20000000-0000-0000-0000-000000000030', 50.00,'USD')
ON CONFLICT DO NOTHING;

-- ── New stock at Main Warehouse (a0…-0001) ───────────────────────────────────
INSERT INTO inventory_stock (id, variant_id, location_id, available_quantity, reserved_quantity, low_stock_threshold) VALUES
    ('40000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000001',120,0,20),
    ('40000000-0000-0000-0000-000000000022','20000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000001',150,0,20),
    ('40000000-0000-0000-0000-000000000023','20000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000001',150,0,20),
    ('40000000-0000-0000-0000-000000000024','20000000-0000-0000-0000-000000000013','a0000000-0000-0000-0000-000000000001',100,0,15),
    ('40000000-0000-0000-0000-000000000025','20000000-0000-0000-0000-000000000014','a0000000-0000-0000-0000-000000000001',100,0,15),
    ('40000000-0000-0000-0000-000000000026','20000000-0000-0000-0000-000000000015','a0000000-0000-0000-0000-000000000001', 90,0,15),
    ('40000000-0000-0000-0000-000000000027','20000000-0000-0000-0000-000000000016','a0000000-0000-0000-0000-000000000001', 90,0,15),
    ('40000000-0000-0000-0000-000000000028','20000000-0000-0000-0000-000000000017','a0000000-0000-0000-0000-000000000001', 60,0,10),
    ('40000000-0000-0000-0000-000000000029','20000000-0000-0000-0000-000000000018','a0000000-0000-0000-0000-000000000001', 60,0,10),
    ('40000000-0000-0000-0000-000000000030','20000000-0000-0000-0000-000000000019','a0000000-0000-0000-0000-000000000001', 40,0,8),
    ('40000000-0000-0000-0000-000000000031','20000000-0000-0000-0000-000000000020','a0000000-0000-0000-0000-000000000001', 40,0,8),
    ('40000000-0000-0000-0000-000000000032','20000000-0000-0000-0000-000000000021','a0000000-0000-0000-0000-000000000001', 40,0,8),
    ('40000000-0000-0000-0000-000000000033','20000000-0000-0000-0000-000000000022','a0000000-0000-0000-0000-000000000001', 35,0,8),
    ('40000000-0000-0000-0000-000000000034','20000000-0000-0000-0000-000000000023','a0000000-0000-0000-0000-000000000001', 35,0,8),
    ('40000000-0000-0000-0000-000000000035','20000000-0000-0000-0000-000000000024','a0000000-0000-0000-0000-000000000001',200,0,30),
    ('40000000-0000-0000-0000-000000000036','20000000-0000-0000-0000-000000000025','a0000000-0000-0000-0000-000000000001',300,0,50),
    ('40000000-0000-0000-0000-000000000037','20000000-0000-0000-0000-000000000026','a0000000-0000-0000-0000-000000000001',300,0,50),
    ('40000000-0000-0000-0000-000000000038','20000000-0000-0000-0000-000000000027','a0000000-0000-0000-0000-000000000001', 80,0,15),
    ('40000000-0000-0000-0000-000000000039','20000000-0000-0000-0000-000000000028','a0000000-0000-0000-0000-000000000001', 80,0,15),
    ('40000000-0000-0000-0000-000000000040','20000000-0000-0000-0000-000000000029','a0000000-0000-0000-0000-000000000001',110,0,20),
    ('40000000-0000-0000-0000-000000000041','20000000-0000-0000-0000-000000000030','a0000000-0000-0000-0000-000000000001',110,0,20)
ON CONFLICT DO NOTHING;

-- ── Receipt movements for the new stock ──────────────────────────────────────
INSERT INTO inventory_movements (id, variant_id, location_id, movement_type, quantity_delta, performed_by)
SELECT ('50000000-0000-0000-0000-0000000000' || LPAD((9 + row_number() OVER (ORDER BY s.id))::text, 2, '0'))::uuid,
       s.variant_id, s.location_id, 'RECEIPT', s.available_quantity, 'seed-migration-v17'
FROM inventory_stock s
WHERE s.id::text >= '40000000-0000-0000-0000-000000000021'
  AND s.id::text <= '40000000-0000-0000-0000-000000000041'
ON CONFLICT DO NOTHING;
```

- [ ] **Step A1.2: Rebuild the JAR** (CRITICAL — stale-JAR gotcha):

Run: `cd C:/YHA/006_Claude_Workspace/walmal && ./mvnw -pl walmal-app -am -DskipTests clean package`
Expected: `BUILD SUCCESS`

- [ ] **Step A1.3: Start infra + backend with test profile:**

```bash
cd C:/YHA/006_Claude_Workspace/walmal && docker compose up -d --wait
java -Dspring.profiles.active=test -jar walmal-app/target/walmal-app-0.1.0-SNAPSHOT.jar   # background task
```
Wait until `curl -s http://localhost:8080/actuator/health` returns `{"status":"UP"}`. Flyway applies V17 on boot; check the log line `Migrating schema ... to version "17 - reseed sports catalog"`.

- [ ] **Step A1.4: Flush the Redis category-tree cache** (30-min TTL, never evicted by Flyway):

Run: `docker exec walmal-redis redis-cli --scan --pattern "*category*"` to confirm the exact key (expected: `product:category:tree`), then `docker exec walmal-redis redis-cli DEL "product:category:tree"`.
Expected: `(integer) 1` (or `0` if the cache was cold — both fine).

- [ ] **Step A1.5: Verify via API:**

```bash
curl -s http://localhost:8080/api/v1/product/categories          # expect 4 roots active:true (Boots/Equipment/Jerseys/Teamwear) + Electronics/Apparel active:false
curl -s "http://localhost:8080/api/v1/product/search?q=&page=0&size=20"   # expect 15 products, sports names, no Galaxy/iPhone
curl -s "http://localhost:8080/api/v1/product/search?q=velocity"          # expect Velocity Elite FG Boot + Velocity Pro AG Boot
```
Also verify prices survived: `docker exec walmal-postgres psql -U walmal -d walmal -c "SELECT amount FROM product_prices WHERE variant_id IN ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')"` → `1199.99`, `1419.99`.

Do NOT commit yet — Phase A commits once, in Task A3 (KB same-commit rule).

### Task A2: Sports product images

**Files:**
- Create: `walmal/scripts/generate-seed-images.py`
- Create: `walmal/scripts/seed-images/*.png` (15 files, generated)
- Delete: the 5 old PNGs in `walmal/scripts/seed-images/`
- Modify: `walmal/scripts/seed-product-images.ps1` (product→file map + docstring)

- [ ] **Step A2.1: Write `walmal/scripts/generate-seed-images.py`.** PIL is available (`python -c "from PIL import Image"` works). Requirements:
  - Output 1200×1200 PNGs into `scripts/seed-images/`, background `#f1f1ee` (matches the white product-tile image well in the design).
  - Flat-illustration style: large simple geometric silhouettes, no text, 3–4 colors per image. Palette anchors: red `#e0281b`, near-black `#141418`, white `#ffffff`, teal `#1f6f6b` (Harbour City), green `#2e7d4f` (Riverside), navy `#22304a`, gold `#e0a615`.
  - One drawing function per product type: boot silhouette (side profile polygon + sole + studs), jersey (torso + sleeves + collar, club colors, contrasting trim), tee (same shape, simpler), polo (jersey + collar rectangle), pants (two tapered legs), goal (frame rectangles + net grid lines), ball (circle + classic pentagon patches), socks (two L-shaped tubes + grip dots), shinguard (two rounded-vertical shells).
  - Filenames exactly: `velocity-elite-fg-boot.png`, `phantom-strike-fg-boot.png`, `pro-match-goal.png`, `harbour-city-fan-tee.png`, `dna-training-pants.png`, `hc-home-jersey.png`, `hc-away-jersey.png`, `riverside-home-jersey.png`, `national-authentic-jersey.png`, `aero-knit-speed-boot.png`, `velocity-pro-ag-boot.png`, `match-ball.png`, `grip-training-socks.png`, `lite-carbon-shinguards.png`, `dna-training-polo.png`.
  - Vary colors between the two Velocity boots (Chaos Red vs red/gold), Aero (white/grey), Phantom (black).

- [ ] **Step A2.2: Generate and eyeball:**

Run: `cd C:/YHA/006_Claude_Workspace/walmal && python scripts/generate-seed-images.py`
Then Read 3–4 of the PNGs (they render as images) and confirm they look like flat sports illustrations, not noise. Delete the 5 old electronics/apparel PNGs.

- [ ] **Step A2.3: Update `seed-product-images.ps1`:** replace the `$Products` ordered map with all 15 productId→filename pairs (IDs `10…-0001` … `10…-0015` per the catalog mapping table) and update the docstring (5 → 15 products, V17 reference).

- [ ] **Step A2.4: Run the seeder and verify:**

Run: `powershell -ExecutionPolicy Bypass -File C:/YHA/006_Claude_Workspace/walmal/scripts/seed-product-images.ps1`
Expected: 15 uploads (the V17 `DELETE FROM product_images` cleared the old primaries, so the renamed 5 re-seed too).
Verify: `curl -s "http://localhost:8080/api/v1/product/search?q=&page=0&size=20"` → every product has non-null `primaryImageUrl`.

### Task A3: Backend KB/README + single Phase A commit

**Files:**
- Modify: `walmal/docs/kb/*.md` wherever seeded catalog facts appear (grep for `Galaxy`, `S24`, `Smartphones`, `SAM-S24U`, `Electronics`)
- Modify: `walmal/docs/kb/SYSTEM.md` (test-profile seeded variant names/SKUs)
- Modify: `walmal/README.md` if it claims catalog facts (grep same terms)

- [ ] **Step A3.1:** `grep -ri "galaxy\|S24\|smartphone\|SAM-S24U" C:/YHA/006_Claude_Workspace/walmal/docs C:/YHA/006_Claude_Workspace/walmal/README.md` and update every hit: same UUIDs/prices, new names (`Velocity Elite FG Boot`, SKU `WP-VELO-LE-UK9` / `WP-VELO-LE-UK9G`), 4-category sports taxonomy, 15 products, V17 reference, Redis `product:category:tree` flush caveat.
- [ ] **Step A3.2: Commit everything from Phase A in one commit:**

```bash
cd C:/YHA/006_Claude_Workspace/walmal
git add walmal-app/src/main/resources/db/migration/V17__reseed_sports_catalog.sql scripts/ docs/ README.md
git commit -m "feat(catalog): reseed dev catalog as Walmal Sport — V17 in-place rename + 10 sports products, seed images, KB

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

# PHASE B — Storefront (walmal-store repo)

### Task B1: Fonts + design tokens

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step B1.1: `layout.tsx`** — replace Inter with the three fonts as CSS variables and update metadata:

```tsx
import type { Metadata } from 'next'
import { Anton, Archivo, Public_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })
const archivo = Archivo({ weight: ['500', '600', '700', '800', '900'], subsets: ['latin'], variable: '--font-archivo' })
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })

export const metadata: Metadata = {
  title: { default: 'Walmal Sport', template: '%s | Walmal Sport' },
  description: 'Match kits, elite boots and training gear.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${publicSans.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step B1.2: `globals.css`** — in `@theme inline` set `--font-sans: var(--font-public-sans)`, `--font-heading: var(--font-anton)`, and add `--font-label: var(--font-archivo)`. Replace the whole `:root` block's color values with (keep the structural/radius/sidebar lines; sidebar can mirror card/background):

```css
:root {
  --background: #0c0c0e;
  --foreground: #f4f4f2;
  --card: #141418;
  --card-foreground: #f4f4f2;
  --popover: #141418;
  --popover-foreground: #f4f4f2;
  --primary: #e0281b;
  --primary-foreground: #ffffff;
  --secondary: #17171b;
  --secondary-foreground: #f4f4f2;
  --muted: #17171b;
  --muted-foreground: #9a9a9f;
  --accent: #17171b;
  --accent-foreground: #f4f4f2;
  --destructive: #e0281b;
  --border: #1e1e22;
  --input: #26262c;
  --ring: #e0281b;
  --radius: 0.625rem;
}
```

Delete the entire `.dark { … }` block and the `@custom-variant dark` line. Add utilities at the end:

```css
@layer utilities {
  .display-heading {
    font-family: var(--font-heading);
    text-transform: uppercase;
    line-height: 0.92;
    letter-spacing: 0.02em;
  }
  .label-caps {
    font-family: var(--font-label);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}
```

Note: chart-* and sidebar-* vars are unused by the storefront — set them to sensible dark values or leave; do not delete the `@theme inline` mappings.

- [ ] **Step B1.3: Verify:** `npm run dev` (port 3000), load `/`, `/products`, `/login`. Expect dark background, light text everywhere, red primary buttons; product cards may look odd until B7 — fine.
- [ ] **Step B1.4: Commit** `feat(theme): Walmal Sport dark tokens + Anton/Archivo/Public Sans fonts`

### Task B2: Wishlist store (TDD) + sonner

**Files:**
- Create: `src/store/wishlist-store.ts`
- Test: `tests/store/wishlist-store.test.ts`
- Modify: `src/components/providers.tsx` (add `<Toaster />`)

- [ ] **Step B2.1: Write the failing tests** (mirror `tests/lib/rate-limit.test.ts` vitest conventions):

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useWishlistStore } from '@/store/wishlist-store'

const item = { productId: 'p1', name: 'Velocity Elite FG Boot', brand: 'Walmal Pro', price: 1199.99, currency: 'USD', imageUrl: '/img.png' }

describe('wishlist store', () => {
  beforeEach(() => useWishlistStore.setState({ items: [] }))

  it('toggles an item in', () => {
    useWishlistStore.getState().toggle(item)
    expect(useWishlistStore.getState().items).toHaveLength(1)
    expect(useWishlistStore.getState().has('p1')).toBe(true)
  })

  it('toggles the same item out', () => {
    useWishlistStore.getState().toggle(item)
    useWishlistStore.getState().toggle(item)
    expect(useWishlistStore.getState().items).toHaveLength(0)
  })

  it('removes by productId', () => {
    useWishlistStore.getState().toggle(item)
    useWishlistStore.getState().remove('p1')
    expect(useWishlistStore.getState().has('p1')).toBe(false)
  })

  it('does not duplicate on double-toggle of different items', () => {
    useWishlistStore.getState().toggle(item)
    useWishlistStore.getState().toggle({ ...item, productId: 'p2' })
    expect(useWishlistStore.getState().items).toHaveLength(2)
  })
})
```

- [ ] **Step B2.2:** Run `npm test -- tests/store/wishlist-store.test.ts` → FAIL (module not found).
- [ ] **Step B2.3: Implement** `src/store/wishlist-store.ts` (persist key `walmal-wishlist`, same zustand/persist pattern as `cart-store.ts`):

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WishlistItem {
  productId: string
  name: string
  brand?: string
  price?: number
  currency?: string
  imageUrl?: string
}

interface WishlistState {
  items: WishlistItem[]
  toggle: (item: WishlistItem) => void
  remove: (productId: string) => void
  has: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((state) =>
          state.items.some((i) => i.productId === item.productId)
            ? { items: state.items.filter((i) => i.productId !== item.productId) }
            : { items: [...state.items, item] },
        ),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      has: (productId) => get().items.some((i) => i.productId === productId),
    }),
    { name: 'walmal-wishlist' },
  ),
)
```

- [ ] **Step B2.4:** Run the tests → PASS. Run the full unit suite `npm test` → all pass.
- [ ] **Step B2.5:** `npm install sonner`, add to `providers.tsx`: `import { Toaster } from 'sonner'` and render `<Toaster position="bottom-right" theme="dark" />` alongside existing children.
- [ ] **Step B2.6: Commit** `feat(wishlist): local-only wishlist store + sonner toaster`

### Task B3: Category API + listing `?category=` support

**Files:**
- Create: `src/lib/api/categories.ts`
- Test: `tests/lib/categories.test.ts`
- Modify: `src/lib/api/products.ts` (add `fetchProductsByCategory`)
- Modify: `src/app/(shop)/products/page.tsx`

- [ ] **Step B3.1: Failing test for the slug resolver** (pure function, no network):

```ts
import { describe, expect, it } from 'vitest'
import { findActiveCategoryBySlug, type Category } from '@/lib/api/categories'

const tree: Category[] = [
  { categoryId: '1', name: 'Boots', slug: 'boots', active: true, children: [] },
  { categoryId: '2', name: 'Electronics', slug: 'electronics', active: false, children: [
    { categoryId: '3', name: 'Old Child', slug: 'old-child', active: true, children: [] },
  ] },
]

describe('findActiveCategoryBySlug', () => {
  it('finds an active root by slug', () => {
    expect(findActiveCategoryBySlug(tree, 'boots')?.categoryId).toBe('1')
  })
  it('ignores inactive categories', () => {
    expect(findActiveCategoryBySlug(tree, 'electronics')).toBeNull()
  })
  it('searches children recursively (active only)', () => {
    expect(findActiveCategoryBySlug(tree, 'old-child')?.categoryId).toBe('3')
  })
  it('returns null for unknown slug', () => {
    expect(findActiveCategoryBySlug(tree, 'nope')).toBeNull()
  })
})
```

- [ ] **Step B3.2:** Run → FAIL. **Implement `categories.ts`:**

```ts
import { apiClient } from './client'

export interface Category {
  categoryId: string
  name: string
  slug: string
  active: boolean
  children: Category[]
}

interface ApiResponse<T> { data: T }

export async function fetchCategoryTree(): Promise<Category[]> {
  const res = await apiClient.get<ApiResponse<Category[]>>('/product/categories')
  return res.data.data
}

export function findActiveCategoryBySlug(tree: Category[], slug: string): Category | null {
  for (const node of tree) {
    if (node.active && node.slug === slug) return node
    const child = findActiveCategoryBySlug(node.children ?? [], slug)
    if (child) return child
  }
  return null
}
```

First verify the live field names match: `curl -s http://localhost:8080/api/v1/product/categories` (backend from Phase A still running). If the DTO differs (e.g. `id` vs `categoryId`), adapt the interface to reality — the E2E suite is the referee.

- [ ] **Step B3.3:** Run tests → PASS.
- [ ] **Step B3.4:** Add to `products.ts`:

```ts
export async function fetchProductsByCategory(categoryId: string, query: ProductsQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  params.set('page', String(query.page ? query.page - 1 : 0))
  params.set('size', String(query.size ?? 20))
  const res = await apiClient.get<ApiResponse<ApiPage<Product>>>(`/product/categories/${categoryId}/products?${params}`)
  const page = res.data.data
  return { products: page.content, total: page.totalElements, totalPages: page.totalPages }
}
```

Verify the live response is the same `ApiResponse<Page>` envelope with `curl -s "http://localhost:8080/api/v1/product/categories/c0000000-0000-0000-0000-000000000011/products?page=0&size=20"`.

- [ ] **Step B3.5:** In `products/page.tsx` `ProductsContent`: read `const categorySlug = searchParams.get('category')`. When present, resolve via `fetchCategoryTree()` + `findActiveCategoryBySlug`; found → `fetchProductsByCategory(cat.categoryId, { page })` and render the category name as the `<h1>`; not found → fall back to the existing unfiltered `fetchProducts` path with the plain "Products" heading. `?q=` behavior untouched. Keep the effect dependencies correct (`[status, search, page, categorySlug]`).
- [ ] **Step B3.6:** Manual check: `/products?category=boots` shows only the 4 boot products with heading "Boots"; `/products?category=nope` shows all; `/products?q=jersey` still filters.
- [ ] **Step B3.7: Commit** `feat(listing): category slug filter on /products via backend category tree`

### Task B4: Global chrome — announcement bar + header (desktop & mobile)

**Files:**
- Create: `src/components/layout/announcement-bar.tsx`
- Create: `src/components/layout/mobile-menu.tsx`
- Modify: `src/components/layout/site-header.tsx` (full rebuild)
- Modify: `src/components/layout/cart-icon-button.tsx` (Bag button restyle)

Follow the wireframe files for every pixel value (colors/sizes/spacing are all annotated there). Structural requirements:

- [ ] **Step B4.1: `announcement-bar.tsx`** — server component, red strip, `label-caps` 12.5px, text "Free local delivery over $80 · Worldwide shipping available".
- [ ] **Step B4.2: Rebuild `site-header.tsx`:**
  - Sticky, `bg-background/90 backdrop-blur border-b`.
  - Logo `Link href="/"`: `display-heading` 26px — `WALMAL<span className="text-primary">SPORT</span>`.
  - Desktop nav (hidden below `lg:`): first link **"Shop All" → `/products`** (pragmatic addition — E2E and users need an unfiltered entry point), then Jerseys/Boots/Teamwear/Equipment → `/products?category=<slug>`. Style per wireframe (Archivo 13.5px caps, hover red underline via `border-b-2`).
  - Search `<form action="/products" method="get">` with `<input name="q" placeholder="Search jerseys, boots, teams" />` — GET form submit preserves the `?q=` contract with zero JS.
  - Wishlist heart: `Link href="/saved"`, count badge from `useWishlistStore((s) => s.items.length)`; red when count > 0.
  - Auth area: EXACT same texts/links as the current file ("Hi, {username}" → `/account`, "Sign out" button, "Sign in" → `/login`, "Register" → `/register`); restyle only.
  - Bag button (in `cart-icon-button.tsx`): red `label-caps` button, text "Bag", white count pill; keep the existing `onClick` prop contract and any existing aria/testid. It must still open `CartDrawer`.
  - Mobile (`lg:hidden`): hamburger button (aria-label "Menu") → `mobile-menu.tsx` using the existing shadcn `Sheet` (`side="left"`, dark panel): nav items Anton 26px (Shop All, Jerseys, Boots, Teamwear, Equipment, Saved), bottom links Account (auth-aware) and Help; centered logo; heart with badge. Search row below the bar on `/` and `/products` only (check `usePathname()`).
  - Hydration guard: wishlist/cart counts come from persisted stores and there is NO existing guard pattern to copy (`cart-icon-button.tsx` renders the count directly today). Implement a mounted flag (`const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`) and render count badges only when `mounted`, in both the header and the bottom tab bar.
- [ ] **Step B4.3: Verify** in dev: desktop ≥1024px shows full bar; mobile 390px shows hamburger/logo/heart; drawer opens; search submits to `/products?q=…`; auth flows still show the same texts. `npm run build` passes.
- [ ] **Step B4.4: Commit** `feat(chrome): Walmal Sport header — announcement bar, sport nav, search, bag, mobile drawer`

### Task B5: Bottom tab bar + Saved page

**Files:**
- Create: `src/components/layout/bottom-tab-bar.tsx`
- Create: `src/app/(shop)/saved/page.tsx`
- Modify: `src/app/(shop)/layout.tsx` (mount tab bar)

- [ ] **Step B5.1: `bottom-tab-bar.tsx`** (client, `lg:hidden`, sticky bottom per mobile wireframe): Home `/`, Shop `/products`, Saved `/saved` (badge = wishlist count), Bag (button → opens cart drawer; badge = cart item count). Active tab from `usePathname()`. The cart drawer currently mounts inside `SiteHeader` with local state — lift `cartOpen` state into the shop layout OR give the tab bar its own `CartDrawer` instance; choose lifting state up (single drawer instance): make `(shop)/layout.tsx` a client component owning `cartOpen`, passing `onOpenCart` to both `SiteHeader` and `BottomTabBar`. Keep the header's own default so `(account)`/`(checkout)` groups (which don't render the tab bar) still work unchanged.
- [ ] **Step B5.2: `saved/page.tsx`** per mobile wireframe (works on desktop too — constrain to `max-w-2xl`): heading "Saved" + count label; rows (80px image via `resolveMinioUrl`, brand caps, name, Anton price, red "Add to bag" + "Remove"); "Add to bag" uses the same single-vs-multi-variant rule as Task B7 (extract the shared helper `addProductToBag` in Task B7 and reuse — if building B5 first, inline navigate-to-detail and refactor in B7). Empty state: circle heart, "Nothing saved yet", "Start shopping" → `/products`.
- [ ] **Step B5.3: Verify** at 390px: tab bar shows with badges, Saved page renders both states.
- [ ] **Step B5.4: Commit** `feat(chrome): mobile bottom tab bar + saved wishlist page`

### Task B6: Footer

**Files:**
- Modify: `src/components/layout/site-footer.tsx` (full rebuild)

- [ ] **Step B6.1:** Rebuild per desktop wireframe: brand column (logo, blurb, newsletter `<form>` — `onSubmit` prevents default, `toast.success('You are on the list — 10% off your first order.')`, clears input); Shop links (Jerseys/Boots/Teamwear/Equipment → category URLs, Sale → `/products`); Help links (Track order → `/account`, Returns/Size guide/Contact us → `#`); Stores column (static text list); bottom bar © + socials. Mobile: single column, centered, per mobile wireframe. Newsletter needs a client boundary — make the newsletter form its own small client component, keep the rest server-rendered.
- [ ] **Step B6.2: Verify + commit** `feat(chrome): sport footer with newsletter toast`

### Task B7: Product card restyle + Add-to-bag rule

**Files:**
- Create: `src/lib/add-to-bag.ts`
- Modify: `src/components/product/product-card.tsx`

- [ ] **Step B7.1: `add-to-bag.ts`** — shared helper implementing the spec rule:

```ts
import { fetchProductVariants } from '@/lib/api/products'
import { useCartStore } from '@/store/cart-store'
import { resolveMinioUrl } from '@/lib/minio-url'
import { toast } from 'sonner'
import type { Product } from '@/types/product'

/** Single ACTIVE variant → add straight to bag; otherwise route to the detail
 *  page where the variant selector lives. Returns 'added' | 'navigate'. */
export async function addProductToBag(product: Product): Promise<'added' | 'navigate'> {
  const variants = (await fetchProductVariants(product.productId)).filter((v) => v.status === 'ACTIVE')
  if (variants.length !== 1 || product.lowestPrice == null) return 'navigate'
  useCartStore.getState().addItem({
    variantId: variants[0].variantId,
    productName: product.name,
    variantName: variants[0].name ?? variants[0].sku,
    price: product.lowestPrice,
    quantity: 1,
    imageUrl: resolveMinioUrl(product.primaryImageUrl) ?? '',
  })
  toast.success(`${product.name} added to bag`)
  return 'added'
}
```

Before wiring: check how `product-detail.tsx` builds its `CartItem` (field semantics for `variantName`/`imageUrl`) and mirror it exactly so the cart drawer renders both paths identically.

- [ ] **Step B7.2: Restyle `product-card.tsx`** per wireframe: white tile (`bg-white text-neutral-900 rounded-[14px] overflow-hidden`, hover `-translate-y-1 transition-transform`), image on `#f1f1ee`, brand `label-caps` 11px `text-neutral-400`, name 15px w700 `line-clamp-2 min-h-[38px]`, bottom row: Anton price (`font-heading` 19px, `formatPrice(product.lowestPrice)`) + "Add" button (dark bg, hover red, `label-caps`). Card becomes a client component. Add handler: `e.preventDefault(); e.stopPropagation();` then `addProductToBag(product)`; on `'navigate'` → `router.push('/products/' + product.productId)`. Keep `data-testid="product-card"` and `data-testid="product-card-link"` exactly. Optional badge prop for "New" (used by homepage rail).
- [ ] **Step B7.3: Verify:** `/products` — cards are white tiles on dark bg; "Add" on the match ball (single variant) toasts + increments Bag count; "Add" on a jersey navigates to its detail page.
- [ ] **Step B7.4: Commit** `feat(product): white sport tiles + smart add-to-bag`

### Task B8: Homepage rebuild + static art

**Files:**
- Create: `public/sport/hero.svg`, `public/sport/promo-pack.svg`, `public/sport/cat-jerseys.svg`, `public/sport/cat-boots.svg`, `public/sport/cat-teamwear.svg`, `public/sport/cat-equipment.svg`
- Create: `src/lib/decorative-ratings.ts`
- Test: `tests/lib/decorative-ratings.test.ts`
- Create: `src/components/home/hero.tsx`, `src/components/home/category-tiles.tsx`, `src/components/home/product-rail.tsx`, `src/components/home/promo-banner.tsx`, `src/components/home/best-sellers.tsx`, `src/components/home/trust-bar.tsx`
- Modify: `src/app/(shop)/page.tsx`

- [ ] **Step B8.1: Static SVG art.** Author flat-illustration SVGs (dark scenes to sit under the wireframes' gradient overlays; same geometric style as the product PNGs; no text). `hero.svg` 1920×1200 (pitch scene, player silhouette, red accents), `promo-pack.svg` 1360×680 (boot pair on dark), category tiles 800×460 each. Use plain `<img>` (SVG + `next/image` needs no remote loader but `<img>` is simpler and CSP-safe; `object-fit: cover`).
- [ ] **Step B8.2: Decorative ratings (TDD).** Failing test first:

```ts
import { describe, expect, it } from 'vitest'
import { decorativeRating } from '@/lib/decorative-ratings'

describe('decorativeRating', () => {
  it('is deterministic for the same id', () => {
    expect(decorativeRating('abc')).toEqual(decorativeRating('abc'))
  })
  it('stays in range', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const r = decorativeRating(id)
      expect(r.stars).toBeGreaterThanOrEqual(4)
      expect(r.stars).toBeLessThanOrEqual(5)
      expect(r.reviews).toBeGreaterThanOrEqual(120)
      expect(r.reviews).toBeLessThanOrEqual(3400)
    }
  })
})
```

Implementation: FNV-1a hash of the id → `{ stars: 4 | 4.5 | 5, reviews }`; render stars as `★★★★☆`-style string, reviews formatted `1.4k` above 1000. File carries a comment: decorative seed data, no backend reviews exist (spec decision).

- [ ] **Step B8.3: Section components** per the desktop wireframe annotations (mobile behavior per mobile wireframe):
  - `hero.tsx` — server; gradient overlay `bg-gradient-to-r`/`-to-t` at the annotated stops; CTAs are `Link`s styled per wireframe.
  - `category-tiles.tsx` — server; the four categories hardcoded as `{ name, slug, img }` (slugs from V17; a KB note records the coupling); desktop 4-up tiles, mobile horizontal chip rail.
  - `product-rail.tsx` — client wrapper: heading + "View all →" + horizontal scroll-snap rail of `ProductCard` (270px desktop / 200px mobile, `badge="New"`).
  - `best-sellers.tsx` — grid of `ProductCard` + stars row + badge from a static map: `{ 'Harbour City FC 26/27 Home Jersey': 'Best seller', 'National Team Authentic Home Jersey': 'Authentic', 'Lite Carbon Shinguards': '-15%' }`.
  - `promo-banner.tsx`, `trust-bar.tsx` — server, static, per wireframe.
- [ ] **Step B8.4: Rewire `page.tsx`:** keep `fetchProductsSSG` + `revalidate = 3600` + try/catch; `const arrivals = products.slice(0, 6)`, `const best = products.slice(6, 14)` (search DTO exposes no createdAt — response order stands in for recency; documented in KB). Compose: Hero → CategoryTiles → ProductRail("New Arrivals", arrivals) → PromoBanner → BestSellers → TrustBar. Delete the old "Welcome to Walmal" hero.
- [ ] **Step B8.5: Verify:** homepage at 1440px and 390px matches the wireframes (structure, order, empty-rail grace with backend stopped). `npm run build` passes.
- [ ] **Step B8.6: Commit** `feat(home): Walmal Sport homepage — hero, category tiles, rails, promo, best sellers, trust bar`

### Task B9: Dark-theme sweep of existing pages

**Files:**
- Modify: `src/components/checkout/stripe-payment.tsx` (Stripe CardElement colors, inline `options` at lines ~50–58)
- Modify: only what the sweep finds (hardcoded light colors)

- [ ] **Step B9.1: Stripe CardElement** renders its own iframe — token CSS can't reach it. In `stripe-payment.tsx` the `<CardElement options={{ style: … }}>` is inline: replace `#424770` → `#f4f4f2`, the `::placeholder` `#aab7c4` → `#9a9a9f`, and the invalid color `#9e2146` → `#e0281b`; add `iconColor: '#9a9a9f'`. Keep everything else.
- [ ] **Step B9.2: Sweep:** `grep -rn "bg-white\|text-black\|bg-gray-\|bg-neutral-50\|text-gray-9" src/ --include="*.tsx"` — for each hit outside the deliberate white product tile, replace with token classes. Manually click through: `/login`, `/register`, `/account` (+orders), `/cart` page if present, checkout with test card `4242…`, order-confirmation. Everything must be legible dark-theme.
- [ ] **Step B9.3: Commit** `fix(theme): dark-theme sweep — Stripe element colors + stragglers`

### Task B10: E2E updates + full suite

**Files:**
- Modify: `tests/e2e/guest-checkout.spec.ts:28-29`, `tests/e2e/authenticated-checkout.spec.ts:33-34,42-43`
- Modify: any other stale assertions the grep finds

- [ ] **Step B10.1: Update fixtures:** `productName: 'Velocity Elite FG Boot'`; `variantName: 'WP-VELO-LE-UK9'` (lines 28–29, 33–34) and `'WP-VELO-LE-UK9G'` (lines 42–43). First read how the specs use `variantName` (selector text vs SKU display) and match the real rendered text from the variant selector.
- [ ] **Step B10.2: Grep for stragglers:** `grep -rn "Welcome to Walmal\|Galaxy\|S24\|iPhone\|MacBook\|Smartphones\|name: 'Products'\|getByRole('link', { name: 'Products' })" tests/` — update each (homepage hero heading is now "Own the pitch."; the header "Products" link is now "Shop All" — update selectors accordingly).
- [ ] **Step B10.3: Full suite** (backend JAR already rebuilt with V17 in Phase A — verify `ls -la walmal-app/target/*.jar` timestamp is post-V17; playwright config auto-starts backend + frontend :3001):

Run: `cd C:/YHA/006_Claude_Workspace/walmal-store && npx playwright test`
Expected: 96/96 pass across chromium, firefox, webkit. Debug failures with `npx playwright test --project=chromium <file>` before rerunning the matrix. Use @superpowers:systematic-debugging for any non-obvious failure.

- [ ] **Step B10.4: Unit suite:** `npm test` → all pass.
- [ ] **Step B10.5: Commit** `test(e2e): sports catalog fixtures + reskin selector updates`

### Task B11: Store KB + README + screenshots

**Files:**
- Modify: `docs/kb/*.md` (grep `Galaxy|S24|Smartphones|teal|Daylight` and the UI/architecture files)
- Modify: `README.md` + `docs/images/*.png`

- [ ] **Step B11.1: KB updates:** document — Walmal Sport branding + dark token palette (supersedes Daylight Tier 1 note), homepage architecture (sections, slice(0,6)/(6,14) recency stand-in, static badge map), wishlist store (local-only, `walmal-wishlist` key), decorative ratings + newsletter (no backend), `?category=<slug>` listing contract (active-only slug match, fallback), category slugs hardcoded in `category-tiles.tsx` coupled to V17, sonner toaster. Grep for stale claims: `grep -rin "galaxy\|s24\|smartphones\|daylight\|teal" docs/kb/`.
- [ ] **Step B11.2: README:** update claimed facts (branding, screenshots). Re-capture the screenshots referenced in `README.md` at 1440×900 against the running app (same flow as the 2026-07-12 capture; check `docs/images/` filenames and replace in place).
- [ ] **Step B11.3: Cross-repo:** confirm `walmal/docs/kb/SYSTEM.md` was updated in Task A3 (it's the canonical copy for seeded test values); if anything was missed, update it now in the walmal repo (separate commit there is fine — same work session satisfies the rule).
- [ ] **Step B11.4: Commit** `docs(kb+readme): Walmal Sport reskin — theme, homepage, wishlist, catalog facts, screenshots`

### Task B12: Final verification

- [ ] **Step B12.1:** `npm run build` clean; `npm run lint` no new errors vs baseline.
- [ ] **Step B12.2:** One more full `npx playwright test` from a cold start (backend restarted) to prove the auto-start path works with V17.
- [ ] **Step B12.3:** Use the superpowers:verification-before-completion skill: confirm every spec section is either shipped or explicitly in the backlog. Report results honestly.
