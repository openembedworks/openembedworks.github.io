/**
 * OpenEmbedWorks tool catalog data.
 *
 * This is the single source of truth for the site's tool catalog, replacing
 * the former tools.json. Loading it as a <script> (instead of fetching JSON)
 * means the catalog works identically whether the site is opened over
 * https://, from a local dev server, or by double-clicking index.html
 * (file://) — script tags aren't subject to the fetch/CORS restrictions
 * that block XHR/fetch requests against file:// URLs.
 *
 * Edited by hand for manual changes, and by
 * .github/scripts/finalize-submission.mjs for automated tool submissions
 * (that script parses the JSON object below out of this file and rewrites
 * it in place, so keep the `window.OEW_TOOLS_DATA = { ... };` wrapper exactly
 * as-is).
 */
window.OEW_TOOLS_DATA = {
  "_schemaVersion": "1.0",
  "_metadata": {
    "lastUpdated": "2026-08-02",
    "description": "OpenEmbedWorks tool catalog with faceted search metadata"
  },
  "categories": [
    {
      "id": "system-runtime",
      "label": "System & Runtime",
      "description": "Kernel internals, ELF binaries, RTOS scheduling, and low-level runtime utilities",
      "order": 1
    },
    {
      "id": "networking-protocols",
      "label": "Networking & Protocols",
      "description": "Packet analysis, time sync, CAN/UDS, and messaging protocols",
      "order": 2
    },
    {
      "id": "security",
      "label": "Security",
      "description": "Vulnerability analysis, exploitation research, and hardening tools",
      "order": 3
    },
    {
      "id": "build-binary-tools",
      "label": "Build & Binary Tools",
      "description": "Compilers, build workflows, and binary tooling",
      "order": 4
    },
    {
      "id": "ai-ml",
      "label": "AI/ ML",
      "description": "Model tooling, inference utilities, and ML-assisted workflows",
      "order": 5
    }
  ],
  "tags": [
    { "id": "binary-analysis", "label": "Binary Analysis" },
    { "id": "linux", "label": "Linux" },
    { "id": "diagnostics", "label": "Diagnostics" },
    { "id": "automotive", "label": "Automotive" },
    { "id": "rtos", "label": "RTOS" },
    { "id": "scheduling", "label": "Scheduling" },
    { "id": "timesync", "label": "Time Sync" },
    { "id": "packet", "label": "Packet Analysis" },
    { "id": "compiler", "label": "Compiler" },
    { "id": "productivity", "label": "Productivity" }
  ],
  "tools": [
    {
      "id": "hex-lens",
      "name": "Hex Lens",
      "category": "build-binary-tools",
      "tags": ["binary-analysis", "linux"],
      "description": "Browser-native hex editor to inspect, compare, edit, and save modified binaries.",
      "url": "https://rudupa.github.io/hexlens/",
      "githubRepo": "rudupa/hexlens",
      "rating": { "value": 4.5, "count": 18, "source": "seed" }
    },
    {
      "id": "elf-lens",
      "name": "ELF Lens",
      "category": "build-binary-tools",
      "tags": ["binary-analysis", "linux"],
      "description": "Parse and visualize ELF binary headers, sections, and symbol tables in the browser.",
      "url": "https://rudupa.github.io/elflens/",
      "githubRepo": "rudupa/elflens",
      "rating": { "value": 4.6, "count": 22, "source": "seed" }
    },
    {
      "id": "memory-map-lens",
      "name": "Memory Map Lens",
      "category": "build-binary-tools",
      "tags": ["linux", "binary-analysis"],
      "description": "Visualize process memory maps and linker layout slices for runtime debugging.",
      "url": "https://rudupa.github.io/memmaplens/",
      "githubRepo": "rudupa/memmaplens",
      "rating": { "value": 4.1, "count": 9, "source": "seed" }
    },
    {
      "id": "can-bus-analyzer",
      "name": "CAN Bus Analyzer",
      "category": "networking-protocols",
      "tags": ["automotive", "diagnostics"],
      "description": "Decode and inspect CAN bus frames with signal-level views and quick filtering.",
      "url": "#",
      "rating": { "value": 4.4, "count": 14, "source": "seed" }
    },
    {
      "id": "uds-protocol-tool",
      "name": "UDS Protocol Tool",
      "category": "networking-protocols",
      "tags": ["automotive", "diagnostics"],
      "description": "Build and decode UDS diagnostic messages for service-level troubleshooting.",
      "url": "#",
      "rating": { "value": 4.2, "count": 11, "source": "seed" }
    },
    {
      "id": "autosar-config-editor",
      "name": "AUTOSAR Config Editor",
      "category": "system-runtime",
      "tags": ["automotive", "productivity"],
      "description": "Edit AUTOSAR ARXML-like config data with structure-aware guidance.",
      "url": "#",
      "rating": { "value": 4.0, "count": 7, "source": "seed" }
    },
    {
      "id": "chrono-lens",
      "name": "Chrono Lens",
      "category": "system-runtime",
      "tags": ["rtos", "scheduling"],
      "description": "Simulate RTOS scheduling to explore offsets, periods, priorities, preemption, and timing.",
      "url": "https://rudupa.github.io/chronolens/",
      "githubRepo": "rudupa/chronolens",
      "rating": { "value": 4.7, "count": 25, "source": "seed" }
    },
    {
      "id": "gptp-analyzer-simulator",
      "name": "gPTP Analyzer and Simulator",
      "category": "networking-protocols",
      "tags": ["timesync", "packet"],
      "description": "Visualize and simulate IEEE 802.1AS time-sync behavior across nodes.",
      "url": "https://rudupa.github.io/EthTimeSync_Sim/",
      "githubRepo": "rudupa/gptp-simulator",
      "rating": { "value": 4.8, "count": 27, "source": "seed" }
    },
    {
      "id": "pcap-lens",
      "name": "PCAP Lens",
      "category": "networking-protocols",
      "tags": ["packet", "diagnostics"],
      "description": "Inspect packet captures with filter scaffolding and quick protocol pivots.",
      "url": "#",
      "rating": { "value": 4.3, "count": 16, "source": "seed" }
    },
    {
      "id": "compiler-explorer-lite",
      "name": "Compiler Explorer Lite",
      "category": "build-binary-tools",
      "tags": ["compiler", "productivity"],
      "description": "Compile small C/C++ snippets and inspect assembly output and optimization effects.",
      "url": "#",
      "rating": { "value": 4.4, "count": 20, "source": "seed" }
    }
  ]
};
