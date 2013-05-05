/* 
TREEVIEW  jQuery extension 
Developed by Kristijan Burnik :: (c) 2010 :: http://www.invision-web.net/

jQuery Extensions:
	$.fn.treeview

DOM extensions
	el.data
	el.root
	el.events
	...

Node example
<ul class='expanded'>
<li id='Node1'>
	<a class='expander'></a><span class='title'>Node name</span><span class='options'>edit remove</span>
	<ul class='contracted' id='children'>
		
	</ul>
</li>

Data for tree construction example:
[
	{id:1,title:'Node1',children:[],type:'folder'}
	{id:1,title:'Node2',children:[
		{id:1,title:'Node3',children:[],type:'file'}
	],type:'folder'}
]

*/


// construct takes a data object (e.g. array) and constructs a DOM element for each item according to the "constructor" function,
// when no constructor provided it uses a default constructor (which just returns the value of the current data item)
// each created element get's appended to the parent: 
// $('<ul>').construct([1,2,3],function(value,key) {return $('<li>').html(value)})
// is equal to
// $('<ul>').append($('<li>').html(1)).append($('<li>').html(2)).append($('<li>').html(3))


$.fn.construct = function(object,constructor,objectKey) {
	var $parent = $(this);
	var constructor = constructor;
	if (typeof constructor != 'function') {
		
		var constructor = function(data,key) {
			return data;
		}
	}
	if (typeof object == "string") {
		$parent.append(constructor(object,objectKey));
	} else {
		for (var key in object) $parent.append(constructor(object[key],key));
	}
	return $(this);
}

var TREEVIEW = function(parent,options,action) {
	var $parent = $(parent);
	
	// when string is provided, user want's something from an already constructed treeview or node
	// TODO: check if the tree was constructed at all!!
	if (typeof options == 'string') {
		//  Deal with user's query given thru options -- don't construct anything
		
		var events = $parent[0].root[0].events;
		// when the chosen method (event) exists;
		if (typeof events[options] == 'function') {
			if (typeof action == 'function') {
				// DEFINE user's event function globally to the tree!
				$parent[0].root[0].actions[options]=action;
				return;
			} else {
				// when calling the event e.g. $t.treeview("select");
				if (typeof $parent[0].root[0].actions[options] == 'function' ) {
					// when user has attached his event function
					if ($parent[0].root[0].actions[options]($parent,action) !== false) {
						// user's event function  doesn't block the event (doesn't return false)
						if ($parent.length==1) {
							var result = events[options]($parent,action);
							return result;
						} else {
							$parent.each(function(){
								events[options]($(this),action);
							});
							return $parent;
						}
					} else {
						// user's event function may block event by returning false: e.g. $t.treeview("select",function() {return false;})
						return;
					}
				} else {
					// user hasn't attached an event function, so just run the event and return the result
					if ($parent.length==1) {
						var result = events[options]($parent,action);
						return result;
					} else {
						$parent.each(function(){
								events[options]($(this),action);
						});
						return $parent;
					}					
				}
				
			}
		} else {
			// TODO: some other options except the events?
			console.log("no action found");
			// when options not found, return the parent, TODO: return null maybe ?
			return $parent;
		}
	}
	
	//////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////////////////////
	// Following occurs when tree gets constructed :
	
	var instance = new Date().getTime()*1000; // generate unique ID's for nodes

	// setup default options for tree
	var defaults = {
		serverSide:'treeview/treeview.php',
		ajaxMode:false,
		ajaxCallPrefix:'',
		ajaxComplete:function(ajaxProtocolSet){},
		contract:false,
		editable:true,
		removeable:true,
		sortable:true,
		autoRenameNewNode:true, // when adding new node thru ajax, auto rename it via users input
		useToolbar:true,
		dataStrucutre:'tree', // or it can be linear also!
		removeConfirm:"Are you sure you want to remove this node and all of its children?"
	}	
	
	
	// overwrite defaults with chosen options
	if (typeof options == 'object') {
		if (!options) {
			options=defaults;
		} else {
			for (property in defaults) {
				if (options[property]==null) options[property]=defaults[property];
			}
		}
	}
	//

	
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// SOME INTERNAL AUXILIARY FUNCTIONS FOR NODE MANIPULATION
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	// return matching of compare object to source
	var isMatching=function(source,compare) {
		for (var x in compare) {
			if (compare[x]!=source[x]) return false;
		}
		return true;
	}
	
	// returns a string path to a node identified by the searchQuery;
	var getPathToNode=function(source,searchQuery) {
		var path='';
		var found = false;
		if (typeof source == 'undefined') return '';
		if (source.length==0) return '';
		for (var x in source) {
			if (isMatching(source[x],searchQuery)) {
				return "["+x+"]";
			}
			var branch = getPathToNode(source[x].children,searchQuery);
			if (branch!='') {
				path = "["+x+"].children" + branch;
				return path;
			}		
		}		
		return '';
	}
	
	// find a node's path in the tree structure and update it with new Data
	var updateNodeData = function($node,newData) {
		var id = $node[0].data.id;
		
		// when editing via inputbox:
		if (typeof newData.name != 'undefined') {
			$node.find(".node-title:first").show().html(newData.name);
			$node.find(".node-edit").remove();
		}
		if (typeof newData.count != 'undefined') {
			var html = (newData.count != 0) ?  " ("+newData.count+")" : "";
			$node.find(".node-options:first").html( html );
		}
		
		if (typeof newData.visible != 'undefined') {
			if (newData.visible == 1) {
				$node.find(".node-icon").css("opacity",1);
			} else {
				$node.find(".node-icon").css("opacity",0.4);
			}
		}
			
		var path = getPathToNode(o.data,{id:id});
		for (var property in newData) {
			var value = newData[property];
			$node[0].data[property] = value; // rewrite data to node
			eval("o.data"+path+'.'+property +' = "'+value+'";'); // rewrite data to global o.data
		}
	}
	
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var constructors = {
		children:function(children) {
			var $ul = $('<ul>').addClass("treeview");
			$ul.construct(children,c.node);
			return $ul;
		},
		node:function(data) {
			var $li = $('<li>').attr({id:instance+'_'+data.id});
			
			if (typeof data.visible == 'undefined') data.visible=1;
			
			$li[0].data = data;
			$li[0].root = $root;
			$li[0].toolbar = $toolbar;
			$li.addClass("node");
			$li.addClass(data.type); // e.g. folder/file
			$li.append(c.expander(data.children.length));
			$li.append(c.icon(data.type,data.visible));
			$li.append(c.title(data.name));
			$li.append(c.options(data));
			$li.append(c.children(data.children));
			$li.dblclick(function() {
				e.toggle($(this));
				return false;
			});
			return $li;
		},
		icon:function(type,visible) {
			var type = type || 'folder';
			var $span = $('<span>');
			$span.addClass("node-icon").addClass(type);
			if (visible==0) $span.css("opacity",0.4);
			$span.mousedown(function() {
				if (!o.sortable) return true;
				var $node = $(this).parent();
				$node[0].root[0].draggingNode = $node;
				
				var dropFunction = function() {
					var $draggingNode = $node[0].root[0].draggingNode;
					if ($draggingNode) {
						$draggingNode.css({opacity:100});
						var siblingIDS = [];
						$node.parent().children().each(function() {
							siblingIDS.push($(this)[0].data.id);
						});
						siblingIDS = siblingIDS.toString();
						
						$node.treeview("sortcomplete",siblingIDS);
						
						$node[0].root[0].draggingNode = false;
						
						$span.parent().siblings().unbind("mousemove",dragFunction);
						$(document).unbind("mouseup",dropFunction);
						$node[0].root.css({cursor:'default'});
					}
				}
				
				var dragFunction = function(e) {
					// calculate Y half (top/bottom) to determine append position
					var before = (e.pageY - $(this).offset().top) < ( $(this).height() / 2 );
					var $node = $(this);
					var $draggingNode = $node[0].root[0].draggingNode;
					if ($draggingNode) {
						$node[0].root.css({cursor:'move'});
						if ($draggingNode.attr("id") == $node.attr("id")) return true;
						$draggingNode.css({opacity:0.5});
						if (before) {
							$draggingNode.insertBefore($node);
						} else {
							$draggingNode.insertAfter($node);
						}
						$draggingNode.treeview("sort",$draggingNode.prevAll().length);
						
					}
				};
								
				$span.parent().siblings().bind("mousemove",dragFunction);
				$(document).bind("mouseup",dropFunction);
				return false;
			});
			
			
			
		
			return $span;
		},
		expander:function(hasChildren) {
			var $a =  $('<a>')
			$a.addClass("node-expander").html("");
			$a.addClass((hasChildren) ? "expanded" : "empty");
			$a.click(function() {
				e.toggle($(this).parent());
				return false;
			});
			return $a;
		},
		title:function(title) {
			var $span = $('<span>')
			$span.addClass("node-title").html(title);
			$span.click(function() {
				if (!$(this).hasClass("selected")) {
					$(this).parent().treeview("select");
				}
				return false;
			});
			
			$span.click(function() {
				// show toolbar
				if (o.useToolbar) {
					var x = $(this).offset().left+$(this).width()+10;
					var y = $(this).offset().top;
					$toolbar.css({left:x,top:y});
					$toolbar.show();
					$parent[0].currentNode = $span.parent();
				}				
			});
			
			for (var x in o.events) {
				$span.bind(x,function(e) {
					$(this).parent()[0].func = o.events[x];
					$(this).parent()[0].func(e,$(this).parent()[0].data);
				})
			}
			return $span;
		},
		options:function(data) {
			var $span = $('<span>');
			$span.addClass("node-options").html("");
			if (data.count) {
				$span.html(" ("+data.count+")");
			}
			return $span;
		}
	}
	
	
	
	var toolbarConstructors = {
		tool:function(className,clickFunction) {
			var $a = $('<a>');
			$a.addClass("node-tool").addClass(className);
			$a.html("&nbsp;");
			$a.attr("href",'javascript:');
			
			var clickFunction = clickFunction;
			$a.click(function() {
				clickFunction($parent[0].currentNode);
				$(this).parent().fadeOut(100);
			});
			return $a;
		},
		createToolbar:function() {
			$div = $('<div>').addClass("node-toolbar");
			var tools = {
				"edit":function($node) {$node.treeview("rename");},
				"remove":function($node) {$node.treeview("remove");},
				"new":function($node) {$node.treeview("new");},
				"visible":function($node) {$node.treeview("setvisible");},
				"invisible":function($node) {$node.treeview("setinvisible");}
			}
			for (var x in tools) {
				$div.append(toolbarConstructors.tool(x,tools[x]))
			}
			return $div;
		}
	}
	
	
	var events = {
		toggle:function($node) {
			var $expander = $node.find("a.node-expander:first");
			if (!$expander.hasClass("empty")) {
				if ($expander.hasClass("contracted")) {
					e.expand($node);
				} else {
					e.contract($node);
				}
			}			
			
		},
		contract:function($node){
			var $expander = $node.find("a.node-expander:first");
			if ($expander.hasClass("empty")) return false;
			$expander.removeClass("expanded").addClass("contracted");
			$node.find("ul:first").removeClass("expanded").addClass("contracted");
			$node[0].toolbar.hide();
			return true;
		},
		expand:function($node) {
			var $expander = $node.find("a.node-expander:first");
			if ($expander.hasClass("empty")) return false;
			$expander.removeClass("contracted").addClass("expanded");
			$node.find("ul:first").removeClass("contracted").addClass("expanded");
			return true;
		},
		// testing :: works fine
		update:function($node,newData) {
			updateNodeData($node,newData);
		},
		selected:function($node) {
			return $node[0].root.find(".node-title.selected").parent();
		},
		//
		select:function($node) {
			$node[0].root.find(".node-title.selected").removeClass("selected");
			$node.find(".node-title:first").addClass("selected");
		},
		rename:function($node) {
			if (o.editable) {
				var $span = $node.find(".node-title:first");
				var $input=$('<input>');
				$input.addClass("node-edit");
				$input.val($span.html());
				$input.keydown(function(e) {
					if (e.keyCode == 13) {
						$span.parent().treeview("edit",$(this).val())
					}
					if (e.keyCode == 27) {
						$span.show();
						$(this).remove();
					}
				});
				$input.blur(function() {
					$span.show();
					$(this).remove();
				});
				$span.hide();
				$input.insertAfter($span);
				$input.select();
			}
		},
		edit:function($node,newName) {
			updateNodeData($node,{name:newName});
		},
		root:function(){
			return $parent;
		},
		parent:function($node) {
			return $node.parent().parent();
		},
		children:function($node) {
			var $firstNode = $node.find("ul:first").find("li.node:first");
			return $firstNode.add($firstNode.siblings());
		},
		"new":function($node) {
			
		},
		setvisible:function($node) {
			updateNodeData($node,{visible:1})
		},
		setinvisible:function($node) {
			updateNodeData($node,{visible:0})
		},		
		add:function($node,newNodeData) {
			// when adding directly to root (parent)
			if (typeof $node[0].data == 'undefined') {
				console.log(newNodeData);
				var $newNode = c.node(newNodeData);
				$parent.find("ul.treeview:first").prepend($newNode);
				o.data.push(newNodeData);
			} else {
				// when adding a child node to an existing node
				var path = getPathToNode(o.data,{id:$node[0].data.id});
				eval("refToPath = o.data"+path+".children;");
				refToPath.push(newNodeData);
				var $newNode = c.node(newNodeData);
				$node.find("ul.treeview:first").append($newNode);
				$node.find(".node-expander:first").removeClass("empty").removeClass("contracted").addClass("expanded");
				$node.treeview("expand");
			}
			return $newNode;
		},
		remove:function($node) {
			if (o.removeable) {
				var path = getPathToNode(o.data,{id:$node[0].data.id});
				
				eval("delete o.data"+path+";");
				$node[0].data = null;
					
				
				$node.fadeOut("400",function() {
					var $p = $(this).parent().parent();
					$(this).remove();
					
					if ($p.find("ul:first li").length==0) {
						$p.find(".node-expander:first").removeClass("expanded").removeClass("contracted").addClass("empty");
					}
					
				});
			}
		},
		data:function($node,newData) {
			if (typeof newData == 'object') {
				updateNodeData($node,newData);
			}
			return $node[0].data;
		},
		state:function($node) {
			var $expander = $node.find(".node-expander:first");
			if ($expander.hasClass("contracted")) return "contracted";
			if ($expander.hasClass("expanded")) return "expanded";
			return "empty;"
		},
		sort:function($node,index) {
		},
		sortcomplete:function($node,index) {
			
		},
		find:function($node,searchQuery) {
			var searchQuery = searchQuery;
			return $node.find("li").filter(function() {
				return isMatching($(this)[0].data,searchQuery);
			});
		}
	}
	
	var actions = {};
	var o = options;
	var c = constructors;
	var e = events;
	
	
	
	
	
	
	
	
	
	
	var t = {
		$parent:{},
		createTree:function() {
			if (typeof o.data != 'undefined') {
				// we might be dealing with classic tabular (linear) data like this (children are tabbed in only for reading convenience): 
				/*
					[
						{id:1,name:'Grandpa',parent:0},
							{id:2,name:'Joseph',parent:1},
								{id:4,name:'Joseph Jr.',parent:2},
								{id:5,name:'Joan Jr.',parent:2},
							{id:3,name:'Peter',parent:1},
								{id:6,name:'Peter Jr.',parent:3},
								{id:7,name:'Petra Jr.',parent:3},

					]
				*/
				// if so we need to reconstruct the data like a tree:
				/*
					[
						{id:1,name:'Grandpa',children:[
							{id:2,name:'Joseph',children:[
								{id:4,name:'Joseph Jr.',children:[]},
								{id:5,name:'Joan Jr.',children:[]},
							]},
							{id:3,name:'Peter',children:[
								{id:6,name:'Peter Jr.',children:[]},
								{id:7,name:'Petra Jr.',children:[]},
							]},
						]}
					]
				*/
				// in that case we don't have the children array, instead we have a "parent" field which binds to the ID of the parent node;
				// we firstly map an assoc. structure: map[parent]  = [children];
				// then we recursievly pass thru the map starting with map[0] (the root elements) and reconstruct the data 
				// (we pass the whole map as the second parameter so we can draw the children from it every time we run into a node )

				if (o.dataStructure == 'linear') {
					var convertLinearToTree=function(linearData) {
						var createTreeFromMap = function(mappedData) {
							var output = [];
							if (mappedData == null) return [];
							if (mappedData.length==0) return [];
							for (var x in mappedData) {
								var record = mappedData[x];
								record.children = createTreeFromMap(map[record.id]); // note: map is "global" here (inherited) for saving time and memory
								delete record.parent;
								output.push(record);
							}
							
							return output;
						}
						
						// construct map
						var data = linearData
						var map = {};
						var output =  [];
						for (var x in data) {
							var record = data[x];
							var id = record.id;
							var parent = record.parent;
							if (typeof map[parent] == 'undefined') {
								map[parent] = [];
							}
							map[parent].push(record);
						}
					
					
						// start the conversion with the root (parent id = 0) and keep passing the associative structure
						var output = createTreeFromMap(map[0]);
				
						
						return output;
					}
				
					// store the converted tree data  to the working o.data option
					o.data = convertLinearToTree(o.data);
				}
				
				// finally: create the tree
				t.$parent.html("");
				t.$parent.append(c.children(o.data));
			}
			
			
		},
		construct:function() {
			
			
			
			// attach some basic stuff to the root, since all nodes will access this information
			$parent[0].root = $parent;
			$parent[0].events = events;
			$parent[0].actions = actions;
			
			// all nodes must know it's root in order to access the information and events
			
			$toolbar = toolbarConstructors.createToolbar();
			$("body").prepend($toolbar);
			$toolbar.hide();
			
			$root = $parent;
			
			t.$parent = $parent;
			
			t.createTree();
			
			return t;
		}
	}
	
	var $root = {};
	var $toolbar = {};
	
	t.construct();
	
	if (o.ajaxMode) {
		
		$parent.append($('<div>').addClass("treeview-loader"));
		
		var ajax = {
			$currentNode:{},
			'get':function(data) {
				o.data = data;
				t.createTree();
			},
			'add':function(data) {
				var $node = this.$currentNode;
				var $newNode = $node.treeview("add",data);
				$newNode.treeview("select");
				
				if (o.autoRenameNewNode) $newNode.treeview("rename");
			},
			'edit':function(data) {
				// nothing to do after request
			},
			'remove':function(data) {
				// nothing to do after request
			},
			'sortcomplete':function(data) {
				// nothing to do after request
			},
			send:function(action,$node,data) {
				var action = action;
				var $node = $node;
				var params = data;
				var requestVars = {action:o.ajaxCallPrefix+action};
				if (typeof $node == 'undefined') {
					$node = $parent;
				} else {
					if (typeof $node[0].data != "undefined") {
						requestVars.id  = $node[0].data.id;
					}
					if (typeof data == 'object') {
						for (var x in data) {
							requestVars[x] = data[x];
						}
					}
				}
				
				var action = action;
				
				
				this.$currentNode = $node;
				
				
				$.post(o.serverScript,requestVars,function(response) {
					ajax[action](response);
					o.ajaxComplete({action:action,$node:$node,params:params,response:response});
				},'json');
				
			}
		}
		
		
		// TREEVIEW AUTO EXTENSIONS WHICH WORK WITH AJAX
		var ajaxAutoExtensions = {
			"new":function($node) {
				ajax.send("add",$node,{});
			},
			"edit":function($node,newName){
				ajax.send("edit",$node,{name:newName});
			},
			"remove":function($node) {
				var proceed = true;
				if (o.removeConfirm) {
					proceed = confirm(o.removeConfirm);
				} 
				if (proceed) {
					ajax.send("remove",$node);
					return true;
				} else {
					return false;
				}

			},
			"setvisible":function($node) {
				ajax.send("edit",$node,{visible:1,name:$node[0].data.name});
			},
			"setinvisible":function($node) {
				ajax.send("edit",$node,{visible:0,name:$node[0].data.name});
			},
			"sortcomplete":function($node,siblingIDS) {
				ajax.send("sortcomplete",$node,{ids:siblingIDS});
			}
		}
			
		// apply all extensions to treeview
		for (var ext in ajaxAutoExtensions) {
			$parent.treeview(ext,ajaxAutoExtensions[ext]);
		}

		
		// auto load nodes (CREATE TREE WHEN AJAX RETURNS RESULT)
		ajax.send("get");

		
	}
	
	return t;

	
}

$.fn.treeview = function(options,action) {
	var options = options;
	if ($(this).length==1) {
		return TREEVIEW(this,options,action);
	}
	$(this).each(function(){
		var TV = new TREEVIEW(this,options,action);
	});
}
		
/*
(function($) {
	$.fn.extend({
		treeview:function(options) {
			var options = options;
			$(this).each(function(){
				TREEVIEW(this,options);
			});
		}
	});
})(jQuery);
*/