import { test, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { makeTools } from "./tools.js";

// every test gets a fresh, empty notes directory
let dir: string;
let tools: ReturnType<typeof makeTools>;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
  tools = makeTools(dir);
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const read = (name: string) => fs.readFileSync(path.join(dir, name), "utf8");

test("create makes an empty file", () => {
  assert.equal(tools.create({ name: "a.md" }), "created a.md");
  assert.equal(read("a.md"), "");
});

test("create refuses an existing file", () => {
  tools.create({ name: "a.md" });
  assert.throws(() => tools.create({ name: "a.md" }));
});

test("edit appends one line", () => {
  tools.create({ name: "a.md" });
  tools.edit({ name: "a.md", text: "milk" });
  tools.edit({ name: "a.md", text: "eggs" });
  assert.equal(read("a.md"), "milk\neggs\n");
});

type Got = { checksum: string; text: string };
const HEX8 = /^[0-9a-f]{8}$/;

test("get returns the text with an 8-hex checksum", () => {
  tools.create({ name: "a.md" });
  tools.edit({ name: "a.md", text: "milk" });
  const got = tools.get({ name: "a.md" }) as Got;
  assert.equal(got.text, "milk\n");
  assert.match(got.checksum, HEX8);
});

test("checksum changes when the text changes", () => {
  tools.create({ name: "a.md" });
  const before = (tools.get({ name: "a.md" }) as Got).checksum;
  tools.edit({ name: "a.md", text: "milk" });
  const after = (tools.get({ name: "a.md" }) as Got).checksum;
  assert.notEqual(before, after);
});

test("list names each .md file with its size", () => {
  tools.create({ name: "a.md" });
  tools.edit({ name: "a.md", text: "milk" });
  fs.writeFileSync(path.join(dir, "not-a-note.txt"), "x");
  assert.deepEqual(tools.list({}), [{ name: "a.md", size: 5 }]);
});

test("grep matches lines case-insensitively with file and line number", () => {
  tools.create({ name: "a.md" });
  tools.edit({ name: "a.md", text: "Milk" });
  tools.edit({ name: "a.md", text: "eggs" });
  assert.deepEqual(tools.grep({ query: "milk" }), ["a.md:1: Milk"]);
});

test("delete removes the file", () => {
  tools.create({ name: "a.md" });
  assert.equal(tools.delete({ name: "a.md" }), "deleted a.md");
  assert.equal(fs.existsSync(path.join(dir, "a.md")), false);
});
