'use strict';

const vm = require('vm');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const Bluebird = require('bluebird');
const { execSync } = require('child_process');

// Error without stack trace
class SimpleError extends Error {
  constructor(msg) {
    super(msg);
    this.stack = null;
  }
}

class Scriptable {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {};
    this.commands = {};

    this.stdin = process.stdin;
    this.stdout = process.stdout;
    this.stderr = process.stderr;
    this.showCommands = true;

    const scriptable = this.getMergedConfig();

    if (this.isFalse(scriptable.showCommands)) {
      this.showCommands = false;
    }

    if (this.isFalse(scriptable.showStdoutOutput)) {
      console.log('Not showing command output because showStdoutOutput is false');
      this.stdout = 'ignore';
    }

    if (this.isFalse(scriptable.showStderrOutput)) {
      console.log('Not showing command error output because showStderrOutput is false');
      this.stderr = 'ignore';
    }

    this.setupHooks(scriptable.hooks);
    this.setupCustomCommands(scriptable.commands);
  }

  getMergedConfig() {
    const legacyScriptHooks = this.getScripts('scriptHooks') || {};
    const scriptable = this.getScripts('scriptable') || {};

    const hooks = { ...legacyScriptHooks, ...scriptable.hooks };
    delete hooks.showCommands;
    delete hooks.showStdoutOutput;
    delete hooks.showStderrOutput;

    return {
      showCommands: this.first(scriptable.showCommands, legacyScriptHooks.showCommands),
      showStdoutOutput: this.first(scriptable.showStdoutOutput, legacyScriptHooks.showStdoutOutput),
      showStderrOutput: this.first(scriptable.showStderrOutput, legacyScriptHooks.showStderrOutput),
      hooks,
      commands: scriptable.commands || {},
    };
  }

  setupHooks(hooks) {
    // Hooks are run at serverless lifecycle events.
    Object.keys(hooks).forEach(event => {
      this.hooks[event] = this.runScript(hooks[event]);
    }, this);
  }

  setupCustomCommands(commands) {
    // Custom Serverless commands would run by `npx serverless <command-name>`
    Object.keys(commands).forEach(name => {
      this.hooks[`${name}:command`] = this.runScript(commands[name]);

      this.commands[name] = {
        usage: `Run ${commands[name]}`,
        lifecycleEvents: ['command'],
      };
    }, this);
  }

  isFalse(val) {
    return val != null && !val;
  }

  first(...vals) {
    return vals.find(val => typeof val !== 'undefined');
  }

  getScripts(namespace) {
    const { custom } = this.serverless.service;
    return custom && custom[namespace];
  }

  runScript(eventScript) {
    return () => {
      const scripts = Array.isArray(eventScript) ? eventScript : [eventScript];

      return Bluebird.each(scripts, script => {
        if (fs.existsSync(script) && path.extname(script) === '.js') {
          return this.runJavascriptFile(script);
        }

        return this.runCommand(script);
      });
    };
  }

  runCommand(script) {
    if (this.showCommands) {
      console.log(`Running command: ${script}`);
    }

    try {
      return execSync(script, { stdio: [this.stdin, this.stdout, this.stderr] });
    } catch (err) {
      throw new SimpleError(`Failed to run command: ${script}`);
    }
  }

  runJavascriptFile(scriptFile) {
    if (this.showCommands) {
      console.log(`Running javascript file: ${scriptFile}`);
    }

    const buildModule = () => {
      const m = new Module(scriptFile, module.parent);
      m.exports = exports;
      m.filename = scriptFile;
      m.paths = Module._nodeModulePaths(path.dirname(scriptFile)).concat(module.paths);

      return m;
    };

    const globalProperties = Object.fromEntries(
      Object.getOwnPropertyNames(global).map(
        key => [key, global[key]],
      ),
    );
    delete globalProperties.globalThis;
    delete globalProperties.global;

    const sandbox = {
      ...globalProperties,
      module: buildModule(),
      require: id => sandbox.module.require(id),
      serverless: this.serverless,
      options: this.options,
      __filename: scriptFile,
      __dirname: path.dirname(fs.realpathSync(scriptFile)),
      exports: Object(),
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
