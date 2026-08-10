import { BySiriusBadge } from "@/components/layout/BySiriusBadge";
import { AuthLogoLink } from "@/components/layout/AuthLogoLink";
import { Toaster } from "@/components/ui/sonner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-fuchsia-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30 flex flex-col">
      <Toaster position="top-right" richColors />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <AuthLogoLink />
          </div>

          {children}

          <div className="mt-8 text-center">
            <BySiriusBadge variant="footer" />
          </div>
        </div>
      </div>
    </div>
  );
}
