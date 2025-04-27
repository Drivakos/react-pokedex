import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const GRAPHQL_ENDPOINT =
  import.meta.env.VITE_API_GRAPHQL_URL || 'https://beta.pokeapi.co/graphql/v1beta'
const FALLBACK_SPRITE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

const gqlRequest = async (q: string, v: Record<string, any> = {}) => {
  const r = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables: v })
  })
  if (!r.ok) throw new Error(`GraphQL HTTP ${r.status}`)
  const { data, errors } = await r.json()
  if (errors?.length) throw new Error(errors[0].message)
  return data
}

const buildPokemon = (row: any) => {
  const types =
    row.pokemon_v2_pokemontypes?.map((t: any) => ({
      type: { name: t.pokemon_v2_type?.name ?? 'unknown' }
    })) ?? [{ type: { name: 'unknown' } }]

  let sprites = {
    other: { 'official-artwork': { front_default: `${FALLBACK_SPRITE_URL}/${row.id}.png` } }
  }

  try {
    const raw = row.pokemon_v2_pokemonsprites?.[0]?.sprites
    if (raw) {
      const parsed = JSON.parse(raw)
      const art = parsed.other?.['official-artwork']?.front_default
      if (art) sprites = parsed
    }
  } catch {}

  return {
    id: row.id,
    name: row.name,
    height: row.height ?? 0,
    weight: row.weight ?? 0,
    types,
    sprites
  }
}

export const useTeams = () => {
  const { user } = useAuth()

  const [state, set] = useState({
    teams: [] as any[],
    favorites: [] as any[],
    teamPokemon: {} as Record<number, Record<number, any>>, // positions 1-6
    isLoading: true,
    error: null as string | null
  })

  const cache = useRef<Record<number, any>>({})
  const pending = useRef<Set<number>>(new Set())

  const fetchPokemonById = useCallback(async (id: number) => {
    if (cache.current[id]) return cache.current[id]
    if (pending.current.has(id))
      return new Promise(res => {
        const t = setInterval(() => {
          if (cache.current[id]) {
            clearInterval(t)
            res(cache.current[id])
          }
        }, 100)
      })
    pending.current.add(id)
    try {
      const { pokemon_v2_pokemon_by_pk } = await gqlRequest(
        `query ($id:Int!){
          pokemon_v2_pokemon_by_pk(id:$id){
            id name height weight
            pokemon_v2_pokemontypes{pokemon_v2_type{name}}
            pokemon_v2_pokemonsprites{sprites}
          }
        }`,
        { id }
      )
      const poke = pokemon_v2_pokemon_by_pk
        ? buildPokemon(pokemon_v2_pokemon_by_pk)
        : buildPokemon({ id, name: `pokemon-${id}` })
      cache.current[id] = poke
      return poke
    } finally {
      pending.current.delete(id)
    }
  }, [])

  const fetchBatch = useCallback(async (ids: number[]) => {
    const need = [...new Set(ids.filter(i => !cache.current[i]))]
    const BATCH = 50
    for (let o = 0; o < need.length; o += BATCH) {
      const slice = need.slice(o, o + BATCH)
      const { pokemon_v2_pokemon } = await gqlRequest(
        `query ($ids:[Int!]){
          pokemon_v2_pokemon(where:{id:{_in:$ids}}){
            id name height weight
            pokemon_v2_pokemontypes{pokemon_v2_type{name}}
            pokemon_v2_pokemonsprites{sprites}
          }
        }`,
        { ids: slice }
      )
      pokemon_v2_pokemon?.forEach((p: any) => (cache.current[p.id] = buildPokemon(p)))
      slice.forEach(id => {
        if (!cache.current[id]) cache.current[id] = buildPokemon({ id, name: `pokemon-${id}` })
      })
    }
  }, [])

  const safeSelect = async <T,>(table: string, cols: string): Promise<T[]> => {
    const { data, error, status } = await supabase.from(table).select(cols)
    if (error && status === 404) return []
    if (error && error.code === 'PGRST301') return []
    if (error) throw error
    return data as T[]
  }

  const loadTeams = useCallback(async () => {
    try {
      set(s => ({ ...s, isLoading: true, error: null }))
      const teams = await safeSelect<any>('teams', 'id,name,description')
      const favorites = await safeSelect<any>('favorites', 'id,pokemon_id')
      const members = await safeSelect<any>('team_members', 'team_id,position,pokemon_id')

      const ids = [...new Set(members.map(m => m.pokemon_id))]
      if (ids.length) await fetchBatch(ids)

      const teamMap: Record<number, Record<number, any>> = {}
      members.forEach(m => {
        const pos = m.position
        if (pos < 1 || pos > 6) return
        if (!teamMap[m.team_id]) teamMap[m.team_id] = {}
        teamMap[m.team_id][pos] = cache.current[m.pokemon_id]
      })

      set(s => ({ ...s, teams, favorites, teamPokemon: teamMap, isLoading: false }))
    } catch (e: any) {
      set(s => ({ ...s, isLoading: false, error: e.message || 'load error' }))
      toast.error('Failed to load data')
    }
  }, [fetchBatch])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  const localUpdate = (fn: (d: any) => any) =>
    set(s => ({ ...s, teamPokemon: fn(s.teamPokemon) }))

  const addPokemonToTeam = useCallback(
    async (teamId: number, pokemonId: number, pos: number) => {
      if (pos < 1 || pos > 6) {
        toast.error('Position must be 1-6')
        return false
      }
      if (!pokemonId) {
        toast.error('Invalid Pokémon ID')
        return false
      }
  
      const { error } = await supabase
        .from('team_members')
        .upsert(
          [{ team_id: teamId, position: pos, pokemon_id: pokemonId }],
          { onConflict: 'team_id,position', returning: 'minimal' }
        )
  
      if (error) {
        toast.error(error.message)
        return false
      }
  
      const pokemon = await fetchPokemonById(pokemonId)
      if (pokemon)
        localUpdate(tp => ({
          ...tp,
          [teamId]: { ...(tp[teamId] || {}), [pos]: pokemon }
        }))
  
      return true
    },
    [fetchPokemonById]
  )

  const removeFromTeam = useCallback(
    async (teamId: number, pos: number) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('position', pos)

      if (error) {
        toast.error(error.message)
        return false
      }

      localUpdate(tp => {
        const copy = { ...(tp[teamId] || {}) }
        delete copy[pos]
        return { ...tp, [teamId]: copy }
      })
      return true
    },
    []
  )

  const loadFavorites = useCallback(async () => {
    if (!state.favorites.length) return []
    await fetchBatch(state.favorites.map(f => f.pokemon_id))
    return state.favorites.map(f => cache.current[f.pokemon_id]).filter(Boolean)
  }, [state.favorites, fetchBatch])

  const addToFavorites = useCallback(
    async (p: any) => {
      const { data, error } = await supabase
        .from('favorites')
        .insert([{ pokemon_id: p.id, user_id: user?.id }])
        .select('id')
        .single()

      if (error || !data) throw error ?? new Error('no data')

      set(s => ({ ...s, favorites: [...s.favorites, { id: data.id, pokemon_id: p.id }] }))
      return data.id
    },
    [user]
  )

  const removeFromFavorites = useCallback(
    async (id: number) => {
      await supabase.from('favorites').delete().eq('id', id).eq('user_id', user?.id)
      set(s => ({ ...s, favorites: s.favorites.filter(f => f.id !== id) }))
      return true
    },
    [user]
  )

  const createNewTeam = useCallback(
    async (name: string, description: string) => {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ name, description, user_id: user?.id }])
        .select('id')
        .single()

      const id = error || !data ? Date.now() : data.id
      set(s => ({ ...s, teams: [...s.teams, { id, name, description }] }))
      return id
    },
    [user]
  )

  const updateTeam = useCallback(
    async (id: number, name: string, description: string) => {
      await supabase.from('teams').update({ name, description }).eq('id', id).eq('user_id', user?.id)
      set(s => ({ ...s, teams: s.teams.map(t => (t.id === id ? { ...t, name, description } : t)) }))
      return true
    },
    [user]
  )

  const deleteTeam = useCallback(
    async (id: number) => {
      await supabase.from('teams').delete().eq('id', id).eq('user_id', user?.id)
      await supabase.from('team_members').delete().eq('team_id', id)
      set(s => ({
        ...s,
        teams: s.teams.filter(t => t.id !== id),
        teamPokemon: Object.fromEntries(Object.entries(s.teamPokemon).filter(([k]) => +k !== id))
      }))
      return true
    },
    [user]
  )

  return {
    teams: state.teams,
    favorites: state.favorites,
    teamPokemon: state.teamPokemon,
    isLoading: state.isLoading,
    error: state.error,
    createNewTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removeFromTeam,
    loadFavorites,
    fetchPokemonById,
    addToFavorites,
    removeFromFavorites
  }
}
