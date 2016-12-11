const expect = require('chai').expect;
const fs = require('fs');
const tmp = require('tmp');
const Scriptable = require('./../index');

describe('ScriptablePluginTest', () => {
  it('should run command', () => {
    var randomString = `current time ${new Date().getTime()}`;
    var scriptable = new Scriptable(
      { service: 
        {custom: {
          scriptHooks: {
            test: `echo ${randomString}`}}}});
    scriptable.stdout = tmp.fileSync({prefix: 'stdout-'});
    scriptable.stderr = tmp.fileSync({prefix: 'stderr-'});

    
    scriptable.runScript("test")();

    expect(fs.readFileSync(scriptable.stdout.name, {encoding: 'utf-8'})).string(randomString);
    expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).equal('');
  });

  it('should run command with color', () => {
    var scriptable = new Scriptable({ service: 
        {custom: {
          scriptHooks: {
            test: `node examples/test-with-color.js`}}}});

    scriptable.runScript("test")();
  });

  it('should run js with color', () => {
    var scriptable = new Scriptable({ service: 
        {custom: {
          scriptHooks: {
            test: `examples/test-with-color.js`}}}});

    scriptable.runScript("test")();
  });

  it('should support color in child process', () => {
        var serverless = { service: { 
        package: {},
        custom: {
          scriptHooks: {
            test: `examples/check-is-support-colors.js`}}}};
        var scriptable = new Scriptable(serverless);

    scriptable.runScript("test")();
    expect(serverless.supportColorLevel).to.greaterThan(0);
  });

  it('should print error message when run command', () => {
    var scriptable = new Scriptable({ service: 
        {custom: {
          scriptHooks: {
            does_exist: `echo`}}}});
    scriptable.stdout = tmp.fileSync({prefix: 'stdout-'});
    scriptable.stderr = tmp.fileSync({prefix: 'stderr-'});

    try{
      scriptable.runScript('not_exists')();
    } catch(err) {

      expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).string('/bin/sh');
      expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).string('not-exists:');
      expect(fs.readFileSync(scriptable.stderr.name, {encoding: 'utf-8'})).string('not found');
      expect(fs.readFileSync(scriptable.stdout.name, {encoding: 'utf-8'})).equal('');
    }
  });

  it('should run javascript', () => {
        var scriptFile = tmp.fileSync();
        fs.writeFileSync(scriptFile.name, 'serverless.service.package.artifact = "test.zip";');
        var serverless = { service: { 
        package: {},
        custom: {
          scriptHooks: {
            test: scriptFile.name}}}};    var scriptable = new Scriptable(serverless);
    scriptable.runScript("test")();

    expect(serverless.service.package.artifact).to.equal('test.zip');
  });
});
