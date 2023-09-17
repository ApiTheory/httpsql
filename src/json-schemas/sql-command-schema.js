export const sqlCommandSchema = {
  anyOf : [
    {
    type: "object",
    properties: {
      id: { type: "string" },
      sql: { type: "string" },
      name : { type: "string" },
      description : { type: "string" },
      strict : { type: "boolean", default : true },
      params : {
        type: "array",
        items: [ { type: [ "integer", "string", "number", "boolean", "null", "array", "object" ]} ]
      },
      expect: { type: "string" },
      expectationDescription : { "type": "string" },
      onExpectationFailure : { type: ["string", "object"] }
    },
    required : [ "sql" ],
    additionalProperties : false
  },{
    type: "object",
    properties: {
      id: { type: "string" },
      sql: { type: "string" },
      name : { type: "string" },
      description : { type: "string" },
      strict: { type: "boolean", default : true },
      params : {
        type: "array",
        items: [ { 
          type: [ 
            "integer", 
            "string", 
            "number", 
            "boolean", 
            "null", 
            "array", 
            "object" ]
        } ]
      },
      expect: { type: "integer" },
      onExpectationFailure: { type: ["string", "object"] }
    },
    required : [ "sql" ],
    additionalProperties : false
  }]
}