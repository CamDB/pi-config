#!/usr/bin/env bash
set -euo pipefail

FORCE=0
for arg in "$@"; do
    if [[ "$arg" == "--force" ]]; then
        FORCE=1
    fi
done

TARGET="$HOME/.pi/agent"
SOURCE="$PWD/agent"

# Ensure the parent .pi directory exists
mkdir -p "$HOME/.pi"

if [[ -e "$TARGET" || -L "$TARGET" ]]; then
    if [[ $FORCE -eq 1 ]]; then
        # If it's a real directory (not a symlink), try to migrate important state
        if [[ -d "$TARGET" && ! -L "$TARGET" ]]; then
            echo "Migrating existing state from $TARGET to $SOURCE..."
            [[ -f "$TARGET/auth.json" ]] && cp "$TARGET/auth.json" "$SOURCE/auth.json" 2>/dev/null || true
            [[ -d "$TARGET/sessions" ]] && cp -r "$TARGET/sessions" "$SOURCE/" 2>/dev/null || true
        fi
        
        echo "Removing existing $TARGET..."
        rm -rf "$TARGET"
    else
        echo "Error: $TARGET already exists. Use --force to overwrite."
        exit 1
    fi
fi

echo "Creating symlink: $TARGET -> $SOURCE"
ln -s "$SOURCE" "$TARGET"

echo "Installation complete!"
