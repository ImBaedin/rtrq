import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type TopicFixture = {
  name: string;
  logicalKey: JsonValue[];
  topic: string;
};

type InvalidTopicFixture = {
  name: string;
  jsonText: string;
  reason: string;
};

type WebSocketFixture = {
  name: string;
  direction: "client_to_server" | "server_to_client";
  message: Record<string, unknown>;
};

type InvalidWebSocketFixture = {
  name: string;
  message: Record<string, unknown>;
  reason: string;
};

type HttpRequestFixture = {
  name: string;
  headers: Record<string, string>;
  body: {
    topics: string[];
    source?: string;
  };
  expectedResponse: string;
};

type HttpResponseFixture = {
  name: string;
  status: number;
  body: Record<string, unknown>;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(scriptDir, "..", "fixtures", "protocol");

const topicsFixtures = readJson<{
  valid: TopicFixture[];
  invalid: InvalidTopicFixture[];
}>("topics.json");
const websocketFixtures = readJson<{
  valid: WebSocketFixture[];
  invalid: InvalidWebSocketFixture[];
}>("websocket-messages.json");
const httpFixtures = readJson<{
  valid: {
    requests: HttpRequestFixture[];
    responses: HttpResponseFixture[];
  };
  invalid: {
    requests: Array<{
      name: string;
      headers: Record<string, string>;
      body: Record<string, unknown>;
      expectedStatus: number;
      reason: string;
    }>;
  };
}>("http-invalidation.json");

for (const example of topicsFixtures.valid) {
  assert(
    canonicalTopic(example.logicalKey) === example.topic,
    `Valid topic fixture ${example.name} is not canonical.`,
  );
}

for (const example of topicsFixtures.invalid) {
  assert(
    isValidTopicString(example.jsonText) === false,
    `Invalid topic fixture ${example.name} was treated as valid.`,
  );
}

for (const example of websocketFixtures.valid) {
  assert(
    isValidWebSocketMessage(example.message),
    `Valid WebSocket fixture ${example.name} failed validation.`,
  );
}

for (const example of websocketFixtures.invalid) {
  assert(
    isValidWebSocketMessage(example.message) === false,
    `Invalid WebSocket fixture ${example.name} was treated as valid.`,
  );
}

const httpResponses = new Map(
  httpFixtures.valid.responses.map((response) => [response.name, response]),
);

for (const request of httpFixtures.valid.requests) {
  assert(
    request.headers["x-rtrq-secret"] !== undefined,
    `HTTP fixture ${request.name} must include the shared secret header example.`,
  );
  assert(
    isNonEmptyTopicList(request.body.topics),
    `HTTP fixture ${request.name} must use a non-empty topics array.`,
  );
  assert(
    httpResponses.has(request.expectedResponse),
    `HTTP fixture ${request.name} references a missing response fixture.`,
  );
}

for (const request of httpFixtures.invalid.requests) {
  assert(
    Number.isInteger(request.expectedStatus) && request.expectedStatus >= 400,
    `Invalid HTTP fixture ${request.name} must define an error status.`,
  );
}

function readJson<T>(name: string): T {
  const content = readFileSync(path.join(fixtureDir, name), "utf8");
  return JSON.parse(content) as T;
}

function canonicalTopic(value: JsonValue): string {
  assert(Array.isArray(value), "Topic logical keys must be JSON arrays.");
  return JSON.stringify(canonicalizeJson(value));
}

function canonicalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) =>
      compareUnicodeCodePoints(left, right),
    );
    return Object.fromEntries(
      entries.map(([key, entryValue]) => [key, canonicalizeJson(entryValue)]),
    );
  }

  return value;
}

function isValidTopicString(topic: string): boolean {
  try {
    const parsed = JSON.parse(topic) as JsonValue;
    return Array.isArray(parsed) && canonicalTopic(parsed) === topic;
  } catch {
    return false;
  }
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left);
  const rightPoints = Array.from(right);
  const maxLength = Math.max(leftPoints.length, rightPoints.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPoint = leftPoints[index];
    const rightPoint = rightPoints[index];

    if (leftPoint === undefined) {
      return -1;
    }

    if (rightPoint === undefined) {
      return 1;
    }

    const leftValue = leftPoint.codePointAt(0);
    const rightValue = rightPoint.codePointAt(0);

    if (leftValue === undefined || rightValue === undefined) {
      continue;
    }

    if (leftValue < rightValue) {
      return -1;
    }

    if (leftValue > rightValue) {
      return 1;
    }
  }

  return 0;
}

function isValidWebSocketMessage(message: Record<string, unknown>): boolean {
  const messageType = message.type;
  if (typeof messageType !== "string") {
    return false;
  }

  switch (messageType) {
    case "subscribe":
    case "unsubscribe":
      return (
        isNonEmptyString(message.op_id) && isNonEmptyTopicList(message.topics)
      );
    case "ready":
      return isNonEmptyString(message.connection_id);
    case "subscription_ack":
      return (
        isNonEmptyString(message.op_id) &&
        (message.action === "subscribe" || message.action === "unsubscribe") &&
        Number.isInteger(message.topic_count) &&
        (message.topic_count as number) >= 0 &&
        message.result === "applied"
      );
    case "invalidation":
      return (
        isNonEmptyString(message.delivery_id) &&
        isNonEmptyTopicList(message.topics)
      );
    case "error":
      return (
        (message.op_id === undefined || isNonEmptyString(message.op_id)) &&
        isNonEmptyString(message.code) &&
        isNonEmptyString(message.detail)
      );
    default:
      return false;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonEmptyTopicList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string" && isValidTopicString(entry))
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
