import { AFFChecker } from "../types"
import { timings } from "../associated-data/timing"

export const timingChecker: AFFChecker = (file, error) => {
	error.splice(error.length, 0, ...timings.get(file).errors)
	for (const item of file.items) {
		if (item.data.kind === "timinggroup") {
			error.splice(error.length, 0, ...timings.get(item.data).errors)
		}
	}
}