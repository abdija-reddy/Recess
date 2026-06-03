# Recess Wellness Journal & Planner (Pure Vanilla SPA)

Recess is a polished, aesthetic, and planner-inspired digital wellness journal designed to feel like a beautiful physical spiral notebook. 

This version is built as a **pure Vanilla HTML/CSS/JavaScript Single Page Application (SPA)** that runs natively in your browser with **zero compile steps or build tools**!

---

## Files Structure

- **`index.html`**: The unified frontend structure. Holds landing headers, features dashboards, monthly calendar planners, reflections splitting logs, and configurations.
- **`app.css`**: Styling sheets for handwritten rounded fonts (`Fredoka` & `Quicksand`), metadata rings visual column, shadows, scrollbars, and print optimization parameters.
- **`app.js`**: Core controllers managing navigation route switches, logins / registrations session gates, dynamic grid date drawings, and analytics charts.
- **`db.js`**: Handles local `localStorage` sandbox simulation OR live `supabaseClient` data streaming dynamically.
- **`schema.sql`**: PostgreSQL database setup script for cloud deployment on Supabase.

---

## How to Run Locally

### Method 1: Direct File Opening (Fastest)
1. Double-click **`index.html`** or drag it directly into any modern web browser (Google Chrome, Apple Safari, Mozilla Firefox).
2. Play around with the preseeded Guest Demo Calendar, reflections sheets, stats line/bar charts, and opt-in cycles tracker!

### Method 2: Local Static File Server (Recommended)
Running through a local static server ensures all browser sandboxing works cleanly:
- **If you have Node.js**:
  ```bash
  npx serve ./
  ```
- **If you have Python**:
  ```bash
  python -m http.server
  ```
Then open the local address displayed in your browser.

---

## Connecting Live Supabase Database

1. Create a database project in [Supabase](https://supabase.com/).
2. Navigate to the SQL Editor in your Supabase dashboard and run the queries defined in [`schema.sql`](file:///Users/AJ/Desktop/recess/schema.sql) to create tables and set up Row-Level Security (RLS).
3. Open [`db.js`](file:///Users/AJ/Desktop/recess/db.js) in your editor. At the very top, replace the placeholders with your actual Supabase URL and Anon Key credentials:
   ```javascript
   const SUPABASE_URL = 'https://your-supabase-url.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```
4. Refresh your browser window. Recess will output: `Recess: Supabase Cloud Client Initialized successfully! 🌸` in the developer console. Your data is now securely saved and synced in the cloud!
