# Chapter 2: Hello World

In this chapter, we'll deploy a "Hello World" website to AWS S3. This builds on Chapter 1 by introducing context providers, conditional rendering, and real cloud resources.

---

## Prerequisites

You'll need:

- An AWS account with credentials configured (`aws configure`)
- The project from Chapter 1

Install the AWS SDK:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/client-sts @aws-sdk/client-resource-groups-tagging-api
```

---

## Step 1: AWS Utilities

First, let's create the low-level AWS functions.

Create `src/aws/identity.ts`:

```tsx
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export async function getAccountId(region: string): Promise<string> {
  const sts = new STSClient({ region });
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  if (!identity.Account) {
    throw new Error("Failed to get AWS account ID");
  }
  return identity.Account;
}
```

Create `src/aws/bucket.ts`:

```tsx
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  PutBucketWebsiteCommand,
  PutBucketPolicyCommand,
  PutBucketTaggingCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";

export async function createBucket(
  s3: S3Client,
  bucketName: string,
): Promise<void> {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
  } catch (err: any) {
    // Idempotent: only ignore if we already own the bucket
    // BucketAlreadyExists means someone else owns it - must fail
    if (err.name === "BucketAlreadyOwnedByYou") {
      return;
    }
    throw err;
  }
}

export async function deleteBucket(
  s3: S3Client,
  bucketName: string,
): Promise<void> {
  await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

export async function tagBucket(
  s3: S3Client,
  bucketName: string,
  tags: Record<string, string>,
): Promise<void> {
  await s3.send(
    new PutBucketTaggingCommand({
      Bucket: bucketName,
      Tagging: {
        TagSet: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      },
    }),
  );
}

export async function configureBucketAsWebsite(
  s3: S3Client,
  bucketName: string,
): Promise<void> {
  await s3.send(
    new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: "index.html" },
      },
    }),
  );
}

export async function makeBucketPublic(
  s3: S3Client,
  bucketName: string,
): Promise<void> {
  // Disable S3 Block Public Access first
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }),
  );

  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      }),
    }),
  );
}

export function getWebsiteUrl(bucketName: string, region: string): string {
  return `http://${bucketName}.s3-website-${region}.amazonaws.com`;
}
```

Create `src/aws/object.ts`:

```tsx
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export async function uploadObject(
  s3: S3Client,
  bucketName: string,
  key: string,
  body: string,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(
  s3: S3Client,
  bucketName: string,
  key: string,
): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}

export async function listObjects(
  s3: S3Client,
  bucketName: string,
): Promise<string[]> {
  const response = await s3.send(
    new ListObjectsV2Command({ Bucket: bucketName }),
  );
  return (response.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
}

export async function emptyBucket(
  s3: S3Client,
  bucketName: string,
): Promise<void> {
  const keys = await listObjects(s3, bucketName);
  for (const key of keys) {
    await deleteObject(s3, bucketName, key);
  }
}
```

Create `src/aws/cleanup.ts`:

```tsx
import { S3Client } from "@aws-sdk/client-s3";
import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand,
} from "@aws-sdk/client-resource-groups-tagging-api";

import { deleteBucket } from "./bucket";
import { emptyBucket } from "./object";

export async function findBucketsByTags(
  region: string,
  tags: Record<string, string>,
): Promise<string[]> {
  const tagging = new ResourceGroupsTaggingAPIClient({ region });

  const resources = await tagging.send(
    new GetResourcesCommand({
      TagFilters: Object.entries(tags).map(([Key, Value]) => ({
        Key,
        Values: [Value],
      })),
      ResourceTypeFilters: ["s3:bucket"],
    }),
  );

  return (resources.ResourceTagMappingList ?? [])
    .map((r) => r.ResourceARN?.split(":::")[1])
    .filter((name): name is string => Boolean(name));
}

export async function cleanupBuckets(
  s3: S3Client,
  region: string,
  tags: Record<string, string>,
): Promise<string[]> {
  const buckets = await findBucketsByTags(region, tags);

  for (const bucketName of buckets) {
    console.log(`Deleting bucket: ${bucketName}`);
    await emptyBucket(s3, bucketName);
    await deleteBucket(s3, bucketName);
  }

  return buckets;
}
```

Create `src/aws/index.ts`:

```tsx
export * from "./bucket";
export * from "./object";
export * from "./cleanup";
export * from "./identity";
```

---

## Step 2: The AWS Provider

Now we create a CReact component that provides AWS configuration to its children. This uses `createContext` to share the S3 client and account ID.

Create `src/components/aws.tsx`:

```tsx
import {
  createContext,
  useContext,
  useAsyncOutput,
  createEffect,
  Show,
  type CReactNode,
} from "@creact-labs/creact";
import { S3Client } from "@aws-sdk/client-s3";

import { STACK_NAME } from "../../index";
import { cleanupBuckets, getAccountId } from "../aws";

type Tags = Record<string, string>;

const AWSContext = createContext<{
  s3: S3Client;
  region: string;
  tags: Tags;
  accountId: string;
} | null>(null);

interface AWSProps {
  region?: string;
  children: CReactNode;
}

const SHOULD_CLEANUP = process.env.SHOULD_CLEANUP === "true";

export function AWS(props: AWSProps) {
  const region = props.region ?? "us-east-1";
  const s3 = new S3Client({ region });

  const tags: Tags = {
    app: STACK_NAME,
  };

  // Fetch account ID dynamically
  const aws = useAsyncOutput({ region }, async (props, setOutputs) => {
    const accountId = await getAccountId(props.region);
    setOutputs({ accountId });
  });

  return (
    <Show when={() => aws.accountId()}>
      {(accountId) => (
        <AWSContext.Provider
          value={{ s3, region, tags, accountId: accountId() }}
        >
          <Show when={!SHOULD_CLEANUP} fallback={<Cleanup key="cleanup" />}>
            {props.children}
          </Show>
        </AWSContext.Provider>
      )}
    </Show>
  );
}

export function useS3(): S3Client {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useS3 must be used inside <AWS>");
  return ctx.s3;
}

export function useAWSTags(): Tags {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useAWSTags must be used inside <AWS>");
  return ctx.tags;
}

export function useAWSRegion(): string {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useAWSRegion must be used inside <AWS>");
  return ctx.region;
}

export function useAWSAccountId(): string {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error("useAWSAccountId must be used inside <AWS>");
  return ctx.accountId;
}

function Cleanup() {
  const s3 = useS3();
  const region = useAWSRegion();
  const tags = useAWSTags();

  const cleanup = useAsyncOutput(
    { region, tags },
    async (props, setOutputs) => {
      // Skip if already complete
      let isComplete = false;
      setOutputs((prev) => {
        isComplete = prev?.status === "complete";
        return isComplete ? prev : { status: "pending" };
      });
      if (isComplete) return;

      setOutputs({ status: "finding_resources" });

      const deleted = await cleanupBuckets(s3, props.region, props.tags);

      setOutputs({ status: "complete", deleted });
    },
  );

  createEffect(() => {
    const status = cleanup.status() ?? "pending";
    const deleted = cleanup.deleted() as string[] | undefined;

    if (status === "complete") {
      if (deleted && deleted.length > 0) {
        console.log(`Cleanup complete. Deleted: ${deleted.join(", ")}`);
      } else {
        console.log("Cleanup complete. Nothing to delete.");
      }
    } else if (status !== "pending") {
      console.log(`Cleanup status: ${status}`);
    }
  });

  return <></>;
}
```

Notice how `<Show when={() => aws.accountId()}>` waits for the account ID before rendering children. The `when` prop takes an accessor function that CReact tracks reactively.

---

## Step 3: The Website Component

Now the fun part—a component that deploys a website. Notice that the async output handlers in CReact need to be idempotent

Create `src/components/website.tsx`:

```tsx
import { useAsyncOutput, createEffect } from "@creact-labs/creact";

import { useS3, useAWSTags, useAWSRegion, useAWSAccountId } from "./aws";
import { STACK_NAME } from "../../index";
import {
  createBucket,
  deleteBucket,
  tagBucket,
  configureBucketAsWebsite,
  makeBucketPublic,
  getWebsiteUrl,
  uploadObject,
  deleteObject,
} from "../aws";

interface WebSiteProps {
  content: string;
}

export function WebSite(props: WebSiteProps) {
  const s3 = useS3();
  const tags = useAWSTags();
  const region = useAWSRegion();
  const accountId = useAWSAccountId();

  // S3 bucket names are globally unique—prefix with account ID
  const bucketName = `${accountId}-${STACK_NAME}-website`;

  const website = useAsyncOutput(
    { tags, region, bucketName, content: props.content },
    async (props, setOutputs) => {
      // Skip if already deployed
      let isDeployed = false;
      setOutputs((prev) => {
        isDeployed = prev?.status === "deployed";
        return isDeployed ? prev : { status: "not_deployed" };
      });
      if (isDeployed) return;

      setOutputs({ status: "creating_bucket" });
      await createBucket(s3, props.bucketName);
      await tagBucket(s3, props.bucketName, props.tags);
      await configureBucketAsWebsite(s3, props.bucketName);
      await makeBucketPublic(s3, props.bucketName);

      setOutputs({ status: "uploading" });
      await uploadObject(
        s3,
        props.bucketName,
        "index.html",
        props.content,
        "text/html",
      );

      const url = getWebsiteUrl(props.bucketName, props.region);
      setOutputs({ status: "deployed", url, bucketName: props.bucketName });

      // Cleanup function—runs when component is removed
      return async () => {
        console.log(`Destroying: ${props.bucketName}`);
        await deleteObject(s3, props.bucketName, "index.html");
        await deleteBucket(s3, props.bucketName);
        console.log(`Destroyed: ${props.bucketName}`);
      };
    },
  );

  createEffect(() => {
    const status = website.status();
    if (!status) return; // Don't log initial undefined state

    const url = website.url();
    if (status === "deployed" && url) {
      console.log(`Website deployed: ${url}`);
    } else {
      console.log(`Website status: ${status}`);
    }
  });

  return <></>;
}
```

---

## Step 4: The Read Component

Let's add a component that reads files from disk.

Create `src/components/read.tsx`:

```tsx
import { useAsyncOutput, Show, type CReactNode } from "@creact-labs/creact";
import { readFileSync } from "fs";
import { join } from "path";

interface ReadProps {
  path: string;
  file: string;
  children: (content: string) => CReactNode;
}

export function Read(props: ReadProps) {
  const read = useAsyncOutput(
    { path: props.path, file: props.file },
    async (props, setOutputs) => {
      const content = readFileSync(join(props.path, props.file), "utf-8");
      setOutputs({ content });
    },
  );

  return (
    <Show when={() => read.content()}>
      {(content) => props.children(content())}
    </Show>
  );
}
```

This component:

- Reads a file and stores its content as output
- Uses render props (`children` as a function) to pass content to children
- Uses `<Show>` to wait until content is available

---

## Step 5: Wire It Up

Update `index.tsx` to export the stack name:

```tsx
import { render } from "@creact-labs/creact";
import { FileMemory } from "./src/memory";
import { App } from "./src/app";

export const STACK_NAME = "my-app";

export default async function () {
  const memory = new FileMemory("./.state");
  return render(() => <App />, memory, STACK_NAME);
}
```

Create `resources/my-frontend/index.html`:

```html
<div>hello world</div>
```

Update `src/app.tsx`:

```tsx
import { AWS } from "./components/aws";
import { Read } from "./components/read";
import { WebSite } from "./components/website";

export function App() {
  return (
    <AWS key="aws" region="us-east-1">
      <Read key="read" path="./resources/my-frontend" file="index.html">
        {(content) => <WebSite key="website" content={content} />}
      </Read>
    </AWS>
  );
}
```

---

## See It In Action

Run your app:

```bash
npm run dev
```

You'll see:

```
Website status: not_deployed
Website status: creating_bucket
Website status: uploading
Website deployed: http://xxx-my-app-website.s3-website-us-east-1.amazonaws.com
```

Open that URL in your browser—your website is live!

---

## Persistence in Action

Stop the app with Ctrl+C. Run it again:

```bash
npm run dev
```

Notice it says "deployed" immediately—CReact restored the state from memory. The handler still runs, but `createBucket` is idempotent so nothing breaks.

---

## Cleaning Up Resources

To delete all resources created by your app, run with `SHOULD_CLEANUP=true`:

```bash
SHOULD_CLEANUP=true npm run dev
```

You'll see:

```
Cleanup status: finding_resources
Deleting bucket: xxx-my-app-website
Cleanup complete. Deleted: xxx-my-app-website
```

The cleanup uses AWS Resource Groups Tagging API to find all buckets tagged with your app name, then deletes them.

---

## Project Structure

Your project now looks like this:

```
my-app/
├── index.tsx
├── src/
│   ├── memory.ts
│   ├── app.tsx
│   ├── components/
│   │   ├── aws.tsx
│   │   ├── read.tsx
│   │   └── website.tsx
│   └── aws/
│       ├── index.ts
│       ├── identity.ts
│       ├── bucket.ts
│       ├── object.ts
│       └── cleanup.ts
├── resources/
│   └── my-frontend/
│       └── index.html
├── package.json
└── tsconfig.json
```

---

## What Just Happened?

You built an app that:

1. **Provisions real infrastructure** — S3 buckets, website configuration, public access
2. **Uses context providers** — `<AWS>` shares configuration with children
3. **Waits for dependencies** — `<Show>` holds rendering until content is ready
4. **Composes components** — Read passes content to WebSite via render props
5. **Cleans up on removal** — the cleanup function deletes resources

---

The HTML is hardcoded for now. [Chapter 3](./03-ai-powered-website.md) adds Claude to generate it from prompts.
