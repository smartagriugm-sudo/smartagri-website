import { plantFactoryAssets } from "../assets";
import { isAuthConfigured, supabase } from "../auth/supabase";

// Where the 3D engines load their model from. The model stays out of the public
// repo, so the deployed site reads it from a private Storage bucket through
// short-lived links, which only a signed-in lab member can get (RLS in
// supabase/pf-model-storage.sql). Local development reads the git-ignored copy
// in public/brand/plant-factory. See SETUP-ERP-MODEL.md.

export const MODEL_BUCKET = "pf-model";
const LINK_SECONDS = 60 * 60;

export const MODEL_FILES = {
  plantFactory: { model: "plant_factory.glb", manifest: "manifest.json" },
  chamber: { model: "seed_chamber.glb", manifest: "seed_chamber_manifest.json" },
} as const;

export type ModelUrls = { modelUrl: string; manifestUrl: string };

type SignFile = (bucket: string, path: string, seconds: number) => Promise<string>;

const signWithSupabase: SignFile = async (bucket, path, seconds) => {
  const { data, error } = await supabase!.storage.from(bucket).createSignedUrl(path, seconds);
  if (error || !data) throw new Error(`Model ${path} tidak bisa dibuka: ${error?.message ?? "tanpa keterangan"}`);
  return data.signedUrl;
};

export async function modelUrls(
  facility: keyof typeof MODEL_FILES,
  { useLocal = import.meta.env.DEV || !isAuthConfigured, sign = signWithSupabase }: { useLocal?: boolean; sign?: SignFile } = {},
): Promise<ModelUrls> {
  const { model, manifest } = MODEL_FILES[facility];
  if (useLocal) return { modelUrl: plantFactoryAssets + model, manifestUrl: plantFactoryAssets + manifest };
  const [modelUrl, manifestUrl] = await Promise.all([
    sign(MODEL_BUCKET, model, LINK_SECONDS),
    sign(MODEL_BUCKET, manifest, LINK_SECONDS),
  ]);
  return { modelUrl, manifestUrl };
}
