import { CstParser } from "chevrotain";
import { tokenTypes } from "./lexer";

class AFFParser extends CstParser {
	public metadataEntry = this.RULE("metadataEntry", () => {
		this.CONSUME(tokenTypes.key)
		this.CONSUME(tokenTypes.colon)
		this.CONSUME(tokenTypes.data)
		this.CONSUME(tokenTypes.endline)
	})
	public metadata = this.RULE("metadata", () => {
		this.MANY(() => this.SUBRULE(this.metadataEntry))
		this.CONSUME(tokenTypes.metaEnd)
	})
	public values = this.RULE("values", () => {
		this.CONSUME(tokenTypes.lParen)
		this.MANY_SEP({
			SEP: tokenTypes.comma,
			DEF: () => {
				this.CONSUME(tokenTypes.value)
			}
		})
		this.CONSUME(tokenTypes.rParen)
	})
	public event = this.RULE("event", () => {
		this.OPTION(() => this.CONSUME(tokenTypes.word))
		this.SUBRULE(this.values)
		this.OPTION1(() => this.SUBRULE(this.subevents))
	})
	public subevents = this.RULE("subevents", () => {
		this.CONSUME(tokenTypes.lBrack)
		this.MANY_SEP({
			SEP: tokenTypes.comma,
			DEF: () => {
				this.SUBRULE(this.event)
			}
		})
		this.CONSUME(tokenTypes.rBrack)
	})
	public item = this.RULE("item", () => {
		this.SUBRULE(this.event)
		this.CONSUME(tokenTypes.semicolon)
		this.CONSUME(tokenTypes.endline)
	})
	public items = this.RULE("items", () => {
		this.MANY(() => this.SUBRULE(this.item))
	})
	public aff = this.RULE("aff", () => {
		this.SUBRULE(this.metadata)
		this.SUBRULE(this.items)
	})
	constructor() {
		// see https://sap.github.io/chevrotain/docs/tutorial/step4_fault_tolerance.html for the error recovery heuristics
		super(tokenTypes, { recoveryEnabled: true, outputCst: true, nodeLocationTracking: "full" })
		this.performSelfAnalysis()
	}
}

export const affParser = new AFFParser()
export const BaseAffVisitor = affParser.getBaseCstVisitorConstructorWithDefaults()