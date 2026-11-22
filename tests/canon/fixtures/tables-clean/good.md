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

An indented four-space block is code, so a pipe line inside it is not a row:

    | not | a | row |

## Before any table opens

No table has opened in this section, so the ticket's rule does not apply to a
row-looking line here and it must not be flagged (issue #75 scope):

| looked | like | a row |

## Inside a blockquote

A quoted table is a table: the marker is stripped and the header still rules.

> | Quoted | Field |
> | --- | --- |
> | q-1 | 1 |

A broken example inside a quoted fence stays invisible to the gate:

> ```md
> | not | a | table |
> | --- | --- |
> | broken | two |
> ```

## Mixed quote depth

A delimiter outside the quote does not close a quoted header, so this pair is
text, not a table:

> | Quoted | Header |
| --- | --- |
