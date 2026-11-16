// Shrinks the ERP's 3D models before they are uploaded to the pf-model bucket.
// See docs/setup/SETUP-ERP-MODEL.md. Run from web/:
//
//   node scripts/pack-model.mjs public/brand/plant-factory
//
// Each GLB gets EXT_meshopt_compression and is then gzipped; the site unpacks both in
// the browser (lib/pf/model-load.ts and the engine's MeshoptDecoder). Positions stay
// in metres, unquantized, because the engine reads raw vertex heights (its low-wall
// view); only normals are quantized. Files that are already packed are skipped, so
// running it twice is harmless.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { quantize, reorder } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const FILES = ["plant_factory.glb", "seed_chamber.glb"];
const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node scripts/pack-model.mjs <folder with the GLB files>");
  process.exit(1);
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const quiet = { warn() {}, info() {}, debug() {}, error: console.error };

for (const name of FILES) {
  const path = join(dir, name);
  const raw = await readFile(path);
  if (raw[0] === 0x1f && raw[1] === 0x8b) {
    console.log(`${name}: already packed, skipped`);
    continue;
  }
  const doc = await io.readBinary(new Uint8Array(raw));
  doc.setLogger(quiet);
  await doc.transform(
    reorder({ encoder: MeshoptEncoder, target: "size" }),
    quantize({ pattern: /^NORMAL$/, quantizeNormal: 10 }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const packed = gzipSync(await io.writeBinary(doc), { level: 9 });
  await writeFile(path, packed);
  const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";
  console.log(`${name}: ${mb(raw.length)} -> ${mb(packed.length)}`);
}
