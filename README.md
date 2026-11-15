# EVNotifyPWA
PWA Webinterface for EVNotify

## Project setup

Node.js 8.x is supported for production builds, and Node.js 22.x is supported for
local development. `nvm use` selects Node 8.17.0 from `.nvmrc`; use `nvm use 22`
to select Node 22 instead. GitHub Actions runs the tests, lint, and build on both
versions.

The existing Vue CLI 3/webpack 4 toolchain needs OpenSSL's legacy provider on
Node 22. The `serve` and `build` scripts detect the runtime's OpenSSL version and
add the compatibility flag only for OpenSSL 3 or newer. Node 8 receives no extra
flag. No shell environment configuration or production Node upgrade is needed.
This preserves the existing toolchain and lockfile format.

```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your tests
```
npm run test
```

Tests cover V2/V3 request contracts, trips, logs/history, settings persistence,
vehicle estimates, login switching, Vue template compilation, and station/map
failure paths using simulated requests and map objects. They do not access a live
account or Google Maps.

### Check lint without changing files
```
npm run lint:check
```

ESLint checks the application, tests, configuration, and `scripts/` directory.
Hound's duplicate JSHint checks are disabled in favor of this CI check.

### V3 vehicle estimates

V3 supports every vehicle ID currently accepted by the server. Set the optional
usable battery capacity in Settings when the model has no existing PWA default,
or to override that default for a different battery variant. Charging estimates
also require measured charging power or an existing model speed default.
Unavailable inputs are shown as `–` rather than guessed.

### Verification requiring a test account

The automated suite uses mocked services. The following browser checks still
require dedicated V2/V3 test accounts and have not been verified against production:

- Sign in to each backend, reload, log out, and switch versions. Confirm a failed
  login leaves the previous session intact.
- Open finished and running logs, their charts/maps, and confirm title saving and
  deletion on disposable test logs. Verify retry behavior with the network offline.
- Clear a test account's notification email, save, and reload. Confirm it remains
  cleared. Test capacity settings on a V3 vehicle without a model default.
- With Google Maps enabled, test station searches and a route using a Premium
  account; deny geolocation and verify the view recovers. Verify failed requests
  are visible and retryable.
- Check Premium/voucher and trip create/list/share/delete flows with disposable
  data, including sharing expiry and location disabled. Confirm the deployed server
  includes [server PR #31](https://github.com/EVNotify/server/pull/31).

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
