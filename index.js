'use strict';

const vm = require('vm');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const Bluebird = require('bluebird');
const { execSync } = require('child_process');

class Scriptable {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {};

    this.stdin = process.stdin;
    this.stdout = process.stdout;
    this.stderr = process.stderr;

    Object.keys(this.getScriptHooks()).forEach(event => {
      this.hooks[event] = this.runScript(event);
    }, this);
  }

  getScriptHooks() {
    const { custom } = this.serverless.service;
    return custom && custom.scriptHooks ? custom.scriptHooks : {};
  }

  runScript(event) {
    return () => {
      const hookScript = this.getScriptHooks()[event];

      const scripts = Array.isArray(hookScript) ? hookScript : [hookScript];

      return Bluebird.each(scripts, script => {
        if (fs.existsSync(script) && path.extname(script) === '.js') {
          return this.runJavascriptFile(script);
        }

        return this.runCommand(script);
      });
    };
  }

  runCommand(hookScript) {
    console.log(`Running command: ${hookScript}`);
    return execSync(hookScript, { stdio: [this.stdin, this.stdout, this.stderr] });
  }

  runJavascriptFile(scriptFile) {
    console.log(`Running javascript file: ${scriptFile}`);
    const buildModule = () => {
      const m = new Module(scriptFile, module.parent);
      m.exports = exports;
      m.filename = scriptFile;
      m.paths = Module._nodeModulePaths(path.dirname(scriptFile)).concat(module.paths);

      return m;
    };

    const sandbox = {
      module: buildModule(),
      require: id => sandbox.module.require(id),
      console,
      process,
      serverless: this.serverless,
      options: this.options,
      __filename: scriptFile,
      __dirname: path.dirname(fs.realpathSync(scriptFile)),
    };

    // See: https://github.com/nodejs/node/blob/7c452845b8d44287f5db96a7f19e7d395e1899ab/lib/internal/modules/cjs/helpers.js#L14
    sandbox.require.resolve = req => Module._resolveFilename(req, sandbox.module);

    const scriptCode = fs.readFileSync(scriptFile);
    const script = vm.createScript(scriptCode, scriptFile);
    const context = vm.createContext(sandbox);

    return script.runInContext(context);
  }
}

module.exports = Scriptable;
