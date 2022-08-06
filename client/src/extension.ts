import * as path from "path"
import * as vscode from "vscode"
import * as lsp from "vscode-languageclient/node"

let client: lsp.LanguageClient = null

export const activate = (context: vscode.ExtensionContext) => {
	let serverModule = context.asAbsolutePath(path.join("server", "out", "server.js"))
	let run: lsp.NodeModule = {
		module: serverModule, transport: lsp.TransportKind.ipc
	}
	let debug: lsp.NodeModule = {
		options: {
			execArgv: ["--nolazy", "--inspect=6009"]
		}, ...run
	}
	client = new lsp.LanguageClient(
		"arcaea-aff-lsp",
		{ run, debug },
		{ documentSelector: [{ scheme: "file", language: "arcaea-aff" }] },
	)
	client.start()
}

export const deactivate = () => {
	if (client !== null) {
		return client.stop()
	}
}