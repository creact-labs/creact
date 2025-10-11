
NOTE: !!! THIS IS A EXPERIMENT OF THOUGHT NOT A PRODUCTION READY PRODUCT !!!

# CReact 


Write your cloud architecture in JSX

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

## Watch It Work


## Installation & Usage

```bash
# Deploy your infrastructure
creact deploy --entry my-app.tsx

# Development mode with hot reload
creact dev --entry my-app.tsx --auto-approve

# Preview changes
creact plan --entry my-app.tsx
```

