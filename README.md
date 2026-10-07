# Kerala Paints – Appointment & Estimation Portal (MERN)

Customers book a free site visit, the super admin assigns it to a manager, the manager visits,
records measurements, and the system generates an itemised estimate that the customer approves
(or asks to change) from a WhatsApp link.

```
Customer books  ->  Super admin assigns  ->  Manager schedules visit  ->  Manager records measurements
      |                                                                          |
      v                                                                          v
 Ref no. shown                                               Estimate auto-computed (materials + prep + labour + GST)
                                                                                 |
                  Customer approves / requests changes  <-  Sent on WhatsApp (link)
                                 |
                                 v
                   Approved  ->  Manager marks job completed
```

## Stack
- **server/** Express, Mongoose, JWT, bcrypt, express-rate-limit
- **client/** React 18 + Vite, React Router, Axios, lucide-react (plain CSS, no UI framework)

## Run locally

```bash
# 1. API
cd server
cp .env.example .env        # fill MONGO_URI and JWT_SECRET
npm install
npm run seed                # creates the super admin + starter rate card
npm run dev                 # http://localhost:5000

# 2. Frontend
cd ../client
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

Log in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

## Pages

| URL | Who | What |
|---|---|---|
| `/` | Customer | Booking form (name, email, mobile, pincode, address, preferred date/time, WhatsApp opt-in) |
| `/estimate/:token` | Customer | Itemised estimate, approve / request changes, save as PDF (browser print) |
| `/admin` | Super admin | Pipeline counts by stage, bookings waiting for a manager |
| `/admin/appointments` | Super admin | Search, filter by stage/manager, assign & reassign |
| `/admin/appointments/:id` | Super admin | Full detail, site visit, estimate, activity log, cancel/complete/delete |
| `/admin/managers` | Super admin | Manager CRUD, pincodes covered, enable/disable login |
| `/admin/rates` | Super admin | Product prices, coverage, labour, GST, damp/crack/scraping rates |
| `/manager` | Manager | Own visits grouped by stage |
| `/manager/appointments/:id` | Manager | Schedule visit, record surfaces, live estimate, send on WhatsApp, mark completed |

## Appointment statuses
`new` → `assigned` → `scheduled` → `visited` (estimate ready) → `estimate_sent`
→ `approved` / `revision_requested` (back to manager) → `completed`. Also `cancelled`.

## How the estimate is calculated (`server/src/utils/estimate.js`)
Per surface, using the rate card row for its **surface type + product range**:
- Paint litres = area × coats ÷ coverage (rounded up to 0.5 L)
- Primer litres = area ÷ primer coverage (if the product uses primer)
- Putty kg = area × (2 coats if cracks/flaking else 1) ÷ putty coverage (interior only by default)
- Prep: scraping (flaking), crack filling (cracks), damp treatment by level – all per sq ft
- Labour = area × labour rate
- GST on the subtotal

All numbers in the seed are **placeholders** – replace them with real Kerala Paints products and
prices from the Rate card screen (no code change needed).

## Pincode routing
Each manager has a list of pincodes. When a booking arrives, the matching manager is stored as
`suggestedManager` and shown first in the Assign dialog. Assignment stays a super-admin decision.
To make it fully automatic, set `assignedTo` and `status: 'assigned'` in
`server/src/routes/public.js` when a match is found.

## API summary
```
POST   /api/auth/login                     GET /api/auth/me          PUT /api/auth/password
POST   /api/public/appointments            (rate limited)
GET    /api/public/estimate/:token         POST /api/public/estimate/:token/respond
GET    /api/admin/stats
GET|POST /api/admin/managers               PUT|DELETE /api/admin/managers/:id
GET    /api/admin/appointments?status=&manager=&q=&page=
GET|DELETE /api/admin/appointments/:id
PATCH  /api/admin/appointments/:id/assign  PATCH /api/admin/appointments/:id/status
GET    /api/admin/rates                    PUT /api/admin/rates/:id  PUT /api/admin/settings
GET    /api/manager/appointments           GET /api/manager/appointments/:id
PATCH  /api/manager/appointments/:id/schedule
POST   /api/manager/appointments/:id/preview-estimate   (live, not saved)
PUT    /api/manager/appointments/:id/site-visit         (save + generate estimate)
PATCH  /api/manager/appointments/:id/send-estimate      (returns WhatsApp link)
PATCH  /api/manager/appointments/:id/complete
```

## Deploy on Render
**Backend – Web Service**: root `server`, build `npm install`, start `npm start`.
Env: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL=https://your-frontend.onrender.com`. Run `npm run seed` once from the Shell tab.

**Frontend – Static Site**: root `client`, build `npm install && npm run build`, publish `dist`.
Env: `VITE_API_URL=https://your-api.onrender.com`.
Add a rewrite rule: source `/*` → destination `/index.html` (action *Rewrite*) so routes like `/admin` work on refresh.

## Good next steps
- **WhatsApp Cloud API**: today the manager taps "Send on WhatsApp", which opens `wa.me` with the message pre-filled (free, no approval). To send automatically, call the Cloud API with an approved template inside `send-estimate` and on booking confirmation.
- **Email OTP on booking** using Resend, the same way as the warranty portal, to stop fake bookings.
- **Server-side PDF** (e.g. pdfkit or puppeteer) if you need a PDF attachment rather than browser print.
- **Photos from site** – add image upload (Cloudinary/S3) to each surface.
- Replace the `Brand` component with the real Kerala Paints logo and adjust `--leaf` / `--turmeric` in `client/src/styles.css` to brand colours.
