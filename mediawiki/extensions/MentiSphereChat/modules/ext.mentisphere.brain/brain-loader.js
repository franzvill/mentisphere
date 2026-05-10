( function () {
	'use strict';

	var assetsUrl = mw.config.get( 'wgMentiSphereBrainAssetsUrl' );
	if ( !assetsUrl ) return;

	// Cache-bust version (update on each build)
	var v = '20260510';

	// Find or create the container div with the data attribute the widget mounts on.
	// Position the brain just above the homepage chat input
	// (`#ms-home-chat`/`.ms-chat-input-wrapper` placeholder in wikitext) so the
	// composition reads: hero → brain → chat input → action cards.
	var container = document.querySelector( '[data-mentisphere-brain]' );
	if ( !container ) {
		container = document.createElement( 'div' );
		container.setAttribute( 'data-mentisphere-brain', '' );
		container.className = 'ms-brain-widget-mount';
		var anchor = document.getElementById( 'ms-home-chat' );
		if ( anchor && anchor.parentNode ) {
			anchor.parentNode.insertBefore( container, anchor );
		} else {
			// Fallback: prepend to content area if the anchor isn't on this page.
			var content = document.getElementById( 'mw-content-text' );
			if ( content ) {
				content.insertBefore( container, content.firstChild );
			}
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
			submit.className = 'ms-home-chat-btn';
			submit.setAttribute( 'aria-label', 'Send' );
			submit.textContent = '→';

			form.appendChild( input );
			form.appendChild( submit );
			homeChat.appendChild( form );
		}
	}
}() );
