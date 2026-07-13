/**
 * Guides tour: a full CReact app whose src modules hold every code sample
 * shown on the docs guides pages. Run it with `creact index.tsx`; CI
 * typechecks it, so no published sample can drift from the library.
 */
import { render, useAsyncOutput } from "@creact-labs/creact";
import { perEnvironmentConfig } from "./src/environment-variables";
import { FileMemory } from "./src/file-system";

function Tour() {
  useAsyncOutput({}, async (_props, setOutputs) => {
    setOutputs({ config: perEnvironmentConfig() });
  });
  return <></>;
}

export default async function () {
  return render(
    () => <Tour key="tour" />,
    new FileMemory("./.state"),
    "integrations",
  );
}
