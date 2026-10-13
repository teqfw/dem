# Logical Type Contract

Implemented logical type contract for package v0.2.0. A type uses `{name, params?}`.
All numeric parameters are safe JSON integers. Unknown parameters fail. Defaults
below are materialized in normalized types. No parameter selects a backend type.

| Name | Allowed parameters / normalization | Logical values and literal defaults |
| --- | --- | --- |
| binary | optional positive length, maximum bytes; omission means unbounded | Literal default is canonical padded RFC 4648 base64; value is a byte sequence |
| boolean | none | true or false |
| date | none | Valid Gregorian date, YYYY-MM-DD, years 0001–9999 |
| datetime | precision 0–9, default 3; timezone boolean, default false | Valid date/time with T separator; fraction has at most precision digits; timezone=false forbids offset, true requires Z or numeric ±HH:MM offset |
| decimal | required precision >0, scale 0–precision; unsigned boolean, default false | Exact base-10 decimal string without exponent; at most precision total digits and scale fraction digits |
| enum | required non-empty values list of unique strings | One listed string; alternatives canonicalize by string order |
| integer | bits 8,16,32,64, default 32; unsigned boolean, default false | Exact integer in the declared mathematical range; default is a safe JSON integer or canonical integer string |
| json | none | Any JSON value, subject to attribute nullability |
| string | required positive length, maximum Unicode code points | String within length limit |
| text | none | String without a declared length limit |
| uuid | none | UUID textual shape 8-4-4-4-12 hexadecimal digits; normalize letters to lowercase; no version constraint |
| vector | required positive dimensions; element float or bit; sparse boolean, default false | Dense array of exactly dimensions elements; float elements finite JSON numbers, bit elements 0 or 1 |

Sparse vectors are allowed only for float and use
`{dimensions,entries:[{index,value}]}`. Dimensions must match the type. Indices
are unique integers in [0,dimensions), values finite and nonzero. Canonicalize
entries by index. No physical vector index or similarity algorithm is implied.

Decimal strings match `-?(0|[1-9][0-9]*)(\.[0-9]+)?`; validate scale/precision
by exact value after removing redundant fraction zeros. Datetime local syntax is
YYYY-MM-DDTHH:MM:SS with an optional fractional suffix; hours 00–23, minutes/seconds
00–59. Numeric offsets range from -14:00 to +14:00 (at 14 hours, minutes must be 00).
Timezone normalization may carry across dates; reject an out-of-range resulting year.

Integer defaults normalize to canonical base-10 strings, without leading zeros
or plus sign, with zero represented as "0". Decimal defaults normalize to fixed
scale, e.g. scale=2 gives "1.00"; zero has no negative sign. Validate using exact
arithmetic, not lossy JavaScript Number conversion. A decimal value with excess
nonzero fraction digits is invalid, not rounded. Trailing zeros may be removed
before validation and padded to the declared scale. Unsigned values cannot be negative.

Datetime defaults normalize fractions to precision digits. Offset-aware values
normalize to UTC Z using Gregorian arithmetic; an equivalent offset spelling
therefore has the same canonical default. Local datetimes have no timezone
conversion. Reject invalid dates, leap seconds and results outside supported years.
Binary defaults must already be canonical base64. JSON object-member order is
insignificant; JSON array order remains significant.

Literal defaults validate against the normalized logical type. Attribute default
null requires nullable=true, including json. All strings must contain valid Unicode
scalar values; reject lone surrogates and apply no NFC/NFD rewriting. String enum
alternatives remain distinct by their exact Unicode content.

Identity and ref use the [declaration contract](declarations.md). Their profiles
are uuid or int with qualitative capacity; integer bits are not accepted as
identity-profile parameters. Logical type checking constrains defaults and
relations during compilation; DEM does not perform application data operations.
