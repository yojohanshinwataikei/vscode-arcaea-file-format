import * as lsp from "vscode-languageserver";

let connection = lsp.createConnection()

let documents = new lsp.TextDocuments()

connection.onInitialize((params) => {
	return { capabilities: { textDocumentSync: documents.syncKind } }
})

connection.onInitialized(() => {

})

documents.onDidChangeContent((change) => {
	console.log(`change ${change.document.uri}`)
	validateTextDocument(change.document)
})

const validateTextDocument = async (textDocument: lsp.TextDocument) => {
	// TODO: AFF parsing
	connection.sendDiagnostics({
		uri: textDocument.uri, diagnostics: [{
			severity: lsp.DiagnosticSeverity.Information,
			message: "This file is parsed by AFF-LSP",
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 }
			}
		}]
	})
}

documents.listen(connection)

connection.listen()