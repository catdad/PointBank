dojo.provide("task.twitter");

dojo.require("esri.map");
dojo.require("esri.geometry");
dojo.require("esri.layers.FeatureLayer");
//dojo.require("esri.dijit.Popup");

dojo.addOnLoad(function() {

	dojo.declare("task.twitter", null, {	

		constructor : function(options) {
			this.options = options;
			this.taskUrl = options.url || null;
			if(this.taskUrl === null) {
				throw "task.twitter says: Task Url is required";
			}
			this._map = options.map || null;
			if(this._map === null) {
				throw "task.twitter says: Reference to esri.Map object required";
			}

			this.limit = options.limit || null;
			this.order = options.order || null;
			this.filterExtent = options.filterExtent || false;			

			//create feature layer for Tweets
			this.featureCollection = {
				layerDefinition : {
					"geometryType" : "esriGeometryPoint",
					"drawingInfo" : {
						"renderer" : {
							"type" : "simple",
							"symbol" : {
								"type" : "esriPMS",
								"url" : "images/twitter-point-16x20.png",
								"contentType" : "image/png",
								"width" : 16,
								"height" : 20
							}
						}
					},
					"fields" : [{
						"name" : "_id",
						"type" : "esriFieldTypeOID"
					}, {
						"name" : "created_at",
						"type" : "esriFieldTypeDate",
						"alias" : "Created"
					}, {
						"name" : "id",
						"type" : "esriFieldTypeString",
						"alias" : "id",
						"length" : 100
					}, {
						"name" : "from_user",
						"type" : "esriFieldTypeString",
						"alias" : "User",
						"length" : 100
					}, {
						"name" : "location",
						"type" : "esriFieldTypeString",
						"alias" : "Location",
						"length" : 1073741822
					}, {
						"name" : "place",
						"type" : "esriFieldTypeString",
						"alias" : "Place",
						"length" : 100
					}, {
						"name" : "text",
						"type" : "esriFieldTypeString",
						"alias" : "Text",
						"length" : 1073741822
					}, {
						"name" : "profile_image_url",
						"type" : "esriFieldTypeString",
						"alias" : "ProfileImage",
						"length" : 255
					}],
					"globalIdField" : "id",
					"displayField" : "from_user"
				},
				featureSet : {
					"features" : [],
					"geometryType" : "esriGeometryPoint"
				}
			};
			

			this.infoTemplate = new esri.InfoTemplate();
			this.infoTemplate.setTitle(function(graphic) {
				return graphic.attributes.from_user;
			});
			this.infoTemplate.setContent(this.getWindowContent);

			this.featureLayer = new esri.layers.FeatureLayer(this.featureCollection, {
				id : 'twitterFeatureLayer',
				outFields : ["*"],
				//infoTemplate: this.popupTemplate
				infoTemplate : this.infoTemplate
			});
			this._map.addLayer(this.featureLayer);

			dojo.connect(this.featureLayer, "onClick", dojo.hitch(this, function(evt) {
				var query = new esri.tasks.Query();
				query.geometry = this.pointToExtent(this._map, evt.mapPoint, 20);
				//query.outFields = ["*"];

				var deferred = this.featureLayer.selectFeatures(query, esri.layers.FeatureLayer.SELECTION_NEW);
				this._map.infoWindow.setFeatures([deferred]);
				//this._map.infoWindow.setFeatures([evt.graphic]);
				this._map.infoWindow.show(evt.mapPoint);

			}));

			this.stats = {
				points : 0,				
				noGeo : 0,
				total : 0
			};
			this.dataPoints = [];
			this.deferreds = [];
			this.geocoded_ids = {};

			this.loaded = true;
			this.onLoad();
		},
		/*****************
		 * Public Methods
		 *****************/
		pointToExtent : function(map, point, toleranceInPixel) {
			var pixelWidth = map.extent.getWidth() / map.width;
			var toleraceInMapCoords = toleranceInPixel * pixelWidth;
			return new esri.geometry.Extent(point.x - toleraceInMapCoords, point.y - toleraceInMapCoords, point.x + toleraceInMapCoords, point.y + toleraceInMapCoords, map.spatialReference);
		},
		update : function(searchTerm) {
			this.clear();
			this.constructQuery(searchTerm);
		},
		getStats : function() {
			return this.stats;
		},
		getPoints : function() {
			return this.dataPoints;
		},
		clear : function() {
			//cancel any outstanding requests
			this.continueQuery = false;
			dojo.forEach(this.deferreds, function(def) {
				def.cancel();
			});
			if(this.deferreds) {
				this.deferreds.length = 0;
			}

			//remove existing tweets
			if(this._map.infoWindow.isShowing) {
				this._map.infoWindow.hide();
			}
			if(this.featureLayer.graphics.length > 0) {
				this.featureLayer.applyEdits(null, null, this.featureLayer.graphics);
			}

			// clear stats and points
			this.stats = {
				points : 0,				
				noGeo : 0,
				total: 0
			};
			this.dataPoints = [];
			this.geocoded_ids = {};
			this.onClear();
		},
		show : function() {
			this.featureLayer.setVisibility(true);
		},
		hide : function() {
			this.featureLayer.setVisibility(false);
		},
		setVisibility : function(val) {
			if(val) {
				this.show();
			} else {
				this.hide();
			}
		},
		getExtent : function() {
			return this.featureLayer.graphics.length > 0 ? esri.graphicsExtent(this.featureLayer.graphics) : null;
		},
		getRadius : function() {
			var map = this._map;
			var radius = Math.min(932, Math.ceil(esri.geometry.getLength(new esri.geometry.Point(map.extent.xmin, map.extent.ymin, map.spatialReference), new esri.geometry.Point(map.extent.xmax, map.extent.ymin, map.spatialReference)) * 3.281 / 5280 / 2));
			radius = Math.round(radius, 0);
			return {
				radius : radius,
				center : map.extent.getCenter(),
				units : "mi"
			};
		},
		/*******************
		 * Internal Methods
		 *******************/
		getWindowContent : function(graphic) {
			//define content for the tweet pop-up window.
			var reg_exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
			var tweetText = graphic.attributes.text.replace(reg_exp, "<br/><a href='$1' target='_blank'>$1</a><br/>");
			var content = "<table><tr><td valign='top'>";
			content += "<img align='left' class='round shadow' style='padding-right:3px;' src='" + graphic.attributes.profile_image_url + "' width=73 height=73/>";
			content += "</td><td valign='top'>";
			content += "<b>" + graphic.attributes.from_user + ":</b><br/>" + tweetText;
			content += "</td></tr></table>";
			return content;
		},
		constructQuery : function() {
			//limit is the number of results returned per page - max 100
			//maximum number of results that can be returned are 1500.
			var limit = 100;

			//specify search radius - has to be smaller than 1500 kilometers (932 miles) and
			//greater than 1 meter
			//radius is half the width of the bottom border of the map
			var map = this._map;
			var radius = this.getRadius().radius;			
			
			var center = map.extent.getCenter();
			center = esri.geometry.webMercatorToGeographic(center);

			var getSince = function(daysOffset) {				
				//var one_day = 1000 * 60 * 60 * 24; //milliseconds
				var daylength= 1*24*60*60*1000;
				var now = new Date();
				var past = new Date(now.getTime() + daylength * daysOffset);
				//var two_days_ago = now.getTime() - one_day*2;
				//var newDate = new Date(two_days_ago);
				var num_days_ago = "" + past.getFullYear() + "-" + parseInt(past.getMonth() + 1) + "-" + parseInt(past.getDate());
				console.log("Since: " + num_days_ago);
				return num_days_ago;
			}
			var query = { };
			if (this.limit) {
				dojo.mixin(query,{limit : this.limit});
			}	
			
			if (this.order) {
				dojo.mixin(query,{order : this.order});
			}			
			
			//clear out some of the old values
			this.dataPoints = [];
			this.deferreds = [];
			this.geocoded_ids = {}; 

			//start Twitter API call of several pages
			this.continueQuery = true;
			
			this.sendRequest(this.taskUrl + "?" + dojo.objectToQuery(query));
		},
		sendRequest : function(url) {
			//get the results from twitter for each page
			var deferred = esri.request({
				url : url,
				//handleAs : "json",
				timeout : 10000,
				failOk : true,
				callbackParamName : "callback",
				preventCache : false,
				load : dojo.hitch(this, function(data) {
					var res = this.unbindDef(deferred);
					if(data.results.length > 0) {
						this.mapResults(data);
						this.onUpdateEnd();
						
					} else {
						// No results found, try another search term
						this.onUpdateEnd();
					}
				}),
				error : dojo.hitch(this, function(e) {
					if(deferred.canceled) {
						console.log("Search Cancelled");
					} else {
						console.log("Search error : " + e.message);
						var res = this.unbindDef(deferred);
					}
					this.onError(e);
				}),
				handle : dojo.hitch(this, function(response, ioArgs) {
					if( response instanceof Error && response.dojoType == "timeout") {
						console.debug("Twitter Layer: No errors should be seen after this timeout error.");
						this.onError("Ouch! Twitter is not response.");
					}
				})
			});

			this.deferreds.push(deferred);
		},
		unbindDef : function(dfd) {
			//if deferred has already finished, remove from deferreds array
			var index = dojo.indexOf(this.deferreds, dfd);
			if(index === -1) {
				return;
				// did not find
			}
			this.deferreds.splice(index, 1);
			if(!this.deferreds.length) {
				return 2;
				// indicates we received results from all expected deferreds
			}
			return 1;
			// found and removed
		},
		mapResults : function(j) {
			if(j.error) {
				this.onError(j.error);
				return;
			}
			var b = [];
			var k = j.results;

			var curr_expanded_extent = this._map.extent.expand(1.2);
			
			this.stats.total = j.meta.count;

			dojo.forEach(k, dojo.hitch(this, function(result) {
				
				//console.log(result.location);
				
				// eliminate Tweets which we have on the map
				if(this.geocoded_ids[result.id]) {
					return;
				}
				this.geocoded_ids[result.id] = true;
				var geoPoint = null;

				if(result.latLon) {
					var g = result.latLon;
					geoPoint = new esri.geometry.Point(parseFloat(g[1]), parseFloat(g[0]));
				} 
				
				if(geoPoint) {
					//last check to make sure we parsed it right
					if(isNaN(geoPoint.x) || isNaN(geoPoint.y)) {
						//discard bad geopoints
						//console.log("discarding: " + dojo.toJson(geoPoint.toJson()));
						console.log("Discarding tweet: " + result.id);
						this.stats.noGeo++;
					} else {

						var extent_ok = true;
						// convert the Point to WebMercator projection
						var a = new esri.geometry.geographicToWebMercator(geoPoint);
						//check for filtering of extents
						if(this.filterExtent) {
							if(!curr_expanded_extent.contains(a)) {
								console.log("Skipping: " + result.id);
								extent_ok = false;
							}
						}
						if(extent_ok) {
							// make the Point into a Graphic
							var attr = {};
							attr.from_user = result.from_user;
							attr.location = result.location;
							attr.text = result.text;
							attr.id = result.id;
							attr.profile_image_url = result.profile_image_url;
							attr.created_at = result.created_at;
							attr.place = "";
							if(result.place) {
								attr.place = result.place.full_name || "";
							}
							var graphic = new esri.Graphic(a);
							graphic.setAttributes(attr);
							b.push(graphic);
							this.dataPoints.push({
								x : a.x,
								y : a.y
							});
						}
						this.stats.points++;
					}
				} else {
					this.stats.noGeo++;
				}
			}));
			// add successful geocoded Tweet Graphics array to twitterLayer
			this.featureLayer.applyEdits(b, null, null);
			//call the onUpdate event
			this.onUpdate();
		},
		/****************
		 * Miscellaneous
		 ****************/
		onLoad: function() {			
		},
		onUpdate : function() {
		},
		onUpdateEnd : function() {
		},
		onClear : function() {
		},
		onError : function(info) {
		}
	});
	// end of class declaration
});
// end of addOnLoad