#!/usr/bin/env bash

set -euo pipefail

APP_NAME="wants"
INSTALL_DIR="$HOME/.local/bin"
BIN_PATH="$INSTALL_DIR/$APP_NAME"

# setup.sh está en wants/setup/, así que subimos un nivel
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Installing $APP_NAME..."

# Check Go
echo "==> Checking Go..."

if ! command -v go >/dev/null 2>&1; then
    echo "Error: Go is required to build $APP_NAME."
    echo "Install Go and run the installer again."
    exit 1
fi

echo "   Found: $(go version)"

# Create installation directory
echo "==> Preparing installation directory..."
mkdir -p "$INSTALL_DIR"

# Build directly into ~/.local/bin
echo "==> Building $APP_NAME..."
cd "$PROJECT_ROOT"

go build -o "$BIN_PATH" .
chmod +x "$BIN_PATH"

echo "   Binary installed at: $BIN_PATH"

# Check PATH
echo "==> Checking PATH..."

if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
    echo "   $INSTALL_DIR is already in PATH."
else
    echo "   $INSTALL_DIR is not in PATH."

    case "${SHELL:-}" in
        */bash)
            RC_FILE="$HOME/.bashrc"
            ;;
        */zsh)
            RC_FILE="$HOME/.zshrc"
            ;;
        *)
            RC_FILE=""
            ;;
    esac

    if [[ -n "$RC_FILE" ]]; then
        PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'

        touch "$RC_FILE"

        if ! grep -Fqx "$PATH_LINE" "$RC_FILE"; then
            {
                echo ""
                echo "# Added by wants installer"
                echo "$PATH_LINE"
            } >> "$RC_FILE"

            echo "   PATH added to $RC_FILE."
        else
            echo "   PATH configuration already exists in $RC_FILE."
        fi
    else
        echo ""
        echo "Warning: Could not configure PATH automatically."
        echo "Add this directory to your PATH:"
        echo "   $INSTALL_DIR"
    fi
fi

echo ""
echo "======================================"
echo " Wants installed successfully"
echo "======================================"
echo ""
echo "Binary:"
echo "   $BIN_PATH"
echo ""

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "Open a new terminal before using Wants."
    echo ""
fi

echo "Try:"
echo "   wants help"
echo ""