import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Download, Loader2, LogOut, Search, Trash2, Upload } from "lucide-react";
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

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "FILE";
  return parts[parts.length - 1].toUpperCase();
}

function isImageFile(fileName: string): boolean {
  const extension = getFileExtension(fileName).toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension);
}

function Home({ session }: HomeProps) {
  const [files, setFiles] = useState<EcosystemFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
      setError(`Storage upload failed: ${storageError.message}`);
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("ecosystem-vault")
      .getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from("lc_files").insert({
      name: file.name,
      public_url: publicData.publicUrl,
      file_size: file.size,
    });

    if (insertError) {
      setError(`Metadata insert failed: ${insertError.message}`);
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

  const handleDownload = async (ecosystemFile: EcosystemFile) => {
    setError(null);

    const storagePath = extractStoragePath(ecosystemFile.public_url);
    if (!storagePath) {
      setError("Could not determine storage path for this file.");
      return;
    }

    const { data, error: downloadError } = await supabase.storage
      .from("ecosystem-vault")
      .download(storagePath);

    if (downloadError) {
      setError(`Download failed: ${downloadError.message}`);
      return;
    }

    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = ecosystemFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleSignOut = async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
  };

  const filteredFiles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return files;
    }

    return files.filter((ecosystemFile) => {
      const fileName = ecosystemFile.name.toLowerCase();
      const extension = getFileExtension(ecosystemFile.name).toLowerCase();
      return fileName.includes(normalizedSearch) || extension.includes(normalizedSearch);
    });
  }, [files, searchTerm]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-blue-200 blur-3xl" />
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-indigo-100 blur-3xl" />
      </div>
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
              LC
            </div>
            <div>
            <h1 className="text-lg font-bold text-slate-900">Lanet Computers Eco-System</h1>
            <p className="text-xs text-slate-500">
              Signed in as <span className="font-semibold text-slate-700">{session.user.email}</span>
            </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </nav>

      <main className="relative mx-auto max-w-6xl space-y-6 px-6 py-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload file"}
              <input
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by file name or type..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none ring-blue-100 transition focus:border-blue-400 focus:bg-white focus:ring-2"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent files</h2>
              <p className="text-xs text-slate-500">Central vault feed</p>
            </div>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {filteredFiles.length} shown
            </span>
          </div>
          {loadingFiles ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading files...
            </div>
          ) : filteredFiles.length === 0 ? (
            <p className="text-slate-500">
              {files.length === 0 ? "No files uploaded yet." : "No files match your search."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredFiles.map((ecosystemFile) => {
                const canDelete = ecosystemFile.owner_id === session.user.id;
                return (
                  <article
                    key={ecosystemFile.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-100/70"
                  >
                    <div className="mb-3 h-28 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100/80 flex items-center justify-center">
                      {isImageFile(ecosystemFile.name) ? (
                        <img
                          src={ecosystemFile.public_url}
                          alt={ecosystemFile.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-sm font-semibold tracking-wide text-slate-500">
                          {getFileExtension(ecosystemFile.name)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900">{ecosystemFile.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatFileSize(ecosystemFile.file_size)} •{" "}
                      {new Date(ecosystemFile.created_at).toLocaleString()}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownload(ecosystemFile)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(ecosystemFile)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Home;
