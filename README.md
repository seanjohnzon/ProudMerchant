# proudmerchant.com

The company's own site: the landing page, Start, and every customer's setup list. Client apps
(Buns & Patties and the ones after it) live in their own repos; this is ours. Plain files, no build;
Three branches, three environments; code moves up by merge, never by hand:

| Branch | Environment | Commits |
|---|---|---|
| `sit` | **sit.proudmerchant.com**, SIT database (Supabase `proud-merchant`, ref `ecfscfmmgpefnpjqwbye`, real data, email + password) | daily work |
| `uat` | uat.proudmerchant.com, its own Supabase project, email + a code (not up yet) | `sit` merged up when a SIT round passes |
| `main` | proudmerchant.com, production (not up yet) | `uat` merged up on a release |

Hosting: GitHub Pages, free, nothing else. One Pages site per repo, so SIT is this repo's `sit` branch at
sit.proudmerchant.com (a `CNAME` file on `sit`; at GoDaddy a CNAME record `sit → seanjohnzon.github.io`). When UAT
and production exist, each gets its own small repo (`ProudMerchant-uat`, `ProudMerchant-live`) that pulls the matching
branch of this one and publishes it on its own address; those repos carry their own `CNAME`. Each environment has its own
Supabase project, named in `pm.js` on its branch. Promotion checklist: merge up, point `pm.js` at that environment's
project, on `main` drop the noindex meta. The server is Supabase; GitHub only hands out the files.

| File | What it is |
|---|---|
| `index.html` | Home: the pitch, how it works, and **Start**: kind of business, its name, his name, email, mobile, password → his list opens. He made his own account; nobody calls anybody. |
| `pricing.html` | Pricing, its own page like Owner.com's: free for founding clients, the bills in his own name. |
| `login.html` | Email and password. |
| `account.html` | His setup: the seven steps as cards (Done / N left / N to check / Pending / Not yet), a line saying where things stand, Continue. |
| `step.html?s=s1` | One step. Steps with boxes save as he types; step 3 is the check list: his menu, then the screens, Pass / Fail / a note each, notes per part and a box at the end, our reply under them; step 6 is the final test, same shape, with our tester's result shown. |
| `team.html` | Ours (emails in the `team` table): every business, its stage, open notes with a Reply box, **Post the menu**, **Mark built** (the preview and TestFlight links), **Final test ready** (the real links) and the tester's own Pass / Fail column, replies to every note, **Copy the email for this stage**, the jobs waiting on us with Done, and what happened lately. |
| `pm.css`, `pm.js`, `intake.css`, `intake.js` | One look, one door to the database, one renderer for the boxes and the check lists. |

## The seven steps

| # | Step | Who | Opens | Done when |
|---|---|---|---|---|
| 1 | Your menu and logo | him | at once | name, logo, menu in → **job: menu into the app, web preview up, Mark built** |
| 2 | About your business | him | at once | hours, phone, Maps listing, story, socials, delivery, rewards (Maps pending at Google counts as ready) |
| 3 | Try your app | him | when we Mark built (the preview in his browser, or TestFlight) | his menu first (every item, in the app, against the words under it), then every screen: each Pass or Fail with a note, notes under each part, a box at the end. Menu all pass → **job: native build, TestFlight**; all pass + native up → **approved** |
| 4 | Payments | him | at once (costs nothing) | Square or Stripe, account email; the Connect/Allow link comes after approval |
| 5 | Web address, D-U-N-S, Apple, Google | him | after approval | as before |
| 6 | Final test | him and our tester | when we mark it ready (his address live, his payments connected, the app on his phone) | 16 checks on the real thing, positive and negative, each Pass or Fail with a note, on both sides → **uat_passed** |
| 7 | Launch | both | after 6 | open |

Stages, in order: `setup → drafting → app_check → approved → uat → uat_passed → live`.
`advance()` in the database moves a business along from what is in; the site only reads `stage`. Jobs with
section `built` (preview or app up) and `native` (TestFlight build) are the two build markers. A Fail with a note
makes a `menu_note` / `app_note` / `uat_note` job; a notes box makes an `<kind>_notes` job; our reply closes it and
shows under the item or the box.

## The database

Supabase project **`proud-merchant`** (ref `ecfscfmmgpefnpjqwbye`, org Sahin LLC): `templates` (sections, steps,
`checks`, `uat`, costs), `businesses`, `answers`, `tasks`, `jobs`, `events`, `review_items` (kind `menu` = the draft,
kind `app` = the checks; `reply`), `team`. Browsers reach it only through functions, all for signed-in users:
`start_business`, `get_account`, `save_answer`, `save_uat`, `save_review_all`, `save_notes`; `team_overview`, `team_post`,
`team_reply`, `team_notes_reply`, `team_built`, `team_uat_ready`, `team_uat`, `job_done` answer only for team emails. Uploads go to the private `intake` bucket, one
folder per business.

Templates: `food-truck-v12` (Serdar's), `restaurant-v6`, `gas-station-v6`, `other-v6`; the Start page names them.
Older rows stay for reference. The restaurant / gas station / other ones differ only in the rewards choices
(points as well as stamps) and one label.

Serdar's account (his own email and password, business `bp-7f3k9q`, stage `app_check`): steps 1 and 2 prefilled
from what he gave us; step 3 open with his 15 menu items and the 25 screen checks (the owner's walk from the QA page),
B&P Test on TestFlight already marked up and native. The plan behind this is `docs/PLAYBOOK.md` section 7 in the Buns-Patties repo.
