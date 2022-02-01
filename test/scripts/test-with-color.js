const colorSupport = require('color-support');

const supportsColor = colorSupport({ ignoreTTY: true });

if (!colorSupport) {
    console.log('color is not supported')
} else if (colorSupport.has16m) {
    console.log('\x1b[38;2;102;194;255msupport 16m colors\x1b[0m')
} else if (colorSupport.has256) {
    console.log('\x1b[38;5;119msupport 256 colors\x1b[0m')
} else if (colorSupport.hasBasic) {
    console.log('\x1b[31msupport basic colors\x1b[0m')
} else {
    console.log('should not reach here, but colors are not supported')
}
