# X Blocker

A Chrome extension that blocks X accounts, either one at a time on request or because the region an account is based in matches a rule.

## Language

**Block**:
A real block on X, applied to the user's own X account, so it takes effect everywhere the user is signed in.
_Avoid_: Hide, mute, filter

**Region Rule**:
A named standing instruction to Block every account whose Based-in Region is in a chosen set of countries (and any Broad Regions the user opted into), applied automatically without asking each time. Each rule can be switched on or off; the first rule is India.
_Avoid_: Geo-block, region filter

**Pause**:
A single switch that stops every Region Rule at once without changing any of them. Hand Blocks still work while paused.

**Based-in Region**:
The country or region X itself reports an account as being based in. An account's self-written bio location is never its Based-in Region.
_Avoid_: Location, profile location, country

**Broad Region**:
A multi-country area such as "South Asia" that X shows instead of a country for some accounts. It matches a Region Rule only if the user ticked that Broad Region itself; it never stands in for the countries inside it.

**Region Badge**:
The label shown beside an account's name wherever its posts appear, stating its Based-in Region, so the user never has to open a profile to see it.
_Avoid_: Flag, tag, location label

**Unknown Region**:
An account whose Based-in Region X has not reported. An Unknown Region never matches a Region Rule.

**Continent**:
A heading that groups countries when choosing them for a Region Rule; ticking it ticks every country under it. A rule holds countries, never continents.
_Avoid_: Region preset

**Hand Block**:
A Block the user triggers themselves with one click on a post or profile, as opposed to one made by a Region Rule.
_Avoid_: Manual block, quick block

**Exempt Account**:
An account a Region Rule must never Block: anyone the user follows, anyone the user has unblocked through the extension, and anyone the user marked "Never block".
_Avoid_: Whitelist, allowlist

**Block Log**:
The record of every Block the extension has made, with when it happened and why (Hand Block or which Region Rule).
_Avoid_: History, audit trail
