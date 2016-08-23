const BbPromise = require('bluebird');
const Zip = require('node-zip');
const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const fse = BbPromise.promisifyAll(require('fs-extra'));

module.exports = class PackageBuilder {
    constructor(baseFolder) {
        this.baseFolder = baseFolder;
        this.zip = new Zip();
    }

    walkDirSync(dirPath) {
        let filePaths = [];
        const list = fs.readdirSync(dirPath);
        list.forEach((filePathParam) => {
            let filePath = filePathParam;
            filePath = path.join(dirPath, filePath);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                filePaths = filePaths.concat(this.walkDirSync(filePath));
            } else {
                filePaths.push(filePath);
            }
        });

        return filePaths;
    }

    addFolder(folderPath) {
        this.walkDirSync(folderPath).forEach((filePath) => {
            const relativeFilePath = path.relative(this.baseFolder, filePath);
            const permissions = fs.statSync(filePath).mode;
            this.zip.file(relativeFilePath, fs.readFileSync(filePath), {unixPermissions: permissions});
        });
    }

    addDependenciesExclude(excluded) {
        var output = execSync("npm ls --prod=true --parseable=true --depth=0").toString("utf8");
        var dependencyFolders = output.split("\n");
        dependencyFolders.forEach((folder) => {
            const relativeFilePath = path.relative(this.baseFolder, folder);

            if (relativeFilePath.length > 0 && excluded.indexOf(relativeFilePath) < 0) {
                console.log("Add dependencies: " + relativeFilePath);
                this.addFolder(folder);
            }
        });
    }

    writeToFileSync(targetFile) {
        const data = this.zip.generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        fse.mkdirsSync(path.dirname(targetFile));
        fse.writeFileSync(targetFile, data);
    }
};
