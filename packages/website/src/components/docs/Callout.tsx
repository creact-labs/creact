import type { Component, JSX } from "solid-js";

interface CalloutProps {
  type: "info" | "warning" | "tip";
  children: JSX.Element;
}

const labels: Record<string, string> = {
  info: "Note",
  warning: "Warning",
  tip: "Good to know",
};

const Callout: Component<CalloutProps> = (props) => {
  return (
    <div class={`callout ${props.type}`}>
      <div class="callout-title">{labels[props.type]}</div>
      {props.children}
    </div>
  );
};

export default Callout;
