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

const pullEditDataPointByDate = function (editData, date) {
    const search = editData.find(candidatePoint => candidatePoint.date.month === date.month && candidatePoint.date.year === date.year)
    if (!search) return { edits: 0 }
    return search
}

const processJson = function (json) {
    const partyOrder = ['SPD', 'CDU/CSU', 'Grüne', 'FDP', 'AfD', 'Die Linke']

    return json.map(party => ({
        name: party.name,
        candidates: [0].concat(party.candidates.map(candidate => {
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
        })).map((value, index, array) => {
            if (index !== 0) return value;
            const actualArray = array.slice(1)
            const averageEdits = actualArray.reduce((a, c) => a + c.averageEdits, 0) / actualArray.length
            return {
                name: party.name + " Durchschnitt",
                isAllCandidates: true,
                averageEdits,
                editData: actualArray.reduce((a, c) => a.map(point => ({
                    date: point.date,
                    edits: point.edits + pullEditDataPointByDate(c.editData, point.date).edits
                })), actualArray[0].editData.map(randomPoint => ({
                    date: randomPoint.date,
                    edits: 0
                }))).map(point => ({
                    date: point.date,
                    edits: point.edits / actualArray.length,
                    editsFromAverage: point.edits / actualArray.length - averageEdits,
                }))
            }
        })
    })).sort((p1, p2) => partyOrder.indexOf(p1.name) - partyOrder.indexOf(p2.name))
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

const removeIllegalSymbols = function (name, slashReplacement, spaceReplacement) {
    return name.replaceAll('/', slashReplacement).replaceAll(' ', spaceReplacement)
}

const convertNonLatinSymbols = function (name) {
    return name.replaceAll('ü', 'ü').replaceAll('ä', 'ä').replaceAll('ö', 'ö').replaceAll('Ö', 'Ö').replaceAll('ğ', 'ğ').replaceAll('Ż', 'Ż').replaceAll('ć', 'ć')
}

const createPartyElements = function (data) {
    const ret = []

    for (let party of data) {
        const partyName = convertNonLatinSymbols(removeIllegalSymbols(party.name, '', '_'))
        const partyElement = document.createElement('div')
        const header = document.createElement('div')
        const candidatesContainer = document.createElement('div')
        const arrow = document.createElement('span')
        const candidates = document.createElement('div')
        const partyImage = document.createElement('img')
        const allCandidatesImage = document.createElement('img')

        partyElement.classList.add('party')
        partyElement.setAttribute('id', 'party-' + partyName)
        header.classList.add('party-header')
        candidatesContainer.classList.add('party-candidates-container')
        candidates.classList.add("party-candidates")
        arrow.classList.add('arrow')
        partyImage.setAttribute('src', 'images/parties/' + partyName + '/Logo.png')
        partyImage.addEventListener('click', _ => stateManager.selectParty(partyName))
        partyImage.classList.add("party-image")
        allCandidatesImage.setAttribute('src', 'images/parties/' + partyName + '/Gruppe.png')
        allCandidatesImage.classList.add("all-candidates-image")
        allCandidatesImage.addEventListener('click', e => stateManager.selectCandidate(e))
        allCandidatesImage.setAttribute('data-candidate', party.name + " Durchschnitt")

        candidatesContainer.appendChild(candidates)

        header.appendChild(arrow)
        header.appendChild(partyImage)
        header.appendChild(allCandidatesImage)

        partyElement.appendChild(header)
        partyElement.appendChild(candidatesContainer)


        for (let candidate of party.candidates.slice(1)) {
            const candidateElement = document.createElement('div')
            const candidateDescriptionBox = document.createElement('div')
            const candidateDiv = document.createElement('div')
            const candidateImage = document.createElement('img')
            candidateElement.classList.add("candidate-image-container")
            let startTimestamp = 0
            let startTimestampAtStartOfLeaveEvent
            candidateElement.addEventListener('mouseenter', e => {
                startTimestamp = e.timeStamp
                candidateElement.classList.add('hover')
                candidateElement.classList.add('transition-finished')
            })
            candidateElement.addEventListener('mouseleave', e => {
                startTimestampAtStartOfLeaveEvent = startTimestamp
                candidateElement.classList.remove('hover')
                setTimeout(() => {
                    if (startTimestamp === startTimestampAtStartOfLeaveEvent)
                        candidateElement.classList.remove('transition-finished')
                }, Math.min(300, e.timeStamp - startTimestamp) + 50);
            })
            candidateDescriptionBox.classList.add("candidate-image-description-box")
            candidateImage.setAttribute('src', 'images/parties/' + partyName + '/' + convertNonLatinSymbols(candidate.name) + '.png')
            candidateImage.addEventListener('click', e => stateManager.selectCandidate(e))
            candidateImage.setAttribute('data-candidate', candidate.name)

            candidateDiv.innerHTML = `<span>${candidate.name}</span><br><div class='small-text'>Landeslistenführer:
${candidate.state}</div>`

            candidateElement.appendChild(candidateImage)
            candidateElement.appendChild(candidateDescriptionBox)
            candidateDescriptionBox.appendChild(candidateDiv)
            candidates.append(candidateElement)
        }

        ret.push(partyElement)
    }

    return ret
}

const roundToThreeDigits = function (num) {
    return Math.round(num * 1000) / 1000
}

const createVisualisation = function (min, max, groups, vars, data, additionalInfo) {
    const heatmap = d3.select("#election-heatmap");
    heatmap.node().innerHTML = ''

    const margin = { top: 100, right: 30, bottom: 30, left: 160 },
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

    const tooltip = d3.select("#election-heatmap")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("position", "absolute")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("pointer-events", "none")

    const mouseover = function () {
        tooltip.style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
    }
    const mousemove = function (event, d) {
        const shouldBeLeft = event.x < document.body.clientWidth * .7
        tooltip
            .html(`Kandidat Durchschnitt von 10.2017 bis 09.2020: <b>${roundToThreeDigits(additionalInfo[d.variable].average)}</b><br>Editierungen diesen Monat: <b>${additionalInfo[d.variable].editData[d.group] ? roundToThreeDigits(additionalInfo[d.variable].editData[d.group].edits) : "Nicht verfügbar."}</b><br>Wert dieser Zelle (Differenz zwischen Editierungen und Durchschnitt): <b>${isNaN(d.value) ? "Nicht verfügbar." : roundToThreeDigits(d.value)}</b>`)
            .style(shouldBeLeft ? "left" : "right", (shouldBeLeft ? event.x + 10 : document.body.clientWidth - event.x + 10) + "px")
            .style(shouldBeLeft ? "right" : "left", "unset")
            .style("top", (event.layerY) + "px")
    }
    const mouseleave = function () {
        tooltip.style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    const click = function (_, d) {
        const url = additionalInfo[d.variable].editData[d.group].url;
        if (url)
            window.open(url.replaceAll('&amp;', '&'), '_blank')
    }

    visualisation.selectAll()
        .data(data, function (d) { return d.group + ':' + d.variable; })
        .join("rect")
        .attr("x", function (d) { return x(d.group) })
        .attr("y", function (d) { return y(d.variable) })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", x.bandwidth() - 2)
        .attr("height", y.bandwidth() - 2)
        .style("fill", function (d) { return myColor(d.value) })
        .style("stroke-width", 4)
        .style("stroke", "none")
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .on("click", click)

    const svg = d3.select("#election-heatmap svg")

    // ! Creating the legend
    var linearGradient = svg
        .append("linearGradient")
        .attr("id", "linear-gradient");

    //Horizontal gradient
    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    //Append multiple color stops by using D3's data/enter step
    linearGradient
        .selectAll("stop")
        .data([
            { offset: "0%", color: "#a0651a" },
            { offset: "6.908%", color: "#eef1ea" },
            { offset: "100%", color: "#187a72" },
        ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
            return d.offset;
        })
        .attr("stop-color", function (d) {
            return d.color;
        });

    var legendWidth = width * 0.5,
        legendHeight = 8;
    //Color Legend container
    var legendsvg = svg
        .insert("g", ':first-child')
        .attr("id", "legend")
        .attr(
            "transform",
            "translate(" + (width - margin.left + legendWidth / 2) + "," + (legendHeight * 2) + ")"
        );
    //Draw the Rectangle
    legendsvg
        .append("rect")
        .attr("class", "legendRect")
        .attr("x", -legendWidth / 2 + 0.5)
        .attr("y", 10)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient)")
        .style("stroke", "black")
        .style("stroke-width", "1px");//change this stroke it's ugly
    //Append title
    legendsvg
        .append("text")
        .attr("class", "legendTitle")
        .attr("x", -legendWidth / 8)
        .attr("y", 0)
        .text("Editierungen");
    //Set scale for x-axis
    var xScale2 = d3
        .scaleLinear()
        .range([0, legendWidth])
        .domain([min, max]);

    legendsvg
        .append("g")
        .call(
            d3
                .axisBottom(xScale2)
                .tickValues([
                    min,
                    0,
                    max,
                ])
            // .tickFormat((x) => x.toFixed(2))
        )
        .attr("class", "legendAxis")
        .attr("id", "legendAxis")
        .attr(
            "transform",
            "translate(" + -legendWidth / 2 + "," + (10 + legendHeight) + ")"
        );

    heatmap
        .append('div')
        .join('text')
        .text("Alle Schließen")
        .attr("class", "close-all-button")
        .on('click', stateManager.deselectAll)

    let rerenderTimeout = null;

    d3.select(window)
        .on("resize", function () {
            clearTimeout(rerenderTimeout);
            rerenderTimeout = setTimeout(() => {
                createVisualisation(min, max, groups, vars, data, additionalInfo)
            }, 300);
        });
}

const stateManager = (function () {
    const partyColors = {
        'SPD': '#e3000f',
        'CDUCSU': '#000000',
        'Grüne': '#46962b',
        'FDP': '#ffff00',
        'AfD': '#009ee0',
        'Die_Linke': '#be3075'
    }
    let selectedParty = null;
    const selectedCandidates = []

    const selectParty = function (party) {
        if (selectedParty === party) return;

        if (selectedParty) {
            document.querySelector('.party#party-' + selectedParty).classList.remove('show')
            document.querySelector('.party#party-' + selectedParty).classList.remove('transition-finished')
        }

        setTimeout(() => {
            selectedParty = party;
            document.querySelector('.party#party-' + selectedParty).classList.add('show')
        }, 0);

        setTimeout(() => {
            document.querySelector('.party#party-' + selectedParty).classList.add('transition-finished')
        }, 300);
    }

    const selectCandidate = function (e) {
        e.target.classList.toggle("selected")

        if (e.target.classList.contains('selected')) {
            selectedCandidates.push(e.target.getAttribute('data-candidate'))
            e.target.style.boxShadow = '0px 0px 2px 4px ' + (e.target.classList.contains('all-candidates-image') ?
                'black' :
                partyColors[e.target.parentElement.parentElement.parentElement.parentElement.id.slice(6)]
            )
        }
        else {
            selectedCandidates.splice(selectedCandidates.indexOf(e.target.getAttribute('data-candidate')), 1)
            e.target.style.boxShadow = ''
        }

        TemporaryName.createVisualisationWithVars(selectedCandidates.slice(0).reverse())
    }

    const deselectAll = function () {
        document.querySelectorAll('img.selected').forEach(img => { img.classList.remove('selected'); img.style.boxShadow = '' })
        selectedCandidates.splice(0, selectedCandidates.length)
        TemporaryName.createVisualisationWithVars(selectedCandidates.slice(0).reverse())
    }

    return {
        selectParty,
        selectCandidate,
        deselectAll
    }
})()

const TemporaryName = (function () {
    let data, allEdits, minEdits, maxEdits, groups, chosenCandidates;

    const createVisualisationWithVars = function (vars) {
        createVisualisation(
            minEdits,
            maxEdits,
            groups,
            vars,
            groups.flatMap(group => vars.map(variable => ({
                group,
                variable,
                value: extractValue(chosenCandidates, group, variable)
            }))),
            vars.reduce((a, c) => Object.assign(a, {
                [c]: {
                    average: chosenCandidates.find(cand => cand.name === c).averageEdits,
                    editData: chosenCandidates.find(cand => cand.name === c).editData.reduce((a, c) => Object.assign(a, { [c.date.month + '/' + c.date.year]: { edits: c.edits, url: c.editsUrl } }), {})
                }
            }), {})
        )
    }

    fetchData(json => {
        data = processJson(restructureAndFilterJson(json))

        const selectionSection = document.querySelector('.selection-section')
        const partyElements = createPartyElements(data);
        for (let partyElement of partyElements)
            selectionSection.appendChild(partyElement);

        allEdits = data.flatMap(party => party.candidates.flatMap(candidate => candidate.editData.map(data => data.editsFromAverage)))
        minEdits = allEdits.reduce((a, c) => c < a ? c : a, Number.MAX_SAFE_INTEGER)
        maxEdits = allEdits.reduce((a, c) => c > a ? c : a, Number.MIN_SAFE_INTEGER)
        chosenCandidates = data.flatMap(party => party.candidates)
        groups = getDateGroups(comparingDates.start, comparingDates.end)
        const vars = data.map(party => party.candidates[0].name).reverse()
        createVisualisationWithVars(vars)
        // createVisualisation(
        //     minEdits,
        //     maxEdits,
        //     groups,
        //     vars,
        //     groups.flatMap(group => vars.map(variable => ({
        //         group,
        //         variable,
        //         value: extractValue(chosenCandidates, group, variable)
        //     })))
        // )
    })

    return {
        createVisualisationWithVars,
    }
})()

