/**
 * Hero example: an AI-driven site generator fleet — the app shown on the
 * landing page. A full CReact app (run it with `creact index.tsx`); it
 * typechecks against the library, so the website's hero sample can't rot.
 */
import { render } from "@creact-labs/creact";
import { App } from "./src/app";
import { createMemory } from "./src/shared/memory";

export default async function () {
  return render(() => <App />, createMemory(), "hero-fleet");
}
