import type { Component } from "solid-js";
import { type TranslationKey, t } from "@/i18n";

interface RichTextProps {
  /** Translation key whose value may contain inline markup (code, em, a) */
  k: TranslationKey;
}

/**
 * Localized rich text: renders a resource value that carries inline HTML.
 * Resource files are first-party content, so innerHTML is safe here — this
 * is the single sanctioned place where copy becomes markup.
 */
const RichText: Component<RichTextProps> = (props) => {
  return <span innerHTML={t(props.k)} />;
};

export default RichText;
