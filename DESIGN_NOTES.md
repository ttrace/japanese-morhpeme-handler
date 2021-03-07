<!-- markdownlint-disable MD031 -->

# Design Notes

This is a personal memo.

## Symbols Used in This Document

Through out this document, I use these symbols:

| Symbol | Meaning                    |
| ------ | -------------------------- |
| `.`    | EOF                        |
| `A`    | Alphabets and numbers      |
| `@`    | One of the "wordSeparator" |
| `S`    | Whitespace                 |
| `L`    | End of line                |

Additionally, location of the cursor after executing a command is expressed by
vertical bar (`|`) symbol in a sequence of symbols. For example, `A|.` means
that assuming there is a sequence consisted with alphabets and numbers at the
cursor location, and nothing follow the sequence (EOF), then a command which
we are discussing moves the cursor just after the sequence.

## Japanese-Word-Handler

- `cursorWordRight`

  - Procedure
    1. If the cursor is at an end-of-document, return original position.
    2. If the cursor is at an end-of-line, return position of the next line.
    3. If the cursor is at WSP character(s), skip the WSP(s) starting with it.
    4. If no characters exist after the WSPs, return the position.
    5. If there is a non-WSP character after the WSPs, return end position of
       a non-WSP character sequence which starts with it.
  - Illustration:
    ```text
    |.      A|.     @|.     S|.     L|.
                    @|A     SA|.    L|A
                            SA|@
                            SA|S
                            SA|L
            A|@             S|@     L|@
            A|S     @|S             L|S
            A|L     @|L     S|L     L|L
    ```

- `cursorWordStartRight`

  - Procedure
    1. If the cursor is at an end-of-document, return original position.
    2. If the cursor is at an end-of-line, return position of the next line.
    3. Find ending position of a sequence starting with the character at
       cursor. Then, return position of where WSPs following the sequence end.
  - Illustration:
    ```text
    |.      A|.     @|.     S|.     L|.
                    @|A     S|A     L|A
            A|@             S|@     L|@
            AS|.    @S|.            L|S
            AS|A    @S|A
            AS|@    @S|@
            AS|L    @S|L
            A|L     @|L     S|L     L|L
    ```

- `cursorWordEndLeft`

  - Procedure:
    1. If the cursor is at an start-of-document, return original position.
    2. If the cursor is at an start-of-line, return end position of the
       previous line.
    3. Find starting position of a sequence which ends at the cursor position.
       Then, return position of where WSPs preceding it starts.
  - Illustration:
    ```text
    .|   .|A     .|@    .|S     .|L
                 A|@    A|S     A|L
         @|A            @|S     @|L
        .|SA    .|S@            S|L
        A|SA    A|S@
        @|SA    @|S@
        L|SA    L|S@
         L|A     L|@    L|S     L|L
    ```

There logic can be implemented as finite state automaton but I feel doing so is
"overkill". So, I implemented these in a form of imperative procedures.

# Anatomy of Cursor Movement in Other Text Editors

## Visual Studio Code (v1.37.0)

VSCode has two set of word by word cursor movement logics. First one is the
logic used in most cases except for "word part" related actions. Another one is
the logic for "word part" related actions.

Commands of the second version have "part" in their name (e.g.:
`cursorWordPartRight`) and they can recognize words inside a camelCasedWords
or a sname_case_words. It seems that commands of this version are not affected
by "wordSeparator" configuration.

### Non "word part" version

- `cursorWordEndRight`

  ```text
  |.          L|.
  A|.         LA|.
  A|@         LA|@
  A|S         LA|S
  A|L         LA|L
  @|.         L@|.
  @|A         L@|A
  @|S         L@|S
  @|L         L@|L
  S|.         LS|.
  SA|.        LSA|.
  SA|@        LSA|@
  SA|S        LSA|S
  SA|L        LSA|L
  S@|.        LS@|.
  S@|A        LS@|A
  S@|S        LS@|S
  S@|L        LS@|L
  S|L         LS|L
              L|L
  ```

- `cursorWordStartRight`
  ```text
  |.      A|.     @|.             L|.
                  @|A             L|A
          A|@                     L|@
          AS|.    @S|.    S|.     LS|.
          AS|A    @S|A    S|A     LS|A
          AS|@    @S|@    S|@     LS|@
          AS|L    @S|L    S|L     LS|L
          A|L     @|L             L|L
  ```

### Word part version

Essentially the difference from this version of commands and default ones is
that these can stop inside a sequence of alphabets if condition met.
The conditions are:

1. Previous character is an underscore and the next is not an underscore
   (for snake_cased_words)
2. Previous character is a lower cased alphabet and the next is an uppercased
   alphabet (for camelCasedWords or PascalCasedWords)
3. Previous character is an upper cased alphabet, the next is an uppercased
   alphabet and the character next of the next is a lowercased alphabet
   (for all capital words inside a camelCASEDWords or a PascalCASEDWords)

## Vim (v8.1.1843)

Vim separates words by character classification.

On classifying a character, Vim firstly checks whether it is less than 0xFF
or not. If so, it will be classified into a white space, punctuation, or
"word character" which is specified by the configuration `iskeyword`
(wordSeparator in VSCode.) If the character is greater than 0xFF, Vim
classifies it under the basic rule as: white spaces are 0, punctuations are 1,
emojis are 3, and others are equals to or greater than 2 (but not 3).
Punctuation characters in various languages and known character set are defined
in a table and resolved as 1 or code point value of the first character in the
set.

For example, unique class values are assigned for both Hiraganas and Katakanas
so those are always separated from other character types.

### Reference

- src/search.c
  - [`fwd_word()`](https://github.com/vim/vim/blob/v8.1.1843/src/search.c#L3050)
- src/mbyte.c
  - [`utf_class()`](https://github.com/vim/vim/blob/v8.1.1843/src/mbyte.c#L2764)
