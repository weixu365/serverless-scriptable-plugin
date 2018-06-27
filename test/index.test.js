const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const Bluebird = require('bluebird');
const Scriptable = require('../index');

describe('ScriptablePluginTest', () => {
  it('should run command', () => {
    const randomString = `current time ${new Date().getTime()}`;
    const scriptable = new Scriptable(serviceWithScripts({ test: `echo ${randomString}` }));

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => {
        console.log('checking file', scriptable.stdout.name);
        expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).string(randomString);
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).equal('');
      });
  });

  it('should able to run multiple commands', () => {
    const randomString = `current time ${new Date().getTime()}`;
    const randomString2 = `current time 2 ${new Date().getTime()}`;
    const scriptable = new Scriptable(serviceWithScripts({
      test: [
        `echo ${randomString}`,
        `echo ${randomString2}`,
      ],
    }));

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => {
        const consoleOutput = fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' });
        expect(consoleOutput).string(`${randomString}\n${randomString2}`);
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).equal('');
      });
  });

  it('should support color in child process', () => {
    const serverless = serviceWithScripts({ test: 'test/scripts/check-is-support-colors.js' });
    const scriptable = new Scriptable(serverless);

    return runScript(scriptable, 'test')
      .then(() => expect(serverless.supportColorLevel).greaterThan(0));
  });

  it('should print error message when failed to run command', () => {
    const scriptable = new Scriptable(serviceWithScripts({ test: 'not-exists' }));
    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => expect(false).equal(true, 'Should throw exception when command not exists'))
      .catch(() => {
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).string('/bin/sh');
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).string('not-exists:');
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).string('not found');
        expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).equal('');
      });
  });

  it('should run javascript', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithScripts({ test: scriptFile.name });
    const scriptable = new Scriptable(serverless);

    return runScript(scriptable, 'test')
      .then(() => expect(serverless.service.artifact).equal('test.zip'));
  });

  it('should able to import modules in javascript', () => {
    const scriptModuleFile = tmp.fileSync({ postfix: '.js' });
    const moduleName = path.basename(scriptModuleFile.name);
    fs.writeFileSync(scriptModuleFile.name, 'module.exports = { test: () => "hello" }');

    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, `
      const m = require('./${moduleName}');
      const path = require('path');
      const modulePath = require.resolve('./${moduleName}');
      serverless.service.artifact = m.test() + path.basename(modulePath);
    `);

    const serverless = serviceWithScripts({ test: scriptFile.name });
    const scriptable = new Scriptable(serverless);

    return runScript(scriptable, 'test')
      .then(() => expect(serverless.service.artifact).equal(`hello${moduleName}`));
  });

  it('should wait for async method to be finished', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    const script = 'require("bluebird").delay(100).then(() => serverless.service.artifact = "test.zip")';
    fs.writeFileSync(scriptFile.name, script);

    const serverless = serviceWithScripts({ test: scriptFile.name });
    const scriptable = new Scriptable(serverless);

    return Bluebird.resolve(runScript(scriptable, 'test'))
      .then(() => expect(serverless.service.artifact).equal('test.zip'));
  });

  it('should run multiple javascript files', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const scriptFile2 = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile2.name, 'serverless.service.provider = "AWS";');

    const serverless = serviceWithScripts({ test: [scriptFile.name, scriptFile2.name] });
    const scriptable = new Scriptable(serverless);

    return runScript(scriptable, 'test')
      .then(() => {
        expect(serverless.service.artifact).equal('test.zip');
        expect(serverless.service.provider).equal('AWS');
      });
  });

  it('should run any executable file', () => {
    const randomString = `current time ${new Date().getTime()}`;

    const scriptFile = tmp.fileSync({ postfix: '.sh' });
    fs.chmodSync(scriptFile.name, '755');
    fs.writeFileSync(scriptFile.name, `echo ${randomString}`);
    fs.closeSync(scriptFile.fd);

    const serverless = serviceWithScripts({ test: scriptFile.name });
    const scriptable = new Scriptable(serverless);

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => {
        expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).string(randomString);
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).equal('');
      })
      .catch(() => {
        const stdout = fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' });
        const stderr = fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' });

        expect(true).equals(false, `stdout: ${stdout}\n stderr: ${stderr}`);
      });
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

    return runScript(scriptable, 'test')
      .then(() => expect(serverless.service.artifact).equal('test.zip'));
  });

  it('should skip hook registration when no hook scripts', () => {
    const serverless = { service: {} };
    const scriptable = new Scriptable(serverless);

    expect(scriptable.hooks).deep.equal({});
  });

  it('manual check: should run command with color', () => {
    const scriptable = new Scriptable(serviceWithScripts({ test: 'node test/scripts/test-with-color.js' }));

    return runScript(scriptable, 'test');
  });

  it('manual check: should run js with color', () => {
    const scriptable = new Scriptable(serviceWithScripts({ test: 'test/scripts/test-with-color.js' }));

    return runScript(scriptable, 'test');
  });

  function runScript(scriptable, event) {
    return Bluebird.resolve(scriptable.hooks[event]());
  }

  function serviceWithScripts(scriptHooks) {
    return serviceWithCustom({ scriptHooks });
  }

  function serviceWithCustom(custom) {
    return { service: { custom } };
  }
});
