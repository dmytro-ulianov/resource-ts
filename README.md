# @featherweight/resource-ts

Resource is an ADT, that is hardly inspired by Remote Data [described here](https://medium.com/@gcanti/slaying-a-ui-antipattern-with-flow-5eed0cfb627b).

## Install

`npm install --save @featherweight/resource-ts fp-ts`

Don't forget to install `fp-ts`, as it is a peer dependency!

## Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Basics](#basics)
- [API](#api)
  - [`initial: Resource<any, any>`](#initial-resourceany-any)
  - [`pending: Resource<any, any>`](#pending-resourceany-any)
  - [`failed: (e: E) => Resource<any, E>`](#failed-e-e--resourceany-e)
  - [`succeded: (d: D) => Resource<D, any>`](#succeded-d-d--resourced-any)
  - [`of: (d: D) => Resource<D, any>`](#of-d-d--resourced-any)
  - [`is`](#is)
  - [`is.initial: (r: Resource<any, any>) => r is Initial`](#isinitial-r-resourceany-any--r-is-initial)
  - [`is.pending: (r: Resource<any, any>) => r is Pending`](#ispending-r-resourceany-any--r-is-pending)
  - [`is.failed: (r: Resource<any, any>) => r is Failed`](#isfailed-r-resourceany-any--r-is-failed)
  - [`is.succeded: (r: Resource<any, any>) => r is Succeded`](#issucceded-r-resourceany-any--r-is-succeded)
  - [`map: (f: (d: D) => R) => (r: Resource<D, E>) => Resource<R, E>`](#map-f-d-d--r--r-resourced-e--resourcer-e)
  - [`mapError: (f: (e: E) => E1) => (r: Resource<D, E>) => Resource<D, E1>`](#maperror-f-e-e--e1--r-resourced-e--resourced-e1)
  - [`alt: (r1: () => Resource<D, E>) => (r: Resource<D, E>) => Resource<D, E>`](#alt-r1---resourced-e--r-resourced-e--resourced-e)
  - [`bimap: (fd: (d: D) => R, fe: (e: E) => E1) => (r: Resource<D, E>) => Resource<R, E1>`](#bimap-fd-d-d--r-fe-e-e--e1--r-resourced-e--resourcer-e1)
  - [`chain: (f: (d: D) => Resource<R, E>) => ( r: Resource<D, E>,): Resource<R, E>`](#chain-f-d-d--resourcer-e---r-resourced-e-resourcer-e)
  - [`fold: ( onInitial: () => R, onPending: () => R, onFailed: (e: E) => R, onSucceded: (d: D) => R,) => (r: Resource<D, E>) => R`](#fold--oninitial---r-onpending---r-onfailed-e-e--r-onsucceded-d-d--r--r-resourced-e--r)
  - [`cata: ( fs: { initial?: () => R, pending?: () => R, failed?: (e: E) => R, succeded?: (v: D) => R } = {}) => (r: Resource<D, E>) => R | undefined`](#cata--fs--initial---r-pending---r-failed-e-e--r-succeded-v-d--r-----r-resourced-e--r--undefined)
- [Usage with fp-ts](#usage-with-fp-ts)
- [Working with multiple resources](#working-with-multiple-resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Basics

Resource is just a sum type of: `Initial`, `Pending`, `Failed` and `Succeded`.
While `Failed` and `Succeded` holds some data (`error` and `value` respectively), `Initial` and `Pending` are just constants.

```ts
import {initial, pending, failed, succeded} from '@featherweight/resource-ts'

// lets imagine you're fetching articles from the api

// 1. initial means that there is nothing happened yet
let articles = initial

// 2. when you start fetching your data you want to indicate that it's pending
articles = pending

fetchArticles()
  // 3. you set the final state depending on result
  .then(value => {
    articles = succeded(value)
  })
  .catch(error => {
    articles = failed(error)
  })
```

Resource has 2 type parameters `Resource<D, E>`, where `D` is data, and `E` is error. If you skip `E` it will fallback to `any`.

```ts
let articles: Resource<Book[]>
// the same is Resource<Book[], any>
articles = initial
articles = pending
articles = failed(new Error('Oops'))
articles = succeded([{id: '0451', title: '1984'}])
```

So now we know how to wrap our data into resource. Next step is unwrapping it.

```ts
import {fold} from '@featherweight/resource-ts'

const articles: Resource<Articles[], Error> = await getArticles()

const renderArticles = fold(
  () => `initial state`,
  () => `pending state`,
  error => error.message,
  articles => articles.map(a => a.title).join(', '),
)

renderArticles(articles)
```

Now let's glue it all together in React example

```tsx
import React, {useEffect, useState} from 'react'
import {resource, Resource} from '@featherweight/resource-ts'
import {fetchArticle, Article} from 'api'

type ArticleR = Resource<Article, Error>

export const Article: React.FC<{id: string}> = props => {
  const [state, setState] = useState<ArticleR>(resource.initial)

  useEffect(() => {
    fetchData()
    async function fetchData() {
      setState(resource.pending)
      try {
        const article = await fetchArticle({id: props.id})
        setState(resource.succeded(article))
      } catch (error) {
        setState(resource.failed(error))
      }
    }
  }, [props.id])

  return (
    <div>
      <h2>Article {props.id}</h2>
      <p>
        {resource.fold(
          state,
          () => null,
          () => 'fetching article',
          e => e.message,
          a => a.title,
        )}
      </p>
    </div>
  )
}
```

## API

### `initial: Resource<any, any>`

```ts
import {initial} from '@featherweight/resource-ts'

const article: Resource<Article> = initial
// {_tag: 'initial'}
```

### `pending: Resource<any, any>`

```ts
import {pending} from '@featherweight/resource-ts'

const article: Resource<Article> = pending
// {_tag: 'pending'}
```

### `failed: (e: E) => Resource<any, E>`

```ts
import {failed} from '@featherweight/resource-ts'

const article: Resource<Article> = failed(new Error('ouch'))
// {_tag: 'failed', error: new Error('ouch')}
```

### `succeded: (d: D) => Resource<D, any>`

```ts
import {succeded} from '@featherweight/resource-ts'

const article: Resource<Article> = succeded({id: '42', title: 'Hey'})
// {_tag: 'succeded', value: {id: '42', title: 'Hey'}}
```

### `of: (d: D) => Resource<D, any>`

```ts
import {of} from '@featherweight/resource-ts'

const article: Resource<Article> = of({id: '0451', title: '1984'})
// {_tag: 'succeded', value: {id: '0451', title: '1984'}}
```

### `is`

`is` contains type guards for each resource type

### `is.initial: (r: Resource<any, any>) => r is Initial`

### `is.pending: (r: Resource<any, any>) => r is Pending`

### `is.failed: (r: Resource<any, any>) => r is Failed`

### `is.succeded: (r: Resource<any, any>) => r is Succeded`

```ts
import {is, succeded} from '@featherweight/resource-ts'

const article: Resource<Article, Error> = of({id: '0451', title: '1984'})

is.initial(article) // false
is.pending(article) // false
is.failed(article) // false
is.succeded(article) // true
```

### `map: (f: (d: D) => R) => (r: Resource<D, E>) => Resource<R, E>`

```ts
import {
  map,
  failed,
  initial,
  pending,
  succeded,
} from '@featherweight/resource-ts'

const double = map((n: number) => n * 2)

double(failed('ouch')) // failed('ouch')
double(initial) // initial
double(pending) // pending
double(succeded(10)) // succeded(20)
```

### `mapError: (f: (e: E) => E1) => (r: Resource<D, E>) => Resource<D, E1>`

```ts
import {
  mapError,
  failed,
  initial,
  pending,
  succeded,
} from '@featherweight/resource-ts'

const toUpperCaseE = mapError((s: string) => s.toUpperCase())

toUpperCaseE(failed('ouch')) // failed('OUCH')
toUpperCaseE(initial) // initial
toUpperCaseE(pending) // pending
toUpperCaseE(succeded(10)) // succeded(10)
```

### `alt: (r1: () => Resource<D, E>) => (r: Resource<D, E>) => Resource<D, E>`

```ts
import {
  alt,
  failed,
  initial,
  pending,
  succeded,
} from '@featherweight/resource-ts'

const alt10 = alt(() => succeded(10))

alt10(failed('ouch')) // succeded(10)
alt10(initial) // succeded(10)
alt10(pending) // succeded(10)
alt10(succeded(42)) // succeded(42)
```

### `bimap: (fd: (d: D) => R, fe: (e: E) => E1) => (r: Resource<D, E>) => Resource<R, E1>`

```ts
import {
  alt,
  failed,
  initial,
  pending,
  succeded,
} from '@featherweight/resource-ts'

const f = bimap((n: number) => n * 2, (s: string) => s.toUpperCase())

f(failed('ouch')) // failed('OUCH')
f(initial) // initial
f(pending) // pending
f(succeded(10)) // succeded(20)
```

### `chain: (f: (d: D) => Resource<R, E>) => ( r: Resource<D, E>,): Resource<R, E>`

```ts
import {
  chain,
  of,
  failed,
  initial,
  pending,
  succeded,
} from '@featherweight/resource-ts'

const doubleR = chain((n: number) => of({value: n, doubled: n * 2}))

doubleR(succeded(10)) // succeded({value: 10, doubled: 20})
doubleR(initial) // initial
doubleR(pending) // pending
doubleR(failed('ouch')) // failed('ouch')
```

### `fold: ( onInitial: () => R, onPending: () => R, onFailed: (e: E) => R, onSucceded: (d: D) => R,) => (r: Resource<D, E>) => R`

```ts
import {
  fold,
  failed,
  initial,
  pending,
  succeded,
} from '@featherweight/resource-ts'

const handle = fold(
  () => 'nothing there yet',
  () => 'in progress',
  (e: Error) => `error: ${e.message}`,
  (n: number) => `result: ${n}`,
)

handle(failed(new Error('nope'))) // error: nope
handle(initial) // nothing there yet
handle(pending) // in progress
handle(succeded(42)) // resule: 42
```

### `cata: ( fs: { initial?: () => R, pending?: () => R, failed?: (e: E) => R, succeded?: (v: D) => R } = {}) => (r: Resource<D, E>) => R | undefined`

```ts
import {
  cata,
  failed,
  initial,
  pending,
  succeded,
} from '@featherweight/resource-ts'

const handle = cata({
  failed: (e: Error) => `error: ${e.message}`,
  pending: () => 'in progress',
  succeded: (n: number) => `result: ${n}`,
})

handle(failed(new Error('nope'))) // error: nope
handle(initial) // undefined
handle(pending) // in progress
handle(succeded(42)) // resule: 42
```

## Usage with fp-ts

Curried functions work well with `fp-ts` pipe.

```ts
import {pipe} from 'fp-ts/lib/pipeable'
import * as r from '@featherweight/resource-ts'

const user = r.of({name: 'Tom', age: 30})

const display = pipe(
  user,
  // fallback to unknown user
  r.alt(() => r.of(({name: 'Unknown user', age: 0})))
  // prepare a display name
  r.map(user => `${user.name}, age of ${user.age}`),
)
// Tom, age of 30
```

## Working with multiple resources

You can use concat methods to connect multiple resources.
Be aware that the preference of resources are: `failed > pending > initial > succeded`

```ts
import * as r from '@featherweight/resource-ts'

const user = r.of({name: 'John', id: '42'})
let friends = r.pending

r.concat(user, friends)
// pending

friends = r.of([{name: 'Tom', id: '5'}])

r.concat(user, friends)
// succeded([{name: 'John', id: '42'}, [{name: 'Tom', id: '5'}]])

const movie = r.failed(new Error('movie not found'))

r.concat3(user, friends, movie)
// failed('movie not found')
```
