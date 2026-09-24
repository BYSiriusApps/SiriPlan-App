"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, XCircle, CheckCircle2, Calendar, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { PoweredByBadge } from "@/components/public/PoweredByBadge";

type Proposal = {
  status: string;
  proposed_status: "none" | "pending" | "accepted" | "rejected";
  current_appointment_at: string;
  proposed_appointment_at: string | null;
  customer_name: string;
  org_name: string;
  staff_name: string;
  service_name: string;
  respondable: boolean;
};

export default function ProposalResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [result, setResult] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    fetch(`/api/public/appointment-proposal?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Öneri bulunamadı.");
        setProposal(d.proposal);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(action: "accept" | "reject") {
    setResponding(true);
    try {
      const res = await fetch("/api/public/appointment-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(action === "accept" ? "accepted" : "rejected");
      } else {
        setError(d.error || "İşlem gerçekleştirilemedi.");
      }
    } catch {
      setError("Bağlantı sorunu oluştu, lütfen tekrar deneyin.");
    } finally {
      setResponding(false);
    }
  }

  const alreadyAnswered = proposal && !result && proposal.proposed_status !== "pending";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error && !result ? (
            <div className="text-center py-8 space-y-3">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="font-semibold text-lg">Bir sorun oluştu</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : result === "accepted" ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-semibold text-lg">Randevunuz onaylandı!</p>
              <p className="text-sm text-muted-foreground">Yeni saatinizi WhatsApp üzerinden de ayrıca aldınız.</p>
            </div>
          ) : result === "rejected" ? (
            <div className="text-center py-8 space-y-3">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="font-semibold text-lg">Bildirdiniz, teşekkürler</p>
              <p className="text-sm text-muted-foreground">İşletmeye iletildi, sizinle tekrar iletişime geçecekler.</p>
            </div>
          ) : alreadyAnswered ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="font-semibold text-lg">Bu öneriye zaten yanıt verdiniz</p>
            </div>
          ) : proposal && proposal.proposed_appointment_at ? (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold">İşletme size yeni bir saat önerdi</h1>
                <p className="text-sm text-muted-foreground">Merhaba {proposal.customer_name}</p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground line-through">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{format(new Date(proposal.current_appointment_at), "d MMMM yyyy, HH:mm", { locale: tr })}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  <span className="text-xs uppercase tracking-wide font-medium">Önerilen yeni saat</span>
                </div>
                <div className="flex items-center gap-3 font-semibold text-base">
                  <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>{format(new Date(proposal.proposed_appointment_at), "d MMMM yyyy EEEE", { locale: tr })}</span>
                </div>
                <div className="flex items-center gap-3 font-semibold text-base">
                  <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>{format(new Date(proposal.proposed_appointment_at), "HH:mm")}</span>
                </div>
                {proposal.service_name && <div className="pt-1 text-xs text-muted-foreground">{proposal.service_name}</div>}
                <div className="text-xs text-muted-foreground">{proposal.org_name}</div>
              </div>

              {!proposal.respondable ? (
                <p className="text-center text-sm text-muted-foreground">Bu önerinin süresi geçmiş.</p>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={responding}
                    onClick={() => respond("reject")}
                  >
                    {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reddet"}
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={responding}
                    onClick={() => respond("accept")}
                  >
                    {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kabul Et"}
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
      <PoweredByBadge />
    </div>
  );
}
