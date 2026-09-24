"""
SiriPlan panelinde demo hesapla (sahip.demo@siriplan.com) gezinip Reels B-roll'u
icin gercek ekran kaydi alir. reels/public/videos/<reel-id>/README.md'de listelenen
"panel ekran kaydi" segmentlerinin bir kismini otomatik uretir.

Cogu adim sadece gezinme/scroll ama iki tanesi GERCEK yazma islemi yapar:
bir randevu olusturur (create_demo_appointment) ve bekleyen bir talebi onaylar
(approve_pending_request) -- ikisi de demo org'da, sentetik (uydurma) telefon
numaralariyla; randevu olusturmada "Otomatik WhatsApp mesaji" kutusu bilerek
KAPATILIYOR ki hicbir ihtimalde gercek numaraya mesaj gitmesin. Onaylama ise
uygulamanin kendi bildirim akisini calistirir (mevcut demo talebin numarasi
zaten sentetik test numarasi, bkz. scripts/demo-fill-bekleyen-istekler.mjs).

Ses gerektiren (sesli asistan konusma) ve fiziksel cekim gerektiren (defter,
telefon elde, yuz kamerasi) segmentler bu script'te YOK -- onlari kendin
cekip ilgili klasore bırakman gerekiyor.

Kurulum (bir kere):
    py -m pip install playwright
    py -m playwright install chromium

Kullanim:
    1) Ana projede bir terminalde: npm run dev   (varsayilan port 3000; baska
       bir proje 3000'i kullaniyorsa: npm run dev -- -p 3010)
    2) Sunucu "Ready" olunca, BASKA bir terminalde reels/ klasorunden:
       py scripts/record-panel.py
       (Port 3000'den farkliysa: set PANEL_URL=http://localhost:3010 && py scripts/record-panel.py)

Ilk istek Turbopack'in ilgili sayfayi derlemesini bekleyecek (yavas diskte
birkac dakika surebilir) -- script 60s timeout ile bekler, gerekirse script'i
tekrar calistirmak yeterli (Next dev route'u bir kere derleyince sonrakiler hizli).
"""
import os
import shutil
import subprocess
import tempfile
import uuid

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("PANEL_URL", "http://localhost:3000")
EMAIL = "sahip.demo@siriplan.com"
PASSWORD = "Sahip!2026Demo"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REELS_ROOT = os.path.join(SCRIPT_DIR, "..", "public", "videos")

VIDEO_W, VIDEO_H = 540, 960  # 9:16, mobil breakpoint tetikler (Remotion tarafinda cover ile 1080x1920'e olceklenir)

PW_VIDEO_DIR = os.path.join(tempfile.gettempdir(), "pw-videos")
os.makedirs(PW_VIDEO_DIR, exist_ok=True)


def find_ffmpeg():
    # NOT: Playwright'in kendi ms-playwright/ffmpeg-* build'i webm-only
    # (libx264/mp4 muxer YOK, --disable-everything ile derlenmis) -- oraya
    # bakma, gercek bir ffmpeg gerekli (winget install Gyan.FFmpeg).
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    winget_pkgs = os.path.join(
        os.path.expanduser("~"), "AppData", "Local", "Microsoft", "WinGet", "Packages"
    )
    if os.path.isdir(winget_pkgs):
        for name in os.listdir(winget_pkgs):
            if name.startswith("Gyan.FFmpeg"):
                pkg_dir = os.path.join(winget_pkgs, name)
                for root, _dirs, files in os.walk(pkg_dir):
                    if "ffmpeg.exe" in files:
                        return os.path.join(root, "ffmpeg.exe")
    raise RuntimeError(
        "Gercek bir ffmpeg bulunamadi. Kur: winget install --id Gyan.FFmpeg -e"
    )


FFMPEG = find_ffmpeg()


def login_and_get_storage_state(browser):
    """Bir kere giris yapar, cookie/localStorage durumunu dondurur -- her job
    icin yeniden login YAPMA: (1) Supabase auth rate-limit'ine carpar
    (10+ ardisik giriste 'HATA: navigated to /auth/giris' gormustuk), (2) login
    ekranini da kayda dahil eder (istenmeyen ~15-80s on-yuk)."""
    context = browser.new_context(viewport={"width": VIDEO_W, "height": VIDEO_H})
    page = context.new_page()
    page.set_default_timeout(90000)
    page.set_default_navigation_timeout(90000)
    page.goto(f"{BASE_URL}/auth/giris", wait_until="networkidle")
    page.locator("#email").fill(EMAIL)
    page.locator("#password").fill(PASSWORD)
    page.get_by_role("button", name="Giriş Yap").click()
    page.wait_for_url("**/dashboard**", timeout=90000)
    page.wait_for_load_state("networkidle")
    state = context.storage_state()
    context.close()
    return state


def record(page, reel_id, filename, seconds, steps):
    for step in steps:
        step(page)
    page.wait_for_timeout(int(seconds * 1000))

    out_dir = os.path.join(REELS_ROOT, reel_id)
    os.makedirs(out_dir, exist_ok=True)
    video = page.video
    page.close()
    webm_path = video.path()
    # ffmpeg.exe (Windows) turkce/unicode karakterli argumanlarla (proje yolu
    # "SİRİUS" iceriyor) guvenilir calismiyor -- once ASCII temp yola yaz,
    # sonra Python'un kendi dosya API'siyle (unicode-safe) hedefe tasi.
    tmp_mp4 = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4().hex}.mp4")
    subprocess.run(
        [FFMPEG, "-y", "-i", webm_path, "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", tmp_mp4],
        check=True, capture_output=True,
    )
    mp4_path = os.path.join(out_dir, filename)
    shutil.move(tmp_mp4, mp4_path)
    os.remove(webm_path)
    print(f"OK -> {mp4_path}")


def goto(path):
    def _step(page):
        page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
        page.wait_for_timeout(1000)
    return _step


def scroll_to_text(text):
    def _step(page):
        try:
            page.get_by_text(text, exact=False).first.scroll_into_view_if_needed(timeout=5000)
            page.wait_for_timeout(500)
        except Exception as e:
            print(f"  (uyari) scroll_to_text('{text}') basarisiz: {e}")
    return _step


def click_text(text, exact=False):
    def _step(page):
        try:
            page.get_by_text(text, exact=exact).first.click(timeout=5000)
            page.wait_for_timeout(500)
        except Exception as e:
            print(f"  (uyari) click_text('{text}') basarisiz: {e}")
    return _step


def press_escape(page):
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)


def wait(ms):
    def _step(page):
        page.wait_for_timeout(ms)
    return _step


def dismiss_cookies(page):
    """Cerez banner'i footage'a girmesin diye ilk firsatta kapat."""
    try:
        page.get_by_role("button", name="Kabul Et").click(timeout=3000)
        page.wait_for_timeout(300)
    except Exception:
        pass


def type_into(placeholder, text, delay=70):
    def _step(page):
        try:
            loc = page.get_by_placeholder(placeholder).first
            loc.click(timeout=5000)
            loc.press_sequentially(text, delay=delay)
            page.wait_for_timeout(400)
        except Exception as e:
            print(f"  (uyari) type_into('{placeholder}') basarisiz: {e}")
    return _step


def fill_placeholder(placeholder, value):
    def _step(page):
        try:
            page.get_by_placeholder(placeholder).first.fill(value, timeout=5000)
            page.wait_for_timeout(300)
        except Exception as e:
            print(f"  (uyari) fill_placeholder('{placeholder}') basarisiz: {e}")
    return _step


def scroll_by(px, times=1, pause=500):
    def _step(page):
        for _ in range(times):
            page.mouse.wheel(0, px)
            page.wait_for_timeout(pause)
    return _step


def create_demo_appointment(staff_name="Elif Demir", customer_name="Zeynep Kara",
                             phone="5059998877"):
    """Takvim'de 'Randevu Ekle' ile GERCEK bir randevu olusturur (demo org).
    Guvenlik: (1) telefon her zaman ASCII/sentetik test numarasi -- gercek
    kisiye ulasmasin, (2) 'Otomatik WhatsApp mesaji' kutusu bilerek KAPATILIR
    -- kod `sendWaMessage && customerPhone` ikisi de true olursa gonderiyor,
    biz sendWaMessage'i false'a cekerek her ihtimalde mesaj gitmesini
    engelliyoruz."""
    def _step(page):
        try:
            page.get_by_role("button", name="Randevu Ekle").click(timeout=8000)
            page.wait_for_timeout(1800)  # sheet acilis animasyonu bitsin

            # ONEMLI: "Elif Demir" gibi metinler ARKA PLANDAKI takvim sayfasinda
            # da var (personel filtre cipi) -- page.get_by_text(...).first
            # DOM sirasina gore YANLIS (perde arkasindaki) elemani seçebiliyor.
            # Base UI Sheet content'i role="dialog" -- her seyi bu scope
            # icinde arayarak dogru (gorunen) elemani hedefliyoruz.
            sheet = page.get_by_role("dialog")
            sheet.wait_for(timeout=8000)

            sheet.get_by_text(staff_name, exact=False).first.click(timeout=8000)
            page.wait_for_timeout(500)

            search = sheet.get_by_placeholder("İsim veya telefon ara...").first
            search.click(timeout=8000)
            search.press_sequentially(customer_name, delay=65)
            page.wait_for_timeout(500)

            phone_input = sheet.get_by_placeholder("5xx xxx xx xx").first
            phone_input.click(timeout=8000)
            phone_input.press_sequentially(phone, delay=50)
            page.wait_for_timeout(400)

            sheet.get_by_text("Hizmet seçin", exact=False).first.click(timeout=8000)
            page.wait_for_timeout(500)
            page.locator('[role="option"]').first.click(timeout=8000)
            page.wait_for_timeout(500)

            wa_checkbox = sheet.locator('input[type="checkbox"]').first
            if wa_checkbox.is_checked():
                wa_checkbox.uncheck(timeout=8000)
            page.wait_for_timeout(400)

            sheet.get_by_role("button", name="Randevu Oluştur").click(timeout=8000)
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"  (uyari) create_demo_appointment basarisiz: {e}")
    return _step


def approve_pending_request():
    def _step(page):
        try:
            page.get_by_role("button", name="Onayla", exact=False).first.click(timeout=8000)
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"  (uyari) approve_pending_request basarisiz: {e}")
    return _step


JOBS = [
    dict(
        reel_id="reel-1-deftere-mi-calisiyorsun",
        filename="3-panel-takvim.mp4",
        seconds=2,  # asil hareket steps icinde; sonda kisa bir tutus yeterli
        steps=[
            goto("/dashboard/takvim"), dismiss_cookies,
            click_text("Ay", exact=True), wait(700),
            click_text("Hafta", exact=True), wait(700),
            create_demo_appointment(),
        ],
    ),
    dict(
        reel_id="reel-1-deftere-mi-calisiyorsun",
        filename="4-panel-raporlar.mp4",
        seconds=5,
        steps=[goto("/dashboard/raporlar"), dismiss_cookies, scroll_by(400, times=2)],
    ),
    dict(
        reel_id="reel-2-sen-uyurken-ajanda-dolar",
        filename="3-panel-bildirim.mp4",
        seconds=5,
        steps=[goto("/dashboard"), dismiss_cookies, scroll_by(350, times=2)],
    ),
    dict(
        reel_id="reel-2-sen-uyurken-ajanda-dolar",
        filename="4-link-paylasma.mp4",
        seconds=4,
        steps=[goto("/dashboard/ayarlar"), dismiss_cookies, scroll_to_text("Randevu Linki")],
    ),
    dict(
        reel_id="reel-3-randevuyu-konusarak-olustur",
        filename="4-onay-ekrani.mp4",
        seconds=1,  # asil hareket approve_pending_request icinde
        steps=[goto("/dashboard/bekleyen-istekler"), dismiss_cookies, wait(800), approve_pending_request()],
    ),
    dict(
        reel_id="reel-4-kacan-randevuya-son",
        filename="3-panel-hatirlatma-ayarlari.mp4",
        seconds=6,
        steps=[goto("/dashboard/ayarlar"), dismiss_cookies, scroll_to_text("Hatırlatma"), scroll_by(200, times=2)],
    ),
    dict(
        reel_id="reel-5-personel-primi",
        filename="2-panel-personel-ciro.mp4",
        seconds=5,
        steps=[goto("/dashboard/personel"), dismiss_cookies, scroll_by(350, times=2)],
    ),
    dict(
        reel_id="reel-5-personel-primi",
        filename="3-rapor-export.mp4",
        seconds=5,
        steps=[goto("/dashboard/raporlar"), dismiss_cookies, scroll_to_text("Personel"), scroll_by(300, times=2)],
    ),
    dict(
        reel_id="reel-6-salonun-cepte",
        filename="2-hizli-panel-gecisleri.mp4",
        seconds=8,
        steps=[goto("/dashboard"), dismiss_cookies, wait(1500), goto("/dashboard/bekleyen-istekler"),
               wait(1500), goto("/dashboard/musteriler")],
    ),
    dict(
        reel_id="reel-6-salonun-cepte",
        filename="3-stok-kasa.mp4",
        seconds=6,
        steps=[goto("/dashboard/stok"), dismiss_cookies, scroll_by(300, times=1), wait(1500),
               goto("/dashboard/gelir-gider")],
    ),
]


def main():
    print(f"Panel URL: {BASE_URL}")
    only = os.environ.get("PANEL_ONLY")  # virgullu filename listesi, opsiyonel (yeniden deneme icin)
    jobs = JOBS
    if only:
        names = set(only.split(","))
        jobs = [j for j in JOBS if j["filename"] in names]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        print("Giris yapiliyor (bir kere)...")
        storage_state = login_and_get_storage_state(browser)

        for i, job in enumerate(jobs):
            print(f"[{i + 1}/{len(jobs)}] {job['reel_id']}/{job['filename']}")
            context = browser.new_context(
                viewport={"width": VIDEO_W, "height": VIDEO_H},
                storage_state=storage_state,
                record_video_dir=PW_VIDEO_DIR,
                record_video_size={"width": VIDEO_W, "height": VIDEO_H},
            )
            page = context.new_page()
            page.set_default_timeout(90000)
            page.set_default_navigation_timeout(90000)
            try:
                record(page, job["reel_id"], job["filename"], job["seconds"], job["steps"])
            except Exception as e:
                print(f"  HATA: {e}")
            finally:
                context.close()
        browser.close()
    print("Tamamlandi.")


if __name__ == "__main__":
    main()
