const moo = require('moo');

class MyLexer {
    constructor(lexer) {
        this.lexer = lexer;
        this.buffer = null;
    }

    reset(chunk, state) {
        this.lexer.reset(chunk, state);
    }

    _next() {
        const token = this.lexer.next();
        if (!token) return token;
        if (token.type === "WS") {
            return this.lexer.next();
        } else {
            return token;
        }
    }

    next() {
        if (this.buffer) {
            const value = this.buffer;
            this.buffer = null;
            return value;
        } else {
            return this._next();
        }
    }

    peek() {
        if (this.buffer) {
            return this.buffer;
        } else {
            this.buffer = this._next();
            return this.buffer;
        }
    }
}

module.exports = function createLexer() {
    return new MyLexer(moo.compile({
        WS:      { match: /[ \t\n]+/, lineBreaks: true },
        number:  /0|[1-9][0-9]*/,
        string:  /"(?:\\["\\]|[^\n"\\])*"/,
        left_brace:  '{',
        right_brace:  '}',
        left_bracket: '[',
        right_bracket: ']',
        colon: ':',
        comma: ',',
        keyword: ['true', 'false', 'null']
    }));
}