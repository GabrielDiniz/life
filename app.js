const STORAGE_KEY = 'life_simulation_saves_v1';
const STORAGE_CONFIG_KEY = 'life_simulation_config_v1';
const STORAGE_BALANCED_KEY = 'life_simulation_balanced_v1';
const WORLD_WIDTH = 980;
const WORLD_HEIGHT = 640;
const INPUT_SIZE = 9;
const HIDDEN_SIZE = 8;
const OUTPUT_SIZE = 8;
const GENE_COUNT = INPUT_SIZE * HIDDEN_SIZE + HIDDEN_SIZE + HIDDEN_SIZE * OUTPUT_SIZE + OUTPUT_SIZE;
const BENCHMARK_MAX_POPULATION = 120;

const DEFAULT_CONFIG = {
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
  initialPopulation: 20,
  initialEnergyPercent: 0.53,
  initialLife: 180,
  baseEnergy: 150,
  energyCost: 0.25,
  foodEnergyMinPercent: 0.13,
  foodEnergyMaxPercent: 0.53,
  mutationRate: 0.08,
  crossoverSimilarity: 0.7,
  reproductionThresholdPercent: 0.73,
  asexualReproductionCostPercent: 0.30,
  sexualReproductionCostPercent: 0.15,
  childEnergyPercent: 0.30,
  predatorFactor: 1.8,
  maxFood: 45,
  foodSpawnRate: 5,
  jumpEnergyPercent: 0.10,
  jumpDistanceMultiplier: 3,
};

const BALANCED_DEFAULTS = {
  initialPopulation: 22,
  initialEnergyPercent: 0.52,
  initialLife: 190,
  baseEnergy: 150,
  energyCost: 0.22,
  foodEnergyMinPercent: 0.12,
  foodEnergyMaxPercent: 0.48,
  mutationRate: 0.07,
  crossoverSimilarity: 0.72,
  reproductionThresholdPercent: 0.70,
  asexualReproductionCostPercent: 0.28,
  sexualReproductionCostPercent: 0.14,
  childEnergyPercent: 0.28,
  predatorFactor: 1.9,
  maxFood: 50,
  foodSpawnRate: 6,
  jumpEnergyPercent: 0.10,
  jumpDistanceMultiplier: 3,
};

const state = {
  config: { ...DEFAULT_CONFIG },
  population: [],
  food: [],
  saves: [],
  generation: 0,
  predationCount: 0,
  asexualReproductionCount: 0,
  sexualReproductionCount: 0,
  lastTimestamp: 0,
  paused: false,
  benchmarking: false,
  fastMode: false,
  fastLoopHandle: null,
  nextFoodSpawn: 0,
  nextId: 1,
};

const ui = {
  canvas: document.getElementById('world'),
  initialPopulation: document.getElementById('initialPopulation'),
  initialEnergyPercent: document.getElementById('initialEnergyPercent'),
  initialLife: document.getElementById('initialLife'),
  energyCost: document.getElementById('energyCost'),
  baseEnergy: document.getElementById('baseEnergy'),
  foodEnergyMinPercent: document.getElementById('foodEnergyMinPercent'),
  foodEnergyMaxPercent: document.getElementById('foodEnergyMaxPercent'),
  mutationRate: document.getElementById('mutationRate'),
  crossoverSimilarity: document.getElementById('crossoverSimilarity'),
  reproductionThresholdPercent: document.getElementById('reproductionThresholdPercent'),
  asexualReproductionCostPercent: document.getElementById('asexualReproductionCostPercent'),
  sexualReproductionCostPercent: document.getElementById('sexualReproductionCostPercent'),
  childEnergyPercent: document.getElementById('childEnergyPercent'),
  predatorFactor: document.getElementById('predatorFactor'),
  maxFood: document.getElementById('maxFood'),
  foodSpawnRate: document.getElementById('foodSpawnRate'),
  jumpEnergyPercent: document.getElementById('jumpEnergyPercent'),
  jumpDistanceMultiplier: document.getElementById('jumpDistanceMultiplier'),
  populationStat: document.getElementById('populationStat'),
  foodStat: document.getElementById('foodStat'),
  generationStat: document.getElementById('generationStat'),
  predationStat: document.getElementById('predationStat'),
  asexualStat: document.getElementById('asexualStat'),
  sexualStat: document.getElementById('sexualStat'),
  newSimulationBtn: document.getElementById('newSimulationBtn'),
  togglePauseBtn: document.getElementById('togglePauseBtn'),
  fastModeBtn: document.getElementById('fastModeBtn'),
  benchmarkBtn: document.getElementById('benchmarkBtn'),
  balancedDefaultsBtn: document.getElementById('balancedDefaultsBtn'),
  tuningSummary: document.getElementById('tuningSummary'),
  benchmarkStatus: document.getElementById('benchmarkStatus'),
  tuningMessage: document.getElementById('tuningMessage'),
  saveName: document.getElementById('saveName'),
  saveBtn: document.getElementById('saveBtn'),
  saveList: document.getElementById('saveList'),
  loadSaveBtn: document.getElementById('loadSaveBtn'),
  deleteSaveBtn: document.getElementById('deleteSaveBtn'),
};

const ctx = ui.canvas.getContext('2d');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randSign() {
  return Math.random() > 0.5 ? 1 : -1;
}

function normalise(value, min, max) {
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin || 1)) * (outMax - outMin);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function angleDifference(a, b) {
  let diff = ((b - a + 540) % 360) - 180;
  return diff < -180 ? diff + 360 : diff;
}

function getConfigFromControls() {
  return {
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    initialPopulation: Number(ui.initialPopulation.value),
    initialEnergyPercent: Number(ui.initialEnergyPercent.value),
    initialLife: Number(ui.initialLife.value),
    energyCost: Number(ui.energyCost.value),
    baseEnergy: Number(ui.baseEnergy.value),
    foodEnergyMinPercent: Number(ui.foodEnergyMinPercent.value),
    foodEnergyMaxPercent: Number(ui.foodEnergyMaxPercent.value),
    mutationRate: Number(ui.mutationRate.value),
    crossoverSimilarity: Number(ui.crossoverSimilarity.value),
    reproductionThresholdPercent: Number(ui.reproductionThresholdPercent.value),
    asexualReproductionCostPercent: Number(ui.asexualReproductionCostPercent.value),
    sexualReproductionCostPercent: Number(ui.sexualReproductionCostPercent.value),
    childEnergyPercent: Number(ui.childEnergyPercent.value),
    predatorFactor: Number(ui.predatorFactor.value),
    maxFood: Number(ui.maxFood.value),
    foodSpawnRate: Number(ui.foodSpawnRate.value),
    jumpEnergyPercent: Number(ui.jumpEnergyPercent.value),
    jumpDistanceMultiplier: Number(ui.jumpDistanceMultiplier.value),
  };
}

function randomGenes() {
  const genes = [];
  for (let i = 0; i < GENE_COUNT; i += 1) {
    genes.push((Math.random() - 0.5) * 2);
  }
  return genes;
}

function mutateGenes(genes, mutationRate) {
  return genes.map((gene) => {
    if (Math.random() < mutationRate) {
      return clamp(gene + (Math.random() - 0.5) * 2, -3, 3);
    }
    return gene;
  });
}

function combineGenes(parentA, parentB) {
  const child = [];
  const midpoint = Math.floor(parentA.length / 2);
  for (let i = 0; i < parentA.length; i += 1) {
    child.push(i < midpoint ? parentA[i] : parentB[i]);
  }
  return child;
}

function computeGeneSimilarity(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff += Math.abs(a[i] - b[i]);
  }
  const maxDistance = a.length * 2;
  const similarity = 1 - diff / Math.max(maxDistance, 1);
  return clamp(similarity, 0, 1);
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function tanh(value) {
  return Math.tanh(value);
}

function forwardNetwork(genes, inputs) {
  const hiddenStart = INPUT_SIZE * HIDDEN_SIZE;
  const hiddenBiasStart = hiddenStart + HIDDEN_SIZE;
  const outputBiasStart = hiddenBiasStart + HIDDEN_SIZE * OUTPUT_SIZE;

  const hidden = Array(HIDDEN_SIZE).fill(0);
  const outputs = Array(OUTPUT_SIZE).fill(0);

  for (let h = 0; h < HIDDEN_SIZE; h += 1) {
    let sum = genes[hiddenBiasStart + h];
    for (let i = 0; i < INPUT_SIZE; i += 1) {
      sum += inputs[i] * genes[i * HIDDEN_SIZE + h];
    }
    hidden[h] = tanh(sum);
  }

  for (let o = 0; o < OUTPUT_SIZE; o += 1) {
    let sum = genes[outputBiasStart + o];
    for (let h = 0; h < HIDDEN_SIZE; h += 1) {
      sum += hidden[h] * genes[hiddenStart + h * OUTPUT_SIZE + o];
    }
    outputs[o] = sigmoid(sum);
  }

  return outputs;
}

function getGeneColor(genes) {
  const sampled = genes.slice(0, 3);
  const average = sampled.reduce((total, value) => total + value, 0) / Math.max(sampled.length, 1);
  const hue = ((average + 1) / 2) * 360;
  return `hsl(${hue}, 75%, 58%)`;
}

function getIndividualRadius(organism) {
  return clamp(15* organism.energy /state.config.baseEnergy*state.config.initialEnergyPercent , 2, 30);
}

function createIndividual(x, y, genes = randomGenes(), config = state.config) {
  const energy = (config.initialEnergyPercent ?? 0.53) * (config.baseEnergy ?? 150);
  const life = config.initialLife ?? 180;

  const organism = {
    id: state.nextId++,
    x,
    y,
    angle: Math.random() * Math.PI * 2,
    speed: randomBetween(0.7, 1.6),
    radius: 8,
    energy,
    life,
    maxLife: life,
    genes,
    color: getGeneColor(genes),
    alive: true,
    lastAction: 'idle',
  };

  organism.radius = getIndividualRadius(organism);
  return organism;
}

function persistConfig() {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(state.config));
  } catch (error) {
    console.warn('Não foi possível salvar a configuração em localStorage:', error);
  }
}

function readConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Não foi possível carregar a configuração do localStorage:', error);
    return null;
  }
}

function setBenchmarkStatus(mode, message) {
  if (!ui.benchmarkStatus) return;
  ui.benchmarkStatus.classList.remove('idle', 'running', 'done');
  ui.benchmarkStatus.classList.add(mode);
  ui.benchmarkStatus.textContent = message;
}

function setTuningMessage(message) {
  if (!ui.tuningMessage) return;
  ui.tuningMessage.textContent = message;
}

function setConfigFromInputs() {
  state.config = getConfigFromControls();
  persistConfig();
}

function persistBalancedProfile(profile, score) {
  try {
    localStorage.setItem(STORAGE_BALANCED_KEY, JSON.stringify({
      balance: { ...DEFAULT_CONFIG, ...BALANCED_DEFAULTS, ...profile },
      score,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('Não foi possível salvar o perfil equilibrado em localStorage:', error);
  }
}

function readBalancedProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_BALANCED_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Não foi possível carregar o perfil equilibrado do localStorage:', error);
    return null;
  }
}

function buildProgressMessage(current, total, scored, latestMetrics, bestEntry) {
  const avgPopulation = scored.length
    ? (scored.reduce((sum, item) => sum + item.metrics.finalPopulation, 0) / scored.length).toFixed(1)
    : '0.0';

  const avgReproduction = scored.length
    ? (scored.reduce((sum, item) => sum + item.metrics.asexualReproductionCount + item.metrics.sexualReproductionCount, 0) / scored.length).toFixed(1)
    : '0.0';

  const bestScore = bestEntry ? bestEntry.score.toFixed(2) : '0.00';
  const bestPopulation = bestEntry ? bestEntry.metrics.finalPopulation : 0;
  const latestPopulation = latestMetrics ? latestMetrics.finalPopulation : 0;
  const latestPredation = latestMetrics ? latestMetrics.predationCount : 0;

  return `Execução: ${current}/${total} • melhor score ${bestScore} • melhor população ${bestPopulation} • última população ${latestPopulation} • predação ${latestPredation} • média população ${avgPopulation} • média reprodução ${avgReproduction}.`;
}

function applyBalancedDefaults() {
  const savedBalanced = readBalancedProfile();
  const profile = savedBalanced ? savedBalanced.balance : BALANCED_DEFAULTS;
  state.config = { ...DEFAULT_CONFIG, ...profile };
  applyConfigToInputs(state.config);
  persistConfig();
  resetSimulation();
  setBenchmarkStatus('done', 'Equilibrado');
  setTuningMessage(savedBalanced
    ? `Perfil equilibrado restaurado com score ${Number(savedBalanced.score ?? 0).toFixed(2)}.`
    : 'Perfil equilibrado restaurado com os valores recomendados após o tuning.');
}

function scoreBenchmarkResult(config, metrics) {
  const populationTarget = Math.max(8, config.initialPopulation);
  const populationScore = clamp(1 - Math.abs(metrics.finalPopulation - populationTarget) / Math.max(populationTarget * 2, 1), 0, 1);
  const foodScore = clamp(1 - Math.abs(metrics.foodCount - 12) / 30, 0, 1);
  const reproductionScore = clamp((metrics.asexualReproductionCount + metrics.sexualReproductionCount) / Math.max(metrics.finalPopulation || 1, 1), 0, 1);
  const predationScore = clamp(1 - Math.abs(metrics.predationCount - 8) / 36, 0, 1);
  const generationScore = clamp(metrics.generation / 120, 0, 1);
  const extinctionPenalty = metrics.finalPopulation <= 1 ? -0.35 : 0.15;

  return Math.max(0, (
    populationScore * 0.35 +
    foodScore * 0.2 +
    reproductionScore * 0.2 +
    predationScore * 0.1 +
    generationScore * 0.15 +
    extinctionPenalty
  ));
}

function trimPopulationForBenchmark(maxPopulation = BENCHMARK_MAX_POPULATION) {
  if (state.population.length <= maxPopulation) return;

  state.population.sort((a, b) => (b.energy + b.life) - (a.energy + a.life));
  state.population = state.population.slice(0, maxPopulation);
}

async function runSingleBenchmark(config, steps = 2000) {
  const previousState = {
    config: { ...state.config },
    population: state.population.slice(),
    food: state.food.slice(),
    generation: state.generation,
    predationCount: state.predationCount,
    asexualReproductionCount: state.asexualReproductionCount,
    sexualReproductionCount: state.sexualReproductionCount,
    nextFoodSpawn: state.nextFoodSpawn,
    nextId: state.nextId,
  };

  const benchmarkLimit = Math.max(40, Math.min(BENCHMARK_MAX_POPULATION, Math.ceil((config.initialPopulation || 20) * 4)));

  state.config = { ...DEFAULT_CONFIG, ...config };
  state.population = [];
  state.food = [];
  state.generation = 0;
  state.predationCount = 0;
  state.asexualReproductionCount = 0;
  state.sexualReproductionCount = 0;
  state.nextFoodSpawn = state.config.foodSpawnRate;
  state.nextId = 1;

  createRandomPopulation(state.config.initialPopulation);
  spawnFood(state.config.maxFood);

  for (let i = 0; i < steps; i += 1) {
    updateFood();
    updatePopulation();
    trimPopulationForBenchmark(benchmarkLimit);

    if ((i + 1) % 250 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const metrics = {
    finalPopulation: state.population.length,
    foodCount: state.food.length,
    generation: state.generation,
    predationCount: state.predationCount,
    asexualReproductionCount: state.asexualReproductionCount,
    sexualReproductionCount: state.sexualReproductionCount,
  };

  state.config = previousState.config;
  state.population = previousState.population;
  state.food = previousState.food;
  state.generation = previousState.generation;
  state.predationCount = previousState.predationCount;
  state.asexualReproductionCount = previousState.asexualReproductionCount;
  state.sexualReproductionCount = previousState.sexualReproductionCount;
  state.nextFoodSpawn = previousState.nextFoodSpawn;
  state.nextId = previousState.nextId;

  return metrics;
}

function buildBenchmarkConfigs() {
  const candidates = [];
  for (let i = 0; i < 100; i += 1) {
    const variant = {
      ...DEFAULT_CONFIG,
      initialPopulation: Math.round(randomBetween(4, 80)),
      initialEnergyPercent: randomBetween(0.1, 1.5),
      initialLife: randomBetween(60, 500),
      energyCost: randomBetween(0.04, 1.0),
      foodEnergyMinPercent: randomBetween(0.02, 0.5),
      foodEnergyMaxPercent: randomBetween(0.15, 1.3),
      mutationRate: randomBetween(0.005, 0.35),
      crossoverSimilarity: randomBetween(0.35, 0.95),
      reproductionThresholdPercent: randomBetween(0.2, 1.5),
      asexualReproductionCostPercent: randomBetween(0.05, 0.8),
      sexualReproductionCostPercent: randomBetween(0.02, 0.4),
      childEnergyPercent: randomBetween(0.05, 0.7),
      predatorFactor: randomBetween(0.8, 4.0),
      maxFood: randomBetween(8, 140),
      foodSpawnRate: randomBetween(1, 25),
      jumpEnergyPercent: randomBetween(0.03, 0.3),
      jumpDistanceMultiplier: randomBetween(1, 6),
    };

    if (variant.foodEnergyMaxPercent < variant.foodEnergyMinPercent) {
      const temp = variant.foodEnergyMinPercent;
      variant.foodEnergyMinPercent = variant.foodEnergyMaxPercent;
      variant.foodEnergyMaxPercent = temp;
    }

    candidates.push(variant);
  }

  return candidates;
}

async function runBenchmark() {
  if (ui.benchmarkBtn.disabled) return;

  const candidates = buildBenchmarkConfigs();
  const scored = [];
  let bestEntry = null;
  state.paused = true;
  state.benchmarking = true;

  ui.benchmarkBtn.disabled = true;
  ui.balancedDefaultsBtn.disabled = true;
  setBenchmarkStatus('running', 'Rodando');
  setTuningMessage(buildProgressMessage(0, candidates.length, scored, null, bestEntry));

  try {
    const batchSize = 2;
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const metrics = await runSingleBenchmark(candidate, 2000);
      const score = scoreBenchmarkResult(candidate, metrics);
      const entry = { candidate, metrics, score };
      scored.push(entry);

      if (!bestEntry || score > bestEntry.score) {
        bestEntry = entry;
      }

      if ((index + 1) % batchSize === 0 || index === candidates.length - 1) {
        const progress = Math.min(index + 1, candidates.length);
        setTuningMessage(buildProgressMessage(progress, candidates.length, scored, metrics, bestEntry));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const best = bestEntry;
    const { candidate, metrics } = best;
    const currentBalanced = readBalancedProfile();
    const currentBestScore = currentBalanced ? Number(currentBalanced.score || 0) : 0;

    if (!currentBalanced || best.score > currentBestScore) {
      const nextBalanced = { ...DEFAULT_CONFIG, ...candidate, ...BALANCED_DEFAULTS };
      const nextScore = best.score;
      Object.assign(BALANCED_DEFAULTS, nextBalanced);
      persistBalancedProfile(nextBalanced, nextScore);
    }

    state.config = { ...DEFAULT_CONFIG, ...BALANCED_DEFAULTS };
    applyConfigToInputs(state.config);
    persistConfig();

    setBenchmarkStatus('done', 'Concluído');
    setTuningMessage(`Melhor perfil encontrado: score ${best.score.toFixed(2)}. População final ${metrics.finalPopulation}; comida ${metrics.foodCount}; reprodução total ${metrics.asexualReproductionCount + metrics.sexualReproductionCount}; predação ${metrics.predationCount}.`);
  } finally {
    ui.benchmarkBtn.disabled = false;
    ui.balancedDefaultsBtn.disabled = false;
    ui.benchmarkBtn.textContent = 'Executar tuning (100)';
    state.benchmarking = false;
    state.paused = false;
    resetSimulation();
  }
}

function spawnFood(count = 30) {
  const { foodEnergyMinPercent, foodEnergyMaxPercent, baseEnergy } = state.config;
  while (state.food.length < count) {
    state.food.push({
      x: randomBetween(20, state.config.worldWidth - 20),
      y: randomBetween(20, state.config.worldHeight - 20),
      energy: randomBetween(foodEnergyMinPercent * baseEnergy, foodEnergyMaxPercent * baseEnergy),
      radius: 5,
    });
  }
}

function createRandomPopulation(size = state.config.initialPopulation) {
  const population = [];
  for (let i = 0; i < size; i += 1) {
    population.push(createIndividual(
      randomBetween(30, state.config.worldWidth - 30),
      randomBetween(30, state.config.worldHeight - 30),
      randomGenes(),
      state.config,
    ));
  }
  state.population = population;
}

function loadPopulationFromSave(save) {
  const config = { ...DEFAULT_CONFIG, ...(save.config || {}) };
  state.config = config;
  state.nextId = 1;

  state.population = (save.population || []).map((entity) => {
    const recovered = {
      ...entity,
      id: entity.id ?? state.nextId++,
      genes: Array.isArray(entity.genes) ? entity.genes : randomGenes(),
      color: getGeneColor(Array.isArray(entity.genes) ? entity.genes : randomGenes()),
      alive: true,
      radius: 8,
      life: Number(entity.life ?? entity.maxLife ?? config.initialLife),
      maxLife: Number(entity.maxLife ?? entity.life ?? config.initialLife),
      energy: Number(entity.energy ?? (config.initialEnergyPercent * config.baseEnergy)),
    };
    recovered.radius = getIndividualRadius(recovered);
    state.nextId = Math.max(state.nextId, recovered.id + 1);
    return recovered;
  });

  state.generation = save.generation ?? 0;
  state.food = (save.food || []).map((item) => ({ ...item }));
  state.nextFoodSpawn = state.config.foodSpawnRate;
  applyConfigToInputs();
  renderSaveList();
}

function applyConfigToInputs(config = state.config) {
  const activeConfig = config || DEFAULT_CONFIG;
  ui.initialPopulation.value = activeConfig.initialPopulation ?? DEFAULT_CONFIG.initialPopulation;
  ui.initialEnergyPercent.value = activeConfig.initialEnergyPercent ?? DEFAULT_CONFIG.initialEnergyPercent;
  ui.initialLife.value = activeConfig.initialLife ?? DEFAULT_CONFIG.initialLife;
  ui.energyCost.value = activeConfig.energyCost ?? DEFAULT_CONFIG.energyCost;
  ui.baseEnergy.value = activeConfig.baseEnergy ?? DEFAULT_CONFIG.baseEnergy;
  ui.foodEnergyMinPercent.value = activeConfig.foodEnergyMinPercent ?? DEFAULT_CONFIG.foodEnergyMinPercent;
  ui.foodEnergyMaxPercent.value = activeConfig.foodEnergyMaxPercent ?? DEFAULT_CONFIG.foodEnergyMaxPercent;
  ui.mutationRate.value = activeConfig.mutationRate ?? DEFAULT_CONFIG.mutationRate;
  ui.crossoverSimilarity.value = activeConfig.crossoverSimilarity ?? DEFAULT_CONFIG.crossoverSimilarity;
  ui.reproductionThresholdPercent.value = activeConfig.reproductionThresholdPercent ?? DEFAULT_CONFIG.reproductionThresholdPercent;
  ui.asexualReproductionCostPercent.value = activeConfig.asexualReproductionCostPercent ?? DEFAULT_CONFIG.asexualReproductionCostPercent;
  ui.sexualReproductionCostPercent.value = activeConfig.sexualReproductionCostPercent ?? DEFAULT_CONFIG.sexualReproductionCostPercent;
  ui.childEnergyPercent.value = activeConfig.childEnergyPercent ?? DEFAULT_CONFIG.childEnergyPercent;
  ui.predatorFactor.value = activeConfig.predatorFactor ?? DEFAULT_CONFIG.predatorFactor;
  ui.maxFood.value = activeConfig.maxFood ?? DEFAULT_CONFIG.maxFood;
  ui.foodSpawnRate.value = activeConfig.foodSpawnRate ?? DEFAULT_CONFIG.foodSpawnRate;
  ui.jumpEnergyPercent.value = activeConfig.jumpEnergyPercent ?? DEFAULT_CONFIG.jumpEnergyPercent;
  ui.jumpDistanceMultiplier.value = activeConfig.jumpDistanceMultiplier ?? DEFAULT_CONFIG.jumpDistanceMultiplier;
}

function resetSimulation() {
  const currentConfig = { ...DEFAULT_CONFIG, ...state.config };
  state.config = currentConfig;
  applyConfigToInputs(state.config);
  state.population = [];
  state.food = [];
  state.generation = 0;
  state.predationCount = 0;
  state.asexualReproductionCount = 0;
  state.sexualReproductionCount = 0;
  state.nextFoodSpawn = state.config.foodSpawnRate;
  state.nextId = 1;
  createRandomPopulation(state.config.initialPopulation);
  spawnFood(state.config.maxFood);
  updateStats();
}

function getNearestFood(organism) {
  let nearest = null;
  for (const food of state.food) {
    const dx = food.x - organism.x;
    const dy = food.y - organism.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;
    if (!nearest || dist < nearest.distance) {
      nearest = { ...food, distance: dist, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }
  }
  return nearest;
}

function getNearestCreature(organism) {
  let nearest = null;
  for (const other of state.population) {
    if (other.id === organism.id || !other.alive) continue;
    const dx = other.x - organism.x;
    const dy = other.y - organism.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0) continue;
    const similarity = computeGeneSimilarity(organism.genes, other.genes);
    if (!nearest || distance < nearest.distance) {
      nearest = {
        target: other,
        distance,
        angle: Math.atan2(dy, dx) * 180 / Math.PI,
        energy: other.energy,
        similarity,
      };
    }
  }
  return nearest;
}

function buildInputVector(organism, nearestCreature, nearestFood) {
  const closestCreature = nearestCreature || null;
  const closestFood = nearestFood || null;
  const baseEnergyNormalization = state.config.baseEnergy;

  return [
    closestCreature ? clamp(1 / (closestCreature.distance + 1), 0, 1) : 0,
    closestCreature ? clamp(closestCreature.energy / baseEnergyNormalization, 0, 1) : 0,
    closestCreature ? closestCreature.similarity : 0,
    closestCreature ? clamp((Math.atan2(Math.sin(toRadians(closestCreature.angle - organism.angle)), Math.cos(toRadians(closestCreature.angle - organism.angle))) + Math.PI) / (2 * Math.PI), 0, 1) : 0.5,
    closestFood ? clamp(1 / (closestFood.distance + 1), 0, 1) : 0,
    closestFood ? clamp(closestFood.energy / baseEnergyNormalization, 0, 1) : 0,
    closestFood ? clamp((Math.atan2(Math.sin(toRadians(closestFood.angle - organism.angle)), Math.cos(toRadians(closestFood.angle - organism.angle))) + Math.PI) / (2 * Math.PI), 0, 1) : 0.5,
    clamp(organism.energy / baseEnergyNormalization, 0, 1),
    clamp(organism.life / organism.maxLife, 0, 1),
  ];
}

function evaluateOrganism(organism) {
  const nearestCreature = getNearestCreature(organism);
  const nearestFood = getNearestFood(organism);
  const inputs = buildInputVector(organism, nearestCreature, nearestFood);
  const outputs = forwardNetwork(organism.genes, inputs);

  return {
    outputs,
    inputs,
    nearestCreature,
    nearestFood,
  };
}

function steerOrganism(organism) {
  const { outputs, nearestCreature, nearestFood } = evaluateOrganism(organism);

  const [turn, thrust, seekFood, flee, attack, asexual, sexual, jump] = outputs;
  const turnAmount = (turn - 0.5) * 2;
  organism.angle += turnAmount * 0.18;

  let moveX = Math.cos(organism.angle) * (thrust * 2.2 + 0.3);
  let moveY = Math.sin(organism.angle) * (thrust * 2.2 + 0.3);

  if (nearestFood && seekFood > 0.5) {
    const targetAngle = Math.atan2(nearestFood.y - organism.y, nearestFood.x - organism.x);
    const diff = angleDifference(organism.angle * 180 / Math.PI, targetAngle * 180 / Math.PI);
    organism.angle += (diff / 180) * 0.2;
    moveX += Math.cos(organism.angle) * 1.2;
    moveY += Math.sin(organism.angle) * 1.2;
  }

  if (nearestCreature && flee > 0.6) {
    const avoidAngle = Math.atan2(organism.y - nearestCreature.target.y, organism.x - nearestCreature.target.x);
    organism.angle += (angleDifference(organism.angle * 180 / Math.PI, avoidAngle * 180 / Math.PI) / 180) * 0.5;
  }

  const sameSpeciesSimilarityThreshold = state.config.crossoverSimilarity;
  const isSameSpecies = nearestCreature ? nearestCreature.similarity >= sameSpeciesSimilarityThreshold : false;
  const isDifferentSpecies = nearestCreature ? nearestCreature.similarity < sameSpeciesSimilarityThreshold : false;

  if (nearestCreature && isDifferentSpecies && attack > 0.7 && organism.energy > nearestCreature.target.energy * state.config.predatorFactor) {
    organism.lastAction = 'attack';
    const dx = nearestCreature.target.x - organism.x;
    const dy = nearestCreature.target.y - organism.y;
    const dist = Math.hypot(dx, dy);
    if (dist < organism.radius + nearestCreature.target.radius + 5) {
      const prey = nearestCreature.target;
      organism.energy += prey.energy;
      prey.energy = 0;
      prey.alive = false;
      state.predationCount += 1;
      organism.lastAction = 'consumed';
    }
  } else {
    organism.lastAction = 'move';
  }

  if (jump > 0.6) {
    const jumpEnergyCost = organism.energy * state.config.jumpEnergyPercent;
    if (jumpEnergyCost > 0) {
      const jumpDistance = organism.radius * state.config.jumpDistanceMultiplier;
      moveX += Math.cos(organism.angle) * jumpDistance;
      moveY += Math.sin(organism.angle) * jumpDistance;
      organism.energy -= jumpEnergyCost;
      organism.lastAction = 'jump';
    }
  }

  organism.x += moveX;
  organism.y += moveY;
  organism.x = clamp(organism.x, 0, state.config.worldWidth);
  organism.y = clamp(organism.y, 0, state.config.worldHeight);

  organism.energy -= state.config.energyCost;
  organism.life -= 0.35;

  const reproductionThreshold = state.config.reproductionThresholdPercent * state.config.baseEnergy;
  if (organism.energy > reproductionThreshold && asexual > 0.7) {
    reproduceAssexually(organism);
  }

  if (nearestCreature && isSameSpecies && sexual > 0.75) {
    reproduceSexually(organism);
  }

  return { outputs, nearestCreature, nearestFood };
}

function reproduceAssexually(parent) {
  const asexualCost = state.config.asexualReproductionCostPercent * state.config.baseEnergy;
  if (parent.energy < asexualCost) return;

  const childGenes = mutateGenes(parent.genes.slice(), state.config.mutationRate);
  const child = createIndividual(
    clamp(parent.x + randomBetween(-18, 18), 20, state.config.worldWidth - 20),
    clamp(parent.y + randomBetween(-18, 18), 20, state.config.worldHeight - 20),
    childGenes,
    state.config,
  );

  const childEnergyAbsolute = state.config.childEnergyPercent * state.config.baseEnergy;
  child.energy = childEnergyAbsolute;
  child.life = state.config.initialLife;
  child.maxLife = state.config.initialLife;
  parent.energy -= asexualCost;
  state.population.push(child);
  state.generation += 1;
  state.asexualReproductionCount += 1;
}

function reproduceSexually(parent) {
  let partner = null;
  let bestSimilarity = 0;

  for (const other of state.population) {
    if (other.id === parent.id || !other.alive) continue;
    const similarity = computeGeneSimilarity(parent.genes, other.genes);
    if (similarity >= state.config.crossoverSimilarity && similarity > bestSimilarity) {
      partner = other;
      bestSimilarity = similarity;
    }
  }

  const sexualCost = state.config.sexualReproductionCostPercent * state.config.baseEnergy;
  if (!partner || parent.energy < sexualCost || partner.energy < sexualCost) {
    return;
  }

  const childGenes = combineGenes(parent.genes, partner.genes);
  const mutated = mutateGenes(childGenes, state.config.mutationRate);
  const child = createIndividual(
    clamp((parent.x + partner.x) / 2 + randomBetween(-16, 16), 18, state.config.worldWidth - 18),
    clamp((parent.y + partner.y) / 2 + randomBetween(-16, 16), 18, state.config.worldHeight - 18),
    mutated,
    state.config,
  );

  const childEnergyAbsolute = state.config.childEnergyPercent * state.config.baseEnergy;
  child.energy = childEnergyAbsolute;
  child.life = state.config.initialLife;
  child.maxLife = state.config.initialLife;
  parent.energy -= sexualCost;
  partner.energy -= sexualCost;
  state.population.push(child);
  state.generation += 1;
  state.sexualReproductionCount += 1;
}

function updateFood() {
  const { foodSpawnRate, maxFood, baseEnergy, foodEnergyMinPercent, foodEnergyMaxPercent } = state.config;
  state.nextFoodSpawn -= 1;
  if (state.food.length < maxFood && state.nextFoodSpawn <= 0) {
    state.food.push({
      x: randomBetween(20, state.config.worldWidth - 20),
      y: randomBetween(20, state.config.worldHeight - 20),
      energy: randomBetween(foodEnergyMinPercent * baseEnergy, foodEnergyMaxPercent * baseEnergy),
      radius: 5,
    });
    state.nextFoodSpawn = foodSpawnRate;
  }
}

function handleFoodCollection(organism) {
  for (let i = state.food.length - 1; i >= 0; i -= 1) {
    const food = state.food[i];
    const distance = Math.hypot(food.x - organism.x, food.y - organism.y);
    if (distance <= organism.radius + food.radius + 2) {
      organism.energy += food.energy;
      state.food.splice(i, 1);
      organism.lastAction = 'eat';
    }
  }
}

function updatePopulation() {
  for (let i = state.population.length - 1; i >= 0; i -= 1) {
    const organism = state.population[i];
    if (!organism.alive) {
      state.population.splice(i, 1);
      continue;
    }

    steerOrganism(organism);
    handleFoodCollection(organism);

    if (organism.energy <= 0 || organism.life <= 0) {
      organism.alive = false;
      state.population.splice(i, 1);
      continue;
    }
  }
}

function updateStats() {
  ui.populationStat.textContent = `População: ${state.population.length}`;
  ui.foodStat.textContent = `Comida: ${state.food.length}`;
  ui.generationStat.textContent = `Geração: ${state.generation}`;
  ui.predationStat.textContent = `Predação: ${state.predationCount}`;
  ui.asexualStat.textContent = `Reprodução assexuada: ${state.asexualReproductionCount}`;
  ui.sexualStat.textContent = `Reprodução sexuada: ${state.sexualReproductionCount}`;
}

function setFastMode(enabled) {
  state.fastMode = enabled;
  if (state.fastLoopHandle) {
    clearTimeout(state.fastLoopHandle);
    state.fastLoopHandle = null;
  }

  if (enabled) {
    state.paused = false;
    ui.fastModeBtn.textContent = 'Voltar ao modo normal';
    ui.fastModeBtn.classList.add('active');

    const runFastCycle = () => {
      if (!state.fastMode) return;

      const steps = 80;
      for (let i = 0; i < steps; i += 1) {
        updateFood();
        updatePopulation();
      }

      // Atualizar estatísticas a cada ciclo
      updateStats();

      state.fastLoopHandle = setTimeout(runFastCycle, 0);
    };

    runFastCycle();
    return;
  }

  ui.fastModeBtn.textContent = 'Modo treino rápido';
  ui.fastModeBtn.classList.remove('active');
}

function drawFood() {
  for (const food of state.food) {
    ctx.beginPath();
    ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#7ef4c2';
    ctx.fill();
    ctx.closePath();
  }
}

function drawPopulation() {
  for (const organism of state.population) {
    organism.radius = getIndividualRadius(organism);

    ctx.beginPath();
    ctx.arc(organism.x, organism.y, organism.radius, 0, Math.PI * 2);
    ctx.fillStyle = organism.color;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(organism.x, organism.y);
    ctx.lineTo(
      organism.x + Math.cos(organism.angle) * (organism.radius + 10),
      organism.y + Math.sin(organism.angle) * (organism.radius + 10),
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = '#edf5ff';
    ctx.font = '11px sans-serif';
    ctx.fillText(String(Math.max(0, Math.ceil(organism.life))), organism.x - 10, organism.y - 15);
  }
}

function render() {
  ctx.clearRect(0, 0, state.config.worldWidth, state.config.worldHeight);
  drawFood();
  drawPopulation();
  updateStats();
}

function tick(timestamp) {
  if (state.benchmarking) {
    state.lastTimestamp = timestamp;
    requestAnimationFrame(tick);
    return;
  }

  if (state.fastMode) {
    state.lastTimestamp = timestamp;
    requestAnimationFrame(tick);
    return;
  }

  if (!state.paused) {
    const elapsed = timestamp - state.lastTimestamp || 16;
    state.lastTimestamp = timestamp;
    const slowFactor = 0.35;
    const steps = Math.max(1, Math.round((elapsed / 16) * slowFactor));

    for (let i = 0; i < steps; i += 1) {
      updateFood();
      updatePopulation();
    }
    render();
  } else {
    state.lastTimestamp = timestamp;
    render();
  }
  requestAnimationFrame(tick);
}

function readSaves() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.saves = raw ? JSON.parse(raw) : [];
  } catch (error) {
    state.saves = [];
  }
}

function writeSaves() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saves));
  renderSaveList();
}

function renderSaveList() {
  ui.saveList.innerHTML = '';
  if (!state.saves.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Nenhum save disponível';
    ui.saveList.appendChild(option);
    return;
  }

  state.saves.forEach((save) => {
    const option = document.createElement('option');
    option.value = save.id;
    option.textContent = `${save.name} — ${new Date(save.savedAt).toLocaleString()}`;
    ui.saveList.appendChild(option);
  });
}

function saveCurrentPopulation() {
  const name = (ui.saveName.value || `save-${new Date().toISOString().slice(0, 16)}`).trim();
  const payload = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    savedAt: new Date().toISOString(),
    config: { ...state.config },
    generation: state.generation,
    population: state.population.map((creature) => ({
      ...creature,
      color: undefined,
    })),
    food: state.food,
  };

  state.saves = [payload, ...state.saves];
  writeSaves();
  ui.saveName.value = '';
}

function deleteSelectedSave() {
  const selected = ui.saveList.value;
  if (!selected) return;
  state.saves = state.saves.filter((save) => save.id !== selected);
  writeSaves();
}

function loadSelectedSave() {
  const selected = ui.saveList.value;
  const save = state.saves.find((item) => item.id === selected);
  if (!save) return;
  loadPopulationFromSave(save);
}

function setupEvents() {
  ui.newSimulationBtn.addEventListener('click', () => {
    setConfigFromInputs();
    setFastMode(false);
    resetSimulation();
  });

  ui.fastModeBtn.addEventListener('click', () => {
    setFastMode(!state.fastMode);
  });

  ui.benchmarkBtn.addEventListener('click', () => {
    runBenchmark();
  });

  ui.balancedDefaultsBtn.addEventListener('click', () => {
    applyBalancedDefaults();
  });

  Object.values(ui).forEach((element) => {
    if (element && typeof element.addEventListener === 'function' && (element.tagName === 'INPUT' || element.tagName === 'SELECT')) {
      element.addEventListener('input', () => {
        setConfigFromInputs();
      });
    }
  });

  ui.togglePauseBtn.addEventListener('click', () => {
    if (state.fastMode) {
      setFastMode(false);
      return;
    }

    state.paused = !state.paused;
    ui.togglePauseBtn.textContent = state.paused ? 'Continuar' : 'Pausar';
  });

  ui.saveBtn.addEventListener('click', saveCurrentPopulation);
  ui.loadSaveBtn.addEventListener('click', loadSelectedSave);
  ui.deleteSaveBtn.addEventListener('click', deleteSelectedSave);
}

function init() {
  const savedConfig = readConfig();
  if (savedConfig) {
    state.config = { ...DEFAULT_CONFIG, ...savedConfig };
    applyConfigToInputs();
  }

  const savedBalanced = readBalancedProfile();
  if (savedBalanced && savedBalanced.balance) {
    Object.assign(BALANCED_DEFAULTS, savedBalanced.balance);
  }

  readSaves();
  renderSaveList();
  setupEvents();
  resetSimulation();
  requestAnimationFrame(tick);
}

init();
