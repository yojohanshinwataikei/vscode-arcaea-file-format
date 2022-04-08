import { DiagnosticSeverity } from "vscode-languageserver";
import { CstChildrenDictionary, IToken, CstNode, ICstVisitor, CstNodeLocation } from "chevrotain"
import { BaseAffVisitor } from "./parser"
import { AFFEvent, AFFItem, AFFFile, AFFMetadata, AFFMetadataEntry, AFFError, AFFValue, WithLocation, AFFTapEvent, AFFValues, AFFHoldEvent, AFFArctapEvent, AFFTimingEvent, AFFArcEvent, AFFTrackId, AFFInt, AFFColorId, AFFArcKind, AFFWord, affArcKinds, affTrackIds, affColorIds, affEffects, AFFEffect, AFFBool, affBools, AFFCameraEvent, AFFCameraKind, affCameraKinds, AFFSceneControlEvent, AFFSceneControlKind, AFFTimingGroupEvent, AFFNestableItem, AFFTimingGroupKind } from "./types"
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
		const subevents = ctx.subevents ? this.visit(ctx.subevents[0] as CstNode, errors) as WithLocation<AFFEvent>[] : null
		const subeventsLocation = ctx.subevents ? (ctx.subevents[0] as CstNode).location : null
		const segment = ctx.segment ? this.visit(ctx.segment[0] as CstNode, errors) as WithLocation<AFFEvent>[] : null
		const segmentLocation = ctx.segment ? (ctx.segment[0] as CstNode).location : null
		if (ctx.word) {
			const tag = ctx.word[0] as IToken
			const tagLocation = locationFromToken(tag)
			if (tag.image === "timing") {
				return eventTransformer.timing(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation, tagLocation)
			} else if (tag.image === "hold") {
				return eventTransformer.hold(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation, tagLocation)
			} else if (tag.image === "arc") {
				return eventTransformer.arc(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation, tagLocation)
			} else if (tag.image === "arctap") {
				return eventTransformer.arctap(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation, tagLocation)
			} else if (tag.image === "camera") {
				return eventTransformer.camera(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation, tagLocation)
			} else if (tag.image === "scenecontrol") {
				return eventTransformer.scenecontrol(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation, tagLocation)
			} else if (tag.image === "timinggroup") {
				return eventTransformer.timinggroup(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation, tagLocation)
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
			return eventTransformer.tap(errors, values, valuesLocation, subevents, subeventsLocation, segment, segmentLocation)
		}
	}
	subevents(ctx: CstChildrenDictionary, errors: AFFError[]): WithLocation<AFFEvent>[] {
		return ctx.event ? (ctx.event as CstNode[]).map(node => ({
			data: this.visit(node, errors) as AFFEvent | null,
			location: node.location
		})).filter(e => e.data !== null) : []
	}
	segment(ctx: CstChildrenDictionary, errors: AFFError[]): WithLocation<AFFItem>[] {
		return ctx.items ? this.visit(ctx.items[0] as CstNode, errors) : []
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

const rejectSegment = (errors: AFFError[], kind: string, segment: WithLocation<AFFEvent>[] | null, segmentLocation: CstNodeLocation | null) => {
	if (segment !== null) {
		// error: unexpected subevent
		errors.push({
			message: `Event with type "${kind}" should not have segment.`,
			location: segmentLocation,
			severity: DiagnosticSeverity.Error,
		})
	}
}

const ensureValuesCount = (errors: AFFError[], kind: string, count: number, values: WithLocation<AFFValue>[], valuesLocation: CstNodeLocation): boolean => {
	if (values.length < count) {
		// error: value count missmatch
		errors.push({
			message: `Event with type "${kind}" should have at least ${count} field(s) instead of ${values.length} field(s).`,
			location: valuesLocation,
			severity: DiagnosticSeverity.Error,
		})
		return false
	}
	return true
}

const limitValuesCount = (errors: AFFError[], kind: string, count: number, values: WithLocation<AFFValue>[], valuesLocation: CstNodeLocation): boolean => {
	if (values.length > count) {
		// error: value count missmatch
		errors.push({
			message: `Event with type "${kind}" should have at most ${count} field(s) instead of ${values.length} field(s).`,
			location: valuesLocation,
			severity: DiagnosticSeverity.Error,
		})
		return false
	}
	return true
}

const checkValuesCount = (errors: AFFError[], kind: string, count: number, values: WithLocation<AFFValue>[], valuesLocation: CstNodeLocation): boolean => {
	if (values.length !== count) {
		// error: value count missmatch
		errors.push({
			message: `Event with type "${kind}" should have ${count} field(s) instead of ${values.length} field(s).`,
			location: valuesLocation,
			severity: DiagnosticSeverity.Error,
		})
		return false
	}
	return true
}

const checkValueType = <T extends keyof AFFValues>(
	errors: AFFError[],
	eventKind: string,
	fieldname: string,
	kind: T,
	values: WithLocation<AFFValue>[],
	id: number
): WithLocation<AFFValues[T]> | null => {
	const value = values[id]
	if (value.data.kind !== kind) {
		// error: value type missmatch
		errors.push({
			message: `The value in the "${fieldname}" field of event with type "${eventKind}" should be "${kind}" instead of "${value.data.kind}"`,
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
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
	): AFFTapEvent | null => {
		rejectSubevent(errors, "tap", subevents, subeventsLocation)
		rejectSegment(errors, "tap", segment, segmentLocation)
		if (!checkValuesCount(errors, "tap", 2, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "tap", "time", "int", values, 0)
		const rawTrackId = checkValueType(errors, "tap", "track-id", "int", values, 1)
		const trackId = parseValue.trackId(errors, "tap", "track-id", rawTrackId)
		if (time === null || trackId === null) {
			return null
		}
		return { kind: "tap", time, trackId: trackId }
	},
	hold: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFHoldEvent | null => {
		rejectSubevent(errors, "hold", subevents, subeventsLocation)
		rejectSegment(errors, "hold", segment, segmentLocation)
		if (!checkValuesCount(errors, "hold", 3, values, valuesLocation)) {
			return null
		}
		const start = checkValueType(errors, "hold", "start", "int", values, 0)
		const end = checkValueType(errors, "hold", "end", "int", values, 1)
		const rawTrackId = checkValueType(errors, "hold", "track-id", "int", values, 2)
		const trackId = parseValue.trackId(errors, "hold", "track-id", rawTrackId)
		if (start === null || end === null || trackId === null) {
			return null
		}
		return { kind: "hold", start, end, trackId: trackId, tagLocation }
	},
	arctap: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFArctapEvent | null => {
		rejectSubevent(errors, "arctap", subevents, subeventsLocation)
		rejectSegment(errors, "arctap", segment, segmentLocation)
		if (!checkValuesCount(errors, "arctap", 1, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "arctap", "time", "int", values, 0)
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
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFTimingEvent | null => {
		rejectSubevent(errors, "timing", subevents, subeventsLocation)
		rejectSegment(errors, "timing", segment, segmentLocation)
		if (!checkValuesCount(errors, "timing", 3, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "timing", "time", "int", values, 0)
		const bpm = checkValueType(errors, "timing", "bpm", "float", values, 1)
		const measure = checkValueType(errors, "timing", "measure", "float", values, 2)
		if (time === null || bpm === null || measure === null) {
			return null
		}
		return { kind: "timing", time, bpm, measure, tagLocation }
	},
	arc: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFArcEvent | null => {
		rejectSegment(errors, "arc", segment, segmentLocation)
		if (!checkValuesCount(errors, "arc", 10, values, valuesLocation)) {
			return null
		}
		const start = checkValueType(errors, "arc", "start", "int", values, 0)
		const end = checkValueType(errors, "arc", "end", "int", values, 1)
		const xStart = checkValueType(errors, "arc", "x-start", "float", values, 2)
		const xEnd = checkValueType(errors, "arc", "x-end", "float", values, 3)
		const rawArcKind = checkValueType(errors, "arc", "arc-kind", "word", values, 4)
		const arcKind = parseValue.arcKind(errors, "arc", "arc-kind", rawArcKind)
		const yStart = checkValueType(errors, "arc", "y-start", "float", values, 5)
		const yEnd = checkValueType(errors, "arc", "y-end", "float", values, 6)
		const rawColorId = checkValueType(errors, "arc", "color-id", "int", values, 7)
		const colorId = parseValue.colorId(errors, "arc", "color-id", rawColorId)
		const rawEffect = checkValueType(errors, "arc", "effect", "word", values, 8)
		const effect = parseValue.effect(errors, "arc", "effect", rawEffect)
		const rawIsLine = checkValueType(errors, "arc", "is-line", "word", values, 9)
		const isLine = parseValue.bool(errors, "arc", "is-line", rawIsLine)
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
	},
	camera: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFCameraEvent | null => {
		rejectSubevent(errors, "camera", subevents, subeventsLocation)
		rejectSegment(errors, "camera", segment, segmentLocation)
		if (!checkValuesCount(errors, "camera", 9, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "camera", "time", "int", values, 0)
		const translationX = checkValueType(errors, "camera", "translation-x", "float", values, 1)
		const translationY = checkValueType(errors, "camera", "translation-y", "float", values, 2)
		const translationZ = checkValueType(errors, "camera", "translation-z", "float", values, 3)
		const rotationX = checkValueType(errors, "camera", "rotation-x", "float", values, 4)
		const rotationY = checkValueType(errors, "camera", "rotation-y", "float", values, 5)
		const rotationZ = checkValueType(errors, "camera", "rotation-z", "float", values, 6)
		const rawCameraKind = checkValueType(errors, "camera", "camera-kind", "word", values, 7)
		const cameraKind = parseValue.cameraKind(errors, "camera", "camera-kind", rawCameraKind)
		const duration = checkValueType(errors, "camera", "time", "int", values, 8)
		if (time === null ||
			translationX === null || translationY === null || translationZ === null ||
			rotationX === null || rotationY === null || rotationZ === null ||
			cameraKind === null || duration === null
		) {
			return null
		}
		return {
			kind: "camera", time, translationX, translationY, translationZ, rotationX, rotationY, rotationZ, cameraKind, duration,
			tagLocation
		}
	},
	scenecontrol: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFSceneControlEvent | null => {
		rejectSubevent(errors, "scenecontrol", subevents, subeventsLocation)
		rejectSegment(errors, "scenecontrol", segment, segmentLocation)
		if (!ensureValuesCount(errors, "scenecontrol", 2, values, valuesLocation)) {
			return null
		}
		const time = checkValueType(errors, "scenecontrol", "time", "int", values, 0)
		const rawSceneControlKind = checkValueType(errors, "scenecontrol", "scenecontrol-kind", "word", values, 1)
		const sceneControlKind = parseValue.sceneControlKind(errors, "scenecontrol", "scenecontrol-kind", rawSceneControlKind)
		const additionalValues = sceneControlKind === null ? null : {
			data: values.slice(2),
			location: {
				startOffset: sceneControlKind.location.endOffset + 1,
				startLine: sceneControlKind.location.endLine,
				startColumn: sceneControlKind.location.endColumn + 1,
				endOffset: valuesLocation.endOffset,
				endLine: valuesLocation.endLine,
				endColumn: valuesLocation.endColumn,
			}
		}
		if (time === null || sceneControlKind === null) {
			return null
		}
		return {
			kind: "scenecontrol", time, sceneControlKind, tagLocation, values: additionalValues
		}
	},
	timinggroup: (
		errors: AFFError[],
		values: WithLocation<AFFValue>[],
		valuesLocation: CstNodeLocation,
		subevents: WithLocation<AFFEvent>[] | null,
		subeventsLocation: CstNodeLocation | null,
		segment: WithLocation<AFFEvent>[] | null,
		segmentLocation: CstNodeLocation | null,
		tagLocation: CstNodeLocation,
	): AFFTimingGroupEvent | null => {
		rejectSubevent(errors, "timinggroup", subevents, subeventsLocation)
		if (!limitValuesCount(errors, "timinggroup", 1, values, valuesLocation)) {
			return null
		}
		const rawTimingGroupKind = values.length > 0 ? checkValueType(errors, "timinggroup", "timinggroup-kind", "word", values, 0) : null
		const maybeTimingGroupKind = parseValue.timingGroupKind(errors, "timinggroup", "timinggroup-kind", rawTimingGroupKind)
		const timingGroupKind = maybeTimingGroupKind ?? {
			location: valuesLocation,
			data: {
				kind: "timinggroup-kind",
				value: ""
			}
		}
		return {
			kind: "timinggroup", items: selectNestedItems(errors, segment, segmentLocation), tagLocation, timingGroupAttribute: timingGroupKind
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

const selectNestedItems = (
	errors: AFFError[],
	segment: WithLocation<AFFEvent>[],
	segmentLocation: CstNodeLocation
): WithLocation<WithLocation<AFFNestableItem>[]> => {
	let items: WithLocation<AFFNestableItem>[] = []
	for (const { location, data: item } of segment) {
		if (item.kind === "timinggroup") {
			errors.push({
				message: `Item of type "${item.kind}" cannot be nested in timinggroup`,
				location: location,
				severity: DiagnosticSeverity.Error,
			})
		} else {
			items.push({ location, data: item } as WithLocation<AFFNestableItem>)
		}
	}
	return { data: items, location: segmentLocation }
}

const parseValue = {
	trackId: (errors: AFFError[], eventKind: string, fieldname: string, int: WithLocation<AFFInt> | null): WithLocation<AFFTrackId> => {
		if (int) {
			const { data, location } = int
			const intValue = data.value
			if (!Number.isInteger(intValue)) {
				throw new Error(`value in AFFInt(${intValue}) is not int`)
			}
			if (intValue < 1 || intValue > 4) {
				errors.push({
					message: `The value in the "${fieldname}" field of event with type "${eventKind}" should be one of ${[...affTrackIds.values()].join()}`,
					location,
					severity: DiagnosticSeverity.Error,
				})
				return null
			}
			return { data: { kind: "track-id", value: intValue } as AFFTrackId, location }
		} else {
			return null
		}
	},
	colorId: (errors: AFFError[], eventKind: string, fieldname: string, int: WithLocation<AFFInt> | null): WithLocation<AFFColorId> => {
		if (int) {
			const { data, location } = int
			const intValue = data.value
			if (!Number.isInteger(intValue)) {
				throw new Error(`value in AFFInt(${intValue}) is not int`)
			}
			if (intValue < 0 || intValue > 2) {
				errors.push({
					message: `The value in the "${fieldname}" field of event with type "${eventKind}" should be one of ${[...affColorIds.values()].join()}`,
					location,
					severity: DiagnosticSeverity.Error,
				})
				return null
			}
			return { data: { kind: "color-id", value: intValue } as AFFColorId, location }
		} else {
			return null
		}
	},
	arcKind: (errors: AFFError[], eventKind: string, fieldname: string, word: WithLocation<AFFWord> | null): WithLocation<AFFArcKind> => {
		if (word) {
			const { data, location } = word
			const wordValue = data.value
			if (!affArcKinds.has(wordValue)) {
				errors.push({
					message: `The value in the "${fieldname}" field of event with type "${eventKind}" should be one of ${[...affArcKinds.values()].join()}`,
					location,
					severity: DiagnosticSeverity.Error,
				})
				return null
			}
			return { data: { kind: "arc-kind", value: wordValue } as AFFArcKind, location }
		} else {
			return null
		}
	},
	effect: (errors: AFFError[], eventKind: string, fieldname: string, word: WithLocation<AFFWord> | null): WithLocation<AFFEffect> => {
		if (word) {
			const { data, location } = word
			const wordValue = data.value
			if (!affEffects.has(wordValue)) {
				errors.push({
					message: `The value in the "${fieldname}" field of event with type "${eventKind}" should be one of ${[...affEffects.values()].join()}`,
					location,
					severity: DiagnosticSeverity.Error,
				})
				return null
			}
			return { data: { kind: "effect", value: wordValue } as AFFEffect, location }
		} else {
			return null
		}
	},
	bool: (errors: AFFError[], eventKind: string, fieldname: string, word: WithLocation<AFFWord> | null): WithLocation<AFFBool> => {
		if (word) {
			const { data, location } = word
			const wordValue = data.value
			if (!affBools.has(wordValue)) {
				errors.push({
					message: `The value in the "${fieldname}" field of event with type "${eventKind}" should be one of ${[...affBools.values()].join()}`,
					location,
					severity: DiagnosticSeverity.Error,
				})
				return null
			}
			return { data: { kind: "bool", value: wordValue === "true" } as AFFBool, location }
		} else {
			return null
		}
	},
	cameraKind: (errors: AFFError[], eventKind: string, fieldname: string, word: WithLocation<AFFWord> | null): WithLocation<AFFCameraKind> => {
		if (word) {
			const { data, location } = word
			const wordValue = data.value
			if (!affCameraKinds.has(wordValue)) {
				errors.push({
					message: `The value in the "${fieldname}" field of event with type "${eventKind}" should be one of ${[...affCameraKinds.values()].join()}`,
					location,
					severity: DiagnosticSeverity.Error,
				})
				return null
			}
			return { data: { kind: "camera-kind", value: wordValue } as AFFCameraKind, location }
		} else {
			return null
		}
	},
	sceneControlKind: (errors: AFFError[], eventKind: string, fieldname: string, word: WithLocation<AFFWord> | null): WithLocation<AFFSceneControlKind> => {
		if (word) {
			const { data, location } = word
			const wordValue = data.value
			return { data: { kind: "scenecontrol-kind", value: wordValue } as AFFSceneControlKind, location }
		} else {
			return null
		}
	},
	timingGroupKind: (errors: AFFError[], eventKind: string, fieldname: string, word: WithLocation<AFFWord> | null): WithLocation<AFFTimingGroupKind> => {
		if (word) {
			const { data, location } = word
			const wordValue = data.value
			return { data: { kind: "timinggroup-kind", value: wordValue } as AFFTimingGroupKind, location }
		} else {
			return null
		}
	}
}