# HTTPSql
Execute Postgresql Queries over HTTPS.  A simple POC to see if HTTPSql is a reasonable alternative to REST/GraphQL/OData for interacting with data over an HTTP api.

## Rationale

Over the years, developers have created new ways of manipulating and extracting data from databases over the most ubiquotous channe. - http:  The most successful have been REST, GraphQL and OData (though people can certainly argue about how successful OData has been ...).

Each of these approaches are essentially API contracts for facilitating the stateless transfer of data between two computers.  

HTTPSql attempts to leverage one of the most ubiquotous languages in computerdom.  Why learn the proper way to query a REST, OData or GraphQL api if you have a far more expressive tool at your disposal?

The HTTPSql project is a POC to understand the pros and cons of this approach to interacting with data over HTTP through Postgresql.

If you wish to see a simple full server implementation, check out our HTTPSql Server repo for a Fastify server which exposes a POST endpoint for HTTPSql interaction.  You can also head over to our interactive playground to test against a database which already has some sample data.

## Simple Query Comparison

Here is the simplest example of the format of an HTTPSql request:

``` JSON
[
  sql: "SELECT * FROM accounts WHERE name = $1",
  params: [ "acme" ]
]
```

How would that be done with REST?  It's very straight forward as well (we base our example on Postgrest which has, what we feel, is the most robust and well thought through approach to REST):

``` REST
/accounts?name=acme
```

GraphQL?

``` JSON
{ query: "accounts(name: $name) {
    id
    name
  }", 
  variables: { name: "acme" } 
}
```

### More Complex Comparison

OK, none of those are too difficult to understand.  The REST example is definitely the easiest.  But what if you want to do an operation, examine the value, and then execute another operation?

With REST and GraphQL, you can either wrap your business logic into a stored procedure, or execute multiple calls to the API and handle some of your business logic outside of the query language.  There are pros and cons to both approaches which will be examined later.  For now, we'll just focus on the code.

The goal is to get a project by it's id, test that is exists and is in the correct state, then add a child task to the project.  Again, to note, the best way to do this for all approaches would be to create a stored procedure and then to execute the stored procedure.  Of course, we know that everyone encapsulates all their business logic in functions and stored procedures and only exposes data via views, right?  Right?

#### REST/GraphQL psudeo-request:
``` 
- make a request to GET /projects/id1 or to the graphql endpoint with a query
- if a row (make sure its only 1 row) is returned continue, otherwise throw an error because the project does not exist
- if the returned project status !== 'active' throw an error since we only will allow changes to active records
- make a request to POST /projects/id1/tasks (or create a graphql mutation) with the task data
```

#### HTTPSql request:
``` JSON
 { 
  "commands" : [{ 
    "sql": "SELECT id, status, name FROM projects WHERE name = $1;",
    "name": "get-project",
    "strict" : true,
    "params" : ["{projectName}"],
    "expect" : "one",
    "onExpectationFailure" : "throw"
  },
  {
    "name" : "check-if-completed",
    "purpose" : "only proceed if status is completed",
    "opEval": {"===" : ["complete", {"var" : "lastOp.rows.0.status"}]}
  },
  {
     "name" : "update-project",
    "sql": "UPDATE projects SET name = $2, status = $3 WHERE id = $1 RETURNING *;",
    "params" : ["{results:rows.0.id}", "{variables:updatedName}", "{updatedStatus}"],
    "expect" : "one"
  }],
  "variables" : {
    "projectName": "moon launch", 
    "updatedName": "mars launch", 
    "updatedStatus": "sometime soon" 
  }
}
```

It may look like a lot, but its doing the following:

- retrieve the project and if it does not exist it throws; it will also throw if more than 1 rows are returned
- check to make sure the project is complete and if not throw an error
- update the project with the new data using the ID that was retrieved in the first operation; check to make sure only 1 record was updated; throw an error if no rows were updated or too many rows were updated
- return the data from the updated project

This is a good point to introduce the options of what if an exception is thrown.  Note that onExpectationFailure in the update command is not specified so it will automatically throw.  This will have the effect of rolling back the transaction so no data was changed.  A good option if you know you should update 1 row but for whatever reason your WHERE clause was wrong and you updated more than 1 row.  

In addition to throwing an error, onExpectationFailure can just equal 'stop.'  If that happens, then the entire transaction is commited up to that point, but no additional commands will execute.

## Future Roadmap

There is none at the moment.  We intend to keep HTTPSql as simple as possible for the moment.  The combination of exposing SQL with the ability to execute business logic and error handling through a single HTTP call is very powerful.  Our goal is to see what people think of this approach, what holes they see in the POC, and then take it from there.  So please feel free to join us on Discord or ask questions here on Github to help drive any future features.

## Shoutouts

Thanks to the following open source projects:

JSON Logic Engine: https://www.npmjs.com/package/json-logic-engine
This library drives our logicOp blocks.

