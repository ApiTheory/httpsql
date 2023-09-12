# HttpSql

Execute SQL Queries over HTTPS.  A simple POC to see if HttpSql is a reasonable API approach to interact with data over HTTP.

- [HttpSql Documentation](http://www.httpsql.com)
- [HttpSql Playground](http://www.httpsql.com/docs/httpsql-playground)

## Rationale

Over the years, developers have created many ways of manipulating and extracting data from databases via http REST, GraphQL and OData.  HttpSql attempts to leverage the most ubiquotous language in computerdom - sql - to make it as easy as possible to execute data requests.  

The HttpSql project is a POC to expriment and understand the pros and cons of this approach.

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

With REST and GraphQL, you can either wrap your business logic into a stored procedure, or execute multiple calls to the API and handle some of your business logic outside of the query language.  

Here is an example, The goal is to get a project by it's id, test that is exists and is in the correct state, then add a child task to the project.  Again, to note, the best way to do this for all approaches would be to create a stored procedure and then to execute the stored procedure.  Of course, we know that everyone encapsulates all their business logic in functions and stored procedures and only exposes data via views.  Heh.

#### REST/GraphQL psudeo-request:
``` 
- make a request to GET /projects/id1 or to the graphql endpoint with a query
- if a row (make sure its only 1 row) is returned, continue, otherwise throw an error because the project does not exist
- if the returned project status !== 'active' throw an error since we only will allow changes to active records
- make a request to POST /projects/id1/tasks (or create a graphql mutation) with the task data
```

#### HTTPSql request:
``` JSON
 { 
  "commands" : [{ 
    "sql": "SELECT id, status, name FROM projects WHERE name = $1;",
    "strict" : true,
    "params" : ["{projectName}"],
    "expect" : "one",
    "onExpectationFailure" : "throw"
  },
  {
    "name" : "check-if-completed",
    "description" : "only proceed if status is completed",
    "logicOp": {"===" : ["complete", {"var" : "lastOp.rows.0.status"}]}
  },
  {
    "sql": "UPDATE projects SET name = $2, status = $3 WHERE id = $1 RETURNING *;",
    "params" : ["{results.0.rows.0.id}", "{variables:updatedName}", "{updatedStatus}"],
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

- retrieve the project and if it does not exist it throws; it will also throw if more than 1 row is returned
- check to make sure the project is complete and if not throw an error
- update the project with the new data using the ID that was retrieved in the first operation; check to make sure only 1 record was updated; throw an error if no rows were updated or too many rows were updated
- return the data from the updated project
n addition to throwing an error, onExpectationFailure can just equal 'stop.'  If that happens, then the entire transaction is commited up to that point, but no additional commands will execute.

## Learn More

Visit the [HttpSql website](http://www.httpsql.com) to view complete documentation.  There is also an HttpSql playground to test out your own requests.

## Future Roadmap

There is none at the moment.  We intend to keep HTTPSql as simple as possible for the moment.  The combination of exposing SQL with the ability to execute business logic and error handling through a single HTTP call is very powerful.  Our goal is to see what people think of this approach, what holes they see in the POC, and then take it from there.  So please feel free to join us on Discord or ask questions here on Github to help drive any future features.

## Shoutouts

Thanks to the following open source projects:

JSON Logic Engine: https://www.npmjs.com/package/json-logic-engine
This library drives our logicOp blocks.
