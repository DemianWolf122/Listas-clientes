#!/bin/bash
# Script to add "Reglas Outreach Atrio" document to Atrio HQ via MCP connector
# Usage: ./add-outreach-guide.sh

set -e

# Configuration
MCP_SECRET="b3d3a628f304e056ce184cd52c7c19d52db3b9b3"
MCP_URL="http://localhost:3000/api/mcp/$MCP_SECRET"
TITLE="Reglas Outreach Atrio"
ICON="📋"

# Read the markdown file
CONTENT=$(cat "docs/REGLAS_OUTREACH_ATRIO.md")

# Create the MCP request payload
PAYLOAD=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "crear_doc",
    "arguments": {
      "titulo": "$TITLE",
      "contenido_markdown": $(echo "$CONTENT" | jq -Rs .),
      "icono": "$ICON"
    }
  }
}
EOF
)

# Make the request
echo "📝 Creating document: $TITLE"
echo "🔗 Endpoint: $MCP_URL"
echo ""

RESPONSE=$(curl -s "$MCP_URL" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Check if the response contains an error
if echo "$RESPONSE" | grep -q '"isError":true'; then
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.result.content[0].text')
  echo "❌ Error: $ERROR_MSG"
  exit 1
else
  SUCCESS_MSG=$(echo "$RESPONSE" | jq -r '.result.content[0].text')
  echo "✅ Success!"
  echo "$SUCCESS_MSG"
  exit 0
fi
