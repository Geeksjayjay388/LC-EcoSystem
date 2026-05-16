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
  FileCode,
  Eye,
  X,
  CheckCircle2,
  FolderOpen,
  Tag,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun
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

function isPdfFile(fileName: string): boolean {
  return fileName.split(".").pop()?.toLowerCase() === "pdf";
}

function Home({ session }: HomeProps) {
  const [files, setFiles] = useState<EcosystemFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDelete, setPendingDelete] = useState<EcosystemFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<EcosystemFile | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("home-dark-mode") === "true";
  });

  const fetchFiles = async () => {
    const { data, error: fetchError } = await supabase
      .from("lc_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setFiles(data ?? []);
    }
    setLoadingFiles(false);
  };

  useEffect(() => {
    let active = true;

    void supabase
      .from("lc_files")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setError(null);
          setFiles(data ?? []);
        }
        setLoadingFiles(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("home-dark-mode", darkMode ? "true" : "false");
  }, [darkMode]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;

    setUploading(true);
    setError(null);
    setUploadSuccessMessage(null);

    let uploadedCount = 0;

    for (const file of selectedFiles) {
      const storagePath = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("ecosystem-vault")
        .upload(storagePath, file, { upsert: false });

      if (storageError) {
        setError(`Failed on "${file.name}": ${storageError.message}`);
        setUploading(false);
        event.target.value = "";
        return;
      }

      const { data: publicData } = supabase.storage.from("ecosystem-vault").getPublicUrl(storagePath);
      const { error: insertError } = await supabase.from("lc_files").insert({
        name: file.name,
        public_url: publicData.publicUrl,
        file_size: file.size,
      });

      if (insertError) {
        setError(`Failed on "${file.name}": ${insertError.message}`);
        setUploading(false);
        event.target.value = "";
        return;
      }

      uploadedCount += 1;
    }

    event.target.value = "";
    setUploading(false);
    setUploadSuccessMessage(
      uploadedCount === 1
        ? `Successfully uploaded "${selectedFiles[0].name}".`
        : `Successfully uploaded ${uploadedCount} files.`
    );
    setLoadingFiles(true);
    await fetchFiles();
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

  const sidebarItems = [
    { key: "files", label: "Files (Home)", icon: FolderOpen },
    { key: "stickers", label: "Stickers", icon: Tag },
    { key: "students", label: "Students Portal", icon: GraduationCap },
  ];

  return (
    <div
      className={`min-h-screen font-sans relative ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full blur-[120px] ${
            darkMode ? "bg-blue-900/20" : "bg-blue-50/50"
          }`}
        />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside
          className={`sticky top-0 z-30 h-screen border-r backdrop-blur-md transition-all duration-300 ${
            darkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-white/90"
          } ${
            sidebarCollapsed ? "w-20" : "w-72"
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <div className="mb-8 flex items-center justify-between gap-2">
              <div className={`flex items-center gap-3 ${sidebarCollapsed ? "w-full justify-center" : ""}`}>
                <div className={`h-11 w-11 rounded-xl shadow-sm flex items-center justify-center ${darkMode ? "border border-slate-700 bg-slate-800" : "border border-slate-100 bg-white"}`}>
                  <img src="/logo.png" alt="Lanet Computers" className="h-8 w-8 object-contain" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <p className={`text-sm font-black tracking-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>LANET COMPUTERS</p>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-blue-600 font-bold">Eco-System</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className={`h-9 w-9 rounded-lg border transition-colors ${
                  darkMode
                    ? "border-slate-700 text-slate-300 hover:text-blue-400 hover:border-blue-500"
                    : "border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200"
                } ${
                  sidebarCollapsed ? "mx-auto mt-2" : ""
                }`}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="mx-auto h-4 w-4" />
                ) : (
                  <ChevronLeft className="mx-auto h-4 w-4" />
                )}
              </button>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const isActive = item.key === "files";
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`w-full rounded-xl px-3 py-3 flex items-center gap-3 text-sm font-bold transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                        : darkMode
                          ? "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } ${sidebarCollapsed ? "justify-center" : ""}`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className={`mb-3 w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  sidebarCollapsed ? "flex items-center justify-center" : "flex items-center gap-2"
                } ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {!sidebarCollapsed && (darkMode ? "Light Mode" : "Dark Mode")}
              </button>
              {!sidebarCollapsed && (
                <p className={`mb-2 truncate text-xs font-bold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{session.user.email}</p>
              )}
              <button
                onClick={() => supabase.auth.signOut()}
                className={`group w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  sidebarCollapsed ? "flex items-center justify-center" : "flex items-center gap-2"
                } ${
                  darkMode
                    ? "border-slate-700 text-slate-300 hover:border-red-800 hover:bg-red-950/30 hover:text-red-400"
                    : "border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <LogOut className="h-4 w-4" />
                {!sidebarCollapsed && "EXIT"}
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
            <p className={`text-sm font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Shared files should appear here.</p>
            <section className={`flex flex-col md:flex-row gap-4 items-center p-2 rounded-[28px] border shadow-sm ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
              <div className="relative flex-1 group">
                <Search className={`absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 group-focus-within:text-blue-500 transition-colors ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="text"
                  placeholder="Search the encrypted vault..."
                  className={`w-full bg-transparent border-none rounded-2xl py-4 pl-14 pr-6 focus:ring-0 text-sm font-medium ${darkMode ? "text-slate-100 placeholder:text-slate-500" : "placeholder:text-slate-400"}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-[22px] font-bold text-sm transition-all shadow-xl shadow-slate-200 active:scale-95 whitespace-nowrap group">
                {uploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-5 w-5 transition-transform group-hover:-translate-y-1" />}
                {uploading ? "Uploading..." : "Add Files"}
                <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </section>

            {error && (
              <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${darkMode ? "border-red-900 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                {error}
              </div>
            )}

        {/* File Browser section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-1 bg-blue-600 rounded-full" />
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Vault Objects</h2>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-0.5">Central Cloud Feed</p>
                </div>
              </div>
              <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                {filteredFiles.length} Objects Found
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
                  <div 
                    onClick={() => (isImageFile(file.name) || isPdfFile(file.name)) && setPreviewFile(file)}
                    className={`aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100 ${ (isImageFile(file.name) || isPdfFile(file.name)) ? 'cursor-pointer' : ''}`}
                  >
                    {isImageFile(file.name) ? (
                      <img src={file.public_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : isPdfFile(file.name) ? (
                      <div className="w-full h-full relative overflow-hidden bg-slate-100">
                        <iframe 
                          src={`${file.public_url}#page=1&toolbar=0&navpanes=0&scrollbar=0`} 
                          className="w-[200%] h-[200%] border-none origin-top-left scale-[0.5] pointer-events-none"
                          title="PDF Preview"
                        />
                        <div className="absolute top-2 right-2 rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">
                          PDF
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <FileCode className="h-8 w-8 text-slate-400" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 tracking-widest">{getFileExtension(file.name)}</span>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    {(isImageFile(file.name) || isPdfFile(file.name)) && (
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-8 w-8 text-white" />
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
                      {(isImageFile(file.name) || isPdfFile(file.name)) && (
                        <button 
                          onClick={() => setPreviewFile(file)}
                          className="bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 text-slate-400 p-3 rounded-xl transition-all active:scale-95"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
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

        {uploadSuccessMessage && (
          <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl shadow-emerald-200/50 animate-in slide-in-from-right-10 duration-500">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Success</p>
                <p className="text-xs text-slate-500 mt-0.5">{uploadSuccessMessage}</p>
                <button
                  type="button"
                  onClick={() => setUploadSuccessMessage(null)}
                  className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Dismiss
                </button>
              </div>
              <button 
                onClick={() => setUploadSuccessMessage(null)}
                className="text-slate-300 hover:text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
      </div>

      {/* Full-Screen Preview Portal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 p-4 lg:p-10 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-6xl h-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 bg-white rounded-t-[32px] border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  {isPdfFile(previewFile.name) ? <FileText className="h-5 w-5 text-red-600" /> : <Eye className="h-5 w-5 text-blue-600" />}
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-sm truncate max-w-md">{previewFile.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatFileSize(previewFile.file_size)}</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="h-10 w-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            {/* Content Area */}
            <div className="flex-1 bg-white overflow-hidden rounded-b-[32px]">
              {isPdfFile(previewFile.name) ? (
                <iframe 
                  src={`${previewFile.public_url}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 bg-slate-50">
                  <img src={previewFile.public_url} alt="" className="max-w-full max-h-full object-contain shadow-xl rounded-lg" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
