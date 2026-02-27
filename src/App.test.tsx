import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders combat debug harness controls', () => {
    render(<App />)

    expect(screen.getByText('Combat Test Debug Harness')).toBeInTheDocument()
    expect(screen.getByLabelText('Archetype')).toBeInTheDocument()
    expect(screen.getByLabelText('Enemy Group')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument()
  })

  it('runs a fight and prints a battle summary', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Fight' }))

    expect(screen.getByText(/winner:/i)).toBeInTheDocument()
    expect(screen.getByText(/events:/i)).toBeInTheDocument()
  })
})
