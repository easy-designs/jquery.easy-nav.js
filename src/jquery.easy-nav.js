/*! Easy Nav */
;(function($,window,document){
	
	var DOT = '.',
		A = 'a',
		LI = 'li',
		LISTS = 'ol,ul',
		ACTIVATED = 'click-activated',
		DISABLED = 'click-disabled',
		FOCUSED = 'has-focus',
		NAV = 'easy-nav',
		CLOSER = 'easy-nav-closer',
		ENABLED = 'easy-nav-enabled',
		click_evt = 'click',
		tap_evt = click_evt,
		move_evt = 'mousemove',
		focus_evt = 'focus',
		blur_evt = 'blur',
		TRUE = true,
		FALSE = false,
		mousing = FALSE,
		dragging = FALSE,
		$document = $(document),
		ids = [],
		highlights_tap = FALSE,
		ghost_clicks = FALSE,
		prevent_ghost_click = FALSE,
		tap_triggers_mousemove = FALSE;

		
	// Touch Start
	if ( 'ontouchstart' in window ||
		 'createTouch' in document )
	{
		tap_evt = 'touchend';
	}

	
	// Profile flakey browsers
	(function( UA ){
		
		var WEBKIT = /applewebkit/,
			ANDROID = /android\s(\d+)/,
			WINDOWS_PHONE = /windows\sphone\sos\s([\d.]+)/,
			w_match = UA.match( WEBKIT ),
			a_match = UA.match( ANDROID ),
			wp_match =  UA.match( WINDOWS_PHONE ),
			is_webkit = ( w_match && w_match.length > 0 ),
			is_android = ( a_match && a_match.length > 0 ),
			is_windows_phone = ( wp_match && wp_match.length > 0 );
		
		if ( is_webkit && is_android )
		{
			highlights_tap = TRUE;
			ghost_clicks = TRUE;
		}

		if ( is_windows_phone &&
			 parseInt( wp_match[1], 10 ) < 8 )
		{
			tap_triggers_mousemove = TRUE;
		}

	}( navigator.userAgent.toLowerCase() ));
	
	
	// Deal with Android’s silly tap highlighting
	if ( highlights_tap )
	{
		(function(){
			
			var $body = $('body'),
				the_class = 'no-tap-highlight';
			
			// add the style rules
			$('<style media="screen">body.' + the_class + ' { -webkit-tap-highlight-color: rgba(0,0,0,0); }</style>')
				.appendTo( $('head') );

			$(window).on( 'hashchange', function(){
				$body[ ( $.inArray( window.location.hash.replace('#',''), ids ) > -1 ? 'add' : 'remove' ) + 'Class' ]( the_class );
			});
			
		}());
	}
	 
	
	// Prevent Ghost Clicks
	if ( ghost_clicks )
	{
		tap_evt = 'touchstart';
		function preventGhostClicks()
		{
			prevent_ghost_click = TRUE;
			setTimeout( resetGhostClicks, 1000 );
		}
		function resetGhostClicks()
		{
			prevent_ghost_click = FALSE;
		}
		function ghostClickBuster(e)
		{
			if ( prevent_ghost_click &&
				 ! dragging )
			{
				if ( e.preventBubble )
				{
					e.preventBubble();
				}
				if ( e.preventDefault )
				{
					e.preventDefault();
				}
				if ( e.stopPropagation )
				{
					e.stopPropagation();
				}
				if ( e.stopImmediatePropagation )
				{
					e.stopImmediatePropagation();
				}
				resetGhostClicks();
				return FALSE;
			}
		}
		document.addEventListener( click_evt, ghostClickBuster, TRUE ); // capture phase
	}
	
	
	function trackMousing()
	{
		if ( ! tap_triggers_mousemove )
		{
			// mouse context or touch? For reals
			mousing = ( tap_evt == click_evt );
			$document.off( move_evt, trackMousing );
		}
	}
	
	
	function resetNav( $nav )
	{
		( $nav || $(this) )
			.find( DOT + ACTIVATED )
				.removeClass( ACTIVATED )
				.end()
			.find( DOT + FOCUSED )
				.removeClass( FOCUSED );
	}
	

	function cancel(e)
	{
		e.preventDefault();
		e.stopPropagation();
	}
	
	
	$document
		// tracking whether a mouse is in use or not
		.on( move_evt, trackMousing )
		// prevent trigger on drag
		.on( 'touchmove', function(){
			dragging = TRUE;
		 })
		.on( 'touchend', function(){
			dragging = FALSE;
		 })
		// closing the nav when clicking elsewhere
		.on( tap_evt, function(e){

			var $target = $( e.target ),
				href = $target.attr('href'),
				nav_class = DOT + NAV;
			
			// clicking outside the nav should close it
			if ( $target.is( nav_class ) ||
				 ( ! $target.closest( nav_class ).length &&
			       ( ! href || ( href && $.inArray( '#' + href, ids ) == -1 ) ) ) )
			{
				resetNav( $document );
			}
			
		});
	
		
	$.fn.easyNav = function(){
		
		var $nav = $(this);
		
		return $nav.each(function(){
			
			var $list = $(this).addClass( NAV ),
				id = $list.attr('id'),
				$nav_items = $list.children( LI ),
				$primary_links;
			
			if ( id )
			{
				ids.push( id );
			}
			
			if ( $nav_items.length )
			{
				$primary_links = $nav_items.children( A )
									.add(
										$nav_items.children('mark').find( A )
									 )
									.filter(':not([href=#top])')
									.filter(function(){
										return $(this).next().is( LISTS );
									 })
									.addClass( DISABLED );
			}
			
			// handle tapping
			$primary_links.on( tap_evt, handleTap );
			// proxy tap for touchstart
			if ( tap_evt == 'touchstart' )
			{
				$primary_links.off( tap_evt, handleTap );
				$primary_links.on( tap_evt, handleProxyTap );
			}
			// no duplicate events for click & touch
			if ( tap_evt != click_evt )
			{
				$primary_links.on( click_evt, cancel );
			}
			
			// manage focus
			$list
				.on( focus_evt, A, focusIn )
				.on( blur_evt, $primary_links, focusOut );
			
		});
		
		function handleTap(e)
		{
			
			var $link = $( e.target ),
				$current = $link.closest( LI ),
				$list = $link.closest( LISTS ),
				$nav_items = $list.children( LI ),
				// currently open?
				on = $current.is( DOT + ACTIVATED ),
				// how are we laying these out?
				display = $current.css('display'),
				floating = ( $current.css('float') != 'none' ),
				vertical = ( display == 'block' || display == 'list-item' ) && ! floating;
			
			// when mousing, we don’t need this (it just gets in the way)
			if ( mousing &&
				 window.location.hash != '#' + $list.attr('id') )
			{
				$list.find('a').off( tap_evt, handleTap );
				return TRUE;
			}
			
			// cancel
			if ( dragging )
			{
				dragging = FALSE;
				return FALSE;
			}
			
			// reset
			$nav_items.not( $current ).removeClass( ACTIVATED );
			
			// toggle open & closed
			if ( ! on ||
				 ( on && $list.is('[data-easy-nav-cancel-primary-click]') ) )
			{
				cancel(e);
				$current[ ( on ? 'remove' : 'add' ) + 'Class' ]( ACTIVATED );
				
				// scroll to make sure it’s in view if we’re not in a horizontal situation
				if ( ! on && vertical )
				{
					$(window).scrollTop( $link.offset().top );
				}
				
				if ( ghost_clicks )
				{
					preventGhostClicks();
				}
			}
			else
			{
				window.location.hash = '';
				window.location = $link.attr('href');
			}
		}
		
		function handleProxyTap(e)
		{
			setTimeout(function(){
				if ( ! dragging )
				{
					handleTap(e);
				}
			},250);
		}
		
		function focusIn()
		{
			var $li = $(this).closest( $nav.children( LI ) )
						.addClass( FOCUSED );
			$nav.children( LI ).not( $li )
				.removeClass( FOCUSED + ' ' + ACTIVATED );
		}
		
		function focusOut()
		{
			$(this).removeClass( FOCUSED );
		}
		
	};
	
	$('[data-easy-nav]').easyNav();
	
}(jQuery,window,document));