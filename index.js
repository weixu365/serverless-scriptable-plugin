'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

class Scriptable {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {};

    this.stdin = process.stdin;
    this.stdout = process.stdout;
    this.stderr = process.stderr;

    Object.keys(this.getScriptHooks()).forEach((event) => {
      this.hooks[event] = this.runScript(event);
    }, this);
  }

  getScriptHooks() {
    const custom = this.serverless.service.custom;
    return custom && custom.scriptHooks ? custom.scriptHooks : {};
  }

  runScript(event) {
    return () => {
      const hookScript = this.getScriptHooks()[event];

      if (fs.existsSync(hookScript)) {
        return this.runJavascriptFile(hookScript);
      }

      return this.runCommand(hookScript);
    };
  }

  runCommand(hookScript) {
    console.log(`Running command: ${hookScript}`);
    return execSync(hookScript, { stdio: [this.stdin, this.stdout, this.stderr] });
  }

  runJavascriptFile(scriptFile) {
    console.log(`Running javascript file: ${scriptFile}`);
    const sandbox = {
      require,
      console,
      process,
      serverless: this.serverless,
      options: this.options,
      __filename: scriptFile,
      __dirname: path.dirname(fs.realpathSync(scriptFile)),
    };

    const scriptCode = fs.readFileSync(scriptFile);
    const script = vm.createScript(scriptCode, scriptFile);
    const context = vm.createContext(sandbox);

    script.runInContext(context);
  }
}

module.exports = Scriptable;
