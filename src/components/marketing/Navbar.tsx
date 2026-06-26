"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navLinks = [
  { href: "/ozellikler", label: "Özellikler" },
  { href: "/fiyatlar", label: "Fiyatlar" },
  { href: "/blog", label: "Blog" },
  { href: "/iletisim", label: "İletişim" },
];

const locales = [
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "ar", label: "AR" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Randevu<span className="text-primary">Pro</span>
          </span>
          <span className="hidden md:inline text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            by BySirius
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Locale switcher */}
          <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
            {locales.map((l) => (
              <button
                key={l.code}
                className="px-2 py-0.5 text-xs font-medium rounded-md hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </button>
            ))}
          </div>

          <ThemeToggle />

          <Link href="/auth/giris" className="hidden md:block">
            <Button variant="ghost" size="sm">
              Giriş Yap
            </Button>
          </Link>
          <Link href="/auth/kayit" className="hidden md:block">
            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm">
              Ücretsiz Başla
            </Button>
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex gap-2">
            <Link href="/auth/giris" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Giriş Yap
              </Button>
            </Link>
            <Link href="/auth/kayit" className="flex-1">
              <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                Ücretsiz Başla
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
