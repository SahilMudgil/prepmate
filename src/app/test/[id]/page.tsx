"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link"; 

export default function TestPage() {
  const { id } = useParams();
  
  // Setup States
  const [hasStarted, setHasStarted] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(false); 
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // ⏱ TIMER STATES
  const [timeLeft, setTimeLeft] = useState(600);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false); // 🔒 LOCK STATE

  // 🔀 Proper Shuffle Function
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Trigger Generation and Shuffle
  const startTest = () => {
    setHasStarted(true);
    setLoading(true);

    fetch("/api/generate-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id, difficulty }), 
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate test");
        return data;
      })
      .then((data) => {
        if (data.sections) {
          data.sections.forEach((section: any) => {
            section.questions = shuffleArray(section.questions); 
            section.questions.forEach((q: any) => {
              if (q.type === "mcq" && q.options) {
                // Force A, B, C, D order
                q.options = [...q.options].sort(); 
              }
            });
          });
        }
        setTest(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  // ⏱ TIMER EFFECT 1: Starts and manages the countdown interval
  useEffect(() => {
    if (!hasStarted || loading || evaluating || evaluationResult) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, loading, evaluating, evaluationResult]);

  // ⏱ TIMER EFFECT 2: Checks if time is up and triggers submit (Bulletproof Lock)
  useEffect(() => {
    if (timeLeft === 0 && hasStarted && !loading && !evaluating && !evaluationResult && !hasAutoSubmitted) {
      setHasAutoSubmitted(true); // Lock to prevent multiple submissions
      setIsTimeUp(true);
      alert("⏱ Time is up! Automatically submitting your test.");
      submitTest();
    }
  }, [timeLeft, hasStarted, loading, evaluating, evaluationResult, hasAutoSubmitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleChange = (qIndex: string, value: string) => {
    setAnswers({ ...answers, [qIndex]: value });
  };

  // Submit Test
  const submitTest = async () => {
    try {
      setEvaluating(true);
      const flatQuestions: string[] = [];
      const flatAnswers: string[] = [];

      test.sections.forEach((section: any, sIndex: number) => {
        section.questions.forEach((q: any, qIndex: number) => {
          const key = `${sIndex}-${qIndex}`;
          flatQuestions.push(`[Worth ${q.marks} Marks] ${q.question}`);
          flatAnswers.push(answers[key] || "No answer provided");
        });
      });

      const res = await fetch("/api/evaluate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          documentId: id, 
          questions: flatQuestions, 
          answers: flatAnswers,
          difficulty: difficulty,
          totalMarks: test.totalMarks
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to grade test");

      setEvaluationResult(result);
    } catch (error: any) {
      console.error("Error evaluating test:", error);
      alert(error.message || "Something went wrong during evaluation.");
    } finally {
      setEvaluating(false);
    }
  };

  // 1. SETUP UI
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 font-sans flex flex-col items-center pt-20">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link 
              href="/" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
            >
              Back to Home
            </Link>
          </div>

          <div className="bg-white p-10 rounded-2xl shadow-xl w-full border border-gray-100 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Ready for the Test?</h1>
            <p className="text-gray-500 mb-8">Select your difficulty level to begin.</p>
            
            <div className="space-y-4 mb-8">
              {["easy", "medium", "hard"].map((level) => (
                <label 
                  key={level} 
                  className={`flex items-center justify-center p-4 rounded-xl cursor-pointer border-2 transition-all ${
                    difficulty === level 
                      ? "border-blue-600 bg-blue-50 text-blue-800 font-bold" 
                      : "border-gray-200 hover:border-blue-300 text-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={level}
                    checked={difficulty === level}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="hidden"
                  />
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </label>
              ))}
            </div>

            <button
              onClick={startTest}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-md cursor-pointer"
            >
              Generate Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><p className="text-xl animate-pulse font-bold text-blue-600">🤖 AI is crafting a {difficulty} difficulty test for you...</p></div>;
  if (error) return <p className="p-8 text-red-500 font-medium text-center">Error: {error}</p>;
  if (!test || !test.sections) return <p className="p-8 text-red-500 font-medium text-center">Failed to load test structure.</p>;

  // 2. RESULTS UI
  if (evaluationResult) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-sans">
        <h1 className="text-4xl font-bold mb-8 text-center text-green-600">Test Completed!</h1>
        
        {/* Score Card */}
        <div className="bg-white p-8 rounded-xl shadow-lg mb-8 text-center border-t-8 border-green-500">
          <h2 className="text-2xl font-semibold text-gray-700">Your Final Score</h2>
          <p className="text-6xl font-extrabold text-gray-900 mt-4">
            {evaluationResult.totalScore} <span className="text-2xl text-gray-400 font-medium">/ {test.totalMarks}</span>
          </p>
        </div>

        {/* Weak Topics Card */}
        {evaluationResult.weakTopics && evaluationResult.weakTopics.length > 0 && (
          <div className="bg-red-50 p-6 rounded-xl border border-red-200 mb-8">
            <h3 className="text-red-800 font-bold text-lg mb-2 flex items-center">
              ⚠️ Areas for Improvement
            </h3>
            <div className="flex flex-wrap gap-2">
              {evaluationResult.weakTopics.map((topic: string, index: number) => (
                <span key={index} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold border border-red-200">
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-red-600 text-sm mt-3 italic">
              Tip: Head back to the Chat and ask the AI to explain these specific topics in simpler terms!
            </p>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-6 text-gray-800">AI Teacher Feedback</h2>
        {evaluationResult.results.map((res: any, i: number) => (
          <div key={i} className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start border-b pb-4 mb-4 gap-4">
              <p className="font-semibold text-lg text-gray-800 flex-1">
                <span className="text-blue-600 mr-2">Q{i + 1}.</span> {res.question.replace(/\[Worth \d+ Marks\] /, "")}
              </p>
              <div className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${res.marksAwarded === res.maxMarks ? "bg-green-100 text-green-800 border border-green-200" : res.marksAwarded > 0 ? "bg-yellow-100 text-yellow-800 border border-yellow-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
                Score: {res.marksAwarded} / {res.maxMarks}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Your Answer</span>
                <p className="text-gray-800 text-sm">{res.studentAnswer || "No answer provided"}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block mb-2">Ideal Model Answer</span>
                <p className="text-blue-900 text-sm">{res.modelAnswer}</p>
              </div>
            </div>

            {res.mistakes && !res.mistakes.includes("None") && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm">
                <span className="font-bold uppercase text-xs tracking-wider text-red-600 block mb-1">Mistakes</span>
                {res.mistakes}
              </div>
            )}

            {res.improvement && !res.improvement.includes("None") && (
              <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg text-green-900 text-sm">
                <span className="font-bold uppercase text-xs tracking-wider text-green-700 block mb-1">How to Improve</span>
                {res.improvement}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-center gap-4 mt-8">
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition cursor-pointer">
            Retake Test
          </button>
          <Link href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer flex items-center justify-center">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // --- PROGRESS BAR CALCULATIONS ---
  const totalQuestions = test.sections.reduce((sum: number, section: any) => sum + section.questions.length, 0);
  const answeredQuestions = Object.keys(answers).filter(key => answers[key] && answers[key].trim() !== "").length;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // 3. UPGRADED TEST UI
  return (
    <div className="p-8 max-w-4xl mx-auto font-sans relative">
      
      {/* --- STICKY HEADER & PROGRESS BAR --- */}
      <div className="sticky top-0 z-50 bg-white p-6 rounded-b-2xl shadow-md border-b border-gray-200 mb-10 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
             <h1 className="text-2xl font-bold text-gray-800">Knowledge Check</h1>
             <p className="text-blue-600 capitalize font-medium text-sm mt-1">{difficulty} Mode</p>
          </div>
          <div className="flex gap-4">
            <div className={`px-4 py-2 rounded-lg font-bold border flex items-center transition-colors ${timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-orange-50 text-orange-600 border-orange-200"}`}>
              ⏱ {formatTime(timeLeft)}
            </div>
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold border border-blue-100">
              {test.totalMarks} Marks
            </div>
          </div>
        </div>

        {/* The Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 font-bold mb-2">
            <span>Test Progress</span>
            <span className="text-blue-600">{answeredQuestions} of {totalQuestions} Answered</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative" 
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20"></div>
            </div>
          </div>
        </div>
      </div>
      {/* --- END STICKY HEADER --- */}

      {test.sections.map((section: any, sIndex: number) => (
        <div key={sIndex} className="mb-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold mb-8 text-gray-800 border-b border-gray-100 pb-4">{section.section}</h2>

          {section.questions.map((q: any, qIndex: number) => {
            const key = `${sIndex}-${qIndex}`;
            const hasAnswered = answers[key] && answers[key].trim() !== "";

            return (
              <div key={key} className={`mb-10 last:mb-0 p-6 rounded-xl border-2 transition-colors ${hasAnswered ? "border-blue-50 bg-blue-50/10" : "border-transparent"}`}>
                <p className="font-semibold text-lg mb-6 text-gray-800 flex items-start leading-relaxed">
                  <span className="text-white bg-blue-600 w-8 h-8 flex items-center justify-center rounded-lg mr-4 shrink-0 mt-0.5 shadow-sm">{qIndex + 1}</span>
                  <span>
                    {q.question}
                    <span className="ml-3 text-sm text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {q.marks} marks
                    </span>
                  </span>
                </p>

                {q.type === "mcq" ? (
                  <div className="space-y-3 ml-12">
                    {q.options.map((opt: string, i: number) => {
                      const isSelected = answers[key] === opt;
                      return (
                        <label 
                          key={i} 
                          className={`cursor-pointer flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 w-full ${
                            isSelected 
                              ? "border-blue-600 bg-blue-50 shadow-sm" 
                              : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={key}
                            value={opt}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                            onChange={(e) => handleChange(key, e.target.value)}
                            disabled={isTimeUp}
                            checked={isSelected}
                          />
                          <span className={`font-medium text-lg ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-12">
                    <textarea
                      className={`w-full border-2 rounded-xl mt-2 p-5 min-h-40 focus:ring-0 outline-none transition-all shadow-sm text-lg ${
                        hasAnswered 
                          ? "border-blue-400 bg-white focus:border-blue-600" 
                          : "border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500"
                      }`}
                      placeholder="Type your detailed answer here..."
                      onChange={(e) => handleChange(key, e.target.value)}
                      disabled={isTimeUp}
                      value={answers[key] || ""}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <button
        className={`mt-4 w-full py-5 rounded-2xl font-bold text-xl text-white transition-all shadow-lg cursor-pointer flex justify-center items-center gap-3 ${
          evaluating || isTimeUp 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1"
        }`}
        onClick={submitTest}
        disabled={evaluating || isTimeUp}
      >
        {evaluating ? (
          <>
            <span className="animate-spin text-2xl">⚙️</span> AI is grading your test...
          </>
        ) : (
          <>
            Submit Test for Grading <span>🚀</span>
          </>
        )}
      </button>
    </div>
  );
}