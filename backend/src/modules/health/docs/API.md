# Health API

## `GET /api/v1/health`

**Purpose.** Liveness check — reports that the API process is running and serving requests.

**Authentication.** None. Load balancers and orchestrators cannot present credentials, so this endpoint is deliberately public. Nothing tenant-specific or configuration-revealing may be added to the response.

**Authorization.** None.

**Request.** No parameters, no body.

### Response — `200 OK`

```json
{
  "status": "ok",
  "environment": "development",
  "uptimeSeconds": 1284,
  "timestamp": "2026-07-27T09:14:02.113Z"
}
```

| Field | Type | Description |
|---|---|---|
| `status` | `"ok"` | Constant. A non-200 status code, or no response, indicates failure. |
| `environment` | string | `development` \| `test` \| `staging` \| `production` |
| `uptimeSeconds` | integer | Whole seconds since process start |
| `timestamp` | string | ISO-8601, UTC |

### Errors

None are returned by this endpoint. If the process is unhealthy it fails to respond at all, which is the signal callers act on.

Should the process be running but unable to respond, the global exception filter returns the standard envelope:

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again.", "details": null } }
```

### Example

```bash
curl -i http://localhost:3001/api/v1/health
```
