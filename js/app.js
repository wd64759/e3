(function() {

    // Function for moving nodes to front
    d3.selection.prototype.moveToFront = function() {
        return this.each(function() {
            this.parentNode.appendChild(this);
        });
    };

    // Function for moving to back
    d3.selection.prototype.moveToBack = function() {
        return this.each(function() {
            var firstChild = this.parentNode.firstChild;
            if (firstChild) {
                this.parentNode.insertBefore(this, firstChild);
            }
        });
    };

    var scaleFactor = 1;
    var translation = [0, 0];

    var smallCircleSize = 4.5;
    var largeCircleSize = 9;

    var minWidthPoly1 = 255;
    var minWidthPoly2 = 355;
    var xMargin = 20;
    var yPosFaculty = 170;
    var yPosEntry = 90;
    var yMargin = 20;
    var legendEntryPadding = 10;
    var legendFacultyPadding = 5;


    var height = 0;
    var width = 0;

    // Linear size scale
    var linearSize = d3.scale.linear()
        .domain([10, 100000000]).range([5, 20]);

    // Initialize Ordinal Colour Scale
    var color = d3.scale.ordinal()
        .domain(["10", "20", "30", "40", "50", "60", "70", "80", "100"])
        .range([
            "#009933",
            "#ff0000",
            "#003366",
            "#996633",
            "#ff9933",
            "#ffcccc",
            "#ff66ff",
            "#0000cc",
            "#00ccff",
        ]);

    // Configure force layout
    var force = d3.layout.force();

    queue()
        .defer(d3.csv, "data/newbook.csv")
        .defer(d3.csv, "data/newbook_rel.csv")
        .await(ready);

    function ready(error, lookup, links) {

        var searchMap = {
            'rs': [{
                'cusp': '1'
            }, {
                'matD': '2'
            }]
        };

        d3.selectAll("#findBtn")
            .on("click", function() {
                var sId = $("#ember790").val();
                searchNode(sId, 'id');
            });

        d3.selectAll("#resetBtn").on("click", function() {
            showAllNodes();
        })

        $("#ember241").change(function() {
            var sType = this.value;
            searchNode(sType, 'type');
        })


        if (error) throw error;

        // Set up Program/Faculty lookup table
        var lookupTable = {};
        lookup.forEach(function(program) {
            // console.log(">>*>>" + JSON.stringify(program))

            lookupTable[program.nid] = {
                'weight': program.weight,
                'name': program.name,
                'nid': program.nid,
                'ntype': program.ntype,
                'faculty': program.faculty
            };
            // console.log(">>>>" + JSON.stringify(lookupTable[program.name]))
        });

        window.mlookupTable = lookupTable;

        // console.log('>>> lookup :' + JSON.stringify(lookupTable));

        var allShowing = true;
        var facultySelected = false;
        var nodeHighlighted = false;
        var timeout;

        var mousePos = [0, 0];
        var newMousePos = [0, 0];

        /*** Configure zoom behaviour ***/
        var zoomer = d3.behavior.zoom()
            .scaleExtent([0.1, 10])
            //allow 10 times zoom in or out
            .on("zoom", zoom);
        //define the event handler function

        function zoom(d) {

            if (d3.event.sourceEvent && !nodeHighlighted) {
                d3.event.sourceEvent.stopPropagation();
            }
            scaleFactor = d3.event.scale;
            translation = d3.event.translate;
            tick(); //update positions
        }

        /*** Configure drag behaviour ***/
        var isDrag = false;
        var drag = d3.behavior.drag()
            .origin(function(d) {
                return d;
            }) //center of circle
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragended);

        var getMousePos;

        function dragstarted(d) {

            if (d3.select(this).classed("activeNode")) {
                getMousePos = d3.mouse(vis.node());
                mousePos[0] = getMousePos[0];
                mousePos[1] = getMousePos[1];
                d3.select(this).moveToFront();
                d3.event.sourceEvent.stopPropagation();
                d3.select(this).classed("dragging", true);
                force.stop(); //stop ticks while dragging
                isDrag = true;
            }
        }

        function dragged(d) {
            if (d3.select(this).classed("activeNode")) {
                if (d.fixed) return; //root is fixed

                //get mouse coordinates relative to the visualization
                //coordinate system:
                var mouse = d3.mouse(vis.node());
                d.x = (mouse[0] - translation[0]) / scaleFactor;
                d.y = (mouse[1] - translation[1]) / scaleFactor;
                tick(); //re-position this node and any links
            }
        }

        function dragended(d) {
            if (d3.select(this).classed("activeNode")) {
                getMousePos = d3.mouse(vis.node());
                newMousePos[0] = getMousePos[0];
                newMousePos[1] = getMousePos[1];
                var shortDrag = Math.abs(newMousePos[0] - mousePos[0]) < 5 && Math.abs(newMousePos[1] - mousePos[1]) < 5;
                if (shortDrag) { // Short drag means click
                    connectedNodes(d, allShowing || facultySelected, this); // else highlight connected nodes
                }

                d3.select(this).classed("dragging", false);
                if (!shortDrag) {
                    force.resume();
                } // Resume force layout only if not a short drag
                isDrag = false;
            }
        }


        //Initialize SVG
        var graph = d3.select("body div#chart").append("svg")
            .append("g")
            .attr("class", "graph")
            .on("mousedown", function() {
                mousePos = d3.mouse(this);
                if (mousePos[0] < minWidthPoly1 && mousePos[1] < height) d3.event.stopImmediatePropagation(); //Only clicks no drag or pan on menu area
            })
            .call(zoomer);
        graph.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white")
            .attr("class", "background")
            .attr("fill-opacity", 0.9);

        // Funky shape as background for legend
        var points = "";

        // Rectangle to catch mouse events for zoom
        var rect = graph.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("margin", "0 auto")
            .style("fill", "none")
            .style("pointer-events", "all")
            .style("cursor", "move")
            .on("click", function() {
                if (d3.event.defaultPrevented) return;
                // console.log('>>>>>>>>>>>>>>>.11')
                showAllNodes();
            });

        // Create a group that will hold all content to be zoomed
        var vis = graph.append("svg:g")
            .attr("class", "plotting-area");

        // Pinned tooltip
        var pinnedTooltip = d3.select("body").append("div")
            .attr("class", "tooltip pinned")
            .style("opacity", 0)
            .style("font-size", "20px");

        // Tooptip in top left corner
        var tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", "0");

        // Create a legend for entry-level programs
        var entryTranslate = 0;

        var legendSize = d3.legend.size()
            .scale(linearSize)
            .shape('circle')
            .shapePadding(legendEntryPadding)
            .labels(["Other", "Entry-level Plan"])
            .cells(2) // Number of objects (circles)
            .ascending(true);

        var facultyTranslate = 0;
        d3.selectAll("g.cell")
            .on("click", function(d) {
                // console.log('>>>>>>>>>>>>>>>>> 11.2222');
                if (d3.event.defaultPrevented) return;
                var self = this;
                var activeLegends = d3.selectAll("g.cell");

                activeLegends.filter(function(x) {
                        return self != this;
                    })
                    .classed("active", false); // Set all other faculty filters to false

                pinnedTooltip.style("opacity", 0);
                //    zoomer.translate([20, 0]);

                searchNode(d, this);
            });

        // Create nodes for each unique source and target.
        var nodesByName = {};
        links.forEach(function(link) {
            link.source = nodeByName(link.source);
            link.target = nodeByName(link.target);
        });

        function nodeByName(name) {
            return nodesByName[name] || (nodesByName[name] = {
                name: name
            });
        }

        // Extract the array of nodes from the map by name.
        var nodes = d3.values(nodesByName);

        // Create the link lines.
        var link = vis.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link");

        // Create the node circles.
        // nodes
        // console.log('>>> nodes:' + JSON.stringify(nodes));
        var default_weight = 1000;

        var node = vis.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", function(d) {
                // console.log("---->" + JSON.stringify(d));
                // console.log("----" + JSON.stringify(lookupTable[d.name]));
                if (lookupTable[d.name] && lookupTable[d.name].weight)
                    return linearSize(lookupTable[d.name].weight);
                else
                    return linearSize(default_weight);
                // return 20;
            })
            .style("fill", function(d) {
                if (lookupTable[d.name]) {
                    return color(lookupTable[d.name].faculty);
                } else {
                    return color(10);
                }

            })
            .classed("activeNode", true)
            .on("mouseover", function(d) {
                var tipName = 'unknown';
                if (lookupTable[d.name]) {
                    tipName = lookupTable[d.name].name;
                }
                if (d3.select(this).classed("activeNode") && !d3.select(this).classed("baseNode")) {
                    force.stop();
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);

                    tooltip.html(tipName)
                        .style("right", "20px")
                        .style("top", (nodeHighlighted ? "65px" : "20px"));
                }
            })
            .on("mouseout", function(d) {
                if (!isDrag && !nodeHighlighted) {
                    force.resume();
                }
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .call(drag);

        // Start the force layout.
        force
            .nodes(nodes)
            .links(links)
            .linkDistance(40)
            //      .linkStrength(0.08)
            .on("tick", function() {
                tick();
            })
            .start();

        graph
            .on("mouseleave", function() {
                force.stop();
            })
            .on("mouseenter", function() {
                force.resume();
            });

        /* Configure highlighting of connected nodes */
        var toggle = 0;

        //Create an array logging what is connected to what
        var linkedByIndex = {};
        for (i = 0; i < nodes.length; i++) {
            linkedByIndex[i + "," + i] = 1;
        };
        links.forEach(function(d) {
            linkedByIndex[d.source.index + "," + d.target.index] = 1;

        });

        //This function looks up whether a pair are neighbours
        function neighboring(a, b) {
            return linkedByIndex[a.index + "," + b.index];
        }

        // Change opacity to highlight connected nodes
        function connectedNodes(clickedOn, firstClick, nodeClicked) {

            // console.log('>>>>>>>>>>>>> 2222.4444444');
            var tipName = clickedOn.name;
            if (lookupTable[clickedOn.name]) {
                tipName = lookupTable[clickedOn.name].name;
                if (lookupTable[clickedOn.name].weight > 0) {
                    var fmtNum = ("" + lookupTable[clickedOn.name].weight).replace(/(\d{1,3})(?=(\d{3})+(?:$|\.))/g, "$1,");
                    // tipName = tipName + ':' + lookupTable[clickedOn.name].weight;
                    tipName = tipName + ':' + fmtNum;
                }
            }

            nodeHighlighted = true;
            d3.selectAll("g.cell").classed("active", false); // Clear faculty/entry filters
            if (d3.select(nodeClicked).classed("baseNode")) { // Base node was clicked, show all
                showAllNodes();
                return;
            }
            force.stop(); // Stop moving
            tooltip.style("opacity", 0); // Clear unpinned tooltip (because it is the same as the pinned)
            pinnedTooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            pinnedTooltip.html(tipName) // Pin tooltip with name of clicked on node
                .style("right", "20px")
                .style("top", "20px");
            node.each(function(d) { // Allow for clicking back on previous baseNodes
                d3.select(this).classed("baseNode", false);
            });
            d3.select(nodeClicked).classed("baseNode", true);
            node.classed("activeNode", function(o) {
                return neighboring(clickedOn, o) | neighboring(o, clickedOn) ? true : false;
            })
            node.style("stroke-opacity", function(o) {
                return (neighboring(clickedOn, o) | neighboring(o, clickedOn)) ? 1 : 0.1;
            });
            node.style("fill-opacity", function(o) {
                return (neighboring(clickedOn, o) | neighboring(o, clickedOn)) ? 1 : 0.1;
            });
            link.style("stroke-opacity", function(o) {
                return clickedOn.index == o.source.index | clickedOn.index == o.target.index ? 0.6 : 0.1;
            });
            d3.select("activeNode").moveToFront(); // Brings activeNode nodes to front
            allShowing = false;
            facultySelected = false;
        }

        function searchNode(searchVal, sType) {
            nodeHighlighted = false;
            var searchNode = d3.selectAll(".node");

            var notSelectedNodes = [];
            var selectedNodes = [];

            if (sType == 'id') {

                notSelectedNodes = searchNode.filter(function(d, i) {
                    return lookupTable[d.name].nid != searchVal;
                });

                selectedNodes = searchNode.filter(function(d, i) {
                    return lookupTable[d.name].nid == searchVal;
                });
            } else {
                notSelectedNodes = searchNode.filter(function(d, i) {
                    if (!lookupTable[d.name]) {
                        return false;
                    }
                    return lookupTable[d.name].ntype != searchVal;
                });

                // console.log(">>notSelectedNodes:" + JSON.stringify(notSelectedNodes));

                selectedNodes = searchNode.filter(function(d, i) {
                    if (lookupTable[d.name]) {
                        return lookupTable[d.name].ntype == searchVal;
                    } else {
                        return false;
                    }

                });
            }

            var link = d3.selectAll(".link");

            selectedNodes
                .style("stroke-opacity", 1)
                .style("fill-opacity", 1)
                .classed("activeNode", true);
            notSelectedNodes
                .style("stroke-opacity", 0.1)
                .style("fill-opacity", 0.1)
                .classed("activeNode", false);

            link.style("stroke-opacity", 0.1);
            facultySelected = true;
            allShowing = false;
        }

        // Show all nodes on click in empty space
        function showAllNodes() {
            if (d3.event.stopPropagation) {
                d3.event.stopPropagation();
            }
            force.resume();
            //Put them back to opacity=1
            node
                .style("stroke-opacity", 1)
                .style("fill-opacity", 1)
                .classed("activeNode", true)
                .classed("clickedNode", false)
                .classed("baseNode", false);
            link.style("stroke-opacity", 0.6);
            d3.selectAll("g.cell").classed("active", false); // Clear faculty/entry filters
            allShowing = true;
            facultySelected = false;
            nodeHighlighted = false;
            pinnedTooltip.style("opacity", 0);
        }

        // Update positions of nodes and links
        function tick() {
            link.attr("x1", function(d) {
                    return translation[0] + scaleFactor * d.source.x + (minWidthPoly1 + minWidthPoly2) / 4;
                })
                .attr("y1", function(d) {
                    return translation[1] + scaleFactor * d.source.y;
                })
                .attr("x2", function(d) {
                    return translation[0] + scaleFactor * d.target.x + (minWidthPoly1 + minWidthPoly2) / 4;
                })
                .attr("y2", function(d) {
                    return translation[1] + scaleFactor * d.target.y;
                });

            node.attr("cx", function(d) {
                    return translation[0] + scaleFactor * d.x + (minWidthPoly1 + minWidthPoly2) / 4;
                })
                .attr("cy", function(d) {
                    return translation[1] + scaleFactor * d.y;
                });

        }


        resize();
        d3.select(window).on("resize", resize);

        function resize() {
            var width = $(window).width() - 20
                //       + minWidthPoly2
                , height = $(window).height() - 20; //(window.innerHeight < 500 ? 500 : window.innerHeight);
            // console.log("this is width: " + width);
            d3.select("svg").attr("width", width).attr("height", height);
            force.size([width, height]).resume();

            rect.attr("x", minWidthPoly1);

            points = "0,0 " + minWidthPoly1 + ",0 " + minWidthPoly2 + "," + height + " " + "0," + height;
            tick();
        }
    }

})();
