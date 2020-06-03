import { AFFTimingEvent, AFFFile, AFFError, WithLocation } from "../types"
import { DiagnosticSeverity } from "vscode-languageserver";
import { AssociatedDataMap } from "../util/associated-data";

export interface TimingData {
	time: number,
	bpm: number,
	segment: number,
	item: WithLocation<AFFTimingEvent>,
}

type TimingResult = {
	datas: TimingData[],//This should be soreted by time
	errors: AFFError[],
}
const genTimingResult = (file: AFFFile): TimingResult => {
	let errors: AFFError[] = []
	let datas = new Map<number, TimingData>()
	for (const item of file.items) {
		if (item.data.kind === "timing") {
			const time = item.data.time.data.value
			if (datas.has(time)) {
				errors.push({
					message: `Another timing at this time is defined previously`,
					severity: DiagnosticSeverity.Error,
					location: item.location,
					relatedInfo: [{
						message: `Previous timing definition`,
						location: datas.get(time).item.location
					}]
				})
			} else {
				datas.set(time, {
					time,
					bpm: item.data.bpm.data.value,
					segment: item.data.measure.data.value,
					item: item as WithLocation<AFFTimingEvent>,
				})
			}
		}
	}
	return { datas: [...datas.values()].sort((a, b) => a.time - b.time), errors }
}

export const timings = new AssociatedDataMap(genTimingResult)