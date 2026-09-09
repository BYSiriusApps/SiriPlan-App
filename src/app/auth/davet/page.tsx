"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StaffInviteAccept } from "@/components/auth/StaffInviteAccept";

function DavetQueryContent() {
  const token = useSearchParams().get("token");
  return <StaffInviteAccept token={token} />;
}

// `/auth/davet?token=...` — eski (sorgu parametreli) davet linki. Yeni linkler
// `/auth/davet/[token]` yol biçiminde üretilir (bkz. api/staff/invite); bu
// sayfa geriye dönük uyumluluk için kalır.
export default function DavetPage() {
  return (
    <Suspense>
      <DavetQueryContent />
    </Suspense>
  );
}
