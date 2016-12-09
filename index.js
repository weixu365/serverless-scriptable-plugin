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

        var customs = this.serverless.service.custom;
        if(!customs || !customs.scriptHooks) {
            return;
        }

        Object.keys(customs.scriptHooks).forEach(function(event) {
            var hookScript = customs.scriptHooks[event];
            this.hooks[event] = this.runScript(event);
        }, this);
    }

    getConfig() {
		return this.serverless.service.custom.scriptHooks;
	}

    runScript(event) {
        return () => {
            var hookScript = this.getConfig()[event];
            if(fs.existsSync(hookScript)) {
                return this.runJavascriptFile(hookScript);
            } else {
                return this.runCommand(hookScript);
            }
        }
    }

    runCommand(hookScript) {
        console.log(`Running script: ${hookScript}`);
        return execSync(hookScript, {stdio: [this.stdin, this.stdout, this.stderr]});
    }

    runJavascriptFile(scriptFile) {
        const sandbox = {
            require: require,
            console: console,
            process: process,
            serverless: this.serverless,
            options: this.options,
            __filename: scriptFile,
            __dirname: path.dirname(fs.realpathSync(scriptFile))
        };

        var scriptCode = fs.readFileSync(scriptFile);
        const script = new vm.createScript(scriptCode, scriptFile);
        const context = new vm.createContext(sandbox);
        script.runInContext(context);
    }
}

module.exports = Scriptable;
