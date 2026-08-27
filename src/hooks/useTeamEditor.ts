import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';
import { PokemonService } from '../services/pokemon.service';
import { fetchPokemonData } from '../services/api';
import type { Team, TeamMember } from '../lib/supabase';
import type { TeamPokemonData } from '../types/team-builder';
import {
  nextAvailableTeamPosition,
  sortTeamMembers,
  toTeamPokemonData,
} from '../utils/team-builder';

const emptyFilters = {
  types: [],
  moves: [],
  generation: '',
  weight: { min: 0, max: 1000 },
  height: { min: 0, max: 100 },
  hasEvolutions: null,
};

export function useTeamEditor(teamId: number | null) {
  const {
    user,
    teams,
    teamsLoaded,
    teamsError,
    getTeamMembers,
    addPokemonToTeam,
    removePokemonFromTeam,
    updateTeamMemberBuild,
    reorderTeamMembers,
  } = useAuth();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pokemonData, setPokemonData] = useState<Record<number, TeamPokemonData>>({});
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPokemonSearch, setShowPokemonSearch] = useState(false);
  const [showMovesetEditor, setShowMovesetEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamPokemonData[]>([]);
  const [searching, setSearching] = useState(false);
  const loadVersion = useRef(0);
  const searchVersion = useRef(0);
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const matchingTeam = teamId === null ? undefined : teams.find(candidate => candidate.id === teamId);
  const matchingTeamId = matchingTeam?.id;
  const userId = user?.id;

  const loadPokemon = useCallback(async (members: TeamMember[]) => {
    const ids = [...new Set(members.map(member => member.pokemon_id))];
    if (ids.length === 0) return {};
    const pokemon = await PokemonService.getBatch(ids);
    return Object.fromEntries(pokemon.map(entry => [entry.id, toTeamPokemonData(entry)]));
  }, []);

  const applyMembers = useCallback((members: TeamMember[]) => {
    const ordered = sortTeamMembers(members);
    setTeamMembers(ordered);
    setSelectedMember(previous => {
      if (!previous) return null;
      return ordered.find(member => member.id === previous.id) ?? null;
    });
    return ordered;
  }, []);

  useEffect(() => {
    const version = ++loadVersion.current;
    setCurrentTeam(null);
    setTeamMembers([]);
    setPokemonData({});
    setSelectedMember(null);
    setShowMovesetEditor(false);
    setShowPokemonSearch(false);
    setError(null);

    if (!userId) {
      setLoading(false);
      return;
    }
    if (!teamsLoaded) {
      setLoading(true);
      return;
    }
    const team = teamId === null ? undefined : teamsRef.current.find(candidate => candidate.id === teamId);
    if (!team) {
      setLoading(false);
      setError(teamsError ?? 'Team not found');
      return;
    }

    setCurrentTeam(team);
    setLoading(true);
    void (async () => {
      try {
        const members = sortTeamMembers(await getTeamMembers(team.id));
        const data = await loadPokemon(members);
        if (version !== loadVersion.current) return;
        setTeamMembers(members);
        setPokemonData(data);
      } catch (loadError) {
        if (version !== loadVersion.current) return;
        console.error('Failed to load team editor:', loadError);
        setError('Failed to load this team. Please try again.');
      } finally {
        if (version === loadVersion.current) setLoading(false);
      }
    })();
  }, [getTeamMembers, loadPokemon, matchingTeamId, teamId, teamsError, teamsLoaded, userId]);

  useEffect(() => {
    if (matchingTeam) setCurrentTeam(matchingTeam);
  }, [matchingTeam]);

  useEffect(() => {
    const query = searchQuery.trim();
    const version = ++searchVersion.current;
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timeoutId = window.setTimeout(() => {
      void fetchPokemonData(10, 0, query, emptyFilters)
        .then(results => {
          if (version === searchVersion.current) {
            setSearchResults(results.map(toTeamPokemonData));
          }
        })
        .catch(searchError => {
          if (version !== searchVersion.current) return;
          console.error('Failed to search Pokémon:', searchError);
          setSearchResults([]);
          toast.error('Pokémon search failed');
        })
        .finally(() => {
          if (version === searchVersion.current) setSearching(false);
        });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const closePokemonSearch = useCallback(() => {
    searchVersion.current += 1;
    setShowPokemonSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
  }, []);

  const addPokemon = useCallback(async (pokemon: TeamPokemonData, buildData?: Partial<TeamMember>) => {
    if (teamId === null) return null;
    const position = nextAvailableTeamPosition(teamMembers);
    if (position === null) {
      toast.error('Team is full (6 Pokémon maximum)');
      return null;
    }
    const addedMember = await addPokemonToTeam(teamId, pokemon.id, position, buildData);
    if (!addedMember) return null;

    setPokemonData(previous => ({ ...previous, [pokemon.id]: pokemon }));
    applyMembers([...teamMembers, addedMember]);
    closePokemonSearch();
    return addedMember;
  }, [addPokemonToTeam, applyMembers, closePokemonSearch, teamId, teamMembers]);

  const removePokemon = useCallback(async (member: TeamMember) => {
    if (teamId === null) return false;
    const success = await removePokemonFromTeam(teamId, member.position);
    if (!success) return false;
    applyMembers(teamMembers.filter(candidate => candidate.id !== member.id));
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setShowMovesetEditor(false);
    }
    return true;
  }, [applyMembers, removePokemonFromTeam, selectedMember?.id, teamId, teamMembers]);

  const updateMemberBuild = useCallback(async (member: TeamMember, build: Partial<TeamMember>) => {
    if (teamId === null) return null;
    const updatedMember = await updateTeamMemberBuild(teamId, member.position, build);
    if (!updatedMember) return null;
    applyMembers(teamMembers.map(candidate => candidate.id === updatedMember.id ? updatedMember : candidate));
    return updatedMember;
  }, [applyMembers, teamId, teamMembers, updateTeamMemberBuild]);

  const movePokemon = useCallback(async (member: TeamMember, direction: -1 | 1) => {
    if (teamId === null) return false;
    const ordered = sortTeamMembers(teamMembers);
    const currentIndex = ordered.findIndex(entry => entry.id === member.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return false;
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    const success = await reorderTeamMembers(teamId, ordered.map(entry => entry.id));
    if (!success) return false;
    applyMembers(ordered.map((entry, index) => ({ ...entry, position: index + 1 })));
    return true;
  }, [applyMembers, reorderTeamMembers, teamId, teamMembers]);

  const editMember = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setShowMovesetEditor(true);
  }, []);

  const closeMovesetEditor = useCallback(() => {
    setShowMovesetEditor(false);
    setSelectedMember(null);
  }, []);

  return {
    currentTeam,
    teamMembers,
    pokemonData,
    selectedMember,
    loading,
    error,
    showPokemonSearch,
    showMovesetEditor,
    searchQuery,
    searchResults,
    searching,
    setSearchQuery,
    setShowPokemonSearch,
    addPokemon,
    removePokemon,
    updateMemberBuild,
    movePokemon,
    editMember,
    closeMovesetEditor,
    closePokemonSearch,
  };
}
