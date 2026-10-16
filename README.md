# proudmerchant.com

The company's own site: the landing page, Start, and every customer's setup list. Client apps
(Buns & Patties and the ones after it) live in their own repos; this is ours. Plain files, no build;
Two environments, two branches:

| | Branch | Address | Host | Database | Logins |
|---|---|---|---|---|---|
| **SIT** (now) | `sit` | sit.proudmerchant.com | GitHub Pages, from the `sit` branch (`CNAME` in the repo; at GoDaddy a CNAME record `sit → seanjohnzon.github.io`) | Supabase `proud-merchant` (ref `ecfscfmmgpefnpjqwbye`), real data | email + password, no codes |
| **UAT** (later) | `main` | proudmerchant.com | Netlify from `main` (GitHub Pages serves one branch per repo, so the second environment goes on a second host; `netlify.toml` is already here) | a second Supabase project, `pm.js` on `main` points at it | email + a code |

Work lands on `sit`; `main` moves only on a release. Pushing `sit` publishes within a minute or two.

| File | What it is |
|---|---|
| `index.html` | Home: the pitch, how it works, and **Start**: kind of business, its name, his name, email, mobile, password → his list opens. He made his own account; nobody calls anybody. |
| `pricing.html` | Pricing, its own page like Owner.com's: free for founding clients, the bills in his own name. |
| `login.html` | Email and password. |
| `account.html` | His setup: the eight steps as cards (Done / N left / N to check / Pending / Not yet), a line saying where things stand, Continue. |
| `step.html?s=s1` | One step. Steps with boxes save as he types; steps 3 and 4 are check lists (Right / a note, our reply under the item); step 7 is the final test (Pass / Fail / a note, our tester's result shown). |
| `team.html` | Ours (emails in the `team` table): every business, its stage, open notes with a Reply box, **Post the menu draft**, **Mark built** (the links), **Final test ready** (the real links) and the tester's own Pass / Fail column, **Copy the email for this stage**, the jobs waiting on us with Done, and what happened lately. |
| `pm.css`, `pm.js`, `intake.css`, `intake.js` | One look, one door to the database, one renderer for the boxes and the check lists. |

## The eight steps

| # | Step | Who | Opens | Done when |
|---|---|---|---|---|
| 1 | Your menu and logo | him | at once | name, logo, menu in → **job: draft the menu** |
| 2 | About your business | him | at once | hours, phone, Maps listing, story, socials, delivery, rewards |
| 3 | Check your menu | him | when we post the draft | every item Right → **job: build the test app** (needs step 2 ready; Maps pending counts) |
| 4 | Try your app | him | when we mark it built | every check Looks right → **approved** |
| 5 | Payments | him | at once (costs nothing) | Square or Stripe, account email; the Connect/Allow link comes after approval |
| 6 | Web address, D-U-N-S, Apple, Google | him | after approval | as before |
| 7 | Final test | him and our tester | when we mark it ready (his address live, his payments connected, the app on his phone) | 16 checks, positive and negative, each Pass or Fail with a note, on both sides → **uat_passed** |
| 8 | Launch | both | after 7 | open |

Stages, in order: `setup → drafting → menu_check → building → app_check → approved → uat → uat_passed → live`.
`advance()` in the database moves a business along from what is in; the site only reads `stage`.
A note on an item makes a `menu_note` / `app_note` / `uat_note` job; our reply closes it and shows under the item.

## The database

Supabase project **`proud-merchant`** (ref `ecfscfmmgpefnpjqwbye`, org Sahin LLC): `templates` (sections, steps,
`checks`, `uat`, costs), `businesses`, `answers`, `tasks`, `jobs`, `events`, `review_items` (kind `menu` = the draft,
kind `app` = the checks; `reply`), `team`. Browsers reach it only through functions, all for signed-in users:
`start_business`, `get_account`, `save_answer`, `save_review`, `save_review_all`, `save_uat`; `team_overview`, `team_post`,
`team_reply`, `team_built`, `team_uat_ready`, `team_uat`, `job_done` answer only for team emails. Uploads go to the private `intake` bucket, one
folder per business.

Templates: `food-truck-v10` (Serdar's), `restaurant-v4`, `gas-station-v4`, `other-v4`; the Start page names them.
Older rows stay for reference. The restaurant / gas station / other ones differ only in the rewards choices
(points as well as stamps) and one label.

Serdar's account (his own email and password, business `bp-7f3k9q`, stage `menu_check`): steps 1 and 2 prefilled
from what he gave us, his draft (15 items) posted on step 3, the B&P Test build marked built so step 4 opens the
moment his draft is all Right. The plan behind this is `docs/PLAYBOOK.md` section 7 in the Buns-Patties repo.
