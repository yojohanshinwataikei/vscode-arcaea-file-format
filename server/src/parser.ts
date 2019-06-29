import { CstParser } from "chevrotain";
import { tokenTypes } from "./lexer";

export class AFFParser extends CstParser{
	public metadataEntry=this.RULE("metadataEntry",()=>{
		this.CONSUME(tokenTypes.key)
		this.CONSUME(tokenTypes.colon)
		this.CONSUME(tokenTypes.data)
		this.CONSUME(tokenTypes.endline)
	})
	public metadata=this.RULE("metadata",()=>{
		this.MANY(()=>this.SUBRULE(this.metadataEntry))
	})
	public event=this.RULE("event",()=>{
		this.OPTION(()=>this.CONSUME(tokenTypes.word))
		this.CONSUME(tokenTypes.lParen)
		this.MANY_SEP({
			SEP:tokenTypes.comma,
			DEF:()=>{
				this.CONSUME(tokenTypes.value)
			}
		})
		this.CONSUME(tokenTypes.rParen)
		this.OPTION1(()=>this.SUBRULE(this.subevents))
	})
	public subevents=this.RULE("subevents",()=>{
		this.CONSUME(tokenTypes.lBrack)
		this.MANY_SEP({
			SEP:tokenTypes.comma,
			DEF:()=>{
				this.SUBRULE(this.event)
			}
		})
		this.CONSUME(tokenTypes.rBrack)
	})
	public item=this.RULE("item",()=>{
		this.SUBRULE(this.event)
		this.CONSUME(tokenTypes.semicolon)
		this.CONSUME(tokenTypes.endline)
	})
	public items=this.RULE("items",()=>{
		this.MANY(()=>this.SUBRULE(this.item))
	})
	public aff=this.RULE("aff",()=>{
		this.SUBRULE(this.metadata)
		this.CONSUME(tokenTypes.metaEnd)
		this.SUBRULE(this.items)
	})
	constructor(){
		super(tokenTypes)
		this.performSelfAnalysis()
	}
}