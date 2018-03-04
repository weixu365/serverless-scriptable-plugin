const colorSupport = require('color-support');

const supportsColor = colorSupport({ ignoreTTY: true });

console.log(`check if support colors in current process? ${JSON.stringify(supportsColor)}`);
serverless.supportColorLevel = supportsColor.level;

if (serverless.supportColorLevel > 0) {
  console.log('Support colors in current process');
} else {
  console.error('FAILED: DO NOT SUPPORT colors');
}
