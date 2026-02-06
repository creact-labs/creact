import type { Component } from "solid-js";

interface CodeBlockProps {
  filename: string;
  code: string;
}

const CodeBlock: Component<CodeBlockProps> = (props) => {
  return (
    <div class="code-box">
      <div class="code-header">
        <span class="code-dot"></span>
        <span class="code-dot"></span>
        <span class="code-dot"></span>
        <span class="code-filename">{props.filename}</span>
      </div>
      <pre class="code-content" innerHTML={props.code} />
    </div>
  );
};

export default CodeBlock;
