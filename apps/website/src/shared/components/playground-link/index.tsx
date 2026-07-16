import type { Component } from "solid-js";
import { t } from "@/i18n";

// A call-to-action in the docs that opens an example in the full playground
// (a browser-native VS Code-style IDE — editor, terminal, live output).
const PlaygroundLink: Component<{ app: string }> = (props) => {
  return (
    <a class="playground-link" href={`#/playground/${props.app}`}>
      <span class="playground-link-icon">▶</span>
      <span class="playground-link-text">
        <strong>{t("docs.ui.open_playground")}</strong>
        <span class="playground-link-sub">{t("docs.ui.open_playground_sub")}</span>
      </span>
      <span class="playground-link-arrow">→</span>
    </a>
  );
};

export default PlaygroundLink;
