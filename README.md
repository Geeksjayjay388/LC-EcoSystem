🛸 LC-Ecosystem
A Private Cloud File-Sharing Platform for Cyber Environments.

LC-Ecosystem is a custom-built, secure platform designed to replace physical flash disks. It allows users to "Post" files, images, and documents to a central vault and access them from any computer within the network or remotely.

🚀 Core Features
Secure Authentication: User-specific accounts powered by Supabase Auth.

Cloud Posting: Upload files (images, PDFs, Docs) directly to the ecosystem-vault.

Centralized Feed: A unified homepage to view, download, and manage files.

Persistent Storage: Hosted on Vercel with a Supabase PostgreSQL backend—no data loss when servers sleep.

Cross-Device Access: Send a document from a home laptop and download it at the cyber counter instantly.

🛠️ Tech Stack
IDE: Antigravity

Framework: Next.js (App Router)

Language: TypeScript

Database & Auth: Supabase

Storage: Supabase Storage (S3 Wrapper)

Hosting: Vercel

Styling: Tailwind CSS

📦 Database Schema (lc_files)
Column	Type	Description
id	UUID	Primary Key
name	Text	Original file name
public_url	Text	Link to download the file
owner_id	UUID	References auth.users
file_size	Int8	Size in bytes
created_at	Timestamp	Upload date/time

⚙️ Setup & Installation
Clone the repository:

Bash
git clone https://github.com/yourusername/lc-ecosystem.git

Configure Environment Variables:
Create a .env.local file in the root and add your Supabase credentials:

Code snippet
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

Initialize Supabase:

Create a bucket named ecosystem-vault in Storage.

Run the provided SQL migration to create the lc_files table.

Enable Row Level Security (RLS) policies.

Run Development Mode:

Bash
   npm run dev

🛡️ Security Policies (RLS)
The ecosystem uses strict Row Level Security:

View: All authenticated users can view and download files.

Upload: Only authenticated users can upload.

Delete: Users can only delete files they personally uploaded.

Developed with 💻 in the Antigravity IDE.
