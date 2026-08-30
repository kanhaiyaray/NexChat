import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:1000";

const FilePreview = ({ file, onDownload }) => {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fileIcon = {
    "application/pdf": "📄",
    "application/msword": "📝",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
    "application/vnd.ms-excel": "📊",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
    "text/plain": "📄",
    "application/json": "📋",
    "text/csv": "📊",
    "image/jpeg": "🖼️",
    "image/png": "🖼️",
    "image/gif": "🖼️",
    "image/webp": "🖼️",
    "image/svg+xml": "🖼️",
  }[file.fileType] || "📎";

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileTypeLabel = (mimeType) => {
    const labels = {
      "application/pdf": "PDF",
      "application/msword": "Word Document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
      "application/vnd.ms-excel": "Excel Spreadsheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
      "text/plain": "Text File",
      "application/json": "JSON",
      "text/csv": "CSV",
      "image/jpeg": "JPEG Image",
      "image/png": "PNG Image",
      "image/gif": "GIF Image",
      "image/webp": "WebP Image",
      "image/svg+xml": "SVG Image",
    };
    return labels[mimeType] || "File";
  };

  const canPreview = file.fileType === "application/pdf" || 
                     file.fileType === "text/plain" ||
                     file.fileType === "application/json" ||
                     file.fileType?.startsWith("image/");

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      if (file.messageId) {
        const response = await fetch(`${API_BASE}/api/download/${file.messageId}`);
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.fileName || "file";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else if (file.fileUrl) {
        window.open(file.fileUrl, "_blank");
      }
    } catch (error) {
      console.error("Download error:", error);
      if (file.fileUrl) window.open(file.fileUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const toggleExpand = () => {
    if (canPreview) setExpanded(!expanded);
  };

  return (
    <div 
      className={`file-preview ${expanded ? "expanded" : ""} ${error ? "error" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.04)",
        borderRadius: "12px",
        padding: "12px 14px",
        border: "1px solid var(--border, rgba(99,210,255,0.08))",
        cursor: canPreview ? "pointer" : "default",
        transition: "all 0.2s ease",
        maxWidth: "320px",
        minWidth: "200px",
      }}
      onClick={toggleExpand}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "28px" }}>{fileIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--text, #e2e8f0)", fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.fileName || "File"}
          </div>
          <div style={{ display: "flex", gap: "8px", color: "var(--muted, #64748b)", fontSize: "11px" }}>
            <span>{getFileTypeLabel(file.fileType)}</span>
            <span>•</span>
            <span>{formatFileSize(file.fileSize)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {canPreview && (
            <span style={{ color: "var(--muted, #64748b)", fontSize: "12px", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)" }}>
              {expanded ? "▲" : "▼"}
            </span>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              background: "linear-gradient(135deg, var(--cyan, #3dd6f5), var(--violet, #a78bfa))",
              border: "none",
              borderRadius: "6px",
              color: "#070b14",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: downloading ? "wait" : "pointer",
              transition: "all 0.15s ease",
              opacity: downloading ? 0.6 : 1,
            }}
          >
            {downloading ? "⏳" : "⬇ Download"}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: "12px", borderTop: "1px solid var(--border, rgba(99,210,255,0.08))", paddingTop: "12px", maxHeight: "400px", overflow: "auto" }}>
          {file.fileType === "application/pdf" && (
            <iframe src={`${file.fileUrl}#toolbar=1`} title="PDF Preview" style={{ width: "100%", height: "350px", border: "none", borderRadius: "8px", background: "white" }} onError={() => setError(true)} />
          )}
          {file.fileType?.startsWith("image/") && (
            <img src={file.fileUrl} alt={file.fileName} style={{ width: "100%", maxHeight: "350px", objectFit: "contain", borderRadius: "8px" }} onError={() => setError(true)} />
          )}
          {file.fileType === "text/plain" && (
            <iframe src={file.fileUrl} title="Text Preview" style={{ width: "100%", height: "200px", border: "none", borderRadius: "8px", background: "rgba(0,0,0,0.2)" }} onError={() => setError(true)} />
          )}
          {file.fileType === "application/json" && (
            <iframe src={file.fileUrl} title="JSON Preview" style={{ width: "100%", height: "200px", border: "none", borderRadius: "8px", background: "rgba(0,0,0,0.2)" }} onError={() => setError(true)} />
          )}
          {error && (
            <div style={{ color: "var(--rose, #f472b6)", fontSize: "13px", textAlign: "center", padding: "20px" }}>
              ⚠️ Preview not available. Download the file to view it.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilePreview;
