/** @format */

/**
 * External dependencies
 */
import React, { Fragment } from 'react';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import DocumentHead from 'components/data/document-head';
import FormattedHeader from 'components/formatted-header';
import PageViewTracker from 'lib/analytics/page-view-tracker';
import { JETPACK_ONBOARDING_STEPS as STEPS } from '../constants';

class JetpackOnboardingSummaryStep extends React.PureComponent {
	render() {
		const { translate } = this.props;
		const headerText = translate( 'Congratulations! Your site is on its way.' );
		const subHeaderText = translate(
			'You enabled Jetpack and unlocked dozens of website-bolstering features. Continue preparing your site below.'
		);

		return (
			<Fragment>
				<DocumentHead title={ translate( 'Summary ‹ Jetpack Onboarding' ) } />
				<PageViewTracker
					path={ '/jetpack/onboarding/' + STEPS.SUMMARY + '/:site' }
					title="Summary ‹ Jetpack Onboarding"
				/>

				<FormattedHeader headerText={ headerText } subHeaderText={ subHeaderText } />
			</Fragment>
		);
	}
}

export default localize( JetpackOnboardingSummaryStep );
