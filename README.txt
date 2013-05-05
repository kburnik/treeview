
*******************************************************************************************

TreeView - a jQuery plugin by Kristijan Burnik

*******************************************************************************************


TREEVIEW  jQuery extension 
Developed by Kristijan Burnik :: (nc) 2010 :: http://www.invision-web.net/

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
