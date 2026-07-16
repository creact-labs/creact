import type { Component, JSX } from "solid-js";

interface TextLinkProps {
  href: string;
  children: JSX.Element;
}

/** Inline link for copy */
const TextLink: Component<TextLinkProps> = (props) => {
  return <a href={props.href}>{props.children}</a>;
};

export default TextLink;
