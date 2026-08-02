"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={logout} className="w-full">
      <button
        type="submit"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-200 text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Çıkış Yap</span>
      </button>
    </form>
  );
}

export function LogoutButtonMobile() {
  return (
    <form action={logout} className="flex-1 flex flex-col items-center justify-center py-1">
      <button
        type="submit"
        className="flex flex-col items-center justify-center gap-0.5 w-full"
      >
        <LogOut className="h-5 w-5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">Çıkış</span>
      </button>
    </form>
  );
}
