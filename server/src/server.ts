import * as lsp from "vscode-languageserver";
import { checkAFF } from "./lang";

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

documents.onDidClose((change) => {
	console.log(`close ${change.document.uri}`)
	connection.sendDiagnostics({
		uri: change.document.uri, diagnostics: []
	})
})

const validateTextDocument = async (textDocument: lsp.TextDocument) => {
	const errors = checkAFF(textDocument)
	connection.sendDiagnostics({
		uri: textDocument.uri, diagnostics: errors
	})
}

documents.listen(connection)

connection.listen()