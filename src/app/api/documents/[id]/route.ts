import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // 🔒 OWNERSHIP VALIDATION: Check if this document exists AND belongs to the active user
    const documentToVerify = await prisma.document.findFirst({
      where: {
        id: documentId,
        user: { email: session.user.email }
      }
    });

    if (!documentToVerify) {
      return NextResponse.json({ error: "Document not found or unauthorized to delete." }, { status: 404 });
    }

    // 1. Delete all related chunks
    await prisma.$executeRawUnsafe(`DELETE FROM "Chunk" WHERE "documentId" = $1`, documentId);

    // 2. Delete related Messages and TestResults
    await prisma.message.deleteMany({ where: { documentId: documentId } });
    await prisma.testResult.deleteMany({ where: { documentId: documentId } });

    // 3. Delete the Document from the database
    await prisma.document.delete({
      where: { id: documentId },
    });

    // 4. Delete the physical PDF file (if it exists locally)
    try {
      const filePath = path.join(process.cwd(), "public/uploads", `${documentId}.pdf`);
      await unlink(filePath);
    } catch (fileError) {
      console.log("PDF file already missing or deleted, moving on...");
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}