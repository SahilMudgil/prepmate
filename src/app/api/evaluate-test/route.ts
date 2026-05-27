import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

// Helper function to pause the server for a few seconds
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, questions, answers, difficulty, totalMarks } = await req.json();

    if (!documentId || !questions || !answers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from .env");
    }

    // 1. Retrieve context from chunks
    const chunks = await prisma.chunk.findMany({
      where: { documentId },
      take: 20, 
      select: {
        content: true 
      }
    });

    const context = chunks.map((c) => c.content).join("\n\n");

    // 2. ZOD SCHEMA 
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        weakTopics: z.array(z.string()).describe("List of 2-3 specific topics from the context that the student struggled with."),
        results: z.array(
          z.object({
            question: z.string(),
            studentAnswer: z.string(),
            marksAwarded: z.number(),
            maxMarks: z.number(),
            mistakes: z.string().describe("Explain what the student got wrong. Say 'None' if perfect, or 'Not attempted' if blank."),
            improvement: z.string().describe("How the student can improve the answer."),
            modelAnswer: z.string().describe("The ideal correct answer based ONLY on the provided context.")
          })
        )
      })
    );

    const formatInstructions = parser.getFormatInstructions();

    // 3. Initialize LangChain Gemini Model
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
      temperature: 0.1, 
    });

    // 4. 🔥 PROMPT FIX: Explicit instructions for blank answers
    const promptTemplate = PromptTemplate.fromTemplate(`
      You are an expert academic evaluator. 
      
      Grade the following student answers against the questions provided using ONLY the context below.
      
      CONTEXT:
      {context}

      QUESTIONS:
      {questions}

      STUDENT ANSWERS:
      {answers}

      INSTRUCTIONS:
      1. Award marks based on semantic accuracy.
      2. CRITICAL: If the student's answer is empty, blank, or "null", award exactly 0 marks and write "Not attempted" in the mistakes field.
      3. Identify specific logical gaps or missing keywords in the "mistakes" field.
      4. In the "weakTopics" field, analyze all incorrect answers and identify the specific conceptual areas from the context that the student needs to revise.

      {format_instructions}
    `);

    const chain = promptTemplate.pipe(model);

    // 5. AI CALL WITH AUTOMATIC RETRIES
    let result;
    let retries = 3; 

    while (retries > 0) {
      try {
        result = await chain.invoke({
          context: context,
          questions: JSON.stringify(questions),
          answers: JSON.stringify(answers),
          format_instructions: formatInstructions,
        });
        
        break; 
        
      } catch (aiError: any) {
        if (aiError.message?.includes("429") || aiError.message?.includes("Quota exceeded") || aiError?.status === 429) {
          console.warn(`⚠️ Rate limit hit! Waiting 8 seconds... (${retries - 1} retries left)`);
          await delay(8000); 
          retries--;
          
          if (retries === 0) {
            throw new Error("The AI is exceptionally busy right now. Please try submitting again in a few minutes.");
          }
        } else {
          throw aiError; 
        }
      }
    }

    if (!result) {
      throw new Error("Failed to generate a valid response from the AI.");
    }

    // 6. Parse the AI output
    const parsedOutput = await parser.parse(result.content as string);

    // 🔥 PROGRAMMATIC MATH FIX: Calculate the true score safely in JavaScript
    const calculatedScore = parsedOutput.results.reduce((sum, item) => sum + item.marksAwarded, 0);

    // 7. SAVE RESULTS TO DATABASE
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });

      if (user) {
        await prisma.testResult.create({
          data: {
            userId: user.id,
            documentId: documentId,
            score: calculatedScore, // Use the mathematically perfect score here
            totalMarks: totalMarks || 0,
            difficulty: difficulty || "medium",
            weakTopics: parsedOutput.weakTopics || [],
          }
        });
        console.log("Test result saved successfully with score:", calculatedScore);
      }
    } catch (dbError) {
      console.error("Failed to save result to DB:", dbError);
    }

    // 8. Return the final result to frontend (inject the calculated score so the UI sees it)
    return NextResponse.json({
      ...parsedOutput,
      totalScore: calculatedScore
    });

  } catch (error: any) {
    console.error("Evaluation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}