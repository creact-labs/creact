import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unwrap } from "@creact-labs/creact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildManifest, createManifestStore } from "../index";

describe("buildManifest", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "site-publisher-"));
    writeFileSync(join(dir, "index.html"), "<h1>Fern & Filament</h1>");
    writeFileSync(join(dir, "about.html"), "<h1>About</h1>");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "styles.css"), "body { margin: 0; }");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("walks nested folders and lists files sorted by path", () => {
    const manifest = buildManifest(dir);

    expect(manifest.files.map((file) => file.path)).toEqual([
      "about.html",
      "assets/styles.css",
      "index.html",
    ]);
  });

  it("hashes each file's content with md5", () => {
    const manifest = buildManifest(dir);

    const index = manifest.files.find((file) => file.path === "index.html");
    expect(index?.hash).toBe(
      createHash("md5").update("<h1>Fern & Filament</h1>").digest("hex"),
    );
  });

  it("changes the hash when a file's content changes", () => {
    const before = buildManifest(dir);
    writeFileSync(join(dir, "index.html"), "<h1>New drop</h1>");
    const after = buildManifest(dir);

    const hashOf = (manifest: typeof before, path: string) =>
      manifest.files.find((file) => file.path === path)?.hash;
    expect(hashOf(after, "index.html")).not.toBe(hashOf(before, "index.html"));
    expect(hashOf(after, "about.html")).toBe(hashOf(before, "about.html"));
  });

  it("records each file's size in bytes", () => {
    const manifest = buildManifest(dir);

    const css = manifest.files.find(
      (file) => file.path === "assets/styles.css",
    );
    expect(css?.size).toBe(Buffer.byteLength("body { margin: 0; }"));
  });
});

describe("createManifestStore", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "site-publisher-store-"));
    writeFileSync(join(dir, "index.html"), "<h1>Fern & Filament</h1>");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("unwraps to the same raw manifest buildManifest produces", () => {
    const [store] = createManifestStore(dir);

    expect(unwrap(store)).toEqual(buildManifest(dir));
  });

  it("updates entries through the store setter", () => {
    const [store, setStore] = createManifestStore(dir);

    setStore("files", 0, "hash", "republished");

    expect(store.files[0].hash).toBe("republished");
  });
});
