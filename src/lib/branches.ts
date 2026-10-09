import { createAdminClient } from "@/lib/supabase/server";
import { getOrgAddons } from "@/lib/stripe/addons";

/** Ana org'dan şubeye kopyalanan plan alanları (Stripe kimlikleri ASLA kopyalanmaz). */
const INHERITED_COLUMNS =
  "plan, subscription_status, trial_ends_at, max_staff, max_appointments_monthly, feature_ai, feature_campaigns, feature_gamification, feature_api, feature_whitelabel, feature_website";

export interface BranchInfo {
  /** Bu org bir şubeyse ana org'un kimliği ve adı. */
  parent: { id: string; name: string } | null;
  /** Bu org'un şubeleri (ana org ise). */
  branches: { id: string; name: string }[];
}

/** Hata/eksik tablo durumunda "şube yok" döner — asla fırlatmaz. */
export async function getBranchInfo(orgId: string): Promise<BranchInfo> {
  const none: BranchInfo = { parent: null, branches: [] };
  try {
    const admin = await createAdminClient();
    const { data: asBranch } = await admin
      .from("org_branches")
      .select("parent_org_id")
      .eq("branch_org_id", orgId)
      .maybeSingle();
    if (asBranch) {
      const { data: parent } = await admin
        .from("organizations")
        .select("id, name")
        .eq("id", asBranch.parent_org_id)
        .maybeSingle();
      return { parent: parent ? { id: parent.id, name: parent.name } : null, branches: [] };
    }
    const { data: links } = await admin
      .from("org_branches")
      .select("branch_org_id")
      .eq("parent_org_id", orgId)
      .order("created_at", { ascending: true });
    const ids = (links ?? []).map((l) => l.branch_org_id as string);
    if (ids.length === 0) return none;
    const { data: orgs } = await admin.from("organizations").select("id, name").in("id", ids);
    const byId = new Map((orgs ?? []).map((o) => [o.id as string, o.name as string]));
    return { parent: null, branches: ids.filter((id) => byId.has(id)).map((id) => ({ id, name: byId.get(id)! })) };
  } catch {
    return none;
  }
}

/** Org bir şube mi? (Şubenin kendi Stripe aboneliği açması engellenir.) Hata → false. */
export async function isBranchOrg(orgId: string): Promise<boolean> {
  try {
    const admin = await createAdminClient();
    const { data } = await admin.from("org_branches").select("branch_org_id").eq("branch_org_id", orgId).maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Ana org'un plan/durum/özelliklerini şubelerine yansıtır. Plan değişince, plan
 * iptal edilince ve şube hakkı değişince çağrılır. Şube yoksa hiçbir şey yapmaz.
 *
 * Satın alınan hak sayısını aşan şubeler (paket iptal/azaltma) en yeni olandan
 * başlayarak "canceled" yapılır → salt-okunur kilit; VERİ SİLİNMEZ, paket geri
 * alınınca bir sonraki senkronda yeniden açılır.
 *
 * Asla fırlatmaz: ana ödeme/plan akışı bu yüzden başarısız olmamalı.
 */
export async function syncBranchesFromParent(parentId: string): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { data: links } = await admin
      .from("org_branches")
      .select("branch_org_id")
      .eq("parent_org_id", parentId)
      .order("created_at", { ascending: true });
    if (!links || links.length === 0) return;

    const { data: parent } = await admin.from("organizations").select(INHERITED_COLUMNS).eq("id", parentId).maybeSingle();
    if (!parent) return;
    const { extra_branch_slots: slots } = await getOrgAddons(parentId);

    for (let i = 0; i < links.length; i++) {
      await admin
        .from("organizations")
        .update({ ...parent, subscription_status: i < slots ? parent.subscription_status : "canceled" })
        .eq("id", links[i].branch_org_id);
    }
  } catch (err) {
    console.error("[branches] şube senkronu başarısız:", err);
  }
}
