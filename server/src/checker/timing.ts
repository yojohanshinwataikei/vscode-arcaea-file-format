import { AFFChecker, AFFFile, AFFError } from "../types"
import { DiagnosticSeverity } from "vscode-languageserver";
import { timings } from "../associated-data/timing";

export const timingChecker: AFFChecker = (file, error) => {
	checkFirstTiming(file, error)
	error.splice(error.length, 0, ...timings.get(file).errors)
}

const checkFirstTiming = (file: AFFFile, error: AFFError[]) => {
	if (file.items.length > 0) {
		const first = file.items[0].data
		if (first.kind === "timing") {
			if (first.time.data.value === 0) {
				return
			}
		}
	}
	error.push({
		message: `The first item in the aff file is not timing at zero timestamp`,
		severity: DiagnosticSeverity.Error,
		location: file.metadata.data.metaEndLocation,
	})
}