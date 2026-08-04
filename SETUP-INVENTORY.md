# 🔬 Setup PUAPT Instrument Inventory & Logbook

An internal, sign-in-gated tool to track the PUAPT (WGFS) research instruments,
their status and rates, and to log every checkout and return. It reuses the
site's existing Supabase + auth setup (same as the guest book and links
insights).

- **Master inventory** (`instruments`): the 22 WGFS instruments, seeded from the
  Excel rate card (code, name, brand, lab, category, the three rate schemes,
  billing unit, and a status).
- **Usage logbook** (`usage_logs`): one row per checkout, with borrower, user
  type (internal/external), operator (self/technician), purpose, quantity,
  auto-computed cost, condition out/in, and status (ongoing/returned).

## Pages (gated behind sign-in)

| URL | What it does |
|---|---|
| `/inventory` | Searchable list of all instruments with status, lab/category filters, and rates. |
| `/inventory/<slug>` | One instrument: details, rate card, **check out** / **return** forms, status control, and full usage history. |

Only signed-in team members can open these pages or read/write the data (RLS).
They are `noindex` and not linked from the public navigation.

## Step 1 — Create the tables (run once)

Open the **Supabase SQL editor** and run the whole file:

```
web/supabase/inventory.sql
```

It creates the `instruments` and `usage_logs` tables, enables row level
security (authenticated-only), and seeds the 22 WGFS instruments. It is
idempotent (safe to re-run; the seed uses `on conflict (slug) do nothing`).

## Step 2 — Deploy

The `/inventory` pages ship with the site. Once the SQL has been run and you are
signed in (`/sign-in`), open `/inventory`.

## How costs are computed

Each checkout picks a rate automatically from the instrument's rate card:

- **External** user → external rate.
- **Internal + self-operated** → internal self rate.
- **Internal + with technician** → internal technician rate.

`cost = quantity × unit rate`. When the chosen rate is blank on the rate card
(some instruments only have certain schemes), the cost shows "by arrangement".
Quantity is in the instrument's billing unit (per hari, per Ha, per sampel, or
per 4 jam).

## Workflow

1. Instrument starts **Available**.
2. **Check out** on its page → it becomes **In use**; a log row is created
   (status *ongoing*).
3. **Mark as returned** → confirm final quantity/condition; cost is recomputed,
   the log becomes *returned*, and the instrument returns to **Available**.
4. For servicing, use **Set status** to mark **Maintenance**, **Calibration**,
   or **Out of service** (hidden while an instrument is checked out).

## Ideas for later (not built yet)

- QR code per instrument that opens its `/inventory/<slug>` page (scan at the lab).
- Separate calibration/maintenance log with next-due dates for the precision
  meters (LICOR, Specim, Micasense).
- CSV/PDF export and a small utilisation dashboard for PUAPT reporting.
- Optional booking/approval step before checkout.
