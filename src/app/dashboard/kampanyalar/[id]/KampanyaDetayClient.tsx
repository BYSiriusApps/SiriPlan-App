"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Campaign } from "@/types/database";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Megaphone,
} from "lucide-react";

export interface CampaignLogRow {
  id: string;
  customer_id: string | null;
  phone: string;
  status: string;
  error_msg: string | null;
  sent_at: string;
  customers: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Taslak", className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30" },
  scheduled: { label: "Planlandı", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30" },
  sending: { label: "Gönderiliyor", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" },
  sent: { label: "Gönderildi", className: "bg-green-100 text-green-700 dark:bg-green-900/30" },
  failed: { label: "Başarısız", className: "bg-red-100 text-red-700 dark:bg-red-900/30" },
};

const TYPE_LABELS: Record<string, string> = {
  birthday: "🎂 Doğum Günü",
  inactive: "💤 İnaktif Müşteri",
  custom: "✏️ Özel",
};

const CHANNEL_LABELS: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS" };

export default function KampanyaDetayClient({
  campaign,
  logs,
  previewCount,
  canSend,
}: {
  campaign: Campaign;
  logs: CampaignLogRow[];
  previewCount: number | null;
  canSend: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created") === "1";

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  async function handleSend() {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSendResult({ sent: data.sent_count ?? 0, failed: data.failed_count ?? 0 });
        toast.success(`Kampanya gönderildi: ${data.sent_count ?? 0} kişiye ulaştı`);
        router.refresh();
      } else {
        const msg = data.error || "Kampanya gönderilemedi, bilinmeyen bir hata oluştu";
        setSendError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Sunucuya ulaşılamadı, internet bağlantınızı kontrol edip tekrar deneyin";
      setSendError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  const statusConf = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const sentLogs = logs.filter((l) => l.status === "sent");
  const failedLogs = logs.filter((l) => l.status === "failed");

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/kampanyalar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold brand-gradient-text flex-1 truncate">{campaign.name}</h1>
        <Badge variant="outline" className={cn("text-xs", statusConf.className)}>
          {statusConf.label}
        </Badge>
      </div>

      {justCreated && (
        <div className="flex items-start gap-2 p-3 rounded-xl border-2 border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Kampanya taslak olarak oluşturuldu. Aşağıdan gözden geçirip gönderebilirsiniz.</span>
        </div>
      )}

      {sendResult && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-xl border-2 text-sm",
            sendResult.sent > 0
              ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
              : "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
          )}
        >
          {sendResult.sent > 0 ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          <span>
            {sendResult.sent} kişiye başarıyla gönderildi
            {sendResult.failed > 0 ? `, ${sendResult.failed} kişiye gönderilemedi (aşağıdaki listede detaylar var)` : ""}.
          </span>
        </div>
      )}

      {sendError && (
        <div className="flex items-start gap-2 p-3 rounded-xl border-2 border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{sendError}</span>
        </div>
      )}

      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Kampanya Detayları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Tür</p>
              <p className="font-medium">{TYPE_LABELS[campaign.type] ?? campaign.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kanal</p>
              <p className="font-medium">{CHANNEL_LABELS[campaign.channel] ?? campaign.channel}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Mesaj Şablonu</p>
            <p className="whitespace-pre-wrap rounded-lg border bg-background p-3">{campaign.message_template}</p>
          </div>
          {campaign.sent_at && (
            <p className="text-xs text-muted-foreground">
              Gönderim: {format(new Date(campaign.sent_at), "d MMM yyyy HH:mm", { locale: tr })}
            </p>
          )}
        </CardContent>
      </Card>

      {(campaign.status === "draft" || campaign.status === "scheduled") && (
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> {campaign.status === "scheduled" ? "Planlandı" : "Gönderime Hazır"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaign.status === "scheduled" && campaign.scheduled_at && (
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">
                  {format(new Date(campaign.scheduled_at), "d MMM yyyy HH:mm", { locale: tr })}
                </strong>{" "}
                tarihinde otomatik gönderilecek. Beklemeden hemen göndermek isterseniz aşağıdaki butonu kullanabilirsiniz.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Bu kampanya şu anda <strong className="text-foreground">{previewCount ?? 0} müşteriye</strong> ({CHANNEL_LABELS[campaign.channel] ?? campaign.channel} ile) gönderilecek.
            </p>
            {canSend ? (
              <Button onClick={handleSend} disabled={sending || (previewCount ?? 0) === 0} className="w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Şimdi Gönder
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Kampanya göndermek için yönetici veya sahip yetkisi gerekir.</p>
            )}
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Gönderim Kaydı
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {sentLogs.length} başarılı, {failedLogs.length} başarısız
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{l.customers?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{l.phone}</p>
                    {l.error_msg && <p className="text-xs text-red-600 dark:text-red-400 truncate">{l.error_msg}</p>}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0",
                      l.status === "sent"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30"
                    )}
                  >
                    {l.status === "sent" ? "Gönderildi" : "Başarısız"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
