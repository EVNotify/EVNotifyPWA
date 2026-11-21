# V3 owner trip lists: resolved in server source

## Resolution

[EVNotify/server PR #31](https://github.com/EVNotify/server/pull/31) was merged
on November 13, 2026. Commit `5578dd4` changes the owner query to `{ akey }`,
including upcoming, running, and ended trips independently of guest accessibility.
The PWA sorts the returned list by start time. The server did not need to rename
the existing service method or change the public endpoint.

The proposal below is retained as historical context. It is not outstanding
server work. Verify the deployed owner list with a test account; the source
review alone does not establish authenticated production behavior.

## Original goal and behavior

`GET /trips/{akey}/list` is the authenticated management list used by the PWA. It currently calls `TripNotifyService.findAccessibleByAkey`, which filters trips using `accessibleAfterEnd` and the current time. As a result, an owner may not see a future or running trip they just created when `accessibleAfterEnd` is false.

The owner's list should include all trips belonging to that AKey: upcoming, running, and ended. Guest access by share code is a separate policy.

## Server change

- Replace the owner-list query with `{ akey }`, sorted by `startDate` descending. Rename the service method to reflect ownership rather than guest accessibility, and have the existing list controller call it.
- Keep `GET /trips/{akey}/list`, its authenticated AKey ownership check, and its `TripDto[]` response (`name`, `code`, `start`, `end`). Do not require active premium merely to list owned trips.
- Leave `findAccessibleByCode` and the guest trip routes out of this change. Their after-end access issue is documented separately in [v3-trip-access-control-issue.md](v3-trip-access-control-issue.md).

No database migration or public API shape change is needed.

## Verification

- With `accessibleAfterEnd` both true and false, the owner sees upcoming, running, and ended trips, ordered by newest start time first.
- A newly created trip appears in the next list response; a deleted trip disappears.
- A request without valid authentication, or with an authenticated AKey different from the path AKey, is rejected. Trips owned by another AKey never appear.
- Guest code access remains governed by its separate access check; changing the owner list does not make trips public.

This plan targets `EVNotify/server`; only the plan is stored in this PWA repository.
