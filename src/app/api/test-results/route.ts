import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma"; 
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🚀 OPTIMIZATION: Fetch results directly using the user's email relation
    const results = await prisma.testResult.findMany({
      where: {
        user: { email: session.user.email }
      },
      include: {
        document: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        id: 'desc' 
      },
      take: 5 
    });

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fetching test results:", error);
    return NextResponse.json(
      { error: "Failed to fetch test results" },
      { status: 500 }
    );
  }
}