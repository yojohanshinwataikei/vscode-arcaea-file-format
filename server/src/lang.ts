import { AFFLexer } from "./lexer";
import * as lsp from "vscode-languageserver";

export const checkAFF = (content: string): lsp.Diagnostic[] => {
	const lexingResult = AFFLexer.tokenize(content)
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
	return []
}