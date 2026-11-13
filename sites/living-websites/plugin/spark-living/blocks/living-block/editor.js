/**
 * Living Block (container). No build step: plain wp.element.createElement.
 * Server-side rendered; the saved markup is only the inner blocks.
 */
( function ( blocks, element, blockEditor, components, i18n ) {
	'use strict';

	var el = element.createElement;
	var __ = i18n.__;
	var InnerBlocks = blockEditor.InnerBlocks;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;

	var TEMPLATE = [
		[ 'spark-living/variant', { variantKey: 'A' } ],
		[ 'spark-living/variant', { variantKey: 'B' } ]
	];

	blocks.registerBlockType( 'spark-living/living-block', {
		edit: function ( props ) {
			var attributes = props.attributes;
			var blockProps = useBlockProps( { className: 'spark-living-editor-block' } );

			return el(
				'div',
				blockProps,
				el(
					InspectorControls,
					{},
					el(
						PanelBody,
						{ title: __( 'Living experiment', 'spark-living' ), initialOpen: true },
						el( TextControl, {
							label: __( 'Experiment ID', 'spark-living' ),
							help: __( 'The ID of the test (shown in the Living Websites dashboard and returned by the REST API when a test is created). With 0 or an unknown ID, only variant A is shown.', 'spark-living' ),
							type: 'number',
							min: 0,
							value: attributes.experimentId || 0,
							onChange: function ( value ) {
								props.setAttributes( { experimentId: parseInt( value, 10 ) || 0 } );
							}
						} )
					)
				),
				el(
					'p',
					{ style: { margin: '0 0 8px', fontWeight: 600 } },
					__( 'Living Block', 'spark-living' ) + ( attributes.experimentId ? ' #' + attributes.experimentId : '' )
				),
				el( InnerBlocks, {
					allowedBlocks: [ 'spark-living/variant' ],
					template: TEMPLATE,
					templateLock: 'insert'
				} )
			);
		},
		save: function () {
			return el( InnerBlocks.Content );
		}
	} );
} )( window.wp.blocks, window.wp.element, window.wp.blockEditor, window.wp.components, window.wp.i18n );
