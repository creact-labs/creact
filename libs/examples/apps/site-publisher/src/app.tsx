// #region require-env
import { createEffect, For } from "@creact-labs/creact";
import { AwsProvider } from "./aws/provider";
import { SiteBucket } from "./aws/site-bucket";
import { SiteObject } from "./aws/site-object";
import { createManifestStore } from "./shared/manifest";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value) return value;
  throw new Error(
    `Missing environment variable ${name}. Copy .env.example to .env and fill in your AWS settings.`,
  );
}

const awsRegion = requireEnv("AWS_REGION");
const siteBucketName = requireEnv("SITE_BUCKET");
requireEnv("AWS_ACCESS_KEY_ID");
requireEnv("AWS_SECRET_ACCESS_KEY");
const siteDir = "./site";
// #endregion require-env

// #region manifest-store
export function App() {
  const [site] = createManifestStore(siteDir);
  createEffect(() => {
    console.log(`publishing ${site.files.length} files from ${siteDir}`);
  });
  // #endregion manifest-store
  // #region tree
  return (
    <AwsProvider region={awsRegion}>
      <SiteBucket key="site" name={siteBucketName}>
        <For each={() => site.files} keyFn={(file) => file.path}>
          {(file) => (
            <SiteObject
              bucket={siteBucketName}
              sourceDir={siteDir}
              entry={file}
            />
          )}
        </For>
      </SiteBucket>
    </AwsProvider>
  );
}
// #endregion tree
