import { AFFTimingEvent, AFFFile, AFFError, WithLocation, AFFTimingGroupEvent } from "../types"
import { DiagnosticSeverity } from "vscode-languageserver";
import { AssociatedDataMap } from "../util/associated-data";

export interface TimingData {
	time: number,
	bpm: number,
	segment: number,
	item: WithLocation<AFFTimingEvent>,
}

export type TimingResult = {
	datas: TimingData[],//This should be sorted by time
	attributes: string[],
	errors: AFFError[],
}
const genTimingResult = (group: AFFFile | AFFTimingGroupEvent): TimingResult => {
	let errors: AFFError[] = []
	let datas = new Map<number, TimingData>()
	let items = ("kind" in group) ? group.items.data : group.items
	for (const item of items) {
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
	const groupLocation = ("kind" in group) ? group.tagLocation : group.metadata.location
	if (datas.size <= 0) {
		errors.push({
			message: `No timing event found ${("kind" in group) ? "in the timinggroup" : "outside timinggroups"}.`,
			severity: DiagnosticSeverity.Error,
			location: groupLocation
		})
	} else if (!datas.has(0)) {
		errors.push({
			message: `No timing event at 0 time found ${("kind" in group) ? "in the timinggroup" : "outside timinggroups"}.`,
			severity: DiagnosticSeverity.Warning,
			location: groupLocation
		})
	} else {
		let firstZeroTiming = false
		if (items.length >= 0) {
			const first = items[0]
			if (first.data.kind === "timing") {
				if (first.data.time.data.value === 0) {
					firstZeroTiming = true
				}
			}
		}
		if (!firstZeroTiming) {
			errors.push({
				message: `First item ${("kind" in group) ? "in the timinggroup" : "outside timinggroups"} is not timing event at 0 time.`,
				severity: DiagnosticSeverity.Information,
				location: groupLocation
			})
		}
	}
	const attributes=[]
	if("kind" in group){
		if(group.timingGroupAttribute.data.value!==""){
			attributes.push(...group.timingGroupAttribute.data.value.split("_"))
		}
	}
	return { datas: [...datas.values()].sort((a, b) => a.time - b.time), attributes, errors }
}

export const timings = new AssociatedDataMap(genTimingResult)