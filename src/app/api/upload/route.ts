import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma"; 
import { supabaseStorage } from "@/lib/supabase"; // ☁️ Import our cloud storage helper

// LangChain's Smart Text Splitter
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// A simple speed bump to prevent Google from blocking us
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    // 👤 1. SECURE SESSION VALIDATION
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const fileName = file.name || "Untitled PDF";
    const currentUserEmail = session.user.email; // Guaranteed safe to use now!

    // 🔍 2. DYNAMIC DUPLICATE VALIDATION (Per Active User)
    const existingDocument = await prisma.document.findFirst({
      where: {
        title: fileName,
        user: {
          email: currentUserEmail
        }
      }
    });

    // 🛑 If it exists, halt early and pass back the matching Document ID!
    if (existingDocument) {
      return NextResponse.json(
        { 
          error: "DuplicateDetected", 
          message: "This document has already been uploaded to your dashboard.",
          documentId: existingDocument.id 
        }, 
        { status: 400 }
      );
    }

    console.log("📄 Starting Gemini PDF Extraction...");

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing from .env");
    }
    
    // ==========================================
    // 3. EXTRACT TEXT VIA GEMINI VISION
    // ==========================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await visionModel.generateContent([
        "You are a highly accurate document parser. Extract and return every single word of text from this PDF exactly as it appears. Do not summarize or add any extra conversation. Just give me the raw text.",
        { inlineData: { data: base64Data, mimeType: "application/pdf" } }
    ]);
    
    const extractedText = result.response.text();
    
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: "Could not read text from PDF. File might be corrupted or empty." }, { status: 400 });
    }

    // ==========================================
    // 4. UPLOAD THE ACTUAL PDF TO SUPABASE STORAGE
    // ==========================================
    const uniqueFileName = `${Date.now()}-${fileName}`;
    
    const { data: storageData, error: storageError } = await supabaseStorage
      .storage
      .from("pdfs") 
      .upload(uniqueFileName, buffer, {
        contentType: "application/pdf",
        upsert: true
      });

    if (storageError) {
      console.error("Supabase Storage Error:", storageError);
      throw new Error(`Cloud storage upload failed: ${storageError.message}`);
    }

    // Grab the public web link for our file
    const { data: urlData } = supabaseStorage
      .storage
      .from("pdfs")
      .getPublicUrl(uniqueFileName);

    const publicCloudUrl = urlData.publicUrl;
    console.log("☁️ File hosted successfully at:", publicCloudUrl);

    // ==========================================
    // 5. CREATE RECORD IN DB
    // ==========================================
    const document = await prisma.document.create({
      data: {
        title: fileName,
        fileUrl: publicCloudUrl, 
        user: { connect: { email: currentUserEmail } },
      },
    });

    // ==========================================
    // 6. LANGCHAIN TEXT SPLITTING & EMBEDDING
    // ==========================================
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200, 
    });
    
    const splitDocs = await splitter.createDocuments([extractedText]);
    console.log(`🧩 LangChain created ${splitDocs.length} chunks with overlap.`);

    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    for (const doc of splitDocs) {
      const chunkText = doc.pageContent; 

      if (!chunkText.trim()) continue; 

      await delay(2000); // Speed bump

      const embeddingResponse = await embeddingModel.embedContent(chunkText);
      const embedding = embeddingResponse.embedding.values;
      const vectorString = `[${embedding.join(",")}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Chunk" (id, content, embedding, "documentId") 
         VALUES (gen_random_uuid(), $1, $2::vector, $3)`,
        chunkText,
        vectorString,
        document.id
      );
    }

    return NextResponse.json({ success: true, documentId: document.id });
    
  } catch (error: any) {
    console.error("Upload Error:", error);

    if (error.status === 429 || (error.message && error.message.includes("429"))) {
      return NextResponse.json({ 
        error: "Our AI servers are currently experiencing high traffic! Please wait 15 seconds and try again." 
      }, { status: 429 });
    }

    return NextResponse.json({ 
      error: error.message || "An unexpected system error occurred." 
    }, { status: 500 });
  }
}