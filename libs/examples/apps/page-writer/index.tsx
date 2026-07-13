// #region entry-point
import { render } from "@creact-labs/creact";
import { FileMemory } from "@creact-labs/example-file-memory";
import { App } from "./src/app";

export default async function () {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "page-writer needs ANTHROPIC_API_KEY to call Claude.\n" +
        "Grab a key from https://platform.claude.com, then run:\n" +
        "  ANTHROPIC_API_KEY=sk-ant-... npm start",
    );
    process.exit(1);
  }
  const memory = new FileMemory("./.state");
  return render(() => <App key="root" />, memory, "page-writer");
}
// #endregion entry-point
