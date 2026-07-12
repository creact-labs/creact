import type { Component, JSXElement } from "solid-js";
import { For } from "solid-js";

interface DocStep {
  /** Bold lead-in label, rendered as "label:" */
  label: string;
  /** Explanation following the label */
  body: JSXElement;
}

interface DocStepsProps {
  steps: DocStep[];
}

/**
 * Ordered step list with bold lead-ins — the shape used by the
 * architecture pages to describe pipelines and phases.
 */
const DocSteps: Component<DocStepsProps> = (props) => {
  return (
    <ol>
      <For each={props.steps}>
        {(step) => (
          <li>
            <strong>{step.label}:</strong> {step.body}
          </li>
        )}
      </For>
    </ol>
  );
};

export default DocSteps;
