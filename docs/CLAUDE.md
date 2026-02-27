This repo is for an MVP prototype of a real-world ambient ARPG.

## Core rules

- Build systems first, content second.

- Combat + itemization are the heart.

- The map is a delivery layer, not the first priority.

- Stay MVP-first.

- Prefer simulated/mock systems over production infrastructure.

- Do not add PvP, guilds, co-op raids, deep crafting, narrative questlines, or live-service systems.

- Prefer small testable slices.

- Quote relevant repo docs before making major planning recommendations.

## Current resolved decisions

- Combat is instant-resolved simulation with summary/log output.

- Use Frost Mystic, not Summon Mystic, in MVP.

- Passive mode is simulate-on-open.

- Abilities are item-granted actions, not a separate subsystem in MVP.

- Retreat is out of MVP combat flow.
