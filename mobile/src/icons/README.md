# Synapse icons

Official Google Material Symbols **Rounded**, 24 px optical size, default
weight 400. Both outlined and filled variants are stored locally, so icons
need no network connection or native font installation.

Source: https://github.com/google/material-design-icons/tree/master/symbols/web
License: Apache 2.0, included in `LICENSE.material-symbols`.

`material-rounded.json` contains the original SVG paths and view boxes.
Refresh with `node mobile/scripts/update-material-icons.cjs` from the project
root. The script downloads only the named icons from the official repository.

Use outlined symbols by default, filled symbols for selected navigation items
and devices that are on. Colors come from the existing Synapse palette.
The custom voice orb remains the central AI control.
