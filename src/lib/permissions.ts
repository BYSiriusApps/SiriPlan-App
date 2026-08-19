/** Personel izin sistemi — davet dialogu ve personel düzenleme sayfası ortak kullanır. */

export const PERM_LABELS: Record<string, string> = {
  view_customers:      "Müşterileri görsün",
  edit_customers:      "Müşterileri düzenleyebilsin",
  delete_customers:    "Müşteri silebilsin",
  view_reports:        "Raporları görsün",
  edit_services:       "Hizmetleri düzenleyebilsin",
  manage_staff:        "Personeli yönetebilsin",
  view_financials:     "Gelir/gideri görsün",
  manage_campaigns:    "Kampanyaları yönetebilsin",
  create_appointments: "Randevu oluşturabilsin",
  edit_appointments:   "Randevu düzenleyebilsin",
  cancel_appointments: "Randevu iptal edebilsin",
};

/** Çeviri anahtarı sırası — dashboard.permissions.* ile eşleşir. */
export const PERM_KEYS = Object.keys(PERM_LABELS);

/**
 * Yalnızca işletme sahibinin dağıtabileceği izinler. Bunlar olmadan
 * `manage_staff` yetkisi verilmiş bir yönetici, kendine denk (hatta üstün)
 * yeni yöneticiler üretip yetki zincirini kırabilirdi.
 */
export const OWNER_ONLY_PERMS = new Set(["manage_staff"]);

export const DEFAULT_PERMS: Record<"staff" | "manager", Record<string, boolean>> = {
  staff: {
    view_customers: true, edit_customers: false, delete_customers: false,
    view_reports: false, edit_services: false, manage_staff: false,
    view_financials: false, manage_campaigns: false, create_appointments: true,
    edit_appointments: true, cancel_appointments: false,
  },
  manager: {
    view_customers: true, edit_customers: true, delete_customers: true,
    view_reports: true, edit_services: true, manage_staff: false,
    view_financials: true, manage_campaigns: true, create_appointments: true,
    edit_appointments: true, cancel_appointments: true,
  },
};

/** İzin denetiminde kullanılan asgari üyelik bilgisi (bkz. lib/active-org). */
export interface PermissionSubject {
  role: string;
  permissions_json: Record<string, boolean> | null;
}

/**
 * Bir üyenin belirli bir izne sahip olup olmadığını söyler.
 *
 * `owner` her zaman yetkilidir. Diğer roller için önce kayıtlı
 * `permissions_json` değerine, o anahtar hiç yazılmamışsa rolün varsayılanına
 * bakılır — böylece `delete_customers` gibi sonradan eklenen izinler, izin
 * kaydı eski olan yöneticilerde de doğru çalışır.
 */
export function hasPermission(
  member: PermissionSubject | null | undefined,
  key: string
): boolean {
  if (!member) return false;
  if (member.role === "owner") return true;
  const perms = member.permissions_json ?? {};
  if (key in perms) return !!perms[key];
  const defaults = DEFAULT_PERMS[member.role as "staff" | "manager"];
  return !!defaults?.[key];
}

/** Personel/yetki yönetimi yapabilir mi? (sahip veya manage_staff verilmiş üye) */
export function canManageStaff(member: PermissionSubject | null | undefined): boolean {
  return !!member && (member.role === "owner" || !!member.permissions_json?.manage_staff);
}

/** Gelen izin nesnesini yalnızca bilinen anahtarlara indirger. */
export function sanitizePermissions(input: unknown): Record<string, boolean> {
  const clean: Record<string, boolean> = {};
  if (!input || typeof input !== "object") return clean;
  const src = input as Record<string, unknown>;
  for (const key of PERM_KEYS) {
    if (key in src) clean[key] = !!src[key];
  }
  return clean;
}
