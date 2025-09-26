#!/usr/bin/env bash
set -euo pipefail

echo "==> Bootstrapping Escambo Infrastructure..."

npx cdktf deploy --auto-approve

echo "==> All infrastructure bootstrapped successfully."
