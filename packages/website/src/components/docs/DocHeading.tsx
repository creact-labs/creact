import { onMount, type Component, type JSX } from "solid-js";
import { useToc } from "../../contexts/TocContext";

interface DocHeadingProps {
  level: 2 | 3;
  id: string;
  children: JSX.Element;
}

const DocHeading: Component<DocHeadingProps> = (props) => {
  const { registerHeading } = useToc();

  onMount(() => {
    const text = typeof props.children === "string"
      ? props.children
      : props.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    registerHeading({ id: props.id, text, level: props.level });
  });

  const Tag = () => {
    const attrs = {
      id: props.id,
      class: "doc-heading",
    };

    const inner = (
      <>
        <a href={`#${props.id}`} class="doc-heading-anchor" aria-hidden="true">#</a>
        {props.children}
      </>
    );

    return props.level === 2
      ? <h2 {...attrs}>{inner}</h2>
      : <h3 {...attrs}>{inner}</h3>;
  };

  return <Tag />;
};

export default DocHeading;
