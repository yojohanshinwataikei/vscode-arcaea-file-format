import { createToken, Lexer } from "chevrotain";

const endline = createToken({ name: "endline", pattern: /\r\n|\r|\n/, line_breaks: true })

const colon = createToken({ name: "colon", pattern: /:/, label: ":", push_mode: "data" })
const key = createToken({ name: "key", pattern: /[^:\r\n]+/ })
const data = createToken({ name: "data", pattern: /[^\r\n]+/, pop_mode: true })
const metaEnd = createToken({ name: "metaEnd", pattern: /-(?:\r\n|\r|\n)/, push_mode: "main", line_breaks: true, label: "-" })

const lParen = createToken({ name: "lParen", pattern: /\(/, label: "(" })
const rParen = createToken({ name: "rParen", pattern: /\)/, label: ")" })
const lBrack = createToken({ name: "lBrack", pattern: /\[/, label: "[" })
const rBrack = createToken({ name: "rBrack", pattern: /\]/, label: "]" })
const comma = createToken({ name: "comma", pattern: /,/, label: "," })
const semicolon = createToken({ name: "semicolon", pattern: /;/, label: ";" })

const value = createToken({ name: "value", pattern: Lexer.NA })
const word = createToken({ name: "word", pattern: /[a-zA-Z]+/, categories: value })
const float = createToken({ name: "float", pattern: /-?[0-9]+\.[0-9]+/, categories: value })
const int = createToken({ name: "int", pattern: /-?(?:0|[1-9][0-9]*)/, categories: value })

// \s without \r\n
const whitespace = createToken({
	name: "whitespace",
	pattern: /[ \f\t\v​\u00a0\u1680​\u180e\u2000​\u2001\u2002​\u2003\u2004​\u2005\u2006​\u2007\u2008​\u2009\u200a​\u2028\u2029​​\u202f\u205f​\u3000]+/,
	group: "whitespace",
})

export const tokenTypes = { endline, colon, key, data, metaEnd, lParen, rParen, lBrack, rBrack, comma, semicolon, value, word, float, int }
export const AFFLexer = new Lexer({
	modes: {
		meta: [endline, metaEnd, colon, key],
		data: [data],
		main: [endline, whitespace, lParen, rParen, lBrack, rBrack, comma, semicolon, float, int, word]
	},
	defaultMode: "meta"
})