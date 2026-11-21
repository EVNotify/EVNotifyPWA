# V3 trip access after the end time: resolved in server source

## Resolution

[EVNotify/server PR #31](https://github.com/EVNotify/server/pull/31) was merged
on November 13, 2026. Commit `7c8b894` fixes the reversed guest expiry check;
the merged changes also enforce sharing windows and permissions for history and
live updates. Retained history does not extend live delivery after the trip ends.

The report below describes the historical defect, not an outstanding server
implementation requirement. Authenticated production behavior and deployment of
the merged fixes still require verification using a test trip. The live trip
frontends have been checked for the required Socket.IO `auth: { code }` credentials.

## Historical report

The public V3 server source appears to apply `accessibleAfterEnd: false` backwards. Both `TripNotifyService.findAccessibleByAkey` and `findAccessibleByCode` select such a trip when `endDate <= now`. This makes a trip unavailable by share code while it is running, then available after it ends. The `GET /trips/{code}` and `GET /trips/{code}/info` routes are guest routes and use `findAccessibleByCode`.

This is a source-code finding; the behavior has not been verified against the deployed server.

## Example

An account with active premium creates a trip from **10:00 to 11:00**, enables location sharing, and leaves **“Keep trip accessible after it ends” off**. A friend has the valid trip code.

| Time | Expected | Behavior implied by the current condition |
| --- | --- | --- |
| 09:30, before start | Code is rejected | Code is rejected |
| 10:30, during trip | Code gives access to the trip | Code is rejected |
| 11:30, after end | Code is rejected | Code gives access to the trip and potentially its location history |

With **“Keep trip accessible after it ends” on**, access during and after the trip is expected and the current condition allows it. Before the start time, the separate start-time check still rejects access. Guest access also requires a valid code and the owner's premium to remain active.

## Cause and suggested fix

Both service methods currently contain the equivalent of:

```ts
{
  accessibleAfterEnd: false,
  endDate: { $lte: new Date() },
}
```

For code-based access, use `endDate: { $gt: now }` when `accessibleAfterEnd` is false. Keep the existing start-time and premium checks. Use one captured `now` value for the query and time checks so the result is consistent at the boundary.

Review `findAccessibleByAkey` separately. It serves the account owner's list, which may need to show trips after guest access expires; the owner's list and guest access do not necessarily need the same filter.

## Regression cases

- For `accessibleAfterEnd: false`, verify that both guest routes reject before start, allow during the trip, and reject at and after the end time.
- For `accessibleAfterEnd: true`, verify that both guest routes reject before start and allow during and after the trip while premium is active.
- For a trip with `locationEnabled: true`, verify that `/trips/{code}/info` cannot return location history after the end when `accessibleAfterEnd` is false.
- Verify the account-owner list independently, including future, running, and ended trips.

Source: `EVNotify/server`, `src/tripnotify/tripnotify.service.ts` and `src/tripnotify/tripnotify.controller.ts` on `main`.
