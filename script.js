// PARAMETERS (state)
const state = {
  currentScene: 0
};

const W = 900, H = 360;
const M = { top: 30, right: 30, bottom: 50, left: 60 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

const svg = d3.select('#chart');
const chartLayer = svg.append('g')
  .attr('transform', `translate(${M.left},${M.top})`);

const DATA_URL = "https://raw.githubusercontent.com/plotly/datasets/master/gapminderDataFiveYear.csv";

let GAPMINDER_DATA; 

d3.csv(DATA_URL, d3.autoType).then(data => {
  GAPMINDER_DATA = data;
  init();
}).catch(err => {
  console.error("Failed to load data:", err);
});

function computeGlobalTrend() {
  const byYear = d3.group(GAPMINDER_DATA, d => d.year);
  const result = [];
  byYear.forEach((rows, year) => {
    const totalPop = d3.sum(rows, d => d.pop);
    const weightedLifeExp = d3.sum(rows, d => d.lifeExp * d.pop) / totalPop;
    result.push({ year: year, lifeExp: weightedLifeExp });
  });
  result.sort((a, b) => a.year - b.year);
  return result;
}

function addAnnotation(x, y, label, color) {
  const nearRightEdge = x > IW - 120;
  const dx = nearRightEdge ? -14 : 14;
  const textAnchor = nearRightEdge ? 'end' : 'start';

  chartLayer.append('circle')
    .attr('cx', x)
    .attr('cy', y)
    .attr('r', 4)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 2);

  chartLayer.append('line')
    .attr('x1', x).attr('y1', y)
    .attr('x2', x + dx).attr('y2', y - 14)
    .attr('stroke', color)
    .attr('stroke-width', 1);

  chartLayer.append('text')
    .attr('x', x + dx + (nearRightEdge ? -4 : 4))
    .attr('y', y - 16)
    .attr('text-anchor', textAnchor)
    .attr('font-size', 12)
    .attr('font-weight', 'bold')
    .attr('fill', color)
    .text(label);
}

//Scene 1
function renderScene1() {
  const data = computeGlobalTrend();

  const x = d3.scaleLinear().domain([1952, 2007]).range([0, IW]);
  const y = d3.scaleLinear().domain([40, 75]).range([IH, 0]);

  chartLayer.append('g')
    .attr('transform', `translate(0,${IH})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')));

  chartLayer.append('g').call(d3.axisLeft(y));

  const line = d3.line().x(d => x(d.year)).y(d => y(d.lifeExp));

  const last = data[data.length - 1];
  addAnnotation(x(last.year), y(last.lifeExp), "68.9 years by 2007", "#5C7A5E");
  chartLayer.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2.5)
    .attr('d', line);
}

function computeContinentTrends() {
  const grouped = d3.group(GAPMINDER_DATA, d => d.continent, d => d.year);
  const result = {};

  grouped.forEach((yearMap, continent) => {
    const series = [];
    yearMap.forEach((rows, year) => {
      const totalPop = d3.sum(rows, d => d.pop);
      const weightedLifeExp = d3.sum(rows, d => d.lifeExp * d.pop) / totalPop;
      series.push({ year: year, lifeExp: weightedLifeExp });
    });
    series.sort((a, b) => a.year - b.year);
    result[continent] = series;
  });

  return result;
}

//Scene 2
function renderScene2() {
  const dataByContinent = computeContinentTrends();
  const continents = Object.keys(dataByContinent);

  const x = d3.scaleLinear().domain([1952, 2007]).range([0, IW]);
  const y = d3.scaleLinear().domain([35, 85]).range([IH, 0]);

  chartLayer.append('g')
    .attr('transform', `translate(0,${IH})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')));

  chartLayer.append('g').call(d3.axisLeft(y));

  const color = d3.scaleOrdinal()
    .domain(continents)
      .range(['#B8623F', '#5C7A5E', '#7A3B3B', '#3D5A6C', '#9B7A4E']);

  const line = d3.line().x(d => x(d.year)).y(d => y(d.lifeExp));

  continents.forEach(continent => {
    chartLayer.append('path')
      .datum(dataByContinent[continent])
      .attr('fill', 'none')
      .attr('stroke', color(continent))
      .attr('stroke-width', 2.5)
      .attr('d', line);

    const series = dataByContinent[continent];
    const last = series[series.length - 1];
    addAnnotation(x(last.year), y(last.lifeExp), continent, color(continent));
  });
}

//Scene 3
function renderScene3() {
  const data2007 = GAPMINDER_DATA.filter(d => d.year === 2007);

  // log scale for income — GDP per capita spans a huge range ($200s to $100,000+)
  const x = d3.scaleLog().domain([200, 120000]).range([0, IW]);
  const y = d3.scaleLinear().domain([35, 85]).range([IH, 0]);

  chartLayer.append('g')
    .attr('transform', `translate(0,${IH})`)
    .call(d3.axisBottom(x).ticks(5, "~s"));

  chartLayer.append('g').call(d3.axisLeft(y));

  const continents = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
  const color = d3.scaleOrdinal()
    .domain(continents)
      .range(['#7A3B3B', '#3D5A6C', '#B8623F', '#5C7A5E', '#9B7A4E']);

  // one dot per country
  chartLayer.selectAll('circle')
    .data(data2007)
    .join('circle')
    .attr('cx', d => x(d.gdpPercap))
    .attr('cy', d => y(d.lifeExp))
    .attr('r', 4)
    .attr('fill', d => color(d.continent))
    .attr('opacity', 0.75);

  // callout for Vietnam (overperformer)
  const vietnam = data2007.find(d => d.country === 'Vietnam');
  addAnnotation(x(vietnam.gdpPercap), y(vietnam.lifeExp), "Vietnam: high health, low income", "#5C7A5E");

  // callout for South Africa (underperformer)
  const safrica = data2007.find(d => d.country === 'South Africa');
  addAnnotation(x(safrica.gdpPercap), y(safrica.lifeExp), "South Africa: AIDS epidemic", "#7A3B3B");
}

//Scene 4
// PARAMETER: which countries the reader has selected (starts empty)
let selectedCountries = [];

function computeCountryTrajectory(country) {
  return GAPMINDER_DATA
    .filter(d => d.country === country)
    .sort((a, b) => a.year - b.year);
}

function renderScene4() {
  const x = d3.scaleLog().domain([200, 120000]).range([0, IW]);
  const y = d3.scaleLinear().domain([35, 85]).range([IH, 0]);

  chartLayer.append('g')
    .attr('transform', `translate(0,${IH})`)
    .call(d3.axisBottom(x).ticks(5, "~s"));

  chartLayer.append('g').call(d3.axisLeft(y));

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const line = d3.line().x(d => x(d.gdpPercap)).y(d => y(d.lifeExp));

  selectedCountries.forEach(country => {
    const traj = computeCountryTrajectory(country);

    // the path connecting all 12 years
    chartLayer.append('path')
      .datum(traj)
      .attr('fill', 'none')
      .attr('stroke', color(country))
      .attr('stroke-width', 2)
      .attr('d', line);

    // a dot at each year
    chartLayer.selectAll(`.dot-${country.replace(/\s/g, '')}`)
      .data(traj)
      .join('circle')
      .attr('cx', d => x(d.gdpPercap))
      .attr('cy', d => y(d.lifeExp))
      .attr('r', 3)
      .attr('fill', color(country));

    // label at the final (2007) point
    const last = traj[traj.length - 1];
    addAnnotation(x(last.gdpPercap), y(last.lifeExp), country, color(country));
  });
}

// TRIGGER: whenever a checkbox changes, update selectedCountries and redraw
document.querySelectorAll('.country-check').forEach(box => {
  box.addEventListener('change', () => {
    selectedCountries = Array.from(document.querySelectorAll('.country-check:checked'))
      .map(b => b.value);
    if (state.currentScene === 3) { // only redraw if we're actually on Scene 4
      chartLayer.selectAll('*').remove();
      renderScene4();
    }
  });
});

// SCENES — each one describes its narrative text and which function draws it
const scenes = [
  {
    title: "The world got healthier.",
    body: "Global life expectancy, population-weighted, from 1952 to 2007. It rose from 48.9 years to 68.9 — a 20-year gain in half a century.",
    render: renderScene1
  },
  {
    title: "Asia made the biggest leap.",
    body: "Split by continent, the same 55 years look very different. Asia gained 26.5 years — more than any other continent — while Africa's 15.8-year gain still leaves it furthest behind.",
    render: renderScene2
  },
  {
    title: "But money and health don't always move together.",
    body: "In 2007, Vietnam had 74 years of life expectancy on very little income. Several Southern African nations, despite far higher income, had life expectancy in the 40s and 50s — the toll of the HIV/AIDS epidemic.",
    render: renderScene3
  },
  {
    title: "Now explore it yourself.",
    body: "Check any countries below to trace their path from 1952 to 2007 — income on the x-axis, life expectancy on the y-axis.",
    render: renderScene4
  }

];

// Update the text and re-draw the chart for whichever scene is active
function goToScene(i) {
  state.currentScene = i;

  document.getElementById('scene-title').textContent = scenes[i].title;
  document.getElementById('scene-body').textContent = scenes[i].body;
  document.getElementById('country-picker').style.display = (i === 3) ? 'flex' : 'none';

  document.getElementById('btn-back').disabled = (i === 0);
  document.getElementById('btn-next').disabled = (i === scenes.length - 1);

  chartLayer.selectAll('*').remove(); 
  scenes[i].render();                 
}

// TRIGGERS — connect button clicks to state changes
document.getElementById('btn-next').addEventListener('click', () => {
  if (state.currentScene < scenes.length - 1) {
    goToScene(state.currentScene + 1);
  }
});

document.getElementById('btn-back').addEventListener('click', () => {
  if (state.currentScene > 0) {
    goToScene(state.currentScene - 1);
  }
});

function init() {
  goToScene(0); 
}

