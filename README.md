
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

## Example Applications

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

```tsx
function TemporalBusinessApp() {
  const [timeOfDay, setTimeOfDay] = useState(getCurrentHour());
  const [dayOfWeek, setDayOfWeek] = useState(getCurrentDay());
  const [marketHours, setMarketHours] = useState(false);
  const [seasonality, setSeasonality] = useState(getCurrentSeason());
  
  return (
    <>
      <TimeAwareScheduler 
        onTimeChange={setTimeOfDay}
        onMarketStatusChange={setMarketHours}
        onSeasonChange={setSeasonality}
      />
      
      {/* Business hours = high performance */}
      {timeOfDay >= 9 && timeOfDay <= 17 && dayOfWeek !== 'weekend' ? (
        <BusinessHoursInfrastructure>
          <TradingEngine performance="maximum" />
          <CustomerSupport agents={50} />
          <RealtimeAnalytics enabled={true} />
          <BackupServices disabled={true} /> {/* No maintenance during business */}
        </BusinessHoursInfrastructure>
      ) : (
        <OffHoursOptimization>
          <TradingEngine performance="minimal" />
          <MaintenanceWindow>
            <DatabaseOptimization />
            <SecurityScanning />
            <BackupOperations />
            <ModelRetraining />
          </MaintenanceWindow>
        </OffHoursOptimization>
      )}
      
      {/* Market hours = trading infrastructure */}
      {marketHours && (
        <TradingInfrastructure>
          <HighFrequencyTrading latency="microsecond" />
          <MarketDataFeeds sources="all-exchanges" />
          <RiskManagement realtime={true} />
        </TradingInfrastructure>
      )}
      
      {/* Holiday season = e-commerce scaling */}
      {seasonality === 'holiday-season' && (
        <HolidayScaling>
          <InventoryManagement mode="aggressive-stocking" />
          <PaymentProcessing capacity="10x" />
          <FraudDetection sensitivity="maximum" />
          <CustomerService staff="holiday-surge" />
        </HolidayScaling>
      )}
    </>
  );
}
```


```tsx
function OpportunisticAIPlatform() {
  const [spotPrices, setSpotPrices] = useState({});
  const [workloadQueue, setWorkloadQueue] = useState([]);
  const [globalCapacity, setGlobalCapacity] = useState({});
  
  return (
    <>
      <CloudMarketScanner 
        providers={["aws", "gcp", "azure", "digital-ocean"]}
        onPriceUpdate={setSpotPrices}
        onCapacityUpdate={setGlobalCapacity}
      />
      
      <WorkloadOrchestrator 
        queue={workloadQueue}
        onNewJob={(job) => setWorkloadQueue(q => [...q, job])}
      />
      
      {/* AI training that chases the cheapest compute globally */}
      {workloadQueue.map(job => (
        <AITrainingJob 
          key={job.id}
          job={job}
          provider={findCheapestProvider(spotPrices, job.requirements)}
          onComplete={(result) => {
            // Automatically deploys model to edge locations
          }}
        />
      ))}
      
      {/* Opportunistic batch processing */}
      {spotPrices.aws?.gpu < 0.50 && (
        <BatchProcessor 
          provider="aws"
          instanceType="p3.8xlarge"
          maxSpend={100}
          onPriceIncrease="migrate-to-cheaper"
        />
      )}
      
      {/* Global model serving that follows the sun */}
      <GlobalModelServing 
        models={completedModels}
        strategy="lowest-latency"
        failover="multi-cloud"
      />
    </>
  );
}
```

## What it is

- Universal reactive runtime for declarative systems

## What its not

- Terraform/pulumi/cdk replacement
- Crossplane replacement 
- React wrapper

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

# Reference

- **Functional Reactive Programming (FRP):** Elliott & Hudak, 1997  
- **Autonomic Computing / MAPE-K:** Kephart & Chess, IBM 2003  
- **Model-Driven Synchronization:** Diskin et al., ICMT 2011  
- **Self-Adaptive Systems:** Brun et al., SEAMS 2009  
