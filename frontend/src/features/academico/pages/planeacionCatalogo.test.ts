import { describe, it, expect } from 'vitest'
import { normalizarFuente } from './planeacionCatalogo'

describe('normalizarFuente', () => {
  it('conserva el tipo cuando la fuente ya viene en el esquema tipado actual', () => {
    // Regresión: un `{ ...f }` al final del objeto sobreescribía silenciosamente el
    // `tipo` ya normalizado con el `tipo` crudo de `f` (string suelto, no acotado al
    // union type) — el orden del spread importa.
    const resultado = normalizarFuente({ tipo: 'articulo', titulo: 'Clean Code', autor: 'Robert C. Martin' })
    expect(resultado.tipo).toBe('articulo')
    expect(resultado.titulo).toBe('Clean Code')
    expect(resultado.autor).toBe('Robert C. Martin')
  })

  it('migra el tipo legacy "Impresa" a "impreso"', () => {
    const resultado = normalizarFuente({ fuente: 'Introducción a los algoritmos', tipo: 'Impresa' })
    expect(resultado.tipo).toBe('impreso')
    expect(resultado.titulo).toBe('Introducción a los algoritmos')
  })

  it('migra el tipo legacy "Electrónica" a "sitio_web"', () => {
    const resultado = normalizarFuente({ fuente: 'MDN Web Docs', tipo: 'Electrónica' })
    expect(resultado.tipo).toBe('sitio_web')
  })

  it('usa tipo vacío cuando no hay tipo legacy reconocible ni titulo', () => {
    const resultado = normalizarFuente({ fuente: 'Fuente sin tipo' })
    expect(resultado.tipo).toBe('')
  })
})
