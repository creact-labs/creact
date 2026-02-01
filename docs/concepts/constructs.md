# Constructs

Constructs are building blocks.

## What is a Construct?

A construct is a class with props (input) and outputs (result).

```tsx
interface S3BucketProps {
  name: string;
}

interface S3BucketOutputs {
  name: string;
  arn: string;
  url: string;
}

class S3Bucket {
  constructor(public props: S3BucketProps) {}
}
```

The construct itself does nothing. The provider interprets it and makes it real.

## Using Constructs

Constructs are used via `useInstance` inside components:

```tsx
function Bucket({ name, children }) {
  const outputs = useInstance(S3Bucket, { name });
  return children(outputs);
}

// Usage
<Bucket name="my-bucket">
  {(bucket) => (
    // bucket.name(), bucket.arn(), bucket.url() are available
    <Object bucket={bucket.name()} key="index.html" />
  )}
</Bucket>
```

## Creating Constructs

1. Define the props interface (inputs)
2. Define the outputs interface (results)
3. Create the class

```tsx
interface MyServiceProps {
  name: string;
  config?: Record<string, any>;
}

interface MyServiceOutputs {
  id: string;
  endpoint: string;
}

class MyService {
  constructor(public props: MyServiceProps) {}
}
```

Then implement the provider logic to handle it. See [Providers](./providers.md).
