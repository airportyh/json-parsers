const parser = require("./parser");
const fs = require("fs");
const util = require("util");
const filename = process.argv[2];
if (!filename) {
    console.log("Please provide a filename.");
    process.exit(1);
}

const text = fs.readFileSync(filename) + "";

console.log(parser(text));