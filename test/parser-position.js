import tap from "tap";
import * as sax from "../lib/sax.js";

const testPosition = (chunks, expectedEvents) => {
  const parser = sax.parser();
  expectedEvents.forEach(expectation => {
    parser[`on${expectation[0]}`] = () => {
      for (const prop of Object.keys(expectation[1])) {
        tap.equal(parser[prop], expectation[1][prop]);
      }
    };
  });
  chunks.forEach(chunk => {
    parser.write(chunk);
  });
};

testPosition(["<div>abcdefgh</div>"], [
  ["opentagstart", {position: 5, startTagPosition: 1}],
  ["opentag", {position: 5, startTagPosition: 1}],
  ["text", {position: 19, startTagPosition: 14}],
  ["closetag", {position: 19, startTagPosition: 14}],
]);

testPosition(["<div>abcde", "fgh</div>"], [
  ["opentagstart", {position: 5, startTagPosition: 1}],
  ["opentag", {position: 5, startTagPosition: 1}],
  ["text", {position: 19, startTagPosition: 14}],
  ["closetag", {position: 19, startTagPosition: 14}],
]);
