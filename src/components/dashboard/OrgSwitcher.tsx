"use client";

import { useState } from "react";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  owner: "İşletme Sahibi",
  manager: "Yönetici",
  staff: "Personel",
};

interface Membership {
  org_id: string;
  role: string;
  org_name: string;
}

interface Props {
  activeOrgId: string;
  memberships: Membership[];
}

export function OrgSwitcher({ activeOrgId, memberships }: Props) {
  const [switching, setSwitching] = useState<string | null>(null);

  if (memberships.length < 2) return null;

  async function switchOrg(orgId: string) {
    if (orgId === activeOrgId) return;
    setSwitching(orgId);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      if (res.ok) {
        // Tam yenileme: tüm server component'ler yeni işletmeyle render edilsin
        window.location.href = "/dashboard";
      } else {
        const err = await res.json();
        toast.error(err.error || "İşletme değiştirilemedi");
        setSwitching(null);
      }
    } catch {
      toast.error("Bağlantı hatası");
      setSwitching(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors bg-sidebar-accent/30 border border-sidebar-border"
          />
        }
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">İşletme Değiştir</span>
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs">İşletmeleriniz</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.org_id}
            onClick={() => switchOrg(m.org_id)}
            className="gap-2 cursor-pointer"
          >
            {switching === m.org_id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : m.org_id === activeOrgId ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{m.org_name}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[m.role] ?? m.role}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
