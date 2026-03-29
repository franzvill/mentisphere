<?php

class MentiSphereChatHooks {

	/**
	 * Add "Chat" tab to Agent pages
	 */
	public static function onSkinTemplateNavigation( $skinTemplate, &$links ) {
		$title = $skinTemplate->getTitle();
		if ( $title->getNamespace() === NS_AGENT ) {
			$links['namespaces']['chat'] = [
				'text' => wfMessage( 'mentispherechat-tab' )->text(),
				'href' => $title->getLocalURL() . '#mentisphere-chat',
				'class' => '',
			];
		}
	}

	/**
	 * Trigger embedding sync when Knowledge pages are saved
	 */
	public static function onPageSaveComplete( $wikiPage, $user, $summary, $flags, $revisionRecord, $editResult ) {
		$title = $wikiPage->getTitle();
		if ( $title->getNamespace() !== NS_KNOWLEDGE ) {
			return;
		}

		$config = MediaWiki\MediaWikiServices::getInstance()->getMainConfig();
		$chatServiceUrl = $config->get( 'MentiSphereChatServiceUrl' );
		$secret = $config->get( 'MentiSphereChatServiceSecret' );

		// Fire and forget — don't block the page save
		$url = $chatServiceUrl . '/embeddings/sync';
		$data = json_encode( [ 'page_title' => $title->getPrefixedText() ] );

		$requestFactory = MediaWiki\MediaWikiServices::getInstance()->getHttpRequestFactory();
		$req = $requestFactory->create( $url, [
			'method' => 'POST',
			'timeout' => 5,
			'postData' => $data,
		] );
		$req->setHeader( 'Content-Type', 'application/json' );
		$req->setHeader( 'X-Service-Secret', $secret );
		$req->execute();
	}

	/**
	 * Inject chat widget on Agent pages
	 */
	public static function onBeforePageDisplay( $out, $skin ) {
		$title = $out->getTitle();
		if ( $title->getNamespace() !== NS_AGENT ) {
			return;
		}

		$config = $out->getConfig();
		$chatServiceUrl = $config->get( 'MentiSphereChatServiceUrl' );
		$chatAssetsUrl = $config->get( 'MentiSphereChatAssetsUrl' );

		$out->addJsConfigVars( [
			'wgMentiSphereChatServiceUrl' => $chatServiceUrl,
			'wgMentiSphereAgentPage' => $title->getPrefixedText(),
			'wgMentiSphereChatAssetsUrl' => $chatAssetsUrl,
		] );

		$out->addModules( 'ext.mentisphere.chat' );
	}
}
