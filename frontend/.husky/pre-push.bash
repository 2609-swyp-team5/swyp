#!/usr/bin/env bash

set -e

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

zero_oid=0000000000000000000000000000000000000000

while read -r local_ref local_oid remote_ref remote_oid; do
    if [ "$local_oid" = "$zero_oid" ]; then
        continue
    fi

    if [ "$remote_oid" = "$zero_oid" ]; then
        base_oid=$(git merge-base "$local_oid" develop 2>/dev/null || git rev-list --max-parents=0 "$local_oid" | tail -n 1)
    else
        base_oid=$remote_oid
    fi

    frontend_changed_files=()
    while IFS= read -r -d '' changed_file; do
        frontend_changed_files+=("${changed_file#frontend/}")
    done < <(
        git diff --name-only -z --diff-filter=ACMR "$base_oid" "$local_oid" -- frontend/
    )

    if [ "${#frontend_changed_files[@]}" -eq 0 ]; then
        continue
    fi

    npm --prefix frontend run typecheck

    changed_files=()
    for changed_file in "${frontend_changed_files[@]}"; do
        case "$changed_file" in
            *.js|*.mjs|*.cjs|*.ts|*.tsx)
                changed_files+=("$changed_file")
                ;;
        esac
    done

    if [ "${#changed_files[@]}" -gt 0 ]; then
        (
            cd frontend
            npx --no-install vitest related --run "${changed_files[@]}"
        )
    else
        echo "프론트엔드 관련 단위 테스트가 없어 건너뜁니다."
    fi
done
