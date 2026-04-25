"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X, Upload, Loader2 } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function PhotoUpload({ value, onChange, label = "Proof photo" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function remove() {
    onChange(null);
    setError(null);
  }

  if (value) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{label}</p>
        <div className="relative inline-block rounded-lg overflow-hidden border border-border">
          <Image
            src={value}
            alt="Proof"
            width={800}
            height={192}
            className="max-h-48 max-w-full object-contain"
          />
          <button
            type="button"
            onClick={remove}
            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/90"
            title="Remove photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors cursor-pointer hover:bg-muted/40 ${
          error ? "border-destructive" : "border-border"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <div className="flex gap-3">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Take a photo or upload from gallery
            </p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP — max 10 MB</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
