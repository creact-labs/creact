import type { Component, JSX } from "solid-js";

interface CodeProps {
  children: JSX.Element;
}

/** Inline code span — styled by the surrounding article stylesheet */
const Code: Component<CodeProps> = (props) => {
  return <code>{props.children}</code>;
};

export default Code;
