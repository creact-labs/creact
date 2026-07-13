import type { Component } from "solid-js";

const repo = "https://github.com/creact-labs/creact";

// Shows the released version behind the live site, linking to its GitHub
// Release, with the deploy commit alongside — enough to identify and roll
// back any deployment.
const VersionBadge: Component = () => {
  return (
    <span class="version-badge">
      <a
        href={`${repo}/releases/tag/v${__APP_VERSION__}`}
        target="_blank"
        rel="noopener"
      >
        v{__APP_VERSION__}
      </a>
      <span class="version-commit">
        <a href={`${repo}/commit/${__APP_COMMIT__}`} target="_blank" rel="noopener">
          {__APP_COMMIT__}
        </a>
      </span>
    </span>
  );
};

export default VersionBadge;
