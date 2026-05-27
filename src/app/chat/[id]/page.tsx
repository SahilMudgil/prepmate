"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link"; 

export default function ChatPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState("Loading document content...");

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const res = await fetch(`/api/document/${documentId}`);
        const data = await res.json();
        
        if (data.fileUrl) {
          // 🎉 Success: Load the public Supabase bucket file
          setFileUrl(data.fileUrl);
        } else {
          // 🛡️ Backward Compatibility: Fallback to local files for historical test documents
          setFileUrl(`/uploads/${documentId}.pdf`);
        }
      } catch (error) {
        setDocStatus("Error loading document.");
      }
    };

    fetchDocument();
  }, [documentId]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`/api/chat?documentId=${documentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            const pairedChat: { q: string; a: string }[] = [];
            
            for (let i = 0; i < data.messages.length; i++) {
              if (data.messages[i].role === "user") {
                const q = data.messages[i].content;
                let a = "";
                if (i + 1 < data.messages.length && data.messages[i + 1].role === "ai") {
                  a = data.messages[i + 1].content;
                  i++; 
                }
                pairedChat.push({ q, a });
              }
            }
            setChat(pairedChat);
          }
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    fetchChatHistory();
  }, [documentId]);

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion(""); 
    setLoading(true);

    setChat((prev) => [...prev, { q: currentQuestion, a: "Thinking..." }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question: currentQuestion }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer");

      setChat((prev) => {
        const updatedChat = [...prev];
        updatedChat[updatedChat.length - 1].a = data.answer;
        return updatedChat;
      });
    } catch (err: any) {
      setChat((prev) => {
        const updatedChat = [...prev];
        updatedChat[updatedChat.length - 1].a = "❌ Error: " + err.message;
        return updatedChat;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsPDF = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* LEFT SIDE: Interactive Chat & Notes Area */}
      <div className="w-1/2 flex flex-col p-6 border-r border-gray-200 bg-white shadow-sm z-10">
        
        {/* Solid Blue Back Button */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            Back to Home
          </Link>
        </div>

        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <h2 className="font-bold text-2xl text-gray-800">AI Study Notes</h2>
          <button 
            onClick={handleSaveAsPDF}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-green-700 transition shadow-sm cursor-pointer"
          >
            Save as PDF
          </button>
        </div>

        {/* Formatting Toolbar */}
        <div className="border border-gray-200 bg-gray-50 p-2 mb-4 flex gap-2 rounded-lg shadow-sm">
          <button onClick={() => document.execCommand("bold")} className="px-3 py-1 hover:bg-gray-200 rounded font-bold transition">B</button>
          <button onClick={() => document.execCommand("italic")} className="px-3 py-1 hover:bg-gray-200 rounded italic transition">I</button>
          <button onClick={() => document.execCommand("underline")} className="px-3 py-1 hover:bg-gray-200 rounded underline transition">U</button>
          <div className="w-px bg-gray-300 mx-1"></div>
          <button 
            onClick={() => document.execCommand("hiliteColor", false, "yellow")} 
            className="px-3 py-1 hover:bg-yellow-200 rounded bg-yellow-100 text-yellow-800 font-medium transition"
          >
            Highlight
          </button>
          <span className="text-xs text-gray-400 ml-auto self-center mr-2 italic">
            Select AI text to format
          </span>
        </div>

        {/* Chat History Area (Printable) */}
        <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-4" id="printable-notes">
          
          <h1 className="hidden print:block text-3xl font-bold mb-6 text-center border-b pb-4">Study Notes</h1>

          {chat.length === 0 && (
            <div className="text-gray-400 text-center mt-20 print:hidden">
              Ask a question. The AI's answer will appear here, and you can highlight/bold it!
            </div>
          )}

          {chat.map((c, i) => (
            <div key={i} className="flex flex-col space-y-2 mb-6">
              <div className="flex justify-end print:justify-start">
                <div className="bg-blue-600 text-white px-5 py-3 rounded-t-2xl rounded-bl-2xl max-w-[85%] shadow-sm text-base print:bg-gray-200 print:text-black print:font-bold print:border-l-4 print:border-blue-600 print:rounded-none print:w-full print:max-w-full">
                  Q: {c.q}
                </div>
              </div>
              
              <div className="flex justify-start">
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  className="bg-gray-100 text-gray-800 px-5 py-3 rounded-t-2xl rounded-br-2xl w-full shadow-sm text-base whitespace-pre-wrap leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300 print:bg-white print:shadow-none print:px-2 print:border-b print:border-gray-200 print:pb-6"
                >
                  {c.a}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex gap-2 pt-2 border-t mt-2">
          <input
            className="border border-gray-300 p-4 rounded-xl flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the document..."
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={loading}
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading}
            className={`px-8 py-4 rounded-xl font-semibold text-white transition shadow-sm ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-800"
            }`}
          >
            Send
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: Full Document Display */}
      <div className="w-1/2 p-6 flex flex-col bg-gray-100 h-full">
        <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col overflow-hidden">
          <h2 className="font-bold text-2xl mb-4 text-gray-800 border-b pb-4">Document Content</h2>
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            {fileUrl ? (
              <iframe 
                src={`${fileUrl}#toolbar=0&navpanes=0&view=FitH`} 
                className="w-full h-full border-none rounded-lg"
                title="PDF Viewer"
              />
            ) : (
              <div className="p-6 text-gray-500 leading-relaxed whitespace-pre-wrap font-serif">
                {docStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-notes, #printable-notes * {
            visibility: visible;
          }
          #printable-notes {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}