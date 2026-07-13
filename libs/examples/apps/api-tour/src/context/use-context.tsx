/**
 * Samples for the useContext API page. Each region is displayed by the
 * website; wrapping code keeps every fragment compiling for real.
 */
import { createContext, useContext } from "@creact-labs/creact";

const ConfigContext = createContext({ region: "us-east-1" });

export function readConfig() {
  // #region hero
  const config = useContext(ConfigContext);
  // #endregion hero
  return config;
}

// #region usage
function Infrastructure() {
  const config = useContext(ConfigContext);
  console.log(config.region); // 'us-east-1'
  return <></>;
}
// #endregion usage

export { Infrastructure };
