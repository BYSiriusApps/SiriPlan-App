// Windows bayrak emojilerini desteklemez ("TR", "GB" harfleri görünür), bu
// yüzden bayraklar yerel SVG olarak çizilir — harici istek/CSP gerekmez.
type Code = "tr" | "en" | "ru" | "ar";

export function FlagIcon({ code, className = "h-4 w-4" }: { code: Code; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`flag-clip-${code}`}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-clip-${code})`}>
        {code === "tr" && (
          <>
            <rect width="24" height="24" fill="#E30A17" />
            <circle cx="9.5" cy="12" r="5" fill="#fff" />
            <circle cx="10.8" cy="12" r="4" fill="#E30A17" />
            <polygon
              fill="#fff"
              points="15.6,12 13.9,12.6 14.9,14 13.2,13.5 12.9,15.2 12.5,13.5 10.9,14 11.9,12.6 10.9,11.2 12.5,11.7 12.9,10 13.2,11.7 14.9,11.2 13.9,12.6"
              transform="translate(1.6 0) scale(.85) translate(2.4 1.8)"
            />
          </>
        )}
        {code === "en" && (
          <>
            <rect width="24" height="24" fill="#012169" />
            <path d="M0 0L24 24M24 0L0 24" stroke="#fff" strokeWidth="4.5" />
            <path d="M0 0L24 24M24 0L0 24" stroke="#C8102E" strokeWidth="1.8" />
            <path d="M12 0V24M0 12H24" stroke="#fff" strokeWidth="7" />
            <path d="M12 0V24M0 12H24" stroke="#C8102E" strokeWidth="4" />
          </>
        )}
        {code === "ru" && (
          <>
            <rect width="24" height="8" y="0" fill="#fff" />
            <rect width="24" height="8" y="8" fill="#0039A6" />
            <rect width="24" height="8" y="16" fill="#D52B1E" />
          </>
        )}
        {code === "ar" && (
          <>
            <rect width="24" height="24" fill="#006C35" />
            <rect x="5" y="14.5" width="14" height="1.4" rx=".7" fill="#fff" />
            <rect x="6" y="8" width="12" height="3.6" rx="1.2" fill="#fff" opacity=".9" />
          </>
        )}
      </g>
    </svg>
  );
}
