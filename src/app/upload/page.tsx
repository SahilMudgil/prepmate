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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Solid Blue Back Button */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            Back to Home
          </Link>
        </div>

        {/* Main Upload Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Study Material</h1>
          <p className="text-gray-500 mb-8">Upload your PDFs, notes, or slides to let PrepMate analyze them.</p>

          <div className="max-w-md mx-auto">
            
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-blue-400 transition-colors bg-gray-50 mb-6 flex flex-col items-center cursor-pointer">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
              />
            </label>

            <button 
              onClick={handleUpload}
              disabled={loading || !file}
              className={`w-full font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] ${
                loading || !file 
                  ? "bg-gray-400 text-gray-100 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              }`}
            >
              {loading ? "Parsing PDF..." : "Upload & Analyze"}
            </button>

            {message && (
              <p className={`mt-6 text-center text-sm font-medium ${
                message.includes("✅") ? "text-green-600" : "text-red-600"
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