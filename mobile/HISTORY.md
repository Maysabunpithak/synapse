# Activity history

The History screen follows the visual direction of [Lintel by Sayeed Ahmad](https://dribbble.com/shots/27759435-Lintel-Smart-Home-App), keeping the existing Synapse palette and original history data.

- The prominent home Wi-Fi panel retains the original connected, away and unknown states, plus the message from `useHomeWifi`.
- The latest recorded activity remains visible above the device summaries.
- Every device retains its original percentage: `Math.round(on_count / total * 100)`, or zero for an empty total. This is a share of recorded actions, not elapsed on-time.
- Opened, Turn off, Peak and the 24-hour histogram use the original analyzer fields and full-history scope. The peak bar uses the existing orange accent.
- Guest mode retains the original sample summaries. Pull to refresh and retry use the original log loader.

The screen uses the existing `/logs/analyze` and `/logs/history` endpoints. No new backend endpoint or period filter is required.

Validation: `node --test mobile/tests/*.test.cjs` and `node mobile/node_modules/typescript/bin/tsc --noEmit -p mobile/tsconfig.json` from the repository root.
