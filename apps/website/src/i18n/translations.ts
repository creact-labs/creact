/**
 * i18n setup: translation resources live in resources/<locale>/, scoped by
 * domain — one JSON per feature area and one per docs page, mirroring the
 * app's structure. Keys may repeat across domains by design; there is no
 * shared "common" bundle. Code samples are resources too: they live in the
 * page JSONs (their inline comments are copy like any other).
 *
 * In tests this module is replaced by the mandatory key-passthrough mock in
 * src/testing/mocks.ts — tests assert on keys, never on copy.
 */
import { createSignal } from "solid-js";
import api_arrays_index_array from "./resources/en/docs/api/arrays/index_array.json";
import api_arrays_map_array from "./resources/en/docs/api/arrays/map_array.json";
import api_cli_creact_cli from "./resources/en/docs/api/cli/creact_cli.json";
import api_cli_creact_watch from "./resources/en/docs/api/cli/creact_watch.json";
import api_components_error_boundary from "./resources/en/docs/api/components/error_boundary.json";
import api_components_for from "./resources/en/docs/api/components/for.json";
import api_components_show from "./resources/en/docs/api/components/show.json";
import api_components_switch_match from "./resources/en/docs/api/components/switch_match.json";
import api_config_package_json from "./resources/en/docs/api/config/package_json.json";
import api_config_tsconfig from "./resources/en/docs/api/config/tsconfig.json";
import api_context_create_context from "./resources/en/docs/api/context/create_context.json";
import api_context_use_context from "./resources/en/docs/api/context/use_context.json";
import api_lifecycle_on_cleanup from "./resources/en/docs/api/lifecycle/on_cleanup.json";
import api_lifecycle_on_mount from "./resources/en/docs/api/lifecycle/on_mount.json";
import api_owner_get_owner from "./resources/en/docs/api/owner/get_owner.json";
import api_owner_run_with_owner from "./resources/en/docs/api/owner/run_with_owner.json";
import api_props_access from "./resources/en/docs/api/props/access.json";
import api_props_children from "./resources/en/docs/api/props/children.json";
import api_props_merge_props from "./resources/en/docs/api/props/merge_props.json";
import api_props_split_props from "./resources/en/docs/api/props/split_props.json";
import api_runtime_create_runtime from "./resources/en/docs/api/runtime/create_runtime.json";
import api_runtime_render from "./resources/en/docs/api/runtime/render.json";
import api_runtime_use_async_output from "./resources/en/docs/api/runtime/use_async_output.json";
import api_store_create_store from "./resources/en/docs/api/store/create_store.json";
import api_store_unwrap from "./resources/en/docs/api/store/unwrap.json";
import api_reactive_batch from "./resources/en/docs/api/reactive/batch.json";
import api_reactive_create_computed from "./resources/en/docs/api/reactive/create_computed.json";
import api_reactive_create_effect from "./resources/en/docs/api/reactive/create_effect.json";
import api_reactive_create_memo from "./resources/en/docs/api/reactive/create_memo.json";
import api_reactive_create_reaction from "./resources/en/docs/api/reactive/create_reaction.json";
import api_reactive_create_render_effect from "./resources/en/docs/api/reactive/create_render_effect.json";
import api_reactive_create_root from "./resources/en/docs/api/reactive/create_root.json";
import api_reactive_create_selector from "./resources/en/docs/api/reactive/create_selector.json";
import api_reactive_create_signal from "./resources/en/docs/api/reactive/create_signal.json";
import api_reactive_on from "./resources/en/docs/api/reactive/on.json";
import api_reactive_untrack from "./resources/en/docs/api/reactive/untrack.json";
import architecture_fiber_model from "./resources/en/docs/architecture/fiber_model.json";
import architecture_memory_system from "./resources/en/docs/architecture/memory_system.json";
import architecture_reactive_system from "./resources/en/docs/architecture/reactive_system.json";
import architecture_reconciliation from "./resources/en/docs/architecture/reconciliation.json";
import architecture_runtime_boundaries from "./resources/en/docs/architecture/runtime_boundaries.json";
import architecture_state_machine from "./resources/en/docs/architecture/state_machine.json";
import getting_started_components_jsx from "./resources/en/docs/getting_started/components_jsx.json";
import getting_started_context_providers from "./resources/en/docs/getting_started/context_providers.json";
import getting_started_deploying from "./resources/en/docs/getting_started/deploying.json";
import getting_started_error_handling from "./resources/en/docs/getting_started/error_handling.json";
import getting_started_flow_control from "./resources/en/docs/getting_started/flow_control.json";
import getting_started_installation from "./resources/en/docs/getting_started/installation.json";
import getting_started_reactive_primitives from "./resources/en/docs/getting_started/reactive_primitives.json";
import getting_started_state_and_memory from "./resources/en/docs/getting_started/state_and_memory.json";
import guides_ai_integration from "./resources/en/docs/guides/ai_integration.json";
import guides_aws_integration from "./resources/en/docs/guides/aws_integration.json";
import guides_environment_variables from "./resources/en/docs/guides/environment_variables.json";
import guides_file_system from "./resources/en/docs/guides/file_system.json";
import guides_http_apis from "./resources/en/docs/guides/http_apis.json";
import guides_testing from "./resources/en/docs/guides/testing.json";
import guides_typescript from "./resources/en/docs/guides/typescript.json";
import guides_watch_mode from "./resources/en/docs/guides/watch_mode.json";
import docs_layout from "./resources/en/docs/layout.json";
import docs_nav from "./resources/en/docs/nav.json";
import docs_ui from "./resources/en/docs/ui.json";
import landing from "./resources/en/landing.json";

const en = {
  landing,
  docs: {
    layout: docs_layout,
    nav: docs_nav,
    ui: docs_ui,
    api: {
      reactive: {
        create_signal: api_reactive_create_signal,
        create_effect: api_reactive_create_effect,
        create_memo: api_reactive_create_memo,
        create_computed: api_reactive_create_computed,
        create_render_effect: api_reactive_create_render_effect,
        create_reaction: api_reactive_create_reaction,
        create_root: api_reactive_create_root,
        create_selector: api_reactive_create_selector,
        batch: api_reactive_batch,
        untrack: api_reactive_untrack,
        on: api_reactive_on,
      },
      components: {
        show: api_components_show,
        for: api_components_for,
        switch_match: api_components_switch_match,
        error_boundary: api_components_error_boundary,
      },
      store: {
        create_store: api_store_create_store,
        unwrap: api_store_unwrap,
      },
      runtime: {
        render: api_runtime_render,
        create_runtime: api_runtime_create_runtime,
        use_async_output: api_runtime_use_async_output,
      },
      context: {
        create_context: api_context_create_context,
        use_context: api_context_use_context,
      },
      lifecycle: {
        on_mount: api_lifecycle_on_mount,
        on_cleanup: api_lifecycle_on_cleanup,
      },
      props: {
        merge_props: api_props_merge_props,
        split_props: api_props_split_props,
        children: api_props_children,
        access: api_props_access,
      },
      arrays: {
        map_array: api_arrays_map_array,
        index_array: api_arrays_index_array,
      },
      owner: {
        get_owner: api_owner_get_owner,
        run_with_owner: api_owner_run_with_owner,
      },
      config: {
        tsconfig: api_config_tsconfig,
        package_json: api_config_package_json,
      },
      cli: {
        creact_cli: api_cli_creact_cli,
        creact_watch: api_cli_creact_watch,
      },
    },
    getting_started: {
      installation: getting_started_installation,
      components_jsx: getting_started_components_jsx,
      reactive_primitives: getting_started_reactive_primitives,
      flow_control: getting_started_flow_control,
      context_providers: getting_started_context_providers,
      error_handling: getting_started_error_handling,
      state_and_memory: getting_started_state_and_memory,
      deploying: getting_started_deploying,
    },
    guides: {
      ai_integration: guides_ai_integration,
      aws_integration: guides_aws_integration,
      environment_variables: guides_environment_variables,
      file_system: guides_file_system,
      http_apis: guides_http_apis,
      testing: guides_testing,
      typescript: guides_typescript,
      watch_mode: guides_watch_mode,
    },
    architecture: {
      fiber_model: architecture_fiber_model,
      memory_system: architecture_memory_system,
      reactive_system: architecture_reactive_system,
      reconciliation: architecture_reconciliation,
      runtime_boundaries: architecture_runtime_boundaries,
      state_machine: architecture_state_machine,
    },
  },
};

export type Locale = "en";
type Resources = typeof en;

/** Dot-joined path to every string leaf of the resource tree */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TranslationKey = Leaves<Resources>;

/** The full resource tree per locale — exported for completeness tests */
export const resources: Record<Locale, Resources> = { en };

const [locale, setLocale] = createSignal<Locale>("en");
export { locale, setLocale };

/**
 * Resolve a translation key for the current locale. Reads the locale signal,
 * so translated text re-renders reactively when the locale changes.
 * Unresolvable keys fall back to the key itself.
 */
export function t(key: TranslationKey): string {
  let node: unknown = resources[locale()];
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}
