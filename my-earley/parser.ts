import * as _ from "lodash";
import * as colors from "colors/safe";
import * as util from "util";
const createLexer = require("../lexer/lexer");
const indent = require("indent");

type State = {
    rule: GrammarRule,
    dot: number,
    origin: number,
    data: any[],
};

type StateSet = {
    i: number,
    states: {
        [key: string]: State
    }
};

type Chart = StateSet[];

type GrammarRule = {
    lhs: string,
    rhs: string[],
    resolve?: (data: any[]) => any
};

type Grammar = GrammarRule[];

type TokenType = "number" | "string" | "keyword" |
    "left_brace" | "right_brace" | "left_bracket" | "right_bracket" |
     "colon" | "comma" | "eof";

type Token = {
    type: TokenType,
    text: string
};

const GRAMMAR: GrammarRule[] = [
    { lhs: "start", rhs: ["expr"] },
    { lhs: "expr", rhs: ["array"] },
    { lhs: "expr", rhs: ["object"] },
    { lhs: "expr", rhs: ["boolean"] },
    { lhs: "expr", rhs: ["number"], resolve: data => Number(data[0]) },
    { lhs: "expr", rhs: ["string"], resolve: data => unquote(data[0].text) },
    { lhs: "expr", rhs: ["null"], resolve: () => null },
    { lhs: "boolean", rhs: ["true"], resolve: () => true },
    { lhs: "boolean", rhs: ["false"], resolve: () => true },
    { lhs: "object", rhs: ["left_brace", "object_entry_list", "right_brace"],
        resolve: data => {
            const obj: any = {};
            for (const entry of data[1]) {
                obj[entry[0]] = entry[1];
            }
            return obj;
        } },
    { lhs: "object", rhs: ["left_brace", "right_brace"],
        resolve: () => ({}) },
    { lhs: "object_entry_list", rhs: ["object_entry", "comma", "object_entry_list"],
        resolve: data => [data[0], ...data[2]] },
    { lhs: "object_entry_list", rhs: ["object_entry"],
        resolve: data => [data[0]] },
    { lhs: "object_entry", rhs: ["string", "colon", "expr"],
        resolve: data => [unquote(data[0].text), data[2]] },
    { lhs: "array", rhs: ["left_bracket", "array_items", "right_bracket"],
        resolve: data => data[1] },
    { lhs: "array", rhs: ["left_bracket", "right_bracket"],
        resolve: () => [] },
    { lhs: "array_items", rhs: ["expr", "comma", "array_items"],
        resolve: data => [data[0], ...data[2]] },
    { lhs: "array_items", rhs: ["expr"],
        resolve: data => [data[0]] }
];

const TERMINALS = new Set([
    "number", "string", "true", "false", "null", 
    "left_brace", "right_brace", "left_bracket", "right_bracket", "colon", "comma"
]);

export function parse(input: string, debug: boolean = false): any {
    const lexer = createLexer();
    lexer.reset(input);

    const startState = {
        rule: { lhs: "start", rhs: ["expr"] },
        dot: 0, origin: 0, data: []
    };
    const chart: Chart = [
        { i: 0, states: { [stateKey(startState)]: startState } }
    ];
    let words: string[] = [];
    let i: number = 0;
    while (true) {
        const word = lexer.next();
        if (word) {
            words.push(word.text);
            if (debug) {
                console.log(words.map((w) => colors.black(colors.bgCyan(w))).join(", "));
            }
        }
        let stateKeyIdx = 0;
        while (true) {
            const stateKeys = Object.keys(chart[i].states);
            if (stateKeyIdx >= stateKeys.length) {
                break;
            }
            const stateKey = stateKeys[stateKeyIdx];
            const state = chart[i].states[stateKey];
            if (incomplete(state)) {
                if (isNonTerminal(nextSymbol(state))) {
                    predictor(state, i, GRAMMAR, chart);
                } else {
                    if (word !== undefined) {
                        scanner(state, i, word, chart);
                    }
                }
            } else {
                if (debug) {
                    console.log(colors.green(stateKey + " complete "));
                }
                completer(state, i, chart);
            }
            stateKeyIdx++;
        }
        if (debug) {
            displayChart(chart);
        }
        if (word === undefined) {
            break;
        }
        i++;
        if (!chart[i]) {
            const lastStateSet = chart[i - 1];
            displayError(lastStateSet, word);
            throw new Error("Parse error.");
        }
    }

    const startFinalStateKey = stateKey({
        ...startState, 
        dot: startState.rule.rhs.length
    });
    const startFinalState = chart[i].states[startFinalStateKey];
    if (!startFinalState) {
        const lastStateSet = chart[i];
        displayError(lastStateSet, { type: "eof", text: "end of input" });
        throw new Error("Parse error.");
    } else {
        return startFinalState.data;
    }
}

function displayError(stateSet: StateSet, token: Token): void {
    console.log(util.inspect(stateSet, { depth: 10 }));
    displayStateSet(stateSet);
    const intermediateRules = _.reverse(_.filter(stateSet.states, (state) => {
        return isTerminal(nextSymbol(state));
    }));
    const intermediateRuleKeys = _.map(intermediateRules, stateKey);
    const expectedSymbols = _.map(intermediateRules, nextSymbol);
    console.log(`Unexpected ${formatToken(token)}. was expecting one of ${expectedSymbols.map(s => colors.bgGreen(s)).join(", ")}.`);
}

function formatToken(token: Token): string {
    if (token.type === "keyword") {
        return colors.bgCyan(token.text);
    } else if (["number", "string"].indexOf(token.type) !== -1) {
        return colors.bgCyan(colors.black(token.type) + " " + colors.red(token.text));
    } else {
        return colors.bgCyan(token.text);
    }
}

function predictor(state: State, j: number, grammar: Grammar, chart: Chart): void {
    const symbol = nextSymbol(state);
    for (const rule of grammar) {
        if (symbol === rule.lhs) {
            addToSet({ rule, dot: 0, origin: j, data: [] }, chart, j);
        }
    }
}

function tokenName(token: Token): string {
    if (token.type === "keyword") {
        return token.text;
    } else {
        return token.type;
    }
}

function scanner(state: State, j: number, word: Token, chart: Chart): void {
    if (tokenName(word) === nextSymbol(state)) {
        addToSet({
            ...state, 
            dot: state.dot + 1, 
            data: [...state.data, word]
        }, chart, j + 1);
    }
}

function completer(state: State, k: number, chart: Chart): void {
    const { rule: { lhs: B, resolve } , origin: j } = state;
    if (resolve) {
        state.data = resolve(state.data);
    } else {
        if (Array.isArray(state.data) && state.data.length === 1) {
            state.data = state.data[0];
        }
    }
    _.forEach(chart[j].states, (parentState, stateKey) => {
        const symbol = nextSymbol(parentState);
        if (symbol === B) {
            addToSet({
                ...parentState, 
                dot: parentState.dot + 1,
                data: [...parentState.data, state.data]
            }, chart, k);
        }
    });
}

function incomplete(state: State): boolean {
    return state.dot < state.rule.rhs.length;
}

function nextSymbol(state: State): string {
    return state.rule.rhs[state.dot];
}

function isNonTerminal(symbol: string): boolean {
    return !TERMINALS.has(symbol);
}

function isTerminal(symbol: string): boolean {
    return TERMINALS.has(symbol);
}

function addToSet(state: State, chart: Chart, i: number): void {
    const ruleKey = stateKey(state);
    if (!chart[i]) {
        chart[i] = { i, states: {} };
    }
    chart[i].states[ruleKey] = state;
}

function stateKey(state: State): string {
    return state.rule.lhs + "->" + 
        state.rule.rhs.slice(0, state.dot).join(" ") + "•" +
        state.rule.rhs.slice(state.dot).join(" ") + ", " + state.origin;
}

function unquote(string: string): string {
    return string.substring(1, string.length - 1);
}

function displayStateSet(stateSet: StateSet): void {
    console.log(`S${stateSet.i}:`);
    const displayStrings = _.map(stateSet.states, (state, stateKey) => {
        if (state.dot === 0) {
            return colors.gray(stateKey);
        } else if (state.dot === state.rule.rhs.length) {
            return colors.green(stateKey);
        } else {
            return colors.yellow(stateKey);
        }
    });
    console.log(indent(displayStrings.join("\n")));
}

function displayChart(chart: Chart): void {
    chart.forEach((stateSet) => {
        displayStateSet(stateSet);
    });
}

// function buildStateStack(chart: Chart): State[] {
//     const stack: State[] = [];
//     let i = chart.length - 1;
//     while (true) {
//         const stateSet = chart[i];
//         const keys = Object.keys(stateSet);
//         for (let j = keys.length - 1; j >= 0; j--) {
//             const state = stateSet[keys[j]];

//         }
//     }
//     return stack;
// }