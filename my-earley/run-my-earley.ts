import { parse } from "./parser";
import * as fs from "fs";
import * as util from "util";

const filename = process.argv[2];
if (!filename) {
    console.log("Please provide a filename.");
    process.exit(1);
}

const text = fs.readFileSync(filename) + "";

try {
    const result = parse(text);
    console.log("result", result);
} catch (e) {
    console.log(e.message);
}