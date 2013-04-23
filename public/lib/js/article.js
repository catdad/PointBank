(function(){
	var $menu = $('#articleMenu');
	var $nav = $('#articleNav');
	
	$nav.off = function(){ this.removeClass('on').addClass('off'); }
	$nav.on = function(){ this.removeClass('off').addClass('on'); }
	
	$menu.click(function(ev){
		console.log('clock');
		if ( $nav.hasClass('off') ) $nav.on();
		else $nav.off();
	});
	
	$('#articleNav p').click(function(){
		$nav.off();
	});
})();