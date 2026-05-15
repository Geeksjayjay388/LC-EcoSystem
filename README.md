<p align="center">
  <img src="public/logo.png" alt="Lanet Computers Logo" width="200"/>
</p>

<h1 align="center">🛰️ LANET COMPUTERS ECO‑SYSTEM</h1>

**A Private Cloud File‑Sharing Platform for Cyber‑Cafe Environments**

---

## 📢 Problem Statement

In many cyber‑cafés and shared‑computer labs, users still rely on **physical flash drives** to transfer files between workstations. This approach is:
- **Time‑consuming** – users must physically walk between terminals.
- **Risky** – drives can be lost, infected, or contain sensitive data.
- **Inconvenient** – limits collaboration and instant access.

**LC‑Ecosystem** was created to eliminate these pain points by providing a **fast, secure, and cloud‑native** solution that works seamlessly across all machines in a network, allowing users to post, retrieve, and manage files instantly.

---

## 🚀 Core Features

- **Secure Authentication** – Supabase Auth powers per‑user accounts.
- **Cloud Posting** – Upload images, PDFs, docs, etc., to a shared vault.
- **Centralized Feed** – Browse, download, and manage files from a single homepage.
- **Persistent Storage** – Hosted on Vercel with Supabase PostgreSQL; data never vanishes when servers sleep.
- **Cross‑Device Access** – Upload on a home laptop, download instantly at the cyber‑café counter.
- **Granular Row‑Level Security** – Users can only view public files and delete their own uploads.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **IDE** | Antigravity |
| **Framework** | Vite + React (TSX) |
| **Language** | TypeScript |
| **Auth & DB** | Supabase (Auth, PostgreSQL, Storage) |
| **Styling** | Tailwind CSS |
| **Hosting** | Vercel |

---

## 📦 Setup & Installation

```bash
# Clone the repository
git clone https://github.com/geeksjayjay388/lc-ecosystem.git
cd lc-ecosystem

# Install dependencies
npm install

# Install Tailwind‑Vite plugin (required for styling)
npm install @tailwindcss/vite
```

### Environment Variables
Create a `.env` file at the project root (or copy from `.env.example`) with the following keys:

```dotenv
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```
> **Note:** The variables must be prefixed with `VITE_` so Vite can expose them to the client.

### Database & Storage
1. Open the Supabase dashboard → **SQL editor**.
2. Run the contents of `src/lib/supabase.sql` to create:
   - `ecosystem‑vault` storage bucket
   - `lc_files` table
   - Row‑level security policies
3. Ensure the bucket is **public** for downloading files.

---

## ▶️ Development

```bash
npm run dev
```
Open <http://localhost:5173> in your browser. The app will hot‑reload on changes.

---


---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).
3. Ensure the app runs locally and passes TypeScript checks.
4. Open a Pull Request describing the change.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

*Developed by Engineer Jacob-Sihul.*
