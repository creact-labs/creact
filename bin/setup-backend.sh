#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="$(dirname "$0")/../config"

if [ ! -d "$CONFIG_DIR" ]; then
  echo "[ERROR] Config directory not found: $CONFIG_DIR"
  exit 1
fi

echo "Setting up Terraform backends for all environments in $CONFIG_DIR"
echo

for config_file in "$CONFIG_DIR"/*.json; do
  env_name=$(basename "$config_file" .json)
  echo "------------------------------------------------------------"
  echo "Environment:   $env_name"
  echo "Config file:   $config_file"

  rg_name=$(jq -r '.terraform.backend.resourceGroupName' "$config_file")
  sa_name=$(jq -r '.terraform.backend.storageAccountName' "$config_file")
  container_name=$(jq -r '.terraform.backend.containerName' "$config_file")
  location=$(jq -r '.azure.region' "$config_file")

  echo "ResourceGroup: $rg_name"
  echo "StorageAccount: $sa_name"
  echo "Container:     $container_name"
  echo "Location:      $location"
  echo

  # === CREATE RESOURCE GROUP (if not exists) ===
  if az group show --name "$rg_name" >/dev/null 2>&1; then
    echo "[OK] Resource group already exists: $rg_name"
  else
    echo "[CREATE] Resource group: $rg_name"
    az group create \
      --name "$rg_name" \
      --location "$location" \
      >/dev/null
  fi

  # === CREATE STORAGE ACCOUNT (if not exists) ===
  if az storage account show --name "$sa_name" --resource-group "$rg_name" >/dev/null 2>&1; then
    echo "[OK] Storage account already exists: $sa_name"
  else
    echo "[CREATE] Storage account: $sa_name"
    az storage account create \
      --name "$sa_name" \
      --resource-group "$rg_name" \
      --location "$location" \
      --sku Standard_LRS \
      >/dev/null
  fi

  # === GET STORAGE ACCOUNT KEY ===
  account_key=$(az storage account keys list \
    --resource-group "$rg_name" \
    --account-name "$sa_name" \
    --query '[0].value' -o tsv)

  # === CREATE CONTAINER (if not exists) ===
  if az storage container show \
    --name "$container_name" \
    --account-name "$sa_name" \
    --account-key "$account_key" >/dev/null 2>&1; then
    echo "[OK] Container already exists: $container_name"
  else
    echo "[CREATE] Container: $container_name"
    az storage container create \
      --name "$container_name" \
      --account-name "$sa_name" \
      --account-key "$account_key" \
      >/dev/null
  fi

  echo "[DONE] Backend ready for environment: $env_name"
  echo
done

echo "------------------------------------------------------------"
echo "All Terraform backends are set up."
