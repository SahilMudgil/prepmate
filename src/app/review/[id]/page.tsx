import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

// Notice the type change here: params is now a Promise
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. We must AWAIT the params to get the ID!
  const { id } = await params;

  // 2. Fetch the data from your database using the resolved ID
  const testResult = await prisma.testResult.findUnique({
    where: { id: id },
  });

  // If someone goes to an invalid URL, show a 404
  if (!testResult) {
    return notFound();
  }

  // 3. Calculate percentage
  const percentage = Math.round((testResult.score / testResult.totalMarks) * 100);

  // 4. Parse the weak topics safely
  let weakTopicsList: string[] = [];
  try {
    if (testResult.weakTopics) {
      weakTopicsList = typeof testResult.weakTopics === "string" 
        ? JSON.parse(testResult.weakTopics) 
        : testResult.weakTopics;
    }
  } catch (e) {
    console.error("Error parsing weak topics", e);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Test Performance Summary</h1>

        {/* SCORE SNAPSHOT */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-8 text-center shadow-sm">
          <h2 className="text-gray-500 font-semibold mb-2 uppercase tracking-wide">Your Score</h2>
          <div className="text-6xl font-extrabold text-blue-600 mb-2">
            {testResult.score} <span className="text-3xl text-gray-400">/ {testResult.totalMarks}</span>
          </div>
          <p className="text-xl font-medium text-gray-600 mb-4">{percentage}%</p>
          <span className="inline-block bg-gray-100 text-gray-700 px-4 py-1 rounded-full text-sm font-medium capitalize">
            Difficulty: {testResult.difficulty}
          </span>
        </div>

        {/* FOCUS AREAS / WEAK TOPICS */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
            🎯 Targeted Study Areas
          </h3>
          <p className="text-orange-700/80 mb-6 text-sm">
            Based on your answers, we recommend reviewing these specific topics to improve your score next time:
          </p>
          
          {weakTopicsList && weakTopicsList.length > 0 ? (
            <ul className="space-y-3">
              {weakTopicsList.map((topic, index) => (
                <li key={index} className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                  <span className="text-gray-800 font-medium">{topic}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 italic">No specific weak topics identified. Great job overall!</p>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href={`/chat/${testResult.documentId}`} 
            className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl hover:bg-blue-700 transition text-center shadow-sm"
          >
            Review Material in Chat
          </Link>
          <Link 
            href="/" 
            className="bg-white border border-gray-200 text-gray-700 font-semibold py-3 px-8 rounded-xl hover:bg-gray-50 transition text-center shadow-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}