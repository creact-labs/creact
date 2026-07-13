import type { TranslationKey } from "@/i18n";

export interface NavLink {
  /** Translation key of the page title — rendered through t() */
  title: TranslationKey;
  href: string;
}

export interface NavSubsection {
  /** Translation key of the group label */
  label: TranslationKey;
  links: NavLink[];
}

export interface NavSection {
  /** Translation key of the section title */
  title: TranslationKey;
  links?: NavLink[];
  subsections?: NavSubsection[];
}

export const sidebarNav: NavSection[] = [
  {
    title: "docs.nav.sections.getting_started",
    links: [
      { title: "docs.nav.pages.installation", href: "/docs/getting-started/installation" },
      { title: "docs.nav.pages.components_jsx", href: "/docs/getting-started/components-jsx" },
      { title: "docs.nav.pages.reactive_primitives", href: "/docs/getting-started/reactive-primitives" },
      { title: "docs.nav.pages.flow_control", href: "/docs/getting-started/flow-control" },
      { title: "docs.nav.pages.context_providers", href: "/docs/getting-started/context-providers" },
      { title: "docs.nav.pages.error_handling", href: "/docs/getting-started/error-handling" },
      { title: "docs.nav.pages.state_and_memory", href: "/docs/getting-started/state-and-memory" },
      { title: "docs.nav.pages.watch_mode", href: "/docs/guides/watch-mode" },
      { title: "docs.nav.pages.typescript", href: "/docs/guides/typescript" },
      { title: "docs.nav.pages.environment_variables", href: "/docs/guides/environment-variables" },
      { title: "docs.nav.pages.testing", href: "/docs/guides/testing" },
    ],
  },
  {
    title: "docs.nav.sections.architecture",
    links: [
      { title: "docs.nav.pages.reactive_system", href: "/docs/architecture/reactive-system" },
      { title: "docs.nav.pages.reconciliation", href: "/docs/architecture/reconciliation" },
      { title: "docs.nav.pages.fiber_model", href: "/docs/architecture/fiber-model" },
      { title: "docs.nav.pages.state_machine", href: "/docs/architecture/state-machine" },
      { title: "docs.nav.pages.memory_system", href: "/docs/architecture/memory-system" },
      { title: "docs.nav.pages.runtime_boundaries", href: "/docs/architecture/runtime-boundaries" },
    ],
  },
  {
    title: "docs.nav.sections.build_your_own",
    links: [
      { title: "docs.nav.pages.file_system", href: "/docs/guides/file-system" },
      { title: "docs.nav.pages.http_apis", href: "/docs/guides/http-apis" },
      { title: "docs.nav.pages.ai_integration", href: "/docs/guides/ai-integration" },
      { title: "docs.nav.pages.aws_integration", href: "/docs/guides/aws-integration" },
    ],
  },
  {
    title: "docs.nav.sections.api_reference",
    subsections: [
      {
        label: "docs.nav.groups.reactive",
        links: [
          { title: "docs.nav.pages.create_signal", href: "/docs/api/reactive/create-signal" },
          { title: "docs.nav.pages.create_effect", href: "/docs/api/reactive/create-effect" },
          { title: "docs.nav.pages.create_memo", href: "/docs/api/reactive/create-memo" },
          { title: "docs.nav.pages.create_computed", href: "/docs/api/reactive/create-computed" },
          { title: "docs.nav.pages.create_render_effect", href: "/docs/api/reactive/create-render-effect" },
          { title: "docs.nav.pages.create_reaction", href: "/docs/api/reactive/create-reaction" },
          { title: "docs.nav.pages.create_root", href: "/docs/api/reactive/create-root" },
          { title: "docs.nav.pages.create_selector", href: "/docs/api/reactive/create-selector" },
          { title: "docs.nav.pages.batch", href: "/docs/api/reactive/batch" },
          { title: "docs.nav.pages.untrack", href: "/docs/api/reactive/untrack" },
          { title: "docs.nav.pages.on", href: "/docs/api/reactive/on" },
        ],
      },
      {
        label: "docs.nav.groups.flow_components",
        links: [
          { title: "docs.nav.pages.show", href: "/docs/api/components/show" },
          { title: "docs.nav.pages.for", href: "/docs/api/components/for" },
          { title: "docs.nav.pages.switch_match", href: "/docs/api/components/switch-match" },
          { title: "docs.nav.pages.error_boundary", href: "/docs/api/components/error-boundary" },
        ],
      },
      {
        label: "docs.nav.groups.store",
        links: [
          { title: "docs.nav.pages.create_store", href: "/docs/api/store/create-store" },
          { title: "docs.nav.pages.unwrap", href: "/docs/api/store/unwrap" },
        ],
      },
      {
        label: "docs.nav.groups.runtime",
        links: [
          { title: "docs.nav.pages.render", href: "/docs/api/runtime/render" },
          { title: "docs.nav.pages.create_runtime", href: "/docs/api/runtime/create-runtime" },
          { title: "docs.nav.pages.use_async_output", href: "/docs/api/runtime/use-async-output" },
        ],
      },
      {
        label: "docs.nav.groups.context",
        links: [
          { title: "docs.nav.pages.create_context", href: "/docs/api/context/create-context" },
          { title: "docs.nav.pages.use_context", href: "/docs/api/context/use-context" },
        ],
      },
      {
        label: "docs.nav.groups.lifecycle",
        links: [
          { title: "docs.nav.pages.on_mount", href: "/docs/api/lifecycle/on-mount" },
          { title: "docs.nav.pages.on_cleanup", href: "/docs/api/lifecycle/on-cleanup" },
        ],
      },
      {
        label: "docs.nav.groups.props_children",
        links: [
          { title: "docs.nav.pages.merge_props", href: "/docs/api/props/merge-props" },
          { title: "docs.nav.pages.split_props", href: "/docs/api/props/split-props" },
          { title: "docs.nav.pages.children", href: "/docs/api/props/children" },
          { title: "docs.nav.pages.access", href: "/docs/api/props/access" },
        ],
      },
      {
        label: "docs.nav.groups.arrays",
        links: [
          { title: "docs.nav.pages.map_array", href: "/docs/api/arrays/map-array" },
          { title: "docs.nav.pages.index_array", href: "/docs/api/arrays/index-array" },
        ],
      },
      {
        label: "docs.nav.groups.owner",
        links: [
          { title: "docs.nav.pages.get_owner", href: "/docs/api/owner/get-owner" },
          { title: "docs.nav.pages.run_with_owner", href: "/docs/api/owner/run-with-owner" },
        ],
      },
      {
        label: "docs.nav.groups.configuration",
        links: [
          { title: "docs.nav.pages.tsconfig", href: "/docs/api/config/tsconfig" },
          { title: "docs.nav.pages.package_json", href: "/docs/api/config/package-json" },
        ],
      },
      {
        label: "docs.nav.groups.cli",
        links: [
          { title: "docs.nav.pages.creact_cli", href: "/docs/api/cli/creact" },
          { title: "docs.nav.pages.creact_watch", href: "/docs/api/cli/creact-watch" },
        ],
      },
    ],
  },
];
