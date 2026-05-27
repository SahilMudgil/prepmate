"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Document = {
  id: string;
  title: string;
};

// Type for the Test Results
type TestResult = {
  id: string;
  documentId: string;
  score: number;
  totalMarks: number;
  difficulty: string;
  document?: { title: string }; 
};

export default function Home() {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, resultsRes] = await Promise.all([
          fetch("/api/documents"),
          fetch("/api/test-results")
        ]);

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData);
        }

        if (resultsRes.ok) {
          const resultsData = await resultsRes.json();
          setTestResults(resultsData);
        }
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== documentId));
        router.refresh();
      } else {
        alert("Failed to delete document.");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">Loading PrepMate...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to PrepMate</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your personal AI study companion. Upload documents, chat with your notes, and take AI-generated tests.
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-lg cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {session?.user?.name || "Student"} 👋</h1>
          <div className="flex items-center gap-6">
            <Link href="/upload" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
              + Upload New PDF
            </Link>
            <button onClick={() => signOut()} className="text-gray-500 hover:text-red-600 font-medium transition-colors cursor-pointer">
              Logout
            </button>
          </div>
        </div>

        {/* Study Materials Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            📚 Your Study Materials
          </h2>

          {documents.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 mb-4 text-lg">You haven't uploaded any materials yet.</p>
              <Link href="/upload" className="text-blue-600 font-semibold hover:underline">
                Click here to get started
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div key={doc.id} className="relative bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all group h-full flex flex-col justify-between">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="absolute top-3 right-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-2 rounded-full transition-all cursor-pointer shadow-sm border border-red-100 z-10"
                    title="Delete Document"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div>
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 transition-transform text-2xl group-hover:bg-blue-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-800 text-lg truncate pr-8" title={doc.title}>
                      {doc.title || "Untitled Document"}
                    </h3>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
                    <Link
                      href={`/chat/${doc.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg"
                    >
                      💬 Chat
                    </Link>
                    <Link
                      href={`/test/${doc.id}`}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-center py-2.5 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg"
                    >
                      📝 Test
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 📈 Recent Test Scores Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            📈 Recent Test Scores
          </h2>
          
          {testResults.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-gray-100 text-gray-500 text-center shadow-sm">
              Take a test to see your progress here!
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="max-h-75 overflow-y-auto">
                {testResults.map((result) => {
                  const percentage = Math.round((result.score / result.totalMarks) * 100);
                  const scoreColor = percentage >= 80 ? "text-emerald-600 bg-emerald-50" : percentage >= 50 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";

                  // 🔥 Wrapping the result in a Link to send the user to the review page
                  return (
                    <Link 
                      href={`/review/${result.id}`}
                      key={result.id}
                      className="block hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between p-5">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {result.document?.title || "Test Score"}
                          </h4>
                          <span className="text-xs font-medium uppercase tracking-wider text-gray-500 mt-1 block">
                            Difficulty: {result.difficulty}
                          </span>
                        </div>
                        <div className={`font-bold px-4 py-2 rounded-lg ${scoreColor}`}>
                          {result.score} / {result.totalMarks} ({percentage}%)
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}