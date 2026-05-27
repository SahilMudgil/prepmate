import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Database Connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Using your exact environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Use "gemini-2.5-flash" to avoid strict rate limits
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Extract difficulty and documentId from the incoming request body
    const { documentId, difficulty } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is missing" }, { status: 400 });
    }

    // 🔒 OWNERSHIP VALIDATION: Check if this document exists AND belongs to the active user
    const userDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        user: { email: session.user.email }
      }
    });

    if (!userDocument) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    // 2. Define instructions based on the selected difficulty
    let difficultyInstruction = "Focus on testing comprehension, standard concepts, and application of ideas."; // Default Medium
    if (difficulty === "easy") {
      difficultyInstruction = "Focus on basic definitions, direct facts, and straightforward concepts. Use simple language and make it easy to pass.";
    } else if (difficulty === "hard") {
      difficultyInstruction = "Focus on critical thinking, deep analysis, edge cases, and complex synthesis. For MCQs, make the distractor options highly plausible to challenge the student.";
    }

    // 3. Retrieve top chunks (Using Raw SQL to bypass the Prisma adapter bug)
    const chunks = await prisma.$queryRawUnsafe<{content: string}[]>(
      `SELECT content FROM "Chunk" WHERE "documentId" = $1 LIMIT 10`,
      documentId
    );

    if (!chunks || chunks.length === 0) {
        return NextResponse.json({ error: "No document content found to generate a test." }, { status: 400 });
    }

    const context = chunks.map((c: any) => c.content).join("\n\n");

    // 4. Inject the dynamic difficulty into the prompt
    const prompt = `
      You are an expert teacher. Generate a full exam based ONLY on the context below.

      DIFFICULTY LEVEL: ${difficulty ? difficulty.toUpperCase() : "MEDIUM"}
      INSTRUCTION: ${difficultyInstruction}

      Structure:
      Section A: 5 MCQs (1 mark each)
      Section B: 3 Short Answer (3 marks each)
      Section C: 2 Long Answer (5 marks each)

      Return STRICT JSON in this exact format, with no markdown formatting around it:

      {
        "totalMarks": 24,
        "sections": [
          {
            "section": "A",
            "questions": [
              {
                "type": "mcq",
                "question": "...",
                "options": ["A","B","C","D"],
                "correctAnswer": "...",
                "marks": 1
              }
            ]
          }
        ]
      }

      CONTEXT:
      ${context}
    `;

    const result = await chatModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown code blocks if the AI accidentally adds them
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const json = JSON.parse(cleaned);

    return NextResponse.json(json);
  } catch (error: any) {
    console.error("Generate Test Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}