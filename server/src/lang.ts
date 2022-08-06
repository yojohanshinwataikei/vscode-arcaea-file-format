import { AFFLexer } from "./lexer"
import * as lsp from "vscode-languageserver"
import { affParser } from "./parser"
import { EOF } from "chevrotain"
import { affToAST } from "./to-ast"
import { AFFError } from "./types"
import { processCheckers } from "./checkers"
import { TextDocument } from "vscode-languageserver-textdocument"

export const checkAFF = (content: TextDocument): lsp.Diagnostic[] => {
	let errors: lsp.Diagnostic[] = []
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
	affParser.input = lexingResult.tokens
	const parsingResult = affParser.aff()
	if (affParser.errors.length > 0) {
		errors = errors.concat(affParser.errors.map(e => ({
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
	} else {
		const astResult = affToAST(parsingResult)
		errors = errors.concat(astResult.errors.map(e => transformAFFError(e, content.uri)))
		const checkerErrors = processCheckers(astResult.ast)
		errors = errors.concat(checkerErrors.map(e => transformAFFError(e, content.uri)))
	}
	return errors
}

const transformAFFError = (e: AFFError, uri: string): lsp.Diagnostic => ({
	severity: e.severity,
	message: e.message,
	range: {
		start: { line: e.location.startLine - 1, character: e.location.startColumn - 1 },
		end: { line: e.location.endLine - 1, character: e.location.endColumn },
	},
	relatedInformation: e.relatedInfo ? e.relatedInfo.map(info => ({
		message: info.message,
		location: {
			uri: uri,
			range: {
				start: { line: info.location.startLine - 1, character: info.location.startColumn - 1 },
				end: { line: info.location.endLine - 1, character: info.location.endColumn },
			}
		},
	})) : undefined
})