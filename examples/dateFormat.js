/* eslint-disable import/no-extraneous-dependencies, no-console */
import { buildSchema, graphql } from 'graphql'
import format from 'date-fns/format'
import { addDirectiveResolveFunctionsToSchema } from '../src'

// Create schema with directive declarations
const schema = buildSchema(/* GraphQL */ `
  # Format date using "date-fns/format"
  directive @dateFormat(format: String) on FIELD_DEFINITION | FIELD

  type Book {
    title: String
    publishedDate: String @dateFormat(format: "DD-MM-YYYY")
  }

  type Query {
    book: Book
  }
`)

// Add directive resolvers to schema
addDirectiveResolveFunctionsToSchema(schema, {
  async dateFormat(resolve, source, directiveArgs) {
    const value = await resolve()
    return format(new Date(value), directiveArgs.format)
  },
})

// Use directive in query
const query = /* GraphQL */ `
  {
    book {
      title
      publishedDate
      publishedYear: publishedDate @dateFormat(format: "YYYY")
    }
  }
`

const rootValue = {
  book: () => ({
    title: 'Harry Potter',
    publishedDate: '1997-06-12T00:00:00.000Z',
  }),
}

graphql(schema, query, rootValue).then(response => {
  console.log(response.data)
  // { book:
  //  { title: 'Harry Potter',
  //    publishedDate: '12-06-1997',
  //    publishedYear: '1997' } }
})
