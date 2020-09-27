declare const DEBUG :boolean
declare const VERSION :string

// Mutable yields a derivative of T with readonly attributes erased
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
}
