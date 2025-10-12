
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
## What its not

- terraform/pulumi/cdk replacement
- crossplane replacement 
- react wrapper

## Getting started

Clone [Blank App Template](https://github.com/creact-labs/creact-blank-app-template)  

Run

```bash
npm run dev
```

## Demos

[Multi env local landing page](https://github.com/creact-labs/creact-app-demo-multi-env-web-server)


## Installation & Usage

```bash
# Deploy your infrastructure
creact deploy --entry my-app.tsx

# Development mode with hot reload
creact dev --entry my-app.tsx --auto-approve

# Preview changes
creact plan --entry my-app.tsx
```

# Related Work

CReact’s model relates to several prior paradigms:

- **Functional Reactive Programming (FRP):** Elliott & Hudak, 1997  
- **Autonomic Computing / MAPE-K:** Kephart & Chess, IBM 2003  
- **Model-Driven Synchronization:** Diskin et al., ICMT 2011  
- **Self-Adaptive Systems:** Brun et al., SEAMS 2009  
