export type DataGenerator<K, V> = (input: K) => V

export class AssociatedDataMap<K extends Object, V> {
	map = new WeakMap<K, V>();
	gen: DataGenerator<K, V>;
	constructor(gen: DataGenerator<K, V>) {
		this.map = new WeakMap<K, V>()
		this.gen = gen
	}
	get(key:K){
		if(this.map.has(key)){
			return this.map.get(key)
		}else{
			const result=this.gen(key)
			this.map.set(key,result)
			return result
		}
	}
}
