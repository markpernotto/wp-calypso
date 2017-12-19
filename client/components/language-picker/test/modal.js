/**
 * @format
 * @jest-environment jsdom
 */

/**
 * External dependencies
 */
import React from 'react';
import { shallow } from 'enzyme';
import { identity, noop } from 'lodash';

/**
 * Internal dependencies
 */
import { LanguagePickerModal } from '../modal';
import { LANGUAGE_GROUPS, DEFAULT_LANGUAGE_GROUP } from '../constants';

describe( 'LanguagePickerModal', () => {
	const defaultProps = {
		onSelected: noop,
		onClose: noop,
		isVisible: true,
		languages: [
			{
				langSlug: 'en',
				name: 'English',
				popular: 1,
				value: 1,
				wpLocale: 'en_US',
				territories: [ '019' ],
			},
			{
				langSlug: 'cs',
				name: 'Čeština',
				value: 11,
				wpLocale: 'cs_CZ',
				territories: [ '151' ],
			},
			{
				langSlug: 'it',
				name: 'Italiano',
				popular: 8,
				value: 35,
				wpLocale: 'it_IT',
				territories: [ '039' ],
			},
			{
				langSlug: 'en-gb',
				name: 'English (UK)',
				value: 482,
				wpLocale: 'en_GB',
				territories: [ '154' ],
			},
		],
		selected: 'en',
		translate: identity,
	};

	test( 'should render', () => {
		const wrapper = shallow( <LanguagePickerModal { ...defaultProps } /> );

		expect( wrapper ).toMatchSnapshot();
	} );

	describe( 'suggested languages', () => {
		const browserLanguages = [ 'en-GB', 'en', 'en-US', 'en-AU', 'it' ];
		let _navigator;

		beforeEach( () => {
			_navigator = global.navigator;
			Object.defineProperty( global.navigator, 'languages', {
				get: () => browserLanguages,
				configurable: true,
			} );
		} );

		afterEach( () => {
			global.navigator = _navigator;
		} );

		test( 'should render a list of suggested (WordPress.com-supported) languages', () => {
			const wrapper = shallow( <LanguagePickerModal { ...defaultProps } /> );
			const suggestedLanguagesTexts = wrapper.find(
				'.language-picker__modal-suggested-list .language-picker__modal-text'
			);

			expect( suggestedLanguagesTexts ).toHaveLength( 3 );
			expect( suggestedLanguagesTexts.at( 0 ).text() ).toEqual( 'English (UK)' );
			expect( suggestedLanguagesTexts.at( 1 ).text() ).toEqual( 'English' );
			expect( suggestedLanguagesTexts.at( 2 ).text() ).toEqual( 'Italiano' );
		} );

		test( 'should not render when there are no suggested languages', () => {
			Object.defineProperty( global.navigator, 'languages', {
				get: () => [],
				configurable: true,
			} );
			const wrapper = shallow( <LanguagePickerModal { ...defaultProps } /> );

			expect(
				wrapper.find( '.language-picker__modal-suggested-list .language-picker__modal-text' )
			).toHaveLength( 0 );
		} );

		test( 'getSuggestedLanguages() should return correct, WordPress.com-supported languages from navigator.languages', () => {
			const wrapper = shallow( <LanguagePickerModal { ...defaultProps } /> );

			[
				{
					navigatorLanguages: [ 'en-US' ],
					expectedSuggestedLanguages: [ defaultProps.languages[ 0 ] ],
				},
				// we'll show en-GB because it's a WordPress.com language, and en-US for en-AU because it's a variant of en
				{
					navigatorLanguages: [ 'en-GB', 'en-AU' ],
					expectedSuggestedLanguages: [ defaultProps.languages[ 3 ], defaultProps.languages[ 0 ] ],
				},
				{
					navigatorLanguages: [ 'en' ],
					expectedSuggestedLanguages: [ defaultProps.languages[ 0 ] ],
				},
				{
					navigatorLanguages: [ 'it' ],
					expectedSuggestedLanguages: [ defaultProps.languages[ 2 ] ],
				},
				{
					navigatorLanguages: [ 'it', 'en-US' ],
					expectedSuggestedLanguages: [ defaultProps.languages[ 2 ], defaultProps.languages[ 0 ] ],
				},
				{
					navigatorLanguages: [ 'it', 'en' ],
					expectedSuggestedLanguages: [ defaultProps.languages[ 2 ], defaultProps.languages[ 0 ] ],
				},
				{
					navigatorLanguages: [ 'cs', 'it', 'en-US' ],
					expectedSuggestedLanguages: [
						defaultProps.languages[ 1 ],
						defaultProps.languages[ 2 ],
						defaultProps.languages[ 0 ],
					],
				},
			].forEach( item => {
				Object.defineProperty( global.navigator, 'languages', {
					get: () => item.navigatorLanguages,
					configurable: true,
				} );
				expect( wrapper.instance().getSuggestedLanguages() ).toEqual(
					item.expectedSuggestedLanguages
				);
			} );
		} );

		describe( 'language territories', () => {
			test( 'should set `popular` territory filter when selected language is popular', () => {
				const wrapper = shallow( <LanguagePickerModal { ...defaultProps } /> );
				expect( wrapper.state().filter ).toEqual( 'popular' );
			} );

			test( 'should load corresponding territory when language is not popular', () => {
				const notPopularLangSlugProps = Object.assign( {}, defaultProps, {
					selected: 'cs',
				} );
				const wrapper = shallow( <LanguagePickerModal { ...notPopularLangSlugProps } /> );
				expect( wrapper.state().filter ).toEqual( LANGUAGE_GROUPS[ 4 ].id );
			} );

			test( 'should should switch country lists when user clicks a territory tab', () => {
				const wrapper = shallow( <LanguagePickerModal { ...defaultProps } /> );
				expect( wrapper.state().filter ).toEqual( 'popular' );
			} );

			test( 'should switch country lists when user clicks a territory tab', () => {
				const wrapper = shallow( <LanguagePickerModal { ...defaultProps } /> );
				expect( wrapper.state().filter ).toEqual( DEFAULT_LANGUAGE_GROUP );
				wrapper
					.find( 'NavItem' )
					.at( 1 )
					.simulate( 'click' );
				expect( wrapper.state().filter ).toEqual( LANGUAGE_GROUPS[ 1 ].id );
			} );
		} );
	} );
} );
