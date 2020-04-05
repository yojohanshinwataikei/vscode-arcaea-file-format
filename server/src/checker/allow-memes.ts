import { AFFChecker } from "../types"
import { allowMemes } from "../associated-data/allow-memes"

export const allowMemesChecker: AFFChecker = (file, error) => {
	error.splice(error.length, 0, ...allowMemes.get(file).errors)
}