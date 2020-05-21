export function A(text :string, repetitions :number) :string[] {
  let unused_variable_warning_expected = 4
  const a = new Array(repetitions)
  for (let i = 0; i < repetitions; i++) {
    a[i] = text
  }
  return a
}

export const B = "Hello"
