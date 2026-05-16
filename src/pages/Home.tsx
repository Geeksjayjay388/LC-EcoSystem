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
      className={`min-h-screen font-sans ${
        darkMode
          ? "bg-slate-950 text-slate-100"
          : "bg-[#f8fafc] text-slate-900"
      }`}
    >
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 h-screen border-r transition-all duration-300 ${
            sidebarCollapsed ? "w-20" : "w-72"
          } ${
            darkMode
              ? "border-slate-800 bg-slate-950"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <div className="mb-10 flex items-center justify-between">
              <div
                className={`flex items-center gap-3 ${
                  sidebarCollapsed ? "justify-center w-full" : ""
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                    darkMode
                      ? "border-slate-800 bg-slate-900"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="h-7 w-7 object-contain"
                  />
                </div>

                {!sidebarCollapsed && (
                  <div>
                    <h2
                      className={`text-sm font-semibold tracking-tight ${
                        darkMode ? "text-slate-100" : "text-slate-900"
                      }`}
                    >
                      LANET COMPUTERS
                    </h2>

                    <p className="text-xs text-blue-600 font-medium">
                      Eco-System
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                  darkMode
                    ? "border-slate-800 text-slate-400 hover:bg-slate-900"
                    : "border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const isActive = item.key === "files";

                return (
                  <button
                    key={item.key}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : darkMode
                        ? "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } ${sidebarCollapsed ? "justify-center" : ""}`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />

                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3">
              <button
                onClick={() => setDarkMode((prev) => !prev)}
                className={`flex h-11 w-full items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition ${
                  sidebarCollapsed ? "justify-center" : ""
                } ${
                  darkMode
                    ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}

                {!sidebarCollapsed && (
                  <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                )}
              </button>

              {!sidebarCollapsed && (
                <div>
                  <p
                    className={`truncate text-xs ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {session.user.email}
                  </p>
                </div>
              )}

              <button
                onClick={() => supabase.auth.signOut()}
                className={`flex h-11 w-full items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition ${
                  sidebarCollapsed ? "justify-center" : ""
                } ${
                  darkMode
                    ? "border-slate-800 text-slate-300 hover:bg-red-950/30 hover:text-red-400"
                    : "border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <LogOut className="h-4 w-4" />

                {!sidebarCollapsed && <span>Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-7xl p-6 lg:p-10">
            <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1
                  className={`text-3xl font-semibold tracking-tight ${
                    darkMode ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  Vault Dashboard
                </h1>

                <p
                  className={`mt-2 text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Secure cloud infrastructure for shared environments.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label
                  className={`flex h-11 cursor-pointer items-center gap-2 rounded-2xl px-5 text-sm font-medium text-white transition ${
                    uploading
                      ? "bg-blue-500"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {uploading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}

                  {uploading ? "Uploading..." : "Upload Files"}

                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </header>

            <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div
                className={`rounded-2xl border p-6 ${
                  darkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p
                  className={`text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Total Files
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  {files.length}
                </h2>
              </div>

              <div
                className={`rounded-2xl border p-6 ${
                  darkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p
                  className={`text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Storage Used
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  {formatFileSize(
                    files.reduce((acc, file) => acc + file.file_size, 0)
                  )}
                </h2>
              </div>

              <div
                className={`rounded-2xl border p-6 ${
                  darkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p
                  className={`text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Image Files
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  {files.filter((file) => isImageFile(file.name)).length}
                </h2>
              </div>

              <div
                className={`rounded-2xl border p-6 ${
                  darkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p
                  className={`text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  PDF Documents
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  {files.filter((file) => isPdfFile(file.name)).length}
                </h2>
              </div>
            </section>

            <section
              className={`mb-8 flex items-center gap-4 rounded-2xl border p-3 ${
                darkMode
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="relative flex-1">
                <Search
                  className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    darkMode ? "text-slate-500" : "text-slate-400"
                  }`}
                />

                <input
                  type="text"
                  placeholder="Search files..."
                  className={`h-11 w-full rounded-xl border-none bg-transparent pl-11 pr-4 text-sm focus:ring-0 ${
                    darkMode
                      ? "text-slate-100 placeholder:text-slate-500"
                      : "placeholder:text-slate-400"
                  }`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </section>

            {error && (
              <div className={`mb-8 rounded-2xl border px-4 py-3 text-sm font-medium ${darkMode ? "border-red-900 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-1 bg-blue-600 rounded-full" />
                  <div>
                    <h2 className={`text-xl font-black tracking-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Recent Vault Objects</h2>
                    <p className={`text-xs font-medium uppercase tracking-widest mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Central Cloud Feed</p>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${darkMode ? "bg-slate-900 text-slate-400 border-slate-800" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                  {filteredFiles.length} Objects Found
                </span>
              </div>

              {loadingFiles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => <div key={i} className={`h-72 border animate-pulse rounded-[24px] ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredFiles.map((file) => (
                    <div key={file.id} className={`group border rounded-[28px] overflow-hidden transition-all duration-300 flex flex-col ${darkMode ? "bg-slate-900 border-slate-800 hover:shadow-2xl hover:shadow-slate-950" : "bg-white border-slate-200 hover:shadow-2xl hover:shadow-slate-200"}`}>
                      <div 
                        onClick={() => (isImageFile(file.name) || isPdfFile(file.name)) && setPreviewFile(file)}
                        className={`aspect-square relative overflow-hidden flex items-center justify-center border-b ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"} ${(isImageFile(file.name) || isPdfFile(file.name)) ? 'cursor-pointer' : ''}`}
                      >
                        {isImageFile(file.name) ? (
                          <img src={file.public_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : isPdfFile(file.name) ? (
                          <div className={`w-full h-full relative overflow-hidden ${darkMode ? "bg-slate-900" : "bg-slate-100"}`}>
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
                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                <FileCode className={`h-8 w-8 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                            </div>
                            <span className="text-[10px] font-black text-blue-600 tracking-widest">{getFileExtension(file.name)}</span>
                          </div>
                        )}
                        
                        {(isImageFile(file.name) || isPdfFile(file.name)) && (
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <h3 className={`font-bold truncate text-sm mb-1 group-hover:text-blue-600 transition-colors ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{file.name}</h3>
                        <div className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter mb-5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDownload(file)}
                            className={`flex-1 p-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest shadow-md active:scale-95 ${darkMode ? "bg-slate-100 text-slate-950 hover:bg-blue-600 hover:text-white" : "bg-slate-900 text-white hover:bg-blue-600"}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                          {(isImageFile(file.name) || isPdfFile(file.name)) && (
                            <button 
                              onClick={() => setPreviewFile(file)}
                              className={`p-3 rounded-xl transition-all active:scale-95 border ${darkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-500" : "bg-white border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600"}`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {file.owner_id === session.user.id && (
                            <button 
                              onClick={() => setPendingDelete(file)}
                              className={`p-3 rounded-xl transition-all active:scale-95 border ${darkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-500" : "bg-white border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500"}`}
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
          </main>
        </div>
      </div>

      {uploadSuccessMessage && (
        <div className={`fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-2xl border p-4 shadow-2xl animate-in slide-in-from-right-10 duration-500 ${darkMode ? "border-slate-800 bg-slate-900 shadow-slate-950/50" : "border-emerald-100 bg-white shadow-emerald-200/50"}`}>
          <div className="flex gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? "bg-emerald-950/30" : "bg-emerald-50"}`}>
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Success</p>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{uploadSuccessMessage}</p>
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
              className="text-slate-400 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <h3 className={`text-lg font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Confirm deletion</h3>
            <p className={`mt-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              Are you sure you want to delete <span className="font-semibold">"{pendingDelete.name}"</span>?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className={`rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50 ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
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

      {previewFile && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 p-4 lg:p-10 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-6xl h-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className={`flex items-center justify-between p-5 rounded-t-[32px] border-b ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                  {isPdfFile(previewFile.name) ? <FileText className="h-5 w-5 text-red-600" /> : <Eye className="h-5 w-5 text-blue-600" />}
                </div>
                <div>
                    <h3 className={`font-bold text-sm truncate max-w-md ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{previewFile.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatFileSize(previewFile.file_size)}</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all border border-transparent ${darkMode ? "hover:bg-slate-800 hover:border-slate-700 text-slate-400" : "hover:bg-slate-100 hover:border-slate-200 text-slate-500"}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className={`flex-1 overflow-hidden rounded-b-[32px] ${darkMode ? "bg-slate-950" : "bg-white"}`}>
              {isPdfFile(previewFile.name) ? (
                <iframe 
                  src={`${previewFile.public_url}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center p-8 ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
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
