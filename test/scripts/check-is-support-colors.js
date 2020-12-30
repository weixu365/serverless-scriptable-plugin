const colorSupport = require('color-support');

const supportsColor = colorSupport({ ignoreTTY: true });

console.log(`check if support colors in current process? ${JSON.stringify(supportsColor)}`);

if (typeof serverless !== 'undefined' && serverless !== null) {
  serverless.supportColorLevel = supportsColor.level;

  if (serverless.supportColorLevel > 0) {
    console.log('Support colors in current process');
  } else {
    console.error('FAILED: DO NOT SUPPORT colors');
  }
} else {
  console.error('IGNORED: not running under serverless');
}
