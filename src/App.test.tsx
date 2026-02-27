import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App shell routing', () => {
  it('renders home and bottom navigation', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '🗺️Map' })).toBeInTheDocument()
  })

  it('navigates to map and encounter fallback', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: '🗺️Map' }))
    expect(screen.getByText('Tap a node to inspect risk and rewards.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '⚔️Encounter' }))
    expect(screen.getByText('Select an available fight node from the map first.')).toBeInTheDocument()
  })
})
