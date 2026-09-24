import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Yalnızca pazarlama sayfaları (`app/[locale]/(marketing)`) için — Navbar'ın
 * dahili linkleri ve dil değiştirici burayı kullanır. `/auth/*`, `/dashboard`
 * gibi `[locale]` dışındaki rotalar için sıradan `next/link`/`next/navigation`
 * kullanılmaya devam eder (bkz. Navbar.tsx'teki ayrım notu).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
