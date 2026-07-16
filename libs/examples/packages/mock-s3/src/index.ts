// A small in-memory stand-in for @aws-sdk/client-s3, used by the site-publisher
// example so it runs anywhere with no AWS account or credentials. Every call is
// logged and nothing leaves the machine — it is deliberately a mock, not a real
// client. Swap the import for "@aws-sdk/client-s3" to deploy to real S3.

/** Region string accepted by CreateBucketConfiguration (mirrors the real type). */
export type BucketLocationConstraint = string;

class S3Command {
  constructor(public readonly input: Record<string, unknown>) {}
}

export class CreateBucketCommand extends S3Command {}
export class PutBucketPolicyCommand extends S3Command {}
export class PutBucketWebsiteCommand extends S3Command {}
export class PutPublicAccessBlockCommand extends S3Command {}
export class PutObjectCommand extends S3Command {}

/** Thrown by the real client when a bucket already exists for you; the mock
 * never throws it, so bucket creation always succeeds. */
export class BucketAlreadyOwnedByYou extends Error {
  override readonly name = "BucketAlreadyOwnedByYou";
}

export class S3Client {
  constructor(private readonly config: { region: string }) {}

  async send(command: S3Command): Promise<Record<string, never>> {
    const action = command.constructor.name.replace(/Command$/, "");
    const target = command.input.Key ?? command.input.Bucket ?? "";
    console.log(`[mock S3] ${action} ${String(target)}`.trimEnd());
    return {};
  }

  destroy(): void {}
}
