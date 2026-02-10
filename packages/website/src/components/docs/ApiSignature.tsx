import type { Component } from "solid-js";
import DocCodeBlock from "./DocCodeBlock";

interface ApiSignatureProps {
  name: string;
  signature: string;
}

const ApiSignature: Component<ApiSignatureProps> = (props) => {
  return (
    <DocCodeBlock
      code={props.signature}
      lang="typescript"
      filename={props.name}
    />
  );
};

export default ApiSignature;
