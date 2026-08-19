"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerId: string;
  phone: string;
  /** KVKK onayı zaten varsa buton yalnızca kampanya izni içindir — metin ona göre değişir. */
  hasKvkk?: boolean;
}

export default function SendKvkkLinkButton({ customerId, phone, hasKvkk = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ link: string; waLink: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/consent/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Link oluşturulamadı");

      // Link ekranda da gösteriliyor: window.open bir await'ten SONRA çağrıldığı
      // için tarayıcılar bunu "kullanıcı hareketi olmayan pop-up" sayıp
      // engelleyebiliyor. Engellenirse personelin elinde hiçbir şey kalmasın
      // diye linki kopyalanabilir biçimde bırakıyoruz; ayrıca WhatsApp dışında
      // SMS/e-posta ile göndermek isteyen de buradan alabiliyor.
      setResult({ link: data.link, waLink: data.wa_link });
      window.open(data.wa_link, "_blank", "noopener");
      toast.success("Onay linki hazırlandı (7 gün geçerli).");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı — linki elle seçip kopyalayın.");
    }
  }

  const label = hasKvkk ? "Kampanya İzni Linki Gönder" : "KVKK Onay Linki Gönder";

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleClick} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
        {label}
      </Button>

      {result && (
        <div className="rounded-lg border border-border bg-muted/40 p-2 space-y-1.5">
          <p className="text-[11px] text-muted-foreground break-all">{result.link}</p>
          <div className="flex items-center gap-1.5">
            <a
              href={result.waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-600 text-white text-[11px] font-medium hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              WhatsApp&apos;ta Aç
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[11px] font-medium hover:bg-accent transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Kopyalandı" : "Linki Kopyala"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
