import type { RpcFrame } from "./rpc.js";

/** Longest args summary or result line rendered on a tool one-liner. */
const MAX_SUMMARY = 120;

/** Per tool call: how much of its accumulated partial output is already printed. */
const printedByCall = new Map<string, number>();

/** True when the stream cursor sits at column 0 (the last write ended a line). */
let atLineStart = true;

/**
 * Stream one agent event to the terminal: assistant text verbatim, tool
 * one-liners with their args, and partial tool output live as it accumulates.
 * This is the operator's terminal view of the worker, not a log.
 *
 * @param event One agent event frame.
 */
export function streamEvent(event: RpcFrame): void {
  const type = event["type"];
  if (type === "message_update") {
    const inner = event["assistantMessageEvent"] as { type?: string; delta?: unknown } | undefined;
    if (inner?.type === "text_delta" && typeof inner.delta === "string") {
      emit(inner.delta);
    }
    return;
  }
  if (type === "tool_execution_start") {
    const id = String(event["toolCallId"]);
    printedByCall.set(id, 0);
    const name = String(event["toolName"]);
    const args = summarizeArgs(event["args"]);
    emitLine(`· ${name}${args.length === 0 ? "" : ` ${args}`} …`);
    return;
  }
  if (type === "tool_execution_update") {
    streamUpdate(String(event["toolCallId"]), resultText(event["partialResult"]));
    return;
  }
  if (type === "tool_execution_end") {
    streamEnd(event);
  }
}

/** Write raw text, tracking the line-start cursor. */
function emit(text: string): void {
  if (text.length === 0) {
    return;
  }
  process.stdout.write(text);
  atLineStart = text.endsWith("\n");
}

/** Write one full line, separating from any partial line first. */
function emitLine(text: string): void {
  emit(`${atLineStart ? "" : "\n"}${text}\n`);
}

/** Write a streamed fragment, indenting its lines two spaces. */
function emitIndented(text: string): void {
  if (text.length === 0) {
    return;
  }
  const prefix = atLineStart ? "  " : "";
  emit(prefix + text.replace(/\n(?!$)/g, "\n  "));
}

/** One-line, truncated rendering of an args value or result text. */
function flatten(text: string): string {
  const line = text
    .split("\n")
    .map((part: string): string => part.trim())
    .filter((part: string): boolean => part.length > 0)
    .join(" ");
  return line.length > MAX_SUMMARY ? `${line.slice(0, MAX_SUMMARY - 1)}…` : line;
}

/** First meaningful arg for a one-liner: command, path, or first string value. */
function summarizeArgs(args: unknown): string {
  if (typeof args !== "object" || args === null) {
    return "";
  }
  const record = args as Record<string, unknown>;
  const preferred = ["command", "path", "file_path", "pattern", "url"];
  let value: unknown;
  for (const key of preferred) {
    if (typeof record[key] === "string") {
      value = record[key];
      break;
    }
  }
  if (value === undefined) {
    value = Object.values(record).find((candidate: unknown): boolean => typeof candidate === "string");
  }
  return typeof value === "string" ? flatten(value) : "";
}

/** Concatenate the text parts of a tool result's content array. */
function resultText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }
  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return "";
  }
  let text = "";
  for (const part of content) {
    if (typeof part === "object" && part !== null) {
      const item = part as { type?: unknown; text?: unknown };
      if (item.type === "text" && typeof item.text === "string") {
        text += item.text;
      }
    }
  }
  return text;
}

/** Emit only the newly accumulated portion of a tool call's partial output. */
function streamUpdate(callId: string, text: string): void {
  const printed = printedByCall.get(callId);
  if (printed === undefined) {
    return;
  }
  if (text.length < printed) {
    // The accumulated output was rewritten, not extended — resync silently.
    printedByCall.set(callId, text.length);
    return;
  }
  if (text.length > printed) {
    printedByCall.set(callId, text.length);
    emitIndented(text.slice(printed));
  }
}

/** Emit the end line: bare when output streamed live, summarized otherwise. */
function streamEnd(event: RpcFrame): void {
  const callId = String(event["toolCallId"]);
  const name = String(event["toolName"]);
  const failed = event["isError"] === true;
  const text = resultText(event["result"]);
  const printed = printedByCall.get(callId) ?? 0;
  printedByCall.delete(callId);
  const status = failed ? "ERROR" : "done";
  if (printed > 0) {
    if (text.length > printed) {
      emitIndented(text.slice(printed));
    }
    emitLine(`· ${name} ${status}`);
    return;
  }
  const summary = flatten(text);
  emitLine(`· ${name} ${status}${summary.length === 0 ? "" : ` · ${summary}`}`);
}
