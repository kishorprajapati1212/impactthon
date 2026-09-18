# AttendX DB Models v3.1

## Key Features
- **Asymmetric geofence**: Per-direction bounds (north/south/east/west) for real classroom layouts
- **Audit logging**: All student/faculty changes tracked with `AuditLog`
- **10s QR window**: Tight proxy-proof window with server-only verification
- **Second-level attendance**: Attendance window checked per-second, not per-minute
- **fps:20 scanning**: Balanced between speed and CPU on old devices
- **QR level M**: Medium error correction for faster decode

## Models
### User — shared base
| Field | Type | Note |
|-------|------|------|
| name | String | required, maxlength:100 |
| email | String | unique, lowercase |
| password | String | minlength:6, select:false |
| role | String | ADMIN/FACULTY/STUDENT |
| isActive | Boolean | default:true |

### LectureSession — geofence
| Field | Type | Note |
|-------|------|------|
| location.radius | Number | default:100m |
| location.bounds.north | Number | max meters north |
| location.bounds.south | Number | max meters south |
| location.bounds.east | Number | max meters east |
| location.bounds.west | Number | max meters west |

Directional bounds: if set, student must be within the per-direction limit. If not set, falls back to circular radius.

### AuditLog
| Field | Type | Note |
|-------|------|------|
| entityType | String | STUDENT/FACULTY/ASSIGNMENT |
| entityId | ObjectId | which record |
| changedBy | ObjectId→User | who changed it |
| action | String | CREATE/UPDATE/DEACTIVATE/REACTIVATE/DELETE |
| changes | Mixed | what fields changed |
| previousValues | Mixed | before values |

## QR Security Model
1. Faculty generates QR with HMAC-signed token + server-offset timestamp
2. QR rotates every 5s (screenshot invalid in ≤10s)
3. Student scans → sent directly to server (no frontend check)
4. Server verifies: HMAC signature + ts within 10s + geofence + section + duplicate
5. Total time: scan→GPS→server = ~5s, well within 10s window

## Credentials (after seed)
All passwords: `pass123`
- admin@attendx.com (Admin)
- rajesh.k@attendx.com (Faculty)
- cse2024001@attendx.com (Student)
- parent.verma@attendx.com (Parent)
