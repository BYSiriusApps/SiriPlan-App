/** Personel izin sistemi — davet dialogu ve personel düzenleme sayfası ortak kullanır. */

export const PERM_LABELS: Record<string, string> = {
  view_customers:      "Müşterileri görsün",
  edit_customers:      "Müşterileri düzenleyebilsin",
  view_reports:        "Raporları görsün",
  edit_services:       "Hizmetleri düzenleyebilsin",
  manage_staff:        "Personeli yönetebilsin",
  view_financials:     "Gelir/gideri görsün",
  manage_campaigns:    "Kampanyaları yönetebilsin",
  create_appointments: "Randevu oluşturabilsin",
  edit_appointments:   "Randevu düzenleyebilsin",
  cancel_appointments: "Randevu iptal edebilsin",
};

export const DEFAULT_PERMS: Record<"staff" | "manager", Record<string, boolean>> = {
  staff: {
    view_customers: true, edit_customers: false, view_reports: false,
    edit_services: false, manage_staff: false, view_financials: false,
    manage_campaigns: false, create_appointments: true, edit_appointments: true,
    cancel_appointments: false,
  },
  manager: {
    view_customers: true, edit_customers: true, view_reports: true,
    edit_services: true, manage_staff: false, view_financials: true,
    manage_campaigns: true, create_appointments: true, edit_appointments: true,
    cancel_appointments: true,
  },
};
