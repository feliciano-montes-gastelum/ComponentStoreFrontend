# ComponentStore Frontend

Angular 22 (standalone components, zoneless change detection, SSR) frontend for the ComponentStore
Spring Boot backend — a public catalog of electronic components with guest component requests and
an administrator back office. This app does not process online payments or checkout.

## Prerequisites

- Node.js 22.22.3+ / 24.15.0+ (required by Angular CLI 22).
- The ComponentStoreBackend Spring Boot application running locally on `http://localhost:8080`
  (default port/context path — see its `application.properties`). It requires a SQL Server
  database and the `APP_DB_*` / `APP_JWT_SECRET` environment variables to start.

## Development server

```bash
npm install
npm start        # ng serve, proxies /api/** to http://localhost:8080 (see proxy.conf.json)
```

Open `http://localhost:4200/`.

The backend has **no CORS configuration**, so calls made directly from the Angular dev server's
origin (`http://localhost:4200`) would be blocked by the browser. `proxy.conf.json` routes `/api`
requests through the dev server itself to avoid this — no backend changes required for local
development. A production deployment must either serve this app from the same origin as the API
(e.g. behind a reverse proxy that maps `/api` to the backend) or have CORS added to the backend.

## Build / test

```bash
npm run build     # ng build (production)
npm test          # ng test (Vitest)
```

There is no ESLint configuration in this project, so no lint step is run.

## Frontend environments: production / development / local

Three build configurations, controlled by `environment.enableDevRoleSwitcher`:

| Command | Configuration | `enableDevRoleSwitcher` | DEV role switcher shown? |
|---|---|---|---|
| `npm run build` | production | `false` | No |
| `npm start` (`ng serve`) | development | `true` | Yes |
| `npm run start:local` (`ng serve --configuration=local`) | local | `false` | No |

### Dev-only role switcher (development configuration only)

A small floating "DEV" widget appears in the bottom-left corner. It lets you preview the app as
an anonymous visitor, a guest, or an administrator by fabricating a local session in
`AuthService` (`setDevRole`), without calling `/api/auth/login`.

This only changes what the *frontend* believes about the current user. For API calls made under a
fake role to actually succeed, the backend must be running with its `develop` Spring profile
active, which disables authorization and JWT validation entirely (see the backend's
`SecurityConfig` and `application-develop.properties`, and the `Spring Boot-ComponentstoreApplication
(develop)` launch configuration). Against any other backend profile, requests made under a
fake dev role are rejected exactly like any other unauthenticated/unauthorized request — the
switcher does not bypass real backend security.

### Local configuration (no toggle — real accounts)

`npm run start:local` behaves exactly like `npm start` (non-optimized, source maps, proxied to the
backend) but **without** the DEV role switcher. Use it to test different account views (guest vs.
administrator) by actually signing in as different real accounts — e.g. the bootstrap accounts
seeded by `APP_BOOTSTRAP_GUEST_PASSWORD` / `APP_BOOTSTRAP_ADMINISTRATOR_PASSWORD` — against a
normally-secured backend, rather than the fabricated sessions the switcher produces.

## Environment configuration

`src/environments/environment.ts` (production) and `environment.development.ts` (dev) both set
`apiBaseUrl`. No secrets, passwords, or AWS credentials are stored in the frontend — all image
uploads go through the backend's own endpoints, which talk to S3 server-side.

## Routes

Public: `/`, `/components`, `/components/:id`, `/login`, `/register`.
Authenticated (guest or administrator): `/profile`, `/my-requests`, `/my-requests/new`, `/my-history`,
`/my-bag`, `/my-bag/history`.
Administrator only: `/admin`, `/admin/inventory` (+ `/new`, `/:id/edit`, `/:id/images`),
`/admin/component-types`, `/admin/users` (+ `/:id`), `/admin/purchase-bags` (+ `/:id`),
`/admin/scan/:userAuthenticationId`, `/admin/requests`, `/admin/inventory-history`.
Errors: `/forbidden`, and a wildcard 404 page.

## Personal information lookup + profile QR code

**Backend**: added `GET /api/users/authentication/{id}` (`UserManagementController`), which just
exposes the existing `AuthenticationService.getCurrentUser(id)` — the same lookup already backing
the self-service `GET /api/auth/me` — for an administrator to call with *any* account id, not only
their own JWT subject. It falls under the pre-existing `/api/users/authentication/**` matcher in
`SecurityConfig`, so it's `ROLE_ADMINISTRATOR`-only with no security config changes needed. This
closes the long-standing gap where `UserInformationResponse` had no username/account-id field to
cross-reference a login account with its personal information — every admin screen that already
had a `userAuthenticationId` (users roster, purchase bags, sales, requests) can now resolve it to
a full name/email/contact/address via `UserManagementService.getAuthenticationDetail(id)`.

**Wired up in**: `/admin/users/:id` (shows real personal information instead of the old "not
available" notice) and `/admin/purchase-bags/:id` (shows the customer's name/email/contact/address
above the item list, instead of the old "contact info isn't available" notice). The `/admin/users`
roster itself is unchanged (still built from role-assignments — there's still no bulk "all
accounts" listing endpoint, only per-id lookup).

**Profile QR code**: `/profile` now shows a QR code (client-side only, via the `qrcode` npm
package, rendered in a new `QrCode` shared component — SSR renders a placeholder since it needs a
real browser canvas) encoding `${origin}/admin/scan/:userAuthenticationId`. Any phone's native
camera/QR app can scan and open it — no in-app camera scanner was built, since a URL-encoded QR
code gets "scan and navigate" for free through the browser itself, without camera-permission or
extra-library complexity. `/admin/scan/:id` (admin-guarded) looks up that user's current open bag
via `GET /api/purchase-bags?userAuthenticationId=&status=OPEN` and redirects straight to
`/admin/purchase-bags/:bagId`; if they don't have one open right now, it shows that instead of a
dead end, with a link to `/admin/purchase-bags?userAuthenticationId=` (that list now also reads
this query param on load to pre-filter by customer).

## Purchase bag

Guests (and admins, since nothing server-side restricts `/me` routes by role) add catalog
components to a running "bag" and check out in person; there is no online payment. Backend
endpoints used: `GET/POST /api/purchase-bags/me`, `GET /api/purchase-bags/me/history`,
`POST /api/purchase-bags/me/items`, `PUT`/`DELETE /api/purchase-bags/me/items/{itemId}`,
`PUT /api/purchase-bags/me/pickup` for the self-service side, and `GET /api/purchase-bags`
(+ `?userAuthenticationId=`, `?status=`), `GET /api/purchase-bags/{bagId}`,
`PUT`/`DELETE /api/purchase-bags/{bagId}/items/{itemId}`, `POST /api/purchase-bags/{bagId}/sell`,
`POST /api/purchase-bags/{bagId}/close` for the `ROLE_ADMINISTRATOR`-only admin side (enforced
server-side by `SecurityConfig`, not just hidden by the frontend guard). "Add to bag" is wired
into `ProductCard`, `CatalogDetail`, and the new-component-request form's catalog-match results;
the header shows a live item-count badge (`PurchaseBagService.itemCount`, refreshed on sign-in
and after every add/update/remove).

There is no per-bag detail route for guests: `GET /api/purchase-bags/{bagId}` is
administrator-only, so `/my-bag/history` shows each past bag's full item breakdown inline
(the `/me/history` response already includes it) instead of linking to a detail page.

### Admin partial sale — edit another user's bag, sell only some of it

`/admin/purchase-bags/:id` lets an administrator open any customer's bag and, per item, either
remove it outright (`DELETE .../{bagId}/items/{itemId}`) or choose whether to sell it now and how
much (a checkbox + quantity stepper, capped at `min(bag quantity, live available stock)` — an
item with zero available stock is unchecked by default and shown as "out of stock, will remain in
bag" instead of a broken 0-max stepper). "Perform sale" then calls the new
`POST /api/purchase-bags/{bagId}/sell` with only the checked items/quantities
(`PurchaseBagSaleRequest { items: [{ itemId, quantity }] }`) — unlike the original
`POST .../close` (all-or-nothing: any single out-of-stock item rolls back the *entire* sale),
`sell` only touches inventory and sales history for what's listed; anything unchecked, or sold at
a smaller quantity than what's in the bag, is left behind untouched, and the bag only becomes
`CLOSED` once this empties it — otherwise it stays `OPEN` for a later visit. This directly
supports "customer wanted 5, only 3 are actually available, sell those 3 now and leave 2 in the
bag." `PurchaseBagService.close()` (and the backend's all-or-nothing endpoint) is kept for API
coverage but is no longer called from this page, since `sell()` with every item fully checked
produces the identical end state through one unified, non-destructive-by-default code path.
`adminUpdateItemQuantity()` (`PUT .../{bagId}/items/{itemId}`, for directly correcting what's in
a bag outside of a sale) is implemented in `PurchaseBagService` for the same reason but isn't
wired to its own UI control, to avoid a third, confusing quantity-editing mechanism alongside
"quantity to sell" and "remove."

### Quantity: 1–99 per component, independent of current stock

The backend validates bag-item quantity as a flat 1–99 range per component
(`ensureBagQuantity` in `PurchaseBagServiceImpl`) — it does **not** check that quantity against
live inventory when adding/updating a bag item; the real stock check only happens when an
administrator closes the sale (`ensureAvailable`, only called from `close()`). The frontend
mirrors this exactly: `ProductCard`'s "Add to bag" only gates on the component being `active`
(not on `quantity > 0`), and every quantity stepper (`CatalogDetail`, `/my-bag`) caps at 99
regardless of `availableQuantity`, which is still shown for reference. A bag can therefore hold
more of an item than is currently in stock; closing the sale is where an insufficient-stock 400
would actually surface.

### Pickup scheduling

`PUT /api/purchase-bags/me/pickup` (`PickupRequest { requestedPickupAt: OffsetDateTime, pickupNotes? }`)
is wired up on `/my-bag`: a Material `mat-datepicker` (calendar popup, `[min]` set to today) for
the date and a Material `mat-timepicker` (15-minute-interval dropdown, from `@angular/material/timepicker`)
for the time, combined into a single instant and sent as `requestedPickupAt.toISOString()` —
`OffsetDateTime` needs a real offset/`Z`, unlike the naive `LocalDateTime` used elsewhere in this
app (e.g. component-request's `pickupExpiresAt`), so this could not reuse that earlier date-only
helper. Validation: both fields required, the combined date+time must be in the future
(cross-field validator, in addition to the datepicker's own `[min]` blocking past-date selection
outright), submission disabled while in flight, and the current `pickupStatus` is shown via a
`PickupStatusChip`. Calling the endpoint again (the same button, relabeled "Update pickup
request") changes the previously-requested time, since the backend always overwrites rather than
rejecting a second request — this is how "change the pickup time while still editable" is
satisfied, since the backend has no separate lock/edit-window concept.

**Still missing** (admin side): no `PUT /api/purchase-bags/{bagId}/pickup` (confirm/reject) or
`PUT /api/purchase-bags/{bagId}/ready` endpoint exists yet, and there's no `DELETE .../me/pickup`
to cancel a request either. `/admin/purchase-bags/:id` now *displays* `requestedPickupAt`,
`confirmedPickupAt`, `pickupNotes`, and `pickupStatus` (all real fields, read from the response),
but its "Confirm/Reject pickup" and "Mark ready" buttons stay disabled with an inline explanation
— wiring them up once those endpoints exist is a matter of removing `disabled` and adding the
HTTP calls.

## Component requests — new components only

"Request a new component" (`/my-requests/new`) now **only** creates `requestType: 'NEW_COMPONENT'`
requests — the form no longer offers reserving/holding an existing catalog item or picking a
pickup date, since the purchase bag is the correct tool for that now. The backend DTO/entity are
unchanged (`HOLD_EXISTING`, `inventoryId`, and `pickupExpiresAt` still exist and still work against
`POST /api/user-component-requests` if called directly), so `/admin/requests` still displays any
historical `HOLD_EXISTING` records correctly — this is a frontend-only restriction on how new
requests get created, not a backend contract change. Before submitting, the form searches
`/api/inventory/search` by name and by part number (merged client-side, since the endpoint only
AND-combines filters it's given) and requires the user to confirm no match fits before allowing
submission when matches are found — each match has its own "Add to bag" action.

## Known backend limitations

These were found while integrating against the real API (not assumed) and are **not** things this
frontend can fix on its own:

1. ~~The backend required authentication for catalog browsing~~ — **fixed**: `SecurityConfig` now
   permits `GET` on `/api/inventory/**` and `/api/component-types/**` (which also covers inventory
   images, nested under `/api/inventory/{id}/images`) without a token, while every write on those
   same paths still requires authentication. The catalog (list, search, detail, images) is a real
   public storefront now — anonymous visitors are never asked to sign in just to browse.
2. ~~No "get my own profile" endpoint~~ — **fixed**: the backend added `GET`/`PUT /api/auth/me`
   (`CurrentUserResponse`), keyed off the JWT subject directly, so no join is needed. The Profile
   page now fetches and lets a signed-in user edit their own name/contact/address (email and
   username remain read-only, matching the DTO). This does **not** fix item 3 below — the admin
   Users list still has no way to look up personal info from a login account, since
   `UserInformationResponse` (used by the admin `/api/users/information` endpoints) is unchanged.
3. ~~`UserInformationResponse` has no username/account-id field, so personal info couldn't be
   cross-referenced from a login account~~ — **fixed for lookups by id**: the backend added
   `GET /api/users/authentication/{id}`, reusing the same `AuthenticationService.getCurrentUser`
   lookup that backs `/api/auth/me`, so any admin screen that already has a
   `userAuthenticationId` can resolve it to full personal information. `/admin/users/:id` and
   `/admin/purchase-bags/:id` both do this now (see "Personal information lookup + profile QR
   code" above). This does **not** add a bulk listing, though: `/api/users/information` (plural)
   is unchanged and still has no username field, so the admin Users *roster* is still built from
   `/api/users/role-assignments` instead (which does carry username + role), and role changes are
   still create-new-assignment + delete-old-assignment, since there's no "update a role
   assignment" endpoint.
4. **No admin workflow for component requests beyond cancel.** `ComponentRequestStatus` has
   `APPROVED`, `READY_FOR_PICKUP`, `COMPLETED`, `REJECTED`, `EXPIRED`, but nothing in the API can
   ever set them — only `PENDING` (on create) and `CANCELLED` (the one `PUT .../cancel` endpoint)
   are reachable. The admin requests screen only offers what exists: view and cancel.
5. **No dedicated inventory quantity-adjustment endpoint.** Every quantity change goes through the
   same full `PUT /api/inventory/{id}` used for editing a component, and the backend derives the
   history action from the quantity delta automatically. The admin inventory form includes a
   "+/- amount" helper that computes the new quantity client-side before submitting, since that's
   the only backend operation that exists. There's also no field to attach a reason/note to a
   quantity change.
6. **No signed/expiring S3 URLs** — uploaded image URLs are permanent public bucket links.
7. **No password reset, 2FA, refresh token, or logout/revocation endpoints**, despite some unused
   columns existing on the `UserAuthentication` entity for a couple of these.
8. **The soft-delete endpoints on inventory and component types are effectively permanent** (no
   restore endpoint, and deleted rows are filtered out of every future query), so this UI never
   exposes a "delete" button for them — only the `active` toggle, which is reversible.
9. Every mutating request must carry a custom `X-User` header (a free-text audit label, unrelated
   to the JWT) or the backend rejects it. The `authInterceptor` attaches this automatically from
   the signed-in username.
10. ~~No pickup scheduling fields or endpoints exist on the purchase bag~~ — **partially fixed**:
    the self-service `PUT /api/purchase-bags/me/pickup` now exists and is wired up; the
    admin-side confirm/reject/ready endpoints still don't. See the "Pickup scheduling" section
    above for the exact remaining gap.
11. ~~The admin purchase-bag detail page could show the customer's username but not their contact
    info~~ — **fixed**, via the same `GET /api/users/authentication/{id}` endpoint from item 3.

## Recently added backend capabilities

- **Registration validation tightened**: `UserRegistrationRequest.username` now requires 6–100
  characters (was unbounded-minimum), and `password` requires 8–100 characters plus at least one
  special character (Java's `\p{Punct}` set — ASCII punctuation, not full Unicode). The register
  form's client-side validators mirror both rules exactly (`Register` in
  `features/auth/register/register.ts`), including the same punctuation set as a regex.
- **Account lockout** (`AccountLoginAttemptService`, `AccountLockStatusResponse`) exists on the
  backend — repeated failed logins lock an account, and `POST /api/users/authentication/{id}/unlock-temporary`
  / `.../unlock-permanent` (now correctly `ROLE_ADMINISTRATOR`-only in `SecurityConfig`, alongside
  role/role-assignment management) clear it. **Not yet wired into this frontend at all** — the
  admin Users page has no lockout status column or unlock action, and the login form doesn't
  distinguish a locked account from a wrong password (the backend intentionally returns the same
  generic "Invalid username or password" for both, a reasonable security choice, but it means a
  locked-out user currently has no way to know *why* their correct password isn't working).
