# httpsql samples

This folder has a number of examples that can help provide a feel for httpsql.

## Setup

Each file expects the following environment variable to be set in order to connect to your postgres database:

- DATABASE_URL

We suggest using a .env file in the root of the project to drive these values.  A .env.sample has been provided in the examples directory.

## Running Examples

Each example can be executed directly via node:

```
node ./01.create-table.js
```

Script commands have also been setup in the package so *npm run* can execute :

```
npm run sample1
```

## Files

### 01.create-table.js

Drops a projects table if it exists and then creates it again.  Run this file first to get started and can be run before and after each sample in order to start fresh.

### 02.simple-insert.js

Demonstrates a simple project insert with returned data and an expectation that only one row gets created.

### 03.simple-insert-failure.js

Creates a project and then attempts to create another project with the same ID and fails.  Demonstrate failure handling at the database level as well as the use to {variable:...} and {lastop:...} dynamic parameters.

### 04.fetch-all.js

Does a simple fetch of all rows in the projects table.  Use after each example to see the state of the projects table.

### 05.fetch-validate-update.js

Creates a project, attempts to fetch it by name, validates a specific status value, then updates the record with a new status value.  Demonstrates the use of a logic operation (logicOp) to drive future commands.

### 06.sql-command-schema-failure

Uses an incorrectly formatted command to demonstrate how validation errors are thrown.  See the json-schemas directory for the different validation schemas.

### 07.create-contact-table

Creates a contacts table

### 08.transform-contacts

Demonstrates how a logic operation can transform the shape of the final output.
