// lib/services/sessionService.ts
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function checkStudentSession() {
  const session = (await getServerSession()) as {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  };

  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/auth/signin");
  }

  return session;
}
