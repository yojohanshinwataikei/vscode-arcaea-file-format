# Vscode Arcaea File Format Support

Util for reading and editing arcaea .aff files

# Features and Roadmaps

- [x] Basix Snippets
- [x] Syntax highlight
- [x] .aff File Format Parsing and Syntax Error Displaying
	- [ ] Tuning the error recovery heuristics
	- [ ] Use better customized error meassages
- Semantic Problem Diagnostic, Displaying and fix
	- [x] Check value format for known metadatas
	- [x] Type assert and sub-events check for known events
	- [x] `timing` third param
	- [x] Track id of normal note
	- [x] `arctap` time out of `arc`
		- [ ] Fix: remove the `arctap`
	- [x] Negative length `arc` or not positive length `hold`
		- [ ] Fix: remove the `hold` or `arc`
	- [x] Zero length `arc` with non-`s` type
		- [ ] Fix: set type to `s`
	- [x] Zero length `arc` with `arctap`
		- [ ] Fix: remove the `arctap`
	- [x] Empty `arc`
		- [ ] Fix: remove the `arc`
	- [x] Duplicated `timing`
	- [x] Duplicated `arctap`
		- [ ] Fix: remove the `arctap`
	- [x] Wrong last param for `arc` with `arctap`
		- [ ] Fix: set it to correct value
	- [x] Out of range `arc`
	- [x] `arc` and `hold` across the `timing`
	- [x] Duplicated floor notes
		- [ ] Fix: merge the floor notes
	- [x] Duplicated `camera`
	- [ ] Simplifiable `arc` type
		- [ ] Fix: set it to most simple type
	- [ ] Listing more problems
- Handful Editing Features
	- [ ] Resort
	- [ ] Mirroring
	- [ ] Move in time
	- [ ] Cut the `arc`
	- [ ] Align to timing
	- [ ] Listing more operations
- JSON validation of the `songlist` `packlist` `unlocks` files
	- [x] `songlist`
	- [x] `packlist`
	- [x] `unlocks`