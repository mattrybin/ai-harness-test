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
type Got = { checksum: string; text: string };
const HEX8 = /^[0-9a-f]{8}$/;
const sumOf = (name: string) => (tools.get({ name }) as Got).checksum;
// get, then edit with that checksum: the protocol every caller follows
const add = (name: string, text: string) =>
  tools.edit({ name, text, checksum: sumOf(name) }) as Got;

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
  add("a.md", "milk");
  add("a.md", "eggs");
  assert.equal(read("a.md"), "milk\neggs\n");
});

test("edit without a checksum is refused and the file is unchanged", () => {
  tools.create({ name: "a.md" });
  assert.throws(
    () => tools.edit({ name: "a.md", text: "milk" }),
    /checksum required/,
  );
  assert.equal(read("a.md"), "");
});

test("edit with a stale checksum is refused and the file is unchanged", () => {
  tools.create({ name: "a.md" });
  const stale = sumOf("a.md");
  add("a.md", "milk");
  assert.throws(
    () => tools.edit({ name: "a.md", text: "eggs", checksum: stale }),
    /checksum stale/,
  );
  assert.equal(read("a.md"), "milk\n");
});

test("edit returns the new checksum and text", () => {
  tools.create({ name: "a.md" });
  const got = add("a.md", "milk");
  assert.equal(got.text, "milk\n");
  assert.equal(got.checksum, sumOf("a.md"));
});

test("a second edit with the checksum edit returned needs no get", () => {
  tools.create({ name: "a.md" });
  const { checksum } = add("a.md", "milk");
  tools.edit({ name: "a.md", text: "eggs", checksum });
  assert.equal(read("a.md"), "milk\neggs\n");
});

test("get returns the text with an 8-hex checksum", () => {
  tools.create({ name: "a.md" });
  add("a.md", "milk");
  const got = tools.get({ name: "a.md" }) as Got;
  assert.equal(got.text, "milk\n");
  assert.match(got.checksum, HEX8);
});

test("checksum changes when the text changes", () => {
  tools.create({ name: "a.md" });
  const before = sumOf("a.md");
  add("a.md", "milk");
  const after = sumOf("a.md");
  assert.notEqual(before, after);
});

test("list names each .md file with its size", () => {
  tools.create({ name: "a.md" });
  add("a.md", "milk");
  fs.writeFileSync(path.join(dir, "not-a-note.txt"), "x");
  assert.deepEqual(tools.list({}), [{ name: "a.md", size: 5 }]);
});

test("grep matches lines case-insensitively with file and line number", () => {
  tools.create({ name: "a.md" });
  add("a.md", "Milk");
  add("a.md", "eggs");
  assert.deepEqual(tools.grep({ query: "milk" }), ["a.md:1: Milk"]);
});

test("delete removes the file", () => {
  tools.create({ name: "a.md" });
  assert.equal(tools.delete({ name: "a.md" }), "deleted a.md");
  assert.equal(fs.existsSync(path.join(dir, "a.md")), false);
});
