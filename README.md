# graphql-directive

[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![MIT License][license-badge]][license]

GraphQL supports several directives: `@include`, `@skip` et `@deprecated`. This module opens a new dimension by giving you the possibility to define your custom directives.

Custom directives have a lot of use-cases:

* Formatting
* Authentication
* Introspection
* ...

You can [learn more about directives in GraphQL documentation](http://graphql.org/learn/queries/#directives).

## Install

```sh
npm install graphql-directive
```

## Steps

### 1. Define a directive in schema

A directive must be defined in your schema, it can be done using the keyword `directive`:

```graphql
directive @dateFormat(format: String) on FIELD | FIELD_DEFINITION
```

This code defines a directive called `dateFormat` that accepts one argument `format` of type `String`. The directive can be used on `FIELD` (query) and `FIELD_DEFINITION` (schema).

**FIELD AND FIELD_DEFINITION are the only two directive locations supported.**

### 2. Add directive resolver

The second step consists in adding a resolver for the custom directive.

```js
import { addDirectiveResolveFunctionsToSchema } from 'graphql-directive'

// Attach a resolver map to schema
addDirectiveResolveFunctionsToSchema(schema, {
  async dateFormat(resolve, source, args) {
    const value = await resolve()
    return format(new Date(value), args.format)
  },
})
```

### 3. Use directive in query

You can now use your directive either in schema or in query.

```js
import { graphql } from 'graphql'

const QUERY = `{ publishDate @dateFormat(format: "DD-MM-YYYY") }`

const rootValue = { publishDate: '1997-06-12T00:00:00.000Z' }

graphql(schema, query, rootValue).then(response => {
  console.log(response.data) // { publishDate: '12-06-1997' }
})
```

## Usage

### addDirectiveResolveFunctionsToSchema(schema, resolverMap)

`addDirectiveResolveFunctionsToSchema` takes two arguments, a GraphQLSchema and a resolver map. It modifies the schema in place by attaching directive resolvers. Internally your resolvers are wrapped into another one.

```js
import { addDirectiveResolveFunctionsToSchema } from 'graphql-directive'

const resolverMap = {
  // Will be called when a @upperCase directive is applied to a field.
  async upperCase(resolve) {
    const value = await resolve()
    return value.toString().toUpperCase()
  },
}

// Attach directive resolvers to schema.
addDirectiveResolveFunctionsToSchema(schema, resolverMap)
```

### Directive resolver function signature

Every directive resolver accepts five positional arguments:

```
directiveName(resolve, obj, directiveArgs, context, info) { result }
```

These arguments have the following conventional names and meanings:

1. `resolve`: Resolve is a function that returns the result of the directive field. For consistency, it always returns a promise resolved with the original field resolver.
2. `obj`: The object that contains the result returned from the resolver on the parent field, or, in the case of a top-level `Query` field, the `rootValue` passed from the server configuration. This argument enables the nested nature of GraphQL queries.
3. `directiveArgs`: An object with the arguments passed into the directive in the query or schema. For example, if the directive was called with `@dateFormat(format: "DD/MM/YYYY")`, the args object would be: `{ "format": "DD/MM/YYYY" }`.
4. `context`: This is an object shared by all resolvers in a particular query, and is used to contain per-request state, including authentication information, [dataloader](https://github.com/facebook/dataloader) instances, and anything else that should be taken into account when resolving the query.
5. `info`: This argument should only be used in advanced cases, but it contains information about the execution state of the query, including the field name, path to the field from the root, and more. It’s only documented in [the GraphQL.js source code](https://github.com/graphql/graphql-js/blob/c82ff68f52722c20f10da69c9e50a030a1f218ae/src/type/definition.js#L489-L500).

## Examples of directives

### Text formatting: `@upperCase`

Text formatting is a good use case for directives. It can be helpful to directly format your text in your queries or to ensure that a field has a specific format server-side.

```js
import { buildSchema } from 'graphql'
import { addDirectiveResolveFunctionsToSchema } from 'graphql-directive'

// Schema
const schema = buildSchema(`
  directive @upperCase on FIELD_DEFINITION | FIELD
`)

// Resolver
addDirectiveResolveFunctionsToSchema(schema, {
  async dateFormat(resolve, source, args) {
    const value = await resolve()
    return format(new Date(value), args.format)
  },
})
```

[See complete example](https://github.com/smooth-code/graphql-directive/blob/master/examples/upperCase.js)

### Date formatting: `@dateFormat(format: String)`

Date formatting is a CPU expensive operation. Since all directives are resolved server-side, it speeds up your client and it is easily cachable.

```js
import { buildSchema } from 'graphql'
import { addDirectiveResolveFunctionsToSchema } from 'graphql-directive'
import format from 'date-fns/format'

// Schema
const schema = buildSchema(`
  directive @dateFormat(format: String) on FIELD_DEFINITION | FIELD
`)

// Resolver
addDirectiveResolveFunctionsToSchema(schema, {
  async dateFormat(resolve, source, args) {
    const value = await resolve()
    return format(new Date(value), args.format)
  },
})
```

[See complete example](https://github.com/smooth-code/graphql-directive/blob/master/examples/dateFormat.js)

### Authentication: `@requireAuth`

Authentication is a very good usage of `FIELD_DEFINITION` directives. By using a directive you can restrict only one specific field without modifying your resolvers.

```js
import { buildSchema } from 'graphql'
import { addDirectiveResolveFunctionsToSchema } from 'graphql-directive'

// Schema
const schema = buildSchema(`
  directive @requireAuth on FIELD_DEFINITION
`)

// Resolver
addDirectiveResolveFunctionsToSchema(schema, {
  requireAuth(resolve, directiveArgs, obj, context, info) {
    if (!context.isAuthenticated)
      throw new Error(`You must be authenticated to access "${info.fieldName}"`)
    return resolve()
  },
})
```

[See complete example](https://github.com/smooth-code/graphql-directive/blob/master/examples/requireAuth.js)

## Limitations

* `FIELD` and `FIELD_DEFINITION` are the only two supported locations
* [Apollo InMemoryCache](https://www.apollographql.com/docs/react/basics/caching.html) doesn't support custom directives yet. **Be careful: using custom directives in your queries can corrupt your cache.** [A PR is waiting to be merged to fix it](https://github.com/apollographql/apollo-client/pull/2710).

## Inspiration

* https://github.com/apollographql/graphql-tools/pull/518
* [graphql-custom-directive](https://github.com/lirown/graphql-custom-directive)

## License

MIT

[build-badge]: https://img.shields.io/travis/smooth-code/graphql-directive.svg?style=flat-square
[build]: https://travis-ci.org/smooth-code/graphql-directive
[coverage-badge]: https://img.shields.io/codecov/c/github/smooth-code/graphql-directive.svg?style=flat-square
[coverage]: https://codecov.io/github/smooth-code/graphql-directive
[version-badge]: https://img.shields.io/npm/v/graphql-directive.svg?style=flat-square
[package]: https://www.npmjs.com/package/graphql-directive
[license-badge]: https://img.shields.io/npm/l/graphql-directive.svg?style=flat-square
[license]: https://github.com/smooth-code/graphql-directive/blob/master/LICENSE
