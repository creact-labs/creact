import type { Component, JSX } from "solid-js";
import { t } from "@/i18n";

interface CalloutProps {
  type: "info" | "warning" | "tip";
  children: JSX.Element;
}

const Callout: Component<CalloutProps> = (props) => {
  return (
    <div class={`callout ${props.type}`}>
      <div class="callout-title">{t(`docs.callout.${props.type}`)}</div>
      {props.children}
    </div>
  );
};

export default Callout;
