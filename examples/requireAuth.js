/* eslint-disable import/no-extraneous-dependencies, no-console */
import { buildSchema, graphql } from 'graphql'
import { addDirectiveResolveFunctionsToSchema } from '../src'

// Create schema with directive declarations
const schema = buildSchema(/* GraphQL */ `
  # Require authentication on a specific field
  directive @requireAuth on FIELD_DEFINITION

  type Query {
    allowed: String
    unallowed: String @requireAuth
  }
`)

// Add directive resolvers to schema
addDirectiveResolveFunctionsToSchema(schema, {
  requireAuth(resolve, directiveArgs, obj, context, info) {
    if (!context.isAuthenticated)
      throw new Error(`You must be authenticated to access "${info.fieldName}"`)
    return resolve()
  },
})

const query = /* GraphQL */ `
  {
    allowed
    unallowed
  }
`

const rootValue = { allowed: 'allowed', unallowed: 'unallowed' }

graphql(schema, query, rootValue, { isAuthenticated: false }).then(response => {
  console.log(response.data) // { allowed: 'allowed', unallowed: null }
  console.log(response.errors) // [ { Error: You must be authenticated to access "unallowed" } ]
})
