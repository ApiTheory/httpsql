# HttpSql

Execute SQL Queries over HTTPS.  A simple POC to see if HttpSql is a reasonable API approach to interact with data over HTTP.

- [HttpSql Documentation](http://www.httpsql.com)
- [HttpSql Playground](http://www.httpsql.com/docs/httpsql-playground)
- [Community Discussions](https://github.com/ApiTheory/httpsql/discussions) - ask questions to get a better understanding of HttpSql.
- [GitHub Issues](https://github.com/ApiTheory/httpsql/issues) - submit bugs, errors and inconsistences you find in HttpSql.

## Rationale

Over the years, developers have created many ways of manipulating and extracting data from databases via http.  HttpSql attempts to leverage the most ubiquotous language in computerdom - sql - to make it as easy as possible to execute data requests while also adding exception handling and the ability to execute business
logic and data transformations within the transactional request.

The HttpSql project is a POC to expriment and understand the pros and cons of this approach.

## Project Status

- [x] Alpha: Anyone can use this project, but don't put it into production projects.
- [ ] Beta: Stable enough for most non-enterprise use-cases
- [ ] Public: General Availability

Watch our releases to get notified of updates.

## Simple Query Comparison

Here is the simplest example of the format of an HTTPSql request:

``` JSON
[
  "sql" : "SELECT * FROM accounts WHERE name = $1",
  "params" : [ "acme" ]
]
```

### More Complex Example

Here is something a bit more complex. The goal is to get a project by it's id, test that it exists and is in the correct state, then add a child task to the project.  

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

It may look like a lot, but its doing the following which would require far more code to do correctly:

- retrieve the project and if it does not exist throw an exception; it will also throw if more than 1 row is returned.
- check to make sure the project is complete and if not throw an error.
- update the project with the new data using the ID that was retrieved in the first operation; check to make sure only 1 record was updated; throw an error if no rows were updated or too many rows were updated.
- return the data from the updated project.

In addition to throwing exceptions, onExpectationFailure can just equal 'stop.'  If that happens, then the entire transaction is commited up to that point, but no additional commands will execute.  onExpectationFailure can also be a plain object to deliver custom error messages.

A nice feature of the HttpSql response is that every step taken within the transaction is documented by the response.  This can be saved for audit purposes and just general debugging.

### Transform Example

HttpSql also has the ability to transform final responses or the intra-transactional results thanks to the power of [JSONata](http://www.jsonata.org) .  Here multiple rows are decomposed into JSON.  

``` JSON
 { 
  "commands" : [
  { 
    "sql": "INSERT INTO contacts ( id, name, homephone, mobilephone ) VALUES ( ?, ?, ?, ? ) RETURNING *;",
    "name": "insert-contact1",
    "params" : [ "1", "\"Alex\"", "\"555-555-5555\"", "\"555-555-5555\"" ],
    "expect" : "rowCount = 1",
  },
  { 
    "sql": "INSERT INTO contacts ( id, name, homephone, mobilephone, workphone, emergencyphone ) VALUES ( ?, ?, ?, ?, ?, ? ) RETURNING *;",
    "name": "insert-contact2",
    "params" : [ "2", "\"Betty\"", "\"555-555-4555\"", "\"555-555-4555\"", "\"555-555-4556\"", "\"555-555-4558\"" ],
    "expect": "rowCount = 1",
  },
  { 
    "sql" : "SELECT * FROM contacts;",
  },
  {
    "logicOp" : "lastDataResult.rows.{ 
      \"id\": id,
      \"name\" : name,
      \"phones\" : $sift(function($v, $k) {$k ~> /phone/})
    }",
  }

]
}
```

The result for the output rows would look like this:

```JSON
[
  {
    "id":1,
    "name":"Alex",
    "phones": {
      "homephone":"555-555-5555",
      "mobilephone":"555-555-5555",
      "workphone":null,
      "emergencyphone":null
    }
  },
  {
    "id":2,
    "name":"Betty",
    "phones": {
      "homephone":"555-555-4555",
      "mobilephone":"555-555-4555",
      "workphone":"555-555-4556",
      "emergencyphone":"555-555-4558"
    }
  }
]
```

## Learn More

Visit the [HttpSql website](http://www.httpsql.com) to view complete documentation.  There is also an [HttpSql playground](https://www.httpsql/htpsql-playground) to test out your own requests.

## Examples

Check out the examples directory to see how the same API calls are easily made against Postgres and Sqlite.

## Future Roadmap

There is none at the moment.  We intend to keep HTTPSql as simple as possible for the moment.  The combination of exposing SQL with the ability to execute business logic and error handling through a single HTTP call is very powerful.  Our goal is to see what people think of this approach, what holes they see in the POC, and then take it from there.  So please feel free to join us on Discord or ask questions here on Github to help drive any future features.
