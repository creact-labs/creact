
NOTE: !!! THIS IS A EXPERIMENT OF THOUGHT NOT A PRODUCTION READY PRODUCT !!!

## CReact - a Universal Reactive Runtime for Declaritive Systems

![creact](https://i.postimg.cc/8P66GnT3/banner.jpg)

```tsx
function ProductionDeployment() {
  const [healthScore, setHealthScore] = useState(100);
  const [errorRate, setErrorRate] = useState(0);
  const [deploymentStatus, setDeploymentStatus] = useState('stable');
  
  return (
    <>
      <HealthMonitor 
        onHealthChange={setHealthScore}
        onErrorRateChange={setErrorRate}
        onStatusChange={setDeploymentStatus}
      />
      
      {/* Automatic rollback if deployment goes bad */}
      {errorRate > 5 && deploymentStatus === 'deploying' && (
        <AutomaticRollback 
          strategy="blue-green"
          preserveLogs={true}
          alertSlack="#devops-alerts"
        />
      )}
      
      {/* Scale up during deployments for zero downtime */}
      {deploymentStatus === 'deploying' && (
        <DeploymentScaling>
          <ExtraCapacity factor={1.5} />
          <LoadBalancer strategy="gradual-shift" />
          <DatabaseMigration mode="zero-downtime" />
        </DeploymentScaling>
      )}
      
      {/* Auto-scaling based on real metrics */}
      <AutoScaler 
        minInstances={2}
        maxInstances={healthScore < 80 ? 10 : 5}
        scaleOnCPU={70}
        scaleOnMemory={80}
        scaleOnErrorRate={2}
      />
    </>
  );
}
```


### What it is

- Universal reactive runtime for declarative systems

### What its not

- Terraform/pulumi/cdk replacement
- Crossplane replacement 
- React wrapper

### Getting started

Clone [Blank App Template](https://github.com/creact-labs/creact-blank-app-template)  

Run

```bash
npm run dev
```

### Demos

[Multi env local landing page](https://github.com/creact-labs/creact-app-demo-multi-env-web-server)


### Installation & Usage

```bash
# Deploy your infrastructure
creact deploy --entry my-app.tsx

# Development mode with hot reload
creact dev --entry my-app.tsx --auto-approve

# Preview changes
creact plan --entry my-app.tsx
```

### Reference

- **Functional Reactive Programming (FRP):** Elliott & Hudak, 1997  
- **Autonomic Computing / MAPE-K:** Kephart & Chess, IBM 2003  
- **Model-Driven Synchronization:** Diskin et al., ICMT 2011  
- **Self-Adaptive Systems:** Brun et al., SEAMS 2009  
