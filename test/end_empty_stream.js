import tap from "tap";
import {createStream} from "../lib/sax.js";

const saxStream = createStream();

tap.doesNotThrow(() => {
  saxStream.end();
});
