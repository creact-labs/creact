# Providers

Providers are the execution engine. They make constructs real.

## The Interface

```tsx
interface Provider {
  materialize(nodes: InstanceNode[]): Promise<void>;
  destroy(node: InstanceNode): Promise<void>;
  on(event: 'outputsChanged', handler: Function): void;
  off(event: 'outputsChanged', handler: Function): void;
  stop(): void;
}
```

## materialize()

Create resources and set outputs:

```tsx
async materialize(nodes: InstanceNode[]): Promise<void> {
  for (const node of nodes) {
    switch (node.constructType) {
      case 'S3Bucket': {
        const bucket = await s3.createBucket({ Bucket: node.props.name });
        
        node.setOutputs({
          name: bucket.name,
          arn: bucket.arn,
          url: `https://${bucket.name}.s3.amazonaws.com`,
        });
        break;
      }
    }
  }
}
```

## setOutputs() Triggers Reactivity

When you call `node.setOutputs()`, CReact:
1. Updates the outputs
2. Re-renders dependent components
3. Creates new resources if needed

## Events for External Changes

Emit events when external things change:

```tsx
dynamodb.on('change', async (event) => {
  this.emit('outputsChanged', {
    resourceName: event.tableName,
    outputs: { items: await scanTable() },
  });
});
```
