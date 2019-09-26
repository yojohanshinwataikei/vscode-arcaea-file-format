import { metadataChecker } from "./checker/metadata"
import { valueRangeChecker } from "./checker/value-range"
import { floatDigitChecker } from "./checker/float-digit"
import { timingChecker } from "./checker/timing"
import { cutByTimingChecker } from "./checker/cut-by-timing"
import { arcPositionChecker } from "./checker/arc-position"
import { overlapChecker } from "./checker/overlap"
import { AFFFile, AFFError } from "./types"

const checkers = [metadataChecker, valueRangeChecker, floatDigitChecker, timingChecker, cutByTimingChecker, arcPositionChecker, overlapChecker]

export const processCheckers = (file: AFFFile): AFFError[] => {
	let errors: AFFError[] = []
	for (const checker of checkers) {
		checker(file, errors)
	}
	return errors
}