/** Acumula condiciones WHERE opcionales con parámetros posicionales ($1, $2, ...) sin concatenar datos del usuario. */
export class SqlConditions {
  private readonly clauses: string[] = []
  readonly params: unknown[] = []

  /** `buildClause` recibe el marcador ($n) asignado al valor y devuelve la condición SQL. */
  add(buildClause: (placeholder: string) => string, value: unknown): this {
    this.params.push(value)
    this.clauses.push(buildClause(`$${this.params.length}`))
    return this
  }

  addIfPresent(buildClause: (placeholder: string) => string, value: unknown): this {
    return value === undefined ? this : this.add(buildClause, value)
  }

  toWhere(): string {
    return this.clauses.length ? `where ${this.clauses.join(' and ')}` : ''
  }
}
