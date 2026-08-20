# ShapeContext

Aplicación de notas avanzada impulsada por IA, que se ejecuta de forma local.

## Instalación global

```bash
npm install -g shapecontext
```

## Ejecución

Simplemente ejecuta:

```bash
shapecontext
```

## Características

- 📝 Gestión avanzada de notas (Pestañas múltiples)
- 🚀 Búsqueda ultrarrápida usando SQLite FTS5 (Búsqueda Full-Text)
- 🤖 Asistente IA Integrado (Tool Calling) compatible con OpenAI / Ollama / LM Studio.
- 🔌 Servidor MCP nativo incorporado (Model Context Protocol).
- 📊 Dashboard de métricas y gráficos (Recharts).
- 🎨 Personalización visual completa mediante IA y opciones predeterminadas.
- 🌍 Multi-idioma (Español, Inglés).
- 🔒 100% Local (Base de datos guardada en `~/.shapecontext`).

## Integración MCP (Model Context Protocol)

ShapeContext expone un servidor MCP nativo de arquitectura dual para que otras aplicaciones de IA puedan consumir tus notas.

**Privacidad por diseño:** Solo las notas que marques manualmente con la casilla "Disponible para MCP" serán visibles para el servidor y consumibles por otras IAs.

### 1. Transporte Stdio (Para Claude Desktop / Cursor)
Este es el método recomendado para integraciones con aplicaciones de IA de escritorio (Orquestadores locales).

Añade la siguiente configuración al archivo JSON de tu cliente (por ejemplo, `claude_desktop_config.json`):

```json
"mcpServers": {
  "shapecontext": {
    "command": "shapecontext-mcp"
  }
}
```
*(Nota: La aplicación ShapeContext principal debe estar corriendo en tu sistema para que este puente proxy logre extraer las notas).*

### 2. Transporte SSE (Para Orquestadores en Red y Debugging)
Si deseas conectar un agente remoto, orquestadores basados en red (LangChain, etc) o el Inspector MCP oficial, ShapeContext levanta un servidor de Eventos (SSE) en la siguiente ruta:
👉 `http://localhost:3000/mcp/sse`

**Probando con el Inspector Oficial:**
1. Asegúrate de tener ShapeContext corriendo.
2. Abre una terminal y ejecuta el Inspector oficial de MCP:
   ```bash
   npx @modelcontextprotocol/inspector
   ```
3. Al abrirse en el navegador, configura la conexión como **SSE** y URL `http://localhost:3000/mcp/sse`.

## Modo de Uso del Asistente

Puedes pedirle al asistente cosas como:
- "Crea una nota secreta con mis contraseñas"
- "Cambia el tema a modo hacker (verde sobre negro)"
- "Muéstrame cuántas notas tengo en el dashboard" (El asistente te informará)
