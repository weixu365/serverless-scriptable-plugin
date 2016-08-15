const execSync = require('child_process').execSync;

module.exports = {
    execSync(description, command)
    {
        console.log(`${description}: ${command}`);
        var output = execSync(command).toString('utf8');

        if (output) {
            console.log(output);
        }
    }
};