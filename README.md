# Japanese Word Handler

[![Version (VS Marketplace)](https://vsmarketplacebadge.apphb.com/version-short/sgryjp.japanese-word-handler.svg)](https://marketplace.visualstudio.com/items?itemName=sgryjp.japanese-word-handler)
![Rating (VS Marketplace)](https://vsmarketplacebadge.apphb.com/rating-star/sgryjp.japanese-word-handler.svg)
![Installs (VS Marketplace)](https://vsmarketplacebadge.apphb.com/installs-short/sgryjp.japanese-word-handler.svg)
&nbsp;
[![Build status](https://ci.appveyor.com/api/projects/status/eqclfgbaefm5npt8/branch/master?svg=true)](https://ci.appveyor.com/project/sgryjp/japanese-word-handler/branch/master)
[![zlib license](https://img.shields.io/badge/license-zlib-lightgray.svg?longCache=true&style=popout)](https://github.com/sgryjp/japanese-word-handler/blob/master/LICENSE)

Better cursor movement in Japanese text for [VS Code](https://code.visualstudio.com).

## How to activate the logic?

Just install the extension. Doing so changes the action for the keybindings
below (on macOS, use <kbd>Option</kbd> instead of <kbd>Ctrl</kbd>):

* <kbd>Ctrl</kbd>+<kbd>Right</kbd>
* <kbd>Ctrl</kbd>+<kbd>Left</kbd>
* <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd>
* <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Left</kbd>
* <kbd>Ctrl</kbd>+<kbd>Delete</kbd>
* <kbd>Ctrl</kbd>+<kbd>Backspace</kbd>

Although not visible in command platte, these actions are implemented as
commands so that you can reassign any key combinations to them.
The table below shows all available commands and their default keybindings:

|                     Command                     |         Default Keybinding (except macOS)         |           Default keybinding (for macOS)            |
| ----------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| `japaneseWordHandler.cursorWordEndLeft`         |                                                   |                                                     |
| `japaneseWordHandler.cursorWordEndRight`        | <kbd>Ctrl</kbd>+<kbd>Right</kbd>                  | <kbd>Option</kbd>+<kbd>Right</kbd>                  |
| `japaneseWordHandler.cursorWordEndRightSelect`  | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> | <kbd>Option</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> |
| `japaneseWordHandler.cursorWordStartLeft`       | <kbd>Ctrl</kbd>+<kbd>Right</kbd>                  | <kbd>Option</kbd>+<kbd>Right</kbd>                  |
| `japaneseWordHandler.cursorWordStartLeftSelect` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> | <kbd>Option</kbd>+<kbd>Shift</kbd>+<kbd>Right</kbd> |
| `japaneseWordHandler.cursorWordStartRight`      |                                                   |                                                     |
| `japaneseWordHandler.deleteWordRight`           | <kbd>Ctrl</kbd>+<kbd>Delete</kbd>                 | <kbd>⌥Option</kbd>+<kbd>Delete</kbd>                |
| `japaneseWordHandler.deleteWordLeft`            | <kbd>Ctrl</kbd>+<kbd>Backspace</kbd>              | <kbd>⌥Option</kbd>+<kbd>Backspace</kbd>             |


## What's the difference from the original?

With the original logic, pressing <kbd>Ctrl</kbd>+<kbd>Right</kbd> while the
cursor is at the beginning of a chunk of Japanese characters will move the
cursor to the end of it.

![Original cursor movement](images/japanese-word-handler-vanilla.gif)

With this extension, on the other hand, the cursor will stop at each place
where the Japanese character type (Hiragana, Katakana, ...) changes.

![Improved cursor movement](images/japanese-word-handler.gif)

## Known limitations

As of VSCode 1.37.0, extension cannot override word related actions below:

* Word selection on double click
* Automatic highlight of a word at where the cursor is
* 'Match Whole Word' option of text search

## Issue report

Please visit the
[project's GitHub page](https://github.com/sgryjp/japanese-word-handler)
and report it.


**Enjoy!**
