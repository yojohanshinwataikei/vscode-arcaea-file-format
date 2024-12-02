# Change Log

## 0.14.0

- Support for new `scenecontrol` types

## 0.13.1

- Update `unlocks` schema for new unlock condition

## 0.13.0

- Update JSON validation for the `songlist` `packlist` `unlocks` files for the eternal difficulty
- Handle various size `arctap` represented by the `arc` with color of 3

## 0.12.3

- Update JSON validation for the `songlist` `packlist` `unlocks` files for the arcaea 5.0.x

## 0.12.2

- Update `songlist` schema for new fields for song searching

## 0.12.1

- Update `unlocks` schema for new unlock condition

## 0.12.0

- Support for special sound effect of `arctap`
- Support for `tap` and `hold` on the track 0 and 5
- Support for new `scenecontrol` types
- Better way to handle the `arc` with color of 3
- Check for overlapped `scenecontrol`
- Use a more relaxing check for out of range `arc` when the enwiden mode is on
- Update JSON validation for the `songlist` `packlist` `unlocks` files for the arcaea 4.0.x

## 0.11.2

- Update `unlocks` schema to provide better description to fields

## 0.11.1

- Update `unlocks` schema to provide better description to fields
- Fix some typos in schema
- Fix crashing when `scenecontrol` do not have a kind

## 0.11.0

- Allow nested `camera` in `timinggroup`
- Support and check for `timinggroup` attributes

## 0.10.7

- Update `songlist` schema for fields used in 5 years anniversary update
- Fix typo in schemas

## 0.10.6

- Update `songlist` schema for fields used in link play update and PRAGMATISM -RESURRECTION-

## 0.10.5

- Fix `$id` field of schema

## 0.10.4

- Fix `songlist` schema for correct required fields in difficulties

## 0.10.3

- Update `songlist` schema for hidden additional features
- Update `songlist` `packlist` `unlocks` schema to provide better description to fields

## 0.10.2

- `TimingPointDensityFactor` metadata is now checked

## 0.10.1

- `scenecontrol` in `timinggroup` is now checked

## 0.10.0

- Support for `timinggroup` event with `noinput` type
- It's no longer an error to put `scenecontrol` into `timinggroup`
- Add a setting to control the displayed diagnostic infomation

## 0.9.0

- Update `songlist` schema for hidden additional features

## 0.8.0

- Support for `timinggroup` event
- Handle different kind of `scenecontrol` event better
- Cut by timing is now info instead of error
- Update JSON validation for the `songlist` `packlist` `unlocks` files for the arcaea 3.0.0
- More generic syntax highlighting
- Be more relax for whitespace and endline token

## 0.7.0

- Support for `camera` and `scenecontrol` event
- Check for `camera` duration
- Check for `camera` duplicated
- Disable check for out of range `arc` items when memes items found
- Various fix in the `songlist` schema

## 0.6.1

- Fix a description in the `unlocks` schema
- Simplify development workflow

## 0.6.0

- Update `unlocks` schema for new unlock conditions

## 0.5.0

- Check for overlapped `arctap` and floor(track) items
- Change the behaviour for `arctap` on solid `arc`
- Update `songlist` schema for the new day-night feature
- Various `songlist` schema fix

## 0.4.0

- Unexpected whitespace will not block other checks
- Check for out of range `arc` items

## 0.3.1

- Clean diagnostics on close
- Adjust severity of some problem reports

## 0.3.0

- Check for duplicated `timing` define
- Check for `arc` and `hold` items cut by `timing` event
- Be more relax for endline token

## 0.2.0

- Various simple file content checking
- JSON validation for the `songlist` `packlist` `unlocks` files

## 0.1.1

- Fix a bug in type checking of hold event

## 0.1.0

- Parsing the AFF files and display basic syntax and semantic problems

## 0.0.1

- Initial release
- Syntax highlight
- Useful Snippets