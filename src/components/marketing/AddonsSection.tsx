"use client";

import { useRef, useState } from "react";
import { Bot, MessageSquare, Zap, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const ADDON_META = [
  { key: "whatsappAI", icon: Bot },
  { key: "sms", icon: MessageSquare },
  { key: "multiBranch", icon: Zap },
] as const;

type AddonKey = (typeof ADDON_META)[number]["key"];

export function AddonsSection() {
  const t = useTranslations();
  const [openAddon, setOpenAddon] = useState<AddonKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const formOpenedAt = useRef(Date.now());

  function openDialog(key: AddonKey) {
    formOpenedAt.current = Date.now();
    setForm({ name: "", email: "", phone: "", message: "", website: "" });
    setOpenAddon(key);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!openAddon) return;
    setLoading(true);
    try {
      const res = await fetch("/api/addon-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addon: openAddon,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
          website: form.website,
          form_started_at: formOpenedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || t("addons.request.errorToast"));
        return;
      }
      toast.success(t("addons.request.successToast"));
      setOpenAddon(null);
    } catch {
      toast.error(t("addons.request.errorToast"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-16 bg-muted/20 border-y border-border">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("addons.title")}</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">{t("addons.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADDON_META.map((a) => (
            <div
              key={a.key}
              className="flex flex-col gap-3 p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm block mb-1">{t(`addons.${a.key}.name`)}</span>
                  <p className="text-xs text-muted-foreground">{t(`addons.${a.key}.desc`)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-1"
                onClick={() => openDialog(a.key)}
              >
                {t("addons.request.cta")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={openAddon !== null} onOpenChange={(open) => !open && setOpenAddon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openAddon ? t("addons.request.title", { name: t(`addons.${openAddon}.name`) }) : ""}
            </DialogTitle>
            <DialogDescription>{t("addons.request.subtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />
            <div className="space-y-1.5">
              <Label>{t("addons.request.nameLabel")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("addons.request.emailLabel")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("addons.request.phoneLabel")}{" "}
                <span className="text-xs font-normal text-muted-foreground">{t("addons.request.optional")}</span>
              </Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                maxLength={30}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("addons.request.messageLabel")}{" "}
                <span className="text-xs font-normal text-muted-foreground">{t("addons.request.optional")}</span>
              </Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                maxLength={500}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? t("addons.request.submitLoading") : t("addons.request.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
