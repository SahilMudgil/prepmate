import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, question } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is missing" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from .env");
    }

    // 🔒 OWNERSHIP VALIDATION: Check if this document belongs to the authenticated user
    const userDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        user: { email: session.user.email }
      }
    });

    if (!userDocument) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    // 1. Save the User's Question to the Database
    await prisma.message.create({
      data: {
        documentId: documentId,
        role: "user",
        content: question,
      },
    });

    // 2. NATIVE GEMINI FOR EMBEDDINGS
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    const embeddingResponse = await embeddingModel.embedContent(question);
    const questionEmbedding = embeddingResponse.embedding.values;
    const embeddingString = `[${questionEmbedding.join(",")}]`;

    // 3. VECTOR SEARCH
    const similarChunks = await prisma.$queryRawUnsafe<{ content: string }[]>(
      `
      SELECT content
      FROM "Chunk"
      WHERE "documentId" = $1
      ORDER BY embedding <-> $2::vector
      LIMIT 7
      `,
      documentId,
      embeddingString
    );

    let answer = "";

    if (!similarChunks || similarChunks.length === 0) {
      answer = "I couldn't find any text for this document in the database. Are you sure the PDF was processed correctly?";
    } else {
      const context = similarChunks.map((chunk) => chunk.content).join("\n\n");

      // 4. LANGCHAIN INTEGRATION
      const model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY, 
        model: "gemini-2.5-flash",          
        temperature: 0.2,                   
      });

      const promptTemplate = PromptTemplate.fromTemplate(`
        You are an academic assistant helping a student understand their study material. 
        Use ONLY the provided context below from the study material to answer the question.
        If the answer is not in the context, say "I'm sorry, I couldn't find that information in the uploaded document."

        CONTEXT:
        {context}

        QUESTION:
        {question}
      `);

      const chain = promptTemplate.pipe(model);
      
      const result = await chain.invoke({
        context: context,
        question: question,
      });

      answer = result.content as string; 
    }

    // 5. Save the AI's Answer to the Database
    await prisma.message.create({
      data: {
        documentId: documentId,
        role: "ai",
        content: answer,
      },
    });

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("RAG Chat Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const documentId = url.searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is missing" }, { status: 400 });
    }

    // 🔒 OWNERSHIP VALIDATION: Ensure they can only pull histories for files they own
    const userDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        user: { email: session.user.email }
      }
    });

    if (!userDocument) {
      return NextResponse.json({ error: "Access denied to this chat history" }, { status: 404 });
    }

    // Fetch all messages for this document, sorted from oldest to newest
    const messages = await prisma.message.findMany({
      where: { documentId: documentId },
      orderBy: { createdAt: "asc" }, 
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Fetch History Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}