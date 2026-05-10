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
}() );
