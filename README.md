# proudmerchant.com

The company's own site: the landing page, Get started, and every customer's setup list.
Client apps (Buns & Patties and the ones after it) live in their own repos; this is ours.

| File | What it is |
|---|---|
| `index.html` | Home: the pitch, how it works, and **Get a free demo** (role, name, email, mobile, business, locations). A request lands in `leads`; we call and make the account. |
| `pricing.html` | Pricing, its own page like Owner.com's: free for founding clients, the bills in his own name. |
| `login.html` | Email, then a 6-digit code sent to it (Supabase Auth, no password). |
| `account.html` | His list: the Food Truck template's sections, every box saving as he types. Shown for the business whose `owner_email` is the login. |
| `pm.css`, `pm.js` | One look and one door to the database for every page. |
| `netlify.toml` | Hosting: plain files, no build. |

The database is the Supabase project **`proud-merchant`** (ref `ecfscfmmgpefnpjqwbye`, org Sahin LLC):
`templates`, `businesses`, `answers`, `tasks`, `jobs`, `events`. `leads`. Browsers reach it only through
`request_demo` (anyone), `get_account` and `save_answer` (signed in). We make an account with
`make_account(name, template, contact, email, phone)` from a Claude chat or the dashboard. A finished section starts the job its
template names (`jobs` table). The Food Truck template is the client sheet from the Buns-Patties repo
(`tools/client-sheet/food-truck.html`) plus a `job` line per section; the plan is `docs/PLAYBOOK.md`
section 7 there.

Serdar's account is seeded from his sheet (Maps pending, Square chosen, menu received). Its login is
cihanshah.sahin@gmail.com while we test; switch `owner_email` on his row when he takes it over.

Supabase Auth needs the Magic Link email template to contain `{{ .Token }}` so the email carries a code,
not a link (Authentication → Email Templates). The built-in sender is for testing; a real sender comes with
the domain's email.
