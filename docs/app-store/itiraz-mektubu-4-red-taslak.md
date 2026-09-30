# App Store Resolution Center — 4. itiraz mektubu taslağı

Gönderilmeden önce: karakter sayısı (4000 sınırı) App Store Connect'in kendi
kutusunda kontrol edilmeli — aşağıdaki taslak ~3450 karakter, marj var.

---

Dear App Review Team,

Thank you for the detailed feedback. We have made concrete changes to address
both issues rather than resubmitting the same material.

**1. Guideline 2.3.10 — Third-party platform references removed**

We understand now that our screenshots and in-app text prominently named
third-party platforms (WhatsApp, Instagram) in a way that was not relevant to
what SiriPlan itself offers. We have:

- Removed all explicit "WhatsApp"/"Instagram" wording from the persistent
  in-app banner and from the "Pending Requests" page subtitle.
- Re-captured all screenshots (iPhone and iPad, all size classes) from the
  live app with this text removed.

New screenshots are attached to this submission via Media Manager.

**2. Guideline 5.2.5 — App name changed on iOS**

We take this seriously and have changed the app's display name specifically
for the iOS App Store listing and the iOS app itself (home screen icon label
and in-app branding) from "SiriPlan" to **"SiriusPlan"**.

We chose "Sirius" deliberately: it is the actual name of our company (BY
Sirius Group, bysirius.com, Companies House England & Wales No. 17142392) and
the star Sirius, not a reference to Apple's Siri. We note that other
App Store apps beginning with "Sirius" (e.g. SiriusXM, a major existing App
Store app) coexist with Siri without causing confusion, because the word is
read and understood as "Sirius," a distinct, recognizable term — not as
"Siri" plus a suffix.

To be clear about scope: our Android app (Google Play) and our website
(siriplan.com) will continue to use "SiriPlan" — this is a long-established,
independently trademarked name in our home market (Turkish Patent and
Trademark Office, Application No. 2026/229235, filed September 10, 2026,
Class 42, publishing in Official Bulletin No. 502 on October 12, 2026). Only
the iOS listing and iOS app UI change to "SiriusPlan," specifically to remove
any possible reading as "Siri."

The app's voice input feature remains built on Google's Gemini API, activated
by our own in-app microphone button — it has no relationship to Siri and does
not claim any Apple integration.

**3. What changed in this submission**

- iOS app: display name and in-app branding now read "SiriusPlan."
- Screenshots: fully re-captured, no third-party platform names, no device
  frames (per your prior 2.3.10 note).
- A new build reflecting these changes has been uploaded.

We are committed to full compliance and happy to make any further adjustments
you identify. Thank you again for your time.

Kind regards,
bySirius — SiriPlan / SiriusPlan Development Team
bysirius.com · siriplan.com

---

## Notlar (gönderen için, mektuba dahil değil)
- Yeni build yüklenmeden bu mektup gönderilirse Apple muhtemelen "hâlâ eski
  build'i görüyorum" der — Info.plist + build sırası önce tamamlanmalı.
- "SiriusXM" emsali insan incelemeciye hitap eder; otomatik bir filtre varsa
  işe yaramayabilir — bu yüzden mektup + kod değişikliği BİRLİKTE gidiyor,
  yalnızca mektup değil.
