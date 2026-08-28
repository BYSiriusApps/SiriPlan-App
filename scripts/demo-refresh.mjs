import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const env = Object.fromEntries(
  readFileSync("d:/0000-BY SİRİUS PROJELER/15 PROJE TEMEL/randevu-sistemi/.env.local", "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ORG = "8e73d29c-e312-49d1-8259-2ce510028320";

// Tarih penceresi çalıştırıldığı güne göre otomatik hesaplanır — sabit kod yok.
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setUTCHours(12, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const TODAY = addDays(0);
const PAST = [addDays(-2), addDays(-1)];
const FUT = [addDays(1), addDays(2), addDays(3), addDays(4), addDays(5), addDays(6), addDays(7)];
// UTC minutes-from-midnight; local = UTC+3
const AMc = [300, 360, 420, 480, 540, 600];              // 08:00–13:00 local  (past / done)
const PMc = [660, 720, 780, 840, 900];                    // 14:00–18:00 local  (upcoming today)
const DAYc = [300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900];

const NAME_FIX = {
  "Zeynep Test": "Zeynep Arslan", "test 5 agustos": "Elif Kara",
  "Gül  üstüay": "Gül Üstüay", "Gül üstüay": "Gül Üstüay",
  "özgün üstüay": "Özgün Üstüay", "OZGUN USTUAY": "Özgün Üstüay",
  "Helin üstüay": "Helin Üstüay", "Hayriye toy": "Hayriye Toy",
  "Mine rey": "Mine Rey", "Lale kul": "Lale Kul", "Cilt Uzmanı": "Derya Şahin",
};
const hhmm = (m) => `${String((m / 60) | 0).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
// slot-major cell stream: spreads appts across days first, then later times
const stream = (days, cells) => cells.flatMap((c) => days.map((d) => [d, c]));

const { data: staff } = await sb.from("staff").select("id, full_name").eq("org_id", ORG);
const sName = Object.fromEntries((staff ?? []).map((s) => [s.id, s.full_name]));

const { data: appts, error } = await sb.from("appointments")
  .select("id, appointment_at, status, customer_name, duration_minutes, staff_id")
  .eq("org_id", ORG).order("appointment_at", { ascending: true });
if (error) { console.error(error); process.exit(1); }

// upcoming appts sitting on the deactivated staff ("Tuna tuna") -> move to an
// active service-taking staff so they render on calendar filters
const INACTIVE = new Set(["e089bab0-dea7-4676-800b-6ea636899d08"]);
const ACTIVE_SVC = [
  "32803349-2fb2-42b0-b5db-2315cfa3196c", // Elif Demir
  "e1053018-09c0-4f6f-b8db-793ef33d8df3", // Can Yılmaz
  "c9b25c81-01b9-4f59-814f-0ce3dcc0fc09", // Deniz Acar
];
{
  let rr = 0;
  for (const a of appts) {
    if ((a.status === "onaylandi" || a.status === "talep") && INACTIVE.has(a.staff_id)) {
      a.staff_id = ACTIVE_SVC[rr++ % ACTIVE_SVC.length];
      a._staffChanged = true;
    }
  }
}

const EXEMPT = new Set(["iptal", "gelmedi"]);
const booked = {};                     // booked[day][staff] = [[s,e)]
const hit = (d, st, s, e) => (booked[d]?.[st] ?? []).some(([bs, be]) => s < be && bs < e);
const hold = (d, st, s, e) => (((booked[d] ??= {})[st] ??= []).push([s, e]));

const assign = (list, cells) => {
  let k = 0;
  for (const a of list) {
    const dur = Math.max(15, a.duration_minutes || 60);
    let done = false;
    for (let tries = 0; tries < cells.length && !done; tries++) {
      const [day, min] = cells[(k + tries) % cells.length];
      if (EXEMPT.has(a.status) || !hit(day, a.staff_id, min, min + dur)) {
        if (!EXEMPT.has(a.status)) hold(day, a.staff_id, min, min + dur);
        const fix = NAME_FIX[(a.customer_name || "").trim()];
        out.push({ id: a.id, to: `${day}T${hhmm(min)}+00:00`, status: a.status, staff: sName[a.staff_id] ?? "—",
          nameFrom: a.customer_name, nameTo: fix && fix !== a.customer_name ? fix : null,
          staffId: a._staffChanged ? a.staff_id : null });
        done = true;
      }
    }
    if (!done) { // rare fallback
      const [day, min] = cells[k % cells.length];
      out.push({ id: a.id, to: `${day}T${hhmm(min)}+00:00`, status: a.status, staff: sName[a.staff_id] ?? "—", nameFrom: a.customer_name, nameTo: null });
    }
    k++;
  }
};

const out = [];
const done = appts.filter((a) => a.status === "tamamlandi");
const miss = appts.filter((a) => EXEMPT.has(a.status));
const conf = appts.filter((a) => a.status === "onaylandi");
const req = appts.filter((a) => a.status === "talep");
const rest = appts.filter((a) => !["tamamlandi", "onaylandi", "talep", ...EXEMPT].includes(a.status));
if (rest.length) console.log("!! unexpected status:", rest.map((r) => r.status));

assign(done, stream([...PAST, TODAY], AMc));
assign(miss, stream([...PAST, TODAY], [...AMc, 660, 720]));
assign(conf, [...stream([TODAY], PMc), ...stream(FUT, DAYc)]);
assign(req, stream(FUT.slice(0, 3), PMc));

out.sort((a, b) => a.to.localeCompare(b.to));
console.log(`\nPLAN — ${out.length}   ${APPLY ? "*** APPLYING ***" : "(dry-run)"}\n`);
for (const p of out) {
  const lt = new Date(new Date(p.to).getTime() + 3 * 3600e3).toISOString().slice(11, 16);
  console.log(`${p.to.slice(0, 10)} ${lt} [${p.status.padEnd(10)}] ${p.staff.padEnd(14)} ${p.nameTo ? `${p.nameFrom} => ${p.nameTo}` : p.nameFrom}`);
}
const bd = {}; for (const p of out) bd[p.to.slice(0, 10)] = (bd[p.to.slice(0, 10)] || 0) + 1;
console.log("\nper day:", bd, "| name fixes:", out.filter((p) => p.nameTo).length);
if (!APPLY) { console.log("\n(dry-run)"); process.exit(0); }

console.log("\nphase 1: park");
for (let i = 0; i < out.length; i++) {
  const park = new Date(Date.UTC(2027, 0, 1) + i * 4 * 3600e3).toISOString().replace(".000Z", "+00:00");
  const { error: e } = await sb.from("appointments").update({ appointment_at: park }).eq("id", out[i].id).eq("org_id", ORG);
  if (e) console.error("park FAIL", e.message);
}
console.log("phase 2: place");
let ok = 0, fail = 0;
for (const p of out) {
  const patch = { appointment_at: p.to };
  if (p.nameTo) patch.customer_name = p.nameTo;
  if (p.staffId) patch.staff_id = p.staffId;
  const { error: e } = await sb.from("appointments").update(patch).eq("id", p.id).eq("org_id", ORG);
  if (e) { fail++; console.error("FAIL", p.to, e.message); } else ok++;
}
console.log(`done: ${ok} ok / ${fail} fail`);
const { data: pr } = await sb.from("appointment_requests").select("id").eq("org_id", ORG).limit(1);
if (pr?.[0]) {
  const { error: e } = await sb.from("appointment_requests")
    .update({ appointment_at: "2026-08-29T12:30:00+00:00", status: "pending", created_at: "2026-08-27T08:15:00+00:00" })
    .eq("id", pr[0].id).eq("org_id", ORG);
  console.log("request:", e ? "FAIL " + e.message : "pending @ 08-29 12:30");
}
