// Cache DOM elements
const DOM = {
    chartContainer: document.querySelector("#chart-container"),
    blockedInfo: document.querySelector("#blocked-info"),
    tooltip: document.querySelector("#tooltip"),
    comparison: document.querySelector("#comparison"),
    totalItems: document.querySelector('#total-items'),
    maxValue: document.querySelector('#max-value'),
    minValue: document.querySelector('#min-value'),
};

// Utility functions
const formatGDP = (gdp) => `$${parseFloat(gdp).toFixed(2)} Billion`;

const calculateDateDifference = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const yearsDiff = d1.getFullYear() - d2.getFullYear();
    const monthsDiff = d1.getMonth() - d2.getMonth();
    const totalMonths = yearsDiff * 12 + monthsDiff;
    const absMonths = Math.abs(totalMonths);
    return `${Math.floor(absMonths / 12)} years and ${absMonths % 12} months`;
};

const renderInfoCard = (info) => `
    <div class="space-y-1">
        <div><span class="font-medium">Name:</span> ${info.Name} , ${info.Nationality}</div>
        <div><span class="font-medium">Year:</span> ${info.Year} <span class="font-medium">Time:</span> ${info.Time}</div>
        ${info.Doping ? `<div><span class="font-medium">Doping:</span> ${info.Doping}</div>` : ''}
    </div>
`;

// Update blocked info DOM
const updateBlockedInfoDOM = (info) => {
    DOM.blockedInfo.innerHTML = info === null 
        ? 'Click a dot to block details'
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

const calculateAverageIncrease = (data) => {
    const increases = data.map(([d, v] , i) =>{ 
        if (i === 0) return v;
        return parseFloat(v) - parseFloat(data[i - 1][1])
    });

    return (increases.reduce((a, b) => a + b, 0) / increases.length).toFixed(2);
};


// Event handlers
const handleBarClick = (event,info) => {
    document.querySelectorAll('.dot').forEach(bar => bar.classList.remove('fill-indigo-500'));
    event.currentTarget.classList.add('fill-indigo-500');
    blockedInfo.value = info;
};

const handleBarMouseOver = (dataXValue , info) => {
    DOM.tooltip.innerHTML = renderInfoCard(info);
    DOM.tooltip.setAttribute('data-year', dataXValue);
    DOM.tooltip.classList.remove('hidden');

};

const handleBarMouseOut = () => {
    DOM.tooltip.classList.add('hidden');
    DOM.comparison.innerHTML = '';
};

// Main chart generation
const generateChart = async () => {
    const response = await fetch("https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/cyclist-data.json");
    const dataset = await response.json();

    console.log(dataset)
    
    DOM.chartContainer.innerHTML = "";

    // Chart dimensions
    const fullwidth = DOM.chartContainer.offsetWidth;
    const fullheight = 600;
    const padding = 50;
    const width = fullwidth - padding;
    const height = fullheight - 2 * padding;
    
    // Calculate data ranges
    const years = dataset.map((d) => d.Year);
    const values = dataset.map((d) => d.Time);

    const parsedValues = values.map((d) => d3.timeParse("%M:%S")(d));
    

    const minDate = d3.min(years);
    const maxDate = d3.max(years);

    const minDateExtended = new Date(`${minDate}-01-01`);
    const maxDateExtended = new Date(`${maxDate}-01-01`);
    
    const minValue = d3.min(values);
    const maxValue = d3.max(values);
    
    // Update statistics
    DOM.totalItems.textContent = dataset.length;
    DOM.maxValue.textContent = maxValue;
    DOM.minValue.textContent = minValue;
    // DOM.avgIncrease.textContent = calculateAverageIncrease(dataset);

    const yScale = d3.scaleTime()
        .domain(d3.extent(parsedValues))
        .range([0, height])
        .nice();
    
    const xScale = d3.scaleTime()
        .domain([minDateExtended,maxDateExtended])
        .range([padding, width + padding / 2])
        .nice();
    
    // Define axes
    const yAxis = d3.axisLeft(yScale).tickFormat((d)=> d3.timeFormat("%M:%S")(d));
    const xAxis = d3.axisBottom(xScale);
    
    // Create SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", fullwidth)
        .attr("height", fullheight);
    
    // Add axes
    svg.append('g')
        .attr('id', 'x-axis')
        .attr('transform', `translate(0, ${height + padding})`)
        .call(xAxis);
    
    svg.append('g')
        .attr('id', 'y-axis')
        .attr('transform', `translate(${padding}, ${padding})`)
        .call(yAxis);

    // Create circles
    svg.selectAll("circle")
            .data(dataset)
            .enter()
            .append("circle")
            .attr("class", (d) => d.Doping ? 'dot fill-orange-400 hover:fill-indigo-500' : 'dot fill-teal-400 hover:fill-indigo-500')
            .attr("cx", (d) => xScale(new Date(`${d.Year}-01-01`)))
            .attr("cy", (d)=> yScale(d3.timeParse("%M:%S")(d.Time)))
            .attr('transform', `translate(0, ${padding})`)
            .attr("r", 5)
            .attr('data-xvalue', (d)=> new Date(`${d.Year}-01-01`))
            .attr('data-yvalue', (d)=> d3.timeParse("%M:%S")(d.Time))
            .on('click', (ev , info) => {
                handleBarClick(ev , info);
            })
            .on('mouseover', (ev , info) => {
                const dataXValue = ev.currentTarget.getAttribute('data-xvalue');
                handleBarMouseOver(dataXValue , info);
            })
            .on('mouseout', handleBarMouseOut);
            
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
