/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

'use strict'

const { readdirSync } = require('fs')
const { join } = require('path')
const dedent = require('dedent')

const codeExamples = readdirSync(join(__dirname, '..', '..', 'docs', 'examples'))
  .map(file => file.slice(0, -9))
  .filter(api => api !== 'index')

function generateDocs (common, spec) {
  let doc = dedent`
  [[api-reference]]

  ////////



  ===========================================================================================================================
  ||                                                                                                                       ||
  ||                                                                                                                       ||
  ||                                                                                                                       ||
  ||        ██████╗ ███████╗ █████╗ ██████╗ ███╗   ███╗███████╗                                                            ||
  ||        ██╔══██╗██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝                                                            ||
  ||        ██████╔╝█████╗  ███████║██║  ██║██╔████╔██║█████╗                                                              ||
  ||        ██╔══██╗██╔══╝  ██╔══██║██║  ██║██║╚██╔╝██║██╔══╝                                                              ||
  ||        ██║  ██║███████╗██║  ██║██████╔╝██║ ╚═╝ ██║███████╗                                                            ||
  ||        ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝     ╚═╝╚══════╝                                                            ||
  ||                                                                                                                       ||
  ||                                                                                                                       ||
  ||    This file is autogenerated, DO NOT send pull requests that changes this file directly.                             ||
  ||    You should update the script that does the generation, which can be found in '/scripts/utils/generateDocs.js'.     ||
  ||                                                                                                                       ||
  ||    You can run the script with the following command:                                                                 ||
  ||       node scripts/generate --branch <branch_name>                                                                    ||
  ||    or                                                                                                                 ||
  ||       node scripts/generate --tag <tag_name>                                                                          ||
  ||                                                                                                                       ||
  ||                                                                                                                       ||
  ||                                                                                                                       ||
  ===========================================================================================================================



  ////////

  == API Reference

  This document contains the entire list of the Elasticsearch API supported by the client, both OSS and commercial. The client is entirely licensed under Apache 2.0.

  Elasticsearch exposes an HTTP layer to communicate with, and the client is a library that will help you do this. Because of this reason, you will see HTTP related parameters, such as ${'`'}body${'`'} or ${'`'}headers${'`'}.

  Every API can accept two objects, the first contains all the parameters that will be sent to Elasticsearch, while the second includes the request specific parameters, such as timeouts, headers, and so on.
  In the first object, every parameter but the body will be sent via querystring or url parameter, depending on the API, and every unrecognized parameter will be sent as querystring.

  [source,js]
  ----
  // promise API
  const result = await client.search({
    index: 'my-index',
    from: 20,
    size: 10,
    body: { foo: 'bar' }
  }, {
    ignore: [404],
    maxRetries: 3
  })

  // callback API
  client.search({
    index: 'my-index',
    from: 20,
    size: 10,
    body: { foo: 'bar' }
  }, {
    ignore: [404],
    maxRetries: 3
  }, (err, result) => {
    if (err) console.log(err)
  })
  ----

  In this document, you will find the reference of every parameter accepted by the querystring or the url. If you also need to send the body, you can find the documentation of its format in the reference link that is present along with every endpoint.

  \n\n`
  doc += commonParameters(common)
  spec.forEach(s => {
    doc += '\n' + generateApiDoc(s)
  })
  return doc
}

function commonParameters (spec) {
  let doc = dedent`
  [discrete]
  === Common parameters
  Parameters that are accepted by all API endpoints.

  link:{ref}/common-options.html[Documentation]
  [cols=2*]
  |===\n`
  Object.keys(spec.params).forEach(key => {
    const name = isSnakeCased(key) && key !== camelify(key)
      ? '`' + key + '` or `' + camelify(key) + '`'
      : '`' + key + '`'

    doc += dedent`
    |${name}
    |${'`' + spec.params[key].type + '`'} - ${spec.params[key].description}`
    if (spec.params[key].default) {
      doc += ` +
    _Default:_ ${'`' + spec.params[key].default + '`'}`
    }
    doc += '\n\n'
  })

  doc += dedent`
  |===
  `
  return doc
}

function generateApiDoc (spec) {
  const name = Object.keys(spec)[0]
  const documentationUrl = spec[name].documentation && spec[name].documentation.url
    ? fixLink(name, spec[name].documentation.url)
    : ''
  const params = []
  // url params
  const urlParts = spec[name].url.paths.reduce((acc, path) => {
    if (!path.parts) return acc
    for (const part in path.parts) {
      if (acc[part] != null) continue
      acc[part] = path.parts[part]
    }
    return acc
  }, {})
  if (urlParts) {
    Object.keys(urlParts).forEach(param => {
      params.push({
        name: param,
        type: getType(urlParts[param].type, urlParts[param].options),
        description: urlParts[param].description,
        default: urlParts[param].default,
        deprecated: !!urlParts[param].deprecated
      })
    })
  }

  // query params
  const urlParams = spec[name].params
  if (urlParams) {
    Object.keys(urlParams).forEach(param => {
      const duplicate = params.find(ele => ele.name === param)
      if (duplicate) return
      params.push({
        name: param,
        type: getType(urlParams[param].type, urlParams[param].options),
        description: urlParams[param].description,
        default: urlParams[param].default,
        deprecated: !!urlParams[param].deprecated
      })
    })
  }

  // body params
  const body = spec[name].body
  if (body) {
    params.push({
      name: 'body',
      type: 'object',
      description: body.description,
      default: body.default,
      deprecated: !!body.deprecated
    })
  }

  const codeParameters = params
    .reduce((acc, val) => {
      const code = `${val.name}: ${val.type},`
      acc += acc === ''
        ? code
        : '\n    ' + code

      return acc
    }, '')
    // remove last comma
    .slice(0, -1)

  const stability = spec[name].stability === 'stable'
    ? ''
    : `*Stability:* ${spec[name].stability}`

  let doc = dedent`
  [discrete]
  === ${camelify(name)}
  ${stability}
  [source,ts]
  ----
  client.${camelify(name)}(${codeParameters.length > 0 ? `{\n    ${codeParameters}\n}` : ''})
  ----\n`
  if (documentationUrl) {
    doc += `link:${documentationUrl}[Documentation] +\n`
  }
  if (codeExamples.includes(name)) {
    doc += `{jsclient}/${name.replace(/\./g, '_')}_examples.html[Code Example] +\n`
  }

  if (params.length !== 0) {
    doc += dedent`[cols=2*]
    |===\n`
    doc += params.reduce((acc, val) => {
      const name = isSnakeCased(val.name) && val.name !== camelify(val.name)
        ? '`' + val.name + '` or `' + camelify(val.name) + '`'
        : '`' + val.name + '`'
      acc += dedent`
      |${name}
      |${'`' + val.type.replace(/\|/g, '\\|') + '`'} - ${val.description}`
      if (val.default) {
        acc += ` +\n_Default:_ ${'`' + val.default + '`'}`
      }
      if (val.deprecated) {
        acc += ' +\n\nWARNING: This parameter has been deprecated.'
      }
      return acc + '\n\n'
    }, '')

    doc += dedent`
    |===
    `
  }
  doc += '\n'
  return doc
}

const LINK_OVERRIDES = {
  'ingest.delete_pipeline': '{ref}/delete-pipeline-api.html',
  'ingest.get_pipeline': '{ref}/get-pipeline-api.html',
  'ingest.put_pipeline': '{ref}/put-pipeline-api.html',
  'ingest.simulate': '{ref}/simulate-pipeline-api.html',
  'ingest.processor_grok': '{ref}/grok-processor.html#grok-processor-rest-get'
}
// Fixes bad urls in the JSON spec
function fixLink (name, str) {
  const override = LINK_OVERRIDES[name]
  if (override) return override
  if (!str) return ''
  /* Replace references to the guide with the attribute {ref} because
   * the json files in the Elasticsearch repo are a bit of a mess. */
  str = str.replace(/^.+guide\/en\/elasticsearch\/reference\/[^/]+\/([^./]*\.html(?:#.+)?)$/, '{ref}/$1')
  str = str.replace(/frozen\.html/, 'freeze-index-api.html')
  str = str.replace(/ml-file-structure\.html/, 'ml-find-file-structure.html')
  str = str.replace(/security-api-get-user-privileges\.html/, 'security-api-get-privileges.html')

  return str
}

function getType (type, options) {
  switch (type) {
    case 'list':
      return 'string | string[]'
    case 'date':
    case 'time':
    case 'timeout':
      return 'string'
    case 'enum':
      return options.map(k => `'${k}'`).join(' | ')
    case 'int':
    case 'double':
    case 'long':
      return 'number'
    default:
      return type
  }
}

function camelify (str) {
  return str[0] === '_'
    ? '_' + str.slice(1).replace(/_([a-z])/g, k => k[1].toUpperCase())
    : str.replace(/_([a-z])/g, k => k[1].toUpperCase())
}

function isSnakeCased (str) {
  return !!~str.indexOf('_')
}

module.exports = generateDocs
