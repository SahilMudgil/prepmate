import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route"; // Relative path adjusted for folder nesting depth

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 👤 Fetch active user session details
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // 🔒 Universal Data Isolation Check: Filter by BOTH Document ID and Current User Email
    const document = await prisma.document.findFirst({
      where: { 
        id: documentId,
        user: {
          email: session.user.email
        }
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Send back the actual Supabase cloud storage web link from your database
    return NextResponse.json({ 
      title: document.title,
      fileUrl: document.fileUrl 
    });
  } catch (error: any) {
    console.error("Error fetching document info:", error);
    return NextResponse.json({ error: "Failed to fetch document info" }, { status: 500 });
  }
}