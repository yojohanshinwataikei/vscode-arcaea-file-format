import { CstNodeLocation } from "chevrotain"
import { DiagnosticSeverity } from "vscode-languageserver";

export interface WithLocation<T> {
	data: T,
	location: CstNodeLocation,
}
export interface AFFTimingEvent {
	kind: "timing",
	tagLocation: CstNodeLocation,
	time: WithLocation<AFFInt>,
	bpm: WithLocation<AFFFloat>,
	measure: WithLocation<AFFFloat>,
}

export interface AFFTapEvent {
	kind: "tap",
	time: WithLocation<AFFInt>,
	trackId: WithLocation<AFFTrackId>,
}

export interface AFFHoldEvent {
	kind: "hold",
	tagLocation: CstNodeLocation,
	start: WithLocation<AFFInt>,
	end: WithLocation<AFFInt>,
	trackId: WithLocation<AFFTrackId>,
}

export interface AFFArcEvent {
	kind: "arc",
	tagLocation: CstNodeLocation,
	start: WithLocation<AFFInt>,
	end: WithLocation<AFFInt>,
	xStart: WithLocation<AFFFloat>,
	xEnd: WithLocation<AFFFloat>,
	curveKind: WithLocation<AFFArcCurveKind>,
	yStart: WithLocation<AFFFloat>,
	yEnd: WithLocation<AFFFloat>,
	colorId: WithLocation<AFFColorId>,
	effect: WithLocation<AFFEffect>,
	lineKind: WithLocation<AFFArcLineKind>,
	smoothness?: WithLocation<AFFFloat>,
	arctaps?: WithLocation<WithLocation<AFFArctapEvent>[]>,
}

export interface AFFArctapEvent {
	kind: "arctap",
	tagLocation: CstNodeLocation,
	time: WithLocation<AFFInt>,
}

export interface AFFCameraEvent {
	kind: "camera"
	tagLocation: CstNodeLocation,
	time: WithLocation<AFFInt>,
	translationX: WithLocation<AFFFloat>,
	translationY: WithLocation<AFFFloat>,
	translationZ: WithLocation<AFFFloat>,
	rotationX: WithLocation<AFFFloat>,
	rotationY: WithLocation<AFFFloat>,
	rotationZ: WithLocation<AFFFloat>,
	cameraKind: WithLocation<AFFCameraKind>
	duration: WithLocation<AFFInt>
}

export interface AFFSceneControlEvent {
	kind: "scenecontrol",
	tagLocation: CstNodeLocation,
	time: WithLocation<AFFInt>,
	sceneControlKind: WithLocation<AFFSceneControlKind>
	values: WithLocation<WithLocation<AFFValue>[]>
}

export interface AFFTimingGroupEvent {
	kind: "timinggroup",
	timingGroupAttribute: WithLocation<AFFTimingGroupKind>,
	tagLocation: CstNodeLocation,
	items: WithLocation<WithLocation<AFFNestableItem>[]>,
}

export type AFFTrackItem = AFFTapEvent | AFFHoldEvent
export type AFFNestableItem = AFFTimingEvent | AFFTrackItem | AFFArcEvent | AFFSceneControlEvent | AFFCameraEvent
export type AFFItem = AFFNestableItem | AFFCameraEvent | AFFTimingGroupEvent
export type AFFEvent = AFFItem | AFFArctapEvent

export interface AFFInt {
	kind: "int",
	value: number,
}

export interface AFFFloat {
	kind: "float",
	value: number,
	digit: number,
}

export interface AFFWord {
	kind: "word",
	value: string
}

export type AFFValues = {
	int: AFFInt,
	float: AFFFloat,
	word: AFFWord,
}
export type AFFValue = AFFValues[keyof AFFValues]

export interface AFFTrackId {
	kind: "track-id",
	value: 0 | 1 | 2 | 3 | 4 | 5,
}
export type AFFTrackIdValue = AFFTrackId["value"]
export const affTrackIds = new Set<AFFTrackIdValue>([0, 1, 2, 3, 4, 5])

export interface AFFColorId {
	kind: "color-id",
	value: 0 | 1 | 2 | 3 | 4,
}
export type AFFColorIdValue = AFFColorId["value"]
export const affColorIds = new Set<AFFColorIdValue>([0, 1, 2, 3])

export interface AFFEffect {
	kind: "effect",
	value: string
}

export interface AFFArcCurveKind {
	kind: "arc-curve-kind",
	value: "b" | "s" | "si" | "so" | "sisi" | "siso" | "soso" | "sosi"
}
export const affArcCurveKinds = new Set(["b", "s", "si", "so", "sisi", "siso", "soso", "sosi"])

export interface AFFCameraKind {
	kind: "camera-kind",
	value: "l" | "s" | "qi" | "qo" | "reset"
}
export const affCameraKinds = new Set(["l", "s", "qi", "qo", "reset"])

export interface AFFSceneControlKind {
	kind: "scenecontrol-kind",
	value: string
}

export interface AFFTimingGroupKind {
	kind: "timinggroup-kind",
	value: string
}

export interface AFFArcLineKind {
	kind: "arc-line-kind",
	value: string
}
export const affArcLineKinds = new Set(["true", "false", "designant"])
export const isLine = (data: AFFArcLineKind) => data.value !== "false"

export interface AFFMetadataEntry {
	key: WithLocation<string>,
	value: WithLocation<string>,
}

export interface AFFMetadata {
	data: Map<string, WithLocation<AFFMetadataEntry>>
	metaEndLocation: CstNodeLocation
}

export interface AFFFile {
	metadata: WithLocation<AFFMetadata>,
	items: WithLocation<AFFItem>[],
}

export interface AFFErrorRelatedInfo {
	message: string,
	location: CstNodeLocation,
}

export interface AFFError {
	message: string,
	location: CstNodeLocation,
	severity: DiagnosticSeverity,
	relatedInfo?: AFFErrorRelatedInfo[],
}

export type AFFChecker = (file: AFFFile, errors: AFFError[]) => void