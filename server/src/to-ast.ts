import { DiagnosticSeverity } from "vscode-languageserver";
import { CstChildrenDictionary, IToken, CstNode, ICstVisitor, CstNodeLocation, tokenLabel } from "chevrotain"
import { BaseAffVisitor } from "./parser"
import { AFFEvent, AFFItem, AFFFile, AFFMetadata, AFFMetadataEntry, AFFError, AFFValue, WithLocation, AFFTapEvent, AFFValues, AFFHoldEvent, AFFArctapEvent, AFFTimingEvent, AFFArcEvent } from "./types"
import { tokenTypes } from "./lexer";

// This pass generate AST from CST.
// It will report errors for things that is valid in CST but not in AST.
// Additional error reporting should check AST instead of CST, so they are not included here
class ToASTVisitor extends BaseAffVisitor implements ICstVisitor<AFFError[], any> {
	constructor() {
		super()
		this.validateVisitor()
	}
	metadataEntry(ctx: CstChildrenDictionary, errors: AFFError[]): AFFMetadataEntry {
		const key = ctx.key[0] as IToken
		const data = ctx.data[0] as IToken
		return {
			key: { data: key.image, location: locationFromToken(key) },
			value: { data: data.image, location: locationFromToken(data) },
		}
	}
	metadata(ctx: CstChildrenDictionary, errors: AFFError[]): AFFMetadata {
		let metadata: AFFMetadata["data"] = new Map()
		const entries = ctx.metadataEntry ? (ctx.metadataEntry as CstNode[]).map(node => ({ node, entry: this.visit(node, errors) as AFFMetadataEntry })) : []
		for (const { node, entry } of entries) {
			const key = entry.key.data
			if (metadata.has(key)) {
				let location = metadata.get(key).data.key.location
				// error: duplicated entry key
				errors.push({
					message: `"${key}" is defined twice in the metadata section.`,
					location: entry.key.location,
					severity: DiagnosticSeverity.Error,
					relatedInfo: [{
						message: "Previous defination",
						location
					}]
				})
			} else {
				metadata.set(key, { data: entry, location: node.location })
			}
		}
		return { data: metadata, metaEndLocation: locationFromToken(ctx.metaEnd[0] as IToken) }
	}
	values(ctx: CstChildrenDictionary, errors: AFFError[]): WithLocation<AFFValue>[] {
		return ctx.value ? (ctx.value as IToken[]).map((token) => ({
			data: ((token): AFFValue => {
				if (token.tokenType === tokenTypes.word) {
					return { kind: "word", value: token.image }
				} else if (token.tokenType === tokenTypes.int) {
					return { kind: "int", value: parseInt(token.image) }
				} else if (token.tokenType === tokenTypes.float) {
					return { kind: "float", value: parseFloat(token.image), digit: token.image.length - token.image.indexOf(".") - 1 }
				} else {
					throw new Error(`unknown token type ${token.tokenType}`)
				}
			})(token),
			location: locationFromToken(token)
		})) : []
	}
	event(ctx: CstChildrenDictionary, errors: AFFError[]): AFFEvent | null {
		// type checks
		const values = this.visit(ctx.values[0] as CstNode) as WithLocation<AFFValue>[]
		const valuesLocation = (ctx.values[0] as CstNode).location
		const subevents = ctx.subevents ? this.visit(ctx.subevents[0] as CstNode,errors) as WithLocation<AFFEvent>[] : null
		const subeventsLocation = ctx.subevents ? (ctx.subevents[0] as CstNode).location : null
		if (ctx.word) {
			const tag = ctx.word[0] as IToken
			const tagLocation = locationFromToken(tag)
			if (tag.image === "timing") {
				return eventTransformer.timing(errors, values, valuesLocation, subevents, subeventsLocation, tagLocation)
			} else if (tag.image === "hold") {
				return eventTransformer.hold(errors, values, valuesLocation, subevents, subeventsLocation, tagLocation)
			} else if (tag.image === "arc") {
				return eventTransformer.arc(errors, values, valuesLocation, subevents, subeventsLocation, tagLocation)
			} else if (tag.image === "arctap") {
				return eventTransformer.arctap(errors, values, valuesLocation, subevents, subeventsLocation, tagLocation)
			} else {
				// error: unknown tag
				errors.push({
					message: `Unknown event type "${tag.image}".`,
					location: locationFromToken(tag),
					severity: DiagnosticSeverity.Error
				})
				return null
			}
		} else {
			return eventTransformer.tap(errors, values, valuesLocation, subevents, subeventsLocation)
		}
	}
	subevents(ctx: CstChildrenDictionary, errors: AFFError[]): WithLocation<AFFEvent>[] {
		return ctx.event ? (ctx.event as CstNode[]).map(node => ({
			data: this.visit(node, errors) as AFFEvent | null,
			location: node.location
		})).filter(e => e.data !== null) : []
	}
	item(ctx: CstChildrenDictionary, errors: AFFError[]): WithLocation<AFFItem> | null {
		let node = ctx.event[0] as CstNode
		let event = this.visit(node, errors) as AFFEvent | null
		if (event !== null) {
			if (event.kind === "arctap") {
				//error: arctap should not be items
				errors.push({
					message: `Event with type "${event.kind}" should not be used as an item.`,
					location: event.tagLocation,
					severity: DiagnosticSeverity.Error
				})
				return null
			}
			return { data: event, location: node.location }
		}
		return null
	}
	items(ctx: CstChildrenDictionary, errors: AFFError[]): WithLocation<AFFItem>[] {
		return ctx.item ? (ctx.item as CstNode[]).map(node => this.visit(node, errors) as WithLocation<AFFItem> | null).filter(e => e !== null) : []
	}
	aff(ctx: CstChildrenDictionary, errors: AFFError[]): AFFFile {
		const metadataNode = ctx.metadata[0] as CstNode
		const metadata = this.visit(metadataNode, errors) as AFFMetadata
		const items = this.visit(ctx.items[0] as CstNode, errors) as WithLocation<AFFItem>[]
		return { metadata: { data: metadata, location: metadataNode.location }, items }
	}
}

const toASTVisitor = new ToASTVisitor()

export const affToAST = (aff) => {
	let errors: AFFError[] = []
	const ast = toASTVisitor.visit(aff, errors) as AFFFile
	return { ast, errors }
}

// helpers
const locationFromToken = (token: IToken): CstNodeLocation => {
	const { startColumn, startLine, startOffset, endColumn, endLine, endOffset } = token
	return { startColumn, startLine, startOffset, endColumn, endLine, endOffset }
}

const rejectSubevent = (errors: AFFError[], kind: string, subevents: WithLocation<AFFEvent>[] | null, subeventsLocation: CstNodeLocation | null) => {
	if (subevents !== null) {
		// error: unexpected subevent
		errors.push({
			message: `Event with type "${kind}" should not have subevents.`,
			location: subeventsLocation,
			severity: DiagnosticSeverity.Error,
		})
	}
}

const checkValuesCount = (errors: AFFError[], kind: string, count: number, values: WithLocation<AFFValue>[], valuesLocation: CstNodeLocation): boolean => {
	if (values.length !== count) {
		// error: value count missmatch
		errors.push({
			message: `Event with type "${kind}" should have ${count} value(s) instead of ${values.length} value(s).`,
			location: valuesLocation,
			severity: DiagnosticSeverity.Error,
		})
		return false
	}
	return true
}

const checkValueType = <T extends keyof AFFValues>(errors: AFFError[], eventKind: string, kind: T, values: WithLocation<AFFValue>[], id: number): WithLocation<AFFValues[T]> | null => {
	const value = values[id]
	if (value.data.kind !== kind) {
		// error: value type missmatch
		errors.push({
			message: `The ${id + 1}-st/nd/rd/th value of event with type "${eventKind}" should be "${kind}" instead of "${value.data.kind}"`,
			location: values[id].location,
			severity: DiagnosticSeverity.Error,
		})
		return null
	} else {
		return value as WithLocation<AFFValues[T]>
	}
}

const eventTransformer = {
	tap: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
	): AFFTapEvent | null => {
		rejectSubevent(errors, "tap", subevents, subeventsLocation)
		if (!checkValuesCount(errors, "tap", 2, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "tap", "int", values, 0)
		const track = checkValueType(errors, "tap", "int", values, 1)
		if (time === null || track === null) {
			return null
		}
		return { kind: "tap", time, track }
	},
	hold: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFHoldEvent | null => {
		rejectSubevent(errors, "hold", subevents, subeventsLocation)
		if (!checkValuesCount(errors, "hold", 3, values, valuesLocation)) {
			return null
		}
		const start = checkValueType(errors, "hold", "int", values, 0)
		const end = checkValueType(errors, "hold", "int", values, 0)
		const track = checkValueType(errors, "hold", "int", values, 1)
		if (start === null || end === null || track === null) {
			return null
		}
		return { kind: "hold", start, end, track, tagLocation }
	},
	arctap: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFArctapEvent | null => {
		rejectSubevent(errors, "arctap", subevents, subeventsLocation)
		if (!checkValuesCount(errors, "arctap", 1, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "arctap", "int", values, 0)
		if (time === null) {
			return null
		}
		return { kind: "arctap", time, tagLocation }
	},
	timing: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFTimingEvent | null => {
		rejectSubevent(errors, "timing", subevents, subeventsLocation)
		if (!checkValuesCount(errors, "timing", 3, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "timing", "int", values, 0)
		const bpm = checkValueType(errors, "timing", "float", values, 1)
		const segment = checkValueType(errors, "timing", "float", values, 2)
		if (time === null || bpm === null || segment === null) {
			return null
		}
		return { kind: "timing", time, bpm, segment, tagLocation }
	},
	arc: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFArcEvent | null => {
		if (!checkValuesCount(errors, "arc", 10, values, valuesLocation)) {
			return null
		}
		const start = checkValueType(errors, "arc", "int", values, 0)
		const end = checkValueType(errors, "arc", "int", values, 1)
		const xStart = checkValueType(errors, "arc", "float", values, 2)
		const xEnd = checkValueType(errors, "arc", "float", values, 3)
		const arcKind = checkValueType(errors, "arc", "word", values, 4)
		const yStart = checkValueType(errors, "arc", "float", values, 5)
		const yEnd = checkValueType(errors, "arc", "float", values, 6)
		const colorId = checkValueType(errors, "arc", "int", values, 7)
		const effect = checkValueType(errors, "arc", "word", values, 8)
		const isLine = checkValueType(errors, "arc", "word", values, 9)
		if (start === null || end === null ||
			xStart === null || xEnd === null || arcKind === null ||
			yStart === null || yEnd === null || colorId === null ||
			effect === null || isLine === null) {
			return null
		}
		return {
			kind: "arc", start, end, xStart, xEnd, arcKind, yStart, yEnd, colorId, effect, isLine,
			arctaps: subevents ? transformArcSubevents(errors, subevents, subeventsLocation) : undefined, tagLocation
		}
	}
}

const transformArcSubevents = (
	errors: AFFError[],
	subevents: WithLocation<AFFEvent>[],
	subeventsLocation: CstNodeLocation
): WithLocation<WithLocation<AFFArctapEvent>[]> => {
	let arctaps: WithLocation<AFFArctapEvent>[] = []
	for (const { location, data: event } of subevents) {
		if (event.kind !== "arctap") {
			errors.push({
				message: `Type of subevent of event with type "arc" should be "arctap" instead of "${event.kind}"`,
				location: location,
				severity: DiagnosticSeverity.Error,
			})
		} else {
			arctaps.push({ location, data: event })
		}
	}
	return { data: arctaps, location: subeventsLocation }
}