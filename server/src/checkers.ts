import { valueRangeChecker } from "./checker/value-range"
import { AFFFile, AFFError } from "./types"

const checkers = [valueRangeChecker]

export const processCheckers = (file: AFFFile): AFFError[] => {
	let errors: AFFError[] = []
	for (const checker of checkers) {
		checker(file, errors)
	}
	return errors
}