import React, { useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:1000";

const ACCEPTED_TYPES = {
  "image/jpeg": "🖼️ JPEG",
  "image/png": "🖼️ PNG",
  "image/gif": "🖼️ GIF",
  "image/webp": "🖼️ WebP",
  "image/svg+xml": "🖼️ SVG",
  "application/pdf": "📄 PDF",
  "application/msword": "📝 Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝 Word",
  "application/vnd.ms-excel": "📊 Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊 Excel",
  "text/plain": "📄 Text",
  "application/json": "📋 JSON",
  "text/csv": "📊 CSV",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const FileUpload = ({ room, sender, clerkId, onUploadComplete, onError, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const isImage = (fileType) => fileType && fileType.startsWith("image/");

  const handleFile = async (file) => {
    if (!file || disabled) return;
    if (!ACCEPTED_TYPES[file.type]) {
      onError?.("Unsupported file type");
      return;
    }
    const maxSize = isImage(file.type) ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      onError?.(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("room", room);
      formData.append("sender", sender);
      formData.append("clerkId", clerkId || "");
      const response = await fetch(`${API_BASE}/api/upload-file`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      onUploadComplete?.(data);
    } catch (error) {
      onError?.(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt,.json,.csv"
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: "none" }}
        disabled={disabled || uploading}
      />
      <button
        className="icon-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        title="Upload file"
      >
        {uploading ? "⏳" : "📎"}
      </button>
      {dragActive && (
        <div
          className="file-drag-overlay"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ fontSize: "48px" }}>📎</div>
          <div style={{ color: "#e2e8f0", fontSize: "20px", fontWeight: 600 }}>
            Drop your file here
          </div>
          <div style={{ color: "#64748b", fontSize: "14px", textAlign: "center" }}>
            Supports Images, PDF, Word, Excel, Text, JSON, CSV
          </div>
        </div>
      )}
    </>
  );
};

export default FileUpload;
