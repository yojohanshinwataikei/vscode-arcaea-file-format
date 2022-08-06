import { DiagnosticSeverity } from "vscode-languageserver"
import { CstNodeLocation } from "chevrotain"
import { AFFChecker, AFFError, AFFItem, WithLocation } from "../types"
import { allowMemes } from "../associated-data/allow-memes"
import { EnwidenData, enwidens } from "../associated-data/enwiden"
import { upperBound } from "../util/misc"

export const arcPositionChecker: AFFChecker = (file, errors) => {
	if (allowMemes.get(file).enable) {
		return
	}
	const cameras = enwidens.get(file).cameras
	for (const item of file.items) {
		checkItem(item, cameras, errors)
	}
}

const checkItem = ({ data, location }: WithLocation<AFFItem>, cameras: EnwidenData[], errors: AFFError[]) => {
	if (data.kind === "arc") {
		const solid = !data.isLine.data.value
		checkPoint("start", solid, data.xStart.data.value, data.yStart.data.value, data.start.data.value, cameras, location, errors)
		checkPoint("end", solid, data.xEnd.data.value, data.yEnd.data.value, data.end.data.value, cameras, location, errors)
	} else if (data.kind === "timinggroup") {
		for (const item of data.items.data) {
			checkItem(item, cameras, errors)
		}
	}
}

const checkPoint = (tag: string, solid: boolean, x: number, y: number, time: number, cameras: EnwidenData[], location: CstNodeLocation, error: AFFError[]) => {
	let lastEnwidenCameraId = upperBound(cameras, time, (ec, t) => ec.time - t) - 1
	if (lastEnwidenCameraId >= 0) {
		if (!cameras[lastEnwidenCameraId].enabled && cameras[lastEnwidenCameraId].time === time) {
			lastEnwidenCameraId -= 1
		}
	}
	if (!(cameras[lastEnwidenCameraId]?.enabled ?? false)) {
		if (
			Math.round(100 * y) > 100 ||
			Math.round(100 * y) < 0 ||
			Math.round(200 * x + 100 * y) > 300 ||
			Math.round(200 * x - 100 * y) < -100
		) {
			error.push({
				message: `The ${tag} point of the ${solid ? "solid" : "tracking"} arc is out of the trapezium range`,
				severity: solid ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information,
				location,
			})
		}
	} else {
		if (
			Math.round(100 * y) > 161 ||
			Math.round(100 * y) < 0 ||
			Math.round(16100 * x + 7500 * y) > 32200 ||
			Math.round(16100 * x - 7500 * y) < -16100
		) {
			error.push({
				message: `The ${tag} point of the ${solid ? "solid" : "tracking"} arc is out of the trapezium range`,
				severity: solid ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information,
				location,
			})
		}
	}
}