# Clean table fixtures

| ID | Note |
| --- | --- |
| G-1 | `a\|b` is one field once the escape is resolved |
| G-2 | a missing trailing pipe is legal GFM

A fenced example is not the document's own table, even when it is broken:

```md
| not | a | table |
| --- | --- |
| broken | two |
```

| Left | Centre | Right |
| :-- | :-: | --: |
| 1 | 2 | 3 |

Two valid tables in one section, separated by a blank line, are two tables —
the blank line closes the first one and the next line opens the second (#75):

| Field | Value |
| --- | --- |
| a | 1 |

| Field | Value |
| --- | --- |
| b | 2 |
