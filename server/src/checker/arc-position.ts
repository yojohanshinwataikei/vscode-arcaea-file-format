import { DiagnosticSeverity } from "vscode-languageserver"
import { CstNodeLocation } from "chevrotain"
import { AFFChecker, AFFError } from "../types"
import { allowMemes } from "../associated-data/allow-memes"

export const arcPositionChecker: AFFChecker = (file, error) => {
	if(allowMemes.get(file).enable){
		return
	}
	for (const { data, location } of file.items) {
		if (data.kind === "arc") {
			const solid=!data.isLine.data.value
			checkPoint("start",solid,data.xStart.data.value,data.yStart.data.value,location,error)
			checkPoint("end",solid,data.xEnd.data.value,data.yEnd.data.value,location,error)
		}
	}
}

const checkPoint = (tag: string, solid: boolean, x: number, y: number, location: CstNodeLocation, error: AFFError[]) => {
	if (y > 1 || y < 0 || 2 * x + y > 3 || 2 * x - y < -1) {
		error.push({
			message: `The ${tag} point of the ${solid ? "solid" : "tracking"} arc is out of the trapezium range`,
			severity: solid ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information,
			location,
		})
	}
}