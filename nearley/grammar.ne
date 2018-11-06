main -> _ expr _

_ -> [ \n]:*

expr
    -> array
    |  object
    |  boolean
    |  number
    |  string
    |  null

object
    -> "{" _ entry_list _ "}"

entry_list
    -> entry _ "," _ entry_list
    |  entry

entry
    -> string _ ":" _ expr

array
    -> "[" _ array_items _ "]"

array_items
    -> expr _ "," _ array_items
    |  expr

boolean
    -> "true"
    |  "false"

null
    -> "null"

string
    -> "\"" [a-zA-Z0-9]:* "\""

number
    -> [0-9]:+