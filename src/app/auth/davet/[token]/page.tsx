import { StaffInviteAccept } from "@/components/auth/StaffInviteAccept";

// `/auth/davet/<token>` — token yol segmentinde. WhatsApp/e-posta/uygulama
// link yakalama katmanları sorgu parametrelerini bazen düşürüyor; yol biçimi
// token'ı her durumda korur. Sorgu biçimi (`?token=`) geriye dönük çalışır.
export default async function DavetTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StaffInviteAccept token={token} />;
}
