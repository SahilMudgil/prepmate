"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; 
import Link from "next/link"; 

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isHighDemand, setIsHighDemand] = useState(false); // Controls the emergency busy screen post-click
  
  const router = useRouter(); 

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    // Capture a guaranteed, non-null reference to satisfy TypeScript compilation
    const selectedFile = file;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    setMessage("Processing PDF... Please wait.");
    setIsHighDemand(false); // Always reset on a new upload attempt

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

      // 🚨 DUPLICATE DETECTED: Show alert pop-up, then redirect to Dashboard
      if (data.error === "DuplicateDetected") {
        alert(`⚠️ Document Already Exists: The file "${selectedFile.name}" has already been uploaded to your account.`);
        setFile(null);
        router.refresh();
        router.push("/"); 
        return;
      }

      // 🛑 SERVER SIDE HIGH DEMAND CHECK
      const errMsg = data.message || data.error || "";
      if (errMsg.toLowerCase().includes("demand") || errMsg.includes("503") || errMsg.toLowerCase().includes("busy") || errMsg.toLowerCase().includes("rate limit")) {
        setIsHighDemand(true);
        return;
      }

      // ❌ STANDARD ERROR: Fallback for generic failures (e.g., file too large)
      setMessage("❌ Upload failed: " + errMsg);

    } catch (err: any) {
      console.error("Upload process failed:", err);
      const catchMsg = err.message || "";
      
      // Catch client-side or network failures that indicate high demand
      if (catchMsg.toLowerCase().includes("demand") || catchMsg.includes("503") || catchMsg.toLowerCase().includes("busy")) {
        setIsHighDemand(true);
      } else {
        setMessage("❌ Network error. Is your server running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Render a traditional Back button layout if the system is operating normally */}
        {!isHighDemand && (
          <div className="mb-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg transition-colors shadow-sm text-sm cursor-pointer"
            >
              Back to Home
            </Link>
          </div>
        )}

        {/* --- DYNAMIC RENDER CHECK --- */}
        {isHighDemand ? (
          /* --- SINGLE ACTION ERROR CARD MATCHING YOUR DESIGN --- */
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10 text-center max-w-md mx-auto mt-10 sm:mt-20">
            {/* Warning Shield Icon */}
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-200">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              AI Engine is Busy
            </h1>
            
            <p className="text-sm text-gray-600 mb-8 leading-relaxed">
              PrepMate AI is experiencing a brief high-demand spike. Please wait about 1 minute before trying to upload your study material again.
            </p>
            
            <div>
              <Link 
                href="/" 
                onClick={() => {
                  setIsHighDemand(false);
                  setMessage("");
                }}
                className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm sm:text-base text-center shadow-md cursor-pointer"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          /* --- NORMAL UPLOAD FORM STATE --- */
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
        )}

      </div>
    </div>
  );
}