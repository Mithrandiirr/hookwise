import { db } from "@/lib/db";
import { payloadSchemas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface InferredSchema {
  fields: Record<string, FieldInfo>;
  avgSize: number;
  sampleCount: number;
}

interface FieldInfo {
  type: string;
  seen: number;
  nested?: Record<string, FieldInfo>;
}

export interface SchemaUpdateResult {
  isNew: boolean;
  schemaChanged: boolean;
  anomalies: string[];
}

export async function updatePayloadSchema(
  integrationId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<SchemaUpdateResult> {
  const [existing] = await db
    .select()
    .from(payloadSchemas)
    .where(
      and(
        eq(payloadSchemas.integrationId, integrationId),
        eq(payloadSchemas.eventType, eventType)
      )
    )
    .limit(1);

  const payloadSize = JSON.stringify(payload).length;

  if (!existing) {
    const schema = inferSchema(payload);
    schema.avgSize = payloadSize;
    schema.sampleCount = 1;

    await db.insert(payloadSchemas).values({
      integrationId,
      eventType,
      jsonSchema: schema,
      lastUpdated: new Date(),
    });

    return { isNew: true, schemaChanged: false, anomalies: [] };
  }

  // Merge new payload into existing schema
  const currentSchema = existing.jsonSchema as InferredSchema;
  const anomalies: string[] = [];
  let schemaChanged = false;

  const newFields = inferSchema(payload).fields;

  // Detect new fields
  for (const [key, info] of Object.entries(newFields)) {
    if (!currentSchema.fields[key]) {
      anomalies.push(`New field: ${key} (${info.type})`);
      currentSchema.fields[key] = info;
      schemaChanged = true;
    } else {
      // Check type changes
      const existingType = currentSchema.fields[key].type;
      if (existingType !== info.type && info.type !== "null") {
        anomalies.push(
          `Type change: ${key} was ${existingType}, now ${info.type}`
        );
        schemaChanged = true;
      }
      currentSchema.fields[key].seen++;
    }
  }

  // Detect missing fields (fields in schema but not in this payload)
  for (const key of Object.keys(currentSchema.fields)) {
    if (!(key in newFields)) {
      // Don't flag as anomaly — fields can be optional
      // But track the frequency
    }
  }

  // Check size deviation
  if (
    currentSchema.avgSize > 0 &&
    payloadSize > currentSchema.avgSize * 3
  ) {
    anomalies.push(
      `Payload size ${payloadSize} is ${(payloadSize / currentSchema.avgSize).toFixed(1)}x larger than average (${currentSchema.avgSize})`
    );
  }

  // Update schema with EMA for size
  currentSchema.avgSize =
    currentSchema.avgSize * 0.9 + payloadSize * 0.1;
  currentSchema.sampleCount++;

  await db
    .update(payloadSchemas)
    .set({
      jsonSchema: currentSchema,
      lastUpdated: new Date(),
    })
    .where(eq(payloadSchemas.id, existing.id));

  return { isNew: false, schemaChanged, anomalies };
}

function inferSchema(obj: Record<string, unknown>): InferredSchema {
  const fields: Record<string, FieldInfo> = {};

  for (const [key, value] of Object.entries(obj)) {
    fields[key] = inferFieldType(value);
  }

  return { fields, avgSize: 0, sampleCount: 0 };
}

function inferFieldType(value: unknown): FieldInfo {
  if (value === null || value === undefined) {
    return { type: "null", seen: 1 };
  }
  if (Array.isArray(value)) {
    return { type: "array", seen: 1 };
  }
  if (typeof value === "object") {
    const nested: Record<string, FieldInfo> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      nested[k] = inferFieldType(v);
    }
    return { type: "object", seen: 1, nested };
  }
  return { type: typeof value, seen: 1 };
}
