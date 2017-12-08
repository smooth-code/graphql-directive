import { forEachField } from 'graphql-tools'
import { defaultFieldResolver } from 'graphql'
import { DirectiveLocation } from 'graphql/type'
import { getArgumentValues } from 'graphql/execution/values'

function getFieldResolver(field) {
  const resolver = field.resolve || defaultFieldResolver
  return resolver.bind(field)
}

function createAsyncResolver(field) {
  const originalResolver = getFieldResolver(field)
  return async (source, args, context, info) =>
    originalResolver(source, args, context, info)
}

function getDirectiveInfo(directive, resolverMap, schema, location) {
  const name = directive.name.value

  const Directive = schema.getDirective(name)
  if (typeof Directive === 'undefined') {
    throw new Error(
      `Directive @${name} is undefined. ` +
        'Please define in schema before using.',
    )
  }

  if (!Directive.locations.includes(location)) {
    throw new Error(
      `Directive @${name} is not marked to be used on "${location}" location. ` +
        `Please add "directive @${name} ON ${location}" in schema.`,
    )
  }

  const resolver = resolverMap[name]
  if (!resolver) {
    throw new Error(
      `Directive @${name} has no resolver.` +
        'Please define one using createFieldExecutionResolver().',
    )
  }

  const args = getArgumentValues(Directive, directive)
  return { args, resolver }
}

function createFieldExecutionResolver(field, resolverMap, schema) {
  const { directives } = field.astNode
  if (!directives.length) return getFieldResolver(field)
  return directives.reduce((recursiveResolver, directive) => {
    const directiveInfo = getDirectiveInfo(
      directive,
      resolverMap,
      schema,
      DirectiveLocation.FIELD_DEFINITION,
    )
    return (source, args, context, info) =>
      directiveInfo.resolver(
        () => recursiveResolver(source, args, context, info),
        source,
        directiveInfo.args,
        context,
        info,
      )
  }, createAsyncResolver(field))
}

function createFieldResolver(field, resolverMap, schema) {
  const originalResolver = getFieldResolver(field)
  const asyncResolver = createAsyncResolver(field)
  return (source, args, context, info) => {
    const { directives } = info.fieldNodes[0]
    if (!directives.length) return originalResolver(source, args, context, info)
    const fieldResolver = directives.reduce((recursiveResolver, directive) => {
      const directiveInfo = getDirectiveInfo(
        directive,
        resolverMap,
        schema,
        DirectiveLocation.FIELD,
      )
      return () =>
        directiveInfo.resolver(
          () => recursiveResolver(source, args, context, info),
          source,
          directiveInfo.args,
          context,
          info,
        )
    }, asyncResolver)

    return fieldResolver(source, args, context, info)
  }
}

function addDirectiveResolveFunctionsToSchema(schema, resolverMap) {
  if (typeof resolverMap !== 'object') {
    throw new Error(
      `Expected resolverMap to be of type object, got ${typeof resolverMap}`,
    )
  }

  if (Array.isArray(resolverMap)) {
    throw new Error('Expected resolverMap to be of type object, got Array')
  }

  forEachField(schema, field => {
    field.resolve = createFieldExecutionResolver(field, resolverMap, schema)
    field.resolve = createFieldResolver(field, resolverMap, schema)
  })
}

export default addDirectiveResolveFunctionsToSchema
