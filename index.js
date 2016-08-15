'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

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
            var scriptFile = customs.scriptHooks[event];
            this.hooks[event] = this.runScript(scriptFile);
        }, this);
    }

    runScript(scriptFile) {
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

        return ()=> {
            script.runInContext(context);
        }
    }
}

module.exports = Scriptable;