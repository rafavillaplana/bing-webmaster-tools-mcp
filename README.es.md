# Bing Webmaster Tools MCP

[![CI](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/bing-webmaster-tools-mcp.svg)](https://www.npmjs.com/package/bing-webmaster-tools-mcp)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

[English](README.md) · **Español**

Servidor [MCP](https://modelcontextprotocol.io) local que permite a Claude consultar tus datos de **Bing Webmaster Tools** en lenguaje natural:

> *"¿Qué consultas me trajeron más clics en Bing el mes pasado?"*
> *"¿Qué páginas tienen errores de rastreo?"*
> *"¿Quién enlaza a esta URL y con qué anchor?"*

- **Se ejecuta en tu ordenador.** Claude lo arranca en local y habla directamente con la API oficial de Bing Webmaster. Sin servidores, sin cuentas, sin intermediarios.
- **Tu propia API key.** Se queda en tu máquina (Claude Desktop la guarda como dato sensible, o va en tu propia configuración).
- **Solo lectura.** No envía URLs, no toca sitemaps ni configuración.
- **Sin dependencias.** Es un único archivo empaquetado; Claude Desktop no necesita que instales nada más.

## 1. Consigue tu API key de Bing Webmaster Tools

[Bing Webmaster Tools](https://www.bing.com/webmasters) → *Configuración* (engranaje) → *Acceso a API* → *Clave de API* → *Generar*, y cópiala.
Una clave sirve para todos los sitios verificados de esa cuenta. Si la regeneras, actualízala también en Claude.

## 2. Instálalo

### Claude Desktop, con un clic (recomendado)

1. Descarga el último **`bing-webmaster-tools-mcp-x.y.z.mcpb`** desde [Releases](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/releases/latest).
2. Haz doble clic (o arrástralo sobre Claude Desktop, o usa *Configuración → Extensiones → Instalar extensión…*).
3. Pega tu API key cuando te la pida y activa la extensión.

Claude Desktop ejecuta la extensión con su propio Node.js integrado, así que no tienes que instalar nada.

### Claude Desktop, configuración manual

Igual que cualquier otro servidor MCP local. Necesitas [Node.js](https://nodejs.org) 20 o superior.
Abre *Configuración → Desarrollador → Editar configuración* y añade esto dentro de `"mcpServers"`:

```json
{
  "mcpServers": {
    "bing-webmaster": {
      "command": "npx",
      "args": ["-y", "bing-webmaster-tools-mcp"],
      "env": { "BING_WEBMASTER_API_KEY": "tu-api-key" }
    }
  }
}
```

Guarda y reinicia Claude Desktop.

### Claude Code

```bash
claude mcp add bing-webmaster -e BING_WEBMASTER_API_KEY=tu-api-key -- npx -y bing-webmaster-tools-mcp
```

Añade `--scope user` para tenerlo disponible en todos tus proyectos.

### Otros clientes MCP (Cursor, VS Code, Windsurf…)

Usa el mismo `command`, `args` y `env` de la configuración manual, en los ajustes MCP de ese cliente.

## 3. Úsalo

Abre un chat nuevo y pregunta. Algunas ideas para empezar:

- *Lista mis sitios de Bing Webmaster.*
- *Top 20 consultas por clics en https://example.com/ en los últimos 3 meses, con CTR y posición.*
- *¿Qué consultas tienen muchas impresiones pero un CTR por debajo del 1 %?*
- *Compara los clics de Bing de las páginas /blog/ en agosto y septiembre.*
- *Enséñame los problemas de rastreo y los errores de sitemap de mi web.*

## Herramientas

| Herramienta | Qué devuelve | Método de la API |
|---|---|---|
| `list_sites` | Sitios de la cuenta y si están verificados | GetUserSites |
| `get_query_stats` | Clics, impresiones, CTR y posición por consulta | GetQueryStats |
| `get_page_stats` | Lo mismo por URL | GetPageStats |
| `get_pages_for_query` | URLs que salen para una consulta | GetQueryPageStats |
| `get_queries_for_page` | Consultas que llevan a una URL | GetPageQueryStats |
| `get_traffic_trend` | Clics e impresiones del sitio a lo largo del tiempo | GetRankAndTrafficStats |
| `get_query_trend` | Evolución de una consulta | GetQueryTrafficStats |
| `get_crawl_stats` | Rastreo diario: rastreadas, errores, indexadas, bloqueadas… | GetCrawlStats |
| `get_crawl_issues` | URLs con problemas de rastreo | GetCrawlIssues |
| `get_url_info` | Estado de índice de una URL | GetUrlInfo |
| `get_url_traffic_info` | Tráfico de una URL | GetUrlTrafficInfo |
| `get_sitemaps` | Sitemaps enviados y su estado | GetFeeds |
| `get_inbound_link_counts` | Páginas con enlaces entrantes | GetLinkCounts |
| `get_inbound_links` | Enlaces y anchors hacia una URL | GetUrlLinks |
| `get_keyword_stats` | Histórico de impresiones de una keyword en Bing | GetKeywordStats |
| `get_related_keywords` | Keywords relacionadas | GetRelatedKeywords |
| `get_url_submission_quota` | Cuota de envío de URLs restante | GetUrlSubmissionQuota |

Las herramientas de rendimiento aceptan `startDate`, `endDate`, `aggregate`, `sortBy`, `limit` y `contains`. Por defecto suman todas las semanas del periodo en una fila por consulta o página (con CTR y posición ponderada por impresiones) y devuelven las 50 primeras por clics, para no inundar la conversación.

## Dónde funciona

Es un conector **local**: se ejecuta en el ordenador donde tienes instalado Claude Desktop o Claude Code. Por sí solo no está disponible en claude.ai desde el navegador ni en las apps móviles, que solo pueden usar conectores alojados en internet.

## Cómo proteger tu API key

El conector es de solo lectura, pero **la API key de Bing no lo es**: la misma key permite enviar URLs, borrar sitios de tu cuenta o dar acceso a otras personas. Trátala como una contraseña.

**Dónde queda guardada la key, de más a menos seguro:**

| Método | Dónde se guarda la key | Recomendación |
|---|---|---|
| Extensión `.mcpb` (Claude Desktop) | En los ajustes de Claude Desktop, en un campo marcado como *sensible*; nunca en un archivo que edites tú | ✅ **Recomendado** |
| Claude Code (`claude mcp add -e …`, ámbito de usuario o local) | Texto plano en tu configuración personal de Claude Code | Aceptable en un ordenador que solo usas tú |
| `claude_desktop_config.json` manual | Texto plano en ese archivo | Funciona, pero quien tenga el archivo ve la key |
| Claude Code con `--scope project` | Texto plano en `.mcp.json` **dentro del proyecto** | ⚠️ Evítalo: es fácil subirlo a Git sin querer |

Si necesitas configuración por proyecto, pon una referencia a una variable de entorno en lugar de la key; Claude Code la sustituye al arrancar:

```json
"env": { "BING_WEBMASTER_API_KEY": "${BING_WEBMASTER_API_KEY}" }
```

**Buenas prácticas:**

- No pegues nunca la key en una conversación con Claude ni con ninguna otra IA. Métela solo en el campo de ajustes o en la configuración.
- Instala el `.mcpb` solo desde la página de [Releases](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/releases) de este repositorio, donde GitHub lo genera a partir del código publicado.
- Si crees que la key se ha filtrado, regénerala en Bing Webmaster Tools: la anterior deja de funcionar al momento. Bing solo permite una key por usuario, así que actualízala en todo lo que la use.

**Qué hace este servidor con ella:** la key solo se envía a `ssl.bing.com` por HTTPS, como exige la API oficial. Nunca se escribe en logs ni aparece en las respuestas de las herramientas. Las vulnerabilidades se comunican en privado: mira [SECURITY.md](SECURITY.md).

## Solución de problemas

| Síntoma | Solución |
|---|---|
| *"BING_WEBMASTER_API_KEY is not set"* | Añade la key en los ajustes de la extensión, o en `env` en tu configuración. |
| *"InvalidApiKey"* / key rechazada | Vuelve a copiar la key desde Bing, o genera una nueva y actualízala. |
| Errores en un sitio concreto | Usa la URL exacta que devuelve `list_sites`, con `https://` y la `/` final. |
| No aparecen las herramientas (config. manual) | Comprueba que `node --version` es 20 o superior y reinicia Claude Desktop. Logs: *Configuración → Desarrollador*. |

## Limitaciones conocidas

- El informe de **AI Performance** de Bing (citas en Copilot) no tiene API pública, así que no está disponible.
- Bing da los datos de rendimiento **por semana**, no por día, y con menos histórico que Google Search Console.
- Bing no informa actualmente de la posición media de **clic** (la API devuelve `-1`), así que solo se muestra la posición media de impresión.
- Las respuestas tienen un máximo de 200 filas; pide a Claude que filtre (`contains`, fechas) o agregue en lugar de traerlo todo.

## Desarrollo

```bash
npm install
npm run build        # dist/index.js
npm run typecheck
npm test             # tests unitarios
npm run test:e2e     # arranca el servidor por stdio contra una API de Bing simulada
npm run pack         # genera la extensión de Claude Desktop (.mcpb)
```

Las contribuciones son bienvenidas: mira [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE) © Rafa Villaplana. Proyecto no afiliado a Microsoft ni a Anthropic. Bing es una marca de Microsoft; Claude es una marca de Anthropic.
