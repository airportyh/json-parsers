// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "main", "symbols": ["_", "expr", "_"]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[ \n]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"]},
    {"name": "expr", "symbols": ["array"]},
    {"name": "expr", "symbols": ["object"]},
    {"name": "expr", "symbols": ["boolean"]},
    {"name": "expr", "symbols": ["number"]},
    {"name": "expr", "symbols": ["string"]},
    {"name": "expr", "symbols": []},
    {"name": "object", "symbols": [{"literal":"{"}, "_", "entry_list", "_", {"literal":"}"}]},
    {"name": "entry_list", "symbols": ["entry", "_", {"literal":","}, "_", "entry_list"]},
    {"name": "entry_list", "symbols": ["entry"]},
    {"name": "entry", "symbols": ["string", "_", {"literal":":"}, "_", "expr"]},
    {"name": "array", "symbols": [{"literal":"["}, "_", "array_items", "_", {"literal":"]"}]},
    {"name": "array_items", "symbols": ["expr", "_", {"literal":","}, "_", "array_items"]},
    {"name": "array_items", "symbols": ["expr"]},
    {"name": "boolean$string$1", "symbols": [{"literal":"t"}, {"literal":"r"}, {"literal":"u"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "boolean", "symbols": ["boolean$string$1"]},
    {"name": "boolean$string$2", "symbols": [{"literal":"f"}, {"literal":"a"}, {"literal":"l"}, {"literal":"s"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "boolean", "symbols": ["boolean$string$2"]},
    {"name": "null$string$1", "symbols": [{"literal":"n"}, {"literal":"u"}, {"literal":"l"}, {"literal":"l"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "null", "symbols": ["null$string$1"]},
    {"name": "string$ebnf$1", "symbols": []},
    {"name": "string$ebnf$1", "symbols": ["string$ebnf$1", /[a-zA-Z0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "string", "symbols": [{"literal":"\""}, "string$ebnf$1", {"literal":"\""}]},
    {"name": "number$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$1", "symbols": ["number$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "number", "symbols": ["number$ebnf$1"]}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
