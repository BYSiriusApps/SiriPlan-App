import Link from "next/link";
import { useTranslations } from "next-intl";

interface BySiriusBadgeProps {
  variant?: "footer" | "sidebar" | "watermark";
}

export function BySiriusBadge({ variant = "footer" }: BySiriusBadgeProps) {
  const t = useTranslations("footer");

  if (variant === "sidebar") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
        <BySiriusLogo size={16} />
        <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
          by <span className="text-primary font-semibold">BySirius</span>
        </span>
      </div>
    );
  }

  if (variant === "watermark") {
    return (
      <div className="fixed bottom-4 right-4 z-50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none select-none">
        <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur border border-border rounded-full px-3 py-1.5 shadow-sm">
          <BySiriusLogo size={12} />
          <span className="text-[10px] text-muted-foreground font-medium">BySirius</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t("powered")}</span>
      <Link
        href="https://bysirius.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
      >
        <BySiriusLogo size={14} />
        <span className="text-xs font-semibold text-primary">BySirius</span>
      </Link>
    </div>
  );
}

function BySiriusLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* S-shaped logo for Sirius */}
      <circle cx="12" cy="12" r="11" className="fill-primary" />
      <path
        d="M8 8.5C8 7.12 9.12 6 10.5 6H15v2.5h-4.5a.5.5 0 000 1H13a3 3 0 010 6H8v-2.5h5a.5.5 0 000-1H10.5A2.5 2.5 0 018 9.5v-1z"
        fill="white"
      />
    </svg>
  );
}
