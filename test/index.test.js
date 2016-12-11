const expect = require('chai').expect;
const fs = require('fs');
const tmp = require('tmp');
const Scriptable = require('../index');

describe('ScriptablePluginTest', () => {
  it('should run command', () => {
    const randomString = `current time ${new Date().getTime()}`;
    const scriptable = new Scriptable(serviceWithScripts({ test: `echo ${randomString}` }));

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    runScript(scriptable, 'test');

    expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).string(randomString);
    expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).equal('');
  });

  it('should support color in child process', () => {
    const serverless = serviceWithScripts({ test: 'test/scripts/check-is-support-colors.js' });
    const scriptable = new Scriptable(serverless);

    runScript(scriptable, 'test');

    expect(serverless.supportColorLevel).greaterThan(0);
  });

  it('should print error message when failed to run command', () => {
    const scriptable = new Scriptable(serviceWithScripts({ test: 'not-exists' }));
    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    try {
      runScript(scriptable, 'test');
      expect(false).equal(true, 'Should throw exception when command not exists');
    } catch (err) {
      expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).string('/bin/sh');
      expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).string('not-exists:');
      expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).string('not found');
      expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).equal('');
    }
  });

  it('should run javascript', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithScripts({ test: scriptFile.name });
    const scriptable = new Scriptable(serverless);
    runScript(scriptable, 'test');

    expect(serverless.service.artifact).equal('test.zip');
  });

  it('should support serverless variables when run javascript', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithCustom({
      scriptName: scriptFile.name,
      scriptHooks: { test: '${self:custom.scriptName}' },
    });

    const scriptable = new Scriptable(serverless);
    serverless.service.custom.scriptHooks.test = scriptFile.name;
    runScript(scriptable, 'test');

    expect(serverless.service.artifact).equal('test.zip');
  });

  it('should skip hook registration when no hook scripts', () => {
    const serverless = { service: {} };
    const scriptable = new Scriptable(serverless);

    expect(scriptable.hooks).deep.equal({});
  });

  it('manual check: should run command with color', () => {
    const scriptable = new Scriptable(serviceWithScripts({ test: 'node test/scripts/test-with-color.js' }));
    runScript(scriptable, 'test');
  });

  it('manual check: should run js with color', () => {
    const scriptable = new Scriptable(serviceWithScripts({ test: 'test/scripts/test-with-color.js' }));
    runScript(scriptable, 'test');
  });

  function runScript(scriptable, event) {
    return scriptable.hooks[event]();
  }

  function serviceWithScripts(scriptHooks) {
    return serviceWithCustom({ scriptHooks });
  }

  function serviceWithCustom(custom) {
    return { service: { custom } };
  }
});
