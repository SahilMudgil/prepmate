import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route"; // Up 3 levels to reach the api folder root

// Notice we use documentId inside the Promise to perfectly match your folder name
export async function GET(req: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    // 👤 1. SECURE SESSION VALIDATION
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // AWAIT the params and grab documentId
    const resolvedParams = await params;
    const targetDocumentId = resolvedParams.documentId;

    // 🔒 2. OWNERSHIP VALIDATION: Check if this document actually belongs to the active user
    const documentOwnershipCheck = await prisma.document.findFirst({
      where: {
        id: targetDocumentId,
        user: {
          email: session.user.email
        }
      }
    });

    // If the document doesn't exist or doesn't belong to them, halt early!
    if (!documentOwnershipCheck) {
      return NextResponse.json(
        { error: "Document not found or access denied" }, 
        { status: 404 }
      );
    }

    // 🚀 3. SECURE DATA FETCH: Fetch previous chat messages safely now
    const messages = await prisma.message.findMany({
      where: { documentId: targetDocumentId },
      orderBy: { createdAt: 'asc' }, // Loads oldest to newest
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}