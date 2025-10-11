
NOTE: !!! THIS IS A EXPERIMENT OF THOUGHT NOT A PRODUCTION READY PRODUCT !!!

# CReact 

![creact](https://i.postimg.cc/8P66GnT3/banner.jpg)

```tsx
function App() {
  return (
    <VPC name="prod-vpc">
      <Database name="users-db">
        <API name="users-api">
          <Monitoring />
        </API>
      </Database>
    </VPC>
  );
}
```

## Demos

Multi env Landing page -> https://github.com/creact-labs/creact-app-demo-multi-env-web-server

## Installation & Usage

```bash
# Deploy your infrastructure
creact deploy --entry my-app.tsx

# Development mode with hot reload
creact dev --entry my-app.tsx --auto-approve

# Preview changes
creact plan --entry my-app.tsx
```

