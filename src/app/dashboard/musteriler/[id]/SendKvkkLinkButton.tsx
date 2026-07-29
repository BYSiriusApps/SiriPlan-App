"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerId: string;
  phone: string;
}

export default function SendKvkkLinkButton({ customerId, phone }: Props) {
  const [loading, setLoading] = useState(false);

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
      window.open(data.wa_link, "_blank");
      toast.success("KVKK onay linki hazırlandı — WhatsApp açılıyor.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
      KVKK Onay Linki Gönder
    </Button>
  );
}
