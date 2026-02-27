import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('App shell routing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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
    expect(screen.getByText('Select a node from the map to begin.')).toBeInTheDocument()
  })



  it('renders progression screen and applies life-stat slider changes', () => {
    render(
      <MemoryRouter initialEntries={['/progression']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Progression' })).toBeInTheDocument()
    const focus = screen.getByLabelText('Focus') as HTMLInputElement
    fireEvent.change(focus, { target: { value: '100' } })

    fireEvent.click(screen.getByRole('link', { name: '🏠Home' }))
    expect(screen.getByText(/Crit:\s*[0-9]+\.[0-9]%/)).toBeInTheDocument()
  })

  it('supports Dev Mode node forcing and map regeneration controls', () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'DEV' }))
    expect(screen.getByText('Dev Mode: bypass traversal and trigger node interactions directly.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'node_4' }))
    expect(screen.getByRole('heading', { name: 'Chest' })).toBeInTheDocument()
    expect(screen.getByText('Salvage Cache')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Chest' }))
    expect(screen.getByText('Chest Opened')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '🗺️Map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate local map nodes' }))
    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument()
  })
})
