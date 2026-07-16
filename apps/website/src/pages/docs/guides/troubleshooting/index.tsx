import { type Component, For } from "solid-js";
import { Trans, t, type TranslationKey } from "@/i18n";
import Code from "@/shared/components/code";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";
import TextLink from "@/shared/components/text-link";

type Parts = ReadonlyArray<Component<{ children: string }>>;

interface Gotcha {
  id: string;
  heading: TranslationKey;
  symptom: TranslationKey;
  symptomParts: Parts;
  cause: TranslationKey;
  causeParts: Parts;
  fix: TranslationKey;
  fixParts: Parts;
}

const K = "docs.guides.troubleshooting";

const GOTCHAS: Gotcha[] = [
  {
    id: "key",
    heading: `${K}.heading_key` as TranslationKey,
    symptom: `${K}.key_symptom` as TranslationKey,
    symptomParts: [],
    cause: `${K}.key_cause` as TranslationKey,
    causeParts: [Code, Code],
    fix: `${K}.key_fix` as TranslationKey,
    fixParts: [Code, Code],
  },
  {
    id: "one-output",
    heading: `${K}.heading_one_output` as TranslationKey,
    symptom: `${K}.one_output_symptom` as TranslationKey,
    symptomParts: [Code],
    cause: `${K}.one_output_cause` as TranslationKey,
    causeParts: [],
    fix: `${K}.one_output_fix` as TranslationKey,
    fixParts: [],
  },
  {
    id: "undefined",
    heading: `${K}.heading_undefined` as TranslationKey,
    symptom: `${K}.undefined_symptom` as TranslationKey,
    symptomParts: [Code, Code],
    cause: `${K}.undefined_cause` as TranslationKey,
    causeParts: [Code],
    fix: `${K}.undefined_fix` as TranslationKey,
    fixParts: [Code, Code],
  },
  {
    id: "idempotent",
    heading: `${K}.heading_idempotent` as TranslationKey,
    symptom: `${K}.idempotent_symptom` as TranslationKey,
    symptomParts: [],
    cause: `${K}.idempotent_cause` as TranslationKey,
    causeParts: [],
    fix: `${K}.idempotent_fix` as TranslationKey,
    fixParts: [Code],
  },
  {
    id: "store-order",
    heading: `${K}.heading_store_order` as TranslationKey,
    symptom: `${K}.store_order_symptom` as TranslationKey,
    symptomParts: [],
    cause: `${K}.store_order_cause` as TranslationKey,
    causeParts: [],
    fix: `${K}.store_order_fix` as TranslationKey,
    fixParts: [Code, Code],
  },
  {
    id: "async-effect",
    heading: `${K}.heading_async_effect` as TranslationKey,
    symptom: `${K}.async_effect_symptom` as TranslationKey,
    symptomParts: [Code],
    cause: `${K}.async_effect_cause` as TranslationKey,
    causeParts: [],
    fix: `${K}.async_effect_fix` as TranslationKey,
    fixParts: [],
  },
  {
    id: "props",
    heading: `${K}.heading_props` as TranslationKey,
    symptom: `${K}.props_symptom` as TranslationKey,
    symptomParts: [],
    cause: `${K}.props_cause` as TranslationKey,
    causeParts: [],
    fix: `${K}.props_fix` as TranslationKey,
    fixParts: [Code],
  },
  {
    id: "tsconfig",
    heading: `${K}.heading_tsconfig` as TranslationKey,
    symptom: `${K}.tsconfig_symptom` as TranslationKey,
    symptomParts: [],
    cause: `${K}.tsconfig_cause` as TranslationKey,
    causeParts: [],
    fix: `${K}.tsconfig_fix` as TranslationKey,
    fixParts: [Code, Code],
  },
];

const GotchaEntry: Component<{ gotcha: Gotcha }> = (props) => {
  return (
    <>
      <DocHeading level={2} id={props.gotcha.id}>
        {t(props.gotcha.heading)}
      </DocHeading>
      <p>
        <Strong>{t(`${K}.label_symptom` as TranslationKey)}</Strong>{" "}
        <Trans k={props.gotcha.symptom} components={props.gotcha.symptomParts} />
      </p>
      <p>
        <Strong>{t(`${K}.label_cause` as TranslationKey)}</Strong>{" "}
        <Trans k={props.gotcha.cause} components={props.gotcha.causeParts} />
      </p>
      <p>
        <Strong>{t(`${K}.label_fix` as TranslationKey)}</Strong>{" "}
        <Trans k={props.gotcha.fix} components={props.gotcha.fixParts} />
      </p>
    </>
  );
};

function Intro() {
  return (
    <>
      <h1>{t(`${K}.title` as TranslationKey)}</h1>
      <p class="docs-description">{t(`${K}.description` as TranslationKey)}</p>
    </>
  );
}

function More() {
  return (
    <>
      <DocHeading level={2} id="still-stuck">
        {t(`${K}.heading_more` as TranslationKey)}
      </DocHeading>
      <p>{t(`${K}.more_intro` as TranslationKey)}</p>
      <ul>
        <li>
          <TextLink href="#/docs/getting-started/why-creact">
            {t(`${K}.more_why` as TranslationKey)}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/runtime/use-async-output">
            {t(`${K}.more_useasyncoutput` as TranslationKey)}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/examples/durable-counter">
            {t(`${K}.more_playground` as TranslationKey)}
          </TextLink>
        </li>
      </ul>
    </>
  );
}

const Troubleshooting: Component = () => {
  return (
    <>
      <Intro />
      <For each={GOTCHAS}>{(gotcha) => <GotchaEntry gotcha={gotcha} />}</For>
      <More />
    </>
  );
};

export default Troubleshooting;
