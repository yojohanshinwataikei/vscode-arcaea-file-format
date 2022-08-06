import { DiagnosticSeverity } from "vscode-languageserver";
import { AFFError, AFFFile, AFFSceneControlEvent, WithLocation } from "../types";
import { AssociatedDataMap } from "../util/associated-data";

export interface EnwidenData {
	time: number,
	enabled: boolean,
	item: WithLocation<AFFSceneControlEvent>,
}

export type EnwidenResult = {
	cameras: EnwidenData[],//This should be sorted by time
	lanes: EnwidenData[],//This should be sorted by time
	errors: AFFError[],
}

const genEnwidenResult = (file: AFFFile): EnwidenResult => {
	let errors: AFFError[] = []
	let rawCameras: EnwidenData[] = []
	let rawLanes: EnwidenData[] = []
	const processScenecontrol = (scenecontrol: WithLocation<AFFSceneControlEvent>) => {
		const values = scenecontrol.data.values;
		if (values.data.length === 2) {
			if (values.data[0].data.kind == "float" && values.data[1].data.kind == "int") {
				const enabled = values.data[1].data.value > 0
				const data: EnwidenData = {
					time: scenecontrol.data.time.data.value + (
						enabled ? 0 : values.data[0].data.value
					),
					enabled,
					item: scenecontrol,
				}
				const kind = scenecontrol.data.sceneControlKind.data.value
				if (kind == "enwidencamera") {
					rawCameras.push(data)
				} else if (kind == "enwidenlanes") {
					rawLanes.push(data)
				}
			}
		}
	}
	for (const item of file.items) {
		if (item.data.kind === "scenecontrol") {
			processScenecontrol(item as WithLocation<AFFSceneControlEvent>)
		} else if (item.data.kind === "timinggroup") {
			for (const nestedItem of item.data.items.data) {
				if (nestedItem.data.kind === "scenecontrol") {
					processScenecontrol(nestedItem as WithLocation<AFFSceneControlEvent>)
				}
			}
		}
	}
	const filterEnwidenData = (rawData: EnwidenData[], type: string): EnwidenData[] => {
		const sortedData = [...rawData].sort((a, b) => a.time - b.time);
		const filteredData: EnwidenData[] = []
		let enabled = false
		for (const data of sortedData) {
			if (enabled === data.enabled) {
				const enabledString = enabled ? "enabled" : "disabled"
				errors.push({
					message: `The ${type} state is already ${enabledString}, you can't make it ${enabledString} again`,
					severity: DiagnosticSeverity.Warning,
					location: data.item.data.values.data[1].location,
					relatedInfo: [{
						message: `Last time ${type} state becomes ${enabledString}`,
						location: filteredData.length > 0 ? filteredData[filteredData.length - 1].item.location : file.metadata.data.metaEndLocation
					}]
				})
			} else {
				filteredData.push(data)
				enabled = data.enabled
			}
		}
		return sortedData
	}
	const cameras = filterEnwidenData(rawCameras, "enwidencamera")
	const lanes = filterEnwidenData(rawLanes, "enwidenlanes")
	return {
		errors,
		cameras,
		lanes,
	}
}

export const enwidens = new AssociatedDataMap(genEnwidenResult)