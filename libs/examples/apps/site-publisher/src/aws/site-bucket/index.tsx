// #region bucket-imports
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutBucketWebsiteCommand,
  PutPublicAccessBlockCommand,
  type BucketLocationConstraint,
} from "@aws-sdk/client-s3";
import {
  createEffect,
  mergeProps,
  splitProps,
  useAsyncOutput,
  type CReactNode,
} from "@creact-labs/creact";
import { useAws } from "../provider";
// #endregion bucket-imports

// #region bucket-props
export interface SiteBucketProps {
  name: string;
  indexDocument?: string;
  errorDocument?: string;
  children?: CReactNode;
}
// #endregion bucket-props

// #region defaults
export function SiteBucket(rawProps: SiteBucketProps) {
  const props = mergeProps(
    { indexDocument: "index.html", errorDocument: "index.html" },
    rawProps,
  );
  const [site, rest] = splitProps(props, [
    "name",
    "indexDocument",
    "errorDocument",
  ]);
  const aws = useAws();
  // #endregion defaults
  // #region ensure-bucket
  const bucket = useAsyncOutput<{ bucket: string; url: string }>(
    {
      bucket: site.name,
      indexDocument: site.indexDocument,
      errorDocument: site.errorDocument,
    },
    async (bucketProps, setOutputs) => {
      try {
        await aws.client.send(
          new CreateBucketCommand({
            Bucket: bucketProps.bucket,
            ...bucketLocation(aws.region),
          }),
        );
      } catch (error) {
        if (!(error instanceof BucketAlreadyOwnedByYou)) throw error;
      }
      // #endregion ensure-bucket
      // #region public-access
      await aws.client.send(
        new PutPublicAccessBlockCommand({
          Bucket: bucketProps.bucket,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            IgnorePublicAcls: false,
            BlockPublicPolicy: false,
            RestrictPublicBuckets: false,
          },
        }),
      );
      await aws.client.send(
        new PutBucketPolicyCommand({
          Bucket: bucketProps.bucket,
          Policy: publicReadPolicy(bucketProps.bucket),
        }),
      );
      // #endregion public-access
      // #region website-config
      await aws.client.send(
        new PutBucketWebsiteCommand({
          Bucket: bucketProps.bucket,
          WebsiteConfiguration: {
            IndexDocument: { Suffix: bucketProps.indexDocument },
            ErrorDocument: { Key: bucketProps.errorDocument },
          },
        }),
      );
      setOutputs({
        bucket: bucketProps.bucket,
        url: `http://${bucketProps.bucket}.s3-website-${aws.region}.amazonaws.com`,
      });
    },
  );
  // #endregion website-config
  // #region site-url
  createEffect(() => {
    const url = bucket.url();
    if (url) console.log(`site available at ${url}`);
  });

  return <>{rest.children}</>;
}
// #endregion site-url

// #region bucket-location
function bucketLocation(region: string) {
  return region === "us-east-1"
    ? {}
    : {
        CreateBucketConfiguration: {
          LocationConstraint: region as BucketLocationConstraint,
        },
      };
}
// #endregion bucket-location

// #region public-read-policy
function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
    ],
  });
}
// #endregion public-read-policy
