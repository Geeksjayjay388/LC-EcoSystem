import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { jsPDF } from "jspdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
  ChevronUp,
  ChevronDown,
  Moon,
  Sun,
  Check,
  Layers,
  Scissors,
  Pencil,
  Save,
  RefreshCw,
  Settings,
  Clock,
  Sparkles,
  Info,
  Type
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

type SavedText = {
  id: string;
  content: string;
  owner_id: string;
  created_at: string;
};

type WorkspacePdf = {
  id: string;
  name: string;
  file: File;
  pageCount: number;
};

type SidebarTab = "files" | "tools" | "stickers" | "students" | "text";
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
    fields: [{ key: "tillNumber", label: "Till Number", placeholder: "1234567" }],
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
      { key: "phoneNumber", label: "Number", placeholder: "07XX XXX XXX" },
    ],
  },
};



const STICKER_FIELD_STYLE_DEFAULTS: Record<StickerType, Record<string, StickerFieldStyle>> = {
  "lipa-na-mpesa": {
    tillNumber: { x: 54, y: 59.5, fontSize: 147, maxWidthPct: 100, color: "#111827", fontWeight: 900, fontFamily: "Arial", letterSpacing: 85, scaleY: 1 },
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

function ensurePdfFileName(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) {
    return `pdf-output-${Date.now()}.pdf`;
  }
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function parsePageRanges(input: string, pageCount: number): number[] {
  const cleaned = input.trim();
  if (!cleaned) {
    throw new Error("Enter page numbers to split.");
  }

  const pages = new Set<number>();
  const segments = cleaned.split(",").map((segment) => segment.trim()).filter(Boolean);

  for (const segment of segments) {
    if (segment.includes("-")) {
      const [startRaw, endRaw] = segment.split("-").map((part) => part.trim());
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid page range "${segment}".`);
      }
      if (start > end) {
        throw new Error(`Invalid page range "${segment}".`);
      }
      for (let i = start; i <= end; i += 1) {
        if (i < 1 || i > pageCount) {
          throw new Error(`Page ${i} is out of range.`);
        }
        pages.add(i);
      }
    } else {
      const page = Number(segment);
      if (!Number.isInteger(page)) {
        throw new Error(`Invalid page "${segment}".`);
      }
      if (page < 1 || page > pageCount) {
        throw new Error(`Page ${page} is out of range.`);
      }
      pages.add(page);
    }
  }

  if (!pages.size) {
    throw new Error("No valid pages found.");
  }

  return Array.from(pages).sort((a, b) => a - b);
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
  const [pdfWorkspaceFiles, setPdfWorkspaceFiles] = useState<WorkspacePdf[]>([]);
  const [pdfWorkspaceError, setPdfWorkspaceError] = useState<string | null>(null);
  const [pdfWorking, setPdfWorking] = useState(false);
  const [pdfSelectedId, setPdfSelectedId] = useState<string | null>(null);
  const [pdfOutputBytes, setPdfOutputBytes] = useState<Uint8Array | null>(null);
  const [pdfOutputName, setPdfOutputName] = useState("pdf-output.pdf");
  const [pdfEditText, setPdfEditText] = useState("");
  const [pdfEditPage, setPdfEditPage] = useState(1);
  const [pdfEditX, setPdfEditX] = useState(10);
  const [pdfEditY, setPdfEditY] = useState(10);
  const [pdfEditFontSize, setPdfEditFontSize] = useState(18);
  const [pdfDetachPages, setPdfDetachPages] = useState("1");

  const [textShareContent, setTextShareContent] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const hash = window.location.hash;
    if (!hash.startsWith("#text=")) return "";
    try {
      const encoded = hash.slice(6);
      return decodeURIComponent(escape(atob(encoded)));
    } catch {
      window.history.replaceState(null, "", "/home");
      return "";
    }
  });


  const [savedTexts, setSavedTexts] = useState<SavedText[]>([]);
  const [loadingTexts, setLoadingTexts] = useState(true);
  const [savingText, setSavingText] = useState(false);
  const [textSearchTerm, setTextSearchTerm] = useState("");
  const [pendingDeleteText, setPendingDeleteText] = useState<SavedText | null>(null);
  const [deletingText, setDeletingText] = useState(false);

  // Auto-Refresh & UI Update States
  const [dataRefreshInterval, setDataRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem("ecosystem-data-refresh-interval");
    return saved !== null ? Number(saved) : 60000; // default 60s
  });
  const [uiCheckInterval, setUiCheckInterval] = useState<number>(() => {
    const saved = localStorage.getItem("ecosystem-ui-check-interval");
    return saved !== null ? Number(saved) : 300000; // default 5m
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [uiUpdateAvailable, setUiUpdateAvailable] = useState(false);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [nextSyncCountdown, setNextSyncCountdown] = useState<number>(() => {
    const saved = localStorage.getItem("ecosystem-data-refresh-interval");
    const val = saved !== null ? Number(saved) : 60000;
    return val > 0 ? val / 1000 : 0;
  });

  const fetchFilesSilent = async () => {
    setIsDataRefreshing(true);
    try {
      const [filesRes, textsRes] = await Promise.all([
        supabase.from("lc_files").select("*").order("created_at", { ascending: false }),
        supabase.from("lc_texts").select("*").order("created_at", { ascending: false })
      ]);

      if (filesRes.error) {
        console.error("Silent data fetch error:", filesRes.error.message);
      } else {
        setFiles(filesRes.data ?? []);
      }

      if (textsRes.error) {
        console.error("Silent text fetch error:", textsRes.error.message);
      } else {
        setSavedTexts(textsRes.data ?? []);
      }

      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Failed silently to fetch files or texts:", err);
    } finally {
      setIsDataRefreshing(false);
    }
  };

  const checkUiUpdate = async () => {
    try {
      const res = await fetch("/", { cache: "no-store" });
      if (!res.ok) return;
      const htmlText = await res.text();
      
      // Parse scripts in newly fetched index.html
      // Vite scripts usually have pattern: src="/assets/index-xxxxxxxx.js"
      const scriptRegex = /src=["'](\/assets\/index-[a-zA-Z0-9_-]+\.js)["']/g;
      
      // Get all current scripts loaded in page DOM
      const currentScripts = Array.from(document.querySelectorAll("script"))
        .map((s) => s.getAttribute("src"))
        .filter(Boolean) as string[];

      const newScripts: string[] = [];
      let match;
      while ((match = scriptRegex.exec(htmlText)) !== null) {
        newScripts.push(match[1]);
      }

      if (newScripts.length > 0) {
        // If there's a script in the fetched HTML that is NOT in the current document,
        // it means a new frontend version has been deployed!
        const hasNewScript = newScripts.some((src) => !currentScripts.includes(src));
        if (hasNewScript) {
          setUiUpdateAvailable(true);
        }
      }
    } catch (err) {
      console.error("Failed to check for UI updates:", err);
    }
  };

  const handleManualSync = async () => {
    setIsDataRefreshing(true);
    await fetchFilesSilent();
    await checkUiUpdate();
    setNextSyncCountdown(dataRefreshInterval > 0 ? dataRefreshInterval / 1000 : 0);
  };

  const handleDataIntervalChange = (val: number) => {
    setDataRefreshInterval(val);
    localStorage.setItem("ecosystem-data-refresh-interval", String(val));
    setNextSyncCountdown(val > 0 ? val / 1000 : 0);
  };

  const handleUiIntervalChange = (val: number) => {
    setUiCheckInterval(val);
    localStorage.setItem("ecosystem-ui-check-interval", String(val));
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleTextShareCopy = async () => {
    if (!textShareContent.trim()) return;
    const ok = await copyToClipboard(textShareContent.trim());
    if (ok) {
      setUploadSuccessMessage("Text copied to clipboard!");
    }
  };

  const handleTextShare = async () => {
    if (!textShareContent.trim()) return;
    const encoded = btoa(unescape(encodeURIComponent(textShareContent.trim())));
    const shareUrl = `${window.location.origin}/home#text=${encoded}`;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setUploadSuccessMessage("Share link copied to clipboard!");
    }
  };

  const handleSaveText = async () => {
    if (!textShareContent.trim()) return;

    setSavingText(true);
    setError(null);

    const { error: insertError } = await supabase.from("lc_texts").insert({
      content: textShareContent.trim(),
    });

    if (insertError) {
      setError(`Failed to save text: ${insertError.message}`);
    } else {
      setUploadSuccessMessage("Successfully saved text to vault.");
      setTextShareContent("");
      await fetchTexts();
    }
    setSavingText(false);
  };

  const handleDeleteText = async () => {
    if (!pendingDeleteText) return;

    setDeletingText(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("lc_texts")
      .delete()
      .eq("id", pendingDeleteText.id);

    if (deleteError) {
      setError(`Failed to delete text: ${deleteError.message}`);
    } else {
      setUploadSuccessMessage("Successfully deleted text from vault.");
      setPendingDeleteText(null);
      await fetchTexts();
    }
    setDeletingText(false);
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#text=")) return;
    const encoded = hash.slice(6);
    try {
      const text = decodeURIComponent(escape(atob(encoded)));
      copyToClipboard(text).then((ok) => {
        if (ok) {
          setUploadSuccessMessage("Text from share link copied to clipboard!");
        }
      });
      window.history.replaceState(null, "", "/home");
    } catch {
      window.history.replaceState(null, "", "/home");
    }
  }, []);

  // Data polling interval
  useEffect(() => {
    if (dataRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      void fetchFilesSilent();
      setNextSyncCountdown(dataRefreshInterval / 1000);
    }, dataRefreshInterval);

    return () => clearInterval(timer);
  }, [dataRefreshInterval]);

  // Countdown timer for next sync
  useEffect(() => {
    if (dataRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      setNextSyncCountdown((prev) => {
        if (prev <= 1) {
          return dataRefreshInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dataRefreshInterval]);

  // UI update checking interval
  useEffect(() => {
    if (uiCheckInterval <= 0) return;

    // Run initially asynchronously to avoid synchronous setState inside render/effect block
    const initTimer = setTimeout(() => {
      void checkUiUpdate();
    }, 0);

    const timer = setInterval(() => {
      void checkUiUpdate();
    }, uiCheckInterval);

    return () => {
      clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, [uiCheckInterval]);

  // Check on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchFilesSilent();
        void checkUiUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const fetchFiles = async () => {
    setLoadingFiles(true);
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

  const fetchTexts = async () => {
    setLoadingTexts(true);
    const { data, error: fetchError } = await supabase
      .from("lc_texts")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Fetch texts error:", fetchError.message);
    } else {
      setSavedTexts(data ?? []);
    }
    setLoadingTexts(false);
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      supabase.from("lc_files").select("*").order("created_at", { ascending: false }),
      supabase.from("lc_texts").select("*").order("created_at", { ascending: false })
    ]).then(([filesRes, textsRes]) => {
      if (!active) return;

      if (filesRes.error) {
        setError(filesRes.error.message);
      } else {
        setError(null);
        setFiles(filesRes.data ?? []);
      }
      setLoadingFiles(false);

      if (textsRes.error) {
        console.error("Fetch texts error:", textsRes.error.message);
      } else {
        setSavedTexts(textsRes.data ?? []);
      }
      setLoadingTexts(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("home-dark-mode", darkMode ? "true" : "false");
  }, [darkMode]);

  const selectedPdf = useMemo(() => {
    if (!pdfSelectedId) return null;
    return pdfWorkspaceFiles.find((file) => file.id === pdfSelectedId) ?? null;
  }, [pdfSelectedId, pdfWorkspaceFiles]);

  const pdfWorkspacePreviewUrls = useMemo(() => {
    const urls = new Map<string, string>();
    pdfWorkspaceFiles.forEach((file) => {
      urls.set(file.id, URL.createObjectURL(file.file));
    });
    return urls;
  }, [pdfWorkspaceFiles]);

  useEffect(() => {
    return () => {
      pdfWorkspacePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pdfWorkspacePreviewUrls]);

  const selectedPdfPreviewUrl = selectedPdf
    ? pdfWorkspacePreviewUrls.get(selectedPdf.id) ?? null
    : null;

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

  const handlePdfWorkspaceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;

    setPdfWorking(true);
    setPdfWorkspaceError(null);

    const newItems: WorkspacePdf[] = [];
    const rejectedFiles = selectedFiles.filter((file) => {
      return !(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    });

    if (rejectedFiles.length) {
      setPdfWorkspaceError("Only PDF files can be added to the workspace.");
    }

    for (const file of selectedFiles) {
      if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        newItems.push({
          id: crypto.randomUUID(),
          name: file.name,
          file,
          pageCount: pdfDoc.getPageCount(),
        });
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Failed to read PDF.";
        setPdfWorkspaceError(`Failed to read "${file.name}": ${message}`);
      }
    }

    if (newItems.length) {
      setPdfWorkspaceFiles((prev) => [...prev, ...newItems]);
      if (!pdfSelectedId) {
        setPdfSelectedId(newItems[0].id);
      }
    }

    setPdfWorking(false);
    event.target.value = "";
  };

  const movePdfWorkspaceItem = (id: string, direction: "up" | "down") => {
    setPdfWorkspaceFiles((prev) => {
      const index = prev.findIndex((file) => file.id === id);
      if (index === -1) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, item);
      return updated;
    });
  };

  const removePdfWorkspaceItem = (id: string) => {
    setPdfWorkspaceFiles((prev) => {
      const next = prev.filter((file) => file.id !== id);
      if (pdfSelectedId === id) {
        setPdfSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handlePdfMerge = async () => {
    if (pdfWorkspaceFiles.length < 2) {
      setPdfWorkspaceError("Upload at least two PDFs to merge.");
      return;
    }

    setPdfWorking(true);
    setPdfWorkspaceError(null);

    try {
      const merged = await PDFDocument.create();
      for (const file of pdfWorkspaceFiles) {
        const bytes = await file.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }

      const mergedBytes = await merged.save();
      setPdfOutputBytes(mergedBytes);
      setPdfOutputName(ensurePdfFileName(`merged-${Date.now()}.pdf`));
    } catch (mergeError) {
      const message = mergeError instanceof Error ? mergeError.message : "Failed to merge PDFs.";
      setPdfWorkspaceError(message);
    } finally {
      setPdfWorking(false);
    }
  };

  const handlePdfEdit = async () => {
    if (!selectedPdf) {
      setPdfWorkspaceError("Select a PDF to edit.");
      return;
    }
    if (!pdfEditText.trim()) {
      setPdfWorkspaceError("Enter annotation text before editing.");
      return;
    }

    setPdfWorking(true);
    setPdfWorkspaceError(null);

    try {
      const bytes = await selectedPdf.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const pageIndex = pdfEditPage - 1;
      if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
        throw new Error("The page number is out of range.");
      }

      const page = pdfDoc.getPage(pageIndex);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const width = page.getWidth();
      const height = page.getHeight();
      const x = (Math.min(Math.max(pdfEditX, 0), 100) / 100) * width;
      const y = (Math.min(Math.max(pdfEditY, 0), 100) / 100) * height;

      page.drawText(pdfEditText, {
        x,
        y,
        size: Math.max(6, pdfEditFontSize),
        font,
        color: rgb(0, 0, 0),
      });

      const updatedBytes = await pdfDoc.save();
      setPdfOutputBytes(updatedBytes);
      const baseName = selectedPdf.name.replace(/\.pdf$/i, "");
      setPdfOutputName(ensurePdfFileName(`${baseName}-annotated.pdf`));
    } catch (editError) {
      const message = editError instanceof Error ? editError.message : "Failed to edit PDF.";
      setPdfWorkspaceError(message);
    } finally {
      setPdfWorking(false);
    }
  };

  const handlePdfDetach = async () => {
    if (!selectedPdf) {
      setPdfWorkspaceError("Select a PDF to split pages from.");
      return;
    }

    setPdfWorking(true);
    setPdfWorkspaceError(null);

    try {
      const bytes = await selectedPdf.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const pages = parsePageRanges(pdfDetachPages, pdfDoc.getPageCount()).map((page) => page - 1);
      
      const newPdfDoc = await PDFDocument.create();
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pages);
      copiedPages.forEach((page) => newPdfDoc.addPage(page));

      const updatedBytes = await newPdfDoc.save();
      setPdfOutputBytes(updatedBytes);
      const baseName = selectedPdf.name.replace(/\.pdf$/i, "");
      setPdfOutputName(ensurePdfFileName(`${baseName}-split.pdf`));
      
      setUploadSuccessMessage(`Successfully split ${pages.length} page${pages.length === 1 ? "" : "s"}.`);
    } catch (detachError) {
      const message = detachError instanceof Error ? detachError.message : "Failed to split PDF pages.";
      setPdfWorkspaceError(message);
    } finally {
      setPdfWorking(false);
    }
  };

  const handlePdfOutputDownload = () => {
    if (!pdfOutputBytes) return;
    const outputName = ensurePdfFileName(pdfOutputName);
    const outputBytes = Uint8Array.from(pdfOutputBytes);
    const blob = new Blob([outputBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = outputName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfSave = async () => {
    if (!pdfOutputBytes) {
      setPdfWorkspaceError("Generate a PDF before saving.");
      return;
    }

    setPdfWorking(true);
    setPdfWorkspaceError(null);

    const outputName = ensurePdfFileName(pdfOutputName);
    const storagePath = `${session.user.id}/${Date.now()}-${outputName}`;
    const outputBytes = Uint8Array.from(pdfOutputBytes);
    const blob = new Blob([outputBytes], { type: "application/pdf" });

    const { error: storageError } = await supabase.storage
      .from("ecosystem-vault")
      .upload(storagePath, blob, { upsert: false, contentType: "application/pdf" });

    if (storageError) {
      setPdfWorkspaceError(storageError.message);
      setPdfWorking(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("ecosystem-vault").getPublicUrl(storagePath);
    const { error: insertError } = await supabase.from("lc_files").insert({
      name: outputName,
      public_url: publicData.publicUrl,
      file_size: pdfOutputBytes.length,
    });

    if (insertError) {
      setPdfWorkspaceError(insertError.message);
      setPdfWorking(false);
      return;
    }

    setUploadSuccessMessage(`Saved "${outputName}" to the vault.`);
    setLoadingFiles(true);
    await fetchFiles();
    setPdfWorking(false);
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

  const filteredTexts = useMemo(() => {
    return savedTexts.filter(t => t.content.toLowerCase().includes(textSearchTerm.toLowerCase()));
  }, [savedTexts, textSearchTerm]);

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
    { key: "files", label: "Shared Files", icon: FolderOpen },
    { key: "tools", label: "Tools", icon: Layers },
    { key: "stickers", label: "Stickers", icon: Tag },
    { key: "text", label: "Text", icon: Type },
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
                  className={`flex h-11 w-11 items-center justify-center rounded-none border ${
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

                    <p className="text-xs text-emerald-700 font-medium">
                      Eco-System
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className={`flex h-9 w-9 items-center justify-center rounded-none border transition ${
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
                    className={`flex w-full items-center gap-3 rounded-none px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-emerald-700 text-white"
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
                className={`flex h-11 w-full items-center gap-3 rounded-none border px-4 text-sm font-medium transition ${
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
                className={`flex h-11 w-full items-center gap-3 rounded-none border px-4 text-sm font-medium transition ${
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
            {/* Global Top Bar */}
            <div className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-none border p-4 ${
              darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-none border ${
                  darkMode ? "border-slate-800 bg-slate-900 text-emerald-400" : "border-slate-100 bg-emerald-50 text-emerald-700"
                }`}>
                  {activeTab === "files" && <FolderOpen className="h-5 w-5" />}
                  {activeTab === "tools" && <Layers className="h-5 w-5" />}
                  {activeTab === "stickers" && <Tag className="h-5 w-5" />}
                  {activeTab === "text" && <Type className="h-5 w-5" />}
                  {activeTab === "students" && <GraduationCap className="h-5 w-5" />}
                </div>
                <div>
                  <h1 className={`text-base font-extrabold tracking-tight capitalize ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                    {activeTab === "files" ? "Shared Vault Files" : activeTab === "tools" ? "PDF Workspace Tools" : activeTab === "stickers" ? "Sticker Studio" : activeTab === "text" ? "Text Share" : "Students Administration"}
                  </h1>
                  <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    Lanet Computers Ecosystem Portal
                  </p>
                </div>
              </div>

              {/* Sync Status Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Badge */}
                <div className={`flex items-center gap-2 rounded-none border px-3 py-1.5 text-xs font-semibold ${
                  darkMode ? "border-slate-800 bg-slate-950 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-none opacity-75 ${
                      isDataRefreshing ? "bg-emerald-500" : uiUpdateAvailable ? "bg-yellow-400" : "bg-emerald-400"
                    }`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-none ${
                      isDataRefreshing ? "bg-emerald-600" : uiUpdateAvailable ? "bg-yellow-500" : "bg-emerald-500"
                    }`} />
                  </span>
                  <span>
                    {isDataRefreshing 
                      ? "Syncing..." 
                      : uiUpdateAvailable 
                        ? "Update Available" 
                        : dataRefreshInterval > 0 
                          ? `Syncing in ${nextSyncCountdown}s` 
                          : "Sync Idle"}
                  </span>
                </div>

                {/* Last Synced Label */}
                <div className={`hidden md:flex items-center gap-1.5 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Last Sync: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Manual Sync Button */}
                <button
                  type="button"
                  onClick={() => void handleManualSync()}
                  disabled={isDataRefreshing}
                  title="Force Sync Now"
                  className={`flex h-9 w-9 items-center justify-center rounded-none border transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer ${
                    darkMode 
                      ? "border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white" 
                      : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${isDataRefreshing ? "animate-spin text-emerald-600" : ""}`} />
                </button>

                {/* Settings Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowSyncSettings(prev => !prev)}
                  title="Configure Sync & Updates"
                  className={`flex h-9 w-9 items-center justify-center rounded-none border transition-all duration-300 active:scale-95 cursor-pointer ${
                    showSyncSettings
                      ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-600"
                      : darkMode 
                        ? "border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white" 
                        : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sync Settings Panel (Expandable) */}
            {showSyncSettings && (
              <div className={`mb-6 rounded-none border p-5 shadow-xl animate-in slide-in-from-top-4 duration-300 ${
                darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-4 w-4 text-emerald-700" />
                  <h3 className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                    System Sync & Updates Settings
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Data Sync Interval
                    </label>
                    <select
                      value={dataRefreshInterval}
                      onChange={(e) => handleDataIntervalChange(Number(e.target.value))}
                      className={`h-10 w-full rounded-none border px-3 text-xs outline-none ${
                        darkMode ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-emerald-600" : "border-slate-300 bg-white text-slate-900 focus:border-emerald-700"
                      }`}
                    >
                      <option value={15000}>Every 15 Seconds</option>
                      <option value={30000}>Every 30 Seconds</option>
                      <option value={60000}>Every 1 Minute</option>
                      <option value={300000}>Every 5 Minutes</option>
                      <option value={600000}>Every 10 Minutes</option>
                      <option value={0}>Manual Sync Only</option>
                    </select>
                    <p className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      Determines how often the central vault updates the list of shared files in the background.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      UI Build Check Interval
                    </label>
                    <select
                      value={uiCheckInterval}
                      onChange={(e) => handleUiIntervalChange(Number(e.target.value))}
                      className={`h-10 w-full rounded-none border px-3 text-xs outline-none ${
                        darkMode ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-emerald-600" : "border-slate-300 bg-white text-slate-900 focus:border-emerald-700"
                      }`}
                    >
                      <option value={30000}>Every 30 Seconds</option>
                      <option value={60000}>Every 1 Minute</option>
                      <option value={300000}>Every 5 Minutes</option>
                      <option value={900000}>Every 15 Minutes</option>
                      <option value={1800000}>Every 30 Minutes</option>
                      <option value={0}>Disable Check</option>
                    </select>
                    <p className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      Determines how often the system checks if a new frontend UI deployment has been pushed.
                    </p>
                  </div>
                </div>

                <div className={`mt-4 border-t pt-3 flex items-center justify-between text-xs ${darkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"}`}>
                  <span className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    <span>Auto-refresh is active on page focus by default.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSyncSettings(false)}
                    className="text-emerald-700 hover:text-blue-700 font-bold cursor-pointer"
                  >
                    Close Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-8">
                {/* Banner Graphic */}
                <div className={`border ${darkMode ? "border-slate-800" : "border-slate-200"} rounded-none overflow-hidden bg-slate-950`}>
                  <img
                    src="/lanet_computers_banner.png"
                    alt="Lanet Computers Eco-System"
                    className="w-full h-auto object-cover max-h-[300px]"
                  />
                </div>
                <p className={`text-sm font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Shared files should appear here.
                </p>

                <section
                  className={`flex flex-col items-center gap-4 rounded-none border p-3 md:flex-row ${
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
                      className={`h-11 w-full rounded-none border-none bg-transparent pl-11 pr-4 text-sm focus:ring-0 ${
                        darkMode ? "text-slate-100 placeholder:text-slate-500" : "placeholder:text-slate-400"
                      }`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <label
                    className={`flex h-11 cursor-pointer items-center gap-2 rounded-none px-5 text-sm font-medium text-white transition ${
                      uploading ? "bg-emerald-600" : "bg-emerald-700 hover:bg-emerald-800"
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
                    className={`rounded-none border px-4 py-3 text-sm font-medium ${
                      darkMode ? "border-red-900 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-1 rounded-none bg-emerald-700" />
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
                      className={`rounded-none border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${
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
                                <div className={`flex h-16 w-16 items-center justify-center rounded-none ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                  <FileCode className={`h-8 w-8 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                                </div>
                                <span className="text-[10px] font-black tracking-widest text-emerald-700">{getFileExtension(file.name)}</span>
                              </div>
                            )}

                            {(isImageFile(file.name) || isPdfFile(file.name)) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                                <Eye className="h-8 w-8 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <h3 className={`mb-1 truncate text-sm font-bold transition-colors group-hover:text-emerald-700 ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                              {file.name}
                            </h3>
                            <div className={`mb-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>{new Date(file.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownload(file)}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-none p-3 text-[11px] font-bold uppercase tracking-widest shadow-md transition-all active:scale-95 ${
                                  darkMode ? "bg-slate-100 text-slate-950 hover:bg-emerald-700 hover:text-white" : "bg-slate-900 text-white hover:bg-emerald-700"
                                }`}
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </button>
                              {(isImageFile(file.name) || isPdfFile(file.name)) && (
                                <button
                                  onClick={() => setPreviewFile(file)}
                                  className={`rounded-none border p-3 transition-all active:scale-95 ${
                                    darkMode
                                      ? "border-slate-700 bg-slate-800 text-slate-400 hover:border-emerald-600 hover:text-emerald-600"
                                      : "border-slate-200 bg-white text-slate-400 hover:border-emerald-200 hover:text-emerald-700"
                                  }`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              {file.owner_id === session.user.id && (
                                <button
                                  onClick={() => setPendingDelete(file)}
                                  className={`rounded-none border p-3 transition-all active:scale-95 ${
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

            {activeTab === "tools" && (
              <div className="space-y-8">
                <section
                  className={`rounded-[28px] border p-5 ${
                    darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-none border ${
                          darkMode
                            ? "border-slate-700 bg-slate-950 text-red-400"
                            : "border-red-100 bg-red-50 text-red-500"
                        }`}
                      >
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
                          PDF Studio
                        </p>
                        <h2 className={`text-lg font-extrabold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                          Lanet Computers PDF Toolkit
                        </h2>
                        <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                          Upload, merge, annotate, split, and save in one workspace.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <label
                        className={`flex h-11 cursor-pointer items-center gap-2 rounded-none px-4 text-xs font-bold uppercase tracking-widest text-white transition ${
                          pdfWorking ? "bg-red-500" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {pdfWorking ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload PDF
                        <input
                          type="file"
                          multiple
                          accept="application/pdf"
                          className="hidden"
                          onChange={handlePdfWorkspaceUpload}
                          disabled={pdfWorking}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void handlePdfMerge()}
                        disabled={pdfWorking || pdfWorkspaceFiles.length < 2}
                        className="flex h-11 items-center gap-2 rounded-none border border-red-200 bg-white px-4 text-xs font-bold uppercase tracking-widest text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/20"
                      >
                        <Layers className="h-4 w-4" />
                        Merge
                      </button>

                      <button
                        type="button"
                        onClick={() => void handlePdfEdit()}
                        disabled={pdfWorking || !selectedPdf}
                        className="flex h-11 items-center gap-2 rounded-none border border-slate-200 bg-white px-4 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void handlePdfDetach()}
                        disabled={pdfWorking || !selectedPdf}
                        className="flex h-11 items-center gap-2 rounded-none border border-slate-200 bg-white px-4 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <Scissors className="h-4 w-4" />
                        Split
                      </button>

                      <button
                        type="button"
                        onClick={() => void handlePdfSave()}
                        disabled={pdfWorking || !pdfOutputBytes}
                        className="flex h-11 items-center gap-2 rounded-none bg-emerald-600 px-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                    </div>
                  </div>

                  {pdfWorkspaceError && (
                    <div
                      className={`mt-4 rounded-none border px-4 py-3 text-sm font-medium ${
                        darkMode
                          ? "border-red-900 bg-red-950/30 text-red-300"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {pdfWorkspaceError}
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                    <div
                      className={`rounded-none border p-4 ${
                        darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                          Workspace PDFs
                        </h3>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                          {pdfWorkspaceFiles.length} files
                        </span>
                      </div>

                      {pdfWorkspaceFiles.length === 0 ? (
                        <div className={`mt-4 rounded-none border border-dashed px-4 py-6 text-center text-xs ${darkMode ? "border-slate-800 text-slate-500" : "border-slate-300 text-slate-500"}`}>
                          Drop PDFs here or use Upload PDF to start building your merge list.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {pdfWorkspaceFiles.map((file, index) => {
                            const isSelected = file.id === pdfSelectedId;
                            const previewUrl = pdfWorkspacePreviewUrls.get(file.id);

                            return (
                              <div
                                key={file.id}
                                className={`flex items-center gap-3 rounded-none border px-4 py-3 transition ${
                                  isSelected
                                    ? "border-red-300 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
                                    : darkMode
                                    ? "border-slate-800 bg-slate-900"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setPdfSelectedId(file.id)}
                                  className="flex flex-1 items-center gap-3 text-left"
                                >
                                  <div
                                    className={`relative h-14 w-14 overflow-hidden rounded-none border ${
                                      darkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    {previewUrl ? (
                                      <iframe
                                        src={`${previewUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                                        className="h-[200%] w-[200%] origin-top-left scale-[0.5] border-none pointer-events-none"
                                        title={`${file.name}-preview`}
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center">
                                        <FileText className="h-5 w-5 text-red-500" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                      #{index + 1}
                                    </span>
                                    <p className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                      {file.name}
                                    </p>
                                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                      {file.pageCount} pages
                                    </p>
                                  </div>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => movePdfWorkspaceItem(file.id, "up")}
                                    disabled={index === 0}
                                    className="flex h-8 w-8 items-center justify-center rounded-none border border-transparent text-slate-400 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40 dark:hover:border-slate-700 dark:hover:text-slate-200"
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePdfWorkspaceItem(file.id, "down")}
                                    disabled={index === pdfWorkspaceFiles.length - 1}
                                    className="flex h-8 w-8 items-center justify-center rounded-none border border-transparent text-slate-400 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40 dark:hover:border-slate-700 dark:hover:text-slate-200"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePdfWorkspaceItem(file.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-none border border-transparent text-slate-400 transition hover:border-red-200 hover:text-red-500 dark:hover:border-red-900/60"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div
                      className={`rounded-none border p-4 ${
                        darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="space-y-4">
                        <div>
                          <h3 className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>PDF Preview</h3>
                          <div
                            className={`mt-2 overflow-hidden rounded-none border ${
                              darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            {selectedPdfPreviewUrl ? (
                              <iframe
                                src={`${selectedPdfPreviewUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                                className="h-[360px] w-full border-none"
                                title="Selected PDF preview"
                              />
                            ) : (
                              <div className={`flex h-[360px] items-center justify-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Upload a PDF to preview it here.
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>PDF Settings</h3>
                          <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Select a file to edit or split pages.
                          </p>
                        </div>

                        <div
                          className={`rounded-none border px-4 py-3 text-xs font-semibold ${
                            darkMode ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {selectedPdf ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{selectedPdf.name}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                                {selectedPdf.pageCount} pages
                              </span>
                            </div>
                          ) : (
                            "No PDF selected yet."
                          )}
                        </div>

                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Output name
                          </label>
                          <input
                            type="text"
                            value={pdfOutputName}
                            onChange={(e) => setPdfOutputName(e.target.value)}
                            className={`h-10 w-full rounded-none border px-3 text-sm ${
                              darkMode
                                ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                                : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                            }`}
                          />
                        </div>

                        <div className="space-y-3 border-t border-dashed pt-4">
                          <div>
                            <label className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              Annotation text
                            </label>
                            <input
                              type="text"
                              value={pdfEditText}
                              onChange={(e) => setPdfEditText(e.target.value)}
                              placeholder="Type the note to add"
                              className={`h-10 w-full rounded-none border px-3 text-sm ${
                                darkMode
                                  ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                                  : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Page
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={selectedPdf?.pageCount ?? 1}
                                value={pdfEditPage}
                                onChange={(e) => {
                                  const next = Number(e.target.value);
                                  setPdfEditPage(Number.isFinite(next) && next > 0 ? next : 1);
                                }}
                                className={`h-10 w-full rounded-none border px-3 text-sm ${
                                  darkMode
                                    ? "border-slate-700 bg-slate-950 text-slate-100"
                                    : "border-slate-300 bg-white text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Font size
                              </label>
                              <input
                                type="number"
                                min={6}
                                value={pdfEditFontSize}
                                onChange={(e) => {
                                  const next = Number(e.target.value);
                                  setPdfEditFontSize(Number.isFinite(next) && next > 0 ? next : 18);
                                }}
                                className={`h-10 w-full rounded-none border px-3 text-sm ${
                                  darkMode
                                    ? "border-slate-700 bg-slate-950 text-slate-100"
                                    : "border-slate-300 bg-white text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                X (%)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={pdfEditX}
                                onChange={(e) => {
                                  const next = Number(e.target.value);
                                  setPdfEditX(Number.isFinite(next) ? next : 0);
                                }}
                                className={`h-10 w-full rounded-none border px-3 text-sm ${
                                  darkMode
                                    ? "border-slate-700 bg-slate-950 text-slate-100"
                                    : "border-slate-300 bg-white text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Y (%)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={pdfEditY}
                                onChange={(e) => {
                                  const next = Number(e.target.value);
                                  setPdfEditY(Number.isFinite(next) ? next : 0);
                                }}
                                className={`h-10 w-full rounded-none border px-3 text-sm ${
                                  darkMode
                                    ? "border-slate-700 bg-slate-950 text-slate-100"
                                    : "border-slate-300 bg-white text-slate-900"
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 border-t border-dashed pt-4">
                          <div>
                            <label className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              Split pages
                            </label>
                            <input
                              type="text"
                              value={pdfDetachPages}
                              onChange={(e) => setPdfDetachPages(e.target.value)}
                              placeholder="e.g. 1-3,5"
                              className={`h-10 w-full rounded-none border px-3 text-sm ${
                                darkMode
                                  ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                                  : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                              }`}
                            />
                          </div>
                        </div>

                        {pdfOutputBytes && (
                          <div className={`rounded-none border px-4 py-3 text-xs ${darkMode ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Output ready</p>
                                <p className="text-sm font-bold">{ensurePdfFileName(pdfOutputName)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={handlePdfOutputDownload}
                                className="flex items-center gap-2 rounded-none bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </button>
                            </div>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest">
                              {formatFileSize(pdfOutputBytes.length)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
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
                  <section className={`rounded-none border p-5 ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                    <div className="space-y-4">
                      <div>
                        <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                          Sticker Type
                        </label>
                        <select
                          value={stickerType}
                          onChange={(e) => handleStickerTypeChange(e.target.value as StickerType)}
                          className={`h-11 w-full rounded-none border px-3 text-sm ${
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
                                field.key === "tillNumber" ? 7 :
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
                              className={`h-11 w-full rounded-none border px-3 text-sm transition-all outline-none focus:ring-2 focus:ring-emerald-700/20 ${
                                isFixed
                                  ? darkMode 
                                    ? "border-slate-800 bg-slate-900/50 text-slate-500 cursor-not-allowed" 
                                    : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                  : darkMode
                                    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-600"
                                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-700"
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
                          className="w-full rounded-none bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                        >
                          {generatingSticker ? "Generating..." : "Generate Preview"}
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={downloadGeneratedSticker}
                            disabled={!generatedStickerPreview}
                            className={`rounded-none px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
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
                            className={`rounded-none px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
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
                          className={`relative overflow-hidden rounded-none border ${darkMode ? "border-slate-800 bg-slate-900 shadow-slate-950/40" : "border-slate-200 bg-white shadow-sm"}`}
                        >
                          <img 
                            src={currentStickerTemplate.templatePath} 
                            alt="Blank Sticker Template" 
                            className="w-full select-none" 
                            draggable={false} 
                          />
                        </div>
                        <div className="text-center py-5 px-4 rounded-none bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 shadow-sm">
                          <p className="text-base font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                            {stickerType === "pochi-la-biashara" || stickerType === "lipa-na-mpesa"
                              ? "Type the number and Generate" 
                              : "Type the details and Generate"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-none border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                        <img 
                          src={generatedStickerPreview} 
                          alt="Customized M-Pesa Sticker Preview" 
                          className="w-full h-auto select-none rounded-none animate-in fade-in duration-300" 
                          draggable={false} 
                        />
                        {/* Premium Floating customized badge */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-none px-3 py-1 text-xs font-bold bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30 animate-pulse">
                          <Check className="h-3.5 w-3.5" />
                          <span>Customized Preview Ready</span>
                        </div>
                      </div>
                    )}

                    {stickerError && (
                      <div
                        className={`rounded-none border px-4 py-3 text-sm font-medium ${
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

            {activeTab === "text" && (
              <div className="space-y-6">
                <div>
                  <h1 className={`text-2xl font-semibold tracking-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                    Text Share
                  </h1>
                  <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Write your text and share it, or save it permanently in the central vault for easy retrieval later.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
                  <section className={`rounded-none border p-5 ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                    <label className={`mb-2 block text-xs font-bold uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Your text
                    </label>
                    <textarea
                      value={textShareContent}
                      onChange={(e) => setTextShareContent(e.target.value)}
                      placeholder="Type or paste something here..."
                      rows={12}
                      className={`w-full rounded-none border px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-600/50 focus:border-emerald-600/50 ${
                        darkMode
                          ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                          : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                      }`}
                    />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleSaveText()}
                        disabled={savingText || !textShareContent.trim()}
                        className="flex items-center gap-2 rounded-none bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition disabled:opacity-40"
                      >
                        {savingText ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save to Vault
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleTextShareCopy()}
                        disabled={!textShareContent.trim()}
                        className={`flex items-center gap-2 rounded-none border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition disabled:opacity-40 ${
                          darkMode
                            ? "border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        Copy Text
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleTextShare()}
                        disabled={!textShareContent.trim()}
                        className={`flex items-center gap-2 rounded-none border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition disabled:opacity-40 ${
                          darkMode
                            ? "border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                        }`}
                      >
                        <Type className="h-4 w-4" />
                        Share Link
                      </button>
                    </div>
                  </section>

                  <section className={`rounded-none border p-5 flex flex-col ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className={`text-xs font-black uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Saved Text Vault
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none border ${
                        darkMode ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        {filteredTexts.length} Snippets
                      </span>
                    </div>

                    {/* Search Bar for texts */}
                    <div className={`relative mb-4 border ${darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"} rounded-none`}>
                      <Search className={`absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
                        darkMode ? "text-slate-500" : "text-slate-400"
                      }`} />
                      <input
                        type="text"
                        placeholder="Search saved texts..."
                        value={textSearchTerm}
                        onChange={(e) => setTextSearchTerm(e.target.value)}
                        className={`w-full bg-transparent py-2.5 pl-9 pr-9 text-xs focus:outline-none focus:ring-0 focus:border-none ${
                          darkMode ? "text-slate-100 placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                      {textSearchTerm && (
                        <button
                          onClick={() => setTextSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* List of saved texts */}
                    <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
                      {loadingTexts ? (
                        <div className="space-y-3 py-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className={`h-24 animate-pulse rounded-none border ${
                              darkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"
                            }`} />
                          ))}
                        </div>
                      ) : filteredTexts.length === 0 ? (
                        <div className="text-center py-12">
                          <Type className={`mx-auto h-8 w-8 mb-2 stroke-1 ${darkMode ? "text-slate-700" : "text-slate-300"}`} />
                          <p className={`text-xs font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {textSearchTerm ? "No matching texts found" : "No saved texts in the vault"}
                          </p>
                        </div>
                      ) : (
                        filteredTexts.map((txt) => {
                          const isOwner = txt.owner_id === session.user.id;
                          return (
                            <div
                              key={txt.id}
                              className={`group relative rounded-none border p-4 transition-all hover:border-emerald-600/30 ${
                                darkMode ? "border-slate-800 bg-slate-950/40 hover:bg-slate-950/80" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{new Date(txt.created_at).toLocaleString()}</span>
                                </div>
                                {isOwner && (
                                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-none font-black text-[9px] tracking-widest uppercase">
                                    Me
                                  </span>
                                )}
                              </div>

                              {/* Monospace Code Preview Box */}
                              <div className={`p-3 font-mono text-xs whitespace-pre-wrap max-h-36 overflow-y-auto border scrollbar-thin ${
                                darkMode 
                                  ? "bg-slate-950 border-slate-900 text-slate-300" 
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}>
                                {txt.content}
                              </div>

                              <div className="mt-3 flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const ok = await copyToClipboard(txt.content);
                                    if (ok) {
                                      setUploadSuccessMessage("Text copied to clipboard!");
                                    }
                                  }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none border transition active:scale-95 cursor-pointer ${
                                    darkMode
                                      ? "border-slate-800 text-slate-300 bg-slate-900 hover:border-emerald-700 hover:text-emerald-400"
                                      : "border-slate-200 text-slate-700 bg-white hover:border-emerald-200 hover:text-emerald-700"
                                  }`}
                                  title="Copy full text"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Copy</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const encoded = btoa(unescape(encodeURIComponent(txt.content)));
                                    const shareUrl = `${window.location.origin}/home#text=${encoded}`;
                                    const ok = await copyToClipboard(shareUrl);
                                    if (ok) {
                                      setUploadSuccessMessage("Share link copied to clipboard!");
                                    }
                                  }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none border transition active:scale-95 cursor-pointer ${
                                    darkMode
                                      ? "border-slate-800 text-slate-300 bg-slate-900 hover:border-emerald-700 hover:text-emerald-400"
                                      : "border-slate-200 text-slate-700 bg-white hover:border-emerald-200 hover:text-emerald-700"
                                  }`}
                                  title="Copy share link"
                                >
                                  <Type className="h-3.5 w-3.5" />
                                  <span>Share</span>
                                </button>
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteText(txt)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none border transition active:scale-95 cursor-pointer ${
                                      darkMode
                                        ? "border-slate-800 text-slate-450 bg-slate-900 hover:border-rose-950 hover:text-rose-500"
                                        : "border-slate-200 text-slate-400 bg-white hover:border-rose-200 hover:text-rose-600"
                                    }`}
                                    title="Delete snippet"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "students" && (
              <div className={`rounded-none border p-6 ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
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
        <div className={`fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-none border p-4 shadow-2xl animate-in slide-in-from-right-10 duration-500 ${darkMode ? "border-slate-800 bg-slate-900 shadow-slate-950/50" : "border-emerald-100 bg-white shadow-emerald-200/50"}`}>
          <div className="flex gap-4">
            <div className={`h-10 w-10 rounded-none flex items-center justify-center shrink-0 ${darkMode ? "bg-emerald-950/30" : "bg-emerald-50"}`}>
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
          <div className={`w-full max-w-md rounded-none border p-6 shadow-2xl ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
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
                className={`rounded-none border px-4 py-2 text-sm font-bold disabled:opacity-50 ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(pendingDelete)}
                disabled={deleting}
                className="rounded-none bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete file"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-none border p-6 shadow-2xl ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <h3 className={`text-lg font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Confirm deletion</h3>
            <p className={`mt-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              Are you sure you want to delete this saved text snippet?
              This action cannot be undone.
            </p>
            <div className={`mt-3 p-3 font-mono text-[10px] whitespace-pre-wrap max-h-24 overflow-y-auto border ${
              darkMode ? "bg-slate-950 border-slate-900 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
            }`}>
              {pendingDeleteText.content}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteText(null)}
                disabled={deletingText}
                className={`rounded-none border px-4 py-2 text-sm font-bold disabled:opacity-50 ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteText()}
                disabled={deletingText}
                className="rounded-none bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingText ? "Deleting..." : "Delete text"}
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
                <div className={`h-10 w-10 rounded-none flex items-center justify-center border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                  {isPdfFile(previewFile.name) ? <FileText className="h-5 w-5 text-red-600" /> : <Eye className="h-5 w-5 text-emerald-700" />}
                </div>
                <div>
                    <h3 className={`font-bold text-sm truncate max-w-md ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{previewFile.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatFileSize(previewFile.file_size)}</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className={`h-10 w-10 flex items-center justify-center rounded-none transition-all border border-transparent ${darkMode ? "hover:bg-slate-800 hover:border-slate-700 text-slate-400" : "hover:bg-slate-100 hover:border-slate-200 text-slate-500"}`}
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
                  <img src={previewFile.public_url} alt="" className="max-w-full max-h-full object-contain shadow-xl rounded-none" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {uiUpdateAvailable && (
        <div className={`fixed bottom-6 left-6 z-50 w-full max-w-md rounded-none border p-4 shadow-2xl animate-in slide-in-from-left-10 duration-500 ${
          darkMode ? "border-slate-800 bg-slate-900 shadow-slate-950/50" : "border-emerald-100 bg-white shadow-emerald-100/30"
        }`}>
          <div className="flex gap-4">
            <div className={`h-10 w-10 rounded-none flex items-center justify-center shrink-0 ${darkMode ? "bg-emerald-950/30" : "bg-emerald-50"}`}>
              <Sparkles className="h-6 w-6 text-emerald-700 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>System Update Available</p>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                A new version of the Eco-System platform is ready with latest UI features & backend updates.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-none bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Reload Now
                </button>
                <button
                  type="button"
                  onClick={() => setUiUpdateAvailable(false)}
                  className={`rounded-none border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Later
                </button>
              </div>
            </div>
            <button 
              onClick={() => setUiUpdateAvailable(false)}
              className="text-slate-400 hover:text-slate-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
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
