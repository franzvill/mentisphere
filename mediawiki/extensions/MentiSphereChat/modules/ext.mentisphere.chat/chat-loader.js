( function () {
	'use strict';

	var assetsUrl = mw.config.get( 'wgMentiSphereChatAssetsUrl' );
	if ( !assetsUrl ) return;

	// Create chat container
	var container = document.createElement( 'div' );
	container.id = 'mentisphere-chat';
	var content = document.getElementById( 'mw-content-text' );
	if ( content ) {
		content.appendChild( container );
	}

	// Cache-bust version (update on each build)
	var v = '20260425';

	// Load chat widget CSS
	var link = document.createElement( 'link' );
	link.rel = 'stylesheet';
	link.href = assetsUrl + '/chat-widget.css?v=' + v;
	document.head.appendChild( link );

	// Load chat widget JS
	var script = document.createElement( 'script' );
	script.src = assetsUrl + '/chat-widget.js?v=' + v;
	document.body.appendChild( script );
}() );
