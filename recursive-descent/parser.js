const assert = require('assert');
const createLexer = require("../lexer/lexer");

module.exports = function parse(input) {
    const lexer = createLexer();
    lexer.reset(input);
    return expr(lexer);
};

function expr(lexer) {
    const token = lexer.peek();
    if (token.type === "left_bracket") {
        return array_literal(lexer);
    } else if (token.type === "left_brace") {
        return object_literal(lexer);
    } else if (token.type === "string") {
        lexer.next();
        return JSON.parse(token.text);
    } else if (token.type === "number") {
        lexer.next();
        return Number(token.text);
    } else if (token.type === "keyword") {
        lexer.next();
        if (token.text === "true") {
            return true;
        } else if (token.text === "false") {
            return false;
        } else if (token.text === "null") {
            return null;
        } else {
            throw new Error(`Unknown keyword ${token.text}`);
        }
    } else {
        throw new Error(`Something's wrong: ${JSON.stringify(token)}`);
    }
}

function array_literal(lexer) {
    assert.equal(lexer.next().type, "left_bracket");
    const array = [];
    while (true) {
        const value = expr(lexer);
        array.push(value);
        const nextToken = lexer.peek();
        if (!nextToken) {
            throw new Error(`Unexpected end of input.`);
        }
        if (nextToken.type === "right_bracket") {-
            lexer.next();
            break;
        } else if (nextToken.type === "comma") {
            lexer.next();
        } else {
            throw new Error(`Something's wrong ${nextToken}`);
        }
    }
    return array;
}

function object_literal(lexer) {
    assert.equal(lexer.next().type, "left_brace");
    const object = {};
    while (true) {
        const entry = object_entry(lexer);
        object[entry.key] = entry.value;
        const nextToken = lexer.peek();
        if (nextToken.type === "right_brace") {
            lexer.next();
            break;
        } else if (nextToken.type === "comma") {
            lexer.next();
        } else {
            throw new Error(`Something's wrong ${nextToken}`);
        }
    }
    return object;
}

function object_entry(lexer) {
    const stringToken = lexer.next();
    assert.equal(stringToken.type, "string");
    assert.equal(lexer.next().type, "colon");
    const value = expr(lexer);
    return { key: JSON.parse(stringToken.text), value: value };
}