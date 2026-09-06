// The notes MCP server. claude spawns this as a stdio server (see brain.ts):
// one JSON-RPC request per stdin line, one reply per stdout line. Runs the
// six tools from tools.ts over the directory given as argv[2]. Plain node,
// no Electron.
import * as readline from "node:readline";
import { makeTools } from "./tools.js";

type Request = {
  id?: number;
  method: string;
  params?: { name?: string; arguments?: Record<string, string> };
};

const name = { type: "string", description: "file name, like shopping.md" };
const checksum = {
  type: "string",
  description: "the checksum returned by the last get or edit of this file",
};
const object = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties,
  required,
});

// what claude sees in tools/list; the descriptions carry the checksum rule
const TOOLS = [
  {
    name: "list",
    description: "List every note: name and size in bytes.",
    inputSchema: object({}, []),
  },
  {
    name: "get",
    description:
      "Read one note. Returns its checksum and text. Call this before edit or delete.",
    inputSchema: object({ name }, ["name"]),
  },
  {
    name: "create",
    description: "Create an empty note. Fails if the name is taken.",
    inputSchema: object({ name }, ["name"]),
  },
  {
    name: "edit",
    description:
      "Append one line to a note. Needs the checksum from get or the previous edit. Returns the new checksum and text.",
    inputSchema: object(
      {
        name,
        text: { type: "string", description: "the line to append" },
        checksum,
      },
      ["name", "text", "checksum"],
    ),
  },
  {
    name: "delete",
    description: "Delete a note. Needs the checksum from get.",
    inputSchema: object({ name, checksum }, ["name", "checksum"]),
  },
  {
    name: "grep",
    description:
      "Find lines containing the query, case-insensitive, across every note.",
    inputSchema: object(
      { query: { type: "string", description: "substring to look for" } },
      ["query"],
    ),
  },
];

const tools = makeTools(process.argv[2]);

const send = (body: Record<string, unknown>) =>
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...body }) + "\n");
const reply = (id: number, result: unknown) => send({ id, result });
const fail = (id: number, code: number, message: string) =>
  send({ id, error: { code, message } });

// runs one tool; a thrown error becomes an isError result so the model can
// read it and recover, for example by calling get again
const callTool = (id: number, params: Request["params"] = {}) => {
  const run = tools[params.name ?? ""];
  if (!run) return fail(id, -32602, `no tool named ${params.name}`);
  try {
    const result = run(params.arguments ?? {});
    const text = typeof result === "string" ? result : JSON.stringify(result);
    reply(id, { content: [{ type: "text", text }] });
  } catch (err) {
    reply(id, {
      content: [{ type: "text", text: (err as Error).message }],
      isError: true,
    });
  }
};

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const req = JSON.parse(line) as Request;
  // notifications (no id) get no reply
  if (req.id === undefined) return;
  switch (req.method) {
    case "initialize":
      return reply(req.id, {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "notes", version: "0.1.0" },
      });
    case "ping":
      return reply(req.id, {});
    case "tools/list":
      return reply(req.id, { tools: TOOLS });
    case "tools/call":
      return callTool(req.id, req.params);
    default:
      return fail(req.id, -32601, `method not found: ${req.method}`);
  }
});
