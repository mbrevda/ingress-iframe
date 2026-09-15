// Local oxlint JS plugin owning all brace policy, replacing `eslint/curly`.
//
// Why not `curly`: it reasons about one statement at a time, so it cannot say
// "an if that has an else must be braced" — in `if (a) x;\nelse if (b) y;` both
// bodies are single-line, which every curly option accepts. Worse, its closest
// option (`multi-or-nest`) actively contradicts that rule: it *forbids* braces
// around a single short statement, including one that is a chain branch, so the
// two fight forever and `--fix` never converges.
//
// Owning both halves here keeps them consistent:
//   - a branch of an if/else chain is always braced
//   - anywhere else, braces are omitted for a single one-line statement and
//     required as soon as the body spans lines or holds several statements
//
// NOTE: oxlint's JS plugin API is alpha and not covered by semver.

type Loc = {
  start: {line: number; column: number};
  end: {line: number; column: number};
};

type Node = {
  type: string;
  loc: Loc;
  start: number;
  body?: Node | Node[];
  consequent?: Node;
  alternate?: Node | null;
  parent?: Node | null;
};

type Fixer = {
  insertTextBefore: (node: Node, text: string) => unknown;
  insertTextAfter: (node: Node, text: string) => unknown;
  replaceText: (node: Node, text: string) => unknown;
};

type Context = {
  sourceCode: {getText: (node: Node) => string};
  report: (descriptor: {
    node: Node;
    message: string;
    fix?: (fixer: Fixer) => unknown[];
  }) => void;
};

type Visitor = Record<string, (node: Node) => void>;

/** Loop forms whose body follows the same rule as a lone `if`. */
const LOOPS = [
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
];

// Matches oxfmt's printWidth. Collapsing a body past this would be re-wrapped
// by the formatter, leaving an unbraced multi-line statement that this plugin
// would then re-brace — an endless --fix loop. So we only unwrap what fits.
const MAX_LINE = 80;

function isSingleLine(node: Node): boolean {
  return node.loc.start.line === node.loc.end.line;
}

/** The lone statement inside a block, or undefined if it holds anything else. */
function soleStatement(node: Node): Node | undefined {
  if (node.type !== "BlockStatement" || !Array.isArray(node.body)) {
    return undefined;
  }
  return node.body.length === 1 ? node.body[0] : undefined;
}

/** True when `node` is any branch of an if/else chain. */
function inChain(node: Node): boolean {
  if (node.type !== "IfStatement") return false;
  if (node.alternate) return true;
  return node.parent?.type === "IfStatement" && node.parent.alternate === node;
}

function wrap(node: Node) {
  return (fixer: Fixer): unknown[] => [
    fixer.insertTextBefore(node, "{"),
    fixer.insertTextAfter(node, "}"),
  ];
}

const plugin = {
  meta: {name: "braces", version: "1.0.0"},
  rules: {
    // Every branch of an if/else chain is braced, whatever its length. This is
    // the rule `curly` cannot express, and the one that stops a second
    // statement being added under an unbraced branch.
    "chain-requires-braces": {
      create(context: Context): Visitor {
        function requireBlock(body: Node, what: string): void {
          // An `else if` is the chain continuing; it is checked in its own turn.
          if (body.type === "BlockStatement" || body.type === "IfStatement") {
            return;
          }
          context.report({
            fix: wrap(body),
            message: `${what} of an if/else chain must be wrapped in braces.`,
            node: body,
          });
        }

        return {
          IfStatement(node: Node): void {
            if (!inChain(node)) return;
            if (node.consequent) requireBlock(node.consequent, "Branch");
            if (node.alternate) requireBlock(node.alternate, "`else` body");
          },
        };
      },
      meta: {
        docs: {
          description: "Require braces on every branch of an if/else chain.",
        },
        fixable: "code",
        type: "suggestion",
      },
    },

    // Outside a chain: braces exactly when the body needs them. Mirrors
    // `curly`'s "multi-or-nest", but skips chain branches so the two rules
    // cannot disagree about the same code.
    "multi-or-nest": {
      create(context: Context): Visitor {
        // Either the whole statement fits on one line unbraced, or it is
        // braced. Note this is stricter than `curly`'s "multi-or-nest", which
        // asks only whether the *body* is one line — so it happily allows
        //     if (a)
        //       return 10;
        // which is the shape this is meant to prevent.
        function checkBody(stmt: Node, body: Node, keyword: string): void {
          const onKeywordLine = body.loc.start.line === stmt.loc.start.line;
          const sole = soleStatement(body);
          if (sole) {
            if (!isSingleLine(sole)) return;
            // Everything before the body — `if (x) `, `for (…) ` — must itself
            // be one line, or there is nothing to collapse onto.
            const head = context.sourceCode
              .getText(stmt)
              .slice(0, body.start - stmt.start);
            if (head.includes("\n")) return;
            const width =
              stmt.loc.start.column +
              head.length +
              context.sourceCode.getText(sole).length;
            if (width > MAX_LINE) return;
            context.report({
              fix: (fixer) => [
                fixer.replaceText(body, context.sourceCode.getText(sole)),
              ],
              message: `Unnecessary braces after '${keyword}'.`,
              node: body,
            });
            return;
          }
          if (body.type === "BlockStatement") return;
          if (onKeywordLine && isSingleLine(body)) return;
          context.report({
            fix: wrap(body),
            message: `Expected braces after '${keyword}'.`,
            node: body,
          });
        }

        const visitor: Visitor = {
          IfStatement(node: Node): void {
            // Chains belong to the other rule.
            if (inChain(node)) return;
            if (node.consequent) checkBody(node, node.consequent, "if");
          },
        };
        for (const loop of LOOPS) {
          visitor[loop] = (node: Node): void => {
            const {body} = node;
            if (body && !Array.isArray(body)) checkBody(node, body, "loop");
          };
        }
        return visitor;
      },
      meta: {
        docs: {
          description:
            "Braces only when a body spans lines or holds several statements.",
        },
        fixable: "code",
        type: "suggestion",
      },
    },
  },
};

export default plugin;
