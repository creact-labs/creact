/**
 * Samples for the AWS Integration guide. AWS-SDK-shaped stand-ins keep the
 * components compiling without dependencies; in a real project:
 * `npm install @aws-sdk/client-s3 @aws-sdk/client-sts`.
 */
import {
  access,
  type CReactNode,
  createContext,
  createMemo,
  createSignal,
  For,
  type MaybeAccessor,
  Show,
  useAsyncOutput,
  useContext,
} from "@creact-labs/creact";
import { createHash } from "crypto";
import type { SiteConfig } from "./http-apis";

/** Stand-in for `@aws-sdk/client-s3` */
export class S3Client {
  constructor(_config: { region: string }) {}
}

/** Stand-ins for `@aws-sdk/client-sts` */
class GetCallerIdentityCommand {
  constructor(_input?: Record<string, never>) {}
}

class STSClient {
  constructor(_config: { region: string }) {}
  async send(_command: GetCallerIdentityCommand): Promise<{ Account?: string }> {
    return {};
  }
}

/** S3 operations used by the components; bodies elided in the samples */
async function createBucket(_s3: S3Client, _name: string): Promise<void> {}
async function tagBucket(
  _s3: S3Client,
  _name: string,
  _tags: Record<string, string>,
): Promise<void> {}
async function configureBucketAsWebsite(
  _s3: S3Client,
  _name: string,
): Promise<void> {}
async function makeBucketPublic(_s3: S3Client, _name: string): Promise<void> {}
async function emptyBucket(_s3: S3Client, _name: string): Promise<void> {}
async function deleteBucket(_s3: S3Client, _name: string): Promise<void> {}
async function uploadObject(
  _s3: S3Client,
  _bucket: string,
  _key: string,
  _content: string,
): Promise<void> {}
async function deleteObject(
  _s3: S3Client,
  _bucket: string,
  _key: string,
): Promise<void> {}

// #region provider
const AWSContext = createContext<{
  s3: S3Client;
  region: string;
  tags: Record<string, string>;
  accountId: string;
} | null>(null);

export function AWSProvider(props: { region?: string; children: CReactNode }) {
  const region = props.region ?? "us-east-1";
  const s3 = new S3Client({ region });
  const tags = { app: "my-app" };

  const aws = useAsyncOutput({ region }, async (p, setOutputs) => {
    const sts = new STSClient({ region: p.region });
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    setOutputs({ accountId: identity.Account });
  });

  return (
    <Show when={() => aws.accountId()}>
      {(accountId) => (
        <AWSContext.Provider value={{ s3, region, tags, accountId: accountId() }}>
          {props.children}
        </AWSContext.Provider>
      )}
    </Show>
  );
}

export function useS3() {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useS3 must be used inside <AWSProvider>");
  return ctx.s3;
}

export function useAWSTags() {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useAWSTags must be used inside <AWSProvider>");
  return ctx.tags;
}

export function useAWSRegion() {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useAWSRegion must be used inside <AWSProvider>");
  return ctx.region;
}

export function useAWSAccountId() {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useAWSAccountId must be used inside <AWSProvider>");
  return ctx.accountId;
}
// #endregion provider

// #region bucket
/** Did a previous run already create this bucket? */
function alreadyCreated(prev: { status?: string } | undefined): boolean {
  if (!prev) return false;
  return prev.status === "ready";
}

/** Apply the optional bucket features the props ask for */
async function applyBucketOptions(
  s3: S3Client,
  name: string,
  options: { tags?: Record<string, string>; website?: boolean },
): Promise<void> {
  if (options.tags) await tagBucket(s3, name, options.tags);
  if (options.website) {
    await configureBucketAsWebsite(s3, name);
    await makeBucketPublic(s3, name);
  }
}

export function Bucket(props: {
  s3: S3Client;
  name: MaybeAccessor<string>;
  tags?: Record<string, string>;
  website?: boolean;
  children?: CReactNode;
}) {
  const bucket = useAsyncOutput(
    () => ({ name: access(props.name), tags: props.tags, website: props.website }),
    async (asyncProps, setOutputs) => {
      let isCreated = false;
      setOutputs((prev) => {
        isCreated = alreadyCreated(prev);
        return isCreated ? prev : { status: "creating" };
      });
      if (isCreated) return;

      await createBucket(props.s3, asyncProps.name);
      await applyBucketOptions(props.s3, asyncProps.name, asyncProps);

      setOutputs({ status: "ready" });

      return async () => {
        await emptyBucket(props.s3, asyncProps.name);
        await deleteBucket(props.s3, asyncProps.name);
      };
    },
  );

  return (
    <Show when={() => bucket.status() === "ready"}>
      {props.children}
    </Show>
  );
}
// #endregion bucket

// #region s3-file
/** Did a previous run already upload exactly this content? */
function alreadyUploaded(
  prev: { status?: string; hash?: string } | undefined,
  hash: string,
): boolean {
  if (!prev) return false;
  if (prev.status !== "uploaded") return false;
  return prev.hash === hash;
}

export function S3File(props: {
  s3: S3Client;
  bucket: MaybeAccessor<string>;
  objectKey: string;
  content: MaybeAccessor<string>;
  onUploaded?: () => void;
}) {
  const contentHash = () =>
    createHash("md5").update(access(props.content)).digest("hex");

  const file = useAsyncOutput(
    () => ({ bucket: access(props.bucket), objectKey: props.objectKey, hash: contentHash() }),
    async (asyncProps, setOutputs) => {
      let isUploaded = false;
      setOutputs((prev) => {
        isUploaded = alreadyUploaded(prev, asyncProps.hash);
        return isUploaded ? prev : { status: "pending" };
      });
      if (isUploaded) return;

      await uploadObject(props.s3, asyncProps.bucket, asyncProps.objectKey, access(props.content));
      setOutputs({ status: "uploaded", hash: asyncProps.hash });

      return async () => {
        await deleteObject(props.s3, asyncProps.bucket, asyncProps.objectKey);
      };
    },
  );

  return <></>;
}
// #endregion s3-file

// #region website
export function WebSite(props: {
  name: MaybeAccessor<string>;
  content: MaybeAccessor<string>;
  onDeployed?: (url: string) => void;
}) {
  const s3 = useS3();
  const tags = useAWSTags();
  const region = useAWSRegion();
  const accountId = useAWSAccountId();

  const siteId = createMemo(() =>
    createHash("sha256").update(access(props.name)).digest("hex").slice(0, 8),
  );
  const bucketName = createMemo(() => `${accountId}-my-app-${siteId()}`);
  const url = createMemo(
    () => `http://${bucketName()}.s3-website-${region}.amazonaws.com`,
  );

  return (
    <Bucket key={siteId()} s3={s3} name={() => bucketName()} tags={tags} website>
      <S3File
        key="index.html"
        s3={s3}
        bucket={() => bucketName()}
        objectKey="index.html"
        content={() => access(props.content)}
        onUploaded={() => props.onDeployed?.(url())}
      />
    </Bucket>
  );
}
// #endregion website

// #region multiple-sites
function App() {
  const [sites, setSites] = createSignal<SiteConfig[]>([]);

  return (
    <AWSProvider region="us-east-1">
      <For each={() => sites()} keyFn={(s) => s.id}>
        {(site) => (
          <Show when={() => site().content}>
            {() => (
              <WebSite
                name={() => site().path}
                content={() => site().content}
                onDeployed={(url) => console.log(`Deployed: ${url}`)}
              />
            )}
          </Show>
        )}
      </For>
    </AWSProvider>
  );
}
// #endregion multiple-sites

export { App };
