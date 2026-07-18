import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/active-org";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const metadata = { title: "Platform Admin — Siriplan" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const admin = await isPlatformAdmin(supabase);
  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none">Platform Admin</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Panele Dön
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
