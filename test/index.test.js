const chai = require('chai');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const Bluebird = require('bluebird');
const Scriptable = require('../index');

const { expect } = chai;
chai.config.truncateThreshold = 0;

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

  it('should able to suppress outputs', () => {
    const scriptable = new Scriptable(serviceWithScripts({
      test: [
        'bash -c "echo this should not be visible on console"',
      ],
      showCommands: false,
      showStdoutOutput: false,
      showStderrOutput: false,
    }));

    return runScript(scriptable, 'test')
      .then(() => {
        console.log('Should has no any output');
      });
  });

  it('Manual check: should able to print all outputs', () => {
    const randomString = `current time ${new Date().getTime()}`;
    const randomString2 = `current time 2 ${new Date().getTime()}`;
    const scriptable = new Scriptable(serviceWithScripts({
      test: [
        `echo ${randomString}`,
        `echo ${randomString2}`,
      ],
    }));

    return runScript(scriptable, 'test')
      .then(() => {
        console.log('Done');
      });
  });

  it('should support color in child process', () => {
    const serverless = serviceWithScripts({ test: 'test/scripts/check-is-support-colors.js' });
    const scriptable = new Scriptable(serverless);

    process.env.CI = 'Github_Action';
    process.env.TRAVIS = 1;
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

  it('should run javascript in quiet mode', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithScripts({
      test: scriptFile.name,
      showCommands: false,
      showStdoutOutput: false,
      showStderrOutput: false,
    });
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

  it('should able to use default classes from node in javascript', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'new URL("http://localhost"); serverless.service.artifact = "test.zip";');

    const serverless = serviceWithScripts({ test: scriptFile.name });
    const scriptable = new Scriptable(serverless);

    return runScript(scriptable, 'test')
      .then(() => expect(serverless.service.artifact).equal('test.zip'));
  });

  it('should able to use exports object in javascript', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(
      scriptFile.name,
      `Object.defineProperty(exports, "__esModule", { value: true });
      serverless.service.artifact = "test.zip";`,
    );

    const serverless = serviceWithScripts({ test: scriptFile.name });
    const scriptable = new Scriptable(serverless);

    return runScript(scriptable, 'test')
      .then(() => expect(serverless.service.artifact).equal('test.zip'));
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

  it('should suppress stack track when failed to run executable file', () => {
    const serverless = serviceWithScripts({ test: 'non-exist-file' });
    const scriptable = new Scriptable(serverless);

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => { throw new Error('Should throw exception'); })
      .catch(err => {
        chai.expect(err.stack).equals(null);
        expect(err.message).equals('Failed to run command: non-exist-file');
      });
  });

  it('should support serverless variables when run javascript', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithCustom({
      scriptName: scriptFile.name,
      scriptHooks: { test: scriptFile.name },
    });

    const scriptable = new Scriptable(serverless);

    return runScript(scriptable, 'test')
      .then(() => expect(serverless.service.artifact).equal('test.zip'));
  });

  it('should able to load scriptHooks', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithCustom({
      scriptName: scriptFile.name,
      scriptHooks: {
        showCommands: false,
        showStdoutOutput: false,
        showStderrOutput: false,
        test: 'echo legacy-script',
      },
    });

    const scriptable = new Scriptable(serverless);

    expect(scriptable.showCommands).equal(false);
    expect(scriptable.stdout).equal('ignore');
    expect(scriptable.stderr).equal('ignore');

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => {
        expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).string('legacy-script');
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).equal('');
      });
  });

  it('should able to load scriptable configs', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithCustom({
      scriptName: scriptFile.name,
      scriptable: {
        showCommands: true,
        showStdoutOutput: true,
        showStderrOutput: true,
        hooks: {
          test: 'echo scriptable-script',
        },
        commands: {
          customCommand: 'echo custom command',
        },
      },
    });

    const scriptable = new Scriptable(serverless);

    expect(scriptable.showCommands).equal(true);
    expect(scriptable.stdout).equal(process.stdout);
    expect(scriptable.stderr).equal(process.stderr);

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => {
        expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).string('scriptable-script');
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).equal('');
      });
  });

  it('should support scriptHooks and scriptable configs', () => {
    const scriptFile = tmp.fileSync({ postfix: '.js' });
    fs.writeFileSync(scriptFile.name, 'serverless.service.artifact = "test.zip";');

    const serverless = serviceWithCustom({
      scriptName: scriptFile.name,
      scriptHooks: {
        showCommands: false,
        showStdoutOutput: false,
        showStderrOutput: false,
        test: 'echo legacy-script',
      },
      scriptable: {
        showCommands: true,
        showStdoutOutput: true,
        showStderrOutput: true,
        hooks: {
          test: 'echo scriptable-script',
        },
        commands: {
          customCommand: 'echo custom command',
        },
      },
    });

    const scriptable = new Scriptable(serverless);

    expect(scriptable.showCommands).equal(true);
    expect(scriptable.stdout).equal(process.stdout);
    expect(scriptable.stderr).equal(process.stderr);

    scriptable.stdout = tmp.fileSync({ prefix: 'stdout-' });
    scriptable.stderr = tmp.fileSync({ prefix: 'stderr-' });

    return runScript(scriptable, 'test')
      .then(() => {
        expect(fs.readFileSync(scriptable.stdout.name, { encoding: 'utf-8' })).string('scriptable-script');
        expect(fs.readFileSync(scriptable.stderr.name, { encoding: 'utf-8' })).equal('');
      });
  });

  it('should skip hook registration when no hook scripts', () => {
    const serverless = { service: {} };
    const scriptable = new Scriptable(serverless);

    expect(scriptable.hooks).deep.equal({});
  });

  it('should able to check boolean configs', () => {
    const serverless = { service: {} };
    const scriptable = new Scriptable(serverless);

    expect(scriptable.isFalse(undefined)).equal(false);
    expect(scriptable.isFalse(null)).equal(false);
    expect(scriptable.isFalse(true)).equal(false);
    expect(scriptable.isFalse('0')).equal(false);
    expect(scriptable.isFalse(1)).equal(false);

    expect(scriptable.isFalse(false)).equal(true);
    expect(scriptable.isFalse(0)).equal(true);
  });

  it('should able to get the first non-undefined value', () => {
    const serverless = { service: {} };
    const scriptable = new Scriptable(serverless);

    expect(scriptable.first(undefined, false)).equal(false);
    expect(scriptable.first(null, false)).equal(null);
    expect(scriptable.first(true, false)).equal(true);
    expect(scriptable.first(false, false)).equal(false);
    expect(scriptable.first(0, false)).equal(0);
    expect(scriptable.first(1, false)).equal(1);
  });

  it('manual check: should run command with color', () => {
    const scriptable = new Scriptable(serviceWithScripts({ test: 'node test/scripts/test-with-color.js' }));
    return runScript(scriptable, 'test');
  }).timeout(5000);

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
