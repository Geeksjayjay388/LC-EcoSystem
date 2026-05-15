import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { 
  Download, 
  LogOut, 
  Search, 
  Trash2, 
  Upload, 
  FileText, 
  HardDrive, 
  User,
  FileCode
} from "lucide-react";
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
  if (start === -1) return null;
  return decodeURIComponent(publicUrl.slice(start + marker.length));
}

function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function isImageFile(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension);
}

function Home({ session }: HomeProps) {
  const [files, setFiles] = useState<EcosystemFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDelete, setPendingDelete] = useState<EcosystemFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = async () => {
    const { data, error: fetchError } = await supabase
      .from("lc_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setFiles(data ?? []);
    setLoadingFiles(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const storagePath = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("ecosystem-vault")
      .upload(storagePath, file);

    if (storageError) {
      setError(storageError.message);
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("ecosystem-vault").getPublicUrl(storagePath);

    await supabase.from("lc_files").insert({
      name: file.name,
      public_url: publicData.publicUrl,
      file_size: file.size,
    });

    setUploading(false);
    fetchFiles();
  };

  const handleDelete = async (file: EcosystemFile) => {
    setDeleting(true);
    const storagePath = extractStoragePath(file.public_url);
    if (!storagePath) {
      setError("Could not determine storage path for this file.");
      setDeleting(false);
      setPendingDelete(null);
      return;
    }

    await supabase.storage.from("ecosystem-vault").remove([storagePath]);
    await supabase.from("lc_files").delete().eq("id", file.id);
    setDeleting(false);
    setPendingDelete(null);
    fetchFiles();
  };

  const handleDownload = async (file: EcosystemFile) => {
    const storagePath = extractStoragePath(file.public_url);
    if (!storagePath) return;

    const { data } = await supabase.storage.from("ecosystem-vault").download(storagePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans">
      {/* Header */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
               <img src="/logo.png" alt="Lanet Computers" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">LANET COMPUTERS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-600 font-bold">Eco-System Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700">{session.user.email}</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">Terminal Active</span>
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="group flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-xs"
            >
              <LogOut className="h-4 w-4" />
              EXIT
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
        
        {/* Top Control Bar */}
        <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* White Search Bar */}
            <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search file repository..."
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:text-slate-400 text-sm shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                {uploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload New File"}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <section className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Total Files", val: files.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Storage Capacity", val: formatFileSize(files.reduce((a, b) => a + b.file_size, 0)), icon: HardDrive, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Your Uploads", val: files.filter(f => f.owner_id === session.user.id).length, icon: User, color: "text-emerald-600", bg: "bg-emerald-50" }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200/60 p-6 rounded-[24px] shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900">{stat.val}</p>
              </div>
              <div className={`${stat.bg} p-3 rounded-2xl`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          ))}
        </section>

        {/* File Browser */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3">
              <span className="h-8 w-1 bg-blue-600 rounded-full" />
              Recent Vault Objects
            </h2>
            <span className="bg-slate-200/50 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
              {filteredFiles.length} Results
            </span>
          </div>

          {loadingFiles ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-72 bg-white border border-slate-200 animate-pulse rounded-[24px]" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <div key={file.id} className="group bg-white border border-slate-200 rounded-[28px] overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300 flex flex-col">
                  {/* Thumbnail */}
                  <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {isImageFile(file.name) ? (
                      <img src={file.public_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <FileCode className="h-8 w-8 text-slate-400" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 tracking-widest">{getFileExtension(file.name)}</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 truncate text-sm mb-1 group-hover:text-blue-600 transition-colors">{file.name}</h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-5">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDownload(file)}
                        className="flex-1 bg-slate-900 hover:bg-blue-600 text-white p-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest shadow-md active:scale-95"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                      {file.owner_id === session.user.id && (
                        <button 
                          onClick={() => setPendingDelete(file)}
                          className="bg-white border border-slate-200 hover:border-red-200 hover:text-red-500 text-slate-400 p-3 rounded-xl transition-all active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pendingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">Confirm deletion</h3>
              <p className="mt-2 text-sm text-slate-600">
                Are you sure you want to delete <span className="font-semibold">"{pendingDelete.name}"</span>?
                This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(pendingDelete)}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete file"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const Loader = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default Home;
