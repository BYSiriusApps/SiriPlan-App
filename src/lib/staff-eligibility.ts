/**
 * "Farketmez" (personel farketmez) akışının TEK ortak kuralı: bir hizmete
 * staff_services'te açıkça personel atanmışsa sadece o (aktif) personel aday,
 * atama hiç yapılmamışsa veya atanan personelin hepsi pasife alınmışsa
 * (çoğu işletmenin varsayılan durumu) tüm aktif personel aday kabul edilir.
 *
 * Bu kuralı hem backend (staff-availability.ts → findAvailableStaff, gerçek
 * atama) hem frontend (PublicBookingClient.tsx → eligibleStaff, hangi
 * personel/saat müsait GÖRÜNECEĞİ) çağırır. Kural iki yerde ayrı ayrı
 * yazılırsa (kopya kod) ikisi zamanla birbirinden sürüklenir: frontend
 * müsait gösterip backend'in reddettiği (veya tersi) bir "Farketmez"
 * randevusu oluşur. Bu tam olarak iki kez canlıda patladı (bkz. git commit
 * 71e4fcd, 882eb22) — bu kuralı değiştirecek biri SADECE bu fonksiyonu
 * değiştirsin, iki tarafta da otomatik olarak düzelir.
 */
export function resolveEligibleStaffIds(
  allActiveStaffIds: string[],
  assignedStaffIds: string[]
): string[] {
  const activeSet = new Set(allActiveStaffIds);
  const assignedActive = assignedStaffIds.filter((id) => activeSet.has(id));
  return assignedActive.length > 0 ? assignedActive : allActiveStaffIds;
}
