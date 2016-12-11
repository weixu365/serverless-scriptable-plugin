const supportsColor = require('supports-color');

console.log(`check if support colors in current process? ${JSON.stringify(supportsColor)}`);
serverless.supportColorLevel = supportsColor.level;

if (supportsColor.level > 0) {
  console.log('Support colors in current process');
} else {
  console.error('FAILED: DO NOT SUPPORT colors');
}
