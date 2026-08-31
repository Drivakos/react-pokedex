jest.mock('../../services/showdown-battle-worker.service', () => ({
  ShowdownBattleWorkerSession: jest.fn(),
}));

import { createRunPokemon } from '../../services/battle-content.service';
import { BATTLE_RUN_SAVE_KEY, useBattleRunStore } from '../battleRunStore';
import { useBattleEngineStore } from '../battleEngineStore';
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

describe('Battle Run full-party recruitment', () => {
  beforeEach(() => {
    useBattleRunStore.getState().startRun();
  });

  it('returns from replacement selection without changing or rerolling recruits', () => {
    const party = fullParty();
    const draftChoices = [
      createRunPokemon('Mew', 4),
      createRunPokemon('Lucario', 4),
      createRunPokemon('Dragonite', 4),
    ];
    useBattleRunStore.setState({
      phase: 'reward-draft',
      party,
      draftChoices,
    });

    useBattleRunStore.getState().chooseReward(draftChoices[0]);
    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'replacement',
      pendingRecruit: expect.objectContaining({ species: 'Mew' }),
    });

    useBattleRunStore.getState().cancelReplacement();

    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'reward-draft',
      pendingRecruit: null,
      party,
      draftChoices,
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

describe('Battle Run trainer names', () => {
  it('passes the user name and selected random opponent to the battle engine', () => {
    const startBattle = jest.spyOn(useBattleEngineStore.getState(), 'startBattle')
      .mockImplementation(() => undefined);
    useBattleRunStore.getState().startRun();
    useBattleRunStore.setState({
      stage: 1,
      phase: 'route-select',
      party: fullParty().slice(0, 1),
      opponentTrainer: {
        id: 'nova',
        name: 'Nova',
        title: 'Ace Trainer',
        intro: 'Battle time.',
        image: '/images/trainers/ace-f.png',
      },
    });

    useBattleRunStore.getState().selectRoute('trail', 'Ash');

    expect(startBattle).toHaveBeenCalledWith(expect.objectContaining({
      playerName: 'Ash',
      opponentName: 'Nova',
    }));
    startBattle.mockRestore();
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

describe('Battle Run checkpoint persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useBattleRunStore.getState().startRun();
  });

  it('preserves the initial three starter choices across a module reload', async () => {
    const starterChoices = useBattleRunStore.getState().draftChoices.map(pokemon => pokemon.species);
    const checkpoint = JSON.parse(window.localStorage.getItem(BATTLE_RUN_SAVE_KEY) ?? '{}');
    expect(checkpoint).toMatchObject({
      version: 1,
      state: {
        phase: 'starter-draft',
        party: [],
      },
    });
    expect(checkpoint.state.draftChoices.map((pokemon: { species: string }) => pokemon.species))
      .toEqual(starterChoices);

    jest.resetModules();
    const reloadedModule = await import('../battleRunStore');
    expect(reloadedModule.useBattleRunStore.getState().resumeAvailable).toBe(true);

    reloadedModule.useBattleRunStore.getState().resumeRun();
    expect(reloadedModule.useBattleRunStore.getState().draftChoices.map(pokemon => pokemon.species))
      .toEqual(starterChoices);
  });

  it('automatically saves meaningful progress after choosing a starter', () => {
    const starter = useBattleRunStore.getState().draftChoices[0];
    useBattleRunStore.getState().chooseStarter(starter);

    const checkpoint = JSON.parse(window.localStorage.getItem(BATTLE_RUN_SAVE_KEY) ?? '{}');
    expect(checkpoint).toMatchObject({
      version: 1,
      state: {
        phase: 'route-select',
        stage: 1,
        party: [expect.objectContaining({ species: starter.species })],
      },
    });
    expect(checkpoint.randomCalls).toBeGreaterThan(0);
  });

  it('offers the saved run when the store module loads after a refresh', async () => {
    const starter = useBattleRunStore.getState().draftChoices[0];
    useBattleRunStore.getState().chooseStarter(starter);

    jest.resetModules();
    const reloadedModule = await import('../battleRunStore');
    const reloadedState = reloadedModule.useBattleRunStore.getState();

    expect(reloadedState.resumeAvailable).toBe(true);
    expect(reloadedState.savedRunSummary).toMatchObject({
      stage: 1,
      party: [expect.objectContaining({ species: starter.species })],
    });
    expect(reloadedState.seed).toBe('');
  });

  it('keeps the pre-battle checkpoint while a battle is in progress', () => {
    const starter = useBattleRunStore.getState().draftChoices[0];
    useBattleRunStore.getState().chooseStarter(starter);
    const safeCheckpoint = window.localStorage.getItem(BATTLE_RUN_SAVE_KEY);

    useBattleRunStore.setState({ phase: 'battle', score: 999999 });

    expect(window.localStorage.getItem(BATTLE_RUN_SAVE_KEY)).toBe(safeCheckpoint);
  });

  it('restores the run and seeded random cursor for future drafts', () => {
    const starter = useBattleRunStore.getState().draftChoices[0];
    useBattleRunStore.getState().chooseStarter(starter);
    useBattleRunStore.setState({
      phase: 'reward-draft',
      scoutPasses: 1,
      draftChoices: [createRunPokemon('Pikachu', 3)],
    });
    const checkpoint = window.localStorage.getItem(BATTLE_RUN_SAVE_KEY);
    expect(checkpoint).not.toBeNull();

    useBattleRunStore.getState().rerollDraft();
    const firstReroll = useBattleRunStore.getState().draftChoices.map(pokemon => pokemon.species);

    window.localStorage.setItem(BATTLE_RUN_SAVE_KEY, checkpoint ?? '');
    useBattleRunStore.setState({
      seed: '',
      party: [],
      draftChoices: [],
      resumeAvailable: true,
    });
    useBattleRunStore.getState().resumeRun();
    useBattleRunStore.getState().rerollDraft();
    const resumedReroll = useBattleRunStore.getState().draftChoices.map(pokemon => pokemon.species);

    expect(resumedReroll).toEqual(firstReroll);
    expect(useBattleRunStore.getState()).toMatchObject({
      phase: 'reward-draft',
      resumeAvailable: false,
      scoutPasses: 0,
    });
  });

  it('removes the checkpoint when a run reaches a terminal state', () => {
    const starter = useBattleRunStore.getState().draftChoices[0];
    useBattleRunStore.getState().chooseStarter(starter);
    expect(window.localStorage.getItem(BATTLE_RUN_SAVE_KEY)).not.toBeNull();

    useBattleRunStore.setState({ phase: 'game-over', party: [] });

    expect(window.localStorage.getItem(BATTLE_RUN_SAVE_KEY)).toBeNull();
  });
});
