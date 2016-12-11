const path = require('path');

const exec = require(path.join(__dirname, 'exec')).execSync;
const PackageBuilder = require(path.join(__dirname, 'PackageBuilder'));

const servicePath = serverless.config.servicePath;
const zipFileName = `${serverless.service.service}-${(new Date()).getTime().toString()}.zip`;
const artifactFilePath = path.join(servicePath, '.serverless', zipFileName);

console.log('Packing zip files for Lambda...');

exec('Clean Up Environment', 'rm -rf ._target lib *.zip && mkdir -p lib');
exec('Compiling', 'node_modules/.bin/babel --presets es2015,react -d lib/ src/');

const packageBuilder = new PackageBuilder(servicePath);
packageBuilder.addFolder('lib');
packageBuilder.addDependenciesExclude(['node_modules/aws-sdk']);

packageBuilder.writeToFileSync(artifactFilePath);

// After set the artifact which serverless need to deploy, serverless will skip the default package process
serverless.service.package.artifact = artifactFilePath;
