export const logicOpSchema = {
  type: "object",
  properties: {
    id: { "type": "string" },
    logicOp : { "type": "string" },
    name : { "type": "string" },
    purpose : { "type": "string" },
    onExpectationFailure : { "type": ["string", "object"] }
  },
  required : ["logicOp"],
  additionalProperties : false
}