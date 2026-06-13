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
};

// Partner logos live in public/brand/partners/, referenced via this helper
// so all media still resolves through this module.
export const partnerLogo = (file: string) => `${BASE}/partners/${file}`;
