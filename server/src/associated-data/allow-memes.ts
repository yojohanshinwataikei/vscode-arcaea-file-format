
import { AFFError, AFFFile, WithLocation, AFFItem, isLine } from "../types";
import { AssociatedDataMap } from "../util/associated-data";
import { DiagnosticSeverity } from "vscode-languageserver";
import { timings } from "./timing";

export type AllowMemesResult = {
	enable: boolean,
	errors: AFFError[],
}

const nonMemeSceneControlKind = [
	"redline", "arcahvdistort", "arcahvdebris",
	"hidegroup", "enwidencamera", "enwidenlanes"
]

const genAllowMemesResult = (file: AFFFile): AllowMemesResult => {
	const enableAllowMemesWithItem = (item: WithLocation<AFFItem>): AllowMemesResult => ({
		enable: true,
		errors: [{
			message: "Allow memes mode is turned on since memes events present, some checks will be skipped",
			severity: DiagnosticSeverity.Hint,
			location: file.metadata.data.metaEndLocation,
			relatedInfo: [{
				message: `The event that triggered the allow memes mode`,
				location: item.location
			}]
		}]
	})
	for (const item of file.items) {
		if (item.data.kind === "camera") {
			return enableAllowMemesWithItem(item)
		} else if (item.data.kind === "scenecontrol") {
			if (!nonMemeSceneControlKind.includes(item.data.sceneControlKind.data.value)) {
				return enableAllowMemesWithItem(item)
			}
		} else if (item.data.kind === "arc") {
			if (item.data.colorId.data.value === 2) {
				return enableAllowMemesWithItem(item)
			}
			if (item.data.colorId.data.value === 3 && !isLine(item.data.lineKind.data)) {
				return enableAllowMemesWithItem(item)
			}
		} else if (item.data.kind === "timinggroup") {
			if (timings.get(item.data).attributes.filter((attr) => /^angle[xy][0-9]+$/.test(attr)).length > 0) {
				return enableAllowMemesWithItem(item)
			}
			for (const nestedItem of item.data.items.data) {
				if (nestedItem.data.kind === "camera") {
					return enableAllowMemesWithItem(nestedItem)
				} else if (nestedItem.data.kind === "scenecontrol") {
					if (!nonMemeSceneControlKind.includes(nestedItem.data.sceneControlKind.data.value)) {
						return enableAllowMemesWithItem(nestedItem)
					}
				} else if (nestedItem.data.kind === "arc") {
					if (nestedItem.data.colorId.data.value === 2) {
						return enableAllowMemesWithItem(nestedItem)
					}
				}
			}
		}
	}
	return { enable: false, errors: [] }
}

export const allowMemes = new AssociatedDataMap(genAllowMemesResult)