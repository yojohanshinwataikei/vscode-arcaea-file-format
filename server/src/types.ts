import { CstNodeLocation } from "chevrotain"
import { DiagnosticSeverity } from "vscode-languageserver";

export interface WithLocation<T>{
	data:T,
	location: CstNodeLocation,
}
export interface AFFTimingEvent {
	kind: "timing",
	tagLocation: CstNodeLocation,
	time: WithLocation<AFFInt>,
	bpm: WithLocation<AFFFloat>,
	segment: WithLocation<AFFFloat>,
}

export interface AFFTapEvent {
	kind: "tap",
	time: WithLocation<AFFInt>,
	track: WithLocation<AFFInt>,
}

export interface AFFHoldEvent {
	kind: "hold",
	tagLocation: CstNodeLocation,
	start: WithLocation<AFFInt>,
	end: WithLocation<AFFInt>,
	track: WithLocation<AFFInt>,
}

export interface AFFArcEvent {
	kind: "arc",
	tagLocation: CstNodeLocation,
	start: WithLocation<AFFInt>,
	end: WithLocation<AFFInt>,
	xStart: WithLocation<AFFFloat>,
	xEnd: WithLocation<AFFFloat>,
	arcKind: WithLocation<AFFWord>,
	yStart: WithLocation<AFFFloat>,
	yEnd: WithLocation<AFFFloat>,
	colorId: WithLocation<AFFInt>,
	effect: WithLocation<AFFWord>,
	isLine: WithLocation<AFFWord>,
	arctaps?: WithLocation<WithLocation<AFFArctapEvent>[]>,
}

export interface AFFArctapEvent {
	kind: "arctap",
	tagLocation: CstNodeLocation,
	time: WithLocation<AFFInt>,
}

export type AFFItem = AFFTimingEvent | AFFTapEvent | AFFHoldEvent | AFFArcEvent
export type AFFEvent = AFFItem | AFFArctapEvent

export interface AFFInt {
	kind: "int",
	value:number,
}

export interface AFFFloat {
	kind: "float",
	value:number,
	digit:number,
}

export interface AFFWord {
	kind: "word",
	value: string
}

export type AFFValues={
	int:AFFInt,
	float:AFFFloat,
	word:AFFWord,
}
export type AFFValue = AFFValues[keyof AFFValues]

export interface AFFMetadataEntry {
	key: WithLocation<string>,
	value: WithLocation<string>,
}

export interface AFFMetadata{
	data:Map<string, WithLocation<AFFMetadataEntry>>
	metaEndLocation:CstNodeLocation
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