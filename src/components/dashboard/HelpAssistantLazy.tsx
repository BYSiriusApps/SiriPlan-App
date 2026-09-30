"use client";

import dynamic from "next/dynamic";

// HelpAssistant (~320 satır, mikrofon/Web Speech mantığı) yalnızca kullanıcı
// yardım balonuna tıklayınca gerekiyor; panelin her açılışında statik import
// edilmemesi için code-split edildi. Tetikleyici buton `fixed` konumlandığı
// için (normal doküman akışının dışında) yüklenirken boş kalması CLS
// yaratmaz — bu yüzden ayrı bir fallback iskeleti gerekmiyor.
// next/dynamic(ssr:false) Server Component'lerde kullanılamadığı için bu
// dosya ayrı bir Client Component sarmalayıcı (dashboard/layout.tsx bir
// Server Component).
export const HelpAssistant = dynamic(
  () => import("./HelpAssistant").then((mod) => mod.HelpAssistant),
  { ssr: false }
);
