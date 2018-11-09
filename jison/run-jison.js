const parser = require("./grammar").parser;
const fs = require("fs");
const util = require("util");

const filename = process.argv[2];
if (!filename) {
    console.log("Please provide a filename.");
    process.exit(1);
}

const text = fs.readFileSync(filename) + "";

const result = parser.parse(text);
console.log(util.inspect(result, { depth: 10 }));
