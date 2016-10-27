const expect = require('chai').expect;
const mock = require('testdouble');
const fs = require('fs');
const tmp = require('tmp');
const Scriptable = require('./../index');

describe('ScriptablePluginTest', () => {

  it('should run command', () => {
    var scriptable = new Scriptable({service: {}});
    scriptable.log = mock.function();

    scriptable.runScript('echo test')();
    mock.verify(scriptable.log('test\n'));
  });

  it('should print error message when run command', () => {
    var scriptable = new Scriptable({service: {}});
    scriptable.log = mock.function();

    expect(scriptable.runScript('not-exists')).to.throw('Command failed: not-exists\n/bin/sh: not-exists: command not found\n');
    mock.verify(scriptable.log('/bin/sh: not-exists: command not found\n'));
  });

  it('should run javascript', () => {
    var serverless = {service: {package:{}}};
    var scriptable = new Scriptable(serverless);

    var scriptFile = tmp.fileSync();
    fs.writeFileSync(scriptFile.name, 'serverless.service.package.artifact = "test.zip";');

    scriptable.runScript(scriptFile.name)();

    expect(serverless.service.package.artifact).to.equal('test.zip');
  });
});

