"use client";

import { useState } from "react";
import { Loader2, XCircle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

type Labels = {
  trigger: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmButton: string;
  cancelButton: string;
  loading: string;
  successToast: string;
  errorToast: string;
  scheduledNote: string;
  undo: string;
  undoLoading: string;
  undoSuccessToast: string;
};

/** /dashboard/abonelik'te Stripe Müşteri Portalı'na hiç gerek kalmadan doğrudan iptal. */
export function CancelSubscriptionButton({ labels, locale }: { labels: Labels; locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);

  async function submit(resume: boolean) {
    const setBusy = resume ? setUndoing : setLoading;
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || labels.errorToast);
        return;
      }
      if (resume) {
        setScheduledFor(null);
        toast.success(labels.undoSuccessToast);
      } else {
        setScheduledFor(data.periodEnd ?? null);
        toast.success(labels.successToast);
        setOpen(false);
      }
    } catch {
      toast.error(labels.errorToast);
    } finally {
      setBusy(false);
    }
  }

  if (scheduledFor) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 text-sm">
        <span className="text-amber-800 dark:text-amber-300">
          {labels.scheduledNote.replace(
            "{date}",
            new Date(scheduledFor).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
          )}
        </span>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={undoing} onClick={() => submit(true)}>
          {undoing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
          {labels.undo}
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-destructive/30 text-destructive font-medium hover:bg-destructive/5 transition-colors"
          />
        }
      >
        <XCircle className="h-4 w-4" />
        {labels.trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.confirmTitle}</DialogTitle>
          <DialogDescription>{labels.confirmDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{labels.cancelButton}</DialogClose>
          <Button variant="destructive" disabled={loading} onClick={() => submit(false)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? labels.loading : labels.confirmButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
