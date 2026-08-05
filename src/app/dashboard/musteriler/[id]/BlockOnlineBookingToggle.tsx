"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Ban, CircleSlash } from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerId: string;
  blocked: boolean;
}

export default function BlockOnlineBookingToggle({ customerId, blocked }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online_booking_blocked: !blocked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      toast.success(blocked ? "Online randevu erişimi tekrar açıldı" : "Online randevu erişimi engellendi");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={blocked ? "h-6 text-xs px-2 text-green-700 border-green-200 hover:bg-green-50" : "h-6 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50"}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
      ) : blocked ? (
        <CircleSlash className="h-3 w-3 mr-1" />
      ) : (
        <Ban className="h-3 w-3 mr-1" />
      )}
      {blocked ? "Engeli Kaldır" : "Online Randevudan Engelle"}
    </Button>
  );
}
