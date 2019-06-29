import { createToken, Lexer } from "chevrotain";

const endline = createToken({ name: "endline", pattern: /\r\n|\r|\n/, line_breaks: true })

const colon = createToken({ name: "colon", pattern: /:/, label: ":" })
const data = createToken({ name: "data", pattern: /[^:\r\n]+/ })
const metaEnd = createToken({ name: "metaEnd", pattern: /-(?:\r\n|\r|\n)/, push_mode: "main", line_breaks: true, label: "-" })

const lParen = createToken({ name: "lParen", pattern: /\(/, label: "(" })
const rParen = createToken({ name: "rParen", pattern: /\)/, label: ")" })
const lBrack = createToken({ name: "lBrack", pattern: /\[/, label: "[" })
const rBrack = createToken({ name: "rBrack", pattern: /\]/, label: "]" })
const comma = createToken({ name: "comma", pattern: /,/, label: "," })
const semicomma = createToken({ name: "semicomma", pattern: /;/, label: ";" })

const value = createToken({ name: "value", pattern: Lexer.NA })
const word = createToken({ name: "word", pattern: /[a-zA-Z]+/, categories: value })
const float = createToken({ name: "float", pattern: /-?[0-9]+\.[0-9]+/, categories: value })
const int = createToken({ name: "int", pattern: /-?(?:0|[1-9][0-9]*)/, categories: value })

export const AFFLexer = new Lexer({
	modes: {
		meta: [endline, metaEnd, colon, data],
		main: [endline, lParen, rParen, lBrack, rBrack, comma, semicomma, float, int, word]
	},
	defaultMode: "meta"
})