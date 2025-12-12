import { ItemSchema, CharacterSchema, VendorLogSchema } from './schemas';

export function validateItem(item) {
  return ItemSchema.parse(item);
}

export function validateCharacter(character) {
  return CharacterSchema.parse(character);
}

export function validateVendorLog(log) {
  return VendorLogSchema.parse(log);
}

// Generic validation helper
export function validateWithSchema(schema, data) {
  return schema.parse(data);
}
