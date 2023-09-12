export const logicOpSchema = {
  type: "object",
  properties: {
    id: { "type": "string" },
    logicOp : { "type": "object" },
    name : { "type": "string" },
    purpose : { "type": "string" },
    strict : { "type": "boolean", "default" : true },
    onFailure : { "type": ["string", "object"] }
  },
  required : ["logicOp"],
  additionalProperties : false
}