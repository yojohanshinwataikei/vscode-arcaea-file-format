import { metadataChecker } from "./checker/metadata";
import { valueRangeChecker } from "./checker/value-range"
import { AFFFile, AFFError } from "./types"

const checkers = [metadataChecker, valueRangeChecker]

export const processCheckers = (file: AFFFile): AFFError[] => {
	let errors: AFFError[] = []
	for (const checker of checkers) {
		checker(file, errors)
	}
	return errors
}