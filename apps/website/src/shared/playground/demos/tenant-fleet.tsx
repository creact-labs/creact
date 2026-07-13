import { render, createRuntime, useAsyncOutput } from "@creact-labs/creact";
import { inspect, InspectMemory } from "./inspector.mjs";

function TenantApp(props: { region: string; order: number }) {
  useAsyncOutput(
    () => ({ region: props.region }),
    async (p, setOutputs) => {
      await new Promise((r) => setTimeout(r, 600 + props.order * 700));
      setOutputs({ region: p.region, ready: true });
    },
  );
  return <></>;
}

const Tenant = createRuntime(TenantApp);

export default async function () {
  const result = render(
    () => (
      <>
        <Tenant key="us-east-1" region="us-east-1" order={0} />
        <Tenant key="eu-west-1" region="eu-west-1" order={1} />
        <Tenant key="ap-south-1" region="ap-south-1" order={2} />
      </>
    ),
    new InspectMemory(),
    "tenant-fleet",
  );
  inspect(result);
  return result;
}
