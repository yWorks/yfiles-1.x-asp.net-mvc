var Module = yfiles.module;
var Class = yfiles.lang.Class;
require.baseUrl = "/lib/yFiles/"; // moving this to the config does not yield the same result
require.config({
    "map": {
        "*": {
            "yfiles/lang": "lib/yFiles/lang.js"
        }
    }
});
var DEFAULT_DESCRIPTION = "NA";
var END = "End", STANDARD = "Standard", START = "Start";
function isDefined(obj) {
    return obj !== undefined && obj !== null;
}

function isUndefined(obj) {
    return !isDefined(obj);
}

function isNullOrEmpty(s) {
    return isUndefined(s) || s.toString().trim().length === 0;
}

function LoadModule() {
    Module("OrgChart", function(exports) {

        var App = Class("App", {


            /***
             * Constructor of the App class.
             */
            constructor: function(options) {

                // create the control for the specified div
                this.graphControl = new yfiles.canvas.GraphControl.ForId(options.designName);

                // enable some interaction
                this.graphControl.inputMode = this.GetDesignMode();

                // enable snapping
                var snapContext = new yfiles.input.GraphSnapContext();
                this.graphControl.inputMode.snapContext = snapContext;

                this.Graph.nodeDefaults.size = new yfiles.geometry.SizeD(180, 60);
                this.Graph.nodeDefaults.style = new yfiles.drawing.TemplateNodeStyle.WithKey("designTemplate");

                window.app = this;
            },

            /***
             * Returns the Graph structure of the graph control.
             */
            get Graph() {
                return this.graphControl.graph;
            },

            /***
             * Performs a graph layout.
             */
            Layout: function() {
                if(isUndefined(this.layouter)) {
                    this.layouter = new yfiles.hierarchic.IncrementalHierarchicLayouter();
                    this.layouter.orthogonalRouting = true;
                }
                this.graphControl.morphLayout(this.layouter, yfiles.system.TimeSpan.fromMilliseconds(1500), this.FitIt.bind(this));

            },

            /***
             * Ensures that the graph fits and is centered in the canvas.
             */
            FitIt: function() {
                this.graphControl.fitGraphBoundsWithInsets(new yfiles.geometry.InsetsD(50));
            },

            /***
             * Connects the given id's.
             */
            Connect: function(link, to) {
                if(isDefined(to)) {
                    return this.Connect(new yFlow.LinkModel.fromOptions({
                        From: link,
                        To: to
                    }));
                }
                else {

                    var source = this.GetNodeById(link.From);
                    var target = this.GetNodeById(link.To);
                    if(isDefined(source) && isDefined(target)) {
                        var edge = this.Graph.createEdge(source, target);
                        edge.tag = link;
                        return edge;
                    }
                    return null;
                }

            },

            /***
             * Returns the NodeModel of the given node.
             */
            GetItem: function(node) {
                if(isUndefined(node)) return null;
                return node.tag;
            },

            /***
             * Defines the behavior of the graph control.
             */
            GetDesignMode: function() {
                var designInputMode = new yfiles.input.GraphEditorInputMode();
                designInputMode.addItemLeftClickedListener(this.EditNodeClicked.bind(this));

                designInputMode.moveInputMode.Enabled = false;
                designInputMode.createBendInputMode.Enabled = false;
                designInputMode.showHandleItems = yfiles.graph.GraphItemTypes.EDGE;
                designInputMode.deletableItems = yfiles.graph.GraphItemTypes.NONE;
                designInputMode.createEdgeInputMode.Enabled = false;
                designInputMode.nodeCreationAllowed = false;
                designInputMode.marqueeSelectableItems = yfiles.graph.GraphItemTypes.NONE;
                designInputMode.deletableItems = yfiles.graph.GraphItemTypes.NODE;
                designInputMode.clickSelectableItems = yfiles.graph.GraphItemTypes.NODE;
                return designInputMode;
            },

            /***
             * Called after the graph control is created and we're ready
             * to effectively create something.
             */
            Load: function() {
                var that = this;

                $.ajax({
                    url: "API/GetHierarchy/0",
                    type: "GET"
                }).then(function(data) {

                    that.Graph.clear();
                    if(data === undefined || data === null) return;
                    var nodes = data.Nodes;
                    var links = data.Links;

                    for(var k = 0; k < nodes.length; k++) {
                        var node = nodes[k];
                        that.AddNode(new OrgChart.NodeModel.fromOptions({
                            Id: node.Id,
                            Label: node.FirstName + " " + node.LastName
                        }));
                    }
                    for(var k = 0; k < links.length; k++) {
                        var link = links[k];
                        that.Connect(new OrgChart.LinkModel.fromOptions({
                            From: link.From,
                            To: link.To
                        }));
                    }
                    that.Layout();
                });

            },

            /***
             * Handles the node-click event and displays additional info in the side-panel.
             */
            EditNodeClicked: function(sender, e) {
                var node = e.item;
                var that = this;
                if(node == null) this.EnableEditor(false);
                else {
                    var id = this.GetItem(node).Id;
                    var fetchPerson = function(id) {
                        return $.ajax({
                            url: "API/GetPerson/" + id,
                            type: "GET"
                        });
                    }
                    var fetchAddress = function(id) {
                        return $.ajax({
                            url: "API/GetPersonAddress/" + id,
                            type: "GET"
                        });
                    }

                    $.when(fetchPerson(id), fetchAddress(id)).then(function(a, b) {


                        if(a[1] !== "success" || b[1] !== "success") {
                            alert("Could not fetch the details of this node.");
                            return;
                        }
                        var data = {
                            person: a[0],
                            address: b[0]
                        };

                        that.EditorData(data);
                        that.currentEdit = data;
                        that.EnableEditor(true);
                    });


                }
            },

            /***
             * Adds a new node to the graph with the given NodeModel.
             */
            AddNode: function(item) {

                var node = this.Graph.createNode();
                node.tag = item;
                return node;
            },

            /***
             * Alias for the Connect method.
             */
            AddEdge: function(item) {
                return this.Connect(item);
            },

            /***
             * Return the diagram node with the given NodeModel.Id.
             */
            GetNodeById: function(id) {
                if(isUndefined(id)) return null;
                for(var i = 0; i < this.Graph.nodes.count; i++) {
                    var node = this.Graph.nodes.getElementAt(i);
                    if(node.tag.Id === id) return node;
                }
                return null;
            },

            /***
             * Get/set method of the textual data.
             */
            EditorData: function(data) {
                if(isUndefined(data)) {

                    $("#FirstName").html("");
                    $("#LastName").html("");
                    $("#Address").html("");
                    $("#City").html("");
                    $("#Zip").html("");
                    $("#Country").html("");
                    this.EnableEditor(false);
                }
                else {
                    this.EnableEditor(true);
                    $("#FirstName").html(data.person.FirstName);
                    $("#LastName").html(data.person.LastName);
                    $("#Address").html(data.address.Address);
                    $("#City").html(data.address.City);
                    $("#Zip").html(data.address.Zip);
                    $("#Country").html(data.address.Country);
                }
            },

            /***
             * Shows/hides the side-panel.
             */
            EnableEditor: function(b) {
                $("#detailsPanel").css("display", b ? "block" : "none");
            }
        });

        var NodeModel = Class("NodeModel",
            {
                constructor: {
                    default: function() {
                        this._id = "Item " + new Date().toISOString();
                        this._label = "New Item";
                    },
                    fromOptions: function(options) {
                        if(isDefined(options.Id)) this.Id = options.Id;
                        else this.Id = "Item " + new Date().toISOString();
                        if(isDefined(options.Label)) this.Label = options.Label;
                        else this.Label = "New Item";
                    }
                },
                get Id() {
                    return this._id;
                },
                set Id(value) {
                    this._id = value;
                },
                get Label() {
                    return this._label;
                },
                set Label(value) {
                    this._label = value;
                },
                $static: {
                    GetData: function(node) {
                        if(isUndefined(node)) return null;
                        var /**NodeModel*/ data = node.tag;
                        return isUndefined(data) ? null : data;
                    },
                    GetId: function(node) {
                        if(isUndefined(node)) return null;
                        var /**NodeModel*/ data = node.tag;
                        return isUndefined(data) ? null : data.Id;
                    },
                    GetLabel: function(node) {
                        if(isUndefined(node)) return null;
                        var /**NodeModel*/ data = node.tag;
                        return isUndefined(data) ? null : data.Label;
                    }
                }
            }
        );
        var LinkModel = Class("LinkModel",
            {
                constructor: {
                    default: function() {
                        this._from = "";
                        this._to = "";
                    },
                    fromOptions: function(options) {
                        if(isDefined(options.From)) this.From = options.From;
                        if(isDefined(options.To)) this.To = options.To;
                    }
                },
                get From() {
                    return this._from;
                },
                set From(value) {
                    this._from = value;
                },
                get To() {
                    return this._to;
                },
                set To(value) {
                    this._to = value;
                }
            });

        exports.NodeModel = NodeModel;
        exports.LinkModel = LinkModel;
        exports.App = App;

    });
}

function requireStart() {
    LoadModule();
    var app = new OrgChart.App({
        designName: "designDiv"
    });
    app.Load();
}

require([
    "lib/yFiles/yWorks.yFilesHTML.DevelopmentLicense.js",
    "lib/yFiles/complete.js"
], requireStart);