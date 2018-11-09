%lex
%%
\s+                     /* skip whitespace */
[0-9]+("."[0-9]+)?\b    return 'NUMBER'
'"'("\\"["]|[^"])*'"'	return 'STRING'
"["                     return '['
"]"                     return ']'
"{"                     return '{'
"}"                     return '}'
","                     return ','
"true"                  return 'TRUE'
"false"                 return 'FALSE'
"null"                  return 'NULL'
":"                     return ':'
$                       return 'EOF'
/lex

%start main

%% /* language grammar */

main
    : expr
        { return $$ }
    ;

expr
    : NUMBER
        { $$ = Number(yytext) }
    | STRING
        { $$ = yytext.substring(1, yytext.length - 1) }
    | TRUE
        { $$ = true }
    | FALSE
        { $$ = false }
    | NULL
        { $$ = null }
    | array
    | object
    ;

array
    : '[' array_items ']'
        { $$ = $2 }
    | '[' ']'
        { $$ = [] }
    ;

array_items
    : expr
        { $$ = [$1] }
    | expr ',' array_items
        { $$ = [$1, ...$3] }
    ;

object
    : '{' object_entry_list '}'
        {
            $$ = {};
            for (let entry of $2) {
                $$[entry[0]] = entry[1];
            }
        }
    | '{' '}'
        { $$ = {} }
    ;

object_entry_list
    : object_entry ',' object_entry_list
        { $$ = [$1, ...$3] }
    | object_entry
        { $$ = [$1] }
    ;

object_entry
    : STRING ':' expr
        { $$ = [$1.substring(1, $1.length - 1), $3] }
    ;