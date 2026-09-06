import { test, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";

// Drives the MCP server the way claude does: spawn dist/modules/mcp.js with a
// notes dir, write JSON-RPC lines to stdin, read replies from stdout.
type Reply = {
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
};
type Call = { content: { type: string; text: string }[]; isError?: boolean };

let dir: string;
let server: ChildProcess;
let replies: Map<number, (r: Reply) => void>;
let nextId: number;
const mcp = path.join(__dirname, "../modules/mcp.js");

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
  server = spawn(process.execPath, [mcp, dir], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  replies = new Map();
  nextId = 1;
  readline.createInterface({ input: server.stdout! }).on("line", (line) => {
    const reply = JSON.parse(line) as Reply;
    replies.get(reply.id)?.(reply);
    replies.delete(reply.id);
  });
});
afterEach(() => {
  server.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

const request = (method: string, params?: unknown) =>
  new Promise<Reply>((resolve, reject) => {
    const id = nextId++;
    replies.set(id, resolve);
    server.once("exit", (code) => reject(new Error(`mcp.js exited ${code}`)));
    server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    server.stdin!.write("\n");
  });

const call = async (name: string, args: Record<string, string> = {}) => {
  const reply = await request("tools/call", { name, arguments: args });
  return reply.result as Call;
};
const text = (c: Call) => c.content[0].text;

test("initialize answers with the tools capability and the server name", async () => {
  const reply = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  });
  const result = reply.result as {
    capabilities: { tools: unknown };
    serverInfo: { name: string };
  };
  assert.ok(result.capabilities.tools);
  assert.equal(result.serverInfo.name, "notes");
});

test("tools/list names the six note tools", async () => {
  const reply = await request("tools/list");
  const tools = (reply.result as { tools: { name: string }[] }).tools;
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "create",
    "delete",
    "edit",
    "get",
    "grep",
    "list",
  ]);
});

test("create, get and edit round-trip the checksum", async () => {
  assert.equal(text(await call("create", { name: "a.md" })), "created a.md");
  const got = JSON.parse(text(await call("get", { name: "a.md" })));
  const edited = JSON.parse(
    text(
      await call("edit", {
        name: "a.md",
        text: "milk",
        checksum: got.checksum,
      }),
    ),
  );
  assert.equal(edited.text, "milk\n");
  assert.equal(fs.readFileSync(path.join(dir, "a.md"), "utf8"), "milk\n");
});

test("a tool error comes back as isError with the message", async () => {
  await call("create", { name: "a.md" });
  const result = await call("edit", {
    name: "a.md",
    text: "x",
    checksum: "bad",
  });
  assert.equal(result.isError, true);
  assert.match(text(result), /checksum stale/);
});

test("an unknown method is a JSON-RPC method-not-found error", async () => {
  const reply = await request("resources/list");
  assert.equal(reply.error?.code, -32601);
});

// claude runs mcp.js under plain node. Loading the electron package there
// prints "Downloading Electron binary..." to stdout when the binary is
// missing, which breaks the JSON-RPC stream.
test("mcp.js never loads the electron package", () => {
  const probe = `require(${JSON.stringify(mcp)});
    console.log(Object.keys(require.cache).some((k) => k.includes("node_modules/electron")));`;
  const out = spawnSync(process.execPath, ["-e", probe], { input: "" });
  assert.equal(out.stdout.toString().trim(), "false");
});
