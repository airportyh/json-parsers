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
    "{" | "}" | "[" | "]" |
     ":" | "," | "eof";

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
    { lhs: "object", rhs: ["{", "object_entry_list", "}"],
        resolve: data => {
            const obj: any = {};
            for (const entry of data[1]) {
                obj[entry[0]] = entry[1];
            }
            return obj;
        } },
    { lhs: "object", rhs: ["{", "}"],
        resolve: () => ({}) },
    { lhs: "object_entry_list", rhs: ["object_entry", ",", "object_entry_list"],
        resolve: data => [data[0], ...data[2]] },
    { lhs: "object_entry_list", rhs: ["object_entry"],
        resolve: data => [data[0]] },
    { lhs: "object_entry", rhs: ["string", ":", "expr"],
        resolve: data => [unquote(data[0].text), data[2]] },
    { lhs: "array", rhs: ["[", "array_items", "]"],
        resolve: data => data[1] },
    { lhs: "array", rhs: ["[", "]"],
        resolve: () => [] },
    { lhs: "array_items", rhs: ["expr", ",", "array_items"],
        resolve: data => [data[0], ...data[2]] },
    { lhs: "array_items", rhs: ["expr"],
        resolve: data => [data[0]] }
];

const TERMINALS = new Set([
    "number", "string", "true", "false", "null", 
    "{", "}", "[", "]", ":", ","
]);

export function parse(input: string, debug: boolean = false): any {
    const lexer = createLexer();
    lexer.reset(input);

    const startState = {
        rule: { lhs: "start", rhs: ["expr"] },
        dot: 0, origin: 0, data: []
    };
    const chart: Chart = [
        { i: 0, states: { [getStateKey(startState)]: startState } }
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
            displayError(lastStateSet, word, chart);
            throw new Error("Parse error.");
        }
    }

    const startFinalStateKey = getStateKey({
        ...startState, 
        dot: startState.rule.rhs.length
    });
    const startFinalState = chart[i].states[startFinalStateKey];
    if (!startFinalState) {
        const lastStateSet = chart[i];
        displayError(lastStateSet, { type: "eof", text: "end of input" }, chart);
        throw new Error("Parse error.");
    } else {
        return startFinalState.data;
    }
}

function displayError(stateSet: StateSet, token: Token, chart: Chart): void {
    // console.log(util.inspect(stateSet, { depth: 10 }));
    for (let stateSet of chart) {
        displayStateSet(stateSet);
    }
    const intermediateStates = _.reverse(_.filter(stateSet.states, (state) => {
        return isTerminal(nextSymbol(state));
    }));
    const intermediateRuleKeys = _.map(intermediateStates, getStateKey);
    const expectedSymbols = _.map(intermediateStates, nextSymbol);
    console.log(`Unexpected ${formatToken(token)}. was expecting one of ${expectedSymbols.map(s => colors.bgGreen(s)).join(", ")}.`);
    for (const intermediateState of intermediateStates) {
        console.log();
        console.log(`Traceback for ${getStateKey(intermediateState)}`);
        console.log(`--------------------------------------`);
        const lastStateKeys = Object.keys(stateSet.states);
        const lastState = stateSet.states[lastStateKeys[lastStateKeys.length - 1]];
        const stack = buildStateStack(intermediateState, chart);
        for (const state of stack) {
            console.log(getStateKey(state));
        }
    }
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

function notStarted(state: State): boolean {
    return state.dot === 0;
}

function nextSymbol(state: State): string {
    return state.rule.rhs[state.dot];
}

function previousSymbol(state: State): string {
    return state.rule.rhs[state.dot - 1];
}

function isNonTerminal(symbol: string): boolean {
    return !TERMINALS.has(symbol);
}

function isTerminal(symbol: string): boolean {
    return TERMINALS.has(symbol);
}

function addToSet(state: State, chart: Chart, i: number): void {
    const ruleKey = getStateKey(state);
    if (!chart[i]) {
        chart[i] = { i, states: {} };
    }
    chart[i].states[ruleKey] = state;
}

function quoteIfTerminal(symbol: string): string {
    if (isTerminal(symbol)) {
        return `"${symbol}"`;
    } else {
        return symbol;
    }
}

function getStateKey(state: State): string {
    return "[" + state.origin + "] " + state.rule.lhs + " -> " + 
        [...state.rule.rhs.map(quoteIfTerminal).slice(0, state.dot), 
            "•",
        ...state.rule.rhs.map(quoteIfTerminal).slice(state.dot)].join(" ");
}

function getStateKeyMinusDot(state: State): string {
    return state.rule.lhs + "->" + 
        state.rule.rhs.map(quoteIfTerminal).join(" ") + ", " + state.origin;
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

class Stack<T> {
    array: T[] = [];
    
    push(item: T): void {
        this.array.unshift(item);
    }

    top(): T | undefined {
        return this.array[0];
    }

    empty(): boolean {
        return this.array.length === 0;
    }

    pop(): T | undefined {
        return this.array.shift();
    }

    asArray(): T[] {
        return this.array;
    }
}

function buildStateStack1(chart: Chart): State[] {
    let stack: Stack<State> = new Stack();
    
    for (let i = chart.length - 1; i >= 0; i--) {
        const stateSet = chart[i];
        // console.log("chart ", i);
        const stateKeys = Object.keys(stateSet.states);
        for (let j = stateKeys.length - 1; j >= 0; j--) {
            const stateKey = stateKeys[j];
            // console.log("stateKey", stateKey);
            const state = stateSet.states[stateKey];
            const top = stack.top();
            if (!top) {
                stack.push(state);
            } else {
                const prev = previousSymbol(state);
                // console.log("top", getStateKey(top), "prev", prev);
                if (state.rule.lhs === previousSymbol(top)) {
                    // console.log("Pushing", stateKey);
                    stack.push(state);
                } else {
                    // console.log("Not pushing", stateKey);
                }
            }
        }
    }
    
    return stack.asArray();
}

function buildStateStack(state: State, chart: Chart): State[] {
    // console.log("buildStateStack", getStateKey(state));
    if (notStarted(state)) {
        // traverse state keys backwards
        // console.log("traverse state keys backwords");
        let i = state.origin;
        let stateSet = chart[i];
        let stateKeys = Object.keys(stateSet.states);
        let j = stateKeys.indexOf(getStateKey(state));
        while (true) {
            // console.log("i", i, "j", j);
            j = j - 1;
            if (j < 0) {
                i = i - 1;
                if (i < 0) {
                    // console.log("reached the end");
                    return [state];
                }
                stateSet = chart[i];
                stateKeys = Object.keys(stateSet.states);
                j = stateKeys.length - 1;
            }

            const prevState = stateSet.states[stateKeys[j]];
            // console.log("prevState", getStateKey(prevState));
            if (state.rule.lhs === nextSymbol(prevState)) {
                // console.log("found previous matching state", getStateKey(prevState));
                return [
                    state,
                    ...buildStateStack(prevState, chart)
                ];
            }
        }
    } else {
        // find origin state
        // console.log("find origin state");
        const originStates = Object.values(chart[state.origin].states);
        const originState = originStates
            .filter((s) => 
                getStateKeyMinusDot(state) === getStateKeyMinusDot(s))
            [0];
        return [
            state, 
            ...buildStateStack(originState, chart).slice(1)
        ];
    }
}