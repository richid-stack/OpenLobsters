# ADR 0008: Spreadsheets with ExcelJS, verified by opening them again

**Status:** Accepted

## Context

The first real output needed to be checkable. Producing a file and trusting the tool is not verification.

## Decision

Build workbooks with ExcelJS (live SUM formulas with stored values). Verify by opening the saved bytes again and comparing with the request: fingerprint, sheets, every value, total formulas and values, error cells, text stored as text. Tests also read the file with a different library (openpyxl).

## Consequences

Verification can fail for real reasons, and it does (tested by changing a stored file). The cost: each new output type needs its own verifier.
