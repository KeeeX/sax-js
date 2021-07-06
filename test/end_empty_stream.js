const tap = require("tap");
const saxStream = require("../lib/sax.js").createStream();

tap.doesNotThrow(() => {
  saxStream.end();
});
