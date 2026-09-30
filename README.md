# SiltLine: Erosion Control Field Log

A mobile-first web app for erosion control contractors. Foremen log each day's work, and owners, managers and the office follow along. There are no logins and no paid services. Everything is stored in the browser (IndexedDB), and the app works offline once it has loaded.

## Features

- **Your own jobsite photos up front**: the home banner, job cards and job pages show each job's cover photo or the latest site photo from its daily logs. Jobs without photos get a topographic contour background. Big touch targets, and a center **+** button for anything you need to log.
- **Home dashboard**:
  - one-tap "Start today's log"
  - alerts for inspections due, overdue requests and unsubmitted logs
  - quick tiles for daily log, rain gauge, requests and crew chat
  - month-to-date production: silt fence, wattles, inlet protection, mowing acres, rainfall, crew hours
- **Stormwater management** (per-job tab):
  - rain gauge log with a 30-day rainfall chart
  - automatic post-rain inspection trigger (default 0.5") and routine inspection interval (default 7 days), both adjustable to match your permit
  - inspection history with good / maintenance / failed counts
  - tally of stormwater BMPs on site (inlets, check dams, skimmers, outlet protection…)
- **Mowing and vegetation** pay items (bush hogging AC, pond bank mowing, string trimming) alongside stormwater items (skimmers, dewatering bags, basin cleanout, outlet protection, inlet cleaning, level spreaders).

- **Jobs**: project name, job #, GC and superintendent, location (links to maps), permit/SWPPP #, scope notes.
- **Daily logs** (autosave):
  - day details: date, foreman, start/end times, weather, temperature, site conditions
  - crew members and hours, with a running total and "same crew as last log"
  - BMPs installed with quantities, grouped from the BMP catalog (silt fence LF, wattles LF, inlet protection EA, rock entrances EA, ECB SY, hydroseed SF…), plus custom items
  - repairs and maintenance (repair / maintenance / replace / clean out / remove) with quantities
  - materials used
  - notes and photos (compressed on the device, with captions)
  - an optional **BMP inspection checklist**: inspection type, rainfall, and Good / Needs maint. / Failed / N/A for each BMP, with one tap to turn a deficiency into a repair request
- **Repair requests** from the GC, inspector, owner or engineer: priority, due date, overdue flag, and mark complete with a note. A request can be completed from inside a daily log.
- **PDF daily report**: branded, covering crew, BMPs, repairs, materials, requests, inspection, notes, photos and signature lines.
- **Running quantity totals per job** for billing. Filter by billing period, set unit rates in Settings, optionally bill repair quantities too, and export CSV or a PDF quantity summary.
- **Team communication**: a company-wide channel plus one chat per job, with role badges (Foreman, Owner, Manager, Office, Crew) and urgent messages. Log submissions and request activity are posted to the job chat automatically.
- **Profiles without logins**: pick who is using the device so logs and messages are attributed.
- **Data sharing and backup**: export all data or a single job as a file and import it on another device. Imports merge, and the newer copy of each record wins.
- Light and dark themes. Installable as a PWA ("Add to Home Screen").

## Running it

It is a static site with no build step. Serve the folder with any static web server:

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

It can also be hosted for free on GitHub Pages, Netlify or Cloudflare Pages. Opening `index.html` directly from disk mostly works, but offline caching needs http(s).

On first launch, enter your name and role, then tap **Load a sample job** to explore.

## Limitations

Data lives only in the browser on each device. The team shares information by exporting and importing files (Settings → Data, or a job's Info tab → "Send job data"). Real-time sync between phones would need a backend, which can be added later.

## Structure

```
index.html            app shell
css/styles.css        styles (earth-tone palette, dark mode)
js/db.js              IndexedDB storage, export/import
js/art.js             topographic contour backgrounds (fallback when a job has no photos)
js/catalog.js         default BMP catalog, roles, conditions
js/ui.js              helpers (sheets, toasts, image compression, downloads)
js/pdf.js             daily report + quantity summary PDFs
js/app.js             views and routing
vendor/               jsPDF 2.5.2 + jspdf-autotable 3.8.4 (MIT)
sw.js                 offline cache
```
