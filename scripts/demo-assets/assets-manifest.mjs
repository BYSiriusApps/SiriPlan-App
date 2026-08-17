/**
 * Demo salonların görsel üretim planı.
 *
 * Her kayıt: nereye gideceği (target) + hangi en-boy oranı + prompt.
 * target türleri:
 *   org-cover        -> organizations.cover_url        (org-logos/<orgId>/cover.png)
 *   category-cover   -> service_categories.photo_url   (service-photos/<orgId>/categories/<catId>.png)
 *   category-gallery -> service_category_photos satırı (service-photos/<orgId>/categories/<catId>/<uuid>.png)
 *   service-photo    -> services.photo_url             (service-photos/<orgId>/services/<svcId>.png)
 */

const STYLE =
  "Photorealistic editorial beauty photography, shot on 50mm lens, soft diffused natural window light, " +
  "shallow depth of field, warm neutral color grading, upscale modern salon environment, clean uncluttered composition, " +
  "high-end magazine quality. Absolutely no text, no letters, no logos, no watermarks, no captions anywhere in the image.";

const BEFORE_AFTER =
  "Split-screen before-and-after comparison, two equal halves separated by a thin clean vertical line, " +
  "same person same angle same lighting in both halves, left half is the 'before' state, right half is the improved 'after' state. " +
  "No text or labels of any kind.";

export const DEMO_ORG = "8e73d29c-e312-49d1-8259-2ce510028320"; // Sirius Demo Güzellik Salonu
export const BYS_ORG = "fe2315ef-1752-4b57-9d12-8f098af460a1"; // BY Sirius Yönetim

export const DEMO_CATEGORIES = {
  sac: "e2a274bc-ae59-486d-91d8-d8cd65f19f27",
  tirnak: "04651f2d-7fa7-493a-8ae7-fcc1cfaa8034",
  cilt: "125836f6-a7e0-47b8-b77b-69362a9430ba",
  kas: "9cdf5a77-959d-467f-a465-45ffbc7d3351",
};

/** BY Sirius Yönetim'de mevcut kategoriler (test1/test2/test3 -> anlamlı adlara çevrilecek). */
export const BYS_CATEGORIES = {
  sac: "be7bd670-687a-4b42-9682-7474ba15547f", // test1
  tirnak: "15e04d0e-93cd-4fcb-851a-c894c75ad85a", // test2
  dovme: "728bd31e-4636-4953-9af4-f470657b6267", // test3
};

const g = (id, aspectRatio, prompt, target) => ({ id, aspectRatio, prompt: `${prompt} ${STYLE}`, target });

export const ASSETS = [
  // ---------------- SIRIUS DEMO GÜZELLIK SALONU ----------------
  g("demo-cover", "16:9",
    "Wide interior photograph of a luxurious modern hair and beauty salon: row of styling chairs facing large backlit mirrors, " +
    "marble and warm oak surfaces, brass fixtures, potted olive trees, floor-to-ceiling windows with soft afternoon light, no people.",
    { org: DEMO_ORG, kind: "org-cover" }),

  // --- Saç Hizmetleri ---
  g("demo-cat-sac", "16:9",
    "A hair colorist's gloved hands painting balayage highlights onto long wavy brunette hair, foils on a marble station, close crop.",
    { org: DEMO_ORG, kind: "category-cover", categoryId: DEMO_CATEGORIES.sac }),
  g("demo-sac-1", "1:1", "Glossy honey-blonde balayage on long wavy hair, seen from behind, salon background softly blurred.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.sac }),
  g("demo-sac-2", "1:1", "Sharp chin-length bob haircut with blunt ends on dark hair, three-quarter back view of a woman.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.sac }),
  g("demo-sac-3", "1:1", "Elegant low chignon bridal updo with a few soft loose strands, back view, ivory background.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.sac }),
  g("demo-sac-4", "1:1", "Hairdresser blow-drying voluminous shiny hair with a round brush, motion in the hair, warm salon light.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.sac }),
  g("demo-sac-5", "1:1", `${BEFORE_AFTER} Left: dull dry damaged brown hair with visible split ends. Right: the same hair now smooth, glossy and healthy with soft caramel balayage. Back-of-head view, face not visible.`,
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.sac }),
  g("demo-sac-6", "1:1", `${BEFORE_AFTER} Left: overgrown shapeless long hair. Right: a fresh precise layered cut with face-framing layers. Side profile view, face turned away from camera.`,
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.sac }),

  // --- Tırnak Bakımı ---
  g("demo-cat-tirnak", "16:9",
    "Close-up of elegant manicured hands resting on a marble table, soft pink almond-shaped nails with glossy finish, nail tools out of focus behind.",
    { org: DEMO_ORG, kind: "category-cover", categoryId: DEMO_CATEGORIES.tirnak }),
  g("demo-tirnak-1", "1:1", "Close-up of hands with glossy blush pink almond gel manicure resting on a folded white towel.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.tirnak }),
  g("demo-tirnak-2", "1:1", "French manicure with a delicate thin white tip on short natural nails, hand resting on cream linen.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.tirnak }),
  g("demo-tirnak-3", "1:1", "Nail art: soft nude nails with fine gold foil accents and one tiny floral detail, macro close-up.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.tirnak }),
  g("demo-tirnak-4", "1:1", "Nail technician's hands carefully shaping a client's nail with a file, professional lamp lighting, macro.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.tirnak }),
  g("demo-tirnak-5", "1:1", `${BEFORE_AFTER} Left: short bitten uneven natural nails with dry cuticles. Right: the same hand with a neat glossy nude manicure and tidy cuticles.`,
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.tirnak }),
  g("demo-tirnak-6", "1:1", "Deep red glossy long almond nails holding a small espresso cup, elegant and moody lighting.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.tirnak }),

  // --- Cilt Bakımı ---
  g("demo-cat-cilt", "16:9",
    "A relaxed woman lying on a treatment bed during a facial, an esthetician's gloved hands applying a cool cream mask, calm spa room, towels and orchid.",
    { org: DEMO_ORG, kind: "category-cover", categoryId: DEMO_CATEGORIES.cilt }),
  g("demo-cilt-1", "1:1", "Close-up of a woman's face with a soft green clay mask applied evenly, eyes closed, serene expression.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.cilt }),
  g("demo-cilt-2", "1:1", "Esthetician performing a gentle facial massage on a client, hands on cheekbones, warm spa lighting.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.cilt }),
  g("demo-cilt-3", "1:1", "Macro beauty shot of healthy glowing dewy skin on a cheek with fine water droplets, natural texture visible.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.cilt }),
  g("demo-cilt-4", "1:1", "Spa still life: rolled white towels, a jade roller, a serum dropper bottle and eucalyptus on a stone tray.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.cilt }),
  g("demo-cilt-5", "1:1", `${BEFORE_AFTER} Left: a cheek with dull uneven congested skin texture. Right: the same cheek now clear, smooth and radiant. Cropped tightly to the cheek, eyes not visible.`,
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.cilt }),
  g("demo-cilt-6", "1:1", "Hydrating sheet mask being smoothed onto a client's forehead by gloved hands, clean clinical-spa aesthetic.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.cilt }),

  // --- Kaş & Kirpik ---
  g("demo-cat-kas", "16:9",
    "Close-up of a brow artist mapping and shaping a client's eyebrow with fine tweezers, precise and clean, soft studio light.",
    { org: DEMO_ORG, kind: "category-cover", categoryId: DEMO_CATEGORIES.kas }),
  g("demo-kas-1", "1:1", "Macro close-up of one perfectly shaped and tinted natural eyebrow, skin clean and healthy.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.kas }),
  g("demo-kas-2", "1:1", "Close-up of a closed eye with long natural-looking classic lash extensions, delicate and fluffy.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.kas }),
  g("demo-kas-3", "1:1", "Lash artist applying an individual extension with fine tweezers, client's eye closed, macro detail.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.kas }),
  g("demo-kas-4", "1:1", "Brow lamination result: brushed-up fluffy full brows on a fresh clean face, three-quarter crop.",
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.kas }),
  g("demo-kas-5", "1:1", `${BEFORE_AFTER} Left: sparse unshaped thin eyebrow. Right: the same eyebrow now full, tinted and neatly shaped. Tight crop on the brow area only.`,
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.kas }),
  g("demo-kas-6", "1:1", `${BEFORE_AFTER} Left: short sparse natural eyelashes on a closed eye. Right: the same eye with full lifted lash extensions.`,
    { org: DEMO_ORG, kind: "category-gallery", categoryId: DEMO_CATEGORIES.kas }),

  // --- Demo hizmet fotoğrafları (kare, listede küçük gösteriliyor) ---
  g("demo-svc-sac-kesimi", "1:1", "Hairdresser's scissors cutting a precise line across freshly washed dark hair, close crop, motion of falling hair.",
    { org: DEMO_ORG, kind: "service-photo", serviceName: "Saç Kesimi" }),
  g("demo-svc-sac-boyama", "1:1", "Colorist applying creamy lightener to sectioned hair with a tint brush, foils nearby, close crop.",
    { org: DEMO_ORG, kind: "service-photo", serviceName: "Saç Boyama" }),
  g("demo-svc-manikur", "1:1", "Manicurist applying glossy nude polish to a client's nail, steady hands, macro close-up.",
    { org: DEMO_ORG, kind: "service-photo", serviceName: "Manikür" }),
  g("demo-svc-cilt", "1:1", "Client receiving a hydrating facial, esthetician smoothing serum across the cheek, calm spa mood.",
    { org: DEMO_ORG, kind: "service-photo", serviceName: "Cilt Bakımı" }),
  g("demo-svc-kas", "1:1", "Brow artist tinting an eyebrow with a fine angled brush, precise macro close-up.",
    { org: DEMO_ORG, kind: "service-photo", serviceName: "Kaş Tasarımı" }),

  // ---------------- BY SIRIUS YÖNETİM ----------------
  g("bys-cover", "16:9",
    "Wide interior photograph of a contemporary unisex hair studio with teal and deep blue accents, concrete floor, " +
    "black steel shelving, warm pendant lighting, barber chairs and a nail station, no people.",
    { org: BYS_ORG, kind: "org-cover" }),

  g("bys-cat-sac", "16:9", "Barber finishing a sharp men's fade haircut with clippers, focused hands, moody studio light.",
    { org: BYS_ORG, kind: "category-cover", categoryId: BYS_CATEGORIES.sac }),
  g("bys-sac-1", "1:1", "Clean men's skin fade haircut with textured top, back three-quarter view.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.sac }),
  g("bys-sac-2", "1:1", "Barber trimming a beard line with a straight razor, crisp edges, close crop.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.sac }),
  g("bys-sac-3", "1:1", "Hair washing at a modern black basin, foam and running water, relaxed client.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.sac }),
  g("bys-sac-4", "1:1", `${BEFORE_AFTER} Left: overgrown messy men's hair. Right: the same head with a sharp fresh fade and styled top. Side view, face turned away.`,
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.sac }),

  g("bys-cat-tirnak", "16:9", "Nail artist applying acrylic to extend a nail, professional lamp, teal-toned modern nail studio.",
    { org: BYS_ORG, kind: "category-cover", categoryId: BYS_CATEGORIES.tirnak }),
  g("bys-tirnak-1", "1:1", "Long acrylic nails with a smooth glossy milky finish, elegant hand pose on dark stone.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.tirnak }),
  g("bys-tirnak-2", "1:1", "Glitter ombre nail design catching the light, macro close-up on a dark background.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.tirnak }),
  g("bys-tirnak-3", "1:1", "Nail technician filing acrylic extensions to shape, dust and precision, macro.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.tirnak }),
  g("bys-tirnak-4", "1:1", "Fresh manicure being finished with cuticle oil applied by a dropper, macro close-up.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.tirnak }),

  g("bys-cat-dovme", "16:9", "Tattoo artist's gloved hands working a fine-line tattoo machine on a forearm, sterile setup, focused light.",
    { org: BYS_ORG, kind: "category-cover", categoryId: BYS_CATEGORIES.dovme }),
  g("bys-dovme-1", "1:1", "Delicate fine-line botanical tattoo on a forearm, freshly finished, clean skin.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.dovme }),
  g("bys-dovme-2", "1:1", "Small minimalist geometric tattoo on a wrist, macro close-up, soft daylight.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.dovme }),
  g("bys-dovme-3", "1:1", "Tattoo studio still life: sterile wrapped machine, ink caps, gloves and stencil paper on a steel tray.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.dovme }),
  g("bys-dovme-4", "1:1", "Artist stencilling a design onto skin before tattooing, careful placement, studio lighting.",
    { org: BYS_ORG, kind: "category-gallery", categoryId: BYS_CATEGORIES.dovme }),
];
