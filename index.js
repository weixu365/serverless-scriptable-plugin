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

        var customs = this.serverless.service.custom;
        if(!customs || !customs.scriptHooks) {
            return;
        }

        Object.keys(customs.scriptHooks).forEach(function(event) {
            var hookScript = customs.scriptHooks[event];
            this.hooks[event] = this.runScript(hookScript);
        }, this);
    }

    runScript(hookScript) {
        if(fs.existsSync(hookScript)) {
            return this.runJavascriptFile(hookScript);
        } else {
            return this.runCommand(hookScript);
        }
    }

    runCommand(hookScript) {
        return () => {
            console.log(`Running script: ${hookScript}`);
            execSync(hookScript, {stdio: 'inherit'});
        }
    }

    runJavascriptFile(scriptFile) {
        const sandbox = {
            require: require,
            console: console,
            serverless: this.serverless,
            options: this.options,
            __filename: scriptFile,
            __dirname: path.dirname(fs.realpathSync(scriptFile))
        };

        var scriptCode = fs.readFileSync(scriptFile);
        const script = new vm.createScript(scriptCode, scriptFile);
        const context = new vm.createContext(sandbox);

        return () => {
            script.runInContext(context);
        }
    }

    log(message) {
        if(message && message.length > 0) {
            console.log(message);
        }
    }
}

module.exports = Scriptable;
