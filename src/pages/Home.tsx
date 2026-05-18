import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { jsPDF } from "jspdf";
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
  Sun,
  Check
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

type SidebarTab = "files" | "stickers" | "students";
type StickerType = "lipa-na-mpesa" | "paybill" | "pochi-la-biashara";

type StickerField = {
  key: string;
  label: string;
  placeholder: string;
};

type StickerTemplate = {
  label: string;
  templatePath: string;
  fields: StickerField[];
};

type StickerPosition = {
  x: number;
  y: number;
};

type StickerFieldStyle = StickerPosition & {
  fontSize: number;
  maxWidthPct: number;
  color: string;
  fontWeight: number;
  locked?: boolean;
  fixedText?: string;
  fontFamily?: string;
  letterSpacing?: number;
  scaleY?: number;
};

const STICKER_TEMPLATES: Record<StickerType, StickerTemplate> = {
  "lipa-na-mpesa": {
    label: "Lipa na Mpesa",
    templatePath: "/LipaNaMpesa.jpg",
    fields: [{ key: "tillNumber", label: "Till Number", placeholder: "123456" }],
  },
  paybill: {
    label: "Paybill",
    templatePath: "/Paybill.jpg",
    fields: [
      { key: "paybillNumber", label: "Paybill Number", placeholder: "400200" },
      { key: "accountNumber", label: "Account Number", placeholder: "ACC001" },
    ],
  },
  "pochi-la-biashara": {
    label: "Pochi la Biashara",
    templatePath: "/PochiLaBiashara.jpg",
    fields: [
      { key: "phoneNumber", label: "Number", placeholder: "07XXXXXXXX" },
    ],
  },
};



const STICKER_FIELD_STYLE_DEFAULTS: Record<StickerType, Record<string, StickerFieldStyle>> = {
  "lipa-na-mpesa": {
    tillNumber: { x: 54, y: 59.5, fontSize: 147, maxWidthPct: 100, color: "#111827", fontWeight: 900, fontFamily: "Arial", letterSpacing: 89, scaleY: 1 },
  },
  paybill: {
    paybillNumber: { x: 53, y: 53, fontSize: 195, maxWidthPct: 100, color: "#111827", fontWeight: 700, fontFamily: "Arial", letterSpacing: 91.5, scaleY: 1.3 },
    accountNumber: { x: 47, y: 90, fontSize: 122, maxWidthPct: 76, color: "#111827", fontWeight: 900, fontFamily: "Arial", letterSpacing: 29, scaleY: 1.25 },
  },
  "pochi-la-biashara": {
    phoneNumber: { x: 50, y: 80.5, fontSize: 158, maxWidthPct: 99, color: "#111827", fontWeight: 700, fontFamily: "Arial", letterSpacing: 5.0, scaleY: 1.30 },
  },
};

function getStickerValuesFromTemplate(template: StickerTemplate, previousValues?: Record<string, string>) {
  return template.fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = previousValues?.[field.key] ?? "";
    return acc;
  }, {});
}

function formatPochiNumber(val: string): string {
  const clean = val.replace(/\D/g, "");
  
  if (clean.startsWith("254")) {
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 3)} ${clean.slice(3, 7)}`;
    if (clean.length <= 10) return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 10)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 10)} ${clean.slice(10, 12)}`;
  }
  
  if (clean.startsWith("0")) {
    if (clean.length <= 4) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 4)} ${clean.slice(4, 7)}`;
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 10)}`;
  }
  
  if (clean.startsWith("7") || clean.startsWith("1")) {
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3, 6)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
  }
  
  return val;
}

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
  const [activeTab, setActiveTab] = useState<SidebarTab>("files");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("home-dark-mode") === "true";
  });
  const [stickerType, setStickerType] = useState<StickerType>("lipa-na-mpesa");
  const [stickerValues, setStickerValues] = useState<Record<string, string>>(() =>
    getStickerValuesFromTemplate(STICKER_TEMPLATES["lipa-na-mpesa"])
  );
  const [generatingSticker, setGeneratingSticker] = useState(false);
  const [generatedStickerPreview, setGeneratedStickerPreview] = useState<string | null>(null);
  const [stickerError, setStickerError] = useState<string | null>(null);

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

  const currentStickerTemplate = STICKER_TEMPLATES[stickerType];
  const currentStickerStyles = STICKER_FIELD_STYLE_DEFAULTS[stickerType] || {};

  const handleStickerTypeChange = (nextType: StickerType) => {
    setStickerType(nextType);
    setStickerValues((prev) => getStickerValuesFromTemplate(STICKER_TEMPLATES[nextType], prev));
    setGeneratedStickerPreview(null);
    setStickerError(null);
  };

  const handleStickerFieldValueChange = (fieldKey: string, value: string) => {
    setStickerValues((prev) => ({ ...prev, [fieldKey]: value }));
    setGeneratedStickerPreview(null);
    setStickerError(null);
  };



  const generateStickerPreview = async () => {
    const hasMissingValue = currentStickerTemplate.fields.some((field) => {
      const style = currentStickerStyles[field.key];
      if (style?.fixedText || style?.locked) return false;
      return !(stickerValues[field.key] ?? "").trim();
    });
    if (hasMissingValue) {
      setStickerError("Please fill all sticker fields before generating.");
      return;
    }

    // Ensure all Google Web Fonts are fully downloaded and active before drawing to the canvas
    await document.fonts.ready;

    setGeneratingSticker(true);
    setStickerError(null);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not load template image."));
        img.src = currentStickerTemplate.templatePath;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to initialize drawing canvas.");

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      for (const field of currentStickerTemplate.fields) {
        const style = currentStickerStyles[field.key];
        if (!style) continue;
        let text = (style.fixedText ?? stickerValues[field.key] ?? "").trim();
        if (stickerType === "pochi-la-biashara" && field.key === "phoneNumber") {
          text = formatPochiNumber(text);
        }
        if (!text) continue;

        const x = (style.x / 100) * canvas.width;
        const y = (style.y / 100) * canvas.height;
        const maxWidth = (style.maxWidthPct / 100) * canvas.width;
        let fontSize = style.fontSize;

        ctx.fillStyle = style.color;
        const ctxWithLetterSpacing = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
        if ("letterSpacing" in ctxWithLetterSpacing) {
          ctxWithLetterSpacing.letterSpacing = `${style.letterSpacing ?? 0}px`;
        }
        ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily || "Arial"}, sans-serif`;
        while (ctx.measureText(text).width > maxWidth && fontSize > 14) {
          fontSize -= 1;
          ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily || "Arial"}, sans-serif`;
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, style.scaleY ?? 1);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 0, 0, maxWidth);
        ctx.restore();
      }

      setGeneratedStickerPreview(canvas.toDataURL("image/png"));
    } catch (previewError) {
      const message = previewError instanceof Error ? previewError.message : "Failed to generate sticker preview.";
      setStickerError(message);
    } finally {
      setGeneratingSticker(false);
    }
  };

  const downloadGeneratedSticker = () => {
    if (!generatedStickerPreview) return;
    const anchor = document.createElement("a");
    anchor.href = generatedStickerPreview;
    anchor.download = `${stickerType}-sticker.png`;
    anchor.click();
  };

  const downloadGeneratedStickerAsPDF = () => {
    if (!generatedStickerPreview) return;
    const img = new Image();
    img.src = generatedStickerPreview;
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const orientation = width > height ? "l" : "p";
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "px",
        format: [width, height]
      });
      pdf.addImage(generatedStickerPreview, "PNG", 0, 0, width, height);
      pdf.save(`${stickerType}-sticker.pdf`);
    };
  };



  const sidebarItems = [
    { key: "files", label: "Files (Home)", icon: FolderOpen },
    { key: "stickers", label: "Stickers", icon: Tag },
    { key: "students", label: "Students Portal", icon: GraduationCap },
  ] as const;

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
                const isActive = item.key === activeTab;

                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
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
            {activeTab === "files" && (
              <div className="space-y-8">
                <p className={`text-sm font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Shared files should appear here.
                </p>

                <section
                  className={`flex flex-col items-center gap-4 rounded-2xl border p-3 md:flex-row ${
                    darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
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
                        darkMode ? "text-slate-100 placeholder:text-slate-500" : "placeholder:text-slate-400"
                      }`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <label
                    className={`flex h-11 cursor-pointer items-center gap-2 rounded-2xl px-5 text-sm font-medium text-white transition ${
                      uploading ? "bg-blue-500" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {uploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading..." : "Upload Files"}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                  </label>
                </section>

                {error && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      darkMode ? "border-red-900 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-1 rounded-full bg-blue-600" />
                      <div>
                        <h2 className={`text-xl font-black tracking-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                          Recent Vault Objects
                        </h2>
                        <p
                          className={`mt-0.5 text-xs font-medium uppercase tracking-widest ${
                            darkMode ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          Central Cloud Feed
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                        darkMode ? "border-slate-800 bg-slate-900 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {filteredFiles.length} Objects Found
                    </span>
                  </div>

                  {loadingFiles ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-72 animate-pulse rounded-[24px] border ${
                            darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`group flex flex-col overflow-hidden rounded-[28px] border transition-all duration-300 ${
                            darkMode
                              ? "border-slate-800 bg-slate-900 hover:shadow-2xl hover:shadow-slate-950"
                              : "border-slate-200 bg-white hover:shadow-2xl hover:shadow-slate-200"
                          }`}
                        >
                          <div
                            onClick={() => (isImageFile(file.name) || isPdfFile(file.name)) && setPreviewFile(file)}
                            className={`relative aspect-square overflow-hidden border-b ${
                              darkMode ? "border-slate-800 bg-slate-950" : "border-slate-100 bg-slate-50"
                            } ${(isImageFile(file.name) || isPdfFile(file.name)) ? "cursor-pointer" : ""}`}
                          >
                            {isImageFile(file.name) ? (
                              <img src={file.public_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : isPdfFile(file.name) ? (
                              <div className={`relative h-full w-full overflow-hidden ${darkMode ? "bg-slate-900" : "bg-slate-100"}`}>
                                <iframe
                                  src={`${file.public_url}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                                  className="h-[200%] w-[200%] origin-top-left scale-[0.5] border-none pointer-events-none"
                                  title="PDF Preview"
                                />
                                <div className="absolute right-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">
                                  PDF
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                  <FileCode className={`h-8 w-8 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                                </div>
                                <span className="text-[10px] font-black tracking-widest text-blue-600">{getFileExtension(file.name)}</span>
                              </div>
                            )}

                            {(isImageFile(file.name) || isPdfFile(file.name)) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                                <Eye className="h-8 w-8 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <h3 className={`mb-1 truncate text-sm font-bold transition-colors group-hover:text-blue-600 ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                              {file.name}
                            </h3>
                            <div className={`mb-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>{new Date(file.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownload(file)}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl p-3 text-[11px] font-bold uppercase tracking-widest shadow-md transition-all active:scale-95 ${
                                  darkMode ? "bg-slate-100 text-slate-950 hover:bg-blue-600 hover:text-white" : "bg-slate-900 text-white hover:bg-blue-600"
                                }`}
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </button>
                              {(isImageFile(file.name) || isPdfFile(file.name)) && (
                                <button
                                  onClick={() => setPreviewFile(file)}
                                  className={`rounded-xl border p-3 transition-all active:scale-95 ${
                                    darkMode
                                      ? "border-slate-700 bg-slate-800 text-slate-400 hover:border-blue-500 hover:text-blue-500"
                                      : "border-slate-200 bg-white text-slate-400 hover:border-blue-200 hover:text-blue-600"
                                  }`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              {file.owner_id === session.user.id && (
                                <button
                                  onClick={() => setPendingDelete(file)}
                                  className={`rounded-xl border p-3 transition-all active:scale-95 ${
                                    darkMode
                                      ? "border-slate-700 bg-slate-800 text-slate-400 hover:border-red-500 hover:text-red-500"
                                      : "border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:text-red-500"
                                  }`}
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
              </div>
            )}

            {activeTab === "stickers" && (
              <div className="space-y-6">
                <div>
                  <h1 className={`text-2xl font-semibold tracking-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                    Sticker Generator
                  </h1>
                  <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Select a sticker type, drag the fields on the template, preview, then download PNG.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
                  <section className={`rounded-2xl border p-5 ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                    <div className="space-y-4">
                      <div>
                        <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                          Sticker Type
                        </label>
                        <select
                          value={stickerType}
                          onChange={(e) => handleStickerTypeChange(e.target.value as StickerType)}
                          className={`h-11 w-full rounded-xl border px-3 text-sm ${
                            darkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                          }`}
                        >
                          {Object.entries(STICKER_TEMPLATES).map(([value, template]) => (
                            <option key={value} value={value}>
                              {template.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {currentStickerTemplate.fields.map((field) => {
                        const style = currentStickerStyles[field.key];
                        if (!style) return null;
                        const isFixed = style.fixedText !== undefined;

                        return (
                          <div key={field.key} className="space-y-2">
                            <label className={`block text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                              {field.label} {isFixed && <span className="text-[10px] text-slate-500 font-medium">(Fixed)</span>}
                            </label>
                            
                            <input
                              type="text"
                              maxLength={
                                field.key === "paybillNumber" ? 6 :
                                field.key === "phoneNumber" ? 10 :
                                field.key === "tillNumber" ? 6 :
                                undefined
                              }
                              value={isFixed ? style.fixedText : (stickerValues[field.key] ?? "")}
                              placeholder={field.placeholder}
                              disabled={isFixed}
                              onChange={(e) => {
                                if (!isFixed) {
                                  handleStickerFieldValueChange(field.key, e.target.value);
                                }
                              }}
                              className={`h-11 w-full rounded-xl border px-3 text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                isFixed
                                  ? darkMode 
                                    ? "border-slate-800 bg-slate-900/50 text-slate-500 cursor-not-allowed" 
                                    : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                  : darkMode
                                    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
                              }`}
                            />
                          </div>
                        );
                      })}


                      <div className="space-y-3 pt-2">
                        <button
                          type="button"
                          onClick={() => void generateStickerPreview()}
                          disabled={generatingSticker}
                          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                        >
                          {generatingSticker ? "Generating..." : "Generate Preview"}
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={downloadGeneratedSticker}
                            disabled={!generatedStickerPreview}
                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                              generatedStickerPreview
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10"
                                : darkMode
                                  ? "bg-slate-800 text-slate-500"
                                  : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            Download PNG
                          </button>
                          <button
                            type="button"
                            onClick={downloadGeneratedStickerAsPDF}
                            disabled={!generatedStickerPreview}
                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                              generatedStickerPreview
                                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/10"
                                : darkMode
                                  ? "bg-slate-800 text-slate-500"
                                  : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            Download PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    {!generatedStickerPreview ? (
                      <div className="space-y-4">
                        <div
                          style={{ containerType: "inline-size" }}
                          className={`relative overflow-hidden rounded-2xl border ${darkMode ? "border-slate-800 bg-slate-900 shadow-slate-950/40" : "border-slate-200 bg-white shadow-sm"}`}
                        >
                          <img 
                            src={currentStickerTemplate.templatePath} 
                            alt="Blank Sticker Template" 
                            className="w-full select-none" 
                            draggable={false} 
                          />
                        </div>
                        <div className="text-center py-5 px-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 shadow-sm">
                          <p className="text-base font-black tracking-tight text-blue-600 dark:text-blue-400">
                            {stickerType === "pochi-la-biashara" || stickerType === "lipa-na-mpesa"
                              ? "Type the number and Generate" 
                              : "Type the details and Generate"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                        <img 
                          src={generatedStickerPreview} 
                          alt="Customized M-Pesa Sticker Preview" 
                          className="w-full h-auto select-none rounded-2xl animate-in fade-in duration-300" 
                          draggable={false} 
                        />
                        {/* Premium Floating customized badge */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30 animate-pulse">
                          <Check className="h-3.5 w-3.5" />
                          <span>Customized Preview Ready</span>
                        </div>
                      </div>
                    )}

                    {stickerError && (
                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                          darkMode ? "border-red-900 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {stickerError}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {activeTab === "students" && (
              <div className={`rounded-2xl border p-6 ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                <h1 className={`text-2xl font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Students Portal</h1>
                <p className={`mt-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Students portal content will appear here.
                </p>
              </div>
            )}
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
