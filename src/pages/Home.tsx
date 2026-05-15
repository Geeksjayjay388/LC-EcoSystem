import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Download, Loader2, LogOut, Trash2, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";

type HomeProps = {
  session: Session;
};

type EcosystemFile = {
  id: string;
  name: string;
  public_url: string;
  owner_id: string;
  file_size: number;
  created_at: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = "/object/public/ecosystem-vault/";
  const start = publicUrl.indexOf(marker);

  if (start === -1) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(start + marker.length));
}

function Home({ session }: HomeProps) {
  const [files, setFiles] = useState<EcosystemFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("lc_files")
      .select("id, name, public_url, owner_id, file_size, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoadingFiles(false);
      return;
    }

    setFiles(data ?? []);
    setLoadingFiles(false);
  };

  useEffect(() => {
    let active = true;

    void supabase
      .from("lc_files")
      .select("id, name, public_url, owner_id, file_size, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) {
          setError(fetchError.message);
          setLoadingFiles(false);
          return;
        }
        setFiles(data ?? []);
        setLoadingFiles(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const storagePath = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("ecosystem-vault")
      .upload(storagePath, file, { upsert: false });

    if (storageError) {
      setError(storageError.message);
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("ecosystem-vault")
      .getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from("lc_files").insert({
      name: file.name,
      public_url: publicData.publicUrl,
      owner_id: session.user.id,
      file_size: file.size,
    });

    if (insertError) {
      setError(insertError.message);
      setUploading(false);
      return;
    }

    event.target.value = "";
    setUploading(false);
    setLoadingFiles(true);
    await fetchFiles();
  };

  const handleDelete = async (ecosystemFile: EcosystemFile) => {
    setError(null);

    const storagePath = extractStoragePath(ecosystemFile.public_url);
    if (!storagePath) {
      setError("Could not determine storage path for this file.");
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("ecosystem-vault")
      .remove([storagePath]);

    if (storageError) {
      setError(storageError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from("lc_files")
      .delete()
      .eq("id", ecosystemFile.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setLoadingFiles(true);
    await fetchFiles();
  };

  const handleSignOut = async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">LC-Ecosystem Vault</h1>
            <p className="text-sm text-slate-400">
              Signed in as terminal <span className="font-semibold">{session.user.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-200">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload file"}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </section>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Recent files</h2>
          {loadingFiles ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <p className="text-slate-400">No files uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {files.map((ecosystemFile) => {
                const canDelete = ecosystemFile.owner_id === session.user.id;
                return (
                  <article
                    key={ecosystemFile.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">{ecosystemFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(ecosystemFile.file_size)} •{" "}
                        {new Date(ecosystemFile.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={ecosystemFile.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(ecosystemFile)}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Home;
