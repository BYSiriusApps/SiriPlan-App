/**
 * Önce/Sonra fotoğraf özelliğinin gösterileceği sektörler — yalnızca görsel
 * sonucun satışın parçası olduğu, gerçek business_type değerleri (bkz.
 * messages/tr.json businessTypes ve src/lib/services/catalog.ts). Diğer
 * sektörlerde (berber, spa, diyetisyen…) bu kart hiç render edilmez.
 */
export const VISUAL_RESULT_SECTORS = [
  "makyaj",
  "estetik",
  "kas_kirpik",
  "tattoo",
  "guzellik",
  "nail",
] as const;

export function hasVisualResultFeature(businessType: string | null | undefined): boolean {
  if (!businessType) return false;
  return (VISUAL_RESULT_SECTORS as readonly string[]).includes(businessType);
}
