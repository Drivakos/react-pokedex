import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { formatName } from '../../utils/helpers'
import {
  TYPE_COLORS,
  PokemonDetails,
  PokemonAbility,
  PokemonMove,
  PokemonStats,
} from '../../types/pokemon'
import PokemonImage from '../common/PokemonImage'
import { Shield, Zap, Target, Activity, X, Star } from 'lucide-react'

interface Props {
  pokemon: PokemonDetails
  onClose: () => void
  onAdd?: () => void
  canAddToTeam?: boolean
}

const PokemonDetailView: React.FC<Props> = ({
  pokemon,
  onClose,
  onAdd,
  canAddToTeam = false,
}) => {
  const { isFavorite } = useAuth()

  const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({})
  const [typeEffectiveness, setTypeEffectiveness] = useState({
    quadrupleDamage: [] as string[],
    doubleDamage: [] as string[],
    halfDamage: [] as string[],
    quarterDamage: [] as string[],
    noDamage: [] as string[],
  })

  const safeTypes: string[] = pokemon?.types ?? []
  const safeMoves: PokemonMove[] = pokemon?.moves ?? []
  const safeAbilities: PokemonAbility[] = pokemon?.abilities ?? []
  const safeStats: PokemonStats =
    pokemon?.stats ?? { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 }

  useEffect(() => {
    let mounted = true

    const loadAbilities = async () => {
      if (!safeAbilities.length) return
      const desc: Record<string, string> = {}
      safeAbilities.forEach(a => {
        desc[a.name] = a.description || 'Description lookup needed.'
      })
      if (mounted) setAbilityDescriptions(desc)
    }

    const loadTypes = async () => {
      if (!safeTypes.length) return
      const controller = new AbortController()
      try {
        const typeJson = await Promise.all(
          safeTypes.map(t =>
            fetch(`https://pokeapi.co/api/v2/type/${t}`, { signal: controller.signal }).then(r => r.json())
          )
        )

        const dmg = {
          doubleFrom: new Map<string, number>(),
          halfFrom: new Map<string, number>(),
          zeroFrom: new Map<string, number>(),
        }

        typeJson.forEach(d => {
          d.damage_relations.double_damage_from.forEach((x: { name: string }) =>
            dmg.doubleFrom.set(x.name, (dmg.doubleFrom.get(x.name) || 1) * 2)
          )
          d.damage_relations.half_damage_from.forEach((x: { name: string }) =>
            dmg.halfFrom.set(x.name, (dmg.halfFrom.get(x.name) || 1) * 0.5)
          )
          d.damage_relations.no_damage_from.forEach((x: { name: string }) => dmg.zeroFrom.set(x.name, 0))
        })

        const res = {
          quadrupleDamage: [] as string[],
          doubleDamage: [] as string[],
          halfDamage: [] as string[],
          quarterDamage: [] as string[],
          noDamage: [] as string[],
        }

        dmg.doubleFrom.forEach((v, t) => {
          if (dmg.zeroFrom.has(t)) return
          if (dmg.halfFrom.has(t)) {
            const combined = v * (dmg.halfFrom.get(t) || 0.5)
            if (combined === 2) res.doubleDamage.push(t)
            else if (combined === 0.5) res.halfDamage.push(t)
          } else if (v === 4) res.quadrupleDamage.push(t)
          else res.doubleDamage.push(t)
        })

        dmg.halfFrom.forEach((v, t) => {
          if (dmg.zeroFrom.has(t) || dmg.doubleFrom.has(t)) return
          if (v === 0.25) res.quarterDamage.push(t)
          else if (v === 0.5) res.halfDamage.push(t)
        })

        dmg.zeroFrom.forEach((_, t) => res.noDamage.push(t))

        if (mounted) setTypeEffectiveness(res)
      } catch {}
      return () => controller.abort()
    }

    loadAbilities()
    loadTypes()
    return () => {
      mounted = false
    }
  }, [safeAbilities, safeTypes])

  const fav = isFavorite(pokemon.id)
  const uniqueMoves = Array.from(new Map(safeMoves.map(m => [m.name, m])).values())

  return (
    <div className="w-full p-4 md:p-6 overflow-auto" style={{ maxHeight: 'calc(80vh - 2rem)' }}>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold capitalize">{formatName(pokemon.name)}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 flex flex-col items-center bg-gray-50 rounded-lg p-4">
          <div className="relative w-40 h-40 md:w-48 md:h-48 mb-2">
            <PokemonImage pokemon={pokemon} size="lg" className="w-full h-full object-contain" />
          </div>
          <span className="text-gray-500 text-sm mb-4">#{String(pokemon.id).padStart(3, '0')}</span>

          <div className="flex gap-2 mb-4">
            {safeTypes.map(t => (
              <span
                key={t}
                className="px-2 py-1 rounded text-xs font-medium text-white capitalize"
                style={{ backgroundColor: TYPE_COLORS[t as keyof typeof TYPE_COLORS] || '#6B7280' }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Star size={16} className={fav ? 'text-yellow-500' : 'text-gray-300'} />
            <span className="text-xs">{fav ? 'In your favorites' : 'Not in favorites'}</span>
          </div>

          {canAddToTeam && onAdd && (
            <button
              onClick={onAdd}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Add to Team
            </button>
          )}
        </div>

        <div className="md:w-2/3">
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Activity size={18} /> Base Stats
            </h3>
            <div className="space-y-2">
              {Object.entries(safeStats).map(([stat, val]) => {
                const pct = Math.min(100, (val / 255) * 100)
                const bar =
                  pct > 70 ? 'bg-green-500' : pct > 40 ? 'bg-yellow-400' : 'bg-red-400'
                return (
                  <div key={stat} className="flex items-center">
                    <div className="w-24 md:w-32 text-sm capitalize">{stat.replace('_', ' ')}</div>
                    <div className="w-12 text-right text-sm font-medium mr-2">{val}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Zap size={18} /> Abilities
            </h3>
            <div className="space-y-2">
              {safeAbilities.map(a => (
                <div key={a.name} className="p-2 bg-gray-50 rounded">
                  <div className="font-medium capitalize">{a.name}</div>
                  <div className="text-sm text-gray-600">
                    {abilityDescriptions[a.name] || 'Loading description...'}
                  </div>
                  {a.is_hidden && <div className="text-xs text-purple-600 mt-1">Hidden Ability</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Shield size={18} /> Type Effectiveness
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ['quadrupleDamage', '4× Damage From', 'text-red-600'],
                  ['doubleDamage', '2× Damage From', 'text-orange-600'],
                  ['halfDamage', '½ Damage From', 'text-green-600'],
                  ['quarterDamage', '¼ Damage From', 'text-teal-600'],
                  ['noDamage', 'Immune To', 'text-blue-600'],
                ] as const
              ).map(([key, label, cls]) =>
                typeEffectiveness[key].length ? (
                  <div key={key}>
                    <h4 className={`text-sm font-bold ${cls} mb-1`}>{label}:</h4>
                    <div className="flex flex-wrap gap-1">
                      {typeEffectiveness[key].map(t => (
                        <span
                          key={t}
                          className={`px-2 py-0.5 rounded text-xs text-white capitalize ${TYPE_COLORS[t as keyof typeof TYPE_COLORS] || 'bg-gray-500'}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Target size={18} /> Moves
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {uniqueMoves.slice(0, 9).map((m, i) => (
                <div key={`${m.name}-${i}`} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="capitalize">{m.name.replace('-', ' ')}</div>
                </div>
              ))}
              {uniqueMoves.length > 9 && (
                <div className="p-2 bg-gray-50 rounded text-sm flex items-center justify-center">
                  +{uniqueMoves.length - 9} more...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PokemonDetailView