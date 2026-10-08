import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

export const utf8 = {
  encode: value => new TextEncoder().encode(value),
  decode: value => new TextDecoder().decode(value)
};

function varint(value) {
  let n = BigInt(value);
  const bytes = [];
  do { bytes.push(Number(n & 127n) | (n > 127n ? 128 : 0)); n >>= 7n; } while (n);
  return bytes;
}

// Schema-free wire fixtures matching Anywhere.codec.protobuf's public contract.
export const protobuf = {
  encode(entries) {
    const bytes = [];
    for (const { field, wire, value } of entries) {
      bytes.push(...varint(BigInt(field) * 8n + BigInt(wire)));
      if (wire === 0) bytes.push(...varint(value));
      else {
        if (wire === 2) bytes.push(...varint(value.length));
        bytes.push(...value);
      }
    }
    return Uint8Array.from(bytes);
  },
  decode(bytes) {
    let pos = 0;
    function readVarint() {
      let n = 0n;
      for (let shift = 0n; shift < 70n; shift += 7n) {
        if (pos >= bytes.length) throw Error("Truncated varint");
        const byte = bytes[pos++];
        n |= BigInt(byte & 127) << shift;
        if (!(byte & 128)) return n;
      }
      throw Error("Invalid varint");
    }
    const entries = [];
    while (pos < bytes.length) {
      const tag = readVarint();
      const field = Number(tag >> 3n), wire = Number(tag & 7n);
      if (!field) throw Error("Invalid field");
      let value;
      if (wire === 0) value = readVarint();
      else {
        const length = wire === 2 ? Number(readVarint()) : wire === 1 ? 8 : wire === 5 ? 4 : -1;
        if (length < 0 || pos + length > bytes.length) throw Error("Invalid body");
        value = bytes.slice(pos, pos + length);
        pos += length;
      }
      entries.push({ field, wire, value });
    }
    return entries;
  }
};

export const str = (field, value) => ({ field, wire: 2, value: utf8.encode(value) });
export const nested = (field, entries) => ({ field, wire: 2, value: protobuf.encode(entries) });

export function runtime(id, parameters = {}, handler, phase = 1, scriptFile) {
  const calls = [], logs = [], responses = [], store = new Map();
  const Anywhere = {
    codec: { utf8, protobuf, hex: { encode: bytes => Buffer.from(bytes).toString("hex") } },
    crypto: { md5: bytes => new Uint8Array(createHash("md5").update(typeof bytes === "string" ? bytes : Buffer.from(bytes)).digest()), randomBytes: n => new Uint8Array(randomBytes(n)) },
    params: { get: name => parameters[name] },
    store: { getString: name => store.get(name), set: (name, value) => store.set(name, value) },
    log: { warning: message => logs.push(message) },
    respond: result => responses.push(result),
    http: { async post(url, options) {
      calls.push({ url, options });
      if (!handler) throw Error("Unexpected outbound request");
      return handler(url, options);
    } }
  };
  const context = vm.createContext({ Anywhere, console: { log: () => {} }, Uint8Array, ArrayBuffer, DataView });
  const modules = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url)));
  const rule = modules.find(module => module.id === id).rules.find(rule => !Array.isArray(rule) && rule.phase === phase && (!scriptFile || rule.scripts.includes(scriptFile)));
  for (const [name, path] of Object.entries(rule.bindings || {})) {
    context[name] = JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));
  }
  const source = rule.scripts.map(path => readFileSync(new URL("../" + path, import.meta.url), "utf8")).join("\n");
  vm.runInContext(source, context, { timeout: 3000 });
  return {
    calls, logs, responses, store,
    async run(ctx) {
      context.ctx = ctx;
      await vm.runInContext("process(ctx)", context, { timeout: 3000 });
      return ctx;
    }
  };
}

export function response(url, body, contentType = "application/x-protobuf") {
  return { phase: "response", status: 200, url, headers: [["Content-Type", contentType]], body };
}
