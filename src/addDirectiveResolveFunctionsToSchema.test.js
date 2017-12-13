/* eslint-disable no-shadow */
import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'
import { addDirectiveResolveFunctionsToSchema } from './'

const run = async (schema, query, context) => {
  const { data, errors } = await graphql(schema, query, null, context)
  if (errors && errors.length) {
    /* eslint-disable no-console */
    console.error(errors)
    /* eslint-enable no-console */
    throw new Error('Error during GraphQL request')
  }
  return data
}

describe('addDirectiveResolveFunctionsToSchema', () => {
  describe('FIELD_DEFINITION (schema)', () => {
    let schema

    beforeEach(() => {
      const typeDefs = /* GraphQL */ `
        directive @upperCase on FIELD_DEFINITION
        directive @substr(start: Int!, end: Int!) on FIELD_DEFINITION
        directive @prefixWithId on FIELD_DEFINITION
        directive @getContextKey(key: String!) on FIELD_DEFINITION
        directive @getFieldName on FIELD_DEFINITION

        type Query {
          foo: String
          upperCaseFoo: String @upperCase
          asyncUpperCaseFoo: String @upperCase
          substrFoo: String @substr(start: 1, end: 2)
          substrUppercaseFoo: String @substr(start: 1, end: 2) @upperCase
          book: Book
          version: String @getContextKey(key: "version")
          nameOfField: String @getFieldName
        }

        type Book {
          name: String
          slug: String @prefixWithId
        }
      `

      const fooResolver = () => 'foo'

      const resolvers = {
        Query: {
          foo: fooResolver,
          upperCaseFoo: fooResolver,
          asyncUpperCaseFoo: async () => fooResolver(),
          substrFoo: fooResolver,
          substrUppercaseFoo: fooResolver,
          book() {
            return { id: 1, name: 'Harry Potter', slug: 'harry-potter' }
          },
        },
      }

      const directiveResolvers = {
        async upperCase(resolve) {
          const value = await resolve()
          return value.toUpperCase()
        },
        async substr(resolve, source, directiveArgs) {
          const value = await resolve()
          return value.substr(directiveArgs.start, directiveArgs.end)
        },
        async prefixWithId(resolve, source) {
          const value = await resolve()
          return `${source.id}-${value}`
        },
        getContextKey(resolve, source, directiveArgs, context) {
          return context[directiveArgs.key]
        },
        getFieldName(resolve, source, directiveArgs, context, info) {
          return info.fieldName
        },
      }

      schema = makeExecutableSchema({ typeDefs, resolvers })
      addDirectiveResolveFunctionsToSchema(schema, directiveResolvers)
    })

    it('should throw an error if not present in schema', () => {
      expect.assertions(1)
      const typeDefs = /* GraphQL */ `
        type Query {
          foo: String @foo
        }
      `
      const resolvers = {
        Query: {
          foo: () => 'foo',
        },
      }
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      try {
        addDirectiveResolveFunctionsToSchema(schema, {})
      } catch (error) {
        expect(error.message).toBe(
          'Directive @foo is undefined. Please define in schema before using.',
        )
      }
    })

    it('should throw an error if resolverMap is not an object', () => {
      expect.assertions(1)
      try {
        addDirectiveResolveFunctionsToSchema(schema)
      } catch (error) {
        expect(error.message).toBe(
          'Expected resolverMap to be of type object, got undefined',
        )
      }
    })

    it('should throw an error if resolverMap is an array', () => {
      expect.assertions(1)
      try {
        addDirectiveResolveFunctionsToSchema(schema, [])
      } catch (error) {
        expect(error.message).toBe(
          'Expected resolverMap to be of type object, got Array',
        )
      }
    })

    it('should throw an error if FIELD_DEFINITION is missing', async () => {
      expect.assertions(1)
      const typeDefs = /* GraphQL */ `
        directive @foo on FIELD

        type Query {
          foo: String @foo
        }
      `
      const resolvers = {
        Query: {
          foo: () => 'foo',
        },
      }
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      try {
        addDirectiveResolveFunctionsToSchema(schema, {})
      } catch (error) {
        expect(error.message).toBe(
          'Directive @foo is not marked to be used on "FIELD_DEFINITION" location. Please add "directive @foo ON FIELD_DEFINITION" in schema.',
        )
      }
    })

    it('should throw an error if resolver is not defined', async () => {
      expect.assertions(1)
      const typeDefs = /* GraphQL */ `
        directive @foo on FIELD_DEFINITION

        type Query {
          foo: String @foo
        }
      `
      const resolvers = {
        Query: {
          foo: () => 'foo',
        },
      }
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      try {
        addDirectiveResolveFunctionsToSchema(schema, {})
      } catch (error) {
        expect(error.message).toBe(
          'Directive @foo has no resolver.Please define one using createFieldExecutionResolver().',
        )
      }
    })

    it('should not throw an error if resolver is a built-in one', async () => {
      const typeDefs = /* GraphQL */ `
        type Query {
          foo: String @deprecated
        }
      `
      const resolvers = {
        Query: {
          foo: () => 'foo',
        },
      }
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      addDirectiveResolveFunctionsToSchema(schema, {})
    })

    it('should work without directive', async () => {
      const query = /* GraphQL */ `{ foo }`
      const data = await run(schema, query)
      expect(data).toEqual({ foo: 'foo' })
    })

    it('should work with synchronous resolver', async () => {
      const query = /* GraphQL */ `{ upperCaseFoo } `
      const data = await run(schema, query)
      expect(data).toEqual({ upperCaseFoo: 'FOO' })
    })

    it('should work with asynchronous resolver', async () => {
      const query = /* GraphQL */ `{ asyncUpperCaseFoo }`
      const data = await run(schema, query)
      expect(data).toEqual({ asyncUpperCaseFoo: 'FOO' })
    })

    it('should accept directive arguments', async () => {
      const query = /* GraphQL */ `{ substrFoo }`

      const data = await run(schema, query)
      expect(data).toEqual({ substrFoo: 'oo' })
    })

    it('should be accept several directives', async () => {
      const query = /* GraphQL */ `{ substrUppercaseFoo }`
      const data = await run(schema, query)
      expect(data).toEqual({ substrUppercaseFoo: 'OO' })
    })

    it('should support source', async () => {
      const query = /* GraphQL */ `
        {
          book {
            name
            slug
          }
        }
      `

      const data = await run(schema, query)
      expect(data).toEqual({
        book: { name: 'Harry Potter', slug: '1-harry-potter' },
      })
    })

    it('should support context', async () => {
      const query = /* GraphQL */ `{ version }`
      const data = await run(schema, query, { version: '1.0' })
      expect(data).toEqual({ version: '1.0' })
    })

    it('should support info', async () => {
      const query = /* GraphQL */ `{ nameOfField }`
      const data = await run(schema, query)
      expect(data).toEqual({ nameOfField: 'nameOfField' })
    })
  })

  describe('FIELD (schema)', () => {
    let schema

    beforeEach(() => {
      const typeDefs = /* GraphQL */ `
        directive @upperCase on FIELD
        directive @substr(start: Int!, end: Int!) on FIELD
        directive @prefixWithId on FIELD
        directive @getContextKey(key: String!) on FIELD
        directive @getFieldName on FIELD

        type Query {
          foo: String
          asyncFoo: String
          book: Book
        }

        type Book {
          name: String
          slug: String
        }
      `

      const fooResolver = () => 'foo'

      const resolvers = {
        Query: {
          foo: fooResolver,
          asyncFoo: async () => fooResolver(),
          book() {
            return { id: 1, name: 'Harry Potter', slug: 'harry-potter' }
          },
        },
      }

      const directiveResolvers = {
        async upperCase(resolve) {
          const value = await resolve()
          return value.toUpperCase()
        },
        async substr(resolve, source, directiveArgs) {
          const value = await resolve()
          return value.substr(directiveArgs.start, directiveArgs.end)
        },
        async prefixWithId(resolve, source) {
          const value = await resolve()
          return `${source.id}-${value}`
        },
        getContextKey(resolve, source, directiveArgs, context) {
          return context[directiveArgs.key]
        },
        getFieldName(resolve, source, directiveArgs, context, info) {
          return info.fieldName
        },
      }

      schema = makeExecutableSchema({ typeDefs, resolvers })
      addDirectiveResolveFunctionsToSchema(schema, directiveResolvers)
    })

    it('should throw an error if resolver is not defined', async () => {
      const typeDefs = /* GraphQL */ `
        directive @foo on FIELD

        type Query {
          foo: String
        }
      `
      const resolvers = {
        Query: {
          foo: () => 'foo',
        },
      }
      const schema = makeExecutableSchema({ typeDefs, resolvers })
      const query = /* GraphQL */ `{ foo @foo } `
      addDirectiveResolveFunctionsToSchema(schema, {})
      const { errors } = await graphql(schema, query)
      expect(errors.length).toBe(1)
      expect(errors[0].message).toBe(
        'Directive @foo has no resolver.Please define one using createFieldExecutionResolver().',
      )
    })

    it('should work without directive', async () => {
      const query = /* GraphQL */ `{ foo }`
      const data = await run(schema, query)
      expect(data).toEqual({ foo: 'foo' })
    })

    it('should work with synchronous resolver', async () => {
      const query = /* GraphQL */ `{ foo @upperCase } `
      const data = await run(schema, query)
      expect(data).toEqual({ foo: 'FOO' })
    })

    it('should work with asynchronous resolver', async () => {
      const query = /* GraphQL */ `{ asyncFoo @upperCase }`
      const data = await run(schema, query)
      expect(data).toEqual({ asyncFoo: 'FOO' })
    })

    it('should accept directive arguments', async () => {
      const query = /* GraphQL */ `{ foo @substr(start: 1, end: 2) }`

      const data = await run(schema, query)
      expect(data).toEqual({ foo: 'oo' })
    })

    it('should be accept several directives', async () => {
      const query = /* GraphQL */ `{ foo @substr(start: 1, end: 2) @upperCase }`
      const data = await run(schema, query)
      expect(data).toEqual({ foo: 'OO' })
    })

    it('should support source', async () => {
      const query = /* GraphQL */ `
        {
          book {
            name
            slug @prefixWithId
          }
        }
      `

      const data = await run(schema, query)
      expect(data).toEqual({
        book: { name: 'Harry Potter', slug: '1-harry-potter' },
      })
    })

    it('should support context', async () => {
      const query = /* GraphQL */ `{ foo @getContextKey(key: "version") }`
      const data = await run(schema, query, { version: '1.0' })
      expect(data).toEqual({ foo: '1.0' })
    })

    it('should support info', async () => {
      const query = /* GraphQL */ `{ foo @getFieldName }`
      const data = await run(schema, query)
      expect(data).toEqual({ foo: 'foo' })
    })
  })
})
