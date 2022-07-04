const averagingDates = {
    start: {
        month: 10,
        year: 2017
    },
    end: {
        month: 9,
        year: 2020
    }
}, comparingDates = {
    start: {
        month: 10,
        year: 2020
    },
    end: {
        month: 9,
        year: 2021
    }
}

const fetchData = function (callback) {
    fetch("data.json")
        .then(response => response.json())
        .then(callback)
}

const unique = function (arr) {
    return arr.reduce((a, c) => a.includes(c) ? a : a.concat(c), [])
}

const restructureAndFilterJson = function (json) {
    return unique(json.map(item => item.Party)).map(party => ({
        name: party,
        candidates: json.filter(item => item.Party === party).map(item => ({
            name: item.Name,
            state: item.Bundesland,
            averagingMonthCounts: item.MonthCounts.filter(dataPoint =>
                (
                    dataPoint.Date.Year > averagingDates.start.year ||
                    (dataPoint.Date.Year === averagingDates.start.year && dataPoint.Date.Month >= averagingDates.start.month)
                ) && (
                    dataPoint.Date.Year < averagingDates.end.year ||
                    (dataPoint.Date.Year === averagingDates.end.year && dataPoint.Date.Month <= averagingDates.end.month)
                )
            ),
            comparingMonthCounts: item.MonthCounts.filter(dataPoint =>
                (
                    dataPoint.Date.Year > comparingDates.start.year ||
                    (dataPoint.Date.Year === comparingDates.start.year && dataPoint.Date.Month >= comparingDates.start.month)
                ) && (
                    dataPoint.Date.Year < comparingDates.end.year ||
                    (dataPoint.Date.Year === comparingDates.end.year && dataPoint.Date.Month <= comparingDates.end.month)
                )
            )
        }))
    }))
}

const processJson = function (json) {
    return json.map(party => ({
        name: party.name,
        candidates: party.candidates.map(candidate => {
            const averageEdits = candidate.averagingMonthCounts.length === 0 ? 0 : candidate.averagingMonthCounts.reduce((a, c) => a + c.Edits, 0) / candidate.averagingMonthCounts.length
            const averageIpEdits = candidate.averagingMonthCounts.length === 0 ? 0 : candidate.averagingMonthCounts.reduce((a, c) => a + c.IPs, 0) / candidate.averagingMonthCounts.length
            const averageMinorEdits = candidate.averagingMonthCounts.length === 0 ? 0 : candidate.averagingMonthCounts.reduce((a, c) => a + c.MinorEdits, 0) / candidate.averagingMonthCounts.length

            return {
                name: candidate.name,
                state: candidate.state,
                averageEdits,
                averageIpEdits,
                averageMinorEdits,
                editData: candidate.comparingMonthCounts.map(dataPoint => ({
                    date: { month: dataPoint.Date.Month, year: dataPoint.Date.Year },
                    edits: dataPoint.Edits,
                    editsFromAverage: dataPoint.Edits - averageEdits,
                    ips: dataPoint.IPs,
                    ipsFromAverage: dataPoint.IPs - averageIpEdits,
                    minorEdits: dataPoint.MinorEdits,
                    minorEditsFromAverage: dataPoint.MinorEdits - averageMinorEdits,
                    editsUrl: dataPoint.EditsUrl
                })),
                rawData: {
                    averagingMonthCounts: candidate.averagingMonthCounts,
                    comparingMonthCounts: candidate.comparingMonthCounts
                }
            }
        })
    }))
}

const extractValue = function (candidates, group, variable) {
    const dataPoint = candidates.find(candidate => candidate.name === variable).editData.find(dataPoint => dataPoint.date.month === +(group.split('/')[0]) && dataPoint.date.year === +(group.split('/')[1]))
    return dataPoint ? dataPoint.editsFromAverage : NaN
}
const getDateGroups = function (start, end) {
    const ret = []
    let i = start.month, j = start.year;
    while (true) {
        ret.push(i + '/' + j)

        if (i === end.month && j === end.year)
            break;

        i++;
        if (i === 13) {
            i = 1;
            j++;
        }
    }

    return ret;
}

const removeIllegalSymbols = function (name, replacement) {
    return name.replace('/', replacement).replace(' ', replacement).toLowerCase()
}
//   <div class="party" id="party-spd">
//     <div class="party-header">
//       <span class="arrow"></span>
//       <img src="https://via.placeholder.com/240x120">
//       <img src="https://via.placeholder.com/60x60">
//     </div>
//     <div class="party-candidates">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//       <img src="https://via.placeholder.com/60x60">
//     </div>
//   </div>
const createPartyElements = function (data) {
    const ret = []

    // allCandidatesImage.setAttribute('src', 'images/all candidates.png')
    for (let party of data) {
        const partyName = removeIllegalSymbols(party.name)
        const partyElement = document.createElement('div')
        const header = document.createElement('div')
        const candidates = document.createElement('div')
        const arrow = document.createElement('span')
        const partyImage = document.createElement('img')
        const allCandidatesImage = document.createElement('img')

        partyElement.classList.add('party')
        partyElement.setAttribute('id', 'party-' + partyName)
        header.classList.add('party-header')
        candidates.classList.add("party-candidates")
        arrow.classList.add('arrow')
        partyImage.setAttribute('src', 'images/parties/' + partyName + '/logo.png')
        partyImage.setAttribute('src', 'https://via.placeholder.com/240x120')
        partyImage.addEventListener('click', _ => stateManager.selectParty(partyName))
        allCandidatesImage.setAttribute('src', 'https://via.placeholder.com/60x60')


        header.appendChild(arrow)
        header.appendChild(partyImage)
        header.appendChild(allCandidatesImage)

        partyElement.appendChild(header)
        partyElement.appendChild(candidates)

        for (let candidate of party.candidates) {
            const candidateElement = document.createElement('img')
            // partyImage.setAttribute('src', 'images/parties/' + partyName + '/' + candidate.name + '.png')
            candidateElement.setAttribute('src', 'https://via.placeholder.com/60x60')

            candidates.append(candidateElement)
        }

        ret.push(partyElement)
    }

    return ret
}

const createVisualisation = function (min, max, groups, vars, data) {
    const heatmap = d3.select("#election-heatmap");
    heatmap.node().innerHTML = ''

    const margin = { top: 30, right: 30, bottom: 30, left: 160 },
        width = Math.floor(heatmap.node().parentElement.getBoundingClientRect().width) - margin.left - margin.right,
        height = vars.length * (width / groups.length);

    // append the svg object to the body of the page
    const visualisation = heatmap
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build X scales and axis:
    const x = d3.scaleBand()
        .range([0, width])
        .domain(groups)
        .padding(0.01);

    visualisation.append("g")
        .attr("transform", `translate(0, 0)`)
        .call(d3.axisTop(x))

    // Build X scales and axis:
    const y = d3.scaleBand()
        .range([height, 0])
        .domain(vars)
        .padding(0.01);

    visualisation.append("g")
        .call(d3.axisLeft(y));

    // Build color scale
    const myColor = d3.scaleLinear()
        .range(["#a0651a", "#eef1ea", "#187a72"])
        .domain([min, 0, max])

    visualisation.selectAll()
        .data(data, function (d) { return d.group + ':' + d.variable; })
        .join("rect")
        .attr("x", function (d) { return x(d.group) })
        .attr("y", function (d) { return y(d.variable) })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function (d) { return myColor(d.value) })

    let rerenderTimeout = null;

    d3.select(window)
        .on("resize", function () {
            clearTimeout(rerenderTimeout);
            rerenderTimeout = setTimeout(() => {
                createVisualisation(min, max, groups, vars, data)
            }, 300);
        });
}

const stateManager = (function () {
    let selectedParty = null;

    const selectParty = function (party) {
        if (selectedParty === party) return;

        if (selectedParty)
            document.querySelector('.party#party-' + selectedParty).classList.remove('show')

            selectedParty = party;
        document.querySelector('.party#party-' + selectedParty).classList.add('show')
    }

    return {
        selectParty
    }
})()

fetchData(json => {
    const data = processJson(restructureAndFilterJson(json))

    const selectionSection = document.querySelector('.selection-section')
    const partyElements = createPartyElements(data);
    for (let partyElement of partyElements)
        selectionSection.appendChild(partyElement);

    const allEdits = data.flatMap(party => party.candidates.flatMap(candidate => candidate.editData.map(data => data.editsFromAverage)))
    const minEdits = allEdits.reduce((a, c) => c < a ? c : a, Number.MAX_SAFE_INTEGER)
    const maxEdits = allEdits.reduce((a, c) => c > a ? c : a, Number.MIN_SAFE_INTEGER)
    const chosenCandidates = data.flatMap(party => party.candidates)
    const groups = getDateGroups(comparingDates.start, comparingDates.end);//["10/2020", "11/2020", "12/2020", "1/2021", "2/2021", "3/2021", "4/2021", "5/2021", "6/2021", "7/2021", "8/2021", "9/2021"]
    const vars = chosenCandidates.map(candidate => candidate.name)
    createVisualisation(
        minEdits,
        maxEdits,
        groups,
        vars,
        groups.flatMap(group => vars.map(variable => ({
            group,
            variable,
            value: extractValue(chosenCandidates, group, variable)
        })))
    )
})