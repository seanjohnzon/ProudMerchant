# proudmerchant.com

The company's own site: the landing page, Start, and every customer's setup list. Client apps
(Buns & Patties and the ones after it) live in their own repos; this is ours. Plain files, no build;
GitHub Pages publishes `main` as it is (`.github/workflows/pages.yml`).

| File | What it is |
|---|---|
| `index.html` | Home: the pitch, how it works, and **Start**: kind of business, its name, his name, email, mobile, password → his list opens. He made his own account; nobody calls anybody. |
| `pricing.html` | Pricing, its own page like Owner.com's: free for founding clients, the bills in his own name. |
| `login.html` | Email and password. |
| `account.html` | His setup: the seven steps as cards (Done / N left / N to check / Pending / Not yet), a line saying where things stand, Continue. |
| `step.html?s=s1` | One step. Steps with boxes save as he types; steps 3 and 4 are check lists (Right / a note, our reply under the item). |
| `team.html` | Ours (emails in the `team` table): every business, its stage, open notes with a Reply box, **Post the menu draft**, **Mark built** (the links), **Copy the email for this stage**, the jobs waiting on us with Done, and what happened lately. |
| `pm.css`, `pm.js`, `intake.css`, `intake.js` | One look, one door to the database, one renderer for the boxes and the check lists. |

## The seven steps

| # | Step | Who | Opens | Done when |
|---|---|---|---|---|
| 1 | Your menu and logo | him | at once | name, logo, menu in → **job: draft the menu** |
| 2 | About your business | him | at once | hours, phone, Maps listing, story, socials, delivery, rewards |
| 3 | Check your menu | him | when we post the draft | every item Right → **job: build the test app** (needs step 2 ready; Maps pending counts) |
| 4 | Try your app | him | when we mark it built | every check Looks right → **approved** |
| 5 | Payments | him | at once (costs nothing) | Square or Stripe, account email; the Connect/Allow link comes after approval |
| 6 | Web address, D-U-N-S, Apple, Google | him | after approval | as before |
| 7 | Launch | both | after 5 and 6 | open |

Stages, in order: `setup → drafting → menu_check → building → app_check → approved → live`.
`advance()` in the database moves a business along from what is in; the site only reads `stage`.
A note on an item makes a `menu_note` / `app_note` job; our reply closes it and shows under the item.

## The database

Supabase project **`proud-merchant`** (ref `ecfscfmmgpefnpjqwbye`, org Sahin LLC): `templates` (sections, steps,
`checks`, costs), `businesses`, `answers`, `tasks`, `jobs`, `events`, `review_items` (kind `menu` = the draft,
kind `app` = the checks; `reply`), `team`. Browsers reach it only through functions, all for signed-in users:
`start_business`, `get_account`, `save_answer`, `save_review`, `save_review_all`; `team_overview`, `team_post`,
`team_reply`, `team_built`, `job_done` answer only for team emails. Uploads go to the private `intake` bucket, one
folder per business.

Templates: `food-truck-v9` (Serdar's), `restaurant-v3`, `gas-station-v3`, `other-v3`; the Start page names them.
Older rows stay for reference. The restaurant / gas station / other ones differ only in the rewards choices
(points as well as stamps) and one label.

Serdar's account (his own email and password, business `bp-7f3k9q`, stage `menu_check`): steps 1 and 2 prefilled
from what he gave us, his draft (15 items) posted on step 3, the B&P Test build marked built so step 4 opens the
moment his draft is all Right. The plan behind this is `docs/PLAYBOOK.md` section 7 in the Buns-Patties repo.
