#!/usr/bin/env bash

set -e

SCRIPT_NAME="$0"

function help() { echo "$SCRIPT_NAME [RETRIES (default: 100)]"; }

POSITIONALS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
    -h | --help)
        help
        exit 0
        ;;
    *)
        POSITIONALS+=("$1")
        shift
        ;;
    esac
done

RETRIES=${POSITIONALS[0]:-100}

succeded=0
i=1
while test ${i} -le ${RETRIES}; do
    echo
    echo "# ${i}/${RETRIES}"
    if npm test; then
        let succeded+=1
    fi
    let i+=1
done

if test ${succeded} -ne ${RETRIES}; then
    let failed=RETRIES-succeded
    echo
    echo "error: ${failed}/${RETRIES} has failed"
    exit 1
fi
