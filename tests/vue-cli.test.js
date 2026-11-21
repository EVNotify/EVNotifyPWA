const assert = require('assert');
const EventEmitter = require('events');
const run = require('../scripts/vue-cli');

function launch(openssl) {
  const runtime = new EventEmitter();
  runtime.versions = { openssl };
  runtime.execPath = '/runtime/node';
  let errorMessage = '';
  runtime.stderr = { write: message => { errorMessage += message; } };
  const child = new EventEmitter();
  child.kill = signal => { child.signal = signal; };
  let invocation;
  run(['serve', '--host', '127.0.0.1', '--port', '18081'], runtime, (command, args, options) => {
    invocation = { command, args, options };
    return child;
  });
  assert.strictEqual(invocation.command, runtime.execPath, 'use the same Node runtime as npm');
  assert.deepStrictEqual(invocation.options, { stdio: 'inherit' });
  assert.deepStrictEqual(invocation.args.slice(-5), ['serve', '--host', '127.0.0.1', '--port', '18081']);
  assert(invocation.args.some(arg => /vue-cli-service\.js$/.test(arg)));
  return { runtime, child, invocation, errorMessage: () => errorMessage };
}

for (const version of ['1.0.2s', '1.1.1', '3.0.0', '3.5.7']) {
  const test = launch(version);
  assert.strictEqual(test.invocation.args.includes('--openssl-legacy-provider'), version.startsWith('3.'));
  test.child.emit('exit', 0);
  assert.strictEqual(test.runtime.exitCode, 0);
  assert.strictEqual(test.runtime.listenerCount('SIGINT'), 0);
  assert.strictEqual(test.runtime.listenerCount('SIGTERM'), 0);
}
const failure = launch('1.0.2s');
failure.child.emit('exit', 7);
assert.strictEqual(failure.runtime.exitCode, 7, 'propagate build failures to npm and CI');
const missing = launch('3.5.7');
missing.child.emit('error', new Error('spawn failed'));
assert.strictEqual(missing.runtime.exitCode, 1);
assert(missing.errorMessage().includes('spawn failed'));
assert.strictEqual(missing.runtime.listenerCount('SIGINT'), 0);
for (const signal of ['SIGINT', 'SIGTERM']) {
  const test = launch('1.0.2s');
  test.runtime.emit(signal);
  assert.strictEqual(test.child.signal, signal, 'forward shutdown signals to the dev server');
  test.child.emit('exit', null, signal);
  assert.strictEqual(test.runtime.exitCode, 1, 'interrupted builds must not be reported as successful');
}
console.log('Node/OpenSSL launcher compatibility and failure tests passed');
