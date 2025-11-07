// Reference of us-map: https://billmill.org/making_a_us_map.html
const nameToCode = {
  "Alabama": "01", "Alaska": "02", "Arizona": "04", "Arkansas": "05", "California": "06",
  "Colorado": "08", "Connecticut": "09", "Delaware": "10", "District of Columbia": "11",
  "Florida": "12", "Georgia": "13", "Hawaii": "15", "Idaho": "16", "Illinois": "17",
  "Indiana": "18", "Iowa": "19", "Kansas": "20", "Kentucky": "21", "Louisiana": "22",
  "Maine": "23", "Maryland": "24", "Massachusetts": "25", "Michigan": "26", "Minnesota": "27",
  "Mississippi": "28", "Missouri": "29", "Montana": "30", "Nebraska": "31", "Nevada": "32",
  "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
  "North Carolina": "37", "North Dakota": "38", "Ohio": "39", "Oklahoma": "40", "Oregon": "41",
  "Pennsylvania": "42", "Rhode Island": "44", "South Carolina": "45", "South Dakota": "46",
  "Tennessee": "47", "Texas": "48", "Utah": "49", "Vermont": "50", "Virginia": "51",
  "Washington": "53", "West Virginia": "54", "Wisconsin": "55", "Wyoming": "56"
};

let oosTravelValByCode = new Map();
let clinicAccessByCode = new Map();
let providerAccessByCode = new Map();

let color;

function graph1(mapdata, data) {
  const width = 975,
    height = 610;

  const svg = d3
    .select("#us-map")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  data.forEach((d) => {
    const code = nameToCode[d["U.S. State"]];
    if (!code) return;

    oosTravelValByCode.set(
      code,
      Number(
        d[
          "% of residents obtaining abortions who traveled out of state for care, 2020"
        ]
      )
    );

    clinicAccessByCode.set(
      code,
      100 - Number(d["% of counties without a known clinic, 2020"])
    );

    providerAccessByCode.set(
      code,
      100 - Number(d["% of counties without a known abortion provider, 2014"])
    );
  });

  const values = Array.from(oosTravelValByCode.values());
  color = d3
    .scaleSequential()
    .domain([d3.min(values), d3.max(values)])
    .interpolator(d3.interpolateReds);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid black")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("pointer-events", "none");

  svg
    .append("g")
    .attr("stroke", "#444")
    .selectAll("path")
    .data(topojson.feature(mapdata, mapdata.objects.states).features)
    .join("path")
    .attr("class", "state")
    .attr("d", d3.geoPath())
    .attr("fill", "#ccc")
    .attr("stroke-width", 1)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke-width", 2);

      const code = d.id;
      const stateName = Object.keys(nameToCode).find(
        (k) => nameToCode[k] === code
      );

      const travelVal = oosTravelValByCode.get(code);
      const clinicVal = clinicAccessByCode.get(code);
      const providerVal = providerAccessByCode.get(code);

      tooltip.style("opacity", 1).html(`
          <strong>${stateName}</strong><br>
          Out-of-state travel: ${travelVal?.toFixed(1) ?? "N/A"}%<br>
          Clinic access: ${clinicVal?.toFixed(1) ?? "N/A"}%<br>
          Provider access: ${providerVal?.toFixed(1) ?? "N/A"}%
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke-width", 1);
      tooltip.style("opacity", 0);
    });

  d3.select("#clinicSlider").on("input", updateMapColors);
  d3.select("#providerSlider").on("input", updateMapColors);

  const legendWidth = 300,
    legendHeight = 10;
  const legendSvg = d3
    .select("#legend")
    .append("svg")
    .attr("width", legendWidth + 50)
    .attr("height", 60)
    .append("g")
    .attr("transform", "translate(20,20)");
  const defs = legendSvg.append("defs");
  const linearGradient = defs
    .append("linearGradient")
    .attr("id", "linear-gradient");
  linearGradient
    .selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", (d) => d)
    .attr("stop-color", (d) => color(d * 100));
  legendSvg
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#linear-gradient)");
  const legendScale = d3
    .scaleLinear()
    .domain([0, 100])
    .range([0, legendWidth]);
  legendSvg
    .append("g")
    .attr("transform", `translate(0,${legendHeight})`)
    .call(
      d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickFormat((d) => d.toFixed(1) + "%")
    );
  legendSvg
    .append("text")
    .attr("x", 0)
    .attr("y", -5)
    .style("font-family", "Segoe UI")
    .style("font-size", "12px")
    .text(
      "% of residents obtaining abortions who traveled out of state (2020)"
    );
}

function updateMapColors() {
  const clinicMax = +d3.select("#clinicSlider").property("value");
  const providerMax = +d3.select("#providerSlider").property("value");

  d3.select("#clinicVal").text(clinicMax + "%");
  d3.select("#providerVal").text(providerMax + "%");

  d3.selectAll(".state").attr("fill", (d) => {
    const code = d.id;

    const clinicVal = clinicAccessByCode.get(code);
    const providerVal = providerAccessByCode.get(code);
    const travelVal = oosTravelValByCode.get(code);

    if (clinicVal == null || providerVal == null || travelVal == null)
      return "#ccc";

    const passClinic = clinicVal <= clinicMax;
    const passProvider = providerVal <= providerMax;

    return passClinic && passProvider ? color(travelVal) : "#ccc";
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch(
    "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json"
  );
  const data = await d3.csv("GuttmacherInstituteAbortionDataByState.csv");
  const mapJson = await res.json();
  graph1(mapJson, data);
});
