import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma"; 
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log("Documents API: No session found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🚀 OPTIMIZATION: Fetch documents directly by chaining the user's email relation
    const documents = await prisma.document.findMany({
      where: { 
        user: { email: session.user.email } 
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}