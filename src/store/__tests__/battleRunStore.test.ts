jest.mock('../../services/showdown-battle-worker.service', () => ({
  ShowdownBattleWorkerSession: jest.fn(),
}));

import { createRunPokemon } from '../../services/battle-content.service';
import { useBattleRunStore } from '../battleRunStore';

const fullParty = () => [
  createRunPokemon('Bulbasaur', 3),
  createRunPokemon('Charizard', 3),
  createRunPokemon('Blastoise', 3),
  createRunPokemon('Pikachu', 3),
  createRunPokemon('Gengar', 3),
  createRunPokemon('Gyarados', 3),
];

describe('Battle Run party development', () => {
  beforeEach(() => {
    useBattleRunStore.getState().startRun();
  });

  it('opens development only from a full-party reward draft and can return', () => {
    useBattleRunStore.setState({ phase: 'reward-draft', party: fullParty() });
    useBattleRunStore.getState().openPartyDevelopment();
    expect(useBattleRunStore.getState().phase).toBe('party-development');

    useBattleRunStore.getState().closePartyDevelopment();
    expect(useBattleRunStore.getState().phase).toBe('reward-draft');

    useBattleRunStore.setState({ phase: 'reward-draft', party: fullParty().slice(0, 5) });
    useBattleRunStore.getState().openPartyDevelopment();
    expect(useBattleRunStore.getState().phase).toBe('reward-draft');
  });

  it('consumes the reward, preserves level, and advances after evolving', () => {
    const party = fullParty();
    const startingLevel = party[0].level;
    useBattleRunStore.setState({ phase: 'party-development', stage: 3, party });

    useBattleRunStore.getState().developPartyMember(0, 'Ivysaur');

    const state = useBattleRunStore.getState();
    expect(state.stage).toBe(4);
    expect(state.phase).toBe('lead-select');
    expect(state.party[0]).toMatchObject({ species: 'Ivysaur', level: startingLevel });
  });

  it('rejects unavailable transformations without advancing', () => {
    useBattleRunStore.setState({ phase: 'party-development', stage: 3, party: fullParty() });
    useBattleRunStore.getState().developPartyMember(0, 'Venusaur-Mega');

    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'party-development',
      stage: 3,
    });
  });
});
