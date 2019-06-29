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

const validateTextDocument = async (textDocument: lsp.TextDocument) => {
	// TODO: AFF parsing
	const errors=checkAFF(textDocument)
	console.log(errors)
	connection.sendDiagnostics({
		uri: textDocument.uri, diagnostics: errors
	})
}

documents.listen(connection)

connection.listen()