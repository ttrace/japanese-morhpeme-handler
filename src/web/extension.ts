'use strict';

import * as vscode from 'vscode';
import { Position, Range, Selection, TextDocument, TextEditor } from 'vscode';
import * as kuromoji from 'kuromoji';

let kuromojiBuilder: any;
let editingLineCache: number = 0;
let editingLinesTokenCache: any[] = [];

//-----------------------------------------------------------------------------
export function activate(context: vscode.ExtensionContext) {
    function registerCommand(name: string, logic: Function) {
        let command = vscode.commands.registerCommand(
            name,
            () => {
                let editor = vscode.window.activeTextEditor!;
                let wordSeparators = vscode.workspace
                    .getConfiguration("editor", editor.document.uri)
                    .get("wordSeparators");
                logic(editor, wordSeparators);
            });
        context.subscriptions.push(command);
    };

    // Register commands
    registerCommand('morphemeWordHandler.cursorWordEndLeft', cursorWordEndLeft);
    registerCommand('morphemeWordHandler.cursorWordEndLeftSelect', cursorWordEndLeftSelect);
    registerCommand('morphemeWordHandler.cursorWordEndRight', cursorWordEndRight);
    registerCommand('morphemeWordHandler.cursorWordEndRightSelect', cursorWordEndRightSelect);
    registerCommand('morphemeWordHandler.cursorWordStartLeft', cursorWordStartLeft);
    registerCommand('morphemeWordHandler.cursorWordStartLeftSelect', cursorWordStartLeftSelect);
    registerCommand('morphemeWordHandler.cursorWordStartRight', cursorWordStartRight);
    registerCommand('morphemeWordHandler.cursorWordStartRightSelect', cursorWordStartRightSelect);
    registerCommand('morphemeWordHandler.deleteWordEndLeft', deleteWordEndLeft);
    registerCommand('morphemeWordHandler.deleteWordEndRight', deleteWordEndRight);
    registerCommand('morphemeWordHandler.deleteWordStartLeft', deleteWordStartLeft);
    registerCommand('morphemeWordHandler.deleteWordStartRight', deleteWordStartRight);

    // Register legacy commands for compatibility
    registerCommand('extension.cursorWordEndRight', cursorWordEndRight);
    registerCommand('extension.cursorWordEndRightSelect', cursorWordEndRightSelect);
    registerCommand('extension.cursorWordStartLeft', cursorWordStartLeft);
    registerCommand('extension.cursorWordStartLeftSelect', cursorWordStartLeftSelect);
    registerCommand('extension.deleteWordRight', deleteWordEndRight);
    registerCommand('extension.deleteWordLeft', deleteWordStartLeft);

    // Initialize Kuromoji library
    kuromojiBuilder = kuromoji.builder({
        dicPath: context.extensionPath + '/node_modules/kuromoji/dict'
    });

    //const subscriptions: vscode.Disposable[] = [];
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(async e => {
        await makeMorpheme(e.textEditor);
    }));
}

//-----------------------------------------------------------------------------
function _move(
    editor: TextEditor,
    wordSeparators: string,
    find: Function
) {
    const document = editor.document;
    editor.selections = editor.selections
        .map(s => find(document, s.active, wordSeparators))
        .map(p => new Selection(p, p));
    if (editor.selections.length === 1) {
        editor.revealRange(editor.selection);
    }
}

function _select(
    editor: TextEditor,
    wordSeparators: string,
    find: Function
) {
    editor.selections = editor.selections
        .map(s => new Selection(
            s.anchor,
            find(editor.document, s.active, wordSeparators))
        );
    if (editor.selections.length === 1) {
        editor.revealRange(editor.selection);
    }
}

function _delete(
    editor: TextEditor,
    wordSeparators: string,
    find: Function
) {
    return editor.edit(e => {
        const document = editor.document;
        let selections = editor.selections.map(
            s => new Selection(
                s.anchor,
                find(document, s.active, wordSeparators)
            ));
        for (let selection of selections) {
            e.delete(selection);
        }
    }).then(() => {
        if (editor.selections.length === 1) {
            editor.revealRange(editor.selection);
        }
    });
}

export function cursorWordEndLeft(editor: TextEditor, wordSeparators: string) {
    _move(editor, wordSeparators, findPreviousWordEnd);
}

export function cursorWordEndLeftSelect(editor: TextEditor, wordSeparators: string) {
    _select(editor, wordSeparators, findPreviousWordEnd);
}

export function cursorWordEndRight(editor: TextEditor, wordSeparators: string) {
    _move(editor, wordSeparators, findNextWordEnd);
}

export function cursorWordEndRightSelect(editor: TextEditor, wordSeparators: string) {
    _select(editor, wordSeparators, findNextWordEnd);
}

export function cursorWordStartLeft(editor: TextEditor, wordSeparators: string) {
    _move(editor, wordSeparators, findPreviousWordStart);
}

export function cursorWordStartLeftSelect(editor: TextEditor, wordSeparators: string) {
    _select(editor, wordSeparators, findPreviousWordStart);
}

export function cursorWordStartRight(editor: TextEditor, wordSeparators: string) {
    _move(editor, wordSeparators, findNextWordStart);
}

export function cursorWordStartRightSelect(editor: TextEditor, wordSeparators: string) {
    _select(editor, wordSeparators, findNextWordStart);
}

export function deleteWordEndLeft(editor: TextEditor, wordSeparators: string) {
    return _delete(editor, wordSeparators, findPreviousWordEnd);
}

export function deleteWordEndRight(editor: TextEditor, wordSeparators: string) {
    return _delete(editor, wordSeparators, findNextWordEnd);
}

export function deleteWordStartLeft(editor: TextEditor, wordSeparators: string) {
    return _delete(editor, wordSeparators, findPreviousWordStart);
}

export function deleteWordStartRight(editor: TextEditor, wordSeparators: string) {
    return _delete(editor, wordSeparators, findNextWordStart);
}

//-----------------------------------------------------------------------------
enum CharClass {
    Alnum,
    Whitespace,
    Punctuation,
    Hiragana,
    Katakana,
    Other,
    Separator,
    Invalid
}

/**
 * Gets position of the start of a word after specified position.
 */
function findNextWordStart(
    doc: TextDocument,
    caretPos: Position,
    wordSeparators: string
): Position {
    // If the cursor is at an end-of-document, return original position.
    // If the cursor is at an end-of-line, return position of the next line.
    // Find ending position of a sequence starting with the character at
    // cursor. Then, return position of where WSPs following the sequence end.

    const classify = makeClassifier(wordSeparators);

    // Check if it's already at end-of-line or end-of-document
    let klass = classify(doc, caretPos.line, caretPos.character);
    if (klass === CharClass.Invalid) {
        const nextLine = caretPos.line + 1;
        return (nextLine < doc.lineCount)
            ? new Position(nextLine, 0) // end-of-line
            : caretPos;                 // end-of-document
    }

    //making cache
    if (caretPos.line !== editingLineCache) {
        //makeMorpheme(doc.lineAt(caretPos.line).text);
        editingLineCache = caretPos.line;
        editingLinesTokenCache = [];
    }


    let pos = caretPos;
    // Seek until character type changes, unless already reached EOL/EOD
    // Seek until character type changes, unless already reached EOL/EOD
    if (editingLinesTokenCache.length === 0) {
        pos = new Position(caretPos.line, caretPos.character + 1);
    } else {
        let target = 0;
        let i = 0;
        while (caretPos.character >= target) {
            i++;
            target = editingLinesTokenCache[i];
        }
        target = editingLinesTokenCache[i + 1] - 1;
        console.log('Pos:' + target);
        pos = new Position(caretPos.line, target);
    }

    // Skip a series of whitespaces
    while (classify(doc, pos.line, pos.character) === CharClass.Whitespace) {
        pos = new Position(pos.line, pos.character + 1);
    }

    return pos;
}

/**
 * Gets position of the end of a word after specified position.
 */
function findNextWordEnd(
    doc: TextDocument,
    caretPos: Position,
    wordSeparators: string
): Position {
    // If the cursor is at an end-of-document, return original position.
    // If the cursor is at an end-of-line, return position of the next line.
    // If the cursor is at WSP character(s), skip the WSP(s) starting with it.
    // If no characters exist after the WSPs, return the position.
    // If there is a non-WSP character after the WSPs, return end position of
    // a non-WSP character sequence which starts with it.

    const classify = makeClassifier(wordSeparators);

    // Check if it's already at end-of-line or end-of-document
    let klass = classify(doc, caretPos.line, caretPos.character);
    if (klass === CharClass.Invalid) {
        const nextLine = caretPos.line + 1;
        return (nextLine < doc.lineCount)
            ? new Position(nextLine, 0) // end-of-line
            : caretPos;                 // end-of-document
    }

    //making cache
    if (caretPos.line !== editingLineCache) {
        //makeMorpheme(doc.lineAt(caretPos.line).text);
        editingLineCache = caretPos.line;
        editingLinesTokenCache = [];
    }


    // Skip a series of whitespaces
    let pos = caretPos;
    if (klass === CharClass.Whitespace) {
        do {
            pos = new Position(pos.line, pos.character + 1);
        }
        while (classify(doc, pos.line, pos.character) === CharClass.Whitespace);
    }

    // Seek until character type changes, unless already reached EOL/EOD
    if (editingLinesTokenCache.length === 0) {
        pos = new Position(caretPos.line, caretPos.character + 1);
    } else {
        let target = 0;
        let i = 0;
        while (caretPos.character >= target) {
            i++;
            target = editingLinesTokenCache[i];
        }
        target = editingLinesTokenCache[i + 1] - 1;
        pos = new Position(caretPos.line, target);
    }

    return pos;
}

/**
 * Gets position of the word before specified position.
 */
function findPreviousWordStart(
    doc: TextDocument,
    caretPos: Position,
    wordSeparators: string
) {
    // Brief spec of this function:
    // - Firstly, skips a sequence of WSPs, if there is.
    //   - If reached start of a line, quit there.
    // - Secondly, seek backward until:
    //   1. character type changes, or
    //   2. reaches start of a line.

    const classify = makeClassifier(wordSeparators);


    let pos = caretPos;

    if (caretPos.character === 0) {
        if (caretPos.line !== 0) {
            let lastCharacter = doc.lineAt(caretPos.line - 1).range.end.character;
            pos = new Position(pos.line - 1, lastCharacter);
            return pos;
        }
        return pos;
    }

    //making cache
    if (caretPos.line !== editingLineCache) {
        //makeMorpheme(doc.lineAt(caretPos.line).text);
        editingLineCache = caretPos.line;
        editingLinesTokenCache = [];
    }

    // Firstly skip whitespaces, excluding EOL codes.
    function prevCharIsWhitespace() {
        let prevPos = doc.positionAt(doc.offsetAt(pos) - 1);
        return (classify(doc, prevPos.line, prevPos.character) === CharClass.Whitespace);
    }

    while (prevCharIsWhitespace()) {
        // Intentionally avoiding to use doc.positionAt(doc.offsetAt())
        // so that the seek stops at the EOL.
        if (pos.character <= 0) {
            return doc.positionAt(doc.offsetAt(pos) - 1);
        }
        pos = new Position(pos.line, pos.character - 1);
    }

    // Then, seek until the character type changes.
    if (editingLinesTokenCache.length === 0) {
        pos = new Position(caretPos.line, caretPos.character - 1);
    } else {
        let target = 0;
        let i = 0;
        while (caretPos.character >= target) {
            target = editingLinesTokenCache[i + 1];
            i++;
        }
        target = editingLinesTokenCache[i - 1] - 1;
        pos = new Position(caretPos.line, target);
    }

    return pos;
}

/**
 * Gets position of where a word before specified position ends.
 */
function findPreviousWordEnd(
    doc: TextDocument,
    caretPos: Position,
    wordSeparators: string
) {
    //const classify = makeClassifier(wordSeparators);
    if (caretPos.line !== editingLineCache && editingLinesTokenCache !== []) {
        //makeMorpheme(doc.lineAt(caretPos.line).text);
        editingLineCache = caretPos.line;
        editingLinesTokenCache = [];
    }

    let pos = caretPos;
    if (pos.character === 0) {
        if (pos.line === 0) {
            return pos;  // start of document
        } else {
            return doc.positionAt(doc.offsetAt(pos) - 1);  // start of a line
        }
    }
    //assert 0 < pos.character

    //making cache
    if (caretPos.line !== editingLineCache) {
        //makeMorpheme(doc.lineAt(caretPos.line).text);
        editingLineCache = caretPos.line;
        editingLinesTokenCache = [];
    }

    if (caretPos.character === 0) {
        if (caretPos.line !== 0) {
            let lastCharacter = doc.lineAt(caretPos.line - 1).range.end.character;
            pos = new Position(pos.line - 1, lastCharacter);
            return pos;
        }
        return pos;
    }

    // Seek until character type changes, unless already reached EOL/EOD
    if (editingLinesTokenCache.length === 0) {
        pos = new Position(caretPos.line, caretPos.character - 1);
    } else {
        let target = 0;
        let i = 0;
        while (caretPos.character >= target) {
            target = editingLinesTokenCache[i + 1];
            i++;
        }
        target = editingLinesTokenCache[i - 1] - 1;
        console.log('Pos:' + target);
        pos = new Position(caretPos.line, target);
    }

    return pos;
}

/**
 * Compose a character classifier function.
 * @param wordSeparators A string containing characters to separate words
 *                       (mostly used in English-like language context.)
 */
function makeClassifier(wordSeparators: string) {

    return function classifyChar(
        doc: TextDocument,
        line: number,
        character: number
    ) {
        if (line < 0 || character < 0) {
            return CharClass.Invalid;
        }

        const range = new Range(
            line, character,
            line, character + 1
        );
        const text = doc.getText(range);
        if (text.length === 0) {
            return CharClass.Invalid;  // end-of-line or end-of-document
        }
        const ch = text.charCodeAt(0);

        if (wordSeparators.indexOf(text) !== -1) {
            return CharClass.Separator;
        }

        if ((0x09 <= ch && ch <= 0x0d) || ch === 0x20 || ch === 0x3000) {
            return CharClass.Whitespace;
        }

        if ((0x30 <= ch && ch <= 0x39)          // halfwidth digit
            || (0xff10 <= ch && ch <= 0xff19)   // fullwidth digit
            || (0x41 <= ch && ch <= 0x5a)       // halfwidth alphabet, upper case
            || ch === 0x5f                      // underscore
            || (0x61 <= ch && ch <= 0x7a)       // halfwidth alphabet, lower case
            || (0xc0 <= ch && ch <= 0xff        // latin character
                && ch !== 0xd7 && ch !== 0xf7)  // (excluding multiplication/division sign)
            || (0xff21 <= ch && ch <= 0xff3a)   // fullwidth alphabet, upper case
            || ch === 0xff3f                    // fullwidth underscore
            || (0xff41 <= ch && ch <= 0xff5a)) {// fullwidth alphabet, lower case
            return CharClass.Alnum;
        }

        if ((0x21 <= ch && ch <= 0x2f)
            || (0x3a <= ch && ch <= 0x40)
            || (0x5b <= ch && ch <= 0x60)
            || (0x7b <= ch && ch <= 0x7f)
            || (0x3001 <= ch && ch <= 0x303f
                && ch !== 0x3005)               // CJK punctuation marks except Ideographic iteration mark
            || ch === 0x30fb                    // Katakana middle dot
            || (0xff01 <= ch && ch <= 0xff0f)   // "Full width" forms (1)
            || (0xff1a <= ch && ch <= 0xff20)   // "Full width" forms (2)
            || (0xff3b <= ch && ch <= 0xff40)   // "Full width" forms (3)
            || (0xff5b <= ch && ch <= 0xff65)   // "Full width" forms (4)
            || (0xffe0 <= ch && ch <= 0xffee)) {// "Full width" forms (5)
            return CharClass.Punctuation;
        }

        if ((0x30a0 <= ch && ch <= 0x30ff)      // fullwidth katakana
            && ch !== 0x30fb) {                 // excluding katakana middle dot
            return CharClass.Katakana;
        }

        if (0x3041 <= ch && ch <= 0x309f) {     // fullwidth hiragana
            return CharClass.Hiragana;
        }

        if (0xff66 <= ch && ch <= 0xff9d) {     // halfwidth katakana
            return CharClass.Katakana;
        }

        return CharClass.Other;
    };
}

async function makeMorpheme(editor: vscode.TextEditor) {
    if (editingLineCache !== editor.selection.active.line) {
        editingLinesTokenCache = [];
        const text = editor.document.lineAt(editor.selection.active.line).text;
        editingLineCache = editor.selection.active.line;
        //console.log("EDITING LINE:" + editingLineCache + text);
        kuromojiBuilder.build((err: any, tokenizer: any) => {
            // 辞書がなかったりするとここでエラーになります(´・ω・｀)
            if (err) {
                console.dir('Kuromoji initialize error:' + err.message);
                throw err;
            };
            const kuromojiToken = tokenizer.tokenize(text);
            console.log(kuromojiToken);

            for (let i = 0; i < kuromojiToken.length; i++) {
                const token = kuromojiToken[i];
                //const previousToken = kuromojiToken[i-1];

                if (token.pos === '助詞' && token.pos_detail_1 !== '接続助詞' && token.pos_detail_2 !== '連語') {
                    //登録しない
                } else if (token.pos === '助動詞') {
                    //登録しない
                } else if (token.pos_detail_1 === '非自立') {
                    //登録しない
                } else if (token.pos_detail_1 === '接尾') {
                    //登録しない
                } else {
                    editingLinesTokenCache.push(token.word_position);
                }

            }
        });
    }
}
