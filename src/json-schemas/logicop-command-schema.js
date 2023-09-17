export const logicOpSchema = {
  type: "object",
  properties: {
    id: { "type": "string" },
    logicOp : { "type": "string" },
    name : { "type": "string" },
    purpose : { "type": "string" },
    expect : { "type": "string" },
    expectationDescription : { "type": "string" },
    onExpectationFailure : { "type": ["string", "object"] }
  },
  required : ["logicOp"],
  additionalProperties : false
}