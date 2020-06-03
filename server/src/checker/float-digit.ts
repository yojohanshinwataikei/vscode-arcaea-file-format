import { DiagnosticSeverity } from "vscode-languageserver"
import { AFFChecker, AFFFloat, AFFError, WithLocation, AFFItem } from "../types";

export const floatDigitChecker: AFFChecker = (file, errors) => {
	for (const item of file.items) {
		checkItem(item,errors)
	}
}

const checkItem = ({ data, location }:WithLocation<AFFItem>,errors:AFFError[]) =>{
	if (data.kind === "timing") {
		checkFloat(data.bpm, errors)
		checkFloat(data.measure, errors)
	} else if (data.kind === "arc") {
		checkFloat(data.xStart, errors)
		checkFloat(data.xEnd, errors)
		checkFloat(data.yStart, errors)
		checkFloat(data.yEnd, errors)
	} else if (data.kind === "camera") {
		checkFloat(data.translationX, errors)
		checkFloat(data.translationY, errors)
		checkFloat(data.translationZ, errors)
		checkFloat(data.rotationX, errors)
		checkFloat(data.rotationY, errors)
		checkFloat(data.rotationZ, errors)
	} else if (data.kind === "scenecontrol") {
		for (const value of data.values.data) {
			if (value.data.kind === "float") {
				checkFloat(value as WithLocation<AFFFloat>, errors)
			}
		}
	} else if (data.kind === "timinggroup") {
		for (const item of data.items.data) {
			checkItem(item,errors)
		}
	}
}

const checkFloat = (float: WithLocation<AFFFloat>, errors: AFFError[]) => {
	if (float.data.digit !== 2) {
		errors.push({
			message: `Float values should have exact 2 digits in its fractional part.`,
			severity: DiagnosticSeverity.Warning,
			location: float.location,
		})
	}
}