// #region object-imports
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { PutObjectCommand } from "@creact-labs/example-mock-s3";
import {
  access,
  unwrap,
  useAsyncOutput,
  type MaybeAccessor,
} from "@creact-labs/creact";
import type { ManifestEntry } from "../../shared/manifest";
import { useAws } from "../provider";
// #endregion object-imports

// #region content-type
const contentTypes: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function contentTypeFor(path: string): string {
  return contentTypes[extname(path)] ?? "application/octet-stream";
}
// #endregion content-type

// #region object-props
export interface SiteObjectProps {
  bucket: MaybeAccessor<string>;
  sourceDir: string;
  entry: MaybeAccessor<ManifestEntry>;
}

export function SiteObject(props: SiteObjectProps) {
  const aws = useAws();
  useAsyncOutput<{ path: string; hash: string }>(
    () => ({
      bucket: access(props.bucket),
      dir: props.sourceDir,
      entry: unwrap(access(props.entry)),
    }),
    // #endregion object-props
    // #region changed-check
    async (objectProps, setOutputs) => {
      let published = false;
      setOutputs((prev) => {
        published = prev?.hash === objectProps.entry.hash;
        return prev ?? {};
      });
      if (published) return;
      // #endregion changed-check
      // #region upload
      const body = await readFile(
        join(objectProps.dir, objectProps.entry.path),
      );
      await aws.client.send(
        new PutObjectCommand({
          Bucket: objectProps.bucket,
          Key: objectProps.entry.path,
          Body: body,
          ContentType: contentTypeFor(objectProps.entry.path),
        }),
      );
      setOutputs({
        path: objectProps.entry.path,
        hash: objectProps.entry.hash,
      });
      console.log(`uploaded ${objectProps.entry.path}`);
    },
  );
  return <></>;
}
// #endregion upload
