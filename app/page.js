"use client";
import { useRef, useState } from "react";

export default function Home() {
  const formRef = useRef();
  const fileInputRef = useRef();
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult("");
    setLoading(true);
    setProgress(10);
    const formData = new FormData(formRef.current);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/parse");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 60);
          setProgress(percent);
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          setProgress(100);
          setLoading(false);
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data.error) {
              setError(data.error + (data.details ? `: ${data.details}` : "") + (data.stack ? `\n${data.stack}` : ""));
              setResult("");
            } else {
              setResult(JSON.stringify(data.parsed || data.raw, null, 2));
            }
          } else {
            setError("Failed to parse resume.");
            setResult("");
          }
        }
      };
      xhr.onerror = () => {
        setError("Failed to parse resume.");
        setResult("");
        setLoading(false);
        setProgress(0);
      };
      xhr.send(formData);
    } catch (err) {
      setError("Failed to parse resume.");
      setResult("");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "48px auto", background: "#f9fafb", borderRadius: 14, boxShadow: "0 4px 24px #0002", padding: 40, fontFamily: "Segoe UI, Arial, sans-serif", border: "1px solid #e0e0e0" }}>
      <h1 style={{ textAlign: "center", fontWeight: 600, fontSize: 28, letterSpacing: 1, marginBottom: 30, color: "#222" }}>
        <span style={{ color: "#4285f4" }}>WORLD OF INTERNS</span> Resume Parser
      </h1>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <label htmlFor="file" style={{ fontWeight: 500, marginBottom: 4 }}>Attach Resume (PDF, DOC, DOCX, TXT, Images):</label>
        <input ref={fileInputRef} type="file" id="file" name="file" accept=".pdf,.doc,.docx,.txt,image/*" required style={{ marginBottom: 4, padding: 7, borderRadius: 4, border: "1px solid #bdbdbd", background: "#fff" }} />
        <button type="submit" disabled={loading} style={{ background: loading ? "#b3d2fb" : "#4285f4", color: "#fff", border: "none", padding: "12px 0", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontSize: 18, fontWeight: 600, marginTop: 12, boxShadow: loading ? "none" : "0 2px 8px #4285f422" }}>
          {loading ? "Parsing..." : "Parse Resume"}
        </button>
        {loading && (
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 8, background: "#e3eafc", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: 8, background: "linear-gradient(90deg, #4285f4 60%, #34a853 100%)", transition: "width 0.2s" }} />
            </div>
            <div style={{ fontSize: 13, color: "#4285f4", marginTop: 2, textAlign: "right" }}>{progress < 100 ? `Processing... ${progress}%` : "Finishing up..."}</div>
          </div>
        )}
      </form>
      {error && <div style={{ color: "#c00", marginTop: 18, fontWeight: 500, textAlign: "center" }}>{error}</div>}
      {result && (
        <div style={{ whiteSpace: "pre-wrap", background: "#f1f3f4", borderRadius: 8, padding: 20, marginTop: 32, fontSize: 15, color: "#222", boxShadow: "0 1px 4px #0001", border: "1px solid #e0e0e0", overflowX: 'auto', wordBreak: 'break-word', maxHeight: 400 }}>
          <strong style={{ color: "#4285f4" }}>Parsed Result:</strong>
          <br />
          {result}
        </div>
      )}
    </div>
  );
}
