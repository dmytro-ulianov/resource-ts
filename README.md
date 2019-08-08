# @featherweight/resource-ts

Resource is an ADT, that is hardly inspired by Remote Data [described here](https://medium.com/@gcanti/slaying-a-ui-antipattern-with-flow-5eed0cfb627b).

## Install

`npm install --save @featherweight/resource-ts fp-ts`

Don't forget to install `fp-ts`, as it is a peer dependency!

## Basics

So what is a Resource after all? Resource is basically a union of few types: `Initial`, `Pending`, `Failed` and `Succeded`.
While `Failed` and `Succeded` holds some values (error and value respectively), `Initial` and `Pending` are just constans.

```ts
import {initial, pending, failed, succeded} from '@featherweight/resource-ts'

// let imagine you are fetching articles from the server

// 1. initial means, that nothing happened yet
let articles = initial

// 2. then your want to indicate that data is loading
articles = pending

fetchArticles()
  // and depending on what you received you set the final state
  .then(value => {
    articles = succeded(value)
  })
  .catch(error => {
    articles = failed(error)
  })
```

Resource has 2 type parametrs `Resource<D, E>`, where `D` is data, and `E` is error. If you skip `E` it will fallback to `any`.

```ts
let articles: Resource<Articles[]>
// the same is Resource<Articles[], any>
articles = initial
articles = pending
articles = failed(new Error('Oops'))
articles = succeded([{id: '0451', title: '1984'}])
```

So now we know how to wrap our data into Resource. Next step is unwrapping it.

```ts
import {fold} from '@featherweight/resource-ts'
let articles: Resource<Articles[], Error> = await getArticles()
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
  const [article, setArticle] = useState<ArticleR>(resource.initial)

  useEffect(() => {
    fetchData()
    async function fetchData() {
      setArticle(resource.pending)
      try {
        const article = await fetchArticle({id: props.id})
        setArticle(resource.succeded(article))
      } catch (error) {
        setArticle(resource.failed(error))
      }
    }
  }, [props.id])

  return (
    <div>
      <h2>Article {props.id}</h2>
      <p>
        {resource.fold(
          article,
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
```

### `pending: Resource<any, any>`

```ts
import {pending} from '@featherweight/resource-ts'

const article: Resource<Article> = pending
```

### `failed: (e: E) => Resource<any, E>`

```ts
import {failed} from '@featherweight/resource-ts'

const article: Resource<Article> = failed(new Error('ouch'))
```

### `succeded: (d: D) => Resource<D, any>`

```ts
import {succeded} from '@featherweight/resource-ts'

const article: Resource<Article> = succeded([{id: '42', title: 'Hey'}])
```

### `of: (d: D) => Resource<D, any>`

```ts
import {of} from '@featherweight/resource-ts'

const article: Resource<Article> = of({id: '0451', title: '1984'})
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

Maps over succeded value and skips if resource is not succeded.

```ts
import {map, succeded, failed} from '@featherweight/resource-ts'

const double = map((n: number) => n * 2)
double(succeded(10)) // succeded(20)
double(failed('ouch')) // failed('ouch')
```

### `mapError: (f: (e: E) => E1) => (r: Resource<D, E>) => Resource<D, E1>`

Maps over error value and skips if resource is not failed.

```ts
import {mapError, succeded, failed} from '@featherweight/resource-ts'

const toUpperCaseE = mapError((s: string) => s.toUpperCase())
toUpperCaseE(succeded(10)) // succeded(10)
toUpperCaseE(failed('ouch')) // failed('OUCH')
```

### `alt: (r1: () => Resource<D, E>) => (r: Resource<D, E>) => Resource<D, E>`

Substitutes resource if it's not succeded.

```ts
import {alt, succeded, failed} from '@featherweight/resource-ts'

const alt10 = alt(() => succeded(10))
alt10(succeded(42)) // succeded(42)
alt10(failed('ouch')) // succeded(10)
```

### `bimap: (fd: (d: D) => R, fe: (e: E) => E1) => (r: Resource<D, E>) => Resource<R, E1>`

Maps both over value and error.

```ts
import {alt, succeded, failed} from '@featherweight/resource-ts'

const f = bimap((n: number) => n * 2, (s: string) => s.toUpperCase())
f(succeded(10)) // succeded(20)
f(failed('ouch')) // failed('OUCH')
```
