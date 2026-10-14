import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// Bu müşteri bağlantı sayfası kendi başına (provider'sız) render edilir; yalnızca gereken ad alanını
// (küçük payload) istemci tarafına geçirir. Dil, genel ayarla (çerez / IP / tarayıcı dili) çözülür.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const all = (await getMessages()) as { panelPages?: Record<string, unknown> };
  const messages = { panelPages: { onay: all.panelPages?.onay ?? {} } };
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
