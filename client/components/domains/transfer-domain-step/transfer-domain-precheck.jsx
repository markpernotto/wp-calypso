/** @format */

/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { localize, moment } from 'i18n-calypso';
import { isEmpty } from 'lodash';
import classNames from 'classnames';
import Gridicon from 'gridicons';

/**
 * Internal dependencies
 */
import Button from 'components/button';
import Card from 'components/card';
import Notice from 'components/notice';
import { recordTracksEvent } from 'state/analytics/actions';
import FormattedHeader from 'components/formatted-header';
import { checkInboundTransferStatus } from 'lib/domains';
import support from 'lib/url/support';
import paths from 'my-sites/domains/paths';

class TransferDomainPrecheck extends React.PureComponent {
	static propTypes = {
		domain: PropTypes.string,
		selectedSite: PropTypes.oneOfType( [ PropTypes.object, PropTypes.bool ] ),
		setValid: PropTypes.func,
		supportsPrivacy: PropTypes.bool,
	};

	state = {
		creationDate: '',
		currentStep: 1,
		daysTransferLocked: 60,
		email: '',
		expiryDate: '',
		expiryDateNew: '',
		expiryDateOk: true,
		inInitialRegistrationPeriod: true,
		loading: true,
		losingRegistrar: '',
		losingRegistrarIanaId: '',
		privacy: false,
		termMaximumInYears: 10,
		transferEligibleDate: '',
		unlocked: false,
	};

	componentWillMount() {
		this.refreshStatus();
	}

	componentWillUpdate( nextProps ) {
		if ( nextProps.domain !== this.props.domain ) {
			this.refreshStatus();
		}
	}

	onClick = () => {
		const { domain, supportsPrivacy } = this.props;
		const { losingRegistrar, losingRegistrarIanaId } = this.state;

		this.props.recordContinueButtonClick( domain, losingRegistrar, losingRegistrarIanaId );

		this.props.setValid( domain, supportsPrivacy );
	};

	refreshStatus = () => {
		this.setState( { loading: true } );

		checkInboundTransferStatus( this.props.domain, ( error, result ) => {
			const { currentStep } = this.state;
			let stepToCheck = currentStep;

			if ( ! isEmpty( error ) ) {
				return;
			}

			if ( 1 === stepToCheck ) {
				if ( ! result.in_initial_registration_period ) {
					stepToCheck++;
				} else {
					this.showStep( 1 );
				}
			}

			if ( 2 === stepToCheck ) {
				if ( result.unlocked ) {
					stepToCheck++;
				} else {
					this.showStep( 2 );
				}
			}

			if ( 3 === stepToCheck ) {
				this.showStep( 3 );
			}

			if ( 4 === stepToCheck ) {
				this.showStep( 4 );
			}

			// Reset steps if domain became locked again
			if ( ! result.unlocked && this.state.currentStep > 2 ) {
				this.resetSteps();
			}

			this.setState( {
				creationDate: result.creation_date,
				daysTransferLocked: result.days_transfer_locked,
				email: result.admin_email,
				expiryDate: result.registry_expiry_date,
				expiryDateNew: result.new_expiry_date,
				expiryDateOk: result.new_expiry_date_ok,
				inInitialRegistrationPeriod: result.in_initial_registration_period,
				loading: false,
				losingRegistrar: result.registrar,
				losingRegistrarIanaId: result.registrar_iana_id,
				privacy: result.privacy,
				termMaximumInYears: result.term_maximum_in_years,
				transferEligibleDate: result.transfer_eligible_date,
				unlocked: result.unlocked,
			} );
		} );
	};

	resetSteps = () => {
		if ( this.state.currentStep !== 2 ) {
			this.setState( { currentStep: 2 } );
		}
	};

	showStep = step => {
		this.props.recordNextStep( this.props.domain, step );
		this.setState( { currentStep: step } );
	};

	showNextStep = () => {
		this.props.recordNextStep( this.props.domain, this.state.currentStep + 1 );
		this.setState( { currentStep: this.state.currentStep + 1 } );
	};

	getSection( heading, message, buttonText, step, stepStatus ) {
		const { currentStep, loading, unlocked } = this.state;
		const isAtCurrentStep = step === currentStep;
		const isStepFinished = currentStep > step;
		const sectionClasses = classNames( 'transfer-domain-step__section', {
			'is-expanded': isAtCurrentStep,
			'is-complete': isStepFinished,
		} );

		const sectionIcon = isStepFinished ? <Gridicon icon="checkmark-circle" size={ 36 } /> : step;

		return (
			<Card compact>
				<div className={ sectionClasses }>
					<span className="transfer-domain-step__section-heading-number">{ sectionIcon }</span>
					<div className="transfer-domain-step__section-text">
						<div className="transfer-domain-step__section-heading">
							<strong>{ heading }</strong>
							{ isStepFinished && stepStatus }
						</div>
						{ isAtCurrentStep &&
							message && (
								<div>
									<div className="transfer-domain-step__section-message">{ message }</div>
									{ buttonText && (
										<div className="transfer-domain-step__section-action">
											<Button
												compact
												onClick={ unlocked ? this.showNextStep : this.refreshStatus }
												busy={ loading }
											>
												{ buttonText }
											</Button>
											{ stepStatus }
										</div>
									) }
								</div>
							) }
					</div>
				</div>
			</Card>
		);
	}

	getRegistrationPeriodMessage() {
		const { translate, selectedSite, domain } = this.props;
		const {
			creationDate,
			currentStep,
			daysTransferLocked,
			expiryDate,
			expiryDateNew,
			expiryDateOk,
			inInitialRegistrationPeriod,
			loading,
			termMaximumInYears,
			transferEligibleDate,
		} = this.state;
		const step = 1;
		const isStepFinished = currentStep > step;
		const dateFormat = translate( 'MMM D, YYYY', {
			comment:
				'Short month, day and year, like "Dec 5, 2017". This is a moment.js formatted string, ' +
				'see http://momentjs.com/docs/#/displaying/format/',
		} );

		let heading = translate( 'Domain registration period check.' );
		let message = null;
		let classes = 'transfer-domain-step__lock-status transfer-domain-step__unlocked';
		let statusText = translate( 'Domain registration period is ok.' );
		let icon = 'checkmark';

		if ( false === expiryDateOk ) {
			heading = translate( 'Domain registration exceeds maximum term.' );
			message = translate(
				'Transferring this domain to WordPress.com would extend the current expiration date from %(expiryDate)s to ' +
					'%(expiryDateNew)s. This exceeds the maximum registration term of %(termMaximumInYears)d years. You can ' +
					'still make your domain work with WordPress.com by {{a}}mapping it{{/a}}.',
				{
					args: {
						termMaximumInYears: termMaximumInYears,
						expiryDate: moment( expiryDate ).format( dateFormat ),
						expiryDateNew: moment( expiryDateNew ).format( dateFormat ),
					},
					components: {
						a: (
							<a
								href={ paths.domainMapping( selectedSite.slug, domain ) }
								rel="noopener noreferrer"
								target="_blank"
							/>
						),
					},
				}
			);
			classes = 'transfer-domain-step__lock-status transfer-domain-step__locked';
			icon = 'cross';
		} else if ( true === inInitialRegistrationPeriod ) {
			heading = translate( 'Domain was registered less than %(daysTransferLocked)d days ago.', {
				args: {
					daysTransferLocked: daysTransferLocked,
				},
			} );
			message = translate(
				'Your domain was registered on %(creationDate)s. Your domain must be registered for at least %(daysTransferLocked)d ' +
					'days before it is eligible for transfer. You can either wait until %(transferEligibleDate)s to transfer your ' +
					'domain or you can make your domain work with WordPress.com now by {{a}}mapping it{{/a}}.',
				{
					args: {
						creationDate: moment( creationDate ).format( dateFormat ),
						daysTransferLocked: daysTransferLocked,
						transferEligibleDate: moment( transferEligibleDate ).format( dateFormat ),
					},
					components: {
						a: (
							<a
								href={ paths.domainMapping( selectedSite.slug, domain ) }
								rel="noopener noreferrer"
								target="_blank"
							/>
						),
					},
				}
			);
			classes = 'transfer-domain-step__lock-status transfer-domain-step__locked';
			icon = 'cross';
		}

		if ( loading && ! isStepFinished ) {
			classes = 'transfer-domain-step__lock-status transfer-domain-step__checking';
			heading = 'Domain registration period check.';
			icon = 'sync';
			statusText = 'Checking...';
			message = null;
		}

		const status = (
			<div className={ classes }>
				<Gridicon icon={ icon } size={ 12 } />
				<span>{ statusText }</span>
			</div>
		);

		return this.getSection( heading, message, null, step, status );
	}

	getStatusMessage() {
		const { translate } = this.props;
		const { currentStep, unlocked, loading } = this.state;
		const step = 2;
		const isStepFinished = currentStep > step;

		const heading = unlocked
			? translate( 'Domain is unlocked.' )
			: translate( 'Unlock the domain.' );
		const message = unlocked
			? translate( 'Your domain is unlocked at your current registrar.' )
			: translate(
					"Your domain is locked to prevent unauthorized transfers. You'll need to unlock " +
						'it at your current domain provider before we can move it. {{a}}Here are instructions for unlocking it{{/a}}. ' +
						'It might take a few minutes for any changes to take effect.',
					{
						components: {
							a: (
								<a
									href={ support.INCOMING_DOMAIN_TRANSFER_PREPARE_UNLOCK }
									rel="noopener noreferrer"
									target="_blank"
								/>
							),
						},
					}
				);
		const buttonText = translate( "I've unlocked my domain" );

		let lockStatusClasses = unlocked
			? 'transfer-domain-step__lock-status transfer-domain-step__unlocked'
			: 'transfer-domain-step__lock-status transfer-domain-step__locked';

		let lockStatusIcon = unlocked ? 'checkmark' : 'cross';
		let lockStatusText = unlocked ? translate( 'Unlocked' ) : translate( 'Locked' );

		if ( loading && ! isStepFinished ) {
			lockStatusClasses = 'transfer-domain-step__lock-status transfer-domain-step__checking';
			lockStatusIcon = 'sync';
			lockStatusText = 'Checking…';
		}

		const lockStatus = (
			<div className={ lockStatusClasses }>
				<Gridicon icon={ lockStatusIcon } size={ 12 } />
				<span>{ lockStatusText }</span>
			</div>
		);

		return this.getSection( heading, message, buttonText, step, lockStatus );
	}

	getPrivacyMessage() {
		const { translate } = this.props;
		const { currentStep, email, loading } = this.state;
		const step = 3;
		const isStepFinished = currentStep > step;

		const heading = translate( 'Verify we can get in touch.' );
		let message = translate(
			"{{notice}}We couldn't get the email address listed for this domain's owner and we " +
				'need to send an important email to start the process.{{/notice}}' +
				'{{strong}}Make sure you can access the email address listed for your domain and ' +
				'privacy protection is disabled.{{/strong}}' +
				'{{br/}}{{br/}}' +
				'Log in to your current domain provider to double check the domain contact email address and ' +
				"make sure to disable privacy protection. {{a}}Here's how to do that{{/a}}.",
			{
				components: {
					notice: <Notice showDismiss={ false } status="is-warning" />,
					strong: <strong />,
					br: <br />,
					a: (
						<a
							href={ support.INCOMING_DOMAIN_TRANSFER_PREPARE_PRIVACY }
							rel="noopener noreferrer"
							target="_blank"
						/>
					),
				},
			}
		);
		let buttonText = translate( 'I can access the email address' );

		if ( email ) {
			message = translate(
				"{{card}}Make sure you can access the email address listed for this domain's owner. " +
					"We'll send a link to start the process to the following email address: {{strong}}%(email)s{{/strong}}{{/card}}" +
					"Don't recognize that address? You may have privacy protection enabled. It has to be " +
					'disabled temporarily for the transfer to work. Log in to your current domain provider to ' +
					"disable privacy protection. {{a}}Here's how to do that{{/a}}.",
				{
					args: { email },
					components: {
						card: (
							<Card
								className="transfer-domain-step__section-callout"
								compact={ true }
								highlight="warning"
							/>
						),
						strong: <strong className="transfer-domain-step__admin-email" />,
						a: (
							<a
								href={ support.INCOMING_DOMAIN_TRANSFER_PREPARE_PRIVACY }
								rel="noopener noreferrer"
								target="_blank"
							/>
						),
					},
				}
			);

			buttonText = translate( 'I can access the email address listed' );
		}

		const statusClasses = loading
			? 'transfer-domain-step__lock-status transfer-domain-step__checking'
			: 'transfer-domain-step__lock-status transfer-domain-step__refresh';
		const statusIcon = 'sync';
		const statusText = loading ? translate( 'Checking…' ) : translate( 'Refresh email address' );

		const stepStatus = ! isStepFinished && (
			<a className={ statusClasses } onClick={ this.refreshStatus }>
				<Gridicon icon={ statusIcon } size={ 12 } />
				<span>{ statusText }</span>
			</a>
		);

		return this.getSection( heading, message, buttonText, step, stepStatus );
	}

	getEppMessage() {
		const { translate } = this.props;

		const heading = translate( 'Get a domain authorization code.' );
		const message = translate(
			'A domain authorization code is a unique code linked only to your domain — kind of like a ' +
				"password for your domain. Log in to your current domain provider to get one. We'll send you an email " +
				'with a link to enter it and officially okay the transfer. We call it a domain authorization code, ' +
				'but it might be called a secret code, auth code, or EPP code. {{a}}Learn more{{/a}}.',
			{
				components: {
					a: (
						<a
							href={ support.INCOMING_DOMAIN_TRANSFER_PREPARE_AUTH_CODE }
							rel="noopener noreferrer"
							target="_blank"
						/>
					),
				},
			}
		);
		const buttonText = translate( 'I have my authorization code' );

		return this.getSection( heading, message, buttonText, 4 );
	}

	getHeader() {
		const { translate, domain } = this.props;

		return (
			<Card compact={ true } className="transfer-domain-step__title">
				<FormattedHeader
					headerText={ translate( "Let's get {{strong}}%(domain)s{{/strong}} ready to transfer.", {
						args: { domain },
						components: { strong: <strong /> },
					} ) }
					subHeaderText={ translate(
						'Log into your current domain provider to complete a few preliminary steps.'
					) }
				/>
				<img
					className="transfer-domain-step__illustration"
					src={ '/calypso/images/illustrations/migrating-host-diy.svg' }
				/>
			</Card>
		);
	}

	render() {
		const { translate } = this.props;
		const { unlocked, currentStep } = this.state;

		return (
			<div className="transfer-domain-step__precheck">
				{ this.getHeader() }
				{ this.getRegistrationPeriodMessage() }
				{ this.getStatusMessage() }
				{ this.getPrivacyMessage() }
				{ this.getEppMessage() }
				<Card className="transfer-domain-step__continue">
					<div className="transfer-domain-step__continue-text">
						<p>
							{ translate(
								'Note: These changes can take some time to take effect. ' +
									'Need help? {{a}}Get in touch with one of our Happiness Engineers{{/a}}.',
								{
									components: {
										a: (
											<a
												href={ support.CALYPSO_CONTACT }
												rel="noopener noreferrer"
												target="_blank"
											/>
										),
									},
								}
							) }
						</p>
					</div>
					<Button
						disabled={ ! unlocked || currentStep < 5 }
						onClick={ this.onClick }
						primary={ true }
					>
						{ translate( 'Continue' ) }
					</Button>
				</Card>
			</div>
		);
	}
}

const recordNextStep = ( domain_name, show_step ) =>
	recordTracksEvent( 'calypso_transfer_domain_precheck_step_change', { domain_name, show_step } );

const recordContinueButtonClick = ( domain_name, losing_registrar, losing_registrar_iana_id ) =>
	recordTracksEvent( 'calypso_transfer_domain_precheck_continue_click', {
		domain_name,
		losing_registrar,
		losing_registrar_iana_id,
	} );

export default connect( null, {
	recordNextStep,
	recordContinueButtonClick,
} )( localize( TransferDomainPrecheck ) );
