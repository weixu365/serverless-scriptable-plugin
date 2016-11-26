const expect = require('chai').expect;
const fs = require('fs');
const tmp = require('tmp');
const Scriptable = require('./../index');

describe('ScriptablePluginTest', () => {
  it('should run command', () => {
    var scriptable = new Scriptable({ service: {} });
    scriptable.stdout = tmp.fileSync({prefix: 'stdout-'});
    scriptable.stderr = tmp.fileSync({prefix: 'stderr-'});

    var randomString = `current time ${new Date().getTime()}`;
    scriptable.runScript(`echo ${randomString}`)();

    expect(fs.readFileSync(scriptable.stdout.name, {encoding: 'utf-8'})).string(randomString);
    expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).equal('');
  });

  it('should run command with color', () => {
    var scriptable = new Scriptable({ service: {} });

    scriptable.runScript(`node examples/test-with-color.js`)();
  });

  it('should run js with color', () => {
    var scriptable = new Scriptable({ service: {} });

    scriptable.runScript(`examples/test-with-color.js`)();
  });

  it('should support color in child process', () => {
    var serverless = { service: { package: {} } };
    var scriptable = new Scriptable(serverless);

    scriptable.runScript(`examples/check-is-support-colors.js`)();
    expect(serverless.supportColorLevel).to.greaterThan(0);
  });

  it('should print error message when run command', () => {
    var scriptable = new Scriptable({ service: {} });
    scriptable.stdout = tmp.fileSync({prefix: 'stdout-'});
    scriptable.stderr = tmp.fileSync({prefix: 'stderr-'});

    try{
      scriptable.runScript('not-exists')();
    } catch(err) {
      expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).string('/bin/sh');
      expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).string('not-exists:');
      expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).string('not found');
      expect(fs.readFileSync(scriptable.stdout.name, {encoding: 'utf-8'})).equal('');
    }
  });

  it('should run javascript', () => {
    var serverless = { service: { package: {} } };
    var scriptable = new Scriptable(serverless);

    var scriptFile = tmp.fileSync();
    fs.writeFileSync(scriptFile.name, 'serverless.service.package.artifact = "test.zip";');

    scriptable.runScript(scriptFile.name)();

    expect(serverless.service.package.artifact).to.equal('test.zip');
  });
});

