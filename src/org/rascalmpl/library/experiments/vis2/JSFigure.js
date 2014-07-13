
/****************** The figure prototype with all defaults *********************/

"use strict";

var Figure = {
    figure: "figure",
    textValue: "none",
	grow:	1.0,
    hgap: 0,
    vgap: 0,
    fill: "white",
    "fill-opacity": 1.0,
    "stroke-width": 1,
    stroke: "black", 
    "stroke-dasharray": [],
    "stroke-opacity": 1.0,
    borderRadius: 0,
    "font-family": "sans-serif", // serif, sans-serif, monospace
    "font-name": "Helvetica",
    "font-size": 12,
    "font-style": "normal",        // normal, italic
    "font-weight": "normal",      // normal, bold
    "text-decoration": "none",     // none, underline, overline, line-through
    
    dataset: [], 
    figure_root:  {},
    
    hasDefinedWidth: function()  { var w = this.width  || 0; return w > 0; },
    
    hasDefinedHeight: function() { var h = this.height || 0; return h > 0; },
                               
    getModelElement: function(accessor) { return eval(accessor); },
    
    setModelElement: function(accessor, v) { 
          var v1 = !isString(v) ? JSON.stringify(v) : v;
          eval(accessor + "=" + v1); return v; 
          },
    
    model: undefined,
    
    name: undefined
}


Object.defineProperty(Figure, "width", {
	get: function(){ 
			if(this.hasOwnProperty("_width")) return this._width;
			if(this.hasOwnProperty("min_width")) return this.min_width;
			return undefined;
			},
	set: function(w){ this._width = w;  }
});
    
Object.defineProperty(Figure, "height", {
	get: function(){ 
			if(this.hasOwnProperty("_height")) return this._height;
			if(this.hasOwnProperty("min_height")) return this.min_height;
			return undefined;
		},
	set: function(h){ this._height = h; }
});
    									
Object.defineProperty(Figure, "halign", {
	get: function(){ 
	return "_halign" in this ? this._halign : 0.5; },
	set: function(h){ this._halign = h; }
        
});

Object.defineProperty(Figure, "valign", {
	get: function(){ 
		return "_valign" in this ? this._valign : 0.5; },
	set: function(v){ this._valign = v; }
});

/****************** Build a figure given its JSON representation ****************/

function isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
}

function isString(obj) {
    return Object.prototype.toString.call(obj) === "[object String]";
}

function buildFigure(description) {
    return buildFigure1(description, Figure);
}

function buildFigure1(description, parent) {
    var f = Object.create(parent);
    f.bbox = Figure.bboxFunction[description.figure]; // || throw "No bbox function defined for " + description.figure;
    f.draw = Figure.drawFunction[description.figure]; // || throw "No draw function defined for " + description.figure;
    
    for(var p in description) {
        var handle_prop = function(prop){       // Use extra closure to protect accessor as used in defineProperty
        if (prop === "inner") {
            var inner_description = description[prop];
            if (isArray(inner_description)) {					// Allow two level nesting of figures to allow grids
                var inner_array1 = new Array();
                for (var i = 0; i < inner_description.length; i++) {
                	if(isArray(inner_description[i])){
                		var inner_array2 = new Array();
                		for(var j = 0; j < inner_description[i].length; j++){
                			inner_array2[j] = buildFigure1(inner_description[i][j], f);
                		}
                		inner_array1[i] = inner_array2;
                	} else {
                    	inner_array1[i] = buildFigure1(inner_description[i], f);
                    }
                }
                f[prop] = inner_array1;
            } else {
                f[prop] = buildFigure1(inner_description, f);
            }
        } else {
            var prop_val = description[prop];
            if(prop_val.use){
                var accessor = prop_val.use;
                if(prop === "accessor"){
                    Object.defineProperty(f, prop, {get: function(){ return accessor;},  set: function(v) { return accessor; }});
                } else {
                    Object.defineProperty(f, prop, {get: function(){ return eval(accessor);},  set: function(v) { return eval(accessor); } });
                }
            } else {
                var val = description[prop];
                if(val.hasOwnProperty("figure")){
                    val = buildFigure1(val, f);
                }
                Object.defineProperty(f, prop, {value: val, writable: true});
            }
        }
        }; 
        handle_prop(p);
    }
    return f;
}

/****************** Bounding box and draw function table *******/

// Determine the bounding box of the various figures types
Figure.bboxFunction = {};

// Draw the various figure types
Figure.drawFunction = {};

/****************** Register new flavor of existing componentType ****************/

Figure.components = {barChart: [], lineChart: [], graph: []};


Figure.registerComponent = function(componentType, flavor){
	if(!Figure.components[componentType]){
		throw "Cannot register unknown component type " + componentType;
	}
	Figure.components[componentType].push(flavor);
}

Figure.getDrawForComponent = function(componentType, flavor){
	if(!Figure.components[componentType]){
		throw "Cannot get unknown component type " + componentType;
	}
	if(Figure.components[componentType].indexOf(flavor) >= 0){
		if(Figure.drawFunction[flavor]){
			return Figure.drawFunction[flavor];
		} else {
			throw "No function defined for registered flavor " + flavor + " for component type " + componentType;
		}
	}
	throw "Cannot get unregistered flavor " + flavor + " for componentType " + componentType;
}

/****************** Draw a figure object ****************/

function drawFigure (description){
	var b;
	try {
		b = buildFigure(description);
	} catch(e){
		console.log("buildFigure failed:", e);
	}	
    drawFigure1(b);
}

function drawFigure1(f) {
    Figure.figure_root = f;
     var area = d3.select("#figurearea").append("svg");
    try {
   	 f.bbox(area);
   	 } catch(e){
   	 	console.log("bbox failed:", e);
   	 }
   
    try {
    	return f.draw(0, 0, f.width, f.height);
    } catch(e){
    	console.log("draw failed:", e);
    }
    area.attr("width", f.width).attr("height", f.height);
	return area;
}

// bboxExtraFigure = function (fig){
//     if(fig.hasOwnProperty("extra_figure")){
//         fig.extra_figure.bbox();
//     }
// }

/****************** AddInteraction to a figure *************************/

function addInteraction(fig) {
    if (fig.hasOwnProperty("event")) {
		var selection = fig.svg;
    	selection.style("cursor", "crosshair");
        
        if(fig.event != "click"){
            selection.on("mouseout", function(){ d3.event.preventDefault(); fig.draw_extra_figure = false;  redrawFigure();});
        }
        
        selection.on(fig.event, function(e) {
           d3.event.preventDefault();
           d3.event.stopPropagation();
           if(fig.hasOwnProperty("replacement")){
                Figure.setModelElement(fig.accessor, fig.replacement);
                refreshFromServer();
           } else if(fig.hasOwnProperty("extra_figure")){
               fig.draw_extra_figure = (fig.event === "click") ? ! fig.draw_extra_figure : true;
               redrawFigure();
           } else {
                redrawFigure();
           }
        });
    }
    return selection;
}

function drawExtraFigure(fig, x, y){
    if(fig.hasOwnProperty("extra_figure") && fig.draw_extra_figure === true){
		var extra = fig.extra_figure;
        extra.bbox(fig.svg);
        extra.draw(x, y, extra.width, extra.height);
    }
}

function handleUserInput(fig, v) {
    d3.event.stopPropagation();
    
    if(fig.hasOwnProperty("replacement")){
        Figure.setModelElement(fig.accessor, fig.replacement);
        refreshFromServer();
    } else {
        Figure.setModelElement(fig.accessor, v);
        //redrawFigure();
        refreshFromServer();
    }
    return false;
}

/****************** Askserver and redraw a figure object ****************/

var ajax = {};
ajax.x = function() {
    if (typeof XMLHttpRequest !== 'undefined') {
        return new XMLHttpRequest();  
    }
    var versions = [
        "MSXML2.XmlHttp.5.0",   
        "MSXML2.XmlHttp.4.0",  
        "MSXML2.XmlHttp.3.0",   
        "MSXML2.XmlHttp.2.0",  
        "Microsoft.XmlHttp"
    ];

    var xhr;
    for(var i = 0; i < versions.length; i++) {  
        try {  
            xhr = new ActiveXObject(versions[i]);  
            break;  
        } catch (e) {
        }  
    }
    return xhr;
};

ajax.send = function(url, callback, method, data, sync) {
    var x = ajax.x();
    x.open(method, url, sync);
    x.onreadystatechange = function() {
        if (x.readyState == 4) {
            callback(x.responseText)
        }
    };
    if (method == 'POST') {
        x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    x.send(data)
};

ajax.get = function(url, data, callback, sync) {
    var query = [];
    for (var key in data) {
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
    }
    ajax.send(url + '?' + query.join('&'), callback, 'GET', null, sync)
};

ajax.post = function(url, data, callback, sync) {
    var query = [];
    for (var key in data) {
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
    }
    ajax.send(url, callback, 'POST', query.join('&'), sync)
};

function askServer(path, params) {
	ajax.post(path, params, function(responseText){
		try {
            if(d3.event){
              d3.event.stopPropagation();
            }
            var res = JSON.parse(responseText);
            var area = d3.select("#figurearea svg");
            if(!area.empty()){
              try { area.remove(); } catch(e) { console.log("askServer", e); };
		    }
            Figure.name = res.name;
            Figure.model_constructor = res.model_root;
            Figure.model = res.model_root;
            Figure.site = res.site;
            Figure.figure_root = res.figure_root;
            drawFigure(res.figure_root);
            return;
        } catch (e) {
            console.error(e.message + ", on figure " + responseText);
        }
	});
}

function refreshFromServer(){
    askServer(Figure.site + "/refresh/" + Figure.name, {"model" : JSON.stringify(Figure.model)});
}

function redrawFigure(){
    var area = d3.select("#figurearea svg");
    if(!area.empty()){
      try { area.remove(); } catch(e) { console.log(redrawFigure, e); };
    }
    drawFigure1(Figure.figure_root);
}



/**************** empty *******************/

Figure.bboxFunction.empty = function(selection){
	this.width = this.height = 0;
}

Figure.drawFunction.box = function (x, y, w, h) {
		return /* what? */;
}

/**************** box *******************/

Figure.bboxFunction.box = function(selection) {
    var width = 0, height = 0, definedW, definedH;
    
    if(this.hasDefinedWidth()){
        width = this.width;
        definedW = 1;
    }
    if(this.hasDefinedHeight()){
        height = this.height;
        definedH = 1;
    } 
    var lw = this["stroke-width"]/2;	// TODO: check this
    width += (lw + 1) / 2;
    height += (lw + 1) / 2
    console.log("box.bbox:", width, height);
    	
    this.svg = selection
    	.append("rect")
    	.style("stroke", this.stroke)
    	.style("fill", this.fill)
    	.style("stroke-width", this["stroke-width"] + "px")
    	.style("stroke-dasharray", this["stroke-dasharray"])
    	;
    
    if (this.hasOwnProperty("inner")) {
        var inner = this.inner;
        console.log(inner);
        inner.bbox(selection);
        console.log("inner", inner.width, inner.height);
        if(!definedW){
            width = Math.max(width, this.grow * inner.width + 2 * this.hgap);
        }
        if(!definedH){
            height = Math.max(height, this.grow * inner.height + 2 * this.vgap);
        }
        console.log("box outer size:", width, height);
    }
    this.min_width = width;
    this.min_height = height;
}

Figure.drawFunction.box = function (x, y, w, h) {
 	var lw = (this["stroke-width"])/2;		// TODO: check this
    this.svg
    	.attr("x", x + lw)
    	.attr("y", y + lw)
    	.attr("width", w)
    	.attr("height", h)
    	;
    
    if (this.hasOwnProperty("inner")) {
        var inner = this.inner;
        inner.draw(x + lw + this.hgap + this.halign * (w  - inner.width  - 2 * this.hgap), 
                   y + lw + this.vgap + this.valign * (h - inner.height - 2 * this.vgap),
                   inner.width, inner.height);
    }
    drawExtraFigure(this, x, y);
    addInteraction(this);
    return this.svg;
}

/**************** shape *****************/

function isEmptyFigure(fig){
	return fig.figure === "empty";
}

Figure.bboxFunction.shape = function(selection) {
	var inner = this.inner;
	
	this.svg = selection.append("g");
	
	var defs = this.svg.append("defs");
	if(!isEmptyFigure(inner[0])){
		var startMarker = defs.append("marker");
		inner[0].bbox(startMarker);
		inner[0].draw(0,0,inner[0].width,inner[0].height);
		startMarker
			.attr("id", "startMarker")
			.attr("markerWidth", inner[0].width)
			.attr("markerHeight", inner[0].height)
			.attr("refX", inner[0].width/2)
			.attr("refY", inner[0].height/2)
			.attr("orient", "auto")
			;
	}
	if(!isEmptyFigure(inner[1])){
		var midMarker = defs.append("marker");
		inner[1].bbox(midMarker);
		inner[1].draw(0,0,inner[1].width,inner[1].height);
		midMarker
			.attr("id", "midMarker")
			.attr("markerWidth", inner[1].width)
			.attr("markerHeight", inner[1].height)
			.attr("refX", inner[1].width/2)
			.attr("refY", inner[1].height/2)
			.attr("orient", "auto")
			;
	}
	if(!isEmptyFigure(inner[2])){
		var endMarker = defs.append("marker");
		inner[2].bbox(endMarker);
		inner[2].draw(0,0,inner[2].width,inner[2].height);
		endMarker
			.attr("id", "endMarker")
			.attr("markerWidth", inner[2].width)
			.attr("markerHeight", inner[2].height)
			.attr("refX", inner[2].width/2)
			.attr("refY", inner[2].height/2)
			.attr("orient", "auto")
			;
	}
	var path = this.svg
		.append("path")
		//.attr("transform", "translate(" + x + "," + y + ")")
		.attr("d", this.path)
		.style("stroke", this.stroke)
		.style("fill-rule", this["fill-rule"])
    	.style("fill", this.fill)
    	.style("stroke-width", this["stroke-width"] + "px")
    	.style("stroke-dasharray", this["stroke-dasharray"])
    	;
    if(!isEmptyFigure(inner[0])){
    	path.style("marker-start", "url(#startMarker)");
    }
    if(!isEmptyFigure(inner[1])){
    	path.style("marker-mid", "url(#midMarker)");
    }
     if(!isEmptyFigure(inner[2])){
    	path.style("marker-end", "url(#endMarker)");
    }
	
	var bb = path.node().getBBox();
	
	this.width = bb.width;
	this.height = bb.height;
	
	return this.svg;
}

Figure.drawFunction.shape = function (x, y, w, h) {
	this.svg.select("path").attr("transform", "translate(" + x + "," + y + ")");
	 this.svg
	 	//.attr("x", 0)
		//.attr("y", 0)
    	.attr("width", w)
    	.attr("height", h)
    	;
	var inner = this.inner;
	return this.svg;
}

/**************** image *****************/

Figure.bboxFunction.image = function(selection) {	
	var w  = this.width || 50;
	var h = this.width || 50;
	this.svg = selection
		.append("image")
		.attr("width", w)
		.attr("height", h)
		.attr("xlink:href", this.url)
		;
	
	var bb = this.svg.node().getBBox();
	
	if(!this.hasDefinedHeight()){
		this.width = bb.width;
	}
	
	if(!this.hasDefinedHeight()){
		this.height = bb.height;
	}
	return this.svg;
}

Figure.drawFunction.image = function (x, y, w, h) {
	this.svg
		.attr("x", x)
		.attr("y", y)
		.attr("width", w)
		.attr("height", h)
		;
	return this.svg;
}

/**************** at *******************/

Figure.bboxFunction.at = function(selection) {
	var inner = this.inner;
	this.svg = inner.bbox(selection);
	
 	this.width = Math.abs(this.x) + inner.width;
	this.height = Math.abs(this.y) + inner.height;
	console.log("move.bbox:", this.x, this.y, this.width, this.height);
	return this.svg;
}

Figure.drawFunction.at = function (x, y, w, h) {
	this.inner.draw(x + this.x, y + this.y, this.inner.width, this.inner.height);
	return this.svg;
}

/**************** atX *******************/

Figure.bboxFunction.atX = function() {
	var inner = this.inner;
	inner.bbox();
	this.width = this.x + inner.width;
	this.height = inner.height;
}

Figure.drawFunction.atX = function (selection, x, y) {
	this.inner.draw(selection, x + this.x, y);
	return selection;
}

/**************** atY *******************/

Figure.bboxFunction.atY = function() {
	var inner = this.inner;
	inner.bbox();
	this.width = inner.width;
	this.height = this.y + inner.height;
}

Figure.drawFunction.moveY = function (selection, x, y) {
	this.inner.draw(selection, x, y + this.y);
	return selection;
}

/**************** scale *******************/

Figure.bboxFunction.scale = function(selection) {
	this.svg = selection
		.append("g")
		.attr("transform", "scale(" + this.xfactor + "," + this.yfactor + ")")
		;
	var inner = this.inner;
	this.svg = inner.bbox(this.svg);
	this.width = this.xfactor * inner.width;
	this.height = this.yfactor * inner.height;
	return this.svg;
}

Figure.drawFunction.scale = function (x, y, w, h) {
	this.inner.draw(x, y, this.inner.width, this.inner.height);
	return this.svg;
}

/**************** rotate *******************/

Figure.toRadians = function (angle){
	return angle * (Math.PI/180);
}

Figure.bboxFunction.rotate = function(selection) {
	
	this.svg = selection.append("svg");
	var group = this.svg.append("g");
	
	var inner = this.inner;
	inner.bbox(group);
	var w = inner.width;
 	var h = inner.height;
	
	group.attr("transform", "rotate(" + this.angle + "," +  (w/2) + "," + (h/2) + ")");
	
	var angle = Figure.toRadians(this.angle % 180);
	var sin = Math.sin(angle);
	var cos = Math.cos(angle);
	this.width = w * cos + h * sin;
	this.height = w * sin + h * cos; 

	console.log("rotate.bbox:", this.width, this.height);
	
	return this.svg;
}

Figure.drawFunction.rotate = function (x, y, w, h) {
	var inner = this.inner;
	this.svg
		.attr("x", x)
		.attr("y", y)
		.attr("width", inner.width)
		.attr("height", inner.height)
	//	.attr("viewbox", " 0 0 " + w + " " + h)
		;
	inner.draw(x, y, inner.width, inner.height);
	return this.svg;
}

// Figure.bboxFunction.rotate = function(selection) {
// 	var inner = this.inner;
// 	inner.bbox();
// 	var w = inner.width;
// 	var h = inner.height;
	
// 	var angle = Figure.toRadians(this.angle % 180);
// 	var sin = Math.sin(angle);
// 	var cos = Math.cos(angle);
// 	var rot_w = w * cos + h * sin;
// 	var rot_h = w * sin + h * cos; 
	
// 	//var dw = 0.5 * Math.abs(rot_w - w);
	
// 	//var dh = 0.5 * Math.abs(rot_h - h);
	
// 	//var dw = Math.abs(w - 0.5*(w - h) * sin);
// 	//var dh = Math.abs(h - 0.5*(w - h) * sin);
	
	
// 	//var dw = Math.abs(w * cos);
// 	//var dh = Math.abs(h * cos);
	
// 	var dw = Math.abs(0.7 * (rot_w - w) * sin);
// 	var dh = Math.abs(0.7 * (rot_h - h) * sin);
	
// 	this.dw = dw;
// 	this.dh = dh;
// 	this.width = rot_w; 
// 	this.height = rot_h;
// 	console.log("rotate.bbox:", this.width, this.height, "dw:", dw, "dh:", dh);
// }

// Figure.drawFunction.rotate = function (selection, x, y) {
// 	var inner = this.inner;
// 	var my_svg = selection
// 		.append("svg").attr("viewbox", " 0 0 " + this.width + " " + this.height)
// 		.append("g")
// 		.attr("transform", "rotate(" + this.angle + "," +  (x+inner.width/2) + "," + (y+inner.height/2) + ")"/* translate(" + this.dw + "," + this.dh + ")"*/ );
// 	 inner.draw(my_svg, x, y);
// 	return my_svg;
// }


/**************** hcat *******************/

Figure.bboxFunction.hcat = function(selection) {
    var inner = this.inner;
    var width = 0;
    var height = 0;
	
	this.nflex_width = 0;
	this.nflex_height = 0;
    
    this.svg = selection.append("g");
    
    for (var i = 0; i < inner.length; i++) {
        var elm = inner[i];
        elm.bbox(this.svg);
        width += elm.width;
        height = Math.max(height, elm.height);
		if(!elm.hasDefinedWidth()) this.nflex_width++;
		if(!elm.hasDefinedHeight()) this.nflex_height++;
    }
	
	this.min_width = width + (inner.length - 1) * this.hgap; //TODO length == 0
	if(this.hasDefinedWidth()){
		// Consider the cases this.width < this.min_width and this.width > this.min_width
	}
	this.min_height = height;
	
    return this.svg;
}

Figure.drawFunction.hcat = function (x, y, w, h) {
   this.svg
   		.attr("x", x)
   		.attr("y", y)
   		.attr("width", w)
   		.attr("height", h)
   		;
    var inner = this.inner;
    console.log("hcat:", inner);
	
	var dw = (w - this.min_width)/this.nflex_width;
	var x1 = x;
	
    for (var i = 0; i < inner.length; i++) {
        var elm = inner[i];
		var ew = !elm.hasDefinedWidth() ? dw : elm.width;
		var eh = !elm.hasDefinedHeight() ? h : elm.height;
        elm.draw(x1, y + this.valign * (h - eh), ew, eh);
        x1 += ew + this.hgap;
    }
    drawExtraFigure(this, x, y);
    addInteraction(this);
}

/**************** vcat *******************/

Figure.bboxFunction.vcat = function(selection) {
    var inner = this.inner;
    var width = 0;
    var height = 0;
	
	this.nflex_width = 0;
	this.nflex_height = 0;
	
	this.svg = selection.append("g");
	
    for (var i = 0; i < inner.length; i++) {
        var elm = inner[i];
        elm.bbox(this.svg);
        width = Math.max(width, elm.width);
        height += elm.height;
		if(!elm.hasDefinedWidth()) this.nflex_width++;
		if(!elm.hasDefinedHeight()) this.nflex_height++;
    }
    this.min_width = width;
    this.min_height = height + (inner.length - 1) * this.vgap;
	return this.svg;
}

Figure.drawFunction.vcat = function (x, y, w, h) {
    this.svg
        .attr("x", x)
        .attr("y", y)
        .attr("width", w)
        .attr("height", h)
        ;

    var inner = this.inner;
	var dh = (h - this.min_height)/this.nflex_height;
	var y1 = y;
	
    for (var i = 0; i < inner.length; i++) {
        var elm = inner[i];
		var ew = !elm.hasDefinedWidth() ? w : elm.width;
		var eh = !elm.hasDefinedHeight() ? dh : elm.height;
        elm.draw(x + this.halign * (w - ew), y1, ew, eh);
        y1 += eh + this.vgap;
    }
    drawExtraFigure(this, x, y);
    addInteraction(this);
    return this.svg;
}


/**************** grid *******************/

function initArray(n, v){
	var ar = new Array();
	for(var i = 0; i < n ; i++){
		ar[i] = v;
	}
	return ar;
}

Figure.bboxFunction.grid = function(selection) {
	var inner = this.inner;
    
    var col_width = new Array();
	var row_height = new Array();
	
	var col_flex_width = new Array();
	var row_flex_height = new Array();
	
	this.svg = selection.append("g");
    
    for (var r = 0; r < inner.length; r++) {
    	for(var c = 0; c < inner[r].length; c++){
    		var elm = inner[r][c];
    		elm.bbox(this.svg);
    		col_width[c]  = col_width[c]  ? Math.max(elm.width, col_width[c])   : elm.width;
    		row_height[r] = row_height[r] ? Math.max(elm.height, row_height[r]) : elm.height;
			
			if(!elm.hasDefinedWidth()) { col_flex_width[c] =  1; }
			if(!elm.hasDefinedHeight()){ row_flex_height[r] = 1; }
    	}
    }
    
    var add = function (previous, current) { return (previous && current) ? previous + current : (previous ? previous : current); }
	
    this.min_width  = col_width.length  * this.hgap + col_width.reduce(add);
    this.min_height = row_height.length * this.vgap + row_height.reduce(add);
	
    this.col_width  = col_width;
	this.row_height = row_height;
	
	this.col_flex_width  = col_flex_width;
	this.row_flex_height = row_flex_height;
	
	this.ncol_flex_width  = col_flex_width.length  == 0 ? 0 : col_flex_width.reduce(add);
	this.nrow_flex_height = row_flex_height.length == 0 ? 0 : row_flex_height.reduce(add);
	
	console.log("grid.bbox:", this.min_width, this.min_height, col_width, row_height);
	return this.svg;
}

Figure.drawFunction.grid = function (x, y, w, h) {
	this.svg 
        .attr("x", x)
        .attr("y", y)
        .attr("width", w)
        .attr("height", h)
        ;
		
	var inner = this.inner;
	
	var col_width = this.col_width;
	var row_height = this.row_height;
	
	var dw = (w - this.min_width)/this.ncol_flex_width;
	var dh = (h - this.min_height)/this.nrow_flex_height;
	
	for(var c = 0; c < col_width.length; c++){
		if(this.col_flex_width[c] === 1){
			col_width[c] += dw;
		}
	}
	
	for(var r = 0; r < row_height.length; r++){
		if(this.row_flex_height[r] === 1){
			row_height[r] += dh;
		}
	}
	var current_x = x;
	var current_y = y;
	
	for(var r = 0; r < inner.length; r++){
		current_x = x;
		for(var c = 0; c < inner[r].length; c++){
			var elm = inner[r][c];
			var ew = !elm.hasDefinedWidth() ? col_width[c] : elm.width;
			var eh = !elm.hasDefinedHeight() ? row_height[r] : elm.height;
		
			elm.draw(current_x + elm.halign * (col_width[c] - ew),
					 current_y + elm.valign * (row_height[r] - eh),
					 ew, eh);
			current_x += col_width[c] + this.hgap;
		}
		current_y += row_height[r] + this.vgap;
	}
	return this.svg;
}


/**************** overlay *******************/

Figure.bboxFunction.overlay = function(selection) {
    var inner = this.inner;
    var width = 0;
    var height = 0;
	
	this.svg = selection.append("g");
	
    for (var i = 0; i < inner.length; i++) {
        var elm = inner[i];
        elm.bbox(selection);
        width = Math.max(width, elm.width);
        height = Math.max(height, elm.height);
    }
    this.width = width;
    this.height = height;
	return this.svg;
}

Figure.drawFunction.overlay = function (x, y, w, h) {
    this.svg 
        .attr("x", x)
        .attr("y", y)
        .attr("width", w)
        .attr("height", h)
        ;

    var inner = this.inner;
    var halign = this.halign;
	var valign = this.valign;
    for (var i = 0; i < inner.length; i++) {
        var elm = inner[i];
        elm.draw(x + this.halign * (this.width  - elm.width), 
				 y + this.valign * (this.height - elm.height),
				 elm.width, elm.height) ;
    }
	drawExtraFigure(this, x, y);
    addInteraction(this);
    return this.svg;
}

/**************** text *******************/

Figure.bboxFunction.text = function(selection) {
    this.svg = selection.append("text")
        .style("text-anchor", "start")
        .text(this.textValue)
        .style("font-family", this["font-family"])
        .style("font-style", this["font-style"])
        .style("font-weight", this["font-weight"])
        .style("font-size", this["font-size"])
        .style("stroke", this.stroke)
        .style("fill",   this.stroke);
   
    var bb = this.svg.node().getBBox();
    this.width = 1.05*bb.width;
    this.height = 1.05*bb.height;
    this.ascent = bb.y; // save the y of the bounding box as ascent
    console.log("text:", this.width, this.height, this.ascent);
}

Figure.drawFunction.text = function (x, y, w, h) {
    this.svg
        .attr("x", x)
        .attr("y", y - this.ascent) // take ascent into account
		.attr("width", w)
		.attr("height", h)
		;
    
    drawExtraFigure(this, x, y);
    addInteraction(this);
    return this.svg;
}

// visibility control

/********************* choice ***************************/

Figure.bboxFunction.choice = function(selection) {
    var inner = this.inner;
    var selector = Math.min(Math.max(Figure.getModelElement(this.selector),0), inner.length - 1);
    this.selected = inner[selector];
    this.svg = this.selected.bbox(selection);
    this.width = this.selected.width;
    this.height = this.selected.height;
}

Figure.drawFunction.choice = function (x, y, w, h) {
    return this.selected.draw(x, y, w, h);
}

/********************* visible ***************************/

Figure.bboxFunction.visible = function(selection) {
    var inner = this.inner;
    var visible = Figure.getModelElement(this.selector);
    if(visible){
        this.svg = inner.bbox(selection);
        this.width = inner.width;
        this.height = inner.height;

    } else {
        this.width = this.height = 0;
		this.svg = selection;
    }
	this.isVisible = visible;
	return this.svg;
}

Figure.drawFunction.visible = function (x, y, w, h) {
    return this.isVisible ? this.inner.draw(x, y, w, h) : this.svg;
} 

/********************* Input elements ************************/

/********************* buttonInput ***************************/

Figure.bboxFunction.buttonInput = function (selection) {
    var fig = this;
    var accessor = this.accessor; 
    var b = Figure.getModelElement(accessor);
	
	var w = this.width || 50;
	var h = this.height || 25;
    
    var foreign = this.svg = selection.append("foreignObject");
   
    foreign.append("xhtml:body")
        .append("form").attr("action", "")
        .append("input")
            .style("width", w + "px").style("height", h + "px")
            .attr("type", "button").attr("value", b ? this.trueText : this.falseText);
        
    foreign.on("mousedown", function() {
         var b = !Figure.getModelElement(accessor); 
         return handleUserInput(fig, b);
    });
	 
	var bb = foreign.node().getBBox();
	
	this.width = Math.max(w, bb.width);
	this.height = Math.max(h, bb.height);
	
	return this.svg;
}

Figure.drawFunction.buttonInput = function (x, y, w, h) {
	this.svg
	 	.attr("x", x)
		.attr("y", y)
		.attr("width", w)
		.attr("height", h)
		;
	return this.svg;
}

/********************* checkboxInput ***************************/

Figure.bboxFunction.checkboxInput = function (selection) {
    var fig = this;
    var accessor = this.accessor; 
    var b = Figure.getModelElement(accessor);
    
    var foreign = this.svg = selection.append("foreignObject");
	
	var w = this.width || 50;
	var h = this.height || 25;
	
    foreign.append("xhtml:body")
        .append("form").attr("action", "")
        .append("input")
            .style("width", w + "px").style("height", h + "px")
            .attr("type", "checkbox");
    if(b){
         foreign.select("input").attr("checked", "checked");
    }
        
    foreign.on("mousedown", function() {
         return handleUserInput(fig, !Figure.getModelElement(accessor));
    });
	 
	var bb = foreign.node().getBBox();
	
	this.width = Math.max(w, bb.width);
	this.height = Math.max(h, bb.height);
	
	return this.svg;
}

Figure.drawFunction.checkboxInput = Figure.drawFunction.buttonInput;

/********************* strInput ***************************/

Figure.bboxFunction.strInput = function (selection) {
    var fig = this;
    var accessor = this.accessor; 
     
    var foreign = this.svg = selection.append("foreignObject");
	
	var w = this.width || 50;
	var h = this.height || 25;
    
    foreign.append("xhtml:body")
        .append("form").attr("action", "").attr("onsubmit", "return false;")
        .append("input")
            .style("width", w + "px").style("height", h + "px")
            .attr("type", "text").attr("value", Figure.getModelElement(accessor));
  
    this.svg.on(fig.event, function() {
        return handleUserInput(fig, "'" + foreign.select("input")[0][0].value + "'");
    });
	 
	var bb = foreign.node().getBBox();
	
	this.width = Math.max(w, bb.width);
	this.height = Math.max(h, bb.height);
	
	return this.svg;
}

Figure.drawFunction.strInput = Figure.drawFunction.buttonInput;

/********************* colorInput ***************************/

function colorNameToHex(color)
{
    var colors = {
			"aliceblue":"#f0f8ff",		"antiquewhite":"#faebd7",		"aqua":"#00ffff",				"aquamarine":"#7fffd4",			"azure":"#f0ffff",
			
			"beige":"#f5f5dc",			"bisque":"#ffe4c4",				"black":"#000000",				"blanchedalmond":"#ffebcd",		"blue":"#0000ff",			"blueviolet":"#8a2be2",		"brown":"#a52a2a",			"burlywood":"#deb887",
			
    		"cadetblue":"#5f9ea0",		"chartreuse":"#7fff00",			"chocolate":"#d2691e",			"coral":"#ff7f50",				"cornflowerblue":"#6495ed",	"cornsilk":"#fff8dc",		"crimson":"#dc143c",		"cyan":"#00ffff",
			
    		"darkblue":"#00008b",		"darkcyan":"#008b8b",			"darkgoldenrod":"#b8860b",		"darkgray":"#a9a9a9",			"darkgrey":"#a9a9a9",		"darkgreen":"#006400",		"darkkhaki":"#bdb76b",		"darkmagenta":"#8b008b",
			"darkolivegreen":"#556b2f",	"darkorange":"#ff8c00",			"darkorchid":"#9932cc",			"darkred":"#8b0000",			"darksalmon":"#e9967a",		"darkseagreen":"#8fbc8f",	"darkslateblue":"#483d8b",
			"darkslategray":"#2f4f4f",	"darkslategrey":"#2f4f4f",		"darkturquoise":"#00ced1",		"darkviolet":"#9400d3",			"deeppink":"#ff1493",		"deepskyblue":"#00bfff",	"dimgray":"#696969",		"dimgrey":"#696969",			"dodgerblue":"#1e90ff",
    		
    		"firebrick":"#b22222",		"floralwhite":"#fffaf0",		"forestgreen":"#228b22",		"fuchsia":"#ff00ff",
    		
    		"gainsboro":"#dcdcdc",		"ghostwhite":"#f8f8ff",			"gold":"#ffd700",				"goldenrod":"#daa520",			"gray":"#808080",			"grey":"#808080",			"green":"#008000",			"greenyellow":"#adff2f",
   			
   			"honeydew":"#f0fff0",		"hotpink":"#ff69b4",
    		
    		"indianred ":"#cd5c5c",		"indigo":"#4b0082",				"ivory":"#fffff0",
			
			"khaki":"#f0e68c",
    		
    		"lavender":"#e6e6fa",		"lavenderblush":"#fff0f5",		"lawngreen":"#7cfc00",			"lemonchiffon":"#fffacd",		"lightblue":"#add8e6",		"lightcoral":"#f08080",		"lightcyan":"#e0ffff",		"lightgoldenrodyellow":"#fafad2",	
			"lightgrey":"#d3d3d3",		"lightgreen":"#90ee90",			"lightpink":"#ffb6c1",			"lightsalmon":"#ffa07a",		"lightseagreen":"#20b2aa",	"lightskyblue":"#87cefa",	"lightslategray":"#778899",	"lightslategrey":"#778899", 	"lightsteelblue":"#b0c4de",
    		"lightyellow":"#ffffe0",	"lime":"#00ff00",				"limegreen":"#32cd32",			"linen":"#faf0e6",
    		
    		"magenta":"#ff00ff",		"maroon":"#800000",				"mediumaquamarine":"#66cdaa",	"mediumblue":"#0000cd",			"mediumorchid":"#ba55d3",	"mediumpurple":"#9370d8",	"mediumseagreen":"#3cb371",
			"mediumslateblue":"#7b68ee","mediumspringgreen":"#00fa9a",	"mediumturquoise":"#48d1cc",	"mediumvioletred":"#c71585",	"midnightblue":"#191970",	"mintcream":"#f5fffa",		"mistyrose":"#ffe4e1",		"moccasin":"#ffe4b5",
    		
    		"navajowhite":"#ffdead",	"navy":"#000080",
    		
    		"oldlace":"#fdf5e6",		"olive":"#808000",				"olivedrab":"#6b8e23",			"orange":"#ffa500",				"orangered":"#ff4500",		"orchid":"#da70d6",
    		
    		"palegoldenrod":"#eee8aa",	"palegreen":"#98fb98",			"paleturquoise":"#afeeee",		"palevioletred":"#d87093",		"papayawhip":"#ffefd5",		"peachpuff":"#ffdab9",		"peru":"#cd853f",		
			"pink":"#ffc0cb",			"plum":"#dda0dd",				"powderblue":"#b0e0e6",			"purple":"#800080",
    		
    		"red":"#ff0000",			"rosybrown":"#bc8f8f",			"royalblue":"#4169e1",
    		
    		"saddlebrown":"#8b4513",	"salmon":"#fa8072",				"sandybrown":"#f4a460",			"seagreen":"#2e8b57",			"seashell":"#fff5ee",		"sienna":"#a0522d",			"silver":"#c0c0c0",
			"skyblue":"#87ceeb",		"slateblue":"#6a5acd",			"slategray":"#708090",			"slategrey":"#708090",			"snow":"#fffafa",			"springgreen":"#00ff7f",	"steelblue":"#4682b4",
    		
    		"tan":"#d2b48c",			"teal":"#008080",				"thistle":"#d8bfd8",			"tomato":"#ff6347",				"turquoise":"#40e0d0",
    		
    		"violet":"#ee82ee",
    		
    		"wheat":"#f5deb3",			"white":"#ffffff",				"whitesmoke":"#f5f5f5",
    		"yellow":"#ffff00",			"yellowgreen":"#9acd32"
			};

    if (typeof colors[color.toLowerCase()] != 'undefined')
        return colors[color.toLowerCase()];

    return color;
}

Figure.bboxFunction.colorInput = function (selection) {
    var fig = this;
    var accessor = this.accessor;
	
	var w = this.width || 50;
	var h = this.height || 25;
    
    var foreign = this.svg = selection.append("foreignObject");
    
    console.log(Figure.getModelElement(accessor));
    foreign.append("xhtml:body")
        .append("form").attr("action", "").attr("onsubmit", "return false")
        .append("input")
            .style("width", w + "px").style("height", h + "px")
            .attr("type", "color").attr("value", Figure.getModelElement(accessor));
            
    foreign.on("change", function() {
        return handleUserInput(fig, "\"" + foreign.select("input")[0][0].value + "\"");
    });
	 
	var bb = foreign.node().getBBox();
	
	this.width = Math.max(w, bb.width);
	this.height = Math.max(h, bb.height);
	
	return this.svg;
}

Figure.drawFunction.colorInput =  Figure.drawFunction.buttonInput;


/********************* numInput ***************************/

Figure.bboxFunction.numInput = function (selection) {
    var fig = this;
    var accessor = this.accessor;
	
	var w = this.width || 50;
	var h = this.height || 25;
    
    var foreign = this.svg = selection.append("foreignObject");
    
    foreign.append("xhtml:body")
        .append("form").attr("action", "").attr("onsubmit", "return false")
        .append("input")
            .style("width", w + "px").style("height", h + "px")
            .attr("type", "number").attr("value", Figure.getModelElement(accessor));
     
    foreign.on(this.event, function() {
           return handleUserInput(fig, JSON.parse(foreign.select("input")[0][0].value));
    });
	 
	var bb = foreign.node().getBBox();
	
	this.width = Math.max(w, bb.width);
	this.height = Math.max(h, bb.height);
	
	return this.svg;
}

Figure.drawFunction.numInput = Figure.drawFunction.buttonInput;

/********************* rangeInput ***************************/

Figure.bboxFunction.rangeInput = function (selection) { 
    var fig = this;
    var accessor = this.accessor;
    
    var w = this.width || 50;
	var h = this.height || 25;
	
    var foreign = this.svg = selection.append("foreignObject");
    
    foreign.append("xhtml:body")
        .append("form").attr("action", "").attr("onsubmit", "return false")
        .append("input")
            .style("width", w + "px").style("height", h + "px")
            .attr("type", "range")
            .attr("min", this.min).attr("max", this.max).attr("step", this.step)
            .attr("value", Figure.getModelElement(this.accessor));
        
    foreign.on(fig.event, function(){
            return handleUserInput(fig, foreign.select("input")[0][0].value);
    });
	
	var bb = foreign.node().getBBox();
	
	this.width = Math.max(w, bb.width);
	this.height = Math.max(h, bb.height);
	
	return this.svg;
}

Figure.drawFunction.rangeInput = Figure.drawFunction.buttonInput;

/********************* choiceInput ***************************/

Figure.bboxFunction.choiceInput = function (selection) { 
    var fig = this;
    var accessor = this.accessor;
    var selectedIndex = Figure.getModelElement(this.accessor);
	
	var w = this.width || 50;
	var h = this.height || 25;
    
    var foreign = this.svg = selection.append("foreignObject");
    
    var select =foreign.append("xhtml:body")
        .append("form").attr("action", "").attr("onsubmit", "return false")
        .append("select").attr("value", selectedIndex).attr("selectedIndex", selectedIndex)
            .style("width", w + "px").style("height", h + "px");
    
    for(var i = 0; i < this.choices.length; i++){
        var opt = select.append("option").attr("value", i);
        if(i == selectedIndex){
            opt.attr("selected", "selected");
        }
        opt.text(this.choices[i]);
    }
        
    foreign.on(fig.event, function(){
        return handleUserInput(fig, foreign.select("select")[0][0].selectedIndex);
    });
	 
	var bb = foreign.node().getBBox();
	
	this.width = Math.max(w, bb.width);
	this.height = Math.max(h, bb.height);
	
	return this.svg;
}

Figure.drawFunction.choiceInput = Figure.drawFunction.buttonInput;
