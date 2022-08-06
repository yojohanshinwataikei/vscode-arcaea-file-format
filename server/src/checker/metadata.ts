import { DiagnosticSeverity } from "vscode-languageserver"
import { AFFChecker } from "../types"

export const metadataChecker: AFFChecker = (file, errors) => {
	for (const entry of file.metadata.data.data.values()) {
		if (!["AudioOffset", "TimingPointDensityFactor"].includes(entry.data.key.data)) {
			errors.push({
				message: `The "${entry.data.key.data}" metadata is not used and will be ignored`,
				severity: DiagnosticSeverity.Warning,
				location: entry.data.key.location,
			})
		}
	}
	if (!file.metadata.data.data.has("AudioOffset")) {
		errors.push({
			message: `The "AudioOffset" metadata is missing, this chart will be processed with zero audio offset`,
			severity: DiagnosticSeverity.Warning,
			location: file.metadata.data.metaEndLocation,
		})
	} else {
		const offset = file.metadata.data.data.get("AudioOffset")
		if (!offset.data.value.data.match(/^-?(?:0|[1-9][0-9]*)$/)) {
			errors.push({
				message: `The value of "AudioOffset" metadata is not an int`,
				severity: DiagnosticSeverity.Error,
				location: offset.data.value.location,
			})
		}
	}
	if (file.metadata.data.data.has("TimingPointDensityFactor")) {
		const factor = file.metadata.data.data.get("TimingPointDensityFactor")
		const factorValue = parseFloat(factor.data.value.data)
		if (isNaN(factorValue)) {
			errors.push({
				message: `The value of "TimingPointDensityFactor" metadata is not an float`,
				severity: DiagnosticSeverity.Error,
				location: factor.data.value.location,
			})
		} else if (factorValue <= 0) {
			errors.push({
				message: `The value of "TimingPointDensityFactor" metadata is not positive`,
				severity: DiagnosticSeverity.Error,
				location: factor.data.value.location,
			})
		}
	}
}