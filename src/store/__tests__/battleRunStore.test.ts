jest.mock('../../services/showdown-battle-worker.service', () => ({
  ShowdownBattleWorkerSession: jest.fn(),
}));

import { createRunPokemon } from '../../services/battle-content.service';
import { useBattleRunStore } from '../battleRunStore';
import { RUN_UPGRADES } from '../../utils/battle-run-rules';

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

describe('Battle Run boss route selection', () => {
  beforeEach(() => {
    useBattleRunStore.getState().startRun();
    useBattleRunStore.setState({
      stage: 5,
      phase: 'route-select',
      party: fullParty(),
    });
  });

  it('rejects normal difficulty routes at a boss checkpoint', () => {
    useBattleRunStore.getState().selectRoute('trail');
    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'route-select',
      activeRoute: null,
    });

    useBattleRunStore.getState().selectRoute('rival');
    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'route-select',
      activeRoute: null,
    });
  });
});

describe('Battle Run checkpoint rewards', () => {
  beforeEach(() => {
    useBattleRunStore.getState().startRun();
  });

  it('fills every empty party slot with stage-scaled Pokémon immediately', () => {
    const reward = RUN_UPGRADES.find(upgrade => upgrade.id === 'full-roster');
    expect(reward).toBeDefined();
    useBattleRunStore.setState({
      stage: 5,
      phase: 'upgrade-draft',
      party: fullParty().slice(0, 2),
      upgradeChoices: reward ? [reward] : [],
    });

    useBattleRunStore.getState().chooseUpgrade('full-roster');

    const state = useBattleRunStore.getState();
    expect(state.phase).toBe('reward-draft');
    expect(state.party).toHaveLength(6);
    expect(new Set(state.party.map(pokemon => pokemon.species))).toHaveProperty('size', 6);
    expect(state.upgrades.map(upgrade => upgrade.id)).toContain('full-roster');
  });

  it('uses an evolution reward before returning to the recruitment draft', () => {
    const reward = RUN_UPGRADES.find(upgrade => upgrade.id === 'evolution-catalyst');
    expect(reward).toBeDefined();
    useBattleRunStore.setState({
      stage: 5,
      phase: 'upgrade-draft',
      party: [createRunPokemon('Bulbasaur', 3)],
      upgradeChoices: reward ? [reward] : [],
    });

    useBattleRunStore.getState().chooseUpgrade('evolution-catalyst');
    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'party-development',
      developmentRewardPending: true,
    });

    useBattleRunStore.getState().developPartyMember(0, 'Ivysaur');
    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'reward-draft',
      developmentRewardPending: false,
      stage: 5,
    });
    expect(useBattleRunStore.getState().party[0].species).toBe('Ivysaur');
    expect(useBattleRunStore.getState().draftChoices.length).toBeGreaterThan(0);
  });
});
