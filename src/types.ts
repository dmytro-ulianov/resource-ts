export type Tag = 'initial' | 'pending' | 'failed' | 'succeded'

export type Initial = {_tag: 'initial'}
export type Pending = {_tag: 'pending'}
export type Failed<E> = {_tag: 'failed'; error: E}
export type Succeded<D> = {_tag: 'succeded'; value: D}

export type Resource<D, E = any> = Initial | Pending | Failed<E> | Succeded<D>
export type AnyResource = Resource<any, any>
