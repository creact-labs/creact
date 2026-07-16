import type { Component, JSX } from "solid-js";

interface StrongProps {
  children: JSX.Element;
}

/** Strong emphasis for inline copy */
const Strong: Component<StrongProps> = (props) => {
  return <strong>{props.children}</strong>;
};

export default Strong;
