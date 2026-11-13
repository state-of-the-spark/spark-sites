/**
 * Living Variant (child of Living Block). No build step.
 */
( function ( blocks, element, blockEditor, components, i18n ) {
	'use strict';

	var el = element.createElement;
	var __ = i18n.__;
	var InnerBlocks = blockEditor.InnerBlocks;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var SelectControl = components.SelectControl;

	function label( key ) {
		return key === 'B'
			? __( 'Variant B: challenger', 'spark-living' )
			: __( 'Variant A: current', 'spark-living' );
	}

	blocks.registerBlockType( 'spark-living/variant', {
		edit: function ( props ) {
			var key = props.attributes.variantKey === 'B' ? 'B' : 'A';
			var blockProps = useBlockProps( {
				className: 'spark-living-editor-variant',
				style: {
					border: '1px dashed ' + ( key === 'B' ? '#8a4b00' : '#1f6b3a' ),
					padding: '8px',
					marginBottom: '8px'
				}
			} );

			return el(
				'div',
				blockProps,
				el(
					InspectorControls,
					{},
					el(
						PanelBody,
						{ title: __( 'Variant', 'spark-living' ), initialOpen: true },
						el( SelectControl, {
							label: __( 'Which variant is this?', 'spark-living' ),
							value: key,
							options: [
								{ label: __( 'A: current', 'spark-living' ), value: 'A' },
								{ label: __( 'B: challenger', 'spark-living' ), value: 'B' }
							],
							onChange: function ( value ) {
								props.setAttributes( { variantKey: value === 'B' ? 'B' : 'A' } );
							}
						} )
					)
				),
				el( 'p', { style: { margin: '0 0 6px', fontWeight: 600 } }, label( key ) ),
				el( InnerBlocks, {
					template: [ [ 'core/paragraph', { placeholder: __( 'Add the content for this variant.', 'spark-living' ) } ] ]
				} )
			);
		},
		save: function () {
			return el( InnerBlocks.Content );
		}
	} );
} )( window.wp.blocks, window.wp.element, window.wp.blockEditor, window.wp.components, window.wp.i18n );
