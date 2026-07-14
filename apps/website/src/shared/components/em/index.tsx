import type { Component, JSX } from "solid-js";

interface EmProps {
  children: JSX.Element;
}

/** Italic emphasis for inline copy */
const Em: Component<EmProps> = (props) => {
  return <em>{props.children}</em>;
};

export default Em;
