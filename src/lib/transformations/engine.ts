export interface TransformationRule {
  action: "rename_field" | "remove_field" | "add_field" | "map_value";
  field: string;
  value?: unknown;
  mapping?: Record<string, unknown>;
}

export function applyTransformations(
  payload: Record<string, unknown>,
  rules: TransformationRule[]
): Record<string, unknown> {
  let result = { ...payload };

  for (const rule of rules) {
    switch (rule.action) {
      case "rename_field": {
        if (rule.field in result && typeof rule.value === "string") {
          result[rule.value] = result[rule.field];
          delete result[rule.field];
        }
        break;
      }
      case "remove_field": {
        delete result[rule.field];
        break;
      }
      case "add_field": {
        result[rule.field] = rule.value;
        break;
      }
      case "map_value": {
        if (rule.field in result && rule.mapping) {
          const currentValue = String(result[rule.field]);
          if (currentValue in rule.mapping) {
            result[rule.field] = rule.mapping[currentValue];
          }
        }
        break;
      }
    }
  }

  return result;
}
