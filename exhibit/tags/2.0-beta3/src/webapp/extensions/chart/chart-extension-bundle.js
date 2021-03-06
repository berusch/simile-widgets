﻿

/* bar-chart-view.js */


Exhibit.BarChartView=function(containerElmt,uiContext){
this._div=containerElmt;
this._uiContext=uiContext;

this._settings={};
this._accessors={
getPointLabel:function(itemID,database,visitor){visitor(database.getObject(itemID,"label"));},
getProxy:function(itemID,database,visitor){visitor(itemID);},
getColorKey:null
};



this._axisFuncs={x:function(x){return x;}};
this._axisInverseFuncs={x:function(x){return x;}};


this._colorKeyCache=new Object();
this._maxColor=0;

var view=this;
this._listener={
onItemsChanged:function(){
view._reconstruct();
}
};
uiContext.getCollection().addListener(this._listener);
};

Exhibit.BarChartView._settingSpecs={
"plotHeight":{type:"int",defaultValue:400},
"bubbleWidth":{type:"int",defaultValue:400},
"bubbleHeight":{type:"int",defaultValue:300},
"xAxisMin":{type:"float",defaultValue:Number.POSITIVE_INFINITY},
"xAxisMax":{type:"float",defaultValue:Number.NEGATIVE_INFINITY},
"xAxisType":{type:"enum",defaultValue:"linear",choices:["linear","log"]},
"yAxisMin":{type:"float",defaultValue:Number.POSITIVE_INFINITY},
"yAxisMax":{type:"float",defaultValue:Number.NEGATIVE_INFINITY},
"yAxisType":{type:"enum",defaultValue:"linear",choices:["linear","log"]},
"xLabel":{type:"text",defaultValue:"x"},
"yLabel":{type:"text",defaultValue:"y"},
"color":{type:"text",defaultValue:"#5D7CBA"},
"colorCoder":{type:"text",defaultValue:null},
"scroll":{type:"boolean",defaultValue:false}
};

Exhibit.BarChartView._accessorSpecs=[
{accessorName:"getProxy",
attributeName:"proxy"
},
{accessorName:"getPointLabel",
attributeName:"pointLabel"
},
{accessorName:"getXY",
alternatives:[
{bindings:[
{attributeName:"xy",
types:["float","text"],
bindingNames:["x","y"]
}
]
},
{bindings:[
{attributeName:"x",
type:"float",
bindingName:"x"
},
{attributeName:"y",
type:"text",
bindingName:"y"
}
]
}
]
},
{accessorName:"getColorKey",
attributeName:"colorKey",
type:"text"
}
];

Exhibit.BarChartView.create=function(configuration,containerElmt,uiContext){
var view=new Exhibit.BarChartView(
containerElmt,
Exhibit.UIContext.create(configuration,uiContext)
);
Exhibit.BarChartView._configure(view,configuration);

view._internalValidate();
view._initializeUI();
return view;
};

Exhibit.BarChartView.createFromDOM=function(configElmt,containerElmt,uiContext){
var configuration=Exhibit.getConfigurationFromDOM(configElmt);
var view=new Exhibit.BarChartView(
containerElmt!=null?containerElmt:configElmt,
Exhibit.UIContext.createFromDOM(configElmt,uiContext)
);

Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt,Exhibit.BarChartView._accessorSpecs,view._accessors);
Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt,Exhibit.BarChartView._settingSpecs,view._settings);
Exhibit.BarChartView._configure(view,configuration);

view._internalValidate();
view._initializeUI();
return view;
};

Exhibit.BarChartView._configure=function(view,configuration){
Exhibit.SettingsUtilities.createAccessors(configuration,Exhibit.BarChartView._accessorSpecs,view._accessors);
Exhibit.SettingsUtilities.collectSettings(configuration,Exhibit.BarChartView._settingSpecs,view._settings);

view._axisFuncs.x=Exhibit.BarChartView._getAxisFunc(view._settings.xAxisType);
view._axisInverseFuncs.x=Exhibit.BarChartView._getAxisInverseFunc(view._settings.xAxisType);




var accessors=view._accessors;






view._getXY=function(itemID,database,visitor){
accessors.getProxy(itemID,database,function(proxy){
accessors.getXY(proxy,database,visitor);
});
};
};


Exhibit.BarChartView._getAxisFunc=function(s){
if(s=="log"){
return function(x){return(Math.log(x)/Math.log(10.0));};
}else{
return function(x){return x;};
}
}


Exhibit.BarChartView._getAxisInverseFunc=function(s){
if(s=="log"){
return function(x){return Math.pow(10,x);};
}else{
return function(x){return x;};
};
}


Exhibit.BarChartView._colors=[
"FF9000",
"5D7CBA",
"A97838",
"8B9BBA",
"FFC77F",
"003EBA",
"29447B",
"543C1C"
];
Exhibit.BarChartView._mixColor="FFFFFF";

Exhibit.BarChartView.evaluateSingle=function(expression,itemID,database){
return expression.evaluateSingleOnItem(itemID,database).value;
}

Exhibit.BarChartView.prototype.dispose=function(){
this._uiContext.getCollection().removeListener(this._listener);

this._toolboxWidget.dispose();
this._toolboxWidget=null;

this._dom.dispose();
this._dom=null;

this._uiContext.dispose();
this._uiContext=null;

this._div.innerHTML="";
this._div=null;
};

Exhibit.BarChartView.prototype._internalValidate=function(){
if("getColorKey"in this._accessors){
if("colorCoder"in this._settings){
this._colorCoder=this._uiContext.getExhibit().getComponent(this._settings.colorCoder);
}

if(this._colorCoder==null){
this._colorCoder=new Exhibit.DefaultColorCoder(this._uiContext);
}
}
};

Exhibit.BarChartView.prototype._initializeUI=function(){
var self=this;
var legendWidgetSettings="_gradientPoints"in this._colorCoder?"gradient":{}

this._div.innerHTML="";
this._dom=Exhibit.ViewUtilities.constructPlottingViewDom(
this._div,
this._uiContext,
true,
{onResize:function(){
self._reconstruct();
}
},
legendWidgetSettings
);
this._toolboxWidget=Exhibit.ToolboxWidget.createFromDOM(this._div,this._div,this._uiContext);

this._dom.plotContainer.className="exhibit-barChartView-plotContainer";
this._dom.plotContainer.style.height=this._settings.plotHeight+"px";
this._reconstruct();
};






Exhibit.BarChartView.prototype._reconstruct=function(){
var self=this;

var collection=this._uiContext.getCollection();
var database=this._uiContext.getDatabase();
var settings=this._settings;
var accessors=this._accessors;

this._dom.plotContainer.innerHTML="";

var scaleX=self._axisFuncs.x;

var unscaleX=self._axisInverseFuncs.x;


var currentSize=collection.countRestrictedItems();
var unplottableItems=[];

this._dom.legendWidget.clear();
if(currentSize>0){
var currentSet=collection.getRestrictedItems();
var hasColorKey=(this._accessors.getColorKey!=null);

var xyToData={};
var xAxisMin=settings.xAxisMin;
var xAxisMax=settings.xAxisMax;




currentSet.visit(function(itemID){
var xys=[];

self._getXY(itemID,database,function(xy){if("x"in xy&&"y"in xy)xys.push(xy);});


if(xys.length>0){
var colorKeys=null;
if(hasColorKey){
colorKeys=new Exhibit.Set();
accessors.getColorKey(itemID,database,function(v){colorKeys.add(v);});
}

for(var i=0;i<xys.length;i++){
var xy=xys[i];
var xyKey=xy.x+","+xy.y;
if(xyKey in xyToData){
var xyData=xyToData[xyKey];
xyData.items.push(itemID);
if(hasColorKey){
xyData.colorKeys.addSet(colorKeys);
}
}else{
try{
xy.scaledX=scaleX(xy.x);


if(!isFinite(xy.scaledX)){
continue;
}
}catch(e){
continue;
}

var xyData={
xy:xy,
items:[itemID]
};
if(hasColorKey){
xyData.colorKeys=colorKeys;
}
xyToData[xyKey]=xyData;

xAxisMin=Math.min(xAxisMin,xy.scaledX);
xAxisMax=Math.max(xAxisMax,xy.scaledX);


}
}
}else{
unplottableItems.push(itemID);
}
});


var xDiff=xAxisMax-xAxisMin;


var xInterval=1;
if(xDiff>1){
while(xInterval*20<xDiff){
xInterval*=10;
}
}else{
while(xInterval<xDiff*20){
xInterval/=10;
}
}
xAxisMin=Math.floor(xAxisMin/xInterval)*xInterval;
xAxisMax=Math.ceil(xAxisMax/xInterval)*xInterval;


settings.xAxisMin=xAxisMin;
settings.xAxisMax=xAxisMax;




var canvasFrame=document.createElement("div");
canvasFrame.className=SimileAjax.Platform.browser.isIE?
"exhibit-barChartView-canvasFrame-ie":
"exhibit-barChartView-canvasFrame";
this._dom.plotContainer.appendChild(canvasFrame);
if(self._settings.scroll){
canvasFrame.style.overflow="scroll";
}


var theTable=document.createElement("table");
var tableBody=document.createElement("tbody");
var theRow=document.createElement("tr");
var leftCol=document.createElement("td");
var rightCol=document.createElement("td");
var labelpart=document.createElement("div");
var barpart=document.createElement("div");

theTable.style.width="100%";


barpart.style.position="relative";
barpart.style.width="100%";
barpart.style.float="left";

leftCol.appendChild(labelpart);
rightCol.appendChild(barpart);
theRow.appendChild(leftCol);
theRow.appendChild(rightCol);
tableBody.appendChild(theRow);
theTable.appendChild(tableBody);

canvasFrame.appendChild(theTable);



var canvasDiv=document.createElement("div");
canvasDiv.className="exhibit-barChartView-canvas";
canvasDiv.style.height="100%";
barpart.appendChild(canvasDiv);


var yAxisDiv=document.createElement("div");
yAxisDiv.className=SimileAjax.Platform.browser.isIE?
"exhibit-barChartView-yAxis-ie":
"exhibit-barChartView-yAxis";
this._dom.plotContainer.appendChild(yAxisDiv);

var yAxisDivInner=document.createElement("div");
yAxisDivInner.style.position="relative";
yAxisDivInner.style.height="100%";
yAxisDiv.appendChild(yAxisDivInner);



var yNameDiv=document.createElement("div");
yNameDiv.className="exhibit-barChartView-yAxisName";
yNameDiv.innerHTML=settings.yLabel;
yAxisDivInner.appendChild(yNameDiv);




var colorCodingFlags={mixed:false,missing:false,others:false,keys:new Exhibit.Set()};
var addBarAtLocation=function(xyData){
var items=xyData.items;

var color=settings.color;
if(hasColorKey){
color=self._colorCoder.translateSet(xyData.colorKeys,colorCodingFlags);
}

var xy=xyData.xy;


var thelabel=document.createElement("div");
var thetext=document.createTextNode(xy.y);
thelabel.appendChild(thetext);
thelabel.style.height="1.5em";
labelpart.appendChild(thelabel);

var bardiv=document.createElement("div");
bardiv.style.position="relative";
bardiv.style.height="1.5em";
bardiv.style.zIndex="2";
var bar=document.createElement("div");
bar.className="exhibit-barChartView-bar";
bar.style.backgroundColor=color;
bar.style.textAlign="right";
bar.style.left="0";

var barwidth=Math.floor(100*(scaleX(xy.x)-xAxisMin)/(xAxisMax-xAxisMin));
bar.style.width=barwidth+"%";
bar.style.borderStyle="solid";
bar.style.borderWidth="1px";
bar.style.paddingLeft="0px";
var thetext=document.createTextNode(xy.x);
bar.appendChild(thetext);
bardiv.appendChild(bar);
canvasDiv.appendChild(bardiv);
SimileAjax.WindowManager.registerEvent(bar,"click",
function(elmt,evt,target){self._openPopup(bar,items);});
SimileAjax.WindowManager.registerEvent(thelabel,"click",
function(elmt,evt,target){self._openPopup(thelabel,items);});





}

for(xyKey in xyToData){
addBarAtLocation(xyToData[xyKey]);
}

leftCol.style.width="1px";
theTable.style.tableLayout="auto";

var xAxisDiv=document.createElement("div");
xAxisDiv.className="exhibit-barChartView-xAxis";





var xAxisDivInner=document.createElement("div");
xAxisDivInner.style.position="relative";
xAxisDivInner.style.left=0;
xAxisDiv.appendChild(xAxisDivInner);

var canvasWidth=canvasDiv.offsetWidth;
var canvasHeight=canvasDiv.offsetHeight;
var xScale=canvasWidth/(xAxisMax-xAxisMin);


canvasDiv.style.display="none";


var makeMakeLabel=function(interval,unscale){

if(interval>=1000000){
return function(n){return Math.floor(unscale(n)/1000000)+"M";};
}else if(interval>=1000){
return function(n){return Math.floor(unscale(n)/1000)+"K";};
}else{
return function(n){return unscale(n);};
}
};
var makeLabelX=makeMakeLabel(xInterval,unscaleX);


for(var x=xAxisMin+xInterval;x<xAxisMax;x+=xInterval){
var left=Math.floor((x-xAxisMin)*xScale);

var div=document.createElement("div");
div.className="exhibit-barChartView-gridLine";
div.style.width="1px";
div.style.left=left+"px";
div.style.top="0px";
div.style.height="100%";
div.style.zIndex="1";
canvasDiv.appendChild(div);

var labelDiv=document.createElement("div");
labelDiv.className="exhibit-barChartView-xAxisLabel";
labelDiv.style.left=left+"px";
labelDiv.innerHTML=makeLabelX(x);
xAxisDivInner.appendChild(labelDiv);
}
var xNameDiv=document.createElement("div");
xNameDiv.className="exhibit-barChartView-xAxisName";
xNameDiv.innerHTML=settings.xLabel;

xAxisDivInner.appendChild(xNameDiv);
barpart.appendChild(xAxisDiv);

canvasDiv.style.display="block";

if(hasColorKey){
var legendWidget=this._dom.legendWidget;
var colorCoder=this._colorCoder;
var keys=colorCodingFlags.keys.toArray().sort();
if(this._colorCoder._gradientPoints!=null){
legendWidget.addGradient(this._colorCoder._gradientPoints);
}else{
for(var k=0;k<keys.length;k++){
var key=keys[k];
var color=colorCoder.translate(key);
legendWidget.addEntry(color,key);
}
}

if(colorCodingFlags.others){
legendWidget.addEntry(colorCoder.getOthersColor(),colorCoder.getOthersLabel());
}
if(colorCodingFlags.mixed){
legendWidget.addEntry(colorCoder.getMixedColor(),colorCoder.getMixedLabel());
}
if(colorCodingFlags.missing){
legendWidget.addEntry(colorCoder.getMissingColor(),colorCoder.getMissingLabel());
}
}
}
this._dom.setUnplottableMessage(currentSize,unplottableItems);
};

Exhibit.BarChartView.prototype._openPopup=function(elmt,items){
Exhibit.ViewUtilities.openBubbleForItems(elmt,items,this._uiContext);
};




/* pivot-table-view.js */


Exhibit.PivotTableView=function(containerElmt,uiContext){
this._div=containerElmt;
this._uiContext=uiContext;

this._rowPath=null;
this._columnPath=null;
this._cellExpression=null;

this._settings={};

var view=this;
this._listener={
onItemsChanged:function(){
view._reconstruct();
}
};
uiContext.getCollection().addListener(this._listener);
};

Exhibit.PivotTableView.create=function(configuration,containerElmt,uiContext){
var view=new Exhibit.PivotTableView(
containerElmt,
Exhibit.UIContext.create(configuration,uiContext)
);

Exhibit.PivotTableView._configure(view,configuration);

view._initializeUI();
return view;
};

Exhibit.PivotTableView.createFromDOM=function(configElmt,containerElmt,uiContext){
var configuration=Exhibit.getConfigurationFromDOM(configElmt);
var view=new Exhibit.PivotTableView(
containerElmt!=null?containerElmt:configElmt,
Exhibit.UIContext.createFromDOM(configElmt,uiContext)
);

view._columnPath=Exhibit.PivotTableView._parsePath(Exhibit.getAttribute(configElmt,"column"));
view._rowPath=Exhibit.PivotTableView._parsePath(Exhibit.getAttribute(configElmt,"row"));
view._cellExpression=Exhibit.PivotTableView._parseExpression(Exhibit.getAttribute(configElmt,"cell"));
Exhibit.PivotTableView._configure(view,configuration);

view._initializeUI();
return view;
};

Exhibit.PivotTableView._configure=function(view,configuration){
if("column"in configuration){
view._columnPath=Exhibit.PivotTableView._parsePath(configuration.column);
}
if("row"in configuration){
view._rowPath=Exhibit.PivotTableView._parsePath(configuration.row);
}
if("cell"in configuration){
view._cellExpression=Exhibit.PivotTableView._parseExpression(configuration.cell);
}
};

Exhibit.PivotTableView._parseExpression=function(s){
try{
return Exhibit.ExpressionParser.parse(s);
}catch(e){
SimileAjax.Debug.exception(e,"Error parsing expression "+s);
}
return null;
};

Exhibit.PivotTableView._parsePath=function(s){
try{
var expression=Exhibit.ExpressionParser.parse(s);
if(expression.isPath()){
return expression.getPath();
}else{
SimileAjax.Debug.log("Expecting a path but got a full expression: "+s);
}
}catch(e){
SimileAjax.Debug.exception(e,"Error parsing expression "+s);
}
return null;
};

Exhibit.PivotTableView.prototype.dispose=function(){
this._uiContext.getCollection().removeListener(this._listener);

this._toolboxWidget.dispose();
this._toolboxWidget=null;

this._collectionSummaryWidget.dispose();
this._collectionSummaryWidget=null;

this._uiContext.dispose();
this._uiContext=null;

this._div.innerHTML="";

this._dom=null;
this._div=null;
};

Exhibit.PivotTableView.prototype._initializeUI=function(){
var self=this;

this._div.innerHTML="";
this._dom=Exhibit.PivotTableView.constructDom(this._div);
this._collectionSummaryWidget=Exhibit.CollectionSummaryWidget.create(
{},
this._dom.collectionSummaryDiv,
this._uiContext
);
this._toolboxWidget=Exhibit.ToolboxWidget.createFromDOM(this._div,this._div,this._uiContext);

this._reconstruct();
};

Exhibit.PivotTableView.prototype._reconstruct=function(){
this._dom.tableContainer.innerHTML="";

var currentSize=this._uiContext.getCollection().countRestrictedItems();
if(currentSize>0){
var currentSet=this._uiContext.getCollection().getRestrictedItems();
if(this._columnPath!=null&&this._rowPath!=null&&this._cellExpression!=null){
this._makeTable(currentSet);
}
}
};

Exhibit.PivotTableView.prototype._makeTable=function(items){
var self=this;
var database=this._uiContext.getDatabase();

var rowResults=this._rowPath.walkForward(items,"item",database).getSet();
var columnResults=this._columnPath.walkForward(items,"item",database).getSet();

var rowValues=Exhibit.PivotTableView._sortValues(rowResults);
var columnValues=Exhibit.PivotTableView._sortValues(columnResults);

var rowCount=rowValues.length;
var columnCount=columnValues.length;

var evenColor="#eee";
var oddColor="#fff";

var table=document.createElement("table");
table.cellPadding=2;
table.cellSpacing=0;

var rowToInsert=0;
var tr,td;

for(var c=0;c<columnCount;c++){
var cellToInsert=0;

tr=table.insertRow(rowToInsert++);

td=tr.insertCell(cellToInsert++);

if(c>0){
td=tr.insertCell(cellToInsert++);
td.rowSpan=columnCount-c+1;
td.style.backgroundColor=(c%2)==0?oddColor:evenColor;
td.innerHTML="\u00a0";
}

td=tr.insertCell(cellToInsert++);
td.colSpan=columnCount-c+1;
td.style.backgroundColor=(c%2)==1?oddColor:evenColor;
td.innerHTML=columnValues[c].label;
}

tr=table.insertRow(rowToInsert++);
td=tr.insertCell(0);
td=tr.insertCell(1);
td.style.backgroundColor=(columnCount%2)==0?oddColor:evenColor;
td.innerHTML="\u00a0";
td=tr.insertCell(2);

for(var r=0;r<rowCount;r++){
var cellToInsert=0;
var rowPair=rowValues[r];
var rowValue=rowPair.value;

tr=table.insertRow(rowToInsert++);

td=tr.insertCell(cellToInsert++);
td.innerHTML=rowValues[r].label;
td.style.borderBottom="1px solid #aaa";

var rowItems=this._rowPath.evaluateBackward(rowValue,rowResults.valueType,items,database).getSet();
for(var c=0;c<columnCount;c++){
var columnPair=columnValues[c];
var columnValue=columnPair.value;

td=tr.insertCell(cellToInsert++);
td.style.backgroundColor=(c%2)==1?oddColor:evenColor;
td.style.borderBottom="1px solid #ccc";
td.title=rowPair.label+" / "+columnPair.label;

var cellItemResults=this._columnPath.evaluateBackward(columnValue,columnResults.valueType,rowItems,database);
var cellResults=this._cellExpression.evaluate(
{"value":cellItemResults.getSet()},
{"value":cellItemResults.valueType},
"value",
database
);

if(cellResults.valueType=="number"&&cellResults.values.size()==1){
cellResults.values.visit(function(v){
if(v!=0){
td.appendChild(document.createTextNode(v));
}else{
td.appendChild(document.createTextNode("\u00a0"));
}
});
}else{
var first=true;
cellResults.values.visit(function(v){
if(first){
first=false;
}else{
td.appendChild(document.createTextNode(", "));
}
td.appendChild(document.createTextNode(v));
});
}
}
}

this._dom.tableContainer.appendChild(table);
};

Exhibit.PivotTableView._sortValues=function(values,valueType,database){
var a=[];
values.visit(valueType=="item"?
function(v){
var label=database.getObject(v,"label");
a.push({
value:v,
label:label!=null?label:v
});
}:
function(v){
a.push({
value:v,
label:v
});
}
);
a.sort(function(o1,o2){
var c=o1.label.localeCompare(o2.label);
return c!=null?c:o1.value.localeCompare(o2.value);
});
return a;
};

Exhibit.PivotTableView.prototype._openPopup=function(elmt,items){
var coords=SimileAjax.DOM.getPageCoordinates(elmt);
var bubble=SimileAjax.Graphics.createBubbleForPoint(
coords.left+Math.round(elmt.offsetWidth/2),
coords.top+Math.round(elmt.offsetHeight/2),
400,
300
);

if(items.length>1){
var ul=document.createElement("ul");
for(var i=0;i<items.length;i++){
var li=document.createElement("li");
li.appendChild(Exhibit.UI.makeItemSpan(items[i],null,this._uiContext));
ul.appendChild(li);
}
bubble.content.appendChild(ul);
}else{
var itemLensDiv=document.createElement("div");
var itemLens=this._uiContext.getLensRegistry().createLens(items[0],itemLensDiv,this._uiContext);
bubble.content.appendChild(itemLensDiv);
}
};

Exhibit.PivotTableView.constructDom=function(div){
var l10n=Exhibit.PivotTableView.l10n;
var template={
elmt:div,
children:[
{tag:"div",
className:"exhibit-collectionView-header",
field:"collectionSummaryDiv"
},
{tag:"div",
field:"tableContainer",
className:"exhibit-pivotTableView-tableContainer"
}
]
};

return SimileAjax.DOM.createDOMFromTemplate(template);
};


/* scatter-plot-view.js */


Exhibit.ScatterPlotView=function(containerElmt,uiContext){
this._div=containerElmt;
this._uiContext=uiContext;

this._settings={};
this._accessors={
getPointLabel:function(itemID,database,visitor){visitor(database.getObject(itemID,"label"));},
getProxy:function(itemID,database,visitor){visitor(itemID);},
getColorKey:null
};


this._axisFuncs={x:function(x){return x;},y:function(y){return y;}};
this._axisInverseFuncs={x:function(x){return x;},y:function(y){return y;}};

this._colorKeyCache=new Object();
this._maxColor=0;

var view=this;
this._listener={
onItemsChanged:function(){
view._reconstruct();
}
};
uiContext.getCollection().addListener(this._listener);
};

Exhibit.ScatterPlotView._settingSpecs={
"plotHeight":{type:"int",defaultValue:400},
"bubbleWidth":{type:"int",defaultValue:400},
"bubbleHeight":{type:"int",defaultValue:300},
"xAxisMin":{type:"float",defaultValue:Number.POSITIVE_INFINITY},
"xAxisMax":{type:"float",defaultValue:Number.NEGATIVE_INFINITY},
"xAxisType":{type:"enum",defaultValue:"linear",choices:["linear","log"]},
"yAxisMin":{type:"float",defaultValue:Number.POSITIVE_INFINITY},
"yAxisMax":{type:"float",defaultValue:Number.NEGATIVE_INFINITY},
"yAxisType":{type:"enum",defaultValue:"linear",choices:["linear","log"]},
"xLabel":{type:"text",defaultValue:"x"},
"yLabel":{type:"text",defaultValue:"y"},
"color":{type:"text",defaultValue:"#0000aa"},
"colorCoder":{type:"text",defaultValue:null}
};

Exhibit.ScatterPlotView._accessorSpecs=[
{accessorName:"getProxy",
attributeName:"proxy"
},
{accessorName:"getPointLabel",
attributeName:"pointLabel"
},
{accessorName:"getXY",
alternatives:[
{bindings:[
{attributeName:"xy",
types:["float","float"],
bindingNames:["x","y"]
}
]
},
{bindings:[
{attributeName:"x",
type:"float",
bindingName:"x"
},
{attributeName:"y",
type:"float",
bindingName:"y"
}
]
}
]
},
{accessorName:"getColorKey",
attributeName:"colorKey",
type:"text"
}
];

Exhibit.ScatterPlotView.create=function(configuration,containerElmt,uiContext){
var view=new Exhibit.ScatterPlotView(
containerElmt,
Exhibit.UIContext.create(configuration,uiContext)
);
Exhibit.ScatterPlotView._configure(view,configuration);

view._internalValidate();
view._initializeUI();
return view;
};

Exhibit.ScatterPlotView.createFromDOM=function(configElmt,containerElmt,uiContext){
var configuration=Exhibit.getConfigurationFromDOM(configElmt);
var view=new Exhibit.ScatterPlotView(
containerElmt!=null?containerElmt:configElmt,
Exhibit.UIContext.createFromDOM(configElmt,uiContext)
);

Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt,Exhibit.ScatterPlotView._accessorSpecs,view._accessors);
Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt,Exhibit.ScatterPlotView._settingSpecs,view._settings);
Exhibit.ScatterPlotView._configure(view,configuration);

view._internalValidate();
view._initializeUI();
return view;
};

Exhibit.ScatterPlotView._configure=function(view,configuration){
Exhibit.SettingsUtilities.createAccessors(configuration,Exhibit.ScatterPlotView._accessorSpecs,view._accessors);
Exhibit.SettingsUtilities.collectSettings(configuration,Exhibit.ScatterPlotView._settingSpecs,view._settings);

view._axisFuncs.x=Exhibit.ScatterPlotView._getAxisFunc(view._settings.xAxisType);
view._axisInverseFuncs.x=Exhibit.ScatterPlotView._getAxisInverseFunc(view._settings.xAxisType);

view._axisFuncs.y=Exhibit.ScatterPlotView._getAxisFunc(view._settings.yAxisType);
view._axisInverseFuncs.y=Exhibit.ScatterPlotView._getAxisInverseFunc(view._settings.yAxisType);

var accessors=view._accessors;
view._getXY=function(itemID,database,visitor){
accessors.getProxy(itemID,database,function(proxy){
accessors.getXY(proxy,database,visitor);
});
};
};


Exhibit.ScatterPlotView._getAxisFunc=function(s){
if(s=="log"){
return function(x){return(Math.log(x)/Math.log(10.0));};
}else{
return function(x){return x;};
}
}


Exhibit.ScatterPlotView._getAxisInverseFunc=function(s){
if(s=="log"){
return function(x){return Math.pow(10,x);};
}else{
return function(x){return x;};
};
}


Exhibit.ScatterPlotView._colors=[
"FF9000",
"5D7CBA",
"A97838",
"8B9BBA",
"FFC77F",
"003EBA",
"29447B",
"543C1C"
];
Exhibit.ScatterPlotView._mixColor="FFFFFF";

Exhibit.ScatterPlotView.evaluateSingle=function(expression,itemID,database){
return expression.evaluateSingleOnItem(itemID,database).value;
}

Exhibit.ScatterPlotView.prototype.dispose=function(){
this._uiContext.getCollection().removeListener(this._listener);

this._toolboxWidget.dispose();
this._toolboxWidget=null;

this._dom.dispose();
this._dom=null;

this._uiContext.dispose();
this._uiContext=null;

this._div.innerHTML="";
this._div=null;
};

Exhibit.ScatterPlotView.prototype._internalValidate=function(){
if("getColorKey"in this._accessors){
if("colorCoder"in this._settings){
this._colorCoder=this._uiContext.getExhibit().getComponent(this._settings.colorCoder);
}

if(this._colorCoder==null){
this._colorCoder=new Exhibit.DefaultColorCoder(this._uiContext);
}
}
};

Exhibit.ScatterPlotView.prototype._initializeUI=function(){
var self=this;
var legendWidgetSettings="_gradientPoints"in this._colorCoder?"gradient":{}

this._div.innerHTML="";
this._dom=Exhibit.ViewUtilities.constructPlottingViewDom(
this._div,
this._uiContext,
true,
{onResize:function(){
self._reconstruct();
}
},
legendWidgetSettings
);
this._toolboxWidget=Exhibit.ToolboxWidget.createFromDOM(this._div,this._div,this._uiContext);

this._dom.plotContainer.className="exhibit-scatterPlotView-plotContainer";
this._dom.plotContainer.style.height=this._settings.plotHeight+"px";
this._reconstruct();
};

Exhibit.ScatterPlotView.prototype._reconstruct=function(){
var self=this;
var collection=this._uiContext.getCollection();
var database=this._uiContext.getDatabase();
var settings=this._settings;
var accessors=this._accessors;

this._dom.plotContainer.innerHTML="";

var scaleX=self._axisFuncs.x;
var scaleY=self._axisFuncs.y;
var unscaleX=self._axisInverseFuncs.x;
var unscaleY=self._axisInverseFuncs.y;

var currentSize=collection.countRestrictedItems();
var unplottableItems=[];

this._dom.legendWidget.clear();
if(currentSize>0){
var currentSet=collection.getRestrictedItems();
var hasColorKey=(this._accessors.getColorKey!=null);

var xyToData={};
var xAxisMin=settings.xAxisMin;
var xAxisMax=settings.xAxisMax;
var yAxisMin=settings.yAxisMin;
var yAxisMax=settings.yAxisMax;


currentSet.visit(function(itemID){
var xys=[];
self._getXY(itemID,database,function(xy){if("x"in xy&&"y"in xy)xys.push(xy);});

if(xys.length>0){
var colorKeys=null;
if(hasColorKey){
colorKeys=new Exhibit.Set();
accessors.getColorKey(itemID,database,function(v){colorKeys.add(v);});
}

for(var i=0;i<xys.length;i++){
var xy=xys[i];
var xyKey=xy.x+","+xy.y;
if(xyKey in xyToData){
var xyData=xyToData[xyKey];
xyData.items.push(itemID);
if(hasColorKey){
xyData.colorKeys.addSet(colorKeys);
}
}else{
try{
xy.scaledX=scaleX(xy.x);
xy.scaledY=scaleY(xy.y);
if(!isFinite(xy.scaledX)||!isFinite(xy.scaledY)){
continue;
}
}catch(e){
continue;
}

var xyData={
xy:xy,
items:[itemID]
};
if(hasColorKey){
xyData.colorKeys=colorKeys;
}
xyToData[xyKey]=xyData;

xAxisMin=Math.min(xAxisMin,xy.scaledX);
xAxisMax=Math.max(xAxisMax,xy.scaledX);
yAxisMin=Math.min(yAxisMin,xy.scaledY);
yAxisMax=Math.max(yAxisMax,xy.scaledY);
}
}
}else{
unplottableItems.push(itemID);
}
});


var xDiff=xAxisMax-xAxisMin;
var yDiff=yAxisMax-yAxisMin;

var xInterval=1;
if(xDiff>1){
while(xInterval*20<xDiff){
xInterval*=10;
}
}else{
while(xInterval<xDiff*20){
xInterval/=10;
}
}
xAxisMin=Math.floor(xAxisMin/xInterval)*xInterval;
xAxisMax=Math.ceil(xAxisMax/xInterval)*xInterval;

var yInterval=1;
if(yDiff>1){
while(yInterval*20<yDiff){
yInterval*=10;
}
}else{
while(yInterval<yDiff*20){
yInterval/=10;
}
}
yAxisMin=Math.floor(yAxisMin/yInterval)*yInterval;
yAxisMax=Math.ceil(yAxisMax/yInterval)*yInterval;

settings.xAxisMin=xAxisMin;
settings.xAxisMax=xAxisMax;
settings.yAxisMin=yAxisMin;
settings.yAxisMax=yAxisMax;


var canvasFrame=document.createElement("div");
canvasFrame.className=SimileAjax.Platform.browser.isIE?
"exhibit-scatterPlotView-canvasFrame-ie":
"exhibit-scatterPlotView-canvasFrame";
this._dom.plotContainer.appendChild(canvasFrame);

var canvasDiv=document.createElement("div");
canvasDiv.className="exhibit-scatterPlotView-canvas";
canvasDiv.style.height="100%";
canvasFrame.appendChild(canvasDiv);

var xAxisDiv=document.createElement("div");
xAxisDiv.className="exhibit-scatterPlotView-xAxis";
this._dom.plotContainer.appendChild(xAxisDiv);

var xAxisDivInner=document.createElement("div");
xAxisDivInner.style.position="relative";
xAxisDiv.appendChild(xAxisDivInner);

var yAxisDiv=document.createElement("div");
yAxisDiv.className=SimileAjax.Platform.browser.isIE?
"exhibit-scatterPlotView-yAxis-ie":
"exhibit-scatterPlotView-yAxis";
this._dom.plotContainer.appendChild(yAxisDiv);

var yAxisDivInner=document.createElement("div");
yAxisDivInner.style.position="relative";
yAxisDivInner.style.height="100%";
yAxisDiv.appendChild(yAxisDivInner);

var canvasWidth=canvasDiv.offsetWidth;
var canvasHeight=canvasDiv.offsetHeight;
var xScale=canvasWidth/(xAxisMax-xAxisMin);
var yScale=canvasHeight/(yAxisMax-yAxisMin);

canvasDiv.style.display="none";


var makeMakeLabel=function(interval,unscale){

if(interval>=1000000){
return function(n){return Math.floor(unscale(n)/1000000)+"M";};
}else if(interval>=1000){
return function(n){return Math.floor(unscale(n)/1000)+"K";};
}else{
return function(n){return unscale(n);};
}
};
var makeLabelX=makeMakeLabel(xInterval,unscaleX);
var makeLabelY=makeMakeLabel(yInterval,unscaleY);

for(var x=xAxisMin+xInterval;x<xAxisMax;x+=xInterval){
var left=Math.floor((x-xAxisMin)*xScale);

var div=document.createElement("div");
div.className="exhibit-scatterPlotView-gridLine";
div.style.width="1px";
div.style.left=left+"px";
div.style.top="0px";
div.style.height="100%";
canvasDiv.appendChild(div);

var labelDiv=document.createElement("div");
labelDiv.className="exhibit-scatterPlotView-xAxisLabel";
labelDiv.style.left=left+"px";
labelDiv.innerHTML=makeLabelX(x);
xAxisDivInner.appendChild(labelDiv);
}
var xNameDiv=document.createElement("div");
xNameDiv.className="exhibit-scatterPlotView-xAxisName";
xNameDiv.innerHTML=settings.xLabel;
xAxisDivInner.appendChild(xNameDiv);

for(var y=yAxisMin+yInterval;y<yAxisMax;y+=yInterval){
var bottom=Math.floor((y-yAxisMin)*yScale);

var div=document.createElement("div");
div.className="exhibit-scatterPlotView-gridLine";
div.style.height="1px";
div.style.bottom=bottom+"px";
div.style.left="0px";
div.style.width="100%";
canvasDiv.appendChild(div);

var labelDiv=document.createElement("div");
labelDiv.className="exhibit-scatterPlotView-yAxisLabel";
labelDiv.style.bottom=bottom+"px";
labelDiv.innerHTML=makeLabelY(y);
yAxisDivInner.appendChild(labelDiv);
}
var yNameDiv=document.createElement("div");
yNameDiv.className="exhibit-scatterPlotView-yAxisName";
yNameDiv.innerHTML=settings.yLabel;
yAxisDivInner.appendChild(yNameDiv);


var colorCodingFlags={mixed:false,missing:false,others:false,keys:new Exhibit.Set()};
var addPointAtLocation=function(xyData){
var items=xyData.items;

var color=settings.color;
if(hasColorKey){
color=self._colorCoder.translateSet(xyData.colorKeys,colorCodingFlags);
}

var xy=xyData.xy;
var marker=Exhibit.ScatterPlotView._makePoint(
color,
Math.floor((xy.scaledX-xAxisMin)*xScale),
Math.floor((xy.scaledY-yAxisMin)*yScale),
xyData.items+": "+
settings.xLabel+" = "+xy.x+", "+
settings.yLabel+" = "+xy.y
);

SimileAjax.WindowManager.registerEvent(marker,"click",
function(elmt,evt,target){self._openPopup(marker,items);});

canvasDiv.appendChild(marker);
}

for(xyKey in xyToData){
addPointAtLocation(xyToData[xyKey]);
}
canvasDiv.style.display="block";

if(hasColorKey){
var legendWidget=this._dom.legendWidget;
var colorCoder=this._colorCoder;
var keys=colorCodingFlags.keys.toArray().sort();
if(this._colorCoder._gradientPoints!=null){
legendWidget.addGradient(this._colorCoder._gradientPoints);
}else{
for(var k=0;k<keys.length;k++){
var key=keys[k];
var color=colorCoder.translate(key);
legendWidget.addEntry(color,key);
}
}

if(colorCodingFlags.others){
legendWidget.addEntry(colorCoder.getOthersColor(),colorCoder.getOthersLabel());
}
if(colorCodingFlags.mixed){
legendWidget.addEntry(colorCoder.getMixedColor(),colorCoder.getMixedLabel());
}
if(colorCodingFlags.missing){
legendWidget.addEntry(colorCoder.getMissingColor(),colorCoder.getMissingLabel());
}
}
}
this._dom.setUnplottableMessage(currentSize,unplottableItems);
};

Exhibit.ScatterPlotView.prototype._openPopup=function(elmt,items){
Exhibit.ViewUtilities.openBubbleForItems(elmt,items,this._uiContext);
};

Exhibit.ScatterPlotView._makePoint=function(color,left,bottom,tooltip){
var outer=document.createElement("div");
outer.innerHTML="<div class='exhibit-scatterPlotView-point' style='background: "+color+
"; width: 6px; height: 6px; left: "+(left-3)+"px; bottom: "+(bottom+3)+"px;' title='"+tooltip+"'></div>";

return outer.firstChild;
};
