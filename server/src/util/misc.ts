// first item that is not less than value
export const lowerBound = <T, U>(array: T[], value: U, comparer: (a: T, b: U) => number): number => {
	let start = 0, count = array.length
	while (count > 0) {
		const step = (count - count % 2) / 2
		const pos = start + step
		if (comparer(array[start + step], value) < 0) {
			start = pos + 1
			count -= step + 1
		} else {
			count = step
		}
	}
	return start
}

// first item that is greater than value
export const upperBound = <T, U>(array: T[], value: U, comparer: (a: T, b: U) => number): number => {
	let start = 0, count = array.length
	while (count > 0) {
		const step = (count - count % 2) / 2
		const pos = start + step
		if (comparer(array[start + step], value) <= 0) {
			start = pos + 1
			count -= step + 1
		} else {
			count = step
		}
	}
	return start
}