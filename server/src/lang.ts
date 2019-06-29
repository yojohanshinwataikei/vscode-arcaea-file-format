import { AFFLexer } from "./lexer";
import * as lsp from "vscode-languageserver";
import { AFFParser } from "./parser";
import { EOF } from "chevrotain";

const parser = new AFFParser()

export const checkAFF = (content: lsp.TextDocument): lsp.Diagnostic[] => {
	const text = content.getText()
	const lexingResult = AFFLexer.tokenize(text)
	if (lexingResult.errors.length > 0) {
		return lexingResult.errors.map(e => ({
			severity: lsp.DiagnosticSeverity.Error,
			message: e.message,
			range: {
				start: { line: e.line - 1, character: e.column - 1 },
				end: { line: e.line - 1, character: e.column + e.length - 1 }
			}
		}))
	}
	parser.input = lexingResult.tokens
	parser.aff()
	if (parser.errors.length > 0) {
		return parser.errors.map(e => {
			console.log(e.token)
			console.log(e.resyncedTokens)
			return ({
				severity: lsp.DiagnosticSeverity.Error,
				message: e.message,
				range: e.token.tokenType === EOF ? {
					start: content.positionAt(text.length),
					end: content.positionAt(text.length),
				} : {
						start: { line: e.token.startLine - 1, character: e.token.startColumn - 1 },
						end: { line: e.token.endLine - 1, character: e.token.endColumn - 1 },
					}
			})
		})
	}
	return []
}