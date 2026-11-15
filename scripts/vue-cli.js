const spawn = require('child_process').spawn;

// Node 8 uses OpenSSL 1; modern Node needs the legacy provider for webpack 4.
function run(args, runtime = process, spawnChild = spawn) {
  const nodeArgs = [];
  if (parseInt(runtime.versions.openssl, 10) >= 3) nodeArgs.push('--openssl-legacy-provider');
  nodeArgs.push(require.resolve('@vue/cli-service/bin/vue-cli-service.js'));
  nodeArgs.push.apply(nodeArgs, args);
  const child = spawnChild(runtime.execPath, nodeArgs, { stdio: 'inherit' });
  const interrupt = () => child.kill('SIGINT');
  const terminate = () => child.kill('SIGTERM');
  const finish = code => {
    runtime.removeListener('SIGINT', interrupt);
    runtime.removeListener('SIGTERM', terminate);
    runtime.exitCode = code == null ? 1 : code;
  };
  runtime.on('SIGINT', interrupt);
  runtime.on('SIGTERM', terminate);
  child.once('error', error => {
    runtime.stderr.write(error.message + '\n');
    finish(1);
  });
  child.once('exit', finish);
  return child;
}

if (require.main === module) run(process.argv.slice(2));
module.exports = run;
