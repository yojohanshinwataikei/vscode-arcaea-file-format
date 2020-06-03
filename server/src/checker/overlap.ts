import { DiagnosticSeverity, Location } from "vscode-languageserver"
import { CstNodeLocation } from "chevrotain"
import { AFFChecker, AFFError, AFFTrackItem, WithLocation, AFFTrackIdValue, AFFCameraEvent, AFFItem } from "../types"

export const overlapChecker: AFFChecker = (file, error) => {
	let trackRecord = new Map<AFFTrackIdValue, WithLocation<AFFTrackItem>[]>()
	const checkItem=(item:WithLocation<AFFItem>)=>{
		if (item.data.kind === "arc") {
			const arctaps = item.data.arctaps
			if (arctaps) {
				// Note: this only check arctaps on one arc and on the same time
				// If it is needed to check for "near" on time arctap we should rewrite this
				// There is no plan to add overlap check for arctaps across different arcs
				let timestamps = new Map<number, CstNodeLocation>()
				for (const arctap of arctaps.data) {
					const timestamp = arctap.data.time.data.value
					if (timestamps.has(timestamp)) {
						error.push({
							message: `The arctap is duplicated with previous arctap`,
							severity: DiagnosticSeverity.Error,
							location: arctap.location,
							relatedInfo: [{
								message: `Previous arctap`,
								location: timestamps.get(timestamp)
							}]
						})
					} else {
						timestamps.set(timestamp, arctap.location)
					}
				}
			}
		} else if (item.data.kind === "tap" || item.data.kind === "hold") {
			const trackId = item.data.trackId.data.value
			if (!trackRecord.has(trackId)) {
				trackRecord.set(trackId, [])
			}
			trackRecord.get(trackId).push(item as WithLocation<AFFTrackItem>)
		} else if (item.data.kind === "timinggroup") {
			for (const nestedItem of item.data.items.data) {
				checkItem(nestedItem)
			}
		}
	}
	for (const item of file.items) {
		checkItem(item)
	}
	for (const items of trackRecord.values()) {
		checkTrackOverlap(error, items)
	}
	checkCameraOverlap(error, file.items.filter((item): item is WithLocation<AFFCameraEvent> => item.data.kind === "camera"))
}

const checkTrackOverlap = (error: AFFError[], items: WithLocation<AFFTrackItem>[]) => {
	const getStart = (item: WithLocation<AFFTrackItem>) => item.data.kind === "tap" ? item.data.time.data.value : item.data.start.data.value
	const report = (location: CstNodeLocation, lastLocation: CstNodeLocation) => {
		error.push({
			message: `The track item is overlapped with a previous track item`,
			severity: DiagnosticSeverity.Error,
			location,
			relatedInfo: [{
				message: `The previous track item`,
				location: lastLocation
			}]
		})
	}
	const sortedByStart = items.sort((a, b) => getStart(a) - getStart(b))
	// Note: may be there are more thing to save if we want an autofix feature
	let lastLocation: CstNodeLocation | null = null
	let lastEnd: number = -Infinity
	let closed: boolean = false
	for (const item of sortedByStart) {
		if (item.data.kind === "tap") {
			const time = item.data.time.data.value
			if (time < lastEnd || (time === lastEnd && closed)) {
				report(item.location, lastLocation)
			}
			if (time >= lastEnd) {
				lastLocation = item.location
				lastEnd = time
				closed = true
			}
		} else {
			const start = item.data.start.data.value
			if (start < lastEnd || (start === lastEnd && closed)) {
				report(item.location, lastLocation)
			}
			const end = item.data.end.data.value
			if (end > lastEnd) {
				lastLocation = item.location
				lastEnd = end
				closed = false
			}
		}
	}
}

const checkCameraOverlap = (error: AFFError[], cameras: WithLocation<AFFCameraEvent>[]) => {
	const report = (location: CstNodeLocation, lastLocation: CstNodeLocation) => {
		error.push({
			message: `The camera item is overlapped with a previous camera item`,
			severity: DiagnosticSeverity.Error,
			location,
			relatedInfo: [{
				message: `The previous camera item`,
				location: lastLocation
			}]
		})
	}
	const sortedByStart = cameras.sort((a, b) => a.data.time.data.value - b.data.time.data.value)
	let lastLocation: CstNodeLocation | null = null
	let lastEnd: number = -Infinity
	for (const item of sortedByStart) {
		const start = item.data.time.data.value
		if (start < lastEnd) {
			report(item.location, lastLocation)
		}
		const end = start + item.data.duration.data.value
		if (end > lastEnd) {
			lastLocation = item.location
			lastEnd = end
		}
	}
}