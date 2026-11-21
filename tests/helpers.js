const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// Execute the real component scripts and utilities without adding a DOM/test runner.
function load(file, overrides = {}, globals = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, '..', file);
  if (cache.has(filename)) return cache.get(filename).exports;
  let source = fs.readFileSync(filename, 'utf8');
  if (filename.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const { code } = babel.transformSync(source, {
    filename, babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const resolve = name => {
    if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name];
    if (!name.startsWith('.')) return require(name);
    let target = path.resolve(path.dirname(filename), name);
    if (!path.extname(target)) target += fs.existsSync(target + '.js') ? '.js' : '.vue';
    if (!/\.(js|vue)$/.test(target)) return '';
    return load(path.relative(path.resolve(__dirname, '..'), target), overrides, globals, cache);
  };
  const execute = new Function('require', 'module', 'exports', 'window', 'navigator', 'Date', 'setTimeout', 'XMLHttpRequest', code);
  execute(resolve, mod, mod.exports, globals.window || {}, globals.navigator || {}, globals.Date || Date, globals.setTimeout || setTimeout, globals.XMLHttpRequest);
  return mod.exports;
}

function instance(component, extra = {}) {
  const page = Object.assign(component.data ? component.data() : {}, extra);
  Object.entries(component.methods || {}).forEach(([name, method]) => { page[name] = method.bind(page); });
  Object.entries(component.computed || {}).forEach(([name, get]) => Object.defineProperty(page, name, { get: () => get.call(page), configurable: true }));
  return page;
}

module.exports = { load, instance };
