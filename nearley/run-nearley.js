const nearley = require("nearley");
const grammar = require("./nearley-grammar");
const fs = require("fs");
const util = require("util");
const parser = new nearley.Parser(
    nearley.Grammar.fromCompiled(grammar), {
        keepHistory: true
    });
const filename = process.argv[2];
if (!filename) {
    console.log("Please provide a filename.");
    process.exit(1);
}
const text = fs.readFileSync(filename) + "";
parser.feed(text);
if (parser.results.length === 0) {
    console.log("Unexpected end of input.");
} else {
    console.log(util.inspect(parser.results, { depth: 10 }));
}
