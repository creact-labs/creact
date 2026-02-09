import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const AwsIntegration: Component = () => {
  return (
    <>
      <h1>AWS Integration</h1>
      <p class="docs-description">
        Build S3 bucket, file upload, and website deployment components using the AWS SDK.
      </p>

      <DocHeading level={2} id="aws-provider">AWS Provider</DocHeading>
      <p>
        Wrap AWS clients in a context provider. Child components access the S3 client, region,
        and account ID via hooks. The provider fetches the account ID with <code>useAsyncOutput</code>
        and waits for it with <code>Show</code> before rendering children.
      </p>
      <DocCodeBlock code={`import { createContext, useContext, useAsyncOutput, Show, type CReactNode } from '@creact-labs/creact';
import { S3Client } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const AWSContext = createContext<{
  s3: S3Client;
  region: string;
  tags: Record<string, string>;
  accountId: string;
} | null>(null);

export function AWSProvider(props: { region?: string; children: CReactNode }) {
  const region = props.region ?? 'us-east-1';
  const s3 = new S3Client({ region });
  const tags = { app: 'my-app' };

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
  if (!ctx) throw new Error('useS3 must be used inside <AWSProvider>');
  return ctx.s3;
}

export function useAWSRegion() {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error('useAWSRegion must be used inside <AWSProvider>');
  return ctx.region;
}

export function useAWSAccountId() {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error('useAWSAccountId must be used inside <AWSProvider>');
  return ctx.accountId;
}`} filename="providers/aws-provider.tsx" />

      <DocHeading level={2} id="bucket-component">Bucket Component</DocHeading>
      <p>
        The <code>Bucket</code> component creates an S3 bucket with <code>useAsyncOutput</code>.
        It checks saved outputs to skip creation on restart. The cleanup handler empties
        and deletes the bucket when the component is removed from the tree.
        Children render only after the bucket is ready.
      </p>
      <DocCodeBlock code={`import { useAsyncOutput, createEffect, createSignal, untrack, Show, access, type CReactNode, type MaybeAccessor } from '@creact-labs/creact';
import type { S3Client } from '@aws-sdk/client-s3';

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
      setOutputs(prev => {
        isCreated = prev?.status === 'ready';
        return isCreated ? prev : { status: 'creating' };
      });
      if (isCreated) return;

      await createBucket(props.s3, asyncProps.name);

      if (asyncProps.tags) await tagBucket(props.s3, asyncProps.name, asyncProps.tags);
      if (asyncProps.website) {
        await configureBucketAsWebsite(props.s3, asyncProps.name);
        await makeBucketPublic(props.s3, asyncProps.name);
      }

      setOutputs({ status: 'ready' });

      return async () => {
        await emptyBucket(props.s3, asyncProps.name);
        await deleteBucket(props.s3, asyncProps.name);
      };
    },
  );

  return (
    <Show when={() => bucket.status() === 'ready'}>
      {props.children}
    </Show>
  );
}`} filename="components/bucket.tsx" />

      <DocHeading level={2} id="s3-file">S3 File Upload</DocHeading>
      <p>
        The <code>S3File</code> component uploads content to S3. It hashes the content
        and compares against saved state to skip uploads when nothing changed.
      </p>
      <DocCodeBlock code={`import { useAsyncOutput, access, type MaybeAccessor } from '@creact-labs/creact';
import { createHash } from 'crypto';

export function S3File(props: {
  s3: S3Client;
  bucket: MaybeAccessor<string>;
  objectKey: string;
  content: MaybeAccessor<string>;
  onUploaded?: () => void;
}) {
  const contentHash = () => createHash('md5').update(access(props.content)).digest('hex');

  const file = useAsyncOutput(
    () => ({ bucket: access(props.bucket), objectKey: props.objectKey, hash: contentHash() }),
    async (asyncProps, setOutputs) => {
      let isUploaded = false;
      setOutputs(prev => {
        isUploaded = prev?.status === 'uploaded' && prev?.hash === asyncProps.hash;
        return isUploaded ? prev : { status: 'pending' };
      });
      if (isUploaded) return;

      await uploadObject(props.s3, asyncProps.bucket, asyncProps.objectKey, access(props.content));
      setOutputs({ status: 'uploaded', hash: asyncProps.hash });

      return async () => {
        await deleteObject(props.s3, asyncProps.bucket, asyncProps.objectKey);
      };
    },
  );

  return <></>;
}`} filename="shared/s3-file.tsx" />

      <DocHeading level={2} id="website-component">Composing a WebSite</DocHeading>
      <p>
        <code>WebSite</code> composes <code>Bucket</code> and <code>S3File</code>. The bucket
        creates and configures itself, then <code>S3File</code> uploads content as a child.
      </p>
      <DocCodeBlock code={`import { createMemo, access, type MaybeAccessor } from '@creact-labs/creact';
import { createHash } from 'crypto';

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
    createHash('sha256').update(access(props.name)).digest('hex').slice(0, 8)
  );
  const bucketName = createMemo(() => \`\${accountId}-my-app-\${siteId()}\`);
  const url = createMemo(() =>
    \`http://\${bucketName()}.s3-website-\${region}.amazonaws.com\`
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
}`} filename="components/website.tsx" />

      <DocHeading level={2} id="multiple-resources">Deploying Multiple Sites</DocHeading>
      <DocCodeBlock code={`import { For, Show, createSignal } from '@creact-labs/creact';

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
                onDeployed={(url) => console.log(\`Deployed: \${url}\`)}
              />
            )}
          </Show>
        )}
      </For>
    </AWSProvider>
  );
}`} filename="app.tsx" />

      <Callout type="warning">
        <p>
          Implement cleanup handlers for AWS resources. Without cleanup, removing a
          component from the tree won't delete the underlying resource.
        </p>
      </Callout>
    </>
  );
};

export default AwsIntegration;
