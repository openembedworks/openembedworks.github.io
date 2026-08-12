# OpenEmbedWorks

OpenEmbedWorks is a browser-native engineering tools catalog with faceted discovery.

## Catalog UX

- Sidebar-driven navigation for scalable browsing.
- Search by name, tags, and description.
- Filter by category and tags.
- Sort by rating, GitHub stars, or name.
- Results are grouped by tags for discovery.

## Data Source

The catalog is powered by `tools-data.js` (schema `1.0`), a script that assigns a
structured JSON object to `window.OEW_TOOLS_DATA`. Loading it as a `<script>` (rather
than fetching JSON) means the catalog works the same over `https://`, from a local
dev server, or via `file://`.

### Top-level keys

- `_schemaVersion`
- `_metadata`
- `categories[]`
- `tags[]`
- `tools[]`

### Tool record fields

- `id` (required)
- `name` (required)
- `category` (required)
- `tags[]` (recommended)
- `description` (required)
- `url` (required)
- `githubRepo` (optional)
- `rating.value`, `rating.count`, `rating.source` (recommended)

## SEO and Agent Discovery

- `sitemap.xml`
- `robots.txt`
- `llms.txt`
- `llms-full.txt`
- JSON-LD in `index.html`

## Local File Mode

When opening `index.html` via `file://`, browsers can block `fetch` for local JSON. The app includes embedded fallback catalog data in `index.html` to remain functional.

## License

License file selection is pending.