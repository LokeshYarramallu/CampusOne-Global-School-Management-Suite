# Calendar API

Base path: `/api/v1/calendar`

All endpoints require authentication. Every endpoint also requires the
`calendar:view:read` permission, which proves the caller is a calendar
participant. The response envelope on failure is:

```json
{ "error": { "code": "EVENT_NOT_FOUND", "message": "...", "details": null } }
```

Stable error codes for this module:

- `EVENT_NOT_FOUND`
- `CALENDAR_SCOPE_FORBIDDEN`
- `CLASS_NOT_ASSIGNED`
- `CALENDAR_UNAVAILABLE`

---

## `GET /api/v1/calendar`

Read the events visible to the caller for a month.

### Permissions

- `calendar:view:read`

### Query parameters

| Name | Type | Description |
|---|---|---|
| `year` | integer (2000-2100) | Optional; defaults to current UTC year. |
| `month` | integer (1-12) | Optional; defaults to current UTC month. |

### Response: 200 OK

```json
{
  "canCreate": { "school": true, "class": false, "personal": true },
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "scope": "SCHOOL",
      "classLabel": null,
      "sectionLabel": null,
      "type": "HOLIDAY",
      "title": "Founders Day holiday",
      "description": "The school is closed for Founders Day.",
      "eventDate": "2026-08-10",
      "startTime": null,
      "endTime": null,
      "createdByRole": "SCHOOL_ADMIN_OFFICE",
      "canManage": false
    }
  ]
}
```

`canManage` is `true` only when the caller is the event owner.

### Error responses

- `400 VALIDATION_FAILED` year or month out of range.
- `404 CALENDAR_UNAVAILABLE` no tenant context or feature disabled.
- `403 FORBIDDEN` caller lacks `calendar:view:read`.

---

## `POST /api/v1/calendar`

Create a calendar event.

### Permissions

- `calendar:view:read` (guard)
- The service then checks the role-specific create permission for the scope:
  - `SCHOOL` -> `calendar:school:manage`
  - `CLASS` -> `calendar:assigned:manage`
  - `PERSONAL` -> `calendar:self:manage`

### Request body

```json
{
  "scope": "CLASS",
  "classLabel": "8",
  "sectionLabel": "B",
  "type": "EXAM",
  "title": "Mathematics unit test",
  "description": "Chapters 3 and 4.",
  "eventDate": "2026-08-05",
  "startTime": "09:00",
  "endTime": "10:00"
}
```

| Field | Required | Rules |
|---|---|---|
| `scope` | yes | `SCHOOL`, `CLASS`, or `PERSONAL` |
| `classLabel` | when `scope=CLASS` | string, max 16 |
| `sectionLabel` | when `scope=CLASS` | string, max 16 |
| `type` | yes | `ACADEMIC`, `CULTURAL`, `EXAM`, `HOLIDAY`, `MEETING`, `NOTICE` |
| `title` | yes | string, max 120 |
| `description` | no | string, max 2000 |
| `eventDate` | yes | `YYYY-MM-DD` |
| `startTime` | no | `HH:MM` 24-hour |
| `endTime` | no | `HH:MM` 24-hour |

### Response: 201 Created

The created event in the same shape as `GET /api/v1/calendar` events.

### Error responses

- `403 CALENDAR_SCOPE_FORBIDDEN` role may not create at this scope.
- `403 CLASS_NOT_ASSIGNED` `scope=CLASS` but caller is not assigned to the class.
- `404 CALENDAR_UNAVAILABLE` feature disabled or no tenant.
- `400 VALIDATION_FAILED` malformed payload.

---

## `PATCH /api/v1/calendar/:id`

Edit an existing event. Only the owner may edit.

### Permissions

- `calendar:view:read` and event ownership.

### Request body

Same fields as `POST` except `scope`, `classLabel`, and `sectionLabel` cannot be
changed. Send only the fields that change.

```json
{
  "title": "Updated title",
  "description": "New description."
}
```

### Response: 200 OK

The updated event.

### Error responses

- `404 EVENT_NOT_FOUND` event does not exist or caller does not own it.

---

## `DELETE /api/v1/calendar/:id`

Delete an event. Only the owner may delete.

### Permissions

- `calendar:view:read` and event ownership.

### Response: 200 OK

```json
{ "success": true }
```

### Error responses

- `404 EVENT_NOT_FOUND` event does not exist or caller does not own it.
