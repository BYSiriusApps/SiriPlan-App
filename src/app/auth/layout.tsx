import { BySiriusBadge } from "@/components/layout/BySiriusBadge";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-fuchsia-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <a href="/" className="inline-flex items-center gap-2 group">
              <img
                src="/icons/icon-mark.png"
                alt="Siriplan"
                className="w-10 h-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform"
              />
              <span className="text-2xl font-bold text-foreground">Siriplan</span>
            </a>
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
