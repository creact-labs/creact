/**
 * Samples for the createContext API page. Each region is displayed by the
 * website; wrapping code keeps every fragment compiling for real.
 */
import { createContext, useContext } from "@creact-labs/creact";

// #region hero
const ThemeContext = createContext<"light" | "dark">("dark");
// #endregion hero

// #region usage
const ConfigContext = createContext<{ region: string }>();

function App() {
  return (
    <ConfigContext.Provider value={{ region: "us-east-1" }}>
      <Infrastructure />
    </ConfigContext.Provider>
  );
}
// #endregion usage

function Infrastructure() {
  const config = useContext(ConfigContext);
  console.log(config?.region);
  return <></>;
}

export { App, ThemeContext };
