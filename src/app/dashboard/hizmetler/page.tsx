import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Scissors, Clock, Star } from "lucide-react";
import type { Service } from "@/types/database";

const CATEGORY_COLORS: Record<string, string> = {
  sac: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  cilt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  tirnak: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  kas: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  spa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  lazer: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  genel: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export default async function HizmetlerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/kayit");

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("org_id", member.org_id)
    .order("display_order");

  const categories = [...new Set((services || []).map((s: Service) => s.category_tag))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hizmetler</h1>
          <p className="text-muted-foreground text-sm">{services?.length || 0} hizmet</p>
        </div>
        <Link
          href="/dashboard/hizmetler/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Hizmet Ekle
        </Link>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 capitalize">
            {cat}
          </h2>
          <div className="space-y-2">
            {(services || [])
              .filter((s: Service) => s.category_tag === cat)
              .map((service: Service) => (
                <Link key={service.id} href={`/dashboard/hizmetler/${service.id}`}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Scissors className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">{service.name}</p>
                            <Badge variant="outline" className={cn("text-[10px]", CATEGORY_COLORS[service.category_tag] || CATEGORY_COLORS.genel)}>
                              {service.category_tag}
                            </Badge>
                            {!service.is_active && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">Pasif</Badge>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{service.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm">₺{Number(service.price).toLocaleString("tr-TR")}</p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes}dk
                          </p>
                          {service.contributes_loyalty && (
                            <p className="text-[10px] text-amber-600 flex items-center justify-end gap-0.5">
                              <Star className="h-3 w-3 fill-amber-500" />puan kazandırır
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      ))}

      {(!services || services.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <Scissors className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Henüz hizmet eklenmemiş</p>
        </div>
      )}
    </div>
  );
}
