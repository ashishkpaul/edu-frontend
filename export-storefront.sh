#!/bin/bash

# Base directory – assume script is in the project root
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Output directory – change this to your desired location
OUTPUT_DIR="/home/ashish/Documents/vendure/plugins"

# Project name (used for output filename)
PROJECT_NAME="nextjs-storefront-starter"

# Output file path
OUTFILE="$OUTPUT_DIR/${PROJECT_NAME}_code.txt"

echo "Exporting $PROJECT_NAME from $BASE_DIR to $OUTFILE ..."

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Go into project directory
cd "$BASE_DIR" || { echo "❌ Cannot enter $BASE_DIR"; exit 1; }

# Generate export with tree and file contents
{
  echo "=== PROJECT TREE ($PROJECT_NAME) ==="
  tree -a -I 'node_modules|dist|logs|docs|.git|build|coverage|.next|out|.cache|.husky' --dirsfirst
  echo -e "\n=== FILE CONTENTS ===\n"

  find . -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
       -o -name "*.cjs" -o -name "*.mjs" -o -name "*.json" -o -name "*.sql" \
       -o -name "*.sh" -o -name "*.yml" -o -name "*.yaml" -o -name "*.txt" \
       -o -name "*.html" -o -name "*.css" -o -name "*.scss" -o -name "*.md" \) \
    -not -name "package-lock.json" \
    -not -name "yarn.lock" \
    -not -name "pnpm-lock.yaml" \
    -not -path "*/test/*" \
    -not -path "*/scripts/*" \
    -not -path "*/contracts/*" \
    -not -path "*/examples/*" \
    -not -path "*/src/migrations" \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/logs/*" \
    -not -path "*/docs/*" \
    -not -path "*/.git/*" \
    -not -path "*/build/*" \
    -not -path "*/coverage/*" \
    -not -path "*/.next/*" \
    -not -path "*/.husky/*" \
    -not -path "*/out/*" \
    -exec echo "--- {} ---" \; \
    -exec cat {} \; \
    -exec echo \;
} > "$OUTFILE"

echo "✅ $PROJECT_NAME exported to $OUTFILE"
