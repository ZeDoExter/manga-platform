#!/bin/bash
set -e

load_azp_token() {
  if [ -z "${AZP_TOKEN_FILE}" ]; then
    if [ -z "${AZP_TOKEN}" ]; then
      echo 1>&2 "error: missing AZP_TOKEN environment variable"
      exit 1
    fi
    AZP_TOKEN_FILE="$(dirname "$0")/.token"
  fi

  if [ -n "${AZP_TOKEN-}" ]; then
    echo -n "${AZP_TOKEN}" > "${AZP_TOKEN_FILE}"
    chmod 600 "${AZP_TOKEN_FILE}" || true
  fi
  unset AZP_TOKEN
}

cleanup() {
  trap "" EXIT
  if [ -e ./config.sh ]; then
    echo "Cleanup. Removing Azure Pipelines agent..."
    ./config.sh remove --unattended --auth "PAT" --token $(cat "${AZP_TOKEN_FILE}") || true
  fi
}

if [ -z "${AZP_URL}" ]; then
  echo 1>&2 "error: missing AZP_URL environment variable"
  exit 1
fi

load_azp_token

if [ -n "${AZP_WORK}" ]; then
  mkdir -p "${AZP_WORK}"
fi

export VSO_AGENT_IGNORE="AZP_TOKEN,AZP_TOKEN_FILE"

echo "1. Determining matching Azure Pipelines agent..."

AZP_AGENT_PACKAGES=$(curl -LsS \
    -u user:$(cat "${AZP_TOKEN_FILE}") \
    -H "Accept:application/json" \
    "${AZP_URL}/_apis/distributedtask/packages/agent?platform=linux-x64&top=1")

AZP_AGENT_PACKAGE_LATEST_URL=$(echo "${AZP_AGENT_PACKAGES}" | jq -r ".value[0].downloadUrl")

if [ -z "${AZP_AGENT_PACKAGE_LATEST_URL}" -o "${AZP_AGENT_PACKAGE_LATEST_URL}" == "null" ]; then
  echo 1>&2 "error: could not determine a matching Azure Pipelines agent from ${AZP_URL}"
  exit 1
fi

echo "2. Downloading Azure Pipelines agent from ${AZP_AGENT_PACKAGE_LATEST_URL}..."

curl -LsS "${AZP_AGENT_PACKAGE_LATEST_URL}" | tar -xz & wait $!

trap "cleanup; exit 0" EXIT
trap "cleanup; exit 130" INT
trap "cleanup; exit 143" TERM

echo "3. Configuring Azure Pipelines agent..."

./config.sh --unattended \
  --agent "${AZP_AGENT_NAME:-$(hostname)}" \
  --url "${AZP_URL}" \
  --auth "PAT" \
  --token $(cat "${AZP_TOKEN_FILE}") \
  --pool "${AZP_POOL:-Default}" \
  --work "${AZP_WORK:-_work}" \
  --replace \
  --acceptTeeEula & wait $!

echo "4. Running Azure Pipelines agent..."

chmod +x ./run.sh
./run.sh "$@" & wait $!
