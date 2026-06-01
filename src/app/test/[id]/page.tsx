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
    setError(null); // Reset error state on a new attempt

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
      const rawError = error.message || "";
      if (rawError.toLowerCase().includes("demand") || rawError.includes("503") || rawError.toLowerCase().includes("busy")) {
        alert("PrepMate AI is currently handling too many requests. Please wait one minute and try submitting again!");
      } else {
        alert(error.message || "Something went wrong during evaluation.");
      }
    } finally {
      setEvaluating(false);
    }
  };

  // 1. SETUP UI (Start Screen)
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans flex flex-col items-center pt-10 sm:pt-20">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-start">
            <Link 
              href="/" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 sm:px-6 rounded-lg transition-colors shadow-sm text-sm sm:text-base"
            >
              Back to Home
            </Link>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl w-full border border-gray-100 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Ready for the Test?</h1>
            <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">Select your difficulty level to begin.</p>
            
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {["easy", "medium", "hard"].map((level) => (
                <label 
                  key={level} 
                  htmlFor={`diff-${level}`}
                  className={`flex items-center justify-center p-3.5 sm:p-4 rounded-xl cursor-pointer border-2 transition-all text-sm sm:text-base ${
                    difficulty === level 
                      ? "border-blue-600 bg-blue-50 text-blue-800 font-bold" 
                      : "border-gray-200 hover:border-blue-300 text-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    id={`diff-${level}`}
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
              className="w-full py-3.5 sm:py-4 bg-blue-600 text-white rounded-xl font-bold text-base sm:text-lg hover:bg-blue-700 transition shadow-md cursor-pointer"
            >
              Generate Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[70vh] p-4 text-center">
        <p className="text-lg sm:text-xl animate-pulse font-bold text-blue-600 max-w-md leading-relaxed">
          🤖 AI is crafting a {difficulty} difficulty test for you...
        </p>
      </div>
    );
  }

  // FIXED SINGLE ACTION ERROR UI
  if (error) {
    const isHighDemand = error.toLowerCase().includes("demand") || error.includes("503") || error.toLowerCase().includes("busy") || error.toLowerCase().includes("rate limit");

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans flex flex-col items-center pt-10 sm:pt-20">
        <div className="w-full max-w-md">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full border border-gray-100 text-center">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              {isHighDemand ? "AI Engine is Busy" : "Generation Failed"}
            </h1>
            
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {isHighDemand 
                ? "PrepMate AI is experiencing a brief high-demand spike. Please wait about 1 minute before trying to generate your test again." 
                : error}
            </p>
            
            <div>
              <Link 
                href="/" 
                onClick={() => setError(null)}
                className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm sm:text-base text-center shadow-md cursor-pointer"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!test || !test.sections) return <p className="p-4 sm:p-8 text-red-500 font-medium text-center text-sm sm:text-base">Failed to load test structure.</p>;

  // 2. RESULTS UI (Grades & Review Screen)
  if (evaluationResult) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto font-sans">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-green-600">Test Completed!</h1>
        
        {/* Score Card */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-6 sm:mb-8 text-center border-t-8 border-green-500">
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-700">Your Final Score</h2>
          <p className="text-4xl sm:text-6xl font-extrabold text-gray-900 mt-3 sm:mt-4">
            {evaluationResult.totalScore} <span className="text-xl sm:text-2xl text-gray-400 font-medium">/ {test.totalMarks}</span>
          </p>
        </div>

        {/* Weak Topics Card */}
        {evaluationResult.weakTopics && evaluationResult.weakTopics.length > 0 && (
          <div className="bg-red-50 p-5 sm:p-6 rounded-xl border border-red-200 mb-6 sm:mb-8">
            <h3 className="text-red-800 font-bold text-base sm:text-lg mb-2 flex items-center gap-1.5">
              ⚠️ Areas for Improvement
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {evaluationResult.weakTopics.map((topic: string, index: number) => (
                <span key={index} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border border-red-200">
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-red-600 text-xs sm:text-sm mt-3 italic">
              Tip: Head back to the Chat and ask the AI to explain these specific topics in simpler terms!
            </p>
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">AI Teacher Feedback</h2>
        
        {evaluationResult.results.map((res: any, i: number) => (
          <div key={i} className="mb-6 p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-4 mb-4 gap-3 sm:gap-4">
              <p className="font-semibold text-base sm:text-lg text-gray-800 flex-1">
                <span className="text-blue-600 mr-1.5">Q{i + 1}.</span> {res.question.replace(/\[Worth \d+ Marks\] /, "")}
              </p>
              <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap self-start ${res.marksAwarded === res.maxMarks ? "bg-green-100 text-green-800 border border-green-200" : res.marksAwarded > 0 ? "bg-yellow-100 text-yellow-800 border border-yellow-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
                Score: {res.marksAwarded} / {res.maxMarks}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3.5 sm:p-4 rounded-lg border border-gray-200">
                <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Your Answer</span>
                <p className="text-gray-800 text-xs sm:text-sm whitespace-pre-wrap">{res.studentAnswer || "No answer provided"}</p>
              </div>
              <div className="bg-blue-50 p-3.5 sm:p-4 rounded-lg border border-blue-100">
                <span className="text-[10px] sm:text-xs text-blue-600 font-bold uppercase tracking-wider block mb-1.5">Ideal Model Answer</span>
                <p className="text-blue-900 text-xs sm:text-sm whitespace-pre-wrap">{res.modelAnswer}</p>
              </div>
            </div>

            {res.mistakes && !res.mistakes.includes("None") && (
              <div className="mt-3 p-3 sm:p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 text-xs sm:text-sm">
                <span className="font-bold uppercase text-[10px] sm:text-xs tracking-wider text-red-600 block mb-1">Mistakes</span>
                {res.mistakes}
              </div>
            )}

            {res.improvement && !res.improvement.includes("None") && (
              <div className="mt-3 p-3 sm:p-4 bg-green-50 border border-green-100 rounded-lg text-green-900 text-xs sm:text-sm">
                <span className="font-bold uppercase text-[10px] sm:text-xs tracking-wider text-green-700 block mb-1">How to Improve</span>
                {res.improvement}
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6 sm:mt-8">
          <button onClick={() => window.location.reload()} className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition cursor-pointer text-sm sm:text-base text-center">
            Retake Test
          </button>
          <Link href="/" className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer flex items-center justify-center text-sm sm:text-base">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Progress Calculations
  const totalQuestions = test.sections.reduce((sum: number, section: any) => sum + section.questions.length, 0);
  const answeredQuestions = Object.keys(answers).filter(key => answers[key] && answers[key].trim() !== "").length;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // 3. ACTIVE TEST UI (Taking the Test)
  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-4xl mx-auto font-sans relative">
      
      {/* --- STICKY HEADER & PROGRESS BAR --- */}
      <div 
        className="sticky z-40 bg-gray-50/95 backdrop-blur-md pt-3 pb-4 sm:pt-4 sm:pb-6 -mx-3 px-3 sm:mx-0 sm:px-0 mb-4 sm:mb-8"
        style={{ top: '57px' }}
      >
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-row justify-between items-center gap-2">
            <div>
               <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Knowledge Check</h1>
               <p className="text-blue-600 capitalize font-medium text-xs sm:text-sm mt-0.5">{difficulty} Mode</p>
            </div>
            <div className="flex gap-1.5 sm:gap-3">
              <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold border flex items-center transition-colors whitespace-nowrap ${timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-orange-50 text-orange-600 border-orange-200"}`}>
                 ⏱ {formatTime(timeLeft)}
              </div>
              <div className="bg-blue-50 text-blue-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold border border-blue-100 whitespace-nowrap">
                {test.totalMarks} Marks
              </div>
            </div>
          </div>

          {/* The Progress Bar */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-gray-600 font-bold mb-1.5">
              <span>Test Progress</span>
              <span className="text-blue-600">{answeredQuestions} of {totalQuestions} Answered</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-3 overflow-hidden border border-gray-200">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out relative" 
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* --- END STICKY HEADER --- */}

      {test.sections.map((section: any, sIndex: number) => (
        <div key={sIndex} className="mb-6 sm:mb-10 bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-gray-800 border-b border-gray-100 pb-3.5">{section.section || section.title}</h2>

          {section.questions.map((q: any, qIndex: number) => {
            const key = `${sIndex}-${qIndex}`;
            const hasAnswered = answers[key] && answers[key].trim() !== "";

            return (
              <div key={key} className={`mb-8 sm:mb-10 last:mb-0 p-4 sm:p-6 rounded-xl border-2 transition-colors ${hasAnswered ? "border-blue-50 bg-blue-50/10" : "border-transparent"}`}>
                
                {/* Question Label block */}
                <div className="font-semibold text-base sm:text-lg mb-4 sm:mb-6 text-gray-800 flex items-start leading-relaxed gap-3 sm:gap-4">
                  <span className="text-white bg-blue-600 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg shrink-0 mt-0.5 text-xs sm:text-base font-bold shadow-sm">
                    {qIndex + 1}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-0">
                    <label htmlFor={`answer-${key}`}>{q.question}</label>
                    <span className="sm:ml-3 text-[10px] sm:text-sm text-gray-500 font-medium bg-gray-100 px-2.5 py-0.5 sm:py-1 rounded-full w-fit whitespace-nowrap">
                      {q.marks} marks
                    </span>
                  </div>
                </div>

                {/* Question Body */}
                {q.type === "mcq" && q.options ? (
                  <div className="space-y-2.5 ml-0 sm:ml-12">
                    {q.options.map((opt: string, i: number) => {
                      const isSelected = answers[key] === opt;
                      const inputId = `${key}-opt-${i}`;
                      return (
                        <label 
                          key={i}
                          htmlFor={inputId}
                          className={`cursor-pointer flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 w-full min-h-14 ${
                            isSelected 
                              ? "border-blue-600 bg-blue-50 shadow-sm" 
                              : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            id={inputId}
                            name={key}
                            value={opt}
                            className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer shrink-0"
                            onChange={(e) => handleChange(key, e.target.value)}
                            disabled={isTimeUp}
                            checked={isSelected}
                          />
                          <span className={`font-medium text-sm sm:text-base md:text-lg ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-0 sm:ml-12">
                    <textarea
                      id={`answer-${key}`}
                      name={`answer-${key}`}
                      className={`w-full border-2 rounded-xl mt-1 p-3 sm:p-5 min-h-32 sm:min-h-40 focus:ring-0 outline-none transition-all shadow-sm text-sm sm:text-base md:text-lg leading-relaxed ${
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
        className={`mt-4 w-full py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-xl text-white transition-all shadow-lg cursor-pointer flex justify-center items-center gap-2 sm:gap-3 ${
          evaluating || isTimeUp 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0"
        }`}
        onClick={submitTest}
        disabled={evaluating || isTimeUp}
      >
        {evaluating ? (
          <>
            <span className="animate-spin text-lg sm:text-2xl">⚙️</span> AI is grading your test...
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