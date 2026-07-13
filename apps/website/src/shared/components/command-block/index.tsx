import { type Component, createSignal, Show } from "solid-js";

interface CommandBlockProps {
  command: string;
  copyLabel: string;
  copiedLabel: string;
}

// A single shell command with a copy button — the home's primary call to
// action for starting a project.
const CommandBlock: Component<CommandBlockProps> = (props) => {
  const [copied, setCopied] = createSignal(false);
  const copy = async () => {
    await navigator.clipboard.writeText(props.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div class="command-block">
      <span class="command-prompt">$</span>
      <code class="command-text">{props.command}</code>
      <button class="command-copy" onClick={copy} aria-label={props.copyLabel}>
        <Show when={copied()} fallback={props.copyLabel}>
          {props.copiedLabel}
        </Show>
      </button>
    </div>
  );
};

export default CommandBlock;
