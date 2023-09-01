# httpsql samples

This folder has a number of examples that can help provide a feel for where we are trying to go with httpsql.

## Files

### create-table-insert-then-retrieve

The sample runs 4 separate transactions:

- create a table
- insert a record
- insert a record with the same ID to see if an exception is thrown with postgres info
- select the record by its inserted id, run a logic block to make sure the status for the project is not frozen, then update the project with a new name.
