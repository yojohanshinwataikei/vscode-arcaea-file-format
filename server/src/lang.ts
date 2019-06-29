import { AFFLexer } from "./lexer";
import * as lsp from "vscode-languageserver";
import { AFFParser } from "./parser";
import { EOF } from "chevrotain";

const parser = new AFFParser()

export const checkAFF = (content: lsp.TextDocument): lsp.Diagnostic[] => {
	let errors = []
	const text = content.getText()
	const lexingResult = AFFLexer.tokenize(text)
	if (lexingResult.errors.length > 0) {
		errors = errors.concat(lexingResult.errors.map(e => ({
			severity: lsp.DiagnosticSeverity.Error,
			message: e.message,
			range: {
				start: { line: e.line - 1, character: e.column - 1 },
				end: content.positionAt(content.offsetAt({ line: e.line - 1, character: e.column - 1 }) + e.length)
			}
		})))
	}
	// The error tokens is just ignored so we can find more errors in parsing stage
	parser.input = lexingResult.tokens
	parser.aff()
	if (parser.errors.length > 0) {
		errors = errors.concat(parser.errors.map(e => ({
			severity: lsp.DiagnosticSeverity.Error,
			message: e.message,
			range: e.token.tokenType === EOF ? {
				start: content.positionAt(text.length),
				end: content.positionAt(text.length),
			} : {
					start: { line: e.token.startLine - 1, character: e.token.startColumn - 1 },
					end: { line: e.token.endLine - 1, character: e.token.endColumn },
				}
		})
		))
	}
	return errors
}