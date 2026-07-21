#!/usr/bin/env bash
# Build, validate, and — unless DRY_RUN — publish every publishable workspace
# package, reconciling npm + git tag + GitHub Release independently per package.
#
# This one script backs BOTH the PR quality gate (DRY_RUN=true — build + validate
# only) and the release (DRY_RUN=false — also publish/tag/release), so the two can
# never drift: whatever a release does to a package is exactly what every PR runs.
# Building "as published" (isolated, per package, --ignore-scripts) is what makes
# a package that cannot build on its own fail the PR instead of the release.
set -euo pipefail

DRY_RUN="${DRY_RUN:-true}"
REPO_URL="https://github.com/${GITHUB_REPOSITORY}.git"

# Publishable = a non-private workspace package that declares a name, version, and
# a build script. Derived from package.json via the discovery collector, so a new
# package is covered automatically and private example apps are never published.
mapfile -t PACKAGES < <(node --input-type=module -e "
  import { collectPackages, WORKSPACE_ROOTS } from './.github/scripts/discover-jobs.mjs';
  for (const { dir, pkg } of collectPackages(WORKSPACE_ROOTS).values()) {
    if (pkg.private || !pkg.name || !pkg.version || !pkg.scripts?.build) continue;
    console.log(dir);
  }
")

if [ ${#PACKAGES[@]} -eq 0 ]; then
  echo "::error::No publishable packages discovered — refusing to pass silently."
  exit 1
fi
echo "Publishable packages: ${PACKAGES[*]}"

# Wipe every package's build output so each package below builds in ISOLATION —
# no sibling's prior dist may satisfy its dependencies. A package that cannot
# build itself (e.g. missing a `tsc -b` project reference to a dep) then fails
# here regardless of build order, instead of only at release time when that dep
# is skipped because it is already published.
clean_builds() {
  for d in "${PACKAGES[@]}"; do
    rm -rf "$d/dist" "$d/tsconfig.tsbuildinfo"
  done
}

for dir in "${PACKAGES[@]}"; do
  NAME=$(node -p "require('./$dir/package.json').name")
  VERSION=$(node -p "require('./$dir/package.json').version")
  TAG="${NAME}@${VERSION}"
  echo "::group::${TAG}"

  # Build exactly as it will be published, in isolation. Self-sufficient: a
  # package that compiles against another package's dist declares it as a
  # project reference, so `npm run build` (tsc -b) builds that dependency first.
  # --ignore-scripts matches publish (no prepublishOnly re-running the suite).
  clean_builds
  npm run build -w "$NAME" --ignore-scripts

  # Validate the publishable artifact's packaging — tarball contents, exports
  # map, types, files. publint packs the package itself, so it needs no registry
  # access and works even when this version is already on npm (npm publish
  # --dry-run does not: it still errors on an already-published version).
  npx --yes publint "$dir"

  if [ "$DRY_RUN" = "true" ]; then
    echo "dryRun: built and validated ${TAG}; skipping publish/tag/release."
    echo "::endgroup::"
    continue
  fi

  # Reconcile the three release artifacts independently and idempotently, keyed
  # only on this package's own name+version.
  # 1) npm — publish only if this exact version is not already there.
  if npm view "${NAME}@${VERSION}" version > /dev/null 2>&1; then
    echo "${TAG} already on npm — skipping publish."
  else
    npm publish -w "$NAME" --provenance --access public --ignore-scripts
    echo "Published ${TAG} to npm."
  fi

  # 2) git tag — create at this commit if the ref is absent. Read the remote
  # anonymously so scoped `@`/`/` names need no URL encoding; create via the
  # refs API (the ref is a request-body field, not part of the URL path).
  if [ -n "$(git ls-remote --tags "$REPO_URL" "refs/tags/${TAG}")" ]; then
    echo "Tag ${TAG} already exists — skipping."
  else
    gh api "repos/${GITHUB_REPOSITORY}/git/refs" \
      -f ref="refs/tags/${TAG}" -f sha="${GITHUB_SHA}" > /dev/null
    echo "Created tag ${TAG}."
  fi

  # 3) GitHub Release — cut from the tag if none exists yet.
  if gh release view "${TAG}" > /dev/null 2>&1; then
    echo "Release ${TAG} already exists — skipping."
  else
    gh release create "${TAG}" --title "${TAG}" --generate-notes
    echo "Created release ${TAG}."
  fi
  echo "::endgroup::"
done
