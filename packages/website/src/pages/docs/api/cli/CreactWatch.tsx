import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import Callout from "../../../../components/docs/Callout";

const CreactWatch: Component = () => {
  return (
    <>
      <h1>creact --watch</h1>
      <p class="docs-description">Run CReact in watch mode. Automatically restarts when source files change.</p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock lang="bash" code={`creact --watch <entry-file>`} filename="Terminal" />

      <DocHeading level={2} id="behavior">Behavior</DocHeading>
      <ol>
        <li>Type checks and runs your entry file</li>
        <li>Watches <code>.ts</code>, <code>.tsx</code>, <code>.js</code>, and <code>.jsx</code> files for changes</li>
        <li>On file change: stops the current run (executes cleanups), re-type-checks, and restarts</li>
        <li>State persists between restarts via the Memory interface</li>
        <li>Press <code>Ctrl+C</code> to stop</li>
      </ol>

      <DocHeading level={2} id="output">Output</DocHeading>
      <DocCodeBlock lang="bash" code={`$ creact --watch index.tsx

 ╭──────────────────────╮
 │    CReact v0.3.0     │
 ╰──────────────────────╯

 ✓ Type check passed (3 files, 120ms)
 ▶ App started
 ◎ Watching for changes...

 ⟳ File changed: src/app.tsx
 ⟳ Restarting...
 ✓ Type check passed (3 files, 95ms)
 ▶ App started`} filename="Terminal" />

      <Callout type="tip">
        <p>
          State persists across restarts. Edit your component tree
          without losing deployed state.
        </p>
      </Callout>
    </>
  );
};

export default CreactWatch;
