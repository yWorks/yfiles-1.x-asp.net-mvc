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
    Module("OrgChart", function (exports) {

        var App = Class("App", {

            constructor: function (options) {

                // create the control for the specified div
                this.graphControl = new yfiles.canvas.GraphControl.ForId(options.designName);

                // enable some interaction
                this.graphControl.inputMode = this.GetDesignMode();

                // enable snapping
                var snapContext = new yfiles.input.GraphSnapContext();
                this.graphControl.inputMode.snapContext = snapContext;

                this.Graph.nodeDefaults.size = new yfiles.geometry.SizeD(120, 80);
                this.Graph.nodeDefaults.style = new yfiles.drawing.TemplateNodeStyle.WithKey("designTemplate");

                // color converters
                //this.SetBindings();




                //this.Graph.clear();
                //this.AddNode(new OrgChart.DesignItem.fromOptions({
                //    Id: "Root",
                //    Type: START,
                //    Label: "Start",
                //    Description: "Please select the option that most appropriately describes your question or situation:"
                //}));
                //this.AddNode(new OrgChart.DesignItem.fromOptions({
                //    Id: "Sink",
                //    Type: 5,
                //    Label: "End",
                //    OptionText: "An option",
                //    Solution: "This is an endpoint of the flow, please specify here the resolution or comment on why/how this terminates a pathflow."
                //}));
                //this.AddEdge(new OrgChart.LinkItem.fromOptions({
                //    From: "Root",
                //    To: "Sink"
                //}));
                //this.Layout();  


                window.app = this;
            },
            get Graph() {
                return this.graphControl.graph;
            },
            /***
           * Called when the user clicks on the surface to add a new node.
           */
            NodeCreator: function (context, graph, location) {
                var newNode = this.AddNode(new OrgChart.DesignItem.fromOptions(
                        {
                            //InitialPositionX = location.X,
                            //InitialPositionY = location.Y,

                        })
                );
                this.Layout();
                $("#idBox").focus();


                return newNode;
            },
            Layout: function () {
                if (isUndefined(this.layouter)) {
                    this.layouter = new yfiles.hierarchic.IncrementalHierarchicLayouter();
                    this.layouter.orthogonalRouting = true;
                }
                this.graphControl.morphLayout(this.layouter, yfiles.system.TimeSpan.fromMilliseconds(1500), this.FitIt.bind(this));

            },
            FitIt: function () {
                this.graphControl.fitGraphBoundsWithInsets(new yfiles.geometry.InsetsD(50));
            },
            Connect: function (link, to) {
                if (isDefined(to)) {
                    return this.Connect(new yFlow.LinkItem.fromOptions({
                        From: link,
                        To: to
                    }));
                }
                else {

                    var source = this.GetNodeById(link.From);
                    var target = this.GetNodeById(link.To);
                    if (isDefined(source) && isDefined(target)) {
                        var edge = this.Graph.createEdge(source, target);
                        edge.tag = link;
                        return edge;
                    }
                    return null;
                }

            },

            GetItem: function (node) {
                if (isUndefined(node)) return null;
                return node.tag;
            },
            EdgeCreator: function (ctx, graph, sourceport, targetport, style) {

                var fromItem = this.GetItem(sourceport.owner);
                var toItem = this.GetItem(targetport.owner);
                if (isUndefined(fromItem) || isUndefined(toItem)) {
                    alert("The endpoints could not be resolved.");
                    return null;
                }
                var link = new yFlow.LinkItem.fromOptions(
                    {
                        From: fromItem.Id,
                        To: toItem.Id
                    });


                var edge = this.Connect(link);
                return edge;
            },
            GetDesignMode: function () {
                var designInputMode = new yfiles.input.GraphEditorInputMode();
                designInputMode.addItemLeftClickedListener(this.EditNodeClicked.bind(this));

                designInputMode.moveInputMode.Enabled = false;
                designInputMode.createBendInputMode.Enabled = false;
                designInputMode.showHandleItems = yfiles.graph.GraphItemTypes.EDGE;
                designInputMode.deletableItems = yfiles.graph.GraphItemTypes.NODE | yfiles.graph.GraphItemTypes.EDGE;
                designInputMode.nodeCreator = this.NodeCreator.bind(this);
                designInputMode.createEdgeInputMode.Enabled = true;
                designInputMode.createEdgeInputMode.portBasedEdgeCreator = this.EdgeCreator.bind(this);
                // designInputMode.createEdgeInputMode.addEdgeCreatedListener(this.EdgeCreated.bind(this));
                designInputMode.marqueeSelectableItems = yfiles.graph.GraphItemTypes.NONE;
                designInputMode.deletableItems = yfiles.graph.GraphItemTypes.NODE;
                designInputMode.clickSelectableItems = yfiles.graph.GraphItemTypes.NODE;
                return designInputMode;
            },
            Load: function () {

                //this.designControl.commandBindings.add(new yfiles.system.CommandBinding(yFlow.App.DELETE_COMMAND, yfiles.lang.delegate(this.DeleteExecuted, this), yfiles.lang.delegate(this.canExecuteDelete, this)));
                //this.designControl.inputBindings.add(new yfiles.system.InputBinding(yFlow.App.DELETE_COMMAND, new yfiles.system.KeyGesture(yfiles.input.Key.DELETE)));
                var that = this;

                $.ajax({
                    url: "API/GetRoot/",
                    type: "GET"
                }).then(function (data) {

                    that.Graph.clear();
                    that.AddNode(new OrgChart.DesignItem.fromOptions({
                        Id: "Root",
                        Type: START,
                        Label: data.FirstName + " " + data.LastName,
                        Description: "Please select the option that most appropriately describes your question or situation:"
                    }));
                    that.Layout();
                });

            },
            SetBindings: function () {
                window.bindings = {};
                var bindings = window.bindings;
                bindings.NodeColorConverter = new OrgChart.NodeColorConverter();
                bindings.NodeStrokeConverter = new OrgChart.NodeStrokeConverter();

            },
            EditNodeClicked: function (sender, e) {
                var node = e.item;
                if (node == null) this.EnableEditor(false);
                else {
                    this.EditorData(node.tag);
                    this.currentEdit = node;
                    this.EnableEditor(true);
                }
            },
            AddNode: function (item) {

                var node = this.Graph.createNode();
                node.tag = item;
                return node;
            },
            AddEdge: function (item) {
                return this.Connect(item);
            },
            GetNodeById: function (id) {
                if (isUndefined(id)) return null;
                for (var i = 0; i < this.Graph.nodes.count; i++) {
                    var node = this.Graph.nodes.getElementAt(i);
                    if (node.tag.Id === id) return node;
                }
                return null;
            },
            /***
           * Get/set method of the textual data.
           */
            EditorData: function (data) {
                if (isUndefined(data)) {
                    this._editorData = null;
                    $("#FirstName").html("");
                    $("#LastName").html("");
                    this.EnableEditor(false);
                }
                else {
                    this.EnableEditor(true);
                    this._editorData = data; // is a DesignItem
                    $("#FirstName").html(data.Label);
                    $("#LastName").html(data.Id);
                }
            },
            EnableEditor: function (b) {
                $("#detailsPanel").css("display", b ? "block" : "none");
            },
        });
        var NodeColorConverter = Class("NodeColorConverter",
           {
               $with: [yfiles.system.IValueConverter],
               convert: function (value, parameter) {
                   return value ? "Orange" : "White";
               },
               convertBack: function (value, parameter) {
                   throw new yfiles.system.NotImplementedException();
               }
           });
        var NodeStrokeConverter = Class("NodeStrokeConverter",
            {
                $with: [yfiles.system.IValueConverter],
                convert: function (value, parameter) {
                    return value ? "White" : "Black";
                },
                convertBack: function (value, /*Object*/ parameter) {
                    throw new yfiles.system.NotImplementedException();
                }
            });
        var DesignItem = Class("DesignItem",
           {
               $with: [yfiles.system.INotifyPropertyChanged],
               constructor: {
                   default: function () {
                       this._description = "NA";
                       this._id = "Item " + new Date().toISOString();
                       this._label = "New Item";
                       this._optionText = "[Please set the option text here]";
                       this._type = STANDARD;
                   },
                   fromOptions: function (options) {
                       if (isDefined(options.Description)) this.Description = options.Description;
                       else this.Description = DEFAULT_DESCRIPTION;
                       if (isDefined(options.Solution)) this.Solution = options.Solution;
                       else this.Solution = "";
                       if (isDefined(options.Id)) this.Id = options.Id;
                       else this.Id = "Item " + new Date().toISOString();
                       if (isDefined(options.Label)) this.Label = options.Label;
                       else this.Label = "New Item";
                       if (isDefined(options.OptionText)) this.OptionText = options.OptionText;
                       else this.OptionText = "[Please set the option text here]";
                       if (isDefined(options.Type)) this.Type = options.Type;
                       else this.Type = STANDARD;
                   }
               },
               $propertyChangedEvent: null,
               addPropertyChangedListener: function (value) {
                   this.$propertyChangedEvent = yfiles.lang.delegate.combine(this.$propertyChangedEvent, value);
               },

               removePropertyChangedListener: function (value) {
                   this.$propertyChangedEvent = yfiles.lang.delegate.remove(this.$propertyChangedEvent, value);
               },
               toString: function () {
                   return "DesignItem class";
               },
               raisePropertyChanged: function (name) {
                   if (this.$propertyChangedEvent !== null) {
                       this.$propertyChangedEvent(this, new yfiles.system.PropertyChangedEventArgs(name));
                   }
               },
               get Id() {
                   return this._id;
               },
               set Id(value) {
                   this._id = value;
                   this.raisePropertyChanged("Id");
               },
               get Description() {
                   return this._description;
               },
               set Description(value) {
                   this._description = value;
                   this.raisePropertyChanged("Description");
               },
               get Label() {
                   return this._label;
               },
               set Label(value) {
                   this._label = value;
                   this.raisePropertyChanged("Label");
               },
               get Type() {
                   return this._type;
               },
               set Type(value) {
                   this._type = value;
                   this.raisePropertyChanged("Type");
               },
               get IsFinal() {
                   return this._type === 5;
               },
               set IsFinal(value) {
                   if (this._type === END) return;
                   this.Type = value ? 5 : STANDARD;
                   this.raisePropertyChanged("IsFinal");
               },
               get IsRoot() {
                   return this._type === END;
               },
               get OptionText() {
                   return this._optionText;
               },
               set OptionText(value) {
                   this._optionText = value;
                   this.raisePropertyChanged("OptionText");
               },
               get Solution() {
                   return this._solution;
               },
               set Solution(value) {
                   this._solution = value;
                   this.raisePropertyChanged("Solution");
               },
               $static: {
                   GetData: function (node) {
                       if (isUndefined(node)) return null;
                       var /**DesignItem*/ data = node.tag;
                       return isUndefined(data) ? null : data;
                   },
                   GetId: function (node) {
                       if (isUndefined(node)) return null;
                       var /**DesignItem*/ data = node.tag;
                       return isUndefined(data) ? null : data.Id;
                   },
                   GetLabel: function (node) {
                       if (isUndefined(node)) return null;
                       var /**DesignItem*/ data = node.tag;
                       return isUndefined(data) ? null : data.Label;
                   },
                   GetOptionText: function (node) {
                       if (isUndefined(node)) return null;
                       var /**DesignItem*/ data = node.tag;
                       return isUndefined(data) ? null : data.OptionText;
                   },
                   GetDescription: function (node) {
                       if (isUndefined(node)) return null;
                       var /**DesignItem*/ data = node.tag;
                       return isUndefined(data) ? null : data.Description;
                   },
                   GetSolution: function (node) {
                       if (isUndefined(node)) return null;
                       var /**DesignItem*/ data = node.tag;
                       return isUndefined(data) ? null : data.Solution;
                   },
                   IsFinalNode: function (node) {
                       var data = yFlow.DesignItem.GetData(node);
                       return isDefined(data) && data.IsFinal;
                   },
                   IsRootNode: function (node) {
                       var data = yFlow.DesignItem.GetData(node);
                       return isDefined(data) && data.IsRoot;
                   }
               }
           }
       );
        var LinkItem = Class("LinkItem",
           {
               constructor: {
                   default: function () {
                       this._from = "";
                       this._to = "";
                   },
                   fromOptions: function (options) {
                       if (isDefined(options.From)) this.From = options.From;
                       if (isDefined(options.To)) this.To = options.To;
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
        exports.NodeColorConverter = NodeColorConverter;
        exports.NodeStrokeConverter = NodeStrokeConverter;
        exports.DesignItem = DesignItem;
        exports.LinkItem = LinkItem;
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