/* eslint-disable import/no-extraneous-dependencies, no-console */
import { buildSchema, graphql } from 'graphql'
import { addDirectiveResolveFunctionsToSchema } from '../src'

// Create schema with directive declarations
const schema = buildSchema(/* GraphQL */ `
  # Format field result into upperCase
  directive @upperCase on FIELD_DEFINITION | FIELD

  type Query {
    foo: String
  }
`)

// Add directive resolvers to schema
addDirectiveResolveFunctionsToSchema(schema, {
  async upperCase(resolve) {
    const value = await resolve()
    return String(value).toUpperCase()
  },
})

// Use directive in query
const query = /* GraphQL */ `
  {
    foo @upperCase
  }
`

const rootValue = { foo: 'foo' }

graphql(schema, query, rootValue).then(response => {
  console.log(response.data) // { foo: 'FOO' }
})
