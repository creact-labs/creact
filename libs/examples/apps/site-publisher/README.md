# site-publisher

Publishes the local `./site` folder to an S3 bucket as a public static
website using the real AWS SDK. On first run it creates the bucket,
disables the public access block, attaches a public-read policy, enables
static website hosting, uploads every file, and prints the site URL.

On every later run it hashes each file with md5 and uploads only the files
whose content changed since the last run. Change a file in `./site`, run
again, and watch only that file re-upload.

## Requirements

- Real AWS credentials with permission to create and configure S3 buckets.
- A globally unique bucket name.

## Setup

Copy the env template and fill it in:

```bash
cp .env.example .env
```

| Variable                | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `AWS_REGION`            | Region the bucket lives in, e.g. `us-east-1`  |
| `AWS_ACCESS_KEY_ID`     | Access key of an IAM user with S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | Matching secret key                           |
| `SITE_BUCKET`           | Globally unique bucket name for the site      |

The app fails fast with a clear error if any of these are missing.

## Run

```bash
npx creact index.tsx
```

Expected output on first run:

```
publishing 3 files from ./site
uploaded about.html
uploaded index.html
uploaded styles.css
site available at http://<SITE_BUCKET>.s3-website-<AWS_REGION>.amazonaws.com
```

Run it again without changing anything and no files upload — the md5
manifest matches the persisted state in `./.state`.

## Cost warning

This app creates real AWS resources. S3 storage and requests for a site
this small cost fractions of a cent, but the bucket is public and you pay
for whatever traffic it serves. Do not point it at a bucket name you care
about.

## Cleanup

Delete every object, the bucket, and the local state:

```bash
aws s3 rb s3://$SITE_BUCKET --force
rm -rf ./.state
```

## Tests

From `libs/examples`:

```bash
npx vitest --run apps/site-publisher
```
