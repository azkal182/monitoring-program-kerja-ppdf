import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    // If user is ANGGOTA or KOORDINATOR, redirect to field app
    if (session.user.role === "ANGGOTA" || session.user.role === "KOORDINATOR") {
      redirect("/field/today");
    }
    // Admin goes to dashboard
    redirect("/dashboard");
  }

  redirect("/login");
}
