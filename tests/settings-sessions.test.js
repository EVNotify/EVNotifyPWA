const assert = require('assert');
const { load, instance } = require('./helpers');

const pending = [], sent = [], writes = [], events = [];
const memory = {};
class ControlledXHR {
  constructor() { this.headers = {}; pending.push(this); sent.push(this); }
  open(method, url) { this.method = method; this.url = url; }
  setRequestHeader(name, value) { this.headers[name] = value; }
  send(body) { this.body = body; }
  respond(status, data) {
    this.status = status;
    this.readyState = 4;
    this.responseText = JSON.stringify(data);
    this.onreadystatechange();
  }
}
const Client = load('src/plugins/evnotify.js', {}, { XMLHttpRequest: ControlledXHR }).default;
const storage = {
  getValue: (key, fallback) => memory[key] === undefined ? fallback : memory[key],
  setValue(key, value) { writes.push({ key, value }); memory[key] = value; return value; },
  removeValue(key) { delete memory[key]; }
};
const Settings = load('src/components/Settings.vue', {
  '../utils/storage': storage,
  '../utils/event': { EventBus: { $emit: name => events.push(name), $on() {}, $off() {} } }
}).default;
const original = { car: 'IONIQ_BEV', capacity: 28, consumption: 15, soc: 30, email: 'a@example.com' };
const current = { car: 'KONA_EV', capacity: 64, consumption: 18, soc: 40, email: 'b@example.com' };
const element = (page, id) => page.settings.reduce((all, group) => all.concat(group.elements), []).find(item => item.id === id);

function respondSettings(settings) {
  const request = pending.shift();
  assert(request, 'expected a pending settings request');
  assert.strictEqual(request.method, 'GET');
  const data = Object.assign({}, settings);
  if (request.url.startsWith('https://api.evnotify.de/')) {
    data.socThreshold = data.soc;
    delete data.soc;
    request.respond(200, data);
  } else request.respond(200, { settings: data });
}

function fixture(version, failedInitialLoad = false) {
  assert.strictEqual(pending.length, 0, 'previous case must finish its requests');
  sent.length = writes.length = events.length = 0;
  memory.user = { akey: 'AAAAAA', token: 'token-a', apiVersion: version };
  memory.settings = original;
  const client = new Client('AAAAAA', 'token-a', version);
  const page = instance(Settings, { $root: { EVNotify: client }, $router: { push() {} } });
  page.loadSettings();
  if (failedInitialLoad) pending.shift().respond(503, {});
  else respondSettings(original);
  return { page, client };
}

const changes = {
  account(page, client) { client.setVersion(client.version); client.akey = 'BBBBBB'; client.token = 'token-b'; },
  backend(page, client) { client.setVersion(client.version === 'V3' ? 'V2' : 'V3'); },
  roundTrip(page, client) {
    const version = client.version;
    client.setVersion(version === 'V3' ? 'V2' : 'V3');
    client.setVersion(version);
  },
  replacement(page, client) { page.$root.EVNotify = new Client(client.akey, client.token, client.version); },
  token(page, client) { client.token = 'renewed-token'; },
  baseUrl(page, client) { client.baseUrl = 'https://other.example/'; },
  logout(page) { page.logout(); },
  destroy(page) { Settings.beforeDestroy.call(page); }
};

for (const version of ['V2', 'V3']) {
  for (const stage of ['load', 'read', 'write', 'refresh']) {
    for (const name of Object.keys(changes)) {
      for (const failed of [false, true]) {
        const { page, client } = fixture(version);
        let loadCallbacks = 0;
        element(page, 'email').value = 'edited-a@example.com';
        if (stage === 'load') page.loadSettings(() => { loadCallbacks++; });
        else {
          page.saveSettings();
          if (stage !== 'read') respondSettings(original);
          if (stage === 'refresh') pending.shift().respond(200, {});
        }
        assert.strictEqual(pending.length, 1);
        const request = pending.shift();
        changes[name](page, client);
        const active = page.$root.EVNotify;
        if (name !== 'logout') memory.user = { akey: active.akey, token: active.token, apiVersion: active.version };
        memory.settings = current;
        const before = { sent: sent.length, writes: writes.length, events: events.length,
          localSettings: page.localSettings, error: page.settingsError, saving: page.saving, loading: page.settingsLoading };
        const data = stage === 'write' ? {} : request.url.startsWith('https://api.evnotify.de/') ? original : { settings: original };
        request.respond(failed ? 503 : 200, failed ? { message: 'Stale failure' } : data);
        const label = `${version}/${stage}/${name}/${failed ? 'failure' : 'success'}`;
        assert.strictEqual(sent.length, before.sent, label + ': stale callbacks must not continue the request chain');
        assert.strictEqual(writes.length, before.writes, label + ': stale callbacks must not write storage');
        assert.strictEqual(events.length, before.events, label + ': stale callbacks must not emit save events');
        assert.strictEqual(memory.settings, current, label + ': current account cache must survive');
        assert.strictEqual(page.localSettings, before.localSettings, label + ': stale callbacks must not update the form');
        assert.strictEqual(element(page, 'email').value, 'edited-a@example.com');
        assert.strictEqual(loadCallbacks, 0, label + ': stale loads must not invoke consumers');
        if (name === 'logout' || name === 'destroy') {
          assert.strictEqual(page.settingsError, before.error);
          assert.strictEqual(page.saving, before.saving);
          assert.strictEqual(page.settingsLoading, before.loading);
          page.loadSettings(); page.saveSettings();
        } else {
          assert(page.settingsError.includes('session changed'), label + ': active views must explain cancellation');
          assert.strictEqual(page.saving, false);
          assert.strictEqual(page.settingsLoading, false);
          page.saveSettings();
        }
        assert.strictEqual(sent.length, before.sent, label + ': old edits must stay blocked');
      }
    }
  }
}

for (const version of ['V2', 'V3']) {
  const cached = fixture(version, true).page;
  assert(cached.settingsError.includes('Could not load'));
  assert.strictEqual(element(cached, 'email').value, original.email);
  element(cached, 'email').value = 'cached-edit@example.com';
  cached.saveSettings();
  respondSettings(original);
  const cachedWrite = pending.shift();
  const cachedBody = JSON.parse(cachedWrite.body);
  assert.strictEqual((version === 'V3' ? cachedBody : cachedBody.settings).email, 'cached-edit@example.com');
  cachedWrite.respond(503, {});
  assert.strictEqual(cached.saving, false);
  assert.strictEqual(element(cached, 'email').value, 'cached-edit@example.com');

  const { page, client } = fixture(version);
  element(page, 'email').value = 'edited-a@example.com';
  changes.account(page, client);
  page.saveSettings();
  assert.strictEqual(pending.length, 0, 'a session change before saving must reject old edits');
  assert(page.settingsError.includes('session changed'));
  page.loadSettings();
  pending.shift().respond(503, {});
  page.saveSettings();
  assert.strictEqual(pending.length, 0, 'failed reloads must not authorize old edits for a new account');
  page.loadSettings();
  respondSettings(current);
  assert.strictEqual(page.settingsError, '');
  assert.strictEqual(element(page, 'email').value, current.email);
  element(page, 'email').value = 'edited-b@example.com';
  page.saveSettings();
  respondSettings(current);
  const write = pending.shift();
  assert.strictEqual(write.method, version === 'V3' ? 'PATCH' : 'PUT');
  const body = JSON.parse(write.body);
  if (version === 'V3') {
    assert.strictEqual(write.url, 'https://api.evnotify.de/settings/BBBBBB');
    assert.strictEqual(write.headers.Authorization, 'BBBBBB token-b');
    assert.strictEqual(body.email, 'edited-b@example.com');
    assert.strictEqual(body.capacity, current.capacity);
  } else {
    assert.strictEqual(body.akey, 'BBBBBB');
    assert.strictEqual(body.token, 'token-b');
    assert.strictEqual(body.settings.email, 'edited-b@example.com');
  }
  write.respond(503, {});
  assert(page.settingsError.includes('Could not save'));
  assert.strictEqual(element(page, 'email').value, 'edited-b@example.com');
  page.saveSettings();
  respondSettings(current);
  pending.shift().respond(200, {});
  respondSettings(Object.assign({}, current, { email: 'edited-b@example.com' }));
  assert.strictEqual(page.saving, false);
  assert.strictEqual(memory.settings.email, 'edited-b@example.com');
  assert.strictEqual(events[events.length - 1], 'unsave');
}

for (const version of ['V2', 'V3']) {
  for (const failed of [false, true]) {
    const { page, client } = fixture(version);
    element(page, 'email').value = 'edited-a@example.com';
    page.showSaveIcon();
    const session = page.settingsSession;
    const before = { reads: sent.length, events: events.slice() };
    page.password = 'password';
    page.resetToken();
    pending.shift().respond(failed ? 503 : 200, failed ? {} : { token: 'new-token' });
    const token = failed ? 'token-a' : 'new-token';
    assert.strictEqual(client.token, token);
    assert.strictEqual(memory.user.token, token);
    assert.strictEqual(page.settingsSession.token, token);
    if (failed) assert.strictEqual(page.settingsSession, session);
    assert.strictEqual(sent.length, before.reads + 1, 'token reset must not reload settings');
    assert.strictEqual(element(page, 'email').value, 'edited-a@example.com');
    assert.deepStrictEqual(events, before.events, 'token reset must preserve the unsaved indicator');
    assert.strictEqual(page.snackbarType, failed ? 'error' : 'success');
    page.saveSettings();
    respondSettings(original);
    const write = pending.shift();
    const body = JSON.parse(write.body);
    assert.strictEqual((version === 'V3' ? body : body.settings).email, 'edited-a@example.com');
    if (version === 'V3') assert.strictEqual(write.headers.Authorization, 'AAAAAA ' + token);
    else assert.strictEqual(body.token, token);
    write.respond(200, {});
    respondSettings(Object.assign({}, original, { email: 'edited-a@example.com' }));
    assert.strictEqual(page.settingsError, '');
    assert.strictEqual(memory.settings.email, 'edited-a@example.com');
    assert.strictEqual(events[events.length - 1], 'unsave');
  }

  for (const name of Object.keys(changes)) {
    for (const failed of [false, true]) {
      const { page, client } = fixture(version);
      element(page, 'email').value = 'edited-a@example.com';
      const session = page.settingsSession;
      page.password = 'password';
      page.resetToken();
      const request = pending.shift();
      changes[name](page, client);
      const active = page.$root.EVNotify;
      if (name !== 'logout') memory.user = { akey: active.akey, token: active.token, apiVersion: active.version };
      const before = { token: active.token, user: memory.user, writes: writes.length, events: events.length };
      request.respond(failed ? 503 : 200, failed ? {} : { token: 'stale-token' });
      const label = `${version}/reset/${name}/${failed ? 'failure' : 'success'}`;
      assert.strictEqual(page.settingsSession, session, label + ': stale resets must not rebind the form');
      assert.strictEqual(memory.user, before.user, label + ': stale resets must not replace stored credentials');
      assert.strictEqual(writes.length, before.writes, label + ': stale resets must not write storage');
      assert.strictEqual(events.length, before.events, label + ': stale resets must not change the unsaved indicator');
      assert.strictEqual(element(page, 'email').value, 'edited-a@example.com');
      if (name !== 'logout' && name !== 'destroy') {
        assert.strictEqual(active.token, before.token, label + ': stale resets must not replace active credentials');
      }
      const count = sent.length;
      page.saveSettings();
      assert.strictEqual(sent.length, count, label + ': stale edits must remain blocked');
    }
  }

  const { page, client } = fixture(version);
  const oldSession = page.settingsSession;
  changes.account(page, client);
  memory.user = { akey: client.akey, token: client.token, apiVersion: version };
  page.password = 'password';
  page.resetToken();
  pending.shift().respond(200, { token: 'new-account-token' });
  assert.strictEqual(page.settingsSession, oldSession, 'a valid reset must not authorize edits from an older session');
  page.saveSettings();
  assert.strictEqual(pending.length, 0);
  assert(page.settingsError.includes('session changed'));
}

assert.strictEqual(pending.length, 0);
console.log('Settings session isolation and recovery tests passed');
