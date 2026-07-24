#!/usr/bin/env bash
# Stop hook: surface every comment added in the working tree (modified + new files)
# so each gets reviewed against the CLAUDE.md comment rule before it lands. Emits a
# systemMessage; never blocks. Committing the changes clears the list.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

added=$(
  {
    git diff HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null
    git ls-files --others --exclude-standard -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null |
      while IFS= read -r f; do sed 's/^/+/' "$f"; done
  } |
    grep -E '^\+' |
    grep -vE '^\+\+\+' |
    grep -E '^\+[[:space:]]*(//|/\*|\{/\*)' |
    sed 's/^+/  /'
)

if [ -n "$added" ]; then
  jq -n --arg c "$added" '{systemMessage: ("Comments in the working tree — verify each against the CLAUDE.md rule (external gotchas only; never explain your own code, never narrate what it does). Remove any that do not earn their place:\n" + $c)}'
fi

exit 0
