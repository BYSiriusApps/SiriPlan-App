"use client";

import dynamic from "next/dynamic";

/**
 * ChatWidget'ı ilk JS paketinden çıkaran istemci sarmalayıcısı.
 *
 * NEDEN AYRI DOSYA: `dynamic(..., { ssr: false })` yalnızca istemci
 * bileşenlerinde çalışır — sunucu bileşeni olan (marketing)/layout.tsx içinde
 * kullanılırsa hem `ssr: false` geçersiz olur hem de Next.js bir sunucu
 * bileşeninden dinamik alınan istemci bileşenini otomatik olarak ayrı parçaya
 * bölmez (bkz. next/dist/docs/01-app/02-guides/lazy-loading.md). Yani sarmalayıcı
 * olmadan kod bölme hiç gerçekleşmez, sadece görünüşte "lazy" olurdu.
 *
 * Kazanç: sohbet balonu ilk ekranda yalnızca bir daire olarak duruyor ama tüm
 * mesaj listesi, ikon seti ve gönderme mantığı her pazarlama sayfasının ilk
 * paketine giriyordu. Artık sayfa etkileşime hazır olduktan sonra iniyor.
 */
const ChatWidget = dynamic(
  () => import("./ChatWidget").then((m) => m.ChatWidget),
  { ssr: false }
);

export function ChatWidgetLazy() {
  return <ChatWidget />;
}
