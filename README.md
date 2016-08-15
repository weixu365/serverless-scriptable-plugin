What's the plugins for?
------------------------


This plugin add script support to Serverless 1.0 which enables you to customize Serverless behavior without writing a plugin. 

It allows you to run nodejs script in any build stage.


Quick Start
-------------
1. Install

        npm install --save-dev serverless-scriptable-plugin
        
2. Add to Serverless config 

        plugins:
          - serverless-scriptable-plugin
    
        custom:
          scriptHooks:
            before:deploy:createDeploymentPackage: build/package.js

   Example File Structure
       
          Project Root 
              |___serverless.yml
              |___serverless.env.yml
              |___build
                  |___package.js
                  

Example
---------
1. Customized package behavior

   Currently, Serverless 1.0 package everything under service folder without any extra process. 
   There are serveral problems:
   
   - Not easy for transcompiling, e.g. using Babel/Typescript to transcompile code 
   - The default package is big because it packaged dev dependencies

   In babel-then-package-to-zip example, serverless will run customized package process: transcompile and package to zip
   
    ```js
    exec("Clean Up Environment", "rm -rf ._target lib *.zip &amp;&amp; mkdir -p lib");
    exec("Compiling", "node_modules/.bin/babel --presets es2015,react --plugins transform-async-to-generator,transform-runtime,transform-class-properties,transform-flow-strip-types -d lib/ src/");
       
    const packageBuilder = new PackageBuilder(servicePath);
    packageBuilder.addFolder("lib");
    packageBuilder.addDependenciesExclude(["node_modules/aws-sdk"]);
       
    packageBuilder.writeToFileSync(artifactFilePath);
    ```
