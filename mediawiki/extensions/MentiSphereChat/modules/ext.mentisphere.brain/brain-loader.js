( function () {
	'use strict';

	var assetsUrl = mw.config.get( 'wgMentiSphereBrainAssetsUrl' );
	if ( !assetsUrl ) return;

	// Cache-bust version (update on each build)
	var v = '20260510';

	// Find or create the container div with the data attribute the widget mounts on.
	var container = document.querySelector( '[data-mentisphere-brain]' );
	if ( !container ) {
		container = document.createElement( 'div' );
		container.setAttribute( 'data-mentisphere-brain', '' );
		container.className = 'ms-brain-widget-mount';
		var content = document.getElementById( 'mw-content-text' );
		if ( content ) {
			content.insertBefore( container, content.firstChild );
		}
	}

	// Load brain widget CSS
	var link = document.createElement( 'link' );
	link.rel = 'stylesheet';
	link.href = assetsUrl + '/brain-widget.css?v=' + v;
	document.head.appendChild( link );

	// Load brain widget JS
	var script = document.createElement( 'script' );
	script.src = assetsUrl + '/brain-widget.js?v=' + v;
	document.body.appendChild( script );

	// Hydrate the homepage chat input. Wikitext has `<div id="ms-home-chat">`;
	// we render an input that submits via GET to /chat?q=<typed> so Chat.tsx's
	// existing ?q= handler auto-sends the message.
	var homeChat = document.getElementById( 'ms-home-chat' );
	if ( homeChat ) {
		// Don't double-mount if some other loader got here first.
		if ( !homeChat.querySelector( '.ms-home-chat-form' ) ) {
			var form = document.createElement( 'form' );
			form.className = 'ms-home-chat-form';
			form.action = '/chat';
			form.method = 'get';
			form.setAttribute( 'role', 'search' );

			var input = document.createElement( 'input' );
			input.type = 'text';
			input.name = 'q';
			input.className = 'ms-home-chat-input';
			input.placeholder = 'Ask MentiSphere anything…';
			input.autocomplete = 'off';

			var submit = document.createElement( 'button' );
			submit.type = 'submit';
			submit.className = 'ms-home-chat-submit';
			submit.textContent = 'Ask →';

			form.appendChild( input );
			form.appendChild( submit );
			homeChat.appendChild( form );
		}
	}
}() );
