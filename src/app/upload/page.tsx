"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; 
import Link from "next/link"; 

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const router = useRouter(); 

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setMessage("Processing PDF... Please wait.");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        });

      const data = await res.json();

      // ✅ SUCCESS: New document processed flawlessly
      if (res.ok && data.success) {
        setMessage("✅ PDF uploaded and text extracted successfully!");
        setFile(null);
        
        router.refresh();
        router.push("/"); 
        return;
      }

      // 🚨 DUPLICATE DETECTED: Show alert pop-up, then redirect to Dashboard!
      if (data.error === "DuplicateDetected") {
        // 1. The pop-up appears and pauses the screen
        alert(`⚠️ Document Already Exists: The file "${file.name}" has already been uploaded to your account.`);
        
        // 2. Once they click 'OK', clear the form and redirect to the dashboard
        setFile(null);
        router.refresh();
        router.push("/"); 
        return;
      }

      // ❌ STANDARD ERROR: Fallback for generic failures
      setMessage("❌ Upload failed: " + (data.message || data.error || "Unknown error"));

    } catch (err) {
      setMessage("❌ Network error. Is your server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Solid Blue Back Button (Arrow Removed) */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg transition-colors shadow-sm text-sm cursor-pointer"
          >
            Back to Home
          </Link>
        </div>

        {/* Main Upload Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 text-center">
          
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">
            📤
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Upload Study Material</h1>
          <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
            Upload your PDFs, textbooks, or reference notes to let PrepMate automatically read and analyze them.
          </p>

          <div className="max-w-md mx-auto">
            
            {/* Dynamic File Upload States */}
            {!file ? (
              <label className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-8 transition-all bg-gray-50/50 mb-6 flex flex-col items-center justify-center cursor-pointer group">
                <input 
                  type="file" 
                  id="pdf-upload"
                  name="pdf-upload"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <svg className="w-10 h-10 text-gray-400 group-hover:text-blue-500 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                  Click to select file
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  Supports PDF document files
                </span>
              </label>
            ) : (
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 mb-6 flex items-center justify-between text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xl shrink-0 shadow-sm">
                    📄
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate pr-2" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-white transition-all shrink-0 cursor-pointer border border-transparent hover:border-gray-100"
                  title="Remove file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}

            <button 
              onClick={handleUpload}
              disabled={loading || !file}
              className={`w-full font-semibold py-3 px-6 rounded-xl shadow-sm transition-all text-sm ${
                loading || !file 
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" 
                  : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99] hover:shadow"
              }`}
            >
              {loading ? "Parsing & Indexing PDF..." : "Upload & Analyze"}
            </button>

            {message && (
              <p className={`mt-6 text-center text-sm font-semibold ${
                loading 
                  ? "text-blue-600 animate-pulse" 
                  : message.includes("✅") 
                    ? "text-green-600" 
                    : "text-red-600"
              }`}>
                {message}
              </p>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}