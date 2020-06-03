import { DiagnosticSeverity } from "vscode-languageserver"
import { CstNodeLocation } from "chevrotain"
import { timings, TimingData } from "../associated-data/timing"
import { lowerBound, upperBound } from "../util/misc"
import { AFFChecker, AFFError } from "../types"

export const cutByTimingChecker: AFFChecker = (file, error) => {
	const timingData = timings.get(file).datas
	for (const item of file.items) {
		if (item.data.kind === "hold") {
			checkCutByTiming("hold", timingData, item.data.start.data.value, item.data.end.data.value, item.location, error)
		} else if (item.data.kind === "arc") {
			checkCutByTiming("arc", timingData, item.data.start.data.value, item.data.end.data.value, item.location, error)
		} else if (item.data.kind === "timinggroup") {
			const groupTimingData = timings.get(item.data).datas
			for (const nestedItem of item.data.items.data) {
				if (nestedItem.data.kind === "hold") {
					checkCutByTiming("hold", groupTimingData, nestedItem.data.start.data.value, nestedItem.data.end.data.value, nestedItem.location, error)
				} else if (nestedItem.data.kind === "arc") {
					checkCutByTiming("arc", groupTimingData, nestedItem.data.start.data.value, nestedItem.data.end.data.value, nestedItem.location, error)
				}
			}
		}
	}
}

const checkCutByTiming = (tag: string, timingData: TimingData[], start: number, end: number, location: CstNodeLocation, error: AFFError[]) => {
	const firstTimingIndex = upperBound(timingData, start, (td, t) => td.time - t)
	const lastTimingIndex = lowerBound(timingData, end, (td, t) => td.time - t)
	const cuters = timingData.slice(firstTimingIndex, lastTimingIndex)
	if (cuters.length > 0) {
		error.push({
			message: `The ${tag} item is cut by timing events`,
			severity: DiagnosticSeverity.Information,
			location,
			relatedInfo: cuters.map(timing => ({
				message: `The timing event that cuts the ${tag} item`,
				location: timing.item.location,
			})),
		})
	}
}