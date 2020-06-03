import { AFFChecker, WithLocation, AFFSceneControlKind, AFFValue, AFFError, AFFValues } from "../types"
import { DiagnosticSeverity } from "vscode-languageserver"
import { CstNodeLocation } from "chevrotain"

export const scenecontrolChecker: AFFChecker = (file, errors) => {
	for (const { data, location } of file.items) {
		if (data.kind === "scenecontrol") {
			checkScenecontrol(data.sceneControlKind, data.values, errors)
		}
	}
}

const checkScenecontrol = (kind: WithLocation<AFFSceneControlKind>, values: WithLocation<WithLocation<AFFValue>[]>, error: AFFError[]) => {
	if (kind.data.value === "trackshow" || kind.data.value === "trackhide") {
		checkValuesCount(error, kind.data.value, 0, values.data, values.location)
		return
	}
	if (kind.data.value === "redline" || kind.data.value === "arcahvdistort" || kind.data.value === "arcahvdebris") {
		if (checkValuesCount(error, kind.data.value, 2, values.data, values.location)) {
			checkValueType(error, kind.data.value, "length", "float", values.data, 0)
			checkValueType(error, kind.data.value, "value", "int", values.data, 1)
		}
		return
	}
}

const checkValuesCount = (errors: AFFError[], kind: string, count: number, values: WithLocation<AFFValue>[], valuesLocation: CstNodeLocation): boolean => {
	if (values.length !== count) {
		// error: value count missmatch
		errors.push({
			message: `Scenecontrol event with type "${kind}" should have ${count} additional value(s) instead of ${values.length} additional value(s).`,
			location: valuesLocation,
			severity: DiagnosticSeverity.Error,
		})
		return false
	}
	return true
}

const checkValueType = <T extends keyof AFFValues>(
	errors: AFFError[],
	eventKind: string,
	fieldname: string,
	kind: T,
	values: WithLocation<AFFValue>[],
	id: number
): WithLocation<AFFValues[T]> | null => {
	const value = values[id]
	if (value.data.kind !== kind) {
		// error: value type missmatch
		errors.push({
			message: `The value in the "${fieldname}" field of scenecontrol event with type "${eventKind}" should be "${kind}" instead of "${value.data.kind}"`,
			location: values[id].location,
			severity: DiagnosticSeverity.Error,
		})
		return null
	} else {
		return value as WithLocation<AFFValues[T]>
	}
}