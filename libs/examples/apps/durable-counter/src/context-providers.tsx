/**
 * Samples for the context-providers page. Each region is displayed by the
 * website; stub resource components keep every fragment compiling for real.
 */
function UsEastResources() {
  return <></>;
}

function EuResources() {
  return <></>;
}

// #region create-context
import { createContext, useContext } from "@creact-labs/creact";

const ConfigContext = createContext<{ region: string }>();

function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
// #endregion create-context

// #region provide
function App() {
  return (
    <ConfigContext.Provider value={{ region: "us-east-1" }}>
      <Infrastructure />
    </ConfigContext.Provider>
  );
}

function Infrastructure() {
  const config = useConfig();
  console.log(config.region); // 'us-east-1'
  return <></>;
}
// #endregion provide

// #region nested
<ConfigContext.Provider value={{ region: "us-east-1" }}>
  <UsEastResources />
  <ConfigContext.Provider value={{ region: "eu-west-1" }}>
    <EuResources />
  </ConfigContext.Provider>
</ConfigContext.Provider>;
// #endregion nested

export { App };
