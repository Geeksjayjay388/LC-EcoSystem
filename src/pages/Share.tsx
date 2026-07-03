import React, { useState } from "react";
import { Upload, Camera } from "lucide-react";
import { supabase } from "../lib/supabase";

function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.-]+/g, "-");
}

function isAllowedFileType(file: File, allowed: string[]): boolean {
  const lowerName = file.name.toLowerCase();
  return allowed.some((rule) => {
    if (rule.endsWith("/*")) {
      return file.type.startsWith(rule.slice(0, -1));
    }
    if (rule.startsWith(".")) {
      return lowerName.endsWith(rule.toLowerCase());
    }
    return file.type === rule;
  });
}

function getFriendlyUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("quota") ||
    lower.includes("insufficient") ||
    lower.includes("storage") ||
    lower.includes("exceeded")
  ) {
    return "Upload failed: shared storage is low. Try a smaller file or contact admin.";
  }
  return message;
}

async function compressImageIfNeeded(
  file: File,
  targetBytes: number,
  maxDimension: number
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }
  if (file.size <= targetBytes) {
    return file;
  }

  const src = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to read image."));
      img.src = src;
    });

    const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(src);
  }
}

export default function Share() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const shareUrl = "https://lc-eco-system.vercel.app/share";

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSuccess("Share link copied to clipboard!");
    } catch {
      setError("Failed to copy link.");
    }
  };

  const MAX_SIZE = Number(import.meta.env.VITE_SHARE_MAX_SIZE) || 50 * 1024 * 1024; // 50MB
  const IMAGE_TARGET_SIZE =
    Number(import.meta.env.VITE_SHARE_IMAGE_TARGET_SIZE) || 2 * 1024 * 1024;
  const IMAGE_MAX_DIMENSION = Number(import.meta.env.VITE_SHARE_IMAGE_MAX_DIMENSION) || 1920;
  const ALLOWED = (import.meta.env.VITE_SHARE_ALLOWED_TYPES || 
    ".jpg,.jpeg,.png,.gif,.webp,.svg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,video/*"
  )
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const acceptAttr = ALLOWED.join(",");

  const handleFileChosen = (f?: File | null) => {
    setError(null);
    setSuccess(null);
    if (!f) return setFile(null);
    if (f.size > MAX_SIZE) {
      setError(`File too large. Max size is ${humanFileSize(MAX_SIZE)}.`);
      return;
    }
    if (ALLOWED.length && !isAllowedFileType(f, ALLOWED)) {
      setError("File type not allowed.");
      return;
    }
    setFile(f);
  };

  const handleChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFileChosen(f);
    e.currentTarget.value = ""; // reset
  };

  const handleTakePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFileChosen(f);
    e.currentTarget.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);
    setError(null);
    setSuccess(null);

    try {
      const uploadFile = await compressImageIfNeeded(file, IMAGE_TARGET_SIZE, IMAGE_MAX_DIMENSION);
      if (uploadFile.size > MAX_SIZE) {
        setError(`File too large after processing. Max size is ${humanFileSize(MAX_SIZE)}.`);
        setUploading(false);
        setProgress(0);
        return;
      }

      const storagePath = `public/${Date.now()}-${sanitizeFileName(uploadFile.name)}`;
      // Supabase JS SDK doesn't expose fine-grained upload progress; show simulated progress.
      const { error: storageError } = await supabase.storage
        .from("ecosystem-vault")
        .upload(storagePath, uploadFile, { upsert: false, contentType: uploadFile.type });

      if (storageError) {
        setError(getFriendlyUploadError(storageError.message));
        setUploading(false);
        setProgress(0);
        return;
      }

      setProgress(70);
      const { data: publicData } = supabase.storage.from("ecosystem-vault").getPublicUrl(storagePath);

      const { error: insertError } = await supabase.from("lc_files").insert({
        name: uploadFile.name,
        public_url: publicData.publicUrl,
        file_size: uploadFile.size,
      });

      if (insertError) {
        setError(insertError.message);
        setUploading(false);
        setProgress(0);
        return;
      }

      // Placeholder: call virus-scan hook (non-blocking). Replace with real endpoint if available.
      try {
        void fetch("/api/virus-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicUrl: publicData.publicUrl }),
        });
      } catch (e) {
        // ignore
      }

      setProgress(100);
      setSuccess("File uploaded successfully.");
      setFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 flex items-start justify-center">
      <div className="w-full max-w-md bg-white rounded-none shadow-md border p-6">
        <h1 className="text-xl font-bold mb-2">Share Files</h1>
        <div className="mb-4">
          <div className="text-sm text-slate-700 break-words">{shareUrl}</div>
          <div className="mt-2 flex gap-2">
            <button onClick={copyShareLink} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-none text-sm">Copy Link</button>
            <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-none text-sm">Open</a>
          </div>
        </div>

        <div className="mb-4">
          <div className="border-dashed border-2 border-slate-200 rounded-none p-6 text-center">
            <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <div className="text-sm text-slate-600 mb-3">{file ? file.name : "No file selected"}</div>
            <div className="text-xs text-slate-400 mb-3">{file ? humanFileSize(file.size) : "Supported: images, PDF, Word, ZIP, videos"}</div>

            <div className="flex gap-2 justify-center">
              <label className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-none text-sm cursor-pointer">
                Choose File
                <input onChange={handleChooseFile} accept={acceptAttr} type="file" className="hidden" />
              </label>

              <label className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-none text-sm cursor-pointer">
                <Camera />
                Take Photo
                <input onChange={handleTakePhoto} accept="image/*" capture="environment" type="file" className="hidden" />
              </label>

              <button onClick={handleUpload} disabled={!file || uploading} className="inline-flex items-center gap-2 bg-[#0f172a] text-white px-3 py-2 rounded-none text-sm">
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {progress > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-slate-200 rounded-none overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-600">{error}</div>
            )}

            {success && (
              <div className="mt-4 text-sm text-emerald-600">{success}</div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400">Max file size: {humanFileSize(MAX_SIZE)}</div>

      </div>
    </div>
  );
}
