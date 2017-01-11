    cleanCodeDraw = function() {

      var dataset = genRamdon(10, 20);

      var h = 600;
      var w = 700;

      var xStart = 300;
      var yStart  =200;

      var svg = d3.select("body div#chart").append("svg")
          .attr("width", w)
          .attr("height", h);

      var circles = svg.selectAll("circle").data(dataset).enter().append("circle");
      circles.attr("cx", function(d, i){
        return i*50 + 25 + xStart;
      }).attr("cy", function(d, i) {
        return d/2 + yStart;
      }).attr("r", function(d, i) {
        return d;
      }).attr("fill", "blue")
      .attr("stroke", "red");

    }

    genRamdon = function(n, scale) {
      var d_box = [];
      for(var i=0; i< n; i++) {
        d_box.push(Math.random() * scale);
      }
      return d_box;
      }

    drawDict = function() {

      var h = 600;
      var w = 700;

      var svg = d3.select("body div#chart").append("svg");
      svg.attr("width", w).attr("height", h);

      var width = +svg.attr("width"), height = +svg.attr("height");
      var color = d3.scaleOrdinal(d3.schemeCategory20);

      var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

      d3.json("data/sample.json", function(error, graph) {
        if (error) throw error;

        var link = svg.append("g")
          .attr("class", "links")
          .selectAll("line")
          .data(graph.links)
          .enter().append("line")
          .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

        var node = svg.append("g")
          .attr("class", "nodes")
          .selectAll("circle")
          .data(graph.nodes)
          .enter().append("circle")
          .attr("r", 5)
          .attr("fill", function(d) { return color(d.group); })
          .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

        node.append("title")
        .text(function(d) { return d.id; });

        simulation
          .nodes(graph.nodes)
          .on("tick", ticked);

        simulation.force("link")
          .links(graph.links);

      });
  }

  function ticked() {
    link
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    node
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
