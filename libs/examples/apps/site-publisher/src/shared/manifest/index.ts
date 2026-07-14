// #region manifest-shape
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createStore, type SetStoreFunction } from "@creact-labs/creact";

export interface ManifestEntry {
  path: string;
  hash: string;
  size: number;
}

export interface Manifest {
  files: ManifestEntry[];
}
// #endregion manifest-shape

// #region walk
export function buildManifest(dir: string): Manifest {
  const files = collectFiles(dir, dir);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files };
}

function collectFiles(root: string, dir: string): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    if (statSync(fullPath).isDirectory()) {
      entries.push(...collectFiles(root, fullPath));
    } else {
      entries.push(hashFile(root, fullPath));
    }
  }
  return entries;
}
// #endregion walk

// #region hashing
function hashFile(root: string, filePath: string): ManifestEntry {
  const body = readFileSync(filePath);
  return {
    path: relative(root, filePath).replaceAll("\\", "/"),
    hash: createHash("md5").update(body).digest("hex"),
    size: body.byteLength,
  };
}
// #endregion hashing

// #region manifest-store
export function createManifestStore(
  dir: string,
): [Manifest, SetStoreFunction<Manifest>] {
  return createStore(buildManifest(dir));
}
// #endregion manifest-store
