import { AFFChecker } from "../types"
import { enwidens } from "../associated-data/enwiden"

export const enwidenChecker: AFFChecker = (file, error) => {
	error.splice(error.length, 0, ...enwidens.get(file).errors)
}