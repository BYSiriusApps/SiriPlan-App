// Panelde yeni randevu/talep geldiğinde çalınan kısa uyarı sesi.
// Dosya asseti yerine Web Audio API osilatörüyle üretilir: ek dosya/lisans
// derdi yok, her cihazda çalışır. Tercih localStorage'da tutulur (cihaza
// özel, senkron olmasına gerek yok — sunucuya gitmez).

const MUTE_KEY = "sp_notif_sound_muted";
const CHANGE_EVENT = "sp-notif-sound-change";

export function isNotificationSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotificationSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // localStorage kapalı olabilir (gizli sekme) — sessizce yut
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { muted } }));
}

export function onNotificationSoundMuteChange(cb: (muted: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<{ muted: boolean }>).detail.muted);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** İki tonlu kısa "ding" — kritik stok/yeni randevu gibi anlık uyarılar için. */
export function playNotificationChime(): void {
  if (isNotificationSoundMuted()) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Ses çalınamazsa (autoplay kısıtı, tarayıcı desteği) sessizce atla —
    // toast/bildirim yine de görünür kalır.
  }
}
