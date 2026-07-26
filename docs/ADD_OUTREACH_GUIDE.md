# Agregar la Guía de Outreach a Atrio HQ

La guía "Reglas Outreach Atrio" está lista para agregarse a la sección de Docs en Atrio HQ.

## Opción 1: Script automático (recomendado)

Desde la raíz del proyecto, en una terminal con el dev server corriendo:

```bash
# Opción A: Enviar la variable de ambiente
export MCP_SECRET="b3d3a628f304e056ce184cd52c7c19d52db3b9b3"
./scripts/add-outreach-guide.sh

# Opción B: El script intenta leer de .env.local si existe
./scripts/add-outreach-guide.sh
```

El script:
- Lee el archivo `docs/REGLAS_OUTREACH_ATRIO.md`
- Obtiene MCP_SECRET del environment o de `.env.local`
- Llama al MCP connector en `http://localhost:3000/api/mcp/{secret}`
- Crea el documento en Docs con el título "Reglas Outreach Atrio" y emoji 📋

## Opción 2: Curl manual

Si prefieres hacerlo manualmente, ejecuta este comando desde la terminal:

```bash
curl -X POST http://localhost:3000/api/mcp/b3d3a628f304e056ce184cd52c7c19d52db3b9b3 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "crear_doc",
      "arguments": {
        "titulo": "Reglas Outreach Atrio",
        "contenido_markdown": "# Guía de Outreach...",
        "icono": "📋"
      }
    }
  }'
```

## Opción 3: Usar Claude en claude.ai

Conecta el MCP connector de Atrio en claude.ai (Ajustes → Conectores → agregar por URL) y usa este prompt:

```
Crea un documento llamado "Reglas Outreach Atrio" con emoji 📋 usando la herramienta crear_doc.

El contenido es esta guía de outreach en frío para Atrio Studio...
[pega el contenido de docs/REGLAS_OUTREACH_ATRIO.md]
```

El connector parseará el markdown y creará el documento automáticamente.

## Verificación

Una vez creado, el documento aparecerá en:
- Sección "Docs" de Atrio HQ
- Búsqueda global (busca "Reglas Outreach")

Puedes editarlo normalmente como cualquier otro documento en la app.
