# AttendX — Geofence System v2.1

## Single Config — 2 Files Only

All geofence defaults live in exactly 2 files (must match):

| File | Purpose |
|------|---------|
| `server/config/geofence.js` | Backend defaults (controllers use this) |
| `frontend/src/utils/geofence.js` | Frontend defaults (map uses this) |

**To change campus geofence, edit ONLY these 2 files. Nothing else.**

## How It Works

Every lecture automatically gets directional bounds:
```
          ┌──  NORTH: 30m  ───┐
          │   (faculty desk)   │
 WEST     │                   │  EAST
 100m     │    CLASSROOM      │  100m
          │       ◉          │
          └──  SOUTH: 200m ───┘
             (student seating)
```

Faculty does nothing — geofence is automatic. Admin sets campus-wide defaults.

## Default Bounds
| Direction | Default | Meaning |
|-----------|---------|---------|
| North | 30m | Faculty desk/board |
| South | 200m | Student seating |
| East | 100m | Room width |
| West | 100m | Room width |

## Config File Chain

```
server/config/geofence.js  <-- CHANGE HERE
       |
       +-- lectureSession.controller.js (line 37) — stores bounds on lecture start
       |
       +-- attendance.controller.js (line 105) — checks bounds on student scan

frontend/src/utils/geofence.js  <-- CHANGE HERE (match server)
       |
       +-- LiveSession.jsx (line 231) — draws yellow box on map
```

## Direction Reference
| Direction | Bearing | Sector Range |
|-----------|---------|-------------|
| North | 0° | 315°-360°, 0°-45° |
| East | 90° | 45°-135° |
| South | 180° | 135°-225° |
| West | 270° | 225°-315° |

## For Future Developers
1. Change values in the 2 config files only — controllers read from config, not hardcoded
2. System ALWAYS enforces directional bounds (no circular fallback)
3. GPS accuracy up to 150m is auto-compensated
4. No faculty UI for geofence — fully automatic
