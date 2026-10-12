# proudmerchant.com

The company's own site: the landing page, Get started, and every customer's setup list.
Client apps (Buns & Patties and the ones after it) live in their own repos; this is ours.

| File | What it is |
|---|---|
| `index.html` | Home: the pitch, how it works, and **Start**: kind of business, its name, his name, email, mobile → a code to his email → his list opens. He made his own account; nobody calls anybody. |
| `pricing.html` | Pricing, its own page like Owner.com's: free for founding clients, the bills in his own name. |
| `login.html` | Email, then a 6-digit code sent to it (Supabase Auth, no password). |
| `account.html` | His setup: six steps as cards (Done / N left / Pending / Not yet), a bar, Continue. |
| `step.html?s=s1` | One step: only that step's boxes, saving as he types, uploads straight from the phone, Next step. |
| `review.html` | Step 3, the menu check: each item we built, Looks right or a note. A note is a fix job; all ticked is approval. |
| `team.html` | Ours (emails in the `team` table): every business, how far it is, the jobs waiting on us with a Done button, and what happened lately. |
| `pm.css`, `pm.js`, `intake.css`, `intake.js` | One look, one door to the database, one renderer for the intake. |
| `netlify.toml` | Hosting: plain files, no build. |

The database is the Supabase project **`proud-merchant`** (ref `ecfscfmmgpefnpjqwbye`, org Sahin LLC):
`templates`, `businesses`, `answers`, `tasks`, `jobs`, `events`. `team`. Browsers reach it only through functions, all for signed-in users: `start_business`,
`get_account`, `save_answer`; `team_overview` and `job_done` answer only for team emails. Nothing is
open to a visitor who has not checked his email.

Templates: `food-truck-v8-d` (Serdar's), `restaurant-v2-d`, `gas-station-v2-d`, `other-v2-d`: the current ones; the Start page names them. Older rows stay for reference.
list with its place section reworded; change them in the `templates` table as the first restaurant or
station teaches us something.

We reach out to owners ourselves; the site is the intake and the rails. A finished section adds a job for us, a finished step 2 adds the build job; on the team page we work them off, paste the built menu and mark Built, which opens step 3 for him. Uploads go to the private `intake` bucket, one folder per business, and show on the team page. A finished section starts the job its
template names (`jobs` table). The Food Truck template is the client sheet from the Buns-Patties repo
(`tools/client-sheet/food-truck.html`) plus a `job` line per section; the plan is `docs/PLAYBOOK.md`
section 7 there.

Serdar's account is seeded from his sheet (Maps pending, Square chosen, menu received). Its login is
cihanshah.sahin@gmail.com while we test; switch `owner_email` on his row when he takes it over.

Supabase Auth needs the Magic Link email template to contain `{{ .Token }}` so the email carries a code,
not a link (Authentication → Email Templates). The built-in sender is for testing; a real sender comes with
the domain's email.
