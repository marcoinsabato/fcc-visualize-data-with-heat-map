// Cache DOM elements
const DOM = {
    chartContainer: document.querySelector("#chart-container"),
    blockedInfo: document.querySelector("#blocked-info"),
    tooltip: document.querySelector("#tooltip"),
    tooltipLabel: document.querySelector("#tooltip-label"),
    comparison: document.querySelector("#comparison"),
    totalItems: document.querySelector('#total-items'),
    maxValue: document.querySelector('#max-value'),
    minValue: document.querySelector('#min-value'),
};

// Utility functions
const formatTemperature = (temp) => `${temp.toFixed(1)}°C`;

// Heatmap variables
let baseTemp;
let values = [];
let xScale;
let yScale;

const renderInfoCard = (info) => {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    const temperature = baseTemp + info.variance;
    
    return `
        <div class="space-y-1">
            <div><span class="font-medium">Year:</span> ${info.year}</div>
            <div><span class="font-medium">Month:</span> ${monthNames[info.month - 1]}</div>
            <div><span class="font-medium">Temperature:</span> ${formatTemperature(temperature)}</div>
            <div><span class="font-medium">Variance:</span> ${info.variance > 0 ? '+' : ''}${info.variance.toFixed(1)}°C</div>
        </div>
    `;
};

// Update blocked info DOM
const updateBlockedInfoDOM = (info) => {
    DOM.blockedInfo.innerHTML = info === null 
        ? 'Click a cell to view details'
        : renderInfoCard(info);
};

// Proxy for reactive state management
const blockedInfoState = { value: null };
const blockedInfo = new Proxy(blockedInfoState, {
    set(target, property, value) {
        target[property] = value;
        if (property === 'value') {
            updateBlockedInfoDOM(value);
        }
        return true;
    }
});

const getCellColor = (variance) => {
    if (variance <= -1) {
        return 'SteelBlue';
    } else if (variance <= 0) {
        return 'LightSteelBlue';
    } else if (variance <= 1) {
        return 'Orange';
    } else {
        return 'Crimson';
    }
};


// Event handlers
const handleCellClick = (event, info) => {
    document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    blockedInfo.value = info;
};

const handleCellMouseOver = (dataXValue, item) => {
    DOM.tooltipLabel.innerHTML = renderInfoCard(item);
    DOM.tooltip.setAttribute('data-year', dataXValue);
    DOM.tooltip.classList.remove('hidden');
};

const handleCellMouseOut = () => {
    DOM.tooltip.classList.add('hidden');
};

// Main chart generation
const generateChart = async () => {
    const response = await fetch('https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json');
    const data = await response.json();

    baseTemp = data.baseTemperature;
    values = data.monthlyVariance;
    
    DOM.chartContainer.innerHTML = "";

    // Chart dimensions
    const width = DOM.chartContainer.offsetWidth;
    const height = 600;
    const padding = 60;
    
    // Update statistics
    DOM.totalItems.textContent = values.length;
    const temperatures = values.map(d => baseTemp + d.variance);
    DOM.maxValue.textContent = formatTemperature(Math.max(...temperatures));
    DOM.minValue.textContent = formatTemperature(Math.min(...temperatures));
    
    // Create SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    
    // Create Scales
    const minYear = d3.min(values, (item) => item.year);
    const maxYear = d3.max(values, (item) => item.year);
    const yearCount = maxYear - minYear;

    xScale = d3.scaleLinear()
        .domain([minYear, maxYear + 1])
        .range([padding, width - padding]);

    yScale = d3.scaleTime()
        .domain([new Date(0, 0, 0, 0, 0, 0, 0), new Date(0, 12, 0, 0, 0, 0, 0)])
        .range([padding, height - padding]);

    // Draw axes
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.format('d'));

    const yAxis = d3.axisLeft(yScale)
        .tickFormat(d3.timeFormat('%B'));

    svg.append('g')
        .call(xAxis)
        .attr('id', 'x-axis')
        .attr('transform', `translate(0, ${height - padding})`);

    svg.append('g')
        .call(yAxis)
        .attr('id', 'y-axis')
        .attr('transform', `translate(${padding}, 0)`);

    // Draw Heatmap

    svg.selectAll('rect')
        .data(values)
        .enter()
        .append('rect')
        .attr('class', 'cell')
        .attr('fill', (item) => getCellColor(item.variance))
        .attr('data-year', (item) => item.year)
        .attr('data-month', (item) => item.month - 1)
        .attr('data-temp', (item) => baseTemp + item.variance)
        .attr('height', () => (height - (2 * padding)) / 12)
        .attr('y', (item) => yScale(new Date(0, item.month - 1, 0, 0, 0, 0, 0)))
        .attr('width', () => (width - (2 * padding)) / yearCount)
        .attr('x', (item) => xScale(item.year))
        .on('click', (ev, info) => {
            handleCellClick(ev, info);
        })
        .on('mouseover', (ev, item) => {
            const dataXValue = ev.currentTarget.getAttribute('data-year');
            handleCellMouseOver(dataXValue, item);
        })
        .on('mouseout', handleCellMouseOut);
};

// Debounce function to optimize resize performance
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Initialize chart and observe resize with debouncing
const debouncedGenerateChart = debounce(generateChart, 500);

const resizeObserver = new ResizeObserver(() => {
    debouncedGenerateChart();
});

resizeObserver.observe(DOM.chartContainer);

// Initial chart generation
generateChart();
