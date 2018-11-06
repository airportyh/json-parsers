const createLexer = require("../lexer/lexer");
const util = require("util");

const PARSING_TABLE = {
    "expr": {
        "left_brace": ["object"],
        "left_bracket": ["array"],
        "number": {
            symbols: ["number"],
            resolve: data => Number(data[0])
        },
        "string": {
            symbols: ["string"],
            resolve: data => unquote(data[0].text)
        },
        "true": {
            symbols: ["true"],
            resolve: () => true
        },
        "false": {
            symbols: ["false"],
            resolve: () => false
        },
        "null": {
            symbols: ["null"],
            resolve: () => null
        }
    },
    "array": {
        "left_bracket": {
            symbols: ["left_bracket", "array_items", "right_bracket"],
            resolve: data => data[1]
        }
    },
    "array_items": {
        "left_brace": {
            symbols: ["expr", "array_items_rest"],
            resolve: data => [data[0], ...data[1]]
        },
        "left_bracket": {
            symbols: ["expr", "array_items_rest"],
            resolve: data => [data[0], ...data[1]]
        },
        "number": {
            symbols: ["expr", "array_items_rest"],
            resolve: data => [data[0], ...data[1]]
        },
        "string": {
            symbols: ["expr", "array_items_rest"],
            resolve: data => [data[0], ...data[1]]
        },
        "true": {
            symbols: ["expr", "array_items_rest"],
            resolve: data => [data[0], ...data[1]]
        },
        "false": {
            symbols: ["expr", "array_items_rest"],
            resolve: data => [data[0], ...data[1]]
        },
        "null": {
            symbols: ["expr", "array_items_rest"],
            resolve: data => [data[0], ...data[1]]
        },
        "right_bracket": ["array_items_rest"]
    },
    "array_items_rest": {
        "comma": {
            symbols: ["comma", "array_items"],
            resolve: data => data[1]
        },
        "right_bracket": {
            symbols: [],
            resolve: () => []
        }
    },
    "object": {
        "left_brace": {
            symbols: ["left_brace", "object_entry_list", "right_brace"],
            resolve: data => {
                const obj = {};
                for (let entry of data[1]) {
                    obj[entry[0]] = entry[1];
                }
                return obj;
            }
        }
    },
    "object_entry_list": {
        "string": {
            symbols: ["object_entry", "object_entry_list_rest"],
            resolve: data => [data[0], ...data[1]]
        }
    },
    "object_entry": {
        "string": {
            symbols: ["string", "colon", "expr"],
            resolve: data => [unquote(data[0].text), data[2]]
        }
    },
    "object_entry_list_rest": {
        "comma": {
            symbols: ["comma", "object_entry_list"],
            resolve: data => data[1]
        },
        "right_brace": {
            symbols: [],
            resolve: () => []
        }
    }
};

module.exports = function parse(input) {
    const lexer = createLexer();
    lexer.reset(input);
    let stack = ["expr"];
    let token = lexer.next();
    const tokenName = getTokenName(token);
    let resultStack = [];
    while (true) {
        const symbol = stack.pop();
        const tokenName = getTokenName(token);
        if (symbol === tokenName) {
            // Match!!!
            resultStack[0].children.push(token);
            resolveResults();
            token = lexer.next();
            if (!token) {
                // End of input
                break;
            } else {
                continue;
            }
        }
        let nextSymbols = PARSING_TABLE[symbol][tokenName];
        if (!nextSymbols) {
            const expected = Object.keys(PARSING_TABLE[symbol]);
            console.log("Symbol Stack", stack);
            console.log("Result Stack", resultStack);
            console.log("Token", token);
            throw new Error(`Unexpected token ${tokenName}: ${token.text}. In state ${symbol} and was looking for one of ${expected.join(", ")}.`);
        }
        
        // load the next symbols onto the stack in reverse order
        let resolveFn = (data) => {
            if (Array.isArray(data)) {
                if (data.length === 1) {
                    return data[0];
                } else {
                    return data;
                }
            } else {
                return data;
            }
        };
        if (!Array.isArray(nextSymbols)) {
            // It's an object with keys "symbols" and "resolve"
            resolveFn = nextSymbols.resolve;
            nextSymbols = nextSymbols.symbols;
        }

        const newResult = {
            stackPosition: stack.length,
            symbol: symbol,
            children: [],
            resolve: resolveFn
        };
        resultStack.unshift(newResult);
        stack = stack.concat(nextSymbols.slice(0).reverse());
        resolveResults();
    }
    const result = resultStack[0].resolve(resultStack[0].children);
    console.log(result);
    // console.log("result stack", util.inspect(resultStack, { depth: 50 }));

    function resolveResults() {
        while (true) {
            if (resultStack.length === 1) {
                break;
            }
            let nextResult = resultStack[0];
            if (nextResult.stackPosition === stack.length) {
                let matchedResult = resultStack.shift();
                if (resultStack.length > 0) {
                    let value = matchedResult.resolve(matchedResult.children);
                    resultStack[0].children.push(value);
                }
            } else {
                break;
            }
        }
    }
}

function getTokenName(token) {
    if (token.type === "keyword") {
        return token.text;
    } else {
        return token.type;
    }
}

function unquote(string) {
    return string.substring(1, string.length - 1);
}