/**
 * External Dependencies
 */
import { expect } from 'chai';
import React from 'react';
import { shallow } from 'enzyme';
import noop from 'lodash/noop';

/**
 * Internal Dependencies
 */
import useFakeDom from 'test/helpers/use-fake-dom';
import useMockery from 'test/helpers/use-mockery';
import useI18n from 'test/helpers/use-i18n';

describe( 'Domain Suggestion', function() {

	let DomainSuggestion;

	useFakeDom();
	useMockery( ( mockery ) => {
		mockery.registerMock( 'components/plans/premium-popover', noop );
	} );
	useI18n();

	before( () => {
		DomainSuggestion = require( 'components/domains/domain-suggestion' );
	} );

	describe( 'has attributes', () => {
		it( 'should have data-domain attribute for integration testing', () => {
			const domainSuggestion = shallow( <DomainSuggestion
				domain="example.com" isAdded={ false }/> );
			const domainSuggestionButton = domainSuggestion.find( '.domain-suggestion__select-button[data-domain]' );
			expect( domainSuggestionButton.length ).to.equal( 1 );
			expect( domainSuggestionButton.props()[ 'data-domain' ] ).to.equal( 'example.com' )
		} );
	} );

	describe( 'added domain', function() {
		it( 'should show a checkbox when in cart', function() {
			const domainSuggestion = shallow( <DomainSuggestion isAdded={ true } /> );
			const domainSuggestionButton = domainSuggestion.find( '.domain-suggestion__select-button' );
			expect( domainSuggestionButton.children().props().icon ).to.equal( 'checkmark' );
		} );

		it( 'should show the button label when not in cart', function() {
			const buttonLabel = 'Hello';
			const domainSuggestion = shallow(
					<DomainSuggestion isAdded={ false } buttonLabel={ buttonLabel } />
				);
			const domainSuggestionButton = domainSuggestion.find( '.domain-suggestion__select-button' );
			expect( domainSuggestionButton.text() ).to.equal( buttonLabel );
		} );
	} );

} );