export interface Named {
  readonly name :string
}

export class Foo implements Named {
  readonly name :string
}

export class Bar extends Foo {
  readonly id :number
  getName() :string {
    return this.name
  }
}
