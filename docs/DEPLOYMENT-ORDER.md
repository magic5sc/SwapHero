# Player default deployment — 2026-11-02

PvE encounters place surviving team members in team order into field center,
left, then right (slot indices 1, 0, 2). One survivor starts in the center;
two occupy center and left. Remaining members retain reserve order 3, 4, 5.
Dead members are excluded before placement. Enemy encounter layouts and explicit
legacy duel presets are unchanged. Deployment dragging remains available; loading
an existing battle preserves its saved slots, including older left-side starts.

Validation: `node --test test/*.test.mjs`. Cases cover 1–6 survivors, dead-member
filtering, unchanged enemies, manual deployment and old/new save round trips.
