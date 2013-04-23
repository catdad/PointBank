function parseData(tasks){
	console.log(tasks);
	for (i in tasks){
		var code = '';
		
		var task = tasks[i];
		code += "<div class='task card'" +
				"data-id='" + i + "' " +
				"data-type='" + ( (i%2 === 0) ? 'search':'stream' ) /* type variable */ + "' " +
				"data-date='" + (new Date(task.lastRun)).getTime() + "' " + 
				"data-count='" + task.count + "' >";
		
		code += "<div class='title'>";
		code += "<span class='label'>Data topic: </span>";
		
		if (task.compilation)
			code += "<div class='data' " + style(task.query.join(' / ')) +  ">" + task.query.join(' / ') + "</div>";
		else
			code += "<div class='data' " + style(task.query) +  ">" + task.query + "</div>";
		
		code += "</div>";
		
		code += "<div class='icon'></div>";
		
		
		code += "<div class='clear'></div>";
		
		code += "<br/><span class='label'>Total points: </span>";
		code += "<span class='data'>" + task.count + "</span>";
		code += "<br/><span class='label'>Efficiency: </span>";
		code += "<span class='data'>" + round((task.count / task.totalMined) || 0) + "%</span>";
		code += "<br/><span class='label'>Location: </span>";
		code += "<span class='data'>Place Name</span>";
		
		code += "<div class='buttons'>";
		code += '<a href=/data/' + task._id.toString() + ' >Details</a>';
		code += '<a href=# >Map</a>';
		code += "</div>";
		
		code += '</div>';
		
		$('#cards').append(code);
	}
	
	window.quick = new QuickSand('#cards');
	setBindings();
}

function round(num){
	return (Math.round(num * 100) / 100);
}

function style(str){
	if (str.length < 10) return "style='font-size: 3em;'";
	else if (str.length < 25) return "style='font-size: 1.8em;'";
	else return ""; //"style='font-size: 1em;'";
}

var QuickSand = function(obj){
	this.dom = obj;
	this.persist = $(obj).clone();
	
	this.data = this.persist.clone().find('.card');
	
	this.sort = function(s){
		//return if no sorting is required
		if (s === 'none') return this;
		
		this.data.sort(function(a,b){
			var aAttr = Number( $(a).data(s) );
			var bAttr = Number( $(b).data(s) );
			
			//return biggest number first
			return aAttr === bAttr ? 0 : (aAttr > bAttr ? -1 : 1);
		});
		
		return this;
	};
	this.filter = function(f){
		//reset data to all cards
		this.data = this.persist.clone().find('.card');
		
		//return if no filter is required
		if (f === 'all') return this;
		
		var filtered = $.map(this.data, function(el){
			if ( $(el).data('type') === f) return el;
		});
		
		this.data = filtered;
		return this;
	};
	
	//combined filter/sort
	this.arrange = function(f, s){
		this.filter(f).sort(s).display();
	};
	
	this.display = function(){
		$(this.dom).quicksand(this.data, {
			duration: 500,
			easing: 'swing',
			adjustHeight: false
		}, function(){
			console.log('complete filter/sort');
		});
	};
}

function setBindings(){
	$('.button').click(function(){
		
		if ( $(this).hasClass('filter') ){
			$('.filter').each(function(){
				$(this).removeClass('selected');
			});
			$(this).addClass('selected');
		}
		else{
			$('.sort').each(function(){
				$(this).removeClass('selected');
			});
			$(this).addClass('selected');
		}
		
		var filter = $('.filter.selected').data('filter');
		var sort = $('.sort.selected').data('sort');
		
		console.log(filter + ' ' + sort);
		
		if(quick) quick.arrange(filter, sort);
	});
}