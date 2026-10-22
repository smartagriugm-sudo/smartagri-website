const BASE = "/brand";

// TODO: hero.mp4, field.jpg, and farmer.jpg are not in public/brand/ yet.
// The page renders brand-colored placeholders behind/instead of them, so you can
// drop the real files into public/brand/ later with no code change.
export const A = {
  heroVideo: `${BASE}/hero.mp4`,
  logoWhite: `${BASE}/smartagri-white.svg`,
  logoColor: `${BASE}/smartagri-color.svg`,
  iconWhite: `${BASE}/icon-white.svg`,
  iconColor: `${BASE}/icon-color.svg`,
  backgroundCard: `${BASE}/field.jpg`,
  farmerPhoto: `${BASE}/farmer.jpg`,
  inagritechHero: `${BASE}/inagritech-hero.webp`,
  heroPhoto: `${BASE}/hero.webp`,
  indoorFarmingHero: `${BASE}/indoor-farming/hero.webp`,
};

// Indoor Farming section imagery lives in public/brand/indoor-farming/.
// Files that are not in place yet fall back to a brand-colored placeholder in
// the UI (see PhotoSlot), so they can be dropped in later with no code change.
export const indoorFarmingPhoto = (file: string) =>
  `${BASE}/indoor-farming/${file}`;

// Imagery for the Indoor Farming dashboard demo, kept in its own folder so the
// dashboard art (screens, renders, product shots) stays separate from the
// documentary photography used by the rest of the section.
export const indoorDashboardImage = (file: string) =>
  `${BASE}/indoor-farming/dashboard/${file}`;

// One real photo per research area (from the center's own gallery and field
// notes), keyed by the area slug in lib/research.ts. Used on /research.
export const researchPhoto: Record<string, string> = {
  "open-field-technology": `${BASE}/uploads/gallery/2024-12-11-pemasangan-alat-demplot-tabo-tabo-pamukkulu/2024-12-11-pemasangan-alat-demplot-tabo-tabo-pamukkulu-1HWb_KYwoO3RaWoUly0-GxoB3EPRlhVsL.webp`,
  "irrigation-modernization": `${BASE}/uploads/gallery/2025-04-21-pelatihan-dan-pemeliharaan-sipasi-tabo-tabo-pamukkulu/2025-04-21-pelatihan-dan-pemeliharaan-sipasi-tabo-tabo-pamukkulu-12nWs4zSwE8hSWbS5z3z4aTP65UpJzQpB.webp`,
  "smart-estate-technology": `${BASE}/uploads/notes/465-0-image.webp`,
  "smart-uav-technology": `${BASE}/uploads/gallery/2024-12-02-pelatihan-drone-vtol/2024-12-02-pelatihan-drone-vtol-1B8MNcpC1PbkT0t31mKq9SN-1v29fj8J6.webp`,
  "indoor-farming-technology": `${BASE}/indoor-farming/greenhouses-closed-plant-factories.webp`,
  "agro-informatics": `${BASE}/uploads/gallery/2024-12-02-pelatihan-drone-vtol/2024-12-02-pelatihan-drone-vtol-1abXVdczzJSMrvjMkWPxpaX-ElfNcLGWn.webp`,
};

// A second, supporting photo per research area, shown smaller beside the main
// one on /research and on each area's page.
export const researchPhotoAlt: Record<string, string> = {
  "open-field-technology": `${BASE}/uploads/gallery/2024-12-11-pemasangan-alat-demplot-tabo-tabo-pamukkulu/2024-12-11-pemasangan-alat-demplot-tabo-tabo-pamukkulu-1JqauL9hUOvXamecCWN0u6mSLIkcQdwww.webp`,
  "irrigation-modernization": `${BASE}/uploads/gallery/2025-04-21-pelatihan-dan-pemeliharaan-sipasi-tabo-tabo-pamukkulu/2025-04-21-pelatihan-dan-pemeliharaan-sipasi-tabo-tabo-pamukkulu-11FJc7IKfe55HGj_OnSNBvZsV9nhdjSlW.webp`,
  "smart-estate-technology": `${BASE}/uploads/gallery/2024-12-02-pelatihan-drone-vtol/2024-12-02-pelatihan-drone-vtol-1HiXt6eKkeiBL5VhBLWKogfTQuAOLZYVU.webp`,
  "smart-uav-technology": `${BASE}/uploads/gallery/2024-12-02-pelatihan-drone-vtol/2024-12-02-pelatihan-drone-vtol-10CShNdagxyklS4N_ri6CR3lgzkrDI6cH.webp`,
  "indoor-farming-technology": `${BASE}/indoor-farming/cultivation-salad-herbs-berries.webp`,
  "agro-informatics": `${BASE}/uploads/gallery/2024-12-04-instalasi-aws-hidronav/2024-12-04-instalasi-aws-hidronav-1ZSUt3qWeI0iAZulBgRpzWvUrsuvjAUVx.webp`,
};

// Partner logos live in public/brand/partners/, referenced via this helper
// so all media still resolves through this module.
export const partnerLogo = (file: string) => `${BASE}/partners/${file}`;

// Team portraits live in public/brand/team/<slug>.webp (white background),
// referenced by slug so all media still resolves through this module.
export const teamPhoto = (slug: string) => `${BASE}/team/${slug}.webp`;

// Research evidence figures in public/brand/research/: slides from the
// center's profile deck (slides/slide-NN.webp) and the research framework
// figure of each student thesis (frameworks/<code>.webp, e.g. s1-13).
export const researchSlide = (n: number) =>
  `${BASE}/research/slides/slide-${String(n).padStart(2, "0")}.webp`;
export const researchFramework = (code: string) =>
  `${BASE}/research/frameworks/${code.toLowerCase()}.webp`;
