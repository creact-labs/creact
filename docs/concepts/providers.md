# Providers

Providers execute constructs.

## The Interface

```tsx
/**
 * Event emitted when provider detects output changes
 */
interface OutputChangeEvent {
  resourceName: string;
  outputs: Record<string, any>;
  timestamp: number;
}

interface Provider {
  /** Initialize provider (async setup) */
  initialize?(): Promise<void>;

  /** Materialize nodes into cloud resources */
  materialize(nodes: InstanceNode[]): Promise<void>;

  /** Destroy a node */
  destroy(node: InstanceNode): Promise<void>;

  /** Lifecycle hooks */
  preDeploy?(nodes: InstanceNode[]): Promise<void>;
  postDeploy?(nodes: InstanceNode[], outputs: Record<string, any>): Promise<void>;
  onError?(error: Error, nodes: InstanceNode[]): Promise<void>;

  /** Event system (required for continuous runtime) */
  on(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void): void;
  off(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void): void;
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
    timestamp: Date.now(),
  });
});
```
